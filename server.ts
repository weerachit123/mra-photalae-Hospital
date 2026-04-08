import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import iconv from 'iconv-lite';

// --- Database Configurations ---
const CONFIG_FILE = path.join(process.cwd(), 'db_config.json');

async function getDbConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { hos: null, mra: null };
  }
}

async function saveDbConfig(config: any) {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// HOS Database (HIS)
let hosPool: mysql.Pool | null = null;
const hosDbConfig = {
  host: process.env.HOS_DB_HOST || '',
  user: process.env.HOS_DB_USER || 'root',
  password: process.env.HOS_DB_PASSWORD || '',
  database: process.env.HOS_DB_NAME || 'hos',
  port: parseInt(process.env.HOS_DB_PORT || '3306'),
  connectTimeout: 3000,
  charset: 'tis620'
};

// MRA Database (Audit)
let mraPool: mysql.Pool | null = null;
const mraDbConfig = {
  host: process.env.MRA_DB_HOST || '',
  user: process.env.MRA_DB_USER || 'root',
  password: process.env.MRA_DB_PASSWORD || '',
  database: process.env.MRA_DB_NAME || 'mra_audit',
  port: parseInt(process.env.MRA_DB_PORT || '3306'),
  connectTimeout: 3000,
  charset: 'utf8mb4'
};

// Initialize Pools from persisted config or env
async function initAllPools() {
  const savedConfig = await getDbConfig();
  
  if (savedConfig.hos) {
    await initHosPool(savedConfig.hos);
  } else if (hosDbConfig.host) {
    await initHosPool(hosDbConfig);
  }
  
  if (savedConfig.mra) {
    await initMraPool(savedConfig.mra);
  } else if (mraDbConfig.host) {
    await initMraPool(mraDbConfig);
  }
}

// Initialize HOS Pool
async function initHosPool(config: any = hosDbConfig) {
  if (!config.host) {
    hosPool = null;
    return false;
  }
  try {
    if (hosPool) await hosPool.end();
    const charset = config.charset || 'tis620';
    hosPool = mysql.createPool({
      ...config,
      charset: 'binary', // Force binary to get raw bytes
      typeCast: function (field, next) {
        if (field.type === 'VAR_STRING' || field.type === 'STRING' || field.type === 'BLOB' || field.type === 'TEXT') {
          const buf = field.buffer();
          if (buf) {
            // Data is UTF-8 bytes interpreted as TIS-620, so we decode as UTF-8
            // If that fails, try windows-874
            try {
              return iconv.decode(buf, 'utf8');
            } catch (e) {
              return iconv.decode(buf, 'windows-874');
            }
          }
          return null;
        }
        return next();
      }
    });
    
    // Test connection
    const conn = await hosPool.getConnection();
    conn.release();
    
    console.log(`HOS MySQL pool initialized with charset: ${charset}`);
    return true;
  } catch (e) {
    console.error('Failed to initialize HOS MySQL pool:', e);
    hosPool = null;
    return false;
  }
}

// Initialize MRA Pool
async function initMraPool(config: any = mraDbConfig) {
  if (!config.host) {
    mraPool = null;
    return false;
  }
  try {
    if (mraPool) await mraPool.end();
    mraPool = mysql.createPool({
      ...config,
      charset: 'utf8mb4'
    });
    
    // Test and set session charset
    const conn = await mraPool.getConnection();
    await conn.query('SET NAMES utf8mb4');
    conn.release();
    
    console.log('MRA MySQL pool initialized with charset: utf8mb4');
    return true;
  } catch (e) {
    console.error('Failed to initialize MRA MySQL pool:', e);
    mraPool = null;
    return false;
  }
}

initAllPools();

// --- JSON Fallback Database (For MRA) ---
const MRA_JSON_FILE = path.join(process.cwd(), 'mra_data.json');

async function getJsonData() {
  try {
    const data = await fs.readFile(MRA_JSON_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { worksheets: [] };
  }
}

async function saveJsonData(data: any) {
  await fs.writeFile(MRA_JSON_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---

  // HOS Database Setup
  app.post('/api/setup-hos-db', async (req, res) => {
    const config = req.body.config;
    if (!config) return res.status(400).json({ success: false, message: 'Config is required' });
    
    try {
      const success = await initHosPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database || 'hos',
        port: parseInt(config.port || '3306'),
        charset: config.charset || 'tis620',
        connectTimeout: 10000
      });
      
      if (success) {
        // Save config
        const savedConfig = await getDbConfig();
        savedConfig.hos = {
          host: config.host,
          user: config.user,
          password: config.password,
          database: config.database || 'hos',
          port: parseInt(config.port || '3306'),
          charset: config.charset || 'tis620',
          connectTimeout: 10000
        };
        await saveDbConfig(savedConfig);
        
        res.json({ success: true, message: 'HosXP Database connected successfully' });
      } else {
        throw new Error('Failed to create pool');
      }
    } catch (error: any) {
      console.error('Setup HOS DB failed:', error);
      res.status(500).json({ success: false, message: 'Failed to connect HosXP: ' + error.message });
    }
  });

  // Database Setup (Create MRA database and tables)
  app.post('/api/setup-mra-db', async (req, res) => {
    const config = req.body.config || mraDbConfig;
    
    try {
      // 1. Try to create the database first (Connect without database name)
      const connectionConfig = {
        host: config.host,
        user: config.user,
        password: config.password,
        port: parseInt(config.port || '3306'),
        connectTimeout: 10000 // Increased timeout
      };
      
      let tempConn;
      try {
        tempConn = await mysql.createConnection(connectionConfig);
      } catch (connError: any) {
        if (connError.code === 'ETIMEDOUT') {
          throw new Error(`ไม่สามารถเชื่อมต่อกับ MySQL ที่ ${config.host}:${config.port} ได้ (Timeout) กรุณาตรวจสอบว่า IP ถูกต้องและเปิด Firewall แล้ว`);
        }
        if (connError.code === 'ECONNREFUSED') {
          throw new Error(`การเชื่อมต่อถูกปฏิเสธ (Connection Refused) กรุณาตรวจสอบว่า MySQL กำลังรันอยู่และอนุญาตการเชื่อมต่อจากภายนอก`);
        }
        throw connError;
      }
      
      await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database || 'mra_audit'}\` CHARACTER SET utf8 COLLATE utf8_general_ci`);
      await tempConn.end();
      
      // 2. Re-initialize MRA Pool with the correct database
      if (mraPool) await mraPool.end();
      mraPool = mysql.createPool({
        ...connectionConfig,
        database: config.database || 'mra_audit',
        charset: 'utf8mb4'
      });
      
      const connection = await mraPool.getConnection();
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            type ENUM('OPD', 'IPD') NOT NULL,
            default_limit INT DEFAULT 10,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY code_type (code, type)
          )
        `);

        // Insert default departments if table is empty
        const [deptRows]: any = await connection.query('SELECT COUNT(*) as count FROM departments');
        if (deptRows[0].count === 0) {
          const defaultDepts = [
            // OPD
            { code: '001', name: 'อายุรกรรม', type: 'OPD', limit: 10 },
            { code: '002', name: 'ศัลยกรรม', type: 'OPD', limit: 10 },
            { code: '003', name: 'สูติ-นรีเวชกรรม', type: 'OPD', limit: 10 },
            { code: '004', name: 'กุมารเวชกรรม', type: 'OPD', limit: 10 },
            { code: '005', name: 'ศัลยกรรมกระดูก', type: 'OPD', limit: 10 },
            { code: '011', name: 'จักษุ', type: 'OPD', limit: 10 },
            { code: '042', name: 'ทันตกรรม', type: 'OPD', limit: 10 },
            { code: '012', name: 'โสต ศอ นาสิก', type: 'OPD', limit: 10 },
            { code: '016', name: 'เวชกรรมฟื้นฟู', type: 'OPD', limit: 10 },
            { code: '017', name: 'แพทย์แผนไทย', type: 'OPD', limit: 10 },
            // IPD
            { code: '01', name: 'ตึกผู้ป่วยในชาย', type: 'IPD', limit: 10 },
            { code: '02', name: 'ตึกผู้ป่วยในหญิง', type: 'IPD', limit: 10 },
            { code: '03', name: 'ตึกสูติ-นรีเวช', type: 'IPD', limit: 10 },
            { code: '04', name: 'ตึกกุมารเวช', type: 'IPD', limit: 10 },
            { code: '05', name: 'ICU', type: 'IPD', limit: 10 },
          ];
          for (const d of defaultDepts) {
            await connection.query(
              'INSERT INTO departments (code, name, type, default_limit) VALUES (?, ?, ?, ?)',
              [d.code, d.name, d.type, d.limit]
            );
          }
        }

        await connection.query(`
          CREATE TABLE IF NOT EXISTS worksheets (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type ENUM('OPD', 'IPD') NOT NULL,
            department VARCHAR(255) NOT NULL,
            criteria_year VARCHAR(4) DEFAULT '2557',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Add criteria_year column if it doesn't exist
        try {
          await connection.query(`ALTER TABLE worksheets ADD COLUMN criteria_year VARCHAR(4) DEFAULT '2557'`);
        } catch (e: any) {
          if (e.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding criteria_year column:', e);
          }
        }

        await connection.query(`
          CREATE TABLE IF NOT EXISTS audit_cases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            worksheet_id VARCHAR(50) NOT NULL,
            hn VARCHAR(20) NOT NULL,
            an VARCHAR(20),
            vn VARCHAR(20),
            status VARCHAR(50) DEFAULT 'pending',
            doctor_name VARCHAR(255),
            regdate DATE,
            dchdate DATE,
            vstdate DATE,
            auditor_name VARCHAR(255),
            audit_date DATETIME,
            FOREIGN KEY (worksheet_id) REFERENCES worksheets(id) ON DELETE CASCADE
          )
        `);
        
        // Add auditor_name and audit_date columns if they don't exist
        try {
          await connection.query(`ALTER TABLE audit_cases ADD COLUMN auditor_name VARCHAR(255)`);
        } catch (e: any) {
          if (e.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding auditor_name column:', e);
          }
        }
        try {
          await connection.query(`ALTER TABLE audit_cases ADD COLUMN audit_date DATETIME`);
        } catch (e: any) {
          if (e.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding audit_date column:', e);
          }
        }
        
        await connection.query(`
          CREATE TABLE IF NOT EXISTS audit_scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            case_id INT NOT NULL,
            criteria_key VARCHAR(100) NOT NULL,
            score VARCHAR(10) NOT NULL,
            FOREIGN KEY (case_id) REFERENCES audit_cases(id) ON DELETE CASCADE
          )
        `);
        
        await connection.query(`
          CREATE TABLE IF NOT EXISTS audit_reasons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            case_id INT NOT NULL,
            criteria_key VARCHAR(100) NOT NULL,
            reason TEXT NOT NULL,
            FOREIGN KEY (case_id) REFERENCES audit_cases(id) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS users (
            loginname VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            role VARCHAR(20) DEFAULT 'user',
            password VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS user_worksheet_access (
            id INT AUTO_INCREMENT PRIMARY KEY,
            loginname VARCHAR(50) NOT NULL,
            worksheet_id VARCHAR(50) NOT NULL,
            FOREIGN KEY (loginname) REFERENCES users(loginname) ON DELETE CASCADE,
            FOREIGN KEY (worksheet_id) REFERENCES worksheets(id) ON DELETE CASCADE,
            UNIQUE KEY (loginname, worksheet_id)
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS user_department_access (
            id INT AUTO_INCREMENT PRIMARY KEY,
            loginname VARCHAR(50) NOT NULL,
            department_name VARCHAR(255) NOT NULL,
            FOREIGN KEY (loginname) REFERENCES users(loginname) ON DELETE CASCADE,
            UNIQUE KEY (loginname, department_name)
          )
        `);
        
        // Save config
        const savedConfig = await getDbConfig();
        savedConfig.mra = {
          ...connectionConfig,
          database: config.database || 'mra_audit'
        };
        await saveDbConfig(savedConfig);
        
        res.json({ success: true, message: 'MRA Database and tables initialized successfully' });
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.error('Setup MRA DB failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to setup MRA database: ' + error.message,
        error: error.code
      });
    }
  });

  // Login (Uses HOS Database for Auth, MRA Database for Permissions)
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const cleanUsername = username ? username.trim() : '';
    
    console.log(`Login attempt: ${cleanUsername}`);

    // Default Admin Bypass (For initial setup or emergency)
    if (cleanUsername.toLowerCase() === 'admin' && password === 'admin') {
      console.log('Default admin bypass triggered');
      const adminUser = {
        loginname: 'admin',
        name: 'System Administrator',
        department: 'IT',
        role: 'admin'
      };

      // Ensure admin exists in MRA database if possible
      if (mraPool) {
        try {
          await mraPool.execute(
            'INSERT INTO users (loginname, name, department, role, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE role="admin", is_active=TRUE',
            ['admin', 'System Administrator', 'IT', 'admin', true]
          );
        } catch (e) {
          console.warn('Failed to sync default admin to MRA DB');
        }
      }

      return res.json({ success: true, message: 'เข้าสู่ระบบด้วยสิทธิ์ผู้ดูแลระบบเริ่มต้น', user: adminUser });
    }

    try {
      // 1. Check Local MRA Database first (for local-only users or overridden passwords)
      if (mraPool) {
        const [mraRows] = await mraPool.execute<mysql.RowDataPacket[]>(
          'SELECT loginname, name, department, role, is_active, password FROM users WHERE LOWER(loginname) = ?',
          [cleanUsername.toLowerCase()]
        );

        if (mraRows.length > 0) {
          const localUser = mraRows[0];
          console.log(`Found local user: ${localUser.loginname}, hasPassword: ${!!localUser.password}`);
          
          // If local user has a password set, check it
          if (localUser.password) {
            const isMatch = await bcrypt.compare(password, localUser.password);
            console.log(`Local password match: ${isMatch}`);
            
            if (isMatch) {
              if (!localUser.is_active) {
                return res.status(403).json({ success: false, message: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
              }

              return res.json({ 
                success: true, 
                message: 'เข้าสู่ระบบสำเร็จ (Local)', 
                user: {
                  loginname: localUser.loginname,
                  name: localUser.name,
                  department: localUser.department,
                  role: localUser.role
                } 
              });
            }
          }
        }
      }

      if (hosPool) {
        // 2. Check Authentication in HosXP
        const [hosRows] = await hosPool.execute<mysql.RowDataPacket[]>(
          'SELECT loginname, name, department FROM opduser WHERE (loginname = ? OR loginname = ?) AND (password = MD5(?) OR password = MD5(UPPER(?))) AND (account_disable IS NULL OR account_disable <> "Y")',
          [cleanUsername, cleanUsername.toUpperCase(), password, password]
        );

        if (hosRows.length > 0) {
          const hosUser = hosRows[0];
          const loginName = hosUser.loginname.toLowerCase();
          
          // 2. Check Permissions in MRA Database
          let userRole = 'user';
          let isActive = true;
          let localUserFound = false;

          if (mraPool) {
            try {
              const [mraRows] = await mraPool.execute<mysql.RowDataPacket[]>(
                'SELECT role, is_active FROM users WHERE LOWER(loginname) = ?',
                [loginName]
              );

              if (mraRows.length > 0) {
                userRole = mraRows[0].role;
                isActive = mraRows[0].is_active;
                localUserFound = true;
              }
            } catch (mraErr) {
              console.warn('MRA User table check failed, might not be initialized yet');
            }
          }

          // Bootstrap Admins (always allowed if authenticated in HosXP)
          const bootstrapAdmins = ['0176', '0382', 'admin'];
          const isBootstrapAdmin = bootstrapAdmins.includes(loginName) || 
                                   bootstrapAdmins.includes(cleanUsername.toLowerCase()) ||
                                   hosUser.department === 'IT';

          if (isBootstrapAdmin) {
            userRole = 'admin';
            isActive = true;
            
            // Auto-create/update bootstrap admin in local users if possible
            if (mraPool) {
              try {
                await mraPool.execute(
                  'INSERT INTO users (loginname, name, department, role, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE role="admin", is_active=TRUE',
                  [hosUser.loginname, hosUser.name, hosUser.department, 'admin', true]
                );
              } catch (e) {
                // Ignore if table doesn't exist yet
              }
            }
          }

          if (!isActive && !isBootstrapAdmin) {
            return res.status(403).json({ success: false, message: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
          }

          // If not a bootstrap admin and not in local users, they don't have access
          if (!localUserFound && !isBootstrapAdmin) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าใช้งานระบบนี้ กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มชื่อผู้ใช้งาน' });
          }

          const user = {
            loginname: hosUser.loginname,
            name: hosUser.name,
            department: hosUser.department,
            role: userRole
          };

          return res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', user });
        } else {
          return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        }
      } else {
        throw new Error('HOS Database pool is not initialized (Mock Mode)');
      }
    } catch (dbError) {
      console.error('Login fallback to Mock Mode due to error:', dbError);
      return res.json({ 
        success: true, 
        message: 'เข้าสู่ระบบสำเร็จ (Mock Mode)', 
        user: { 
          loginname: cleanUsername || 'admin',
          name: cleanUsername || 'Admin User', 
          department: 'IT', 
          role: 'admin' 
        } 
      });
    }
  });

  // Get specific VN for OPD
  app.get('/api/audit/opd/vn/:vn', async (req, res) => {
    if (!hosPool) {
      return res.status(500).json({ success: false, message: 'HOS Database not connected' });
    }

    const { vn } = req.params;

    try {
      const query = `
        SELECT 
          v.hn,
          v.vstdate,
          CONVERT(CAST(d.name AS BINARY) USING tis620) as doctor_name
        FROM vn_stat v
        LEFT JOIN doctor d ON v.dx_doctor = d.code
        WHERE v.vn = ?
      `;

      const [rows] = await hosPool.query<mysql.RowDataPacket[]>(query, [vn]);

      if (rows.length > 0) {
        const row = rows[0];
        const formattedCase = {
          hn: row.hn,
          vstdate: row.vstdate ? new Date(row.vstdate).toISOString().split('T')[0] : '',
          doctor_name: row.doctor_name || 'ไม่ระบุแพทย์'
        };
        res.json({ success: true, data: formattedCase });
      } else {
        res.json({ success: false, message: 'ไม่พบข้อมูล VN นี้' });
      }
    } catch (error: any) {
      console.error('Error fetching specific VN:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get specific AN for IPD
  app.get('/api/audit/ipd/an/:an', async (req, res) => {
    if (!hosPool) {
      return res.status(500).json({ success: false, message: 'HOS Database not connected' });
    }

    const { an } = req.params;

    try {
      const query = `
        SELECT 
          i.hn,
          i.an,
          i.regdate,
          i.dchdate,
          d.name as doctor_name
        FROM ipt i
        LEFT JOIN doctor d ON i.dch_doctor = d.code
        WHERE i.an = ?
      `;

      const [rows] = await hosPool.query<mysql.RowDataPacket[]>(query, [an]);

      if (rows.length > 0) {
        const row = rows[0];
        const formattedCase = {
          hn: row.hn,
          an: row.an,
          regdate: row.regdate ? new Date(row.regdate).toISOString().split('T')[0] : '',
          dchdate: row.dchdate ? new Date(row.dchdate).toISOString().split('T')[0] : '',
          doctor_name: row.doctor_name || 'ไม่ระบุแพทย์'
        };
        res.json({ success: true, data: formattedCase });
      } else {
        res.json({ success: false, message: 'ไม่พบข้อมูล AN นี้' });
      }
    } catch (error: any) {
      console.error('Error fetching specific AN:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // --- Departments API ---
  app.get('/api/departments', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    try {
      const [departments] = await mraPool.execute<mysql.RowDataPacket[]>('SELECT * FROM departments ORDER BY type DESC, code ASC');
      res.json({ success: true, data: departments });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/departments', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { code, name, type, default_limit } = req.body;
    try {
      await mraPool.execute(
        'INSERT INTO departments (code, name, type, default_limit) VALUES (?, ?, ?, ?)',
        [code, name, type, default_limit || 10]
      );
      res.json({ success: true, message: 'เพิ่มแผนกสำเร็จ' });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ success: false, message: 'รหัสแผนกซ้ำในประเภทนี้' });
      } else {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  });

  app.put('/api/departments/:id', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { id } = req.params;
    const { code, name, type, default_limit } = req.body;
    try {
      await mraPool.execute(
        'UPDATE departments SET code = ?, name = ?, type = ?, default_limit = ? WHERE id = ?',
        [code, name, type, default_limit || 10, id]
      );
      res.json({ success: true, message: 'แก้ไขแผนกสำเร็จ' });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ success: false, message: 'รหัสแผนกซ้ำในประเภทนี้' });
      } else {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  });

  app.delete('/api/departments/:id', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { id } = req.params;
    try {
      await mraPool.execute('DELETE FROM departments WHERE id = ?', [id]);
      res.json({ success: true, message: 'ลบแผนกสำเร็จ' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // --- User Management API ---

  // List all local users
  app.get('/api/users', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    try {
      const [users] = await mraPool.execute<mysql.RowDataPacket[]>('SELECT * FROM users ORDER BY created_at DESC');
      const [access] = await mraPool.execute<mysql.RowDataPacket[]>('SELECT * FROM user_department_access');
      
      const usersWithAccess = users.map(user => ({
        ...user,
        mapped_departments: access
          .filter(a => a.loginname === user.loginname)
          .map(a => a.department_name)
      }));

      res.json({ success: true, users: usersWithAccess });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Add user to local system
  app.post('/api/users', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { loginname, name, departments, role, password } = req.body;
    
    // Fallback for old clients sending 'department' string
    const depsArray = departments || (req.body.department ? [req.body.department] : []);
    const mainDepartment = depsArray.length > 0 ? depsArray[0] : null;
    const displayDepartment = depsArray.join(', ');

    const connection = await mraPool.getConnection();
    try {
      await connection.beginTransaction();

      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      
      await connection.execute(
        'INSERT INTO users (loginname, name, department, role, password) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, department=?, role=?, password=COALESCE(?, password)',
        [loginname, name, displayDepartment, role || 'user', hashedPassword, name, displayDepartment, role || 'user', hashedPassword]
      );

      // Insert into user_department_access
      await connection.execute('DELETE FROM user_department_access WHERE loginname = ?', [loginname]);
      
      if (depsArray.length > 0) {
        for (const dep of depsArray) {
          await connection.execute(
            'INSERT INTO user_department_access (loginname, department_name) VALUES (?, ?)',
            [loginname, dep]
          );
        }
      }

      await connection.commit();
      res.json({ success: true, message: 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว' });
    } catch (error: any) {
      await connection.rollback();
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  });

  // Update user role/status/password
  app.put('/api/users/:loginname', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { loginname } = req.params;
    const { role, is_active, password, name, department } = req.body;
    try {
      let query = 'UPDATE users SET role = ?, is_active = ?';
      let params: any[] = [role, is_active];

      if (name) {
        query += ', name = ?';
        params.push(name);
      }
      if (department) {
        query += ', department = ?';
        params.push(department);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += ', password = ?';
        params.push(hashedPassword);
      }

      query += ' WHERE loginname = ?';
      params.push(loginname);

      await mraPool.execute(query, params);
      res.json({ success: true, message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Delete user
  app.delete('/api/users/:loginname', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { loginname } = req.params;
    try {
      await mraPool.execute('DELETE FROM users WHERE loginname = ?', [loginname]);
      res.json({ success: true, message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get user worksheet access
  app.get('/api/users/:loginname/access', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { loginname } = req.params;
    try {
      const [depRows] = await mraPool.execute(
        'SELECT department_name FROM user_department_access WHERE loginname = ?',
        [loginname]
      );
      res.json({ 
        success: true, 
        departmentAccess: depRows
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Update user worksheet access
  app.post('/api/users/:loginname/access', async (req, res) => {
    if (!mraPool) return res.status(500).json({ success: false, message: 'MRA Database not connected' });
    const { loginname } = req.params;
    const { departmentNames } = req.body; // Arrays

    const connection = await mraPool.getConnection();
    try {
      await connection.beginTransaction();

      // Update Department Access
      if (departmentNames !== undefined) {
        await connection.execute('DELETE FROM user_department_access WHERE loginname = ?', [loginname]);
        if (departmentNames && departmentNames.length > 0) {
          for (const depName of departmentNames) {
            await connection.execute(
              'INSERT INTO user_department_access (loginname, department_name) VALUES (?, ?)',
              [loginname, depName]
            );
          }
        }
      }
      
      await connection.commit();
      res.json({ success: true, message: 'อัปเดตสิทธิ์การเข้าถึงเรียบร้อยแล้ว' });
    } catch (error: any) {
      await connection.rollback();
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  });

  // Fetch random OPD cases (Uses HOS Database)
  app.post('/api/audit/opd/random', async (req, res) => {
    const { startDate, endDate, limit = 6, depCode = '042' } = req.body;
    
    try {
      if (hosPool) {
        const query = `
          SELECT o.hn, o.vstdate, d.name as doctor_name 
          FROM ovst o
          JOIN doctor d ON o.doctor = d.code
          LEFT JOIN opduser ou ON d.name = ou.name
          JOIN opdscreen oo ON o.vn = oo.vn
          JOIN vn_stat v ON o.vn = v.vn
          WHERE o.vstdate BETWEEN ? AND ?
            AND o.main_dep IN (?)
            AND (oo.cc NOT LIKE '%ญาติ%' AND oo.cc NOT LIKE '%ขอใบ%')
            AND d.position_id = '1'
            AND v.pdx NOT IN ('Z000', 'Z017')
            AND (
              (o.main_dep NOT IN ('005', '042', '041'))
              OR
              (o.main_dep = '005' AND ou.groupname = 'ทันตแพทย์')
              OR
              (o.main_dep = '042' AND ou.groupname = 'นักกายภาพ')
              OR
              (o.main_dep = '041' AND ou.groupname = 'จนท.แพทย์แผนไทย')
            )
          ORDER BY RAND() 
          LIMIT ?
        `;
        const [rows] = await hosPool.query(query, [startDate, endDate, depCode, parseInt(limit)]);
        return res.json({ success: true, data: rows });
      } else {
        throw new Error('HOS Database pool is not initialized');
      }
    } catch (dbError) {
      const mockData = Array.from({ length: limit }).map((_, i) => ({
        hn: `000${Math.floor(10000 + Math.random() * 90000)}`,
        vstdate: startDate,
        doctor_name: `นพ. ทดสอบ ${i + 1}`
      }));
      return res.json({ success: true, data: mockData, mock: true });
    }
  });

  // Fetch random IPD cases (Uses HOS Database)
  app.post('/api/audit/ipd/random', async (req, res) => {
    const { startDate, endDate, limit = 5, wardCode = '01' } = req.body;
    
    try {
      if (hosPool) {
        const query = `
          SELECT a.an, t.dchdate, d.name as doctor_name, o.hn, t.regdate 
          FROM ovst o
          LEFT JOIN ipt t ON t.an = o.an  
          LEFT JOIN doctor d ON t.dch_doctor = d.code   
          LEFT JOIN an_stat a ON o.an = a.an   
          WHERE o.vstdate BETWEEN ? AND ?   
            AND d.position_id = '1' 
            AND t.ward = ?
          ORDER BY RAND() 
          LIMIT ?
        `;
        const [rows] = await hosPool.query(query, [startDate, endDate, wardCode, parseInt(limit)]);
        return res.json({ success: true, data: rows });
      } else {
        throw new Error('HOS Database pool is not initialized');
      }
    } catch (dbError) {
      const mockData = Array.from({ length: limit }).map((_, i) => ({
        hn: `000${Math.floor(10000 + Math.random() * 90000)}`,
        an: `67${Math.floor(100000 + Math.random() * 900000)}`,
        regdate: startDate,
        dchdate: endDate,
        doctor_name: `นพ. ทดสอบ ${i + 1}`
      }));
      return res.json({ success: true, data: mockData, mock: true });
    }
  });

  // --- MRA Persistence Endpoints (Uses MRA Database) ---

  app.get('/api/mra/worksheets', async (req, res) => {
    const { loginname, role } = req.query;

    const fetchFromJson = async () => {
      const data = await getJsonData();
      return res.json({ success: true, data: data.worksheets, mock: true });
    };

    if (!mraPool) {
      return await fetchFromJson();
    }
    
    try {
      let query = 'SELECT * FROM worksheets';
      let params: any[] = [];

      if (role !== 'admin' && loginname) {
        query = `
          SELECT DISTINCT w.* FROM worksheets w
          LEFT JOIN user_department_access uda ON w.department = uda.department_name
          LEFT JOIN users u ON u.loginname = ?
          WHERE uda.loginname = ? 
             OR w.department = u.department
        `;
        params = [loginname, loginname];
      }

      const [worksheets] = await mraPool.query<mysql.RowDataPacket[]>(query + ' ORDER BY created_at DESC', params);
      
      if (worksheets.length > 0) {
        const wsIds = worksheets.map(w => w.id);
        const [allCases] = await mraPool.query<mysql.RowDataPacket[]>(
          'SELECT * FROM audit_cases WHERE worksheet_id IN (?)', 
          [wsIds]
        );
        
        worksheets.forEach(ws => {
          ws.cases = allCases.filter(c => c.worksheet_id === ws.id);
        });
      }
      
      res.json({ success: true, data: worksheets });
    } catch (error: any) {
      console.warn('Failed to fetch worksheets from DB, falling back to JSON:', error.message);
      return await fetchFromJson();
    }
  });

  app.get('/api/mra/worksheets/:id', async (req, res) => {
    const { loginname, role } = req.query;

    const fetchFromJson = async () => {
      const data = await getJsonData();
      const ws = data.worksheets.find((w: any) => w.id === req.params.id);
      if (!ws) return res.status(404).json({ success: false, message: 'Worksheet not found' });
      return res.json({ success: true, data: ws, mock: true });
    };

    if (!mraPool) {
      return await fetchFromJson();
    }
    
    try {
      let query = 'SELECT * FROM worksheets WHERE id = ?';
      let params: any[] = [req.params.id];

      if (role !== 'admin' && loginname) {
        query = `
          SELECT w.* FROM worksheets w
          JOIN user_worksheet_access uwa ON w.id = uwa.worksheet_id
          WHERE w.id = ? AND uwa.loginname = ?
        `;
        params = [req.params.id, loginname];
      }

      const [worksheets] = await mraPool.query<mysql.RowDataPacket[]>(query, params);
      if (worksheets.length === 0) return res.status(404).json({ success: false, message: 'Worksheet not found or access denied' });
      
      const ws = worksheets[0];
      const [cases] = await mraPool.query<mysql.RowDataPacket[]>('SELECT * FROM audit_cases WHERE worksheet_id = ?', [ws.id]);
      
      if (cases.length > 0) {
        const caseIds = cases.map(c => c.id);
        const [allScores] = await mraPool.query<mysql.RowDataPacket[]>('SELECT case_id, criteria_key, score FROM audit_scores WHERE case_id IN (?)', [caseIds]);
        const [allReasons] = await mraPool.query<mysql.RowDataPacket[]>('SELECT case_id, criteria_key, reason FROM audit_reasons WHERE case_id IN (?)', [caseIds]);
        
        cases.forEach(c => {
          const caseScores = allScores.filter(s => s.case_id === c.id);
          const caseReasons = allReasons.filter(r => r.case_id === c.id);
          
          c.scores = caseScores.reduce((acc, curr) => ({ ...acc, [curr.criteria_key]: curr.score }), {});
          c.reasons = caseReasons.reduce((acc, curr) => ({ ...acc, [curr.criteria_key]: curr.reason }), {});
        });
      }
      
      ws.cases = cases;
      res.json({ success: true, data: ws });
    } catch (error: any) {
      console.warn('Failed to fetch worksheet details from DB, falling back to JSON:', error.message);
      return await fetchFromJson();
    }
  });

  app.post('/api/mra/worksheets/:wsId/audit', async (req, res) => {
    const saveToJson = async () => {
      const data = await getJsonData();
      const { wsId } = req.params;
      const { hn, an, scores, reasons, status } = req.body;
      
      const wsIndex = data.worksheets.findIndex((w: any) => w.id === wsId);
      if (wsIndex === -1) return res.status(404).json({ success: false, message: 'Worksheet not found' });
      
      const caseIndex = data.worksheets[wsIndex].cases.findIndex((c: any) => c.hn === hn && (c.an === an || !an));
      if (caseIndex === -1) return res.status(404).json({ success: false, message: 'Case not found' });
      
      data.worksheets[wsIndex].cases[caseIndex] = {
        ...data.worksheets[wsIndex].cases[caseIndex],
        status,
        scores,
        reasons
      };
      
      await saveJsonData(data);
      return res.json({ success: true, mock: true });
    };

    if (!mraPool) {
      return await saveToJson();
    }
    
    const { hn, an, scores, reasons, status, remarks } = req.body;
    const { wsId } = req.params;
    
    try {
      const connection = await mraPool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Find the case id
        const [cases] = await connection.query<mysql.RowDataPacket[]>(
          'SELECT id FROM audit_cases WHERE worksheet_id = ? AND hn = ? AND (an = ? OR an IS NULL)',
          [wsId, hn, an || null]
        );
        
        if (cases.length === 0) throw new Error('Case not found in worksheet');
        const caseId = cases[0].id;
        
        // Update case status
        await connection.query(
          'UPDATE audit_cases SET status = ?, auditor_name = ?, audit_date = ? WHERE id = ?', 
          [status, req.body.auditor_name || null, req.body.audit_date ? new Date(req.body.audit_date) : null, caseId]
        );
        
        // Save scores
        await connection.query('DELETE FROM audit_scores WHERE case_id = ?', [caseId]);
        for (const [key, val] of Object.entries(scores || {})) {
          await connection.query(
            'INSERT INTO audit_scores (case_id, criteria_key, score) VALUES (?, ?, ?)',
            [caseId, key, val]
          );
        }
        
        // Save reasons
        await connection.query('DELETE FROM audit_reasons WHERE case_id = ?', [caseId]);
        for (const [key, val] of Object.entries(reasons || {})) {
          await connection.query(
            'INSERT INTO audit_reasons (case_id, criteria_key, reason) VALUES (?, ?, ?)',
            [caseId, key, val]
          );
        }
        
        await connection.commit();
        res.json({ success: true });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.warn('Save audit to DB failed, falling back to JSON:', error.message);
      return await saveToJson();
    }
  });

  app.post('/api/mra/worksheets', async (req, res) => {
    const saveToJson = async () => {
      const data = await getJsonData();
      const newWs = req.body;
      const index = data.worksheets.findIndex((w: any) => w.id === newWs.id);
      if (index !== -1) {
        data.worksheets[index] = newWs;
      } else {
        data.worksheets.push(newWs);
      }
      await saveJsonData(data);
      return res.json({ success: true, mock: true });
    };

    if (!mraPool) {
      return await saveToJson();
    }
    
    const { id, name, type, department, criteria_year, cases } = req.body;
    
    try {
      const connection = await mraPool.getConnection();
      await connection.beginTransaction();
      
      try {
        await connection.query(
          'INSERT INTO worksheets (id, name, type, department, criteria_year) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, type=?, department=?, criteria_year=?',
          [id, name, type, department, criteria_year || '2557', name, type, department, criteria_year || '2557']
        );
        
        await connection.query('DELETE FROM audit_cases WHERE worksheet_id = ?', [id]);
        
        for (const c of cases) {
          await connection.query(
            'INSERT INTO audit_cases (worksheet_id, hn, an, vn, status, doctor_name, regdate, dchdate, vstdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, c.hn, c.an || null, c.vn || null, c.status || 'pending', c.doctor_name, c.regdate || null, c.dchdate || null, c.vstdate || null]
          );
        }
        
        await connection.commit();
        res.json({ success: true });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.warn('Failed to save worksheet to DB, falling back to JSON:', error.message);
      return await saveToJson();
    }
  });

  app.delete('/api/mra/worksheets/:id', async (req, res) => {
    const deleteFromJson = async () => {
      const data = await getJsonData();
      data.worksheets = data.worksheets.filter((w: any) => w.id !== req.params.id);
      await saveJsonData(data);
      return res.json({ success: true, mock: true });
    };

    if (!mraPool) {
      return await deleteFromJson();
    }
    try {
      await mraPool.query('DELETE FROM worksheets WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      console.warn('Failed to delete worksheet from DB, falling back to JSON:', error.message);
      return await deleteFromJson();
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled Express Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

startServer();
