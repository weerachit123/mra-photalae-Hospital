import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  LayoutDashboard, Filter, Calendar, Users, TrendingUp, Award, 
  ClipboardCheck, Printer, FileSpreadsheet, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { getOPDCriteria, getIPDCriteria } from './EditCriteria';

// Define criteria structure for OPD and IPD (IDs and column counts)
const OPD_CRITERIA_STRUCTURE = [
  { id: '1', name: "Patient's Profile", cols: 7 },
  { id: '2', name: "History (1st visit)", cols: 7 },
  { id: '3', name: "Physical examination", cols: 7 },
  { id: '4', name: "Treatment/Investigation", cols: 7 },
  { id: '5_1', name: "Follow up ครั้งที่ 1", cols: 7 },
  { id: '5_2', name: "Follow up ครั้งที่ 2", cols: 7 },
  { id: '5_3', name: "Follow up ครั้งที่ 3", cols: 7 },
  { id: '6', name: "Operative note", cols: 7 },
  { id: '7', name: "Informed consent", cols: 7 },
  { id: '8', name: "Rehabilitation record", cols: 7, blockedCols: [5, 6] },
];

const IPD_CRITERIA_STRUCTURE = [
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardStats() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [reportType, setReportType] = useState<'OPD' | 'IPD'>('OPD');

  useEffect(() => {
    const fetchWorksheets = async () => {
      const userJson = localStorage.getItem('user');
      const u = userJson ? JSON.parse(userJson) : null;
      const query = u ? `?loginname=${u.loginname}&role=${u.role}` : '';

      try {
        const response = await fetch(`/api/mra/worksheets${query}`);
        const data = await response.json();
        if (data.success) {
          setWorksheets(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch worksheets for stats:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('mra_worksheets');
        if (saved) {
          setWorksheets(JSON.parse(saved));
        }
      }
    };
    fetchWorksheets();
  }, []);

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

  const departments = useMemo(() => {
    const uniqueDepts = Array.from(new Set(worksheets.map(w => w.department || 'Unknown')));
    return uniqueDepts.sort();
  }, [worksheets]);

  const filteredWorksheets = useMemo(() => {
    return worksheets.filter(w => {
      let matchYear = true;
      if (selectedYear !== 'all') {
        const match = w.name?.match(/\d{2}/);
        matchYear = match && `25${match[0]}` === selectedYear;
      }
      const matchRound = selectedRound === 'all' || (w.name || 'Unknown') === selectedRound;
      const matchDept = selectedDept === 'all' || (w.department || 'Unknown') === selectedDept;
      return matchYear && matchRound && matchDept;
    });
  }, [worksheets, selectedYear, selectedRound, selectedDept]);

  const stats = useMemo(() => {
    let totalPoints = 0;
    let earnedPoints = 0;
    let totalCases = 0;
    let auditedCases = 0;

    const deptStats: Record<string, { earned: number, total: number, count: number }> = {};
    const roundStats: Record<string, { earned: number, total: number, count: number }> = {};

    filteredWorksheets.forEach(ws => {
      if (!deptStats[ws.department]) deptStats[ws.department] = { earned: 0, total: 0, count: 0 };
      if (!roundStats[ws.name]) roundStats[ws.name] = { earned: 0, total: 0, count: 0 };

      const criteria = ws.type === 'OPD' ? OPD_CRITERIA_STRUCTURE : IPD_CRITERIA_STRUCTURE;

      ws.cases.forEach(c => {
        totalCases++;
        if (c.status === 'audited' && c.scores) {
          auditedCases++;
          let caseTotal = 0;
          let caseEarned = 0;

          criteria.forEach(row => {
            const isNA = c.scores?.[`${row.id}_NA`] === '1';
            const isMiss = c.scores?.[`${row.id}_M`] === '1';
            const isNo = c.scores?.[`${row.id}_O`] === '1';

            if (isNA) return;

            for (let i = 0; i < row.cols; i++) {
              if (row.blockedCols?.includes(i)) continue;

              caseTotal += 1;
              if (isMiss || isNo) {
                // 0 points
              } else {
                const val = c.scores?.[`${row.id}_${i}`] || '1';
                if (val === '1') {
                  caseEarned += 1;
                }
              }
            }

            // Bonus/Deduct
            if (c.scores?.[`${row.id}_bonus`] === '1') caseEarned += 1;
            if (c.scores?.[`${row.id}_deduct`] === '1') caseEarned -= 1;
          });

          earnedPoints += caseEarned;
          totalPoints += caseTotal;

          deptStats[ws.department].earned += caseEarned;
          deptStats[ws.department].total += caseTotal;
          deptStats[ws.department].count++;

          roundStats[ws.name].earned += caseEarned;
          roundStats[ws.name].total += caseTotal;
          roundStats[ws.name].count++;
        }
      });
    });

    const overallScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    const deptChartData = Object.entries(deptStats).map(([name, data]) => ({
      name,
      score: data.total > 0 ? parseFloat(((data.earned / data.total) * 100).toFixed(2)) : 0
    })).sort((a, b) => b.score - a.score);

    const roundChartData = Object.entries(roundStats).map(([name, data]) => ({
      name,
      score: data.total > 0 ? parseFloat(((data.earned / data.total) * 100).toFixed(2)) : 0
    })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      overallScore,
      totalCases,
      auditedCases,
      deptChartData,
      roundChartData
    };
  }, [filteredWorksheets]);

  // Matrix Data Calculation
  const matrixData = useMemo(() => {
    const criteria = reportType === 'OPD' ? OPD_CRITERIA_STRUCTURE : IPD_CRITERIA_STRUCTURE;
    const depts = selectedDept === 'all' ? departments : [selectedDept];
    
    return depts.map(dept => {
      const deptWorksheets = filteredWorksheets.filter(w => w.department === dept && w.type === reportType);
      const criteriaScores: Record<string, { earned: number, total: number }> = {};
      
      criteria.forEach(c => {
        criteriaScores[c.id] = { earned: 0, total: 0 };
      });

      deptWorksheets.forEach(ws => {
        ws.cases.forEach(c => {
          if (c.status === 'audited' && c.scores) {
            criteria.forEach(crit => {
              const rowId = crit.id;
              const isNA = c.scores?.[`${rowId}_NA`] === '1';
              const isMiss = c.scores?.[`${rowId}_M`] === '1';
              const isNo = c.scores?.[`${rowId}_O`] === '1';

              if (isNA) return;

              // Bonus/Deduct
              if (c.scores?.[`${rowId}_bonus`] === '1') criteriaScores[rowId].earned += 1;
              if (c.scores?.[`${rowId}_deduct`] === '1') criteriaScores[rowId].earned -= 1;

              for (let i = 0; i < crit.cols; i++) {
                // Skip blocked columns
                if ((crit as any).blockedCols?.includes(i)) continue;

                if (isMiss || isNo) {
                  criteriaScores[rowId].total += 1;
                } else {
                  // Default to '1' if not set
                  const val = c.scores?.[`${rowId}_${i}`] || '1';
                  if (val === '1') {
                    criteriaScores[rowId].earned += 1;
                    criteriaScores[rowId].total += 1;
                  } else if (val === '0') {
                    criteriaScores[rowId].total += 1;
                  }
                }
              }
            });
          }
        });
      });

      const row: any = { department: dept };
      criteria.forEach(c => {
        const s = criteriaScores[c.id];
        row[c.id] = s.total > 0 ? (s.earned / s.total) * 100 : null;
      });
      
      return row;
    });
  }, [filteredWorksheets, reportType, selectedDept, departments]);

  const handlePrint = () => {
    window.print();
  };

  const handleExcel = () => {
    try {
      const criteria = reportType === 'OPD' ? OPD_CRITERIA_STRUCTURE : IPD_CRITERIA_STRUCTURE;
      const data = matrixData.map(row => {
        const exportRow: any = { 'แผนก/วอร์ด': row.department || 'Unknown' };
        criteria.forEach(c => {
          exportRow[c.name] = row[c.id] !== null ? `${row[c.id].toFixed(1)}%` : '-';
        });
        return exportRow;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Report ${reportType}`);
      XLSX.writeFile(wb, `MRA_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('เกิดข้อผิดพลาดในการส่งออก Excel: ' + (error as Error).message);
    }
  };

  const handlePDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const criteria = reportType === 'OPD' ? OPD_CRITERIA_STRUCTURE : IPD_CRITERIA_STRUCTURE;
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Medical Record Audit Summary Report (${reportType})`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Round: ${selectedRound} | Department: ${selectedDept}`, 14, 22);

      const headers = ['Department', ...criteria.map(c => c.name)];
      const body = matrixData.map(row => [
        row.department || 'Unknown',
        ...criteria.map(c => row[c.id] !== null ? `${row[c.id].toFixed(1)}%` : '-')
      ]);

      autoTable(doc, {
        startY: 30,
        head: [headers],
        body: body,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`MRA_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('เกิดข้อผิดพลาดในการส่งออก PDF: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            Dashboard สรุปผลการประเมิน
          </h2>
          <p className="text-sm text-slate-500 font-medium">ภาพรวมคะแนนการ Audit เวชระเบียน</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button 
            onClick={handleExcel}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={handlePDF}
            className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedYear} 
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedRound('all'); // Reset round when year changes
            }}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
          >
            <option value="all">ทุกปีงบประมาณ</option>
            {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedRound} 
            onChange={(e) => setSelectedRound(e.target.value)}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
          >
            <option value="all">ทุกรอบการประเมิน</option>
            {rounds.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Users className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
          >
            <option value="all">ทุกแผนก/วอร์ด</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3 print:hidden">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">คะแนนภาพรวม</p>
          <p className="text-3xl font-black text-slate-800">{stats.overallScore.toFixed(1)}%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-3 print:hidden">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ประเมินแล้ว</p>
          <p className="text-3xl font-black text-slate-800">{stats.auditedCases} / {stats.totalCases}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-3 print:hidden">
            <Award className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">จำนวนใบงาน</p>
          <p className="text-3xl font-black text-slate-800">{filteredWorksheets.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-3 print:hidden">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">แผนกที่เกี่ยวข้อง</p>
          <p className="text-3xl font-black text-slate-800">{new Set(filteredWorksheets.map(w => w.department)).size}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        {/* Department Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            คะแนนเฉลี่ยแยกตามแผนก (%)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.deptChartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                  {stats.deptChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rounds Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            แนวโน้มคะแนนตามรอบการประเมิน (%)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.roundChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Matrix Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">สรุปคะแนนแยกตามแผนกและหัวข้อการประเมิน (%)</h3>
          <div className="flex bg-slate-100 p-1 rounded-lg print:hidden">
            <button 
              onClick={() => setReportType('OPD')}
              className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${reportType === 'OPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              OPD
            </button>
            <button 
              onClick={() => setReportType('IPD')}
              className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${reportType === 'IPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              IPD
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest border-b border-slate-200">
                <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 min-w-[150px]">แผนก/วอร์ด</th>
                {(reportType === 'OPD' ? OPD_CRITERIA_STRUCTURE : IPD_CRITERIA_STRUCTURE).map(c => (
                  <th key={c.id} className="px-4 py-3 text-center min-w-[120px]">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {row.department}
                  </td>
                  {(reportType === 'OPD' ? OPD_CRITERIA_STRUCTURE : IPD_CRITERIA_STRUCTURE).map(c => {
                    const val = row[c.id];
                    return (
                      <td key={c.id} className="px-4 py-3 text-center">
                        {val !== null ? (
                          <span className={`font-bold ${val >= 80 ? 'text-emerald-600' : val >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {val.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {matrixData.length === 0 && (
                <tr>
                  <td colSpan={(reportType === 'OPD' ? OPD_CRITERIA_STRUCTURE : IPD_CRITERIA_STRUCTURE).length + 1} className="px-6 py-12 text-center text-slate-400 font-bold">
                    ไม่พบข้อมูลการประเมิน {reportType} ในเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
