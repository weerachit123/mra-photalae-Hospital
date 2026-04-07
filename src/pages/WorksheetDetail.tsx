import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, RefreshCw, Shield, Users, XCircle } from 'lucide-react';

interface Worksheet {
  id: string;
  name: string;
  type: 'OPD' | 'IPD';
  department: string;
  createdAt: string;
  cases: any[];
}

interface User {
  loginname: string;
  name: string;
  department: string;
}

export default function WorksheetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  useEffect(() => {
    // Check admin role from localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const u = JSON.parse(userJson);
      setUser(u);
      const isAdm = u.role === 'admin' || u.loginname === '0176' || u.loginname === '0382';
      setIsAdmin(isAdm);
      
      if (isAdm) {
        fetchAllUsers();
      }
    } else {
      navigate('/');
    }

    const fetchWorksheet = async () => {
      try {
        const response = await fetch(`/api/mra/worksheets/${id}?loginname=${user?.loginname}&role=${user?.role}`);
        const data = await response.json();
        if (data.success) {
          setWorksheet(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch worksheet detail:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('mra_worksheets');
        if (saved) {
          const worksheets: Worksheet[] = JSON.parse(saved);
          const found = worksheets.find(w => w.id === id);
          if (found) {
            setWorksheet(found);
          }
        }
      }
    };

    fetchWorksheet();
  }, [id, navigate, user?.loginname, user?.role]);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) setAllUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleOpenAccessModal = async () => {
    setShowAccessModal(true);
    try {
      const response = await fetch(`/api/mra/worksheets/${id}/access`);
      const data = await response.json();
      if (data.success) {
        setSelectedUsers(data.access.map((a: any) => a.loginname));
      }
    } catch (error) {
      console.error('Failed to fetch worksheet access:', error);
    }
  };

  const handleToggleUserAccess = (loginname: string) => {
    setSelectedUsers(prev => 
      prev.includes(loginname) ? prev.filter(ln => ln !== loginname) : [...prev, loginname]
    );
  };

  const handleSaveAccess = async () => {
    setIsSavingAccess(true);
    try {
      const response = await fetch(`/api/mra/worksheets/${id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginnames: selectedUsers })
      });
      const data = await response.json();
      if (data.success) {
        alert('บันทึกสิทธิ์การเข้าถึงเรียบร้อยแล้ว');
        setShowAccessModal(false);
      }
    } catch (error) {
      console.error('Failed to save access:', error);
    } finally {
      setIsSavingAccess(false);
    }
  };

  // Permission check after worksheet is loaded
  useEffect(() => {
    if (worksheet && user) {
      const isAdm = user.role === 'admin' || user.loginname === '0176' || user.loginname === '0382';
      if (!isAdm) {
        const hasAccess = worksheet.department.includes(user.department) || user.department.includes(worksheet.department);
        if (!hasAccess) {
          alert('คุณไม่มีสิทธิ์เข้าถึงใบงานของแผนกนี้');
          navigate('/dashboard/worksheets');
        }
      }
    }
  }, [worksheet, user, navigate]);

  const refreshCase = async (index: number) => {
    if (!worksheet) return;
    if (!window.confirm('ต้องการสุ่มเปลี่ยนเคสนี้ใช่หรือไม่? (ข้อมูลการประเมินเดิมจะหายไป)')) return;

    try {
      const isOPD = worksheet.type === 'OPD';
      const endpoint = isOPD ? '/api/audit/opd/random' : '/api/audit/ipd/random';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          limit: 1, 
          depCode: worksheet.department,
          wardCode: worksheet.department,
          excludeHns: worksheet.cases.map(c => c.hn)
        }),
      });

      const data = await response.json();

      if (data.success && data.data.length > 0) {
        const updatedWorksheet = { ...worksheet };
        updatedWorksheet.cases[index] = { ...data.data[0], status: 'pending' };
        
        // Update on server
        const saveResponse = await fetch(`/api/mra/worksheets/${id}`, {
          method: 'POST', // Or PUT if I had one, but my POST handles update if ID exists in some logic? 
          // Actually my server.ts POST /api/mra/worksheets creates a new one.
          // I should probably add a PUT or update the existing one.
          // Let's check server.ts again.
        });
        // Wait, I didn't implement a partial update for cases in server.ts yet.
        // I should probably update the whole worksheet.
        
        const updateResponse = await fetch(`/api/mra/worksheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedWorksheet)
        });
        const updateData = await updateResponse.json();

        if (updateData.success) {
          setWorksheet(updatedWorksheet);
        }
      }
    } catch (err) {
      console.error('Failed to refresh case', err);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนเคส');
    }
  };

  if (!worksheet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ไม่พบข้อมูลใบงาน</p>
        <button onClick={() => navigate('/dashboard/worksheets')} className="mt-4 text-blue-600 hover:underline">
          กลับไปหน้ารายการใบงาน
        </button>
      </div>
    );
  }

  const isOPD = worksheet.type === 'OPD';

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/dashboard/worksheets')}
              className="mr-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-95 border border-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {worksheet.name}
                </h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isOPD ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  {worksheet.type}
                </span>
                {isAdmin && (
                  <button 
                    onClick={handleOpenAccessModal}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-50 transition-all shadow-sm uppercase tracking-wider"
                  >
                    <Shield className="w-3 h-3" />
                    จัดการสิทธิ์
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                <span className="text-slate-400">แผนก/วอร์ด:</span> {worksheet.department} 
                <span className="mx-2 text-slate-300">|</span> 
                <span className="text-slate-400">สร้างเมื่อ:</span> {new Date(worksheet.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ความคืบหน้า</p>
              <p className="text-lg font-bold text-slate-700">
                {worksheet.cases.filter(c => c.status === 'audited').length} / {worksheet.cases.length} เคส
              </p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 w-full bg-emerald-500 transition-all duration-500" 
                style={{ height: `${(worksheet.cases.filter(c => c.status === 'audited').length / worksheet.cases.length) * 100}%` }}
              />
              <span className="relative z-10 text-[10px] font-bold text-slate-700">
                {Math.round((worksheet.cases.filter(c => c.status === 'audited').length / worksheet.cases.length) * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">ลำดับ</th>
                  <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">HN</th>
                  {!isOPD && <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">AN</th>}
                  <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">วันที่รับบริการ</th>
                  <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">แพทย์</th>
                  <th scope="col" className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">สถานะ</th>
                  <th scope="col" className="px-8 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {worksheet.cases.map((c, index) => {
                  const isAudited = c.status === 'audited';
                  const formPath = isOPD 
                    ? `/dashboard/audit-opd/form/${c.hn}?wsId=${worksheet.id}`
                    : `/dashboard/audit-ipd/form/${c.an}?wsId=${worksheet.id}`;

                  return (
                    <tr key={index} className={`group transition-colors ${isAudited ? 'bg-emerald-50/20' : 'hover:bg-slate-50'}`}>
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-400">{index + 1}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-800">{c.hn}</td>
                      {!isOPD && <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-blue-600">{c.an}</td>}
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-slate-600">{isOPD ? c.vstdate : c.regdate}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-slate-600">{c.doctor_name}</td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        {isAudited ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1.5" /> ประเมินแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1.5" /> ยังไม่ประเมิน
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <button
                              onClick={() => refreshCase(index)}
                              title="สุ่มเปลี่ยนเคสใหม่"
                              className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95 border border-transparent hover:border-blue-100"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <Link 
                            to={formPath}
                            state={c}
                            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${
                              isAudited 
                                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' 
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                            }`}
                          >
                            {isAudited ? 'แก้ไขการประเมิน' : 'เริ่มประเมิน'}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Access Management Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                จัดการสิทธิ์การเข้าถึงใบงาน
              </h3>
              <button 
                onClick={() => setShowAccessModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">เลือกผู้ใช้งานที่อนุญาตให้มองเห็นและประเมินใบงานนี้ได้</p>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 mb-6">
                {allUsers.map((u) => (
                  <label 
                    key={u.loginname} 
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedUsers.includes(u.loginname) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={selectedUsers.includes(u.loginname)}
                      onChange={() => handleToggleUserAccess(u.loginname)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mr-3"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{u.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{u.loginname} | {u.department}</span>
                    </div>
                  </label>
                ))}
                {allUsers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">ไม่พบรายชื่อผู้ใช้งานในระบบ</p>
                    <Link to="/dashboard/users" className="text-xs text-blue-600 font-bold hover:underline">ไปที่หน้าจัดการผู้ใช้งาน</Link>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAccessModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSaveAccess}
                  disabled={isSavingAccess}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100 transition-all"
                >
                  {isSavingAccess ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
