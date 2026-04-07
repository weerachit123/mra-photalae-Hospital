import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Shield, CheckCircle, XCircle, Trash2, Lock } from 'lucide-react';

interface User {
  loginname: string;
  name: string;
  department: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Worksheet {
  id: string;
  name: string;
  type: string;
}

const DEPARTMENTS = [
  { code: '028', name: 'ผู้ป่วยนอก' },
  { code: '021', name: 'โรคเรื้อรัง' },
  { code: '005', name: 'ทันตกรรม' },
  { code: '011', name: 'ฉุกเฉิน' },
  { code: '017', name: 'ห้องคลอด-นอก' },
  { code: '041', name: 'แพทย์ไทย' },
  { code: '042', name: 'กายภาพ' },
];

const WARDS = [
  { code: '01', name: 'ตึกผู้ป่วยใน(IPD)' },
  { code: '02', name: 'ตึกห้องคลอด(PP)' },
  { code: '03', name: 'HomeWard' },
  { code: '04', name: 'ตึกผู้ป่วยใน(IPD)2' },
];

const ALL_DEPARTMENTS = [
  ...DEPARTMENTS.map(d => d.name),
  ...WARDS.map(w => w.name)
];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hosUsers, setHosUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAccess, setUserAccess] = useState<string[]>([]);
  const [departmentAccess, setDepartmentAccess] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = currentUser?.loginname === '0176' || currentUser?.loginname === '0382' || currentUser?.loginname === 'admin';

  useEffect(() => {
    fetchUsers();
    fetchWorksheets();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchWorksheets = async () => {
    try {
      const response = await fetch('/api/mra/worksheets?role=admin');
      const data = await response.json();
      if (data.success) setWorksheets(data.data);
    } catch (error) {
      console.error('Failed to fetch worksheets:', error);
    }
  };

  const handleSearchHos = async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/hos-users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.success) setHosUsers(data.users);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = async (hosUser: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginname: hosUser.loginname,
          name: hosUser.name,
          department: hosUser.department,
          role: 'user'
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        setSearchQuery('');
        setHosUsers([]);
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleUpdateUser = async (loginname: string, role: string, is_active: boolean, password?: string) => {
    try {
      const body: any = { role, is_active };
      if (password) body.password = password;
      
      const response = await fetch(`/api/users/${loginname}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        if (password) {
          alert('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
          setShowPasswordModal(false);
          setNewPassword('');
          setEditingUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleChangePassword = (user: User) => {
    setEditingUser(user);
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!editingUser || !newPassword) return;
    setIsChangingPassword(true);
    await handleUpdateUser(editingUser.loginname, editingUser.role, editingUser.is_active, newPassword);
    setIsChangingPassword(false);
  };

  const handleDeleteUser = async (loginname: string) => {
    if (!window.confirm(`คุณต้องการลบผู้ใช้งาน ${loginname} ใช่หรือไม่?`)) return;
    try {
      const response = await fetch(`/api/users/${loginname}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleEditAccess = async (user: User) => {
    setSelectedUser(user);
    try {
      const response = await fetch(`/api/users/${user.loginname}/access`);
      const data = await response.json();
      if (data.success) {
        setUserAccess(data.access.map((a: any) => a.worksheet_id));
        setDepartmentAccess(data.departmentAccess.map((d: any) => d.department_name));
      }
    } catch (error) {
      console.error('Failed to fetch access:', error);
    }
  };

  const handleSaveAccess = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.loginname}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          worksheetIds: userAccess,
          departmentNames: departmentAccess
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('บันทึกสิทธิ์การเข้าถึงเรียบร้อยแล้ว');
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to save access:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          จัดการผู้ใช้งานและสิทธิ์การเข้าถึง
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: User List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-700">รายชื่อผู้ใช้งานในระบบ</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">ผู้ใช้งาน</th>
                    <th className="px-6 py-4">แผนก</th>
                    <th className="px-6 py-4">บทบาท</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user) => (
                    <tr key={user.loginname} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{user.name}</span>
                          <span className="text-xs text-slate-400">{user.loginname}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.department}</td>
                      <td className="px-6 py-4">
                        {isSuperAdmin ? (
                          <select 
                            value={user.role}
                            onChange={(e) => handleUpdateUser(user.loginname, e.target.value, user.is_active)}
                            className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 uppercase">
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => isSuperAdmin && handleUpdateUser(user.loginname, user.role, !user.is_active)}
                          disabled={!isSuperAdmin}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            user.is_active 
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          } ${!isSuperAdmin ? 'cursor-default opacity-80' : ''}`}
                        >
                          {user.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleChangePassword(user)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="เปลี่ยนรหัสผ่าน"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditAccess(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="จัดการสิทธิ์เข้าถึงใบงาน"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleDeleteUser(user.loginname)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบผู้ใช้งาน"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Add User & Access */}
        <div className="space-y-6">
          {/* Add User from HosXP - Only for Super Admins */}
          {isSuperAdmin ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                เพิ่มผู้ใช้งานจาก HosXP
              </h2>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="ค้นหา Loginname หรือ ชื่อ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchHos()}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button 
                  onClick={handleSearchHos}
                  disabled={isSearching || searchQuery.length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  ค้นหา
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {hosUsers.map((hu) => (
                  <div key={hu.loginname} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{hu.name}</span>
                      <span className="text-[10px] text-slate-400">{hu.loginname} | {hu.department}</span>
                    </div>
                    <button 
                      onClick={() => handleAddUser(hu)}
                      className="p-1.5 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {hosUsers.length === 0 && searchQuery.length >= 2 && !isSearching && (
                  <p className="text-center text-xs text-slate-400 py-4">ไม่พบข้อมูลผู้ใช้งาน</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
              <h2 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                โหมดจัดการสิทธิ์
              </h2>
              <p className="text-xs text-blue-600 leading-relaxed">
                คุณสามารถจัดการสิทธิ์การเข้าถึงใบงานให้กับผู้ใช้งานที่มีอยู่ในระบบได้เท่านั้น 
                หากต้องการเพิ่มผู้ใช้งานใหม่จาก HosXP กรุณาติดต่อผู้ดูแลระบบสูงสุด
              </p>
            </div>
          )}

          {/* Worksheet Access Modal/Section */}
          {selectedUser && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  สิทธิ์การเข้าถึง: {selectedUser.name}
                </h2>
                <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {/* Department Access */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">สิทธิ์ตามแผนก (เห็นทุกใบงานในแผนก)</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {ALL_DEPARTMENTS.map(depName => (
                      <label 
                        key={depName} 
                        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                          departmentAccess.includes(depName) 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={departmentAccess.includes(depName)}
                          onChange={(e) => {
                            if (e.target.checked) setDepartmentAccess([...departmentAccess, depName]);
                            else setDepartmentAccess(departmentAccess.filter(d => d !== depName));
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mr-3"
                        />
                        <span className="text-sm font-bold text-slate-700">{depName}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Individual Worksheet Access */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">สิทธิ์รายใบงาน (เพิ่มเติม)</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {worksheets.map((ws) => (
                      <label 
                        key={ws.id} 
                        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                          userAccess.includes(ws.id) 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={userAccess.includes(ws.id)}
                          onChange={(e) => {
                            if (e.target.checked) setUserAccess([...userAccess, ws.id]);
                            else setUserAccess(userAccess.filter(id => id !== ws.id));
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mr-3"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{ws.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{ws.type}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveAccess}
                disabled={isSaving}
                className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-100 transition-all"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าสิทธิ์'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                เปลี่ยนรหัสผ่าน: {editingUser.name}
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">กำหนดรหัสผ่านใหม่สำหรับผู้ใช้งานรายนี้ (ใช้สำหรับเข้าสู่ระบบ MRA โดยตรง)</p>
              
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">รหัสผ่านใหม่</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSavePassword}
                  disabled={isChangingPassword || !newPassword}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50 shadow-lg shadow-amber-100 transition-all"
                >
                  {isChangingPassword ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
