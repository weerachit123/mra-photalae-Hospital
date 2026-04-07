import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Users } from 'lucide-react';

interface Worksheet {
  id: string;
  name: string;
  type: 'OPD' | 'IPD';
  department: string;
  createdAt: string;
  cases: any[];
}

export default function WorksheetList() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const isAdmin = user?.role === 'admin' || user?.loginname === '0176' || user?.loginname === '0382';

  useEffect(() => {
    const fetchWorksheets = async () => {
      try {
        const response = await fetch(`/api/mra/worksheets?loginname=${user?.loginname}&role=${user?.role}`);
        const data = await response.json();
        if (data.success) {
          setWorksheets(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch worksheets:', error);
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem('mra_worksheets');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.sort((a: Worksheet, b: Worksheet) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setWorksheets(parsed);
        }
      }
    };
    fetchWorksheets();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm('คุณต้องการลบใบงานนี้ใช่หรือไม่? ข้อมูลการประเมินในใบงานนี้จะหายไปทั้งหมด')) {
      try {
        const response = await fetch(`/api/mra/worksheets/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
          setWorksheets(prev => prev.filter(w => w.id !== id));
        }
      } catch (error) {
        console.error('Failed to delete worksheet:', error);
        // Fallback to localStorage
        const updated = worksheets.filter(w => w.id !== id);
        setWorksheets(updated);
        localStorage.setItem('mra_worksheets', JSON.stringify(updated));
      }
    }
  };

  // Permission logic: Admins see all, others see only their department's worksheets
  const permittedWorksheets = isAdmin 
    ? worksheets 
    : worksheets.filter(ws => {
        // If user has no department, they see nothing (or maybe they should see everything? No, restrict by default)
        if (!user?.department) return false;
        
        // Match by department name (since worksheet stores name)
        // Or if user.department is a code, we might need a mapping.
        // For now, we'll assume user.department might contain the name or code.
        return ws.department.includes(user.department) || user.department.includes(ws.department);
      });

  const filteredWorksheets = activeTab === 'ALL' 
    ? permittedWorksheets 
    : permittedWorksheets.filter(ws => ws.type === activeTab);

  // Group by name (Round)
  const groupedWorksheets = filteredWorksheets.reduce((acc, ws) => {
    if (!acc[ws.name]) {
      acc[ws.name] = [];
    }
    acc[ws.name].push(ws);
    return acc;
  }, {} as Record<string, Worksheet[]>);

  // Sort groups by name descending (assuming name contains round number)
  const sortedGroupNames = Object.keys(groupedWorksheets).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              รายการใบงาน (Worksheets)
            </h3>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              เลือกใบงานที่ต้องการเพื่อเริ่มทำการประเมินเวชระเบียน
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('ALL')}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'ALL' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ทั้งหมด
            </button>
            <button 
              onClick={() => setActiveTab('OPD')}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'OPD' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              OPD
            </button>
            <button 
              onClick={() => setActiveTab('IPD')}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'IPD' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              IPD
            </button>
          </div>
        </div>

        <div className="p-8">
          {filteredWorksheets.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">ยังไม่มีใบงาน{activeTab !== 'ALL' ? `ประเภท ${activeTab}` : ''}</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                {activeTab === 'ALL' 
                  ? 'ผู้ดูแลระบบต้องทำการสุ่มเคสและสร้างใบงานจากเมนู Audit OPD/IPD ก่อน'
                  : `ยังไม่มีใบงานประเภท ${activeTab} ในระบบ`}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {sortedGroupNames.map(groupName => (
                <div key={groupName} className="relative">
                  <div className="flex items-center mb-8">
                    <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                      รอบ: {groupName}
                    </div>
                    <div className="h-px flex-1 bg-slate-200 ml-4"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {groupedWorksheets[groupName].map((ws) => {
                      const auditedCount = ws.cases.filter(c => c.status === 'audited').length;
                      const totalCount = ws.cases.length;
                      const progress = Math.round((auditedCount / totalCount) * 100);
                      const isCompleted = progress === 100;

                      return (
                        <Link 
                          key={ws.id} 
                          to={`/dashboard/worksheets/${ws.id}`}
                          className="group relative bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                        >
                          <div className={`h-1.5 w-full ${ws.type === 'OPD' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                          
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${ws.type === 'OPD' ? 'text-blue-600' : 'text-emerald-600'}`}>
                                  {ws.type} Unit
                                </span>
                                <h4 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{ws.department}</h4>
                              </div>
                              <div className={`p-2 rounded-xl ${ws.type === 'OPD' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                <FileText className="w-5 h-5" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="flex items-center text-xs font-semibold text-slate-500">
                                <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                <span>{new Date(ws.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center text-xs font-semibold text-slate-500">
                                <Users className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                <span>{totalCount} เคส</span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                                <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>
                                  {auditedCount}/{totalCount} ({progress}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Delete button */}
                          <button 
                            onClick={(e) => handleDelete(ws.id, e)}
                            className="absolute top-3 right-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="ลบใบงาน"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
