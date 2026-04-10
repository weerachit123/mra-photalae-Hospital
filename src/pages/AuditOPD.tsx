import React, { useState } from 'react';
import { Search, FilePlus, RefreshCw, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuditCase {
  hn: string;
  vstdate: string;
  doctor_name: string;
}

const DEPARTMENTS = [
  { code: '028', name: 'ผู้ป่วยนอก', defaultLimit: 9 },
  { code: '021', name: 'โรคเรื้อรัง', defaultLimit: 13 },
  { code: '005', name: 'ทันตกรรม', defaultLimit: 4 },
  { code: '011', name: 'ฉุกเฉิน', defaultLimit: 11 },
  { code: '017', name: 'ห้องคลอด-นอก', defaultLimit: 6 },
  { code: '041', name: 'แพทย์ไทย', defaultLimit: 2 },
  { code: '042', name: 'กายภาพ', defaultLimit: 2 },
];

export default function AuditOPD() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = user?.loginname === '0176' || user?.loginname === '0382' || user?.loginname === 'admin';

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h3 className="text-xl font-bold text-red-600 mb-2">เข้าถึงไม่ได้</h3>
        <p className="text-slate-600">คุณไม่มีสิทธิ์ในการสร้างใบงานใหม่ (สุ่มเคสจาก HosXP) กรุณาติดต่อผู้ดูแลระบบสูงสุด</p>
      </div>
    );
  }

  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [selectedDep, setSelectedDep] = useState(DEPARTMENTS[6].code); // Default to 042
  const [criteriaYear, setCriteriaYear] = useState('2557');
  const [limit, setLimit] = useState(DEPARTMENTS[6].defaultLimit);
  const [cases, setCases] = useState<AuditCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMock, setIsMock] = useState(false);
  const [specificVn, setSpecificVn] = useState('');
  const [isSearchingVn, setIsSearchingVn] = useState(false);

  // New states for Worksheet Name
  const defaultWorksheets = ['Audit OPD 6901', 'Audit OPD 6902', 'Audit OPD 6903', 'Audit OPD 6904'];
  const [worksheetNames, setWorksheetNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('mra_worksheet_names');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: Update any old default names to the new format
      const oldDefaults = ['Audit 6901', 'Audit 6902', 'Audit 6903', 'Audit 6904'];
      const hasOldDefaults = parsed.some((name: string) => oldDefaults.includes(name));
      
      if (hasOldDefaults) {
        const migrated = parsed.map((name: string) => {
          if (oldDefaults.includes(name)) {
            return name.replace('Audit ', 'Audit OPD ');
          }
          return name;
        });
        localStorage.setItem('mra_worksheet_names', JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    }
    return defaultWorksheets;
  });
  const [selectedWorksheet, setSelectedWorksheet] = useState(worksheetNames[0]);
  const [isAddingWorksheet, setIsAddingWorksheet] = useState(false);
  const [newWorksheetName, setNewWorksheetName] = useState('');

  const handleDepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedDep(code);
    const dep = DEPARTMENTS.find(d => d.code === code);
    if (dep) {
      setLimit(dep.defaultLimit);
    }
  };

  const handleAddWorksheet = () => {
    if (newWorksheetName.trim() && !worksheetNames.includes(newWorksheetName.trim())) {
      const updated = [...worksheetNames, newWorksheetName.trim()];
      setWorksheetNames(updated);
      localStorage.setItem('mra_worksheet_names', JSON.stringify(updated));
      setSelectedWorksheet(newWorksheetName.trim());
      setNewWorksheetName('');
      setIsAddingWorksheet(false);
    }
  };

  const handleDeleteWorksheet = (nameToDelete: string) => {
    if (worksheetNames.length <= 1) {
      alert('ต้องมีชื่อใบงานอย่างน้อย 1 รายการ');
      return;
    }
    if (window.confirm(`ต้องการลบชื่อใบงาน "${nameToDelete}" ใช่หรือไม่?`)) {
      const updated = worksheetNames.filter(name => name !== nameToDelete);
      setWorksheetNames(updated);
      localStorage.setItem('mra_worksheet_names', JSON.stringify(updated));
      if (selectedWorksheet === nameToDelete) {
        setSelectedWorksheet(updated[0]);
      }
    }
  };

  const fetchRandomCases = async () => {
    setLoading(true);
    setError('');
    setIsMock(false);
    
    try {
      const response = await fetch('/api/audit/opd/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, limit, depCode: selectedDep }),
      });

      const data = await response.json();

      if (data.success) {
        setCases(data.data);
        setIsMock(data.mock || false);
        if (data.data.length === 0) {
          setError('ไม่พบข้อมูลเคสตามเงื่อนไขที่กำหนด กรุณาลองเปลี่ยนวันที่หรือแผนก');
        }
        if (data.mock) {
          setIsMock(true);
        }
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSpecificVn = async (index: number) => {
    if (!specificVn.trim()) return;
    setIsSearchingVn(true);
    try {
      const response = await fetch(`/api/audit/opd/vn/${specificVn.trim()}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const newCases = [...cases];
        newCases[index] = data.data;
        setCases(newCases);
        setSpecificVn(''); // Clear after success
      } else {
        alert(data.message || 'ไม่พบข้อมูล VN นี้');
      }
    } catch (err) {
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsSearchingVn(false);
    }
  };

  const refreshSingleCase = async (index: number) => {
    try {
      const response = await fetch('/api/audit/opd/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate, 
          endDate, 
          limit: 1, 
          depCode: selectedDep,
          excludeHns: cases.map(c => c.hn) // Pass existing HNs to exclude them
        }),
      });

      const data = await response.json();

      if (data.success && data.data.length > 0) {
        const newCases = [...cases];
        newCases[index] = data.data[0];
        setCases(newCases);
      }
    } catch (err) {
      console.error('Failed to refresh single case', err);
    }
  };

  const handleCreateWorksheet = async () => {
    if (cases.length === 0) {
      alert('กรุณาสุ่มเคสก่อนสร้างใบงาน');
      return;
    }
    setSaving(true);
    const depName = DEPARTMENTS.find(d => d.code === selectedDep)?.name || selectedDep;
    
    const newWorksheet = {
      id: `ws_${Date.now()}`,
      name: selectedWorksheet,
      type: 'OPD',
      department: depName,
      criteria_year: criteriaYear,
      createdAt: new Date().toISOString(),
      cases: cases.map(c => ({ ...c, status: 'pending' }))
    };

    try {
      const response = await fetch('/api/mra/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorksheet)
      });
      const data = await response.json();
      if (data.success) {
        alert(`สร้างใบงาน "${selectedWorksheet}" สำหรับแผนก ${depName} จำนวน ${cases.length} เคส เรียบร้อยแล้ว`);
        navigate('/dashboard/worksheets');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Failed to save worksheet to DB:', error);
      // Fallback to localStorage
      const existing = JSON.parse(localStorage.getItem('mra_worksheets') || '[]');
      localStorage.setItem('mra_worksheets', JSON.stringify([...existing, newWorksheet]));
      alert(`สร้างใบงาน "${selectedWorksheet}" เรียบร้อยแล้ว (บันทึกในเครื่อง)`);
      navigate('/dashboard/worksheets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-white">
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            สร้างใบงาน Audit OPD (สุ่มเคส)
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            ดึงข้อมูลจากฐานข้อมูล HosXP ตามเงื่อนไขที่กำหนด
          </p>
        </div>

        <div className="p-8">
          {/* Worksheet Selection */}
          <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">ชื่อใบงาน / รอบการประเมิน</label>
                <div className="flex items-center flex-wrap gap-3">
                  {!isAddingWorksheet ? (
                    <>
                      <select
                        value={selectedWorksheet}
                        onChange={(e) => setSelectedWorksheet(e.target.value)}
                        className="w-72 border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-sm font-semibold text-slate-700 transition-all"
                      >
                        {worksheetNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsAddingWorksheet(true)}
                        className="flex items-center text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4 mr-2 text-blue-600" /> เพิ่มชื่อใบงาน
                      </button>
                      <button
                        onClick={() => handleDeleteWorksheet(selectedWorksheet)}
                        className="flex items-center text-sm bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all ml-auto active:scale-95"
                      >
                        <X className="w-4 h-4 mr-2" /> ลบชื่อนี้
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={newWorksheetName}
                        onChange={(e) => setNewWorksheetName(e.target.value)}
                        placeholder="เช่น Audit OPD 7001"
                        className="w-72 border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-sm font-semibold transition-all"
                        autoFocus
                      />
                      <button
                        onClick={handleAddWorksheet}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-bold shadow-md shadow-blue-200 transition-all active:scale-95"
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingWorksheet(false);
                          setNewWorksheetName('');
                        }}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
                      >
                        ยกเลิก
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">เกณฑ์การประเมิน</label>
                <select
                  value={criteriaYear}
                  onChange={(e) => setCriteriaYear(e.target.value)}
                  className="w-full md:w-72 border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-sm font-semibold text-slate-700 transition-all"
                >
                  <option value="2557">เกณฑ์ปี 2557</option>
                  <option value="2563">เกณฑ์ปี 2563</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">ตั้งแต่วันที่</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-700 transition-all"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">ถึงวันที่</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-700 transition-all"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">แผนก</label>
              <select
                value={selectedDep}
                onChange={handleDepChange}
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-700 transition-all"
              >
                {DEPARTMENTS.map(dep => (
                  <option key={dep.code} value={dep.code}>
                    {dep.code} - {dep.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">จำนวนเคส</label>
              <input 
                type="number" 
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
                min="1"
                max="100"
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-700 transition-all"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                onClick={fetchRandomCases}
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-slate-200 flex justify-center items-center transition-all active:scale-95 disabled:opacity-70"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 mr-2 text-blue-400" />
                )}
                สุ่มเคส Audit
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 mr-3 flex-shrink-0">
                <X className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          {isMock && (
            <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mr-3 flex-shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-amber-700">
                <strong>โหมดจำลอง:</strong> ไม่สามารถเชื่อมต่อ HosXP ได้ ข้อมูลที่แสดงเป็นข้อมูลจำลองเพื่อการทดสอบ
              </p>
            </div>
          )}

          {/* Results Table */}
          <div className="mt-4 overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    ลำดับ
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    HN
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    วันที่รับบริการ
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    แพทย์ผู้ตรวจ
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {cases.length > 0 ? (
                  cases.map((c, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        {c.hn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">
                        {c.vstdate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">
                        {c.doctor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center">
                            <input
                              type="text"
                              placeholder="ระบุ VN..."
                              className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-l-lg focus:outline-none focus:border-blue-500"
                              onChange={(e) => setSpecificVn(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSearchSpecificVn(index);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleSearchSpecificVn(index)}
                              disabled={isSearchingVn}
                              className="px-2 py-1 bg-blue-50 text-blue-600 border border-l-0 border-blue-100 rounded-r-lg hover:bg-blue-100 disabled:opacity-50"
                              title="ค้นหา VN เจาะจง"
                            >
                              <Search className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => refreshSingleCase(index)}
                            title="สุ่มเปลี่ยนเคสนี้"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">ยังไม่มีข้อมูล กรุณากดปุ่ม "สุ่มเคส Audit"</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          {cases.length > 0 && (
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCreateWorksheet}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-100 flex items-center transition-all active:scale-95 disabled:opacity-70"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <FilePlus className="w-5 h-5 mr-2" />
                )}
                {saving ? 'กำลังสร้างใบงาน...' : 'สร้างใบงานประเมิน'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
