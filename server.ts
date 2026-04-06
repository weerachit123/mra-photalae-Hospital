import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';

// --- Database Configurations ---

// HOS Database (HIS)
const hosDbHost = process.env.HOS_DB_HOST || '192.168.0.5';
const hosDbConfig = {
  host: hosDbHost,
  user: process.env.HOS_DB_USER || 'root',
  password: process.env.HOS_DB_PASSWORD || '',
  database: process.env.HOS_DB_NAME || 'hos',
  port: parseInt(process.env.HOS_DB_PORT || '3306'),
  connectTimeout: 3000
};

// MRA Database (Audit)
const mraDbHost = process.env.MRA_DB_HOST || '192.168.0.5';
const mraDbConfig = {
  host: mraDbHost,
  user: process.env.MRA_DB_USER || 'root',
  password: process.env.MRA_DB_PASSWORD || '',
  database: process.env.MRA_DB_NAME || 'mra_audit',
  port: parseInt(process.env.MRA_DB_PORT || '3306'),
  connectTimeout: 3000
};

const isLocalIP = (host: string) => host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');

let hosPool: mysql.Pool | null = null;
let mraPool: mysql.Pool | null = null;

// Initialize HOS Pool
if (!isLocalIP(hosDbHost) || process.env.FORCE_DB_CONNECT === 'true') {
  try {
    hosPool = mysql.createPool(hosDbConfig);
    console.log('HOS MySQL pool created');
  } catch (e) {
    console.error('Failed to create HOS MySQL pool:', e);
  }
}

// Initialize MRA Pool
if (!isLocalIP(mraDbHost) || process.env.FORCE_DB_CONNECT === 'true') {
  try {
    mraPool = mysql.createPool(mraDbConfig);
    console.log('MRA MySQL pool created');
  } catch (e) {
    console.error('Failed to create MRA MySQL pool:', e);
  }
}

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

  // Database Setup (Create MRA tables if they don't exist)
  app.post('/api/setup-mra-db', async (req, res) => {
    if (!mraPool) {
      // If no pool, just ensure the JSON file exists
      await getJsonData();
      return res.json({ success: true, message: 'MRA JSON Fallback initialized (No MySQL connection)' });
    }
    
    try {
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
        
        res.json({ success: true, message: 'MRA Database tables initialized' });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Setup MRA DB failed:', error);
      res.status(500).json({ success: false, message: 'Failed to setup MRA database' });
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
          // Simple role assignment: IT department or specific names are admins
          if (user.department === 'IT' || user.loginname === 'admin' || user.name === 'Admin User') {
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
    if (!mraPool) {
      const data = await getJsonData();
      return res.json({ success: true, data: data.worksheets, mock: true });
    }
    
    try {
      const [worksheets] = await mraPool.query<mysql.RowDataPacket[]>('SELECT * FROM worksheets ORDER BY created_at DESC');
      
      for (const ws of worksheets) {
        const [cases] = await mraPool.query<mysql.RowDataPacket[]>('SELECT * FROM audit_cases WHERE worksheet_id = ?', [ws.id]);
        ws.cases = cases;
      }
      
      res.json({ success: true, data: worksheets });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch worksheets' });
    }
  });

  app.get('/api/mra/worksheets/:id', async (req, res) => {
    if (!mraPool) {
      const data = await getJsonData();
      const ws = data.worksheets.find((w: any) => w.id === req.params.id);
      if (!ws) return res.status(404).json({ success: false, message: 'Worksheet not found' });
      return res.json({ success: true, data: ws, mock: true });
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
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch worksheet details' });
    }
  });

  app.post('/api/mra/worksheets/:wsId/audit', async (req, res) => {
    if (!mraPool) {
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
    } catch (error) {
      console.error('Save audit failed:', error);
      res.status(500).json({ success: false, message: 'Failed to save audit data' });
    }
  });

  app.post('/api/mra/worksheets', async (req, res) => {
    if (!mraPool) {
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
        
        // For updates, we might want to be careful not to delete audit data if we're just refreshing cases
        // But for now, let's follow the simple logic
        await connection.query('DELETE FROM audit_cases WHERE worksheet_id = ?', [id]);
        
        for (const c of cases) {
          await connection.query(
            'INSERT INTO audit_cases (worksheet_id, hn, an, status, doctor_name, regdate, dchdate, vstdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, c.hn, c.an || null, c.status || 'pending', c.doctor_name, c.regdate || null, c.dchdate || null, c.vstdate || null]
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
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to save worksheet' });
    }
  });

  app.delete('/api/mra/worksheets/:id', async (req, res) => {
    if (!mraPool) {
      const data = await getJsonData();
      data.worksheets = data.worksheets.filter((w: any) => w.id !== req.params.id);
      await saveJsonData(data);
      return res.json({ success: true, mock: true });
    }
    try {
      await mraPool.query('DELETE FROM worksheets WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete worksheet' });
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
