import React, { useState } from 'react';
import { Search, FilePlus, RefreshCw, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuditCase {
  hn: string;
  an: string;
  regdate: string;
  dchdate: string;
  doctor_name: string;
}

const WARDS = [
  { code: '01', name: 'ตึกผู้ป่วยใน(IPD)', defaultLimit: 5 },
  { code: '02', name: 'ตึกห้องคลอด(PP)', defaultLimit: 5 },
  { code: '03', name: 'HomeWard', defaultLimit: 5 },
  { code: '04', name: 'ตึกผู้ป่วยใน(IPD)2', defaultLimit: 5 },
];

export default function AuditIPD() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('2024-10-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedWard, setSelectedWard] = useState(WARDS[0].code); // Default to 01
  const [limit, setLimit] = useState(WARDS[0].defaultLimit);
  const [cases, setCases] = useState<AuditCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMock, setIsMock] = useState(false);

  // States for Worksheet Name
  const defaultWorksheets = ['Audit IPD 6901', 'Audit IPD 6902', 'Audit IPD 6903', 'Audit IPD 6904'];
  const [worksheetNames, setWorksheetNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('mra_ipd_worksheet_names');
    return saved ? JSON.parse(saved) : defaultWorksheets;
  });
  const [selectedWorksheet, setSelectedWorksheet] = useState(worksheetNames[0]);
  const [isAddingWorksheet, setIsAddingWorksheet] = useState(false);
  const [newWorksheetName, setNewWorksheetName] = useState('');

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedWard(code);
    const ward = WARDS.find(w => w.code === code);
    if (ward) {
      setLimit(ward.defaultLimit);
    }
  };

  const handleAddWorksheet = () => {
    if (newWorksheetName.trim() && !worksheetNames.includes(newWorksheetName.trim())) {
      const updated = [...worksheetNames, newWorksheetName.trim()];
      setWorksheetNames(updated);
      localStorage.setItem('mra_ipd_worksheet_names', JSON.stringify(updated));
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
      localStorage.setItem('mra_ipd_worksheet_names', JSON.stringify(updated));
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
      const response = await fetch('/api/audit/ipd/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, limit, wardCode: selectedWard }),
      });

      const data = await response.json();

      if (data.success) {
        setCases(data.data);
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

  const refreshSingleCase = async (index: number) => {
    try {
      const response = await fetch('/api/audit/ipd/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate, 
          endDate, 
          limit: 1, 
          wardCode: selectedWard,
          excludeAns: cases.map(c => c.an) // Pass existing ANs to exclude them
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

  const handleCreateWorksheet = () => {
    if (cases.length === 0) {
      alert('กรุณาสุ่มเคสก่อนสร้างใบงาน');
      return;
    }
    const wardName = WARDS.find(w => w.code === selectedWard)?.name || selectedWard;
    
    const newWorksheet = {
      id: `ws_${Date.now()}`,
      name: selectedWorksheet,
      type: 'IPD',
      department: wardName,
      createdAt: new Date().toISOString(),
      cases: cases.map(c => ({ ...c, status: 'pending' }))
    };

    const existing = JSON.parse(localStorage.getItem('mra_worksheets') || '[]');
    localStorage.setItem('mra_worksheets', JSON.stringify([...existing, newWorksheet]));

    alert(`สร้างใบงาน "${selectedWorksheet}" สำหรับวอร์ด ${wardName} จำนวน ${cases.length} เคส เรียบร้อยแล้ว`);
    navigate('/dashboard/worksheets');
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-white">
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            สร้างใบงาน Audit IPD (สุ่มเคสผู้ป่วยใน)
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            ดึงข้อมูลจากฐานข้อมูล HosXP ตามเงื่อนไขที่กำหนด แยกตาม Ward
          </p>
        </div>

        <div className="p-8">
          {/* Worksheet Selection */}
          <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">ชื่อใบงาน / รอบการประเมิน</label>
            <div className="flex items-center flex-wrap gap-3">
              {!isAddingWorksheet ? (
                <>
                  <select
                    value={selectedWorksheet}
                    onChange={(e) => setSelectedWorksheet(e.target.value)}
                    className="w-72 border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-semibold text-slate-700 transition-all"
                  >
                    {worksheetNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsAddingWorksheet(true)}
                    className="flex items-center text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 mr-2 text-emerald-600" /> เพิ่มชื่อใบงาน
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
                    placeholder="เช่น Audit IPD 7001"
                    className="w-72 border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-semibold transition-all"
                    autoFocus
                  />
                  <button
                    onClick={handleAddWorksheet}
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 text-sm font-bold shadow-md shadow-emerald-200 transition-all active:scale-95"
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

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">ตั้งแต่วันที่</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-700 transition-all"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">ถึงวันที่</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-700 transition-all"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ward</label>
              <select
                value={selectedWard}
                onChange={handleWardChange}
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-700 transition-all"
              >
                {WARDS.map(ward => (
                  <option key={ward.code} value={ward.code}>
                    {ward.code} - {ward.name}
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
                className="w-full border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-700 transition-all"
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
                  <Search className="w-5 h-5 mr-2 text-emerald-400" />
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
                    AN
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    วันที่ Admit
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    วันที่จำหน่าย
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    แพทย์ผู้จำหน่าย
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                        {c.an}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">
                        {c.regdate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">
                        {c.dchdate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">
                        {c.doctor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => refreshSingleCase(index)}
                          title="สุ่มเปลี่ยนเคสนี้"
                          className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-100 flex items-center transition-all active:scale-95"
              >
                <FilePlus className="w-5 h-5 mr-2" />
                สร้างใบงานประเมิน IPD
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
