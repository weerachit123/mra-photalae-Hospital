import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './pages/DashboardLayout';
import AuditOPD from './pages/AuditOPD';
import AuditIPD from './pages/AuditIPD';
import AuditFormOPD from './pages/AuditFormOPD';
import AuditFormIPD from './pages/AuditFormIPD';
import WorksheetList from './pages/WorksheetList';
import WorksheetDetail from './pages/WorksheetDetail';
import DashboardStats from './pages/DashboardStats';
import DetailedReport from './pages/DetailedReport';

import EditCriteria from './pages/EditCriteria';

// A simple Home component for the dashboard
function DashboardHome() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">ยินดีต้อนรับเข้าสู่ระบบ MRA PRO</h2>
      <p className="text-gray-600">
        คุณเข้าสู่ระบบในชื่อ: <span className="font-semibold">{user?.name}</span>
      </p>
      <p className="text-gray-500 mt-2">
        กรุณาเลือกเมนูทางด้านซ้ายเพื่อเริ่มต้นใช้งาน
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard/stats" replace />} />
          <Route path="stats" element={<DashboardStats />} />
          <Route path="report" element={<DetailedReport />} />
          <Route path="worksheets" element={<WorksheetList />} />
          <Route path="worksheets/:id" element={<WorksheetDetail />} />
          <Route path="audit-opd" element={<AuditOPD />} />
          <Route path="audit-opd/form/:hn" element={<AuditFormOPD />} />
          <Route path="audit-ipd" element={<AuditIPD />} />
          <Route path="audit-ipd/form/:an" element={<AuditFormIPD />} />
          <Route path="edit-criteria" element={<EditCriteria />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
