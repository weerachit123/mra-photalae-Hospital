import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Printer, Settings, Save, ChevronDown, ChevronUp, FileText, Calendar, Building2, User, BarChart3, Table as TableIcon, ListChecks } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';
import { useReactToPrint } from 'react-to-print';

interface Case {
  hn: string;
  an?: string;
  status: string;
  scores?: Record<string, string>;
  reasons?: Record<string, string>;
}

interface Worksheet {
  id: string;
  name: string;
  type: 'OPD' | 'IPD';
  department: string;
  createdAt: string;
  cases: Case[];
}

const IPD_ROWS = [
  { id: '1', name: "Discharge summary : Dx, Op", cols: 9 },
  { id: '2', name: "Discharge summary : Other", cols: 9, blockedCols: [7, 8] },
  { id: '3', name: "Informed consent", cols: 9 },
  { id: '4', name: "History", cols: 9 },
  { id: '5', name: "Physical examination", cols: 9 },
  { id: '6', name: "Progress note", cols: 9 },
  { id: '7', name: "Consultation record", cols: 9 },
  { id: '8', name: "Anaesthetic record", cols: 9 },
  { id: '9', name: "Operative note", cols: 9 },
  { id: '10', name: "Labour record", cols: 9 },
  { id: '11', name: "Rehabilitation record", cols: 9 },
  { id: '12', name: "Nurses' note helpful", cols: 9 },
];

const OPD_ROWS = [
  { id: '1', name: "Patient's Profile", cols: 7 },
  { id: '2', name: "History (1st visit)", cols: 7 },
  { id: '3', name: "Physical examination", cols: 7 },
  { id: '4', name: "Treatment/Investigation", cols: 7 },
  { id: '5_1', name: "Follow up ครั้งที่ 1", cols: 7 },
  { id: '5_2', name: "Follow up ครั้งที่ 2", cols: 7 },
  { id: '5_3', name: "Follow up ครั้งที่ 3", cols: 7 },
  { id: '6', name: "Operative note", cols: 7 },
  { id: '7', name: "Informed consent", cols: 7 },
  { id: '8', name: "Rehabilitation record *", cols: 7, blockedCols: [5, 6] },
];

interface MemoSettings {
  department: string;
  refNo: string;
  date: string;
  subject: string;
  to: string;
  attachment: string;
  proposerName: string;
  proposerPosition: string;
  approverName: string;
  approverPosition: string;
  approverPosition2?: string;
  signatureStyle: 'style1' | 'style2';
  labourDeptName: string;
  customLogo?: string;
}

const DEFAULT_SETTINGS: MemoSettings = {
  department: "โรงพยาบาลโพทะเล กลุ่มงานประกันสุขภาพยุทธศาสตร์และสารสนเทศทางการแพทย์",
  refNo: "พจ ๐๐๓๓.๓๐๑/พิเศษ",
  date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
  subject: "รายงานผลการตรวจสอบคุณภาพเวชระเบียนผู้ป่วยในปีงบประมาณ ๒๕๖๗",
  to: "ผู้อำนวยการโรงพยาบาลโพทะเล",
  attachment: "ผลการตรวจสอบคุณภาพเวชระเบียนผู้ป่วยใน จำนวน ๑ ฉบับ",
  proposerName: "นางสาวเบญจมาศ เมืองเหลือ",
  proposerPosition: "นักวิชาการสาธารณสุข (เวชสถิติ)",
  approverName: "นายพนม ปทุมสูติ",
  approverPosition: "รักษาการในตำแหน่งผู้อำนวยการโรงพยาบาลโพทะเล",
  approverPosition2: "ปฏิบัติราชการแทน ผู้อำนวยการโรงพยาบาลโพทะเล",
  signatureStyle: 'style1',
  labourDeptName: "ห้องคลอด",
  customLogo: ""
};

export default function MemorandumReport() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin' || user?.name === 'Admin User';

  if (!isAdmin) {
    return <Navigate to="/dashboard/stats" replace />;
  }

  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [settings, setSettings] = useState<MemoSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWorksheets = async () => {
      try {
        const response = await fetch('/api/mra/worksheets');
        const data = await response.json();
        if (data.success) {
          setWorksheets(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch worksheets for memo:', error);
        // Fallback to localStorage
        const savedWorksheets = localStorage.getItem('mra_worksheets');
        if (savedWorksheets) {
          setWorksheets(JSON.parse(savedWorksheets));
        }
      }
    };

    fetchWorksheets();

    const savedSettings = localStorage.getItem('mra_memo_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('mra_memo_settings', JSON.stringify(settings));
    setShowSettings(false);
  };

  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    worksheets.forEach(w => {
      const match = w.name?.match(/\d{2}/);
      if (match) uniqueYears.add(`25${match[0]}`);
    });
    return Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
  }, [worksheets]);

  const rounds = useMemo(() => {
    const filteredByYear = worksheets.filter(w => {
      if (selectedYear === 'all') return true;
      const match = w.name?.match(/\d{2}/);
      return match && `25${match[0]}` === selectedYear;
    });
    const uniqueRounds = Array.from(new Set(filteredByYear.map(w => w.name || 'Unknown')));
    return uniqueRounds.sort();
  }, [worksheets, selectedYear]);

  const filteredWorksheets = useMemo(() => {
    return worksheets.filter(w => {
      let matchYear = true;
      if (selectedYear !== 'all') {
        const match = w.name?.match(/\d{2}/);
        matchYear = match && `25${match[0]}` === selectedYear;
      }
      const matchRound = selectedRound === 'all' || (w.name || 'Unknown') === selectedRound;
      return matchYear && matchRound;
    });
  }, [worksheets, selectedYear, selectedRound]);

  const stats = useMemo(() => {
    // IPD Stats
    let totalIpdEarned = 0;
    let totalIpdPossible = 0;
    let totalIpdCases = 0;

    let ipdEarned = 0;
    let ipdPossible = 0;
    let ipdCases = 0;

    let labourEarned = 0;
    let labourPossible = 0;
    let labourCases = 0;

    // OPD Stats
    let totalOpdEarned = 0;
    let totalOpdPossible = 0;
    let totalOpdCases = 0;

    const ipdCriteriaStats: Record<string, { earned: number[], total: number[] }> = {};
    const opdCriteriaStats: Record<string, { earned: number[], total: number[] }> = {};
    
    const ipdImprovements: Record<string, string[]> = {};
    const opdImprovements: Record<string, string[]> = {};

    IPD_ROWS.forEach(r => {
      ipdCriteriaStats[r.id] = { earned: new Array(r.cols).fill(0), total: new Array(r.cols).fill(0) };
    });

    OPD_ROWS.forEach(r => {
      opdCriteriaStats[r.id] = { earned: new Array(r.cols).fill(0), total: new Array(r.cols).fill(0) };
    });

    filteredWorksheets.forEach(ws => {
      const isLabour = ws.department === settings.labourDeptName;
      
      ws.cases.forEach(c => {
        if (c.status === 'audited' && c.scores) {
          if (ws.type === 'IPD') {
            totalIpdCases++;
            if (isLabour) labourCases++;
            else ipdCases++;

            IPD_ROWS.forEach(r => {
              const isNA = c.scores?.[`${r.id}_NA`] === '1';
              const isMiss = c.scores?.[`${r.id}_M`] === '1';
              const isNo = c.scores?.[`${r.id}_O`] === '1';

              if (isNA) return;

              // Handle bonus/deduct for IPD
              if (c.scores?.[`${r.id}_bonus`] === '1') {
                totalIpdEarned++;
                if (isLabour) labourEarned++;
                else ipdEarned++;
              }
              if (c.scores?.[`${r.id}_deduct`] === '1') {
                totalIpdEarned--;
                if (isLabour) labourEarned--;
                else ipdEarned--;
              }

              for (let i = 0; i < r.cols; i++) {
                // Skip blocked columns
                if ((r as any).blockedCols?.includes(i)) continue;

                totalIpdPossible++;
                if (isLabour) labourPossible++;
                else ipdPossible++;
                ipdCriteriaStats[r.id].total[i]++;

                if (isMiss || isNo) {
                  const reason = c.reasons?.[`${r.id}_${i}`];
                  if (reason) {
                    if (!ipdImprovements[r.name]) ipdImprovements[r.name] = [];
                    if (!ipdImprovements[r.name].includes(reason)) ipdImprovements[r.name].push(reason);
                  }
                } else {
                  // Default to '1' if not set
                  const val = c.scores?.[`${r.id}_${i}`] || '1';
                  if (val === '1') {
                    totalIpdEarned++;
                    if (isLabour) labourEarned++;
                    else ipdEarned++;
                    ipdCriteriaStats[r.id].earned[i]++;
                  } else if (val === '0') {
                    const reason = c.reasons?.[`${r.id}_${i}`];
                    if (reason) {
                      if (!ipdImprovements[r.name]) ipdImprovements[r.name] = [];
                      if (!ipdImprovements[r.name].includes(reason)) ipdImprovements[r.name].push(reason);
                    }
                  }
                }
              }
            });
          } else if (ws.type === 'OPD') {
            totalOpdCases++;
            OPD_ROWS.forEach(r => {
              const isNA = c.scores?.[`${r.id}_NA`] === '1';
              const isMiss = c.scores?.[`${r.id}_M`] === '1';

              if (isNA) return;

              // Handle bonus/deduct for OPD
              if (c.scores?.[`${r.id}_bonus`] === '1') {
                totalOpdEarned++;
              }
              if (c.scores?.[`${r.id}_deduct`] === '1') {
                totalOpdEarned--;
              }

              for (let i = 0; i < r.cols; i++) {
                // Skip blocked columns
                if ((r as any).blockedCols?.includes(i)) continue;

                totalOpdPossible++;
                opdCriteriaStats[r.id].total[i]++;

                if (isMiss) {
                  const reason = c.reasons?.[`${r.id}_${i}`];
                  if (reason) {
                    if (!opdImprovements[r.name]) opdImprovements[r.name] = [];
                    if (!opdImprovements[r.name].includes(reason)) opdImprovements[r.name].push(reason);
                  }
                } else {
                  // Default to '1' if not set
                  const val = c.scores?.[`${r.id}_${i}`] || '1';
                  if (val === '1') {
                    totalOpdEarned++;
                    opdCriteriaStats[r.id].earned[i]++;
                  } else if (val === '0') {
                    const reason = c.reasons?.[`${r.id}_${i}`];
                    if (reason) {
                      if (!opdImprovements[r.name]) opdImprovements[r.name] = [];
                      if (!opdImprovements[r.name].includes(reason)) opdImprovements[r.name].push(reason);
                    }
                  }
                }
              }
            });
          }
        }
      });
    });

    const ipdChartData = IPD_ROWS.map(r => {
      const earned = ipdCriteriaStats[r.id].earned.reduce((a, b) => a + b, 0);
      const total = ipdCriteriaStats[r.id].total.reduce((a, b) => a + b, 0);
      return {
        name: r.name,
        shortName: r.name.split(':')[0].trim(),
        value: total > 0 ? (earned / total) * 100 : 0
      };
    });

    const opdChartData = OPD_ROWS.map(r => {
      const earned = opdCriteriaStats[r.id].earned.reduce((a, b) => a + b, 0);
      const total = opdCriteriaStats[r.id].total.reduce((a, b) => a + b, 0);
      return {
        name: r.name,
        shortName: r.name.split('(')[0].trim(),
        value: total > 0 ? (earned / total) * 100 : 0
      };
    });

    return {
      overallIpd: totalIpdPossible > 0 ? (totalIpdEarned / totalIpdPossible) * 100 : 0,
      ipd: ipdPossible > 0 ? (ipdEarned / ipdPossible) * 100 : 0,
      labour: labourPossible > 0 ? (labourEarned / labourPossible) * 100 : 0,
      overallOpd: totalOpdPossible > 0 ? (totalOpdEarned / totalOpdPossible) * 100 : 0,
      totalIpdCases,
      ipdCases,
      labourCases,
      totalOpdCases,
      ipdCriteriaStats,
      opdCriteriaStats,
      ipdChartData,
      opdChartData,
      ipdImprovements,
      opdImprovements
    };
  }, [filteredWorksheets, settings.labourDeptName]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, customLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Memorandum_Report',
  });

  return (
    <div className="space-y-6 pb-12">
      <style>
        {`
          @media print {
            body { background: white !important; }
            .print-hidden { display: none !important; }
            .print-container { 
              margin: 0 !important; 
              padding: 0 !important; 
              box-shadow: none !important; 
              border: none !important;
              width: 100% !important;
            }
            .page-break { page-break-before: always; }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
          .memo-font {
            font-family: "TH Sarabun New", "Sarabun", sans-serif;
          }
        `}
      </style>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print-hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            บันทึกข้อความเสนอเซ็น
          </h2>
          <p className="text-sm text-slate-500 font-medium">พิมพ์รายงานสรุปผลการประเมินเพื่อเสนอผู้บริหาร</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings className="w-4 h-4" />
            ตั้งค่าผู้เสนอ/ผู้อนุมัติ
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 border border-blue-700 rounded-xl px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            พิมพ์บันทึกข้อความ
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 print-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              ตั้งค่าข้อมูลบันทึกข้อความ
            </h3>
            <button 
              onClick={handleSaveSettings}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all"
            >
              <Save className="w-4 h-4" />
              บันทึกการตั้งค่า
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ส่วนราชการ</label>
                <input 
                  type="text" 
                  value={settings.department}
                  onChange={(e) => setSettings({...settings, department: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ที่</label>
                  <input 
                    type="text" 
                    value={settings.refNo}
                    onChange={(e) => setSettings({...settings, refNo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">วันที่</label>
                  <input 
                    type="text" 
                    value={settings.date}
                    onChange={(e) => setSettings({...settings, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">เรื่อง</label>
                <input 
                  type="text" 
                  value={settings.subject}
                  onChange={(e) => setSettings({...settings, subject: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">เรียน</label>
                <input 
                  type="text" 
                  value={settings.to}
                  onChange={(e) => setSettings({...settings, to: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ชื่อผู้เสนอ</label>
                  <input 
                    type="text" 
                    value={settings.proposerName}
                    onChange={(e) => setSettings({...settings, proposerName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ตำแหน่งผู้เสนอ</label>
                  <input 
                    type="text" 
                    value={settings.proposerPosition}
                    onChange={(e) => setSettings({...settings, proposerPosition: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ชื่อผู้อนุมัติ</label>
                  <input 
                    type="text" 
                    value={settings.approverName}
                    onChange={(e) => setSettings({...settings, approverName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ตำแหน่งผู้อนุมัติ</label>
                  <input 
                    type="text" 
                    value={settings.approverPosition}
                    onChange={(e) => setSettings({...settings, approverPosition: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">รูปแบบลายเซ็นผู้อนุมัติ</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sig_style" 
                      checked={settings.signatureStyle === 'style1'} 
                      onChange={() => setSettings({...settings, signatureStyle: 'style1'})}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-600">แบบที่ 1 (ปกติ)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sig_style" 
                      checked={settings.signatureStyle === 'style2'} 
                      onChange={() => setSettings({...settings, signatureStyle: 'style2'})}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-600">แบบที่ 2 (ปฏิบัติราชการแทน)</span>
                  </label>
                </div>
              </div>
              {settings.signatureStyle === 'style2' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ข้อความบรรทัดที่ 3 (สำหรับแบบที่ 2)</label>
                  <input 
                    type="text" 
                    value={settings.approverPosition2 || "ปฏิบัติราชการแทน ผู้อำนวยการโรงพยาบาลโพทะเล"}
                    onChange={(e) => setSettings({...settings, approverPosition2: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ชื่อแผนกห้องคลอด (เพื่อแยกสรุป)</label>
                <input 
                  type="text" 
                  value={settings.labourDeptName}
                  onChange={(e) => setSettings({...settings, labourDeptName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น ห้องคลอด"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">อัปโหลดตราครุฑ (ถ้าไม่ขึ้น)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {settings.customLogo && (
                  <button 
                    onClick={() => setSettings({ ...settings, customLogo: '' })}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold"
                  >
                    ลบรูปที่อัปโหลด
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round Selection */}
      <div className="flex flex-wrap gap-3 print-hidden">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedYear} 
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedRound('all');
            }}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
          >
            <option value="all">ทุกปีงบประมาณ</option>
            {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Settings className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedRound} 
            onChange={(e) => setSelectedRound(e.target.value)}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
          >
            <option value="all">ทุกรอบการประเมิน</option>
            {rounds.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Page 1: Memorandum Preview */}
      <div ref={printRef} className="print-wrapper">
        <div className="bg-white shadow-lg border border-slate-200 mx-auto p-[1in] w-[210mm] min-h-[297mm] text-[#000] print-container memo-font">
          <div className="relative">
          {/* Garuda Logo - Standard size is 3cm x 3cm */}
          <div className="absolute top-0 left-0">
            <img 
              src={settings.customLogo || "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Garuda_Thailand.svg/1200px-Garuda_Thailand.svg.png"} 
              alt="Garuda" 
              className="w-[30mm] h-[30mm] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="text-center pt-4 mb-8">
            <h1 className="text-[29pt] font-bold tracking-tighter leading-none">บันทึกข้อความ</h1>
          </div>

          <div className="space-y-1 text-[16pt] leading-tight">
            <div className="flex items-baseline">
              <span className="font-bold w-32 shrink-0">ส่วนราชการ</span>
              <span className="border-b border-dotted border-slate-400 flex-1 px-2 min-h-[1.5em]">{settings.department}</span>
            </div>
            
            <div className="flex gap-4 items-baseline">
              <div className="flex flex-1 items-baseline">
                <span className="font-bold w-12 shrink-0">ที่</span>
                <span className="border-b border-dotted border-slate-400 flex-1 px-2 min-h-[1.5em]">{settings.refNo}</span>
              </div>
              <div className="flex flex-1 items-baseline">
                <span className="font-bold w-16 shrink-0">วันที่</span>
                <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-center min-h-[1.5em]">{settings.date}</span>
              </div>
            </div>

            <div className="flex items-baseline">
              <span className="font-bold w-16 shrink-0">เรื่อง</span>
              <span className="border-b border-dotted border-slate-400 flex-1 px-2 min-h-[1.5em]">{settings.subject}</span>
            </div>

            <div className="pt-6">
              <span className="font-bold mr-4">เรียน</span>
              <span>{settings.to}</span>
            </div>

            <div className="flex pt-2">
              <span className="font-bold w-40 shrink-0">สิ่งที่แนบมาด้วย</span>
              <span className="flex-1">{settings.attachment}</span>
            </div>

            <div className="pt-8 indent-16 text-justify leading-relaxed">
              เนื่องด้วยทีมเวชระเบียนโรงพยาบาลโพทะเล ได้ดำเนินการสุ่มตรวจสอบคุณภาพเวชระเบียนของผู้มารับบริการในปีงบประมาณ ๒๕๖๗ 
              โดยทำการสุ่มเวชระเบียนผู้ป่วยใน จำนวน {stats.totalIpdCases} ฉบับ และเวชระเบียนผู้ป่วยนอก จำนวน {stats.totalOpdCases} ฉบับ 
              ซึ่งมีรายละเอียดผลการตรวจสอบตามเอกสารแนบท้าย ดังนี้
            </div>

            <div className="pl-16 space-y-1 pt-4">
              <div className="flex justify-between">
                <span className="font-bold">๑. คุณภาพเวชระเบียนผู้ป่วยใน</span>
                <span className="font-bold">ร้อยละ {stats.overallIpd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pl-8">
                <span>๑.๑ คุณภาพโดยรวมของเวชระเบียนผู้ป่วยใน งานผู้ป่วยใน</span>
                <span>ร้อยละ {stats.ipd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pl-8">
                <span>๑.๒ คุณภาพโดยรวมของเวชระเบียนผู้ป่วยใน งานห้องคลอด</span>
                <span>ร้อยละ {stats.labour.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between pt-2">
                <span className="font-bold">๒. คุณภาพเวชระเบียนผู้ป่วยนอก</span>
                <span className="font-bold">ร้อยละ {stats.overallOpd.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-8 indent-16">
              จึงเรียนมาเพื่อพิจารณาโปรดทราบ
            </div>

            {/* Signatures */}
            <div className="pt-24 flex flex-col items-end space-y-24 pr-10">
              <div className="text-center w-80">
                <div className="mb-2">(ลงชื่อ)...........................................................</div>
                <div className="mb-1">( {settings.proposerName} )</div>
                <div className="text-[14pt]">{settings.proposerPosition}</div>
              </div>

              <div className="text-center w-80">
                <div className="mb-2">(ลงชื่อ)...........................................................</div>
                <div className="mb-1">( {settings.approverName} )</div>
                <div className="text-[14pt] leading-tight">{settings.approverPosition}</div>
                {settings.signatureStyle === 'style2' && (
                  <div className="text-[14pt] leading-tight mt-1">{settings.approverPosition2 || "ปฏิบัติราชการแทน ผู้อำนวยการโรงพยาบาลโพทะเล"}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2: Table Summary IPD */}
      <div className="bg-white shadow-lg border border-slate-200 mx-auto p-[1in] w-[210mm] min-h-[297mm] text-[#000] print-container memo-font page-break">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold">ตารางที่ ๑ ผลการประเมินคุณภาพเวชระเบียนผู้ป่วยใน ประจำปีงบประมาณ ๒๕๖๗</h2>
          <p className="text-sm">รอบการประเมิน: {selectedRound === 'all' ? 'ทุกรอบ' : selectedRound}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-[12pt]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-black p-2 text-center">Content</th>
                {Array.from({ length: 9 }, (_, i) => (
                  <th key={i} className="border border-black p-1 text-center text-[10pt]">เกณฑ์ {i + 1}</th>
                ))}
                <th className="border border-black p-2 text-center">รวม</th>
              </tr>
            </thead>
            <tbody>
              {IPD_ROWS.map(r => {
                const earned = stats.ipdCriteriaStats[r.id].earned.reduce((a, b) => a + b, 0);
                const total = stats.ipdCriteriaStats[r.id].total.reduce((a, b) => a + b, 0);
                const rowPct = total > 0 ? (earned / total) * 100 : 0;
                
                return (
                  <tr key={r.id}>
                    <td className="border border-black p-2 text-left text-[11pt]">{r.name}</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const e = stats.ipdCriteriaStats[r.id].earned[i];
                      const t = stats.ipdCriteriaStats[r.id].total[i];
                      const p = t > 0 ? (e / t) * 100 : null;
                      return (
                        <td key={i} className={`border border-black p-1 text-center text-[10pt] ${p !== null && p < 80 ? 'bg-yellow-50' : ''}`}>
                          {p !== null ? p.toFixed(1) : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-black p-2 text-center font-bold">{rowPct.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-bold">
                <td className="border border-black p-2 text-center" colSpan={10}>รวม</td>
                <td className="border border-black p-2 text-center">{stats.overallIpd.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Page 3: Chart Summary IPD */}
      <div className="bg-white shadow-lg border border-slate-200 mx-auto p-[1in] w-[210mm] min-h-[297mm] text-[#000] print-container memo-font page-break">
        <div className="text-center mb-12">
          <h2 className="text-xl font-bold">แผนภูมิที่ ๑ ร้อยละของการประเมินคุณภาพเวชระเบียนผู้ป่วยใน ประจำปีงบประมาณ ๒๕๖๗</h2>
          <p className="text-sm">ตามเกณฑ์ สปสช. จำนวน {stats.totalIpdCases} ฉบับ</p>
        </div>

        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.ipdChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="shortName" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" label={{ position: 'right', value: 'เกณฑ์ 80%', fill: 'red', fontSize: 12 }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={(v: number) => v.toFixed(1)} style={{ fontSize: 10, fontWeight: 'bold' }} />
                {stats.ipdChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value >= 80 ? '#10b981' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Page 4: Table Summary OPD */}
      <div className="bg-white shadow-lg border border-slate-200 mx-auto p-[1in] w-[210mm] min-h-[297mm] text-[#000] print-container memo-font page-break">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold">ตารางที่ ๒ ผลการประเมินคุณภาพเวชระเบียนผู้ป่วยนอก ประจำปีงบประมาณ ๒๕๖๗</h2>
          <p className="text-sm">รอบการประเมิน: {selectedRound === 'all' ? 'ทุกรอบ' : selectedRound}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-[12pt]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-black p-2 text-center">Content</th>
                {Array.from({ length: 7 }, (_, i) => (
                  <th key={i} className="border border-black p-1 text-center text-[10pt]">เกณฑ์ {i + 1}</th>
                ))}
                <th className="border border-black p-2 text-center">รวม</th>
              </tr>
            </thead>
            <tbody>
              {OPD_ROWS.map(r => {
                const earned = stats.opdCriteriaStats[r.id].earned.reduce((a, b) => a + b, 0);
                const total = stats.opdCriteriaStats[r.id].total.reduce((a, b) => a + b, 0);
                const rowPct = total > 0 ? (earned / total) * 100 : 0;
                
                return (
                  <tr key={r.id}>
                    <td className="border border-black p-2 text-left text-[11pt]">{r.name}</td>
                    {Array.from({ length: 7 }, (_, i) => {
                      const e = stats.opdCriteriaStats[r.id].earned[i];
                      const t = stats.opdCriteriaStats[r.id].total[i];
                      const p = t > 0 ? (e / t) * 100 : null;
                      return (
                        <td key={i} className={`border border-black p-1 text-center text-[10pt] ${p !== null && p < 80 ? 'bg-yellow-50' : ''}`}>
                          {p !== null ? p.toFixed(1) : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-black p-2 text-center font-bold">{rowPct.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-bold">
                <td className="border border-black p-2 text-center" colSpan={8}>รวม</td>
                <td className="border border-black p-2 text-center">{stats.overallOpd.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Page 5: Chart Summary OPD */}
      <div className="bg-white shadow-lg border border-slate-200 mx-auto p-[1in] w-[210mm] min-h-[297mm] text-[#000] print-container memo-font page-break">
        <div className="text-center mb-12">
          <h2 className="text-xl font-bold">แผนภูมิที่ ๒ ร้อยละของการประเมินคุณภาพเวชระเบียนผู้ป่วยนอก ประจำปีงบประมาณ ๒๕๖๗</h2>
          <p className="text-sm">จำนวน {stats.totalOpdCases} ฉบับ</p>
        </div>

        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.opdChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="shortName" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" label={{ position: 'right', value: 'เกณฑ์ 80%', fill: 'red', fontSize: 12 }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={(v: number) => v.toFixed(1)} style={{ fontSize: 10, fontWeight: 'bold' }} />
                {stats.opdChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value >= 80 ? '#10b981' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Page 6: Improvements */}
      <div className="bg-white shadow-lg border border-slate-200 mx-auto p-[1in] w-[210mm] min-h-[297mm] text-[#000] print-container memo-font page-break">
        <div className="text-center mb-12">
          <h2 className="text-xl font-bold">สิ่งที่ควรปรับปรุงแก้ไข</h2>
          <p className="text-sm">จากการตรวจสอบคุณภาพเวชระเบียน</p>
        </div>

        <div className="space-y-8 text-[14pt]">
          {/* IPD Improvements */}
          {Object.keys(stats.ipdImprovements).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-2">เวชระเบียนผู้ป่วยใน :</h3>
              {(Object.entries(stats.ipdImprovements) as [string, string[]][]).map(([criteria, reasons]) => (
                <div key={criteria} className="space-y-2">
                  <h4 className="font-bold">{criteria} :</h4>
                  <ul className="list-disc pl-8 space-y-1">
                    {reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* OPD Improvements */}
          {Object.keys(stats.opdImprovements).length > 0 && (
            <div className="space-y-4 pt-8">
              <h3 className="text-lg font-bold text-emerald-800 border-b-2 border-emerald-100 pb-2">เวชระเบียนผู้ป่วยนอก :</h3>
              {(Object.entries(stats.opdImprovements) as [string, string[]][]).map(([criteria, reasons]) => (
                <div key={criteria} className="space-y-2">
                  <h4 className="font-bold">{criteria} :</h4>
                  <ul className="list-disc pl-8 space-y-1">
                    {reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {Object.keys(stats.ipdImprovements).length === 0 && Object.keys(stats.opdImprovements).length === 0 && (
            <div className="text-center text-slate-400 italic py-20">
              ไม่พบข้อมูลสิ่งที่ควรปรับปรุงแก้ไข
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
