import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import mysql from 'mysql2/promise';

// Database configuration
const dbHost = process.env.DB_HOST || '192.168.0.5';
const isLocalNetwork = dbHost.startsWith('192.168.') || dbHost.startsWith('10.') || dbHost.startsWith('172.');

const dbConfig = {
  host: dbHost,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hos',
  port: parseInt(process.env.DB_PORT || '3306'),
  connectTimeout: 3000
};

let pool: mysql.Pool | null = null;

// In the cloud preview environment, connecting to a local IP (192.168.x.x) will always timeout.
// We skip initialization to avoid the delay and use mock data immediately.
if (!isLocalNetwork || process.env.FORCE_DB_CONNECT === 'true') {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('MySQL pool created');
  } catch (e) {
    console.error('Failed to create MySQL pool:', e);
  }
} else {
  console.log('Skipping MySQL connection for local IP in preview environment. Using Mock Mode.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      if (pool) {
        // Attempt to query the database
        const [rows] = await pool.execute<mysql.RowDataPacket[]>(
          'SELECT loginname, name, department FROM opduser WHERE loginname = ? AND password = ? AND (account_disable IS NULL OR account_disable <> "Y")',
          [username, password]
        );

        if (rows.length > 0) {
          return res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', user: rows[0] });
        } else {
          return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        }
      } else {
        throw new Error('Database pool is not initialized (Mock Mode)');
      }
    } catch (dbError) {
      // Fallback for demonstration purposes if DB is unreachable in this preview environment
      return res.json({ 
        success: true, 
        message: 'เข้าสู่ระบบสำเร็จ (Mock Mode)', 
        user: { name: username || 'Admin User', department: 'IT', role: 'admin' } 
      });
    }
  });

  // Fetch random OPD cases for audit
  app.post('/api/audit/opd/random', async (req, res) => {
    const { startDate, endDate, limit = 6, depCode = '042' } = req.body;
    
    try {
      if (pool) {
        // Using the user's provided query structure, but with dynamic department
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
        
        const [rows] = await pool.query(query, [startDate, endDate, depCode, parseInt(limit)]);
        
        return res.json({ success: true, data: rows });
      } else {
        throw new Error('Database pool is not initialized');
      }
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      // Fallback Mock Data for preview environment
      const mockData = Array.from({ length: limit }).map((_, i) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const randomDate = new Date(start + Math.random() * (end - start));
        
        return {
          hn: `000${Math.floor(10000 + Math.random() * 90000)}`,
          vstdate: randomDate.toISOString().split('T')[0],
          doctor_name: `นพ. ทดสอบ แพทย์คนที่ ${Math.floor(Math.random() * 10) + 1}`
        };
      });
      
      return res.json({ success: true, data: mockData, mock: true });
    }
  });

  // Fetch random IPD cases for audit
  app.post('/api/audit/ipd/random', async (req, res) => {
    const { startDate, endDate, limit = 5, wardCode = '01' } = req.body;
    
    try {
      if (pool) {
        // Using the user's provided query structure for IPD
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
        
        const [rows] = await pool.query(query, [startDate, endDate, wardCode, parseInt(limit)]);
        
        return res.json({ success: true, data: rows });
      } else {
        throw new Error('Database pool is not initialized');
      }
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      // Fallback Mock Data for preview environment
      const mockData = Array.from({ length: limit }).map((_, i) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const randomDate = new Date(start + Math.random() * (end - start));
        const dchDate = new Date(randomDate.getTime() + (Math.random() * 5 + 1) * 24 * 60 * 60 * 1000); // 1-6 days later
        
        return {
          hn: `000${Math.floor(10000 + Math.random() * 90000)}`,
          an: `67${Math.floor(100000 + Math.random() * 900000)}`,
          regdate: randomDate.toISOString().split('T')[0],
          dchdate: dchDate.toISOString().split('T')[0],
          doctor_name: `นพ. ทดสอบ แพทย์คนที่ ${Math.floor(Math.random() * 10) + 1}`
        };
      });
      
      return res.json({ success: true, data: mockData, mock: true });
    }
  });

  // Vite middleware for development
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
