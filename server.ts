import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';

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
  connectTimeout: 3000
};

// MRA Database (Audit)
let mraPool: mysql.Pool | null = null;
const mraDbConfig = {
  host: process.env.MRA_DB_HOST || '',
  user: process.env.MRA_DB_USER || 'root',
  password: process.env.MRA_DB_PASSWORD || '',
  database: process.env.MRA_DB_NAME || 'mra_audit',
  port: parseInt(process.env.MRA_DB_PORT || '3306'),
  connectTimeout: 3000
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
async function initHosPool(config = hosDbConfig) {
  if (!config.host) {
    hosPool = null;
    return false;
  }
  try {
    if (hosPool) await hosPool.end();
    hosPool = mysql.createPool(config);
    console.log('HOS MySQL pool initialized');
    return true;
  } catch (e) {
    console.error('Failed to initialize HOS MySQL pool:', e);
    hosPool = null;
    return false;
  }
}

// Initialize MRA Pool
async function initMraPool(config = mraDbConfig) {
  if (!config.host) {
    mraPool = null;
    return false;
  }
  try {
    if (mraPool) await mraPool.end();
    mraPool = mysql.createPool(config);
    console.log('MRA MySQL pool initialized');
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
        connectTimeout: 10000
      });
      
      if (success) {
        // Test connection
        const connection = await hosPool!.getConnection();
        connection.release();
        
        // Save config
        const savedConfig = await getDbConfig();
        savedConfig.hos = {
          host: config.host,
          user: config.user,
          password: config.password,
          database: config.database || 'hos',
          port: parseInt(config.port || '3306'),
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
        database: config.database || 'mra_audit'
      });
      
      const connection = await mraPool.getConnection();
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS worksheets (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type ENUM('OPD', 'IPD') NOT NULL,
            department VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
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
            FOREIGN KEY (worksheet_id) REFERENCES worksheets(id) ON DELETE CASCADE
          )
        `);
        
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

  // Login (Uses HOS Database)
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      if (hosPool) {
        const [rows] = await hosPool.execute<mysql.RowDataPacket[]>(
          'SELECT loginname, name, department FROM opduser WHERE loginname = ? AND password = ? AND (account_disable IS NULL OR account_disable <> "Y")',
          [username, password]
        );

        if (rows.length > 0) {
          const user = rows[0];
          // Simple role assignment: IT department or specific names/IDs are admins
          const adminIds = ['0176', '0382', 'admin'];
          if (user.department === 'IT' || adminIds.includes(user.loginname) || user.name === 'Admin User') {
            user.role = 'admin';
          } else {
            user.role = 'user';
          }
          return res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', user });
        } else {
          return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        }
      } else {
        throw new Error('HOS Database pool is not initialized (Mock Mode)');
      }
    } catch (dbError) {
      return res.json({ 
        success: true, 
        message: 'เข้าสู่ระบบสำเร็จ (Mock Mode)', 
        user: { name: username || 'Admin User', department: 'IT', role: 'admin' } 
      });
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
          JOIN opdscreen oo ON o.vn = oo.vn
          JOIN vn_stat v ON o.vn = v.vn
          WHERE o.vstdate BETWEEN ? AND ?
            AND o.main_dep IN (?)
            AND (oo.cc NOT LIKE '%ญาติ%' AND oo.cc NOT LIKE '%ขอใบ%')
            AND d.position_id = '1'
            AND v.pdx NOT IN ('Z000', 'Z017')
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
    const fetchFromJson = async () => {
      const data = await getJsonData();
      return res.json({ success: true, data: data.worksheets, mock: true });
    };

    if (!mraPool) {
      return await fetchFromJson();
    }
    
    try {
      const [worksheets] = await mraPool.query<mysql.RowDataPacket[]>('SELECT * FROM worksheets ORDER BY created_at DESC');
      
      for (const ws of worksheets) {
        const [cases] = await mraPool.query<mysql.RowDataPacket[]>('SELECT * FROM audit_cases WHERE worksheet_id = ?', [ws.id]);
        ws.cases = cases;
      }
      
      res.json({ success: true, data: worksheets });
    } catch (error: any) {
      console.warn('Failed to fetch worksheets from DB, falling back to JSON:', error.message);
      return await fetchFromJson();
    }
  });

  app.get('/api/mra/worksheets/:id', async (req, res) => {
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
      const [worksheets] = await mraPool.query<mysql.RowDataPacket[]>('SELECT * FROM worksheets WHERE id = ?', [req.params.id]);
      if (worksheets.length === 0) return res.status(404).json({ success: false, message: 'Worksheet not found' });
      
      const ws = worksheets[0];
      const [cases] = await mraPool.query<mysql.RowDataPacket[]>('SELECT * FROM audit_cases WHERE worksheet_id = ?', [ws.id]);
      
      // Fetch scores and reasons for each case
      for (const c of cases) {
        const [scores] = await mraPool.query<mysql.RowDataPacket[]>('SELECT criteria_key, score FROM audit_scores WHERE case_id = ?', [c.id]);
        const [reasons] = await mraPool.query<mysql.RowDataPacket[]>('SELECT criteria_key, reason FROM audit_reasons WHERE case_id = ?', [c.id]);
        
        c.scores = scores.reduce((acc, curr) => ({ ...acc, [curr.criteria_key]: curr.score }), {});
        c.reasons = reasons.reduce((acc, curr) => ({ ...acc, [curr.criteria_key]: curr.reason }), {});
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
        await connection.query('UPDATE audit_cases SET status = ? WHERE id = ?', [status, caseId]);
        
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
    
    const { id, name, type, department, cases } = req.body;
    
    try {
      const connection = await mraPool.getConnection();
      await connection.beginTransaction();
      
      try {
        await connection.query(
          'INSERT INTO worksheets (id, name, type, department) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, type=?, department=?',
          [id, name, type, department, name, type, department]
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
}

startServer();
