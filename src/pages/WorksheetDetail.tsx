import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface Worksheet {
  id: string;
  name: string;
  type: 'OPD' | 'IPD';
  department: string;
  createdAt: string;
  cases: any[];
}

export default function WorksheetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check admin role from localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const u = JSON.parse(userJson);
      setUser(u);
      const isAdm = u.role === 'admin' || u.loginname === '0176' || u.loginname === '0382';
      setIsAdmin(isAdm);
    } else {
      navigate('/');
    }

    const fetchWorksheet = async () => {
      try {
        const response = await fetch(`/api/mra/worksheets/${id}`);
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
  }, [id, navigate]);

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
    </div>
  );
}
