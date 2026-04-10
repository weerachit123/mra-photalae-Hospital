import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Printer, FileSpreadsheet, FileText, Calendar, Users, 
  ChevronDown, ChevronUp, LayoutDashboard, FileBarChart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { getOPDCriteria, getIPDCriteria } from './EditCriteria';

// Criteria Structure Definitions (IDs and column counts)
const OPD_ROWS_STRUCTURE = [
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

const IPD_ROWS_STRUCTURE = [
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
  doctor_name?: string;
  scores?: Record<string, string>;
  reasons?: Record<string, string>;
}

interface Worksheet {
  id: string;
  name: string;
  type: 'OPD' | 'IPD';
  department: string;
  createdAt: string;
  criteria_year?: string;
  cases: Case[];
}

export default function DetailedReport() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [reportType, setReportType] = useState<'OPD' | 'IPD'>('OPD');

  useEffect(() => {
    const fetchWorksheets = async () => {
      try {
        const response = await fetch('/api/mra/worksheets');
        const data = await response.json();
        if (data.success) {
          setWorksheets(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch worksheets for detailed report:', error);
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

  const doctors = useMemo(() => {
    const docSet = new Set<string>();
    worksheets.forEach(ws => {
      if (ws.type === reportType) {
        let matchYear = true;
        if (selectedYear !== 'all') {
          const match = ws.name?.match(/\d{2}/);
          matchYear = match && `25${match[0]}` === selectedYear;
        }
        if (matchYear) {
          ws.cases.forEach(c => {
            if (c.doctor_name) docSet.add(c.doctor_name);
          });
        }
      }
    });
    return Array.from(docSet).sort();
  }, [worksheets, reportType, selectedYear]);

  const reportTypeRef = useRef<HTMLDivElement>(null);

  const filteredWorksheets = useMemo(() => {
    return worksheets.filter(w => {
      let matchYear = true;
      if (selectedYear !== 'all') {
        const match = w.name?.match(/\d{2}/);
        matchYear = match && `25${match[0]}` === selectedYear;
      }
      const matchRound = selectedRound === 'all' || (w.name || 'Unknown') === selectedRound;
      const matchType = w.type === reportType;
      
      if (!matchYear || !matchRound || !matchType) return false;
      
      if (selectedDoctor !== 'all') {
        return w.cases.some(c => c.doctor_name === selectedDoctor);
      }
      
      return true;
    });
  }, [worksheets, selectedYear, selectedRound, reportType, selectedDoctor]);

  const departments = useMemo(() => {
    const uniqueDepts = Array.from(new Set(filteredWorksheets.map(w => w.department || 'Unknown')));
    return uniqueDepts.sort();
  }, [filteredWorksheets]);

  const calculateMatrix = (wsList: Worksheet[]) => {
    const rows = reportType === 'OPD' ? OPD_ROWS_STRUCTURE : IPD_ROWS_STRUCTURE;
    const maxCols = Math.max(...rows.map(r => r.cols));
    
    const counts: Record<string, number[]> = {};
    const totals: Record<string, number[]> = {};
    const bonusCounts: Record<string, number> = {};
    const deductCounts: Record<string, number> = {};
    let totalCases = 0;

    rows.forEach(r => {
      counts[r.id] = new Array(r.cols).fill(0);
      totals[r.id] = new Array(r.cols).fill(0);
      bonusCounts[r.id] = 0;
      deductCounts[r.id] = 0;
    });

    wsList.forEach(ws => {
      ws.cases.forEach(c => {
        const matchDoctor = selectedDoctor === 'all' || c.doctor_name === selectedDoctor;
        if (c.status === 'audited' && c.scores && matchDoctor) {
          totalCases++;
          rows.forEach(r => {
            const isNA = c.scores?.[`${r.id}_NA`] === '1';
            const isMiss = c.scores?.[`${r.id}_M`] === '1';
            const isNo = c.scores?.[`${r.id}_O`] === '1';

            if (isNA) return;

            // Check bonus/deduct for this row
            if (c.scores?.[`${r.id}_bonus`] === '1') bonusCounts[r.id]++;
            if (c.scores?.[`${r.id}_deduct`] === '1') deductCounts[r.id]++;

            for (let i = 0; i < r.cols; i++) {
              // Skip blocked columns
              if (r.blockedCols?.includes(i)) continue;

              if (isMiss || isNo) {
                totals[r.id][i]++;
              } else {
                // Default to '1' if not set, but only if not explicitly 'N' (NA)
                const val = c.scores?.[`${r.id}_${i}`] || '1';
                if (val === '1') {
                  counts[r.id][i]++;
                  totals[r.id][i]++;
                } else if (val === '0') {
                  totals[r.id][i]++;
                }
              }
            }
          });
        }
      });
    });

    return { counts, totals, bonusCounts, deductCounts, totalCases, maxCols };
  };

  const overallMatrix = useMemo(() => calculateMatrix(filteredWorksheets), [filteredWorksheets, reportType]);

  const problemsSummary = useMemo(() => {
    const summary: Record<string, { 
      criteriaText: string; 
      count: number; 
      notes: Set<string>;
      rowId: string;
      colIdx: number;
    }> = {};

    // Use criteria for the selected year or default to 2557
    const yearForCriteria = selectedYear === 'all' ? '2557' : selectedYear;
    const opdCriteriaMap = getOPDCriteria(yearForCriteria);
    const ipdCriteriaMap = getIPDCriteria(yearForCriteria);
    const currentCriteriaMap = reportType === 'OPD' ? opdCriteriaMap : ipdCriteriaMap;

    filteredWorksheets.forEach(ws => {
      ws.cases.forEach(c => {
        const matchDoctor = selectedDoctor === 'all' || c.doctor_name === selectedDoctor;
        if (c.status === 'audited' && c.scores && matchDoctor) {
          Object.entries(c.scores).forEach(([key, val]) => {
            if (val === '0') {
              const [rowId, colIdxStr] = key.split('_');
              const colIdx = parseInt(colIdxStr);
              
              if (!isNaN(colIdx)) {
                const summaryKey = `${rowId}_${colIdx}`;
                if (!summary[summaryKey]) {
                  const criteriaList = currentCriteriaMap[rowId] || [];
                  const criteriaText = criteriaList[colIdx] || `เกณฑ์หัวข้อที่ ${rowId} ข้อที่ ${colIdx + 1}`;
                  summary[summaryKey] = {
                    criteriaText,
                    count: 0,
                    notes: new Set(),
                    rowId,
                    colIdx
                  };
                }
                summary[summaryKey].count++;
                const note = c.reasons?.[key];
                if (note) summary[summaryKey].notes.add(note);
              }
            }
          });
        }
      });
    });

    return Object.values(summary).sort((a, b) => {
      if (a.rowId !== b.rowId) return a.rowId.localeCompare(b.rowId, undefined, { numeric: true });
      return a.colIdx - b.colIdx;
    });
  }, [filteredWorksheets, reportType, selectedDoctor, selectedYear]);

  const deptMatrices = useMemo(() => {
    const matrices: Record<string, any> = {};
    departments.forEach(dept => {
      matrices[dept] = calculateMatrix(filteredWorksheets.filter(w => w.department === dept));
    });
    return matrices;
  }, [filteredWorksheets, departments, reportType]);

  const handlePrint = () => window.print();

  const handleExcel = () => {
    try {
      const rows = reportType === 'OPD' ? OPD_ROWS_STRUCTURE : IPD_ROWS_STRUCTURE;
      const wb = XLSX.utils.book_new();

      // Overall Sheet
      const overallData = rows.map(r => {
        const row: any = { 'หัวข้อการประเมิน': r.name };
        for (let i = 0; i < r.cols; i++) {
          row[`ข้อ ${i + 1}`] = overallMatrix.counts[r.id][i];
        }
        const earned = overallMatrix.counts[r.id].reduce((a, b) => a + b, 0) + overallMatrix.bonusCounts[r.id] - overallMatrix.deductCounts[r.id];
        const total = overallMatrix.totals[r.id].reduce((a, b) => a + b, 0);
        row['คะแนนเต็ม'] = total;
        row['คะแนนที่ได้'] = earned;
        row['ร้อยละ'] = total > 0 ? ((earned / total) * 100).toFixed(2) : '0.00';
        return row;
      });
      const wsOverall = XLSX.utils.json_to_sheet(overallData);
      XLSX.utils.book_append_sheet(wb, wsOverall, 'ภาพรวม');

      // Problems Summary Sheet
      if (problemsSummary.length > 0) {
        const probData = problemsSummary.map(p => ({
          'เกณฑ์': `หัวข้อที่ ${p.rowId} ข้อที่ ${p.colIdx + 1}: ${p.criteriaText}`,
          'ความถี่ (0 คะแนน)': p.count,
          'สรุปข้อความ note': Array.from(p.notes).join(', ')
        }));
        const wsProb = XLSX.utils.json_to_sheet(probData);
        XLSX.utils.book_append_sheet(wb, wsProb, 'สรุปปัญหาที่พบ');
      }

      // Dept Sheets
      departments.forEach((dept, index) => {
        const m = deptMatrices[dept];
        if (!m) return;
        const deptData = rows.map(r => {
          const row: any = { 'หัวข้อการประเมิน': r.name };
          for (let i = 0; i < r.cols; i++) {
            row[`ข้อ ${i + 1}`] = m.counts[r.id][i];
          }
          const earned = m.counts[r.id].reduce((a, b) => a + b, 0) + m.bonusCounts[r.id] - m.deductCounts[r.id];
          const total = m.totals[r.id].reduce((a, b) => a + b, 0);
          row['คะแนนเต็ม'] = total;
          row['คะแนนที่ได้'] = earned;
          row['ร้อยละ'] = total > 0 ? ((earned / total) * 100).toFixed(2) : '0.00';
          return row;
        });
        const wsDept = XLSX.utils.json_to_sheet(deptData);
        let safeDeptName = (dept || 'Unknown').substring(0, 31).replace(/[\\/?*[\]]/g, '');
        if (!safeDeptName) safeDeptName = `Dept_${index}`;
        
        // Ensure unique sheet name
        let finalName = safeDeptName;
        let counter = 1;
        while (wb.SheetNames.includes(finalName)) {
          finalName = `${safeDeptName.substring(0, 28)}_${counter}`;
          counter++;
        }
        
        XLSX.utils.book_append_sheet(wb, wsDept, finalName);
      });

      XLSX.writeFile(wb, `MRA_Detailed_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('เกิดข้อผิดพลาดในการส่งออก Excel: ' + (error as Error).message);
    }
  };

  const handlePDF = () => {
    const element = reportTypeRef.current;
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `MRA_Detailed_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any }
    };

    // Temporarily hide elements with 'print:hidden' class if needed, 
    // but html2pdf usually captures the DOM as is.
    // We can use a clone or just target the ref.
    html2pdf().set(opt).from(element).save();
  };

  const renderMatrixTable = (title: string, matrix: any, subTitle?: string) => {
    const rows = reportType === 'OPD' ? OPD_ROWS_STRUCTURE : IPD_ROWS_STRUCTURE;
    const { counts, totals, bonusCounts, deductCounts, totalCases, maxCols } = matrix;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 break-inside-avoid">
        <div className="px-6 py-4 border-b border-slate-100" style={{ backgroundColor: '#f8fafc' }}>
          <h3 className="text-sm font-black text-slate-800">{title}</h3>
          {subTitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subTitle}</p>}
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-100">
            {/* Counts Table */}
            <div className="p-4">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">สรุปคะแนนที่ได้แยกตามหัวข้อ (คะแนน)</p>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100">
                    <th className="py-2 text-left">หัวข้อการประเมิน</th>
                    {Array.from({ length: maxCols }, (_, i) => (
                      <th key={i} className="py-2 text-center">ข้อ {i + 1}</th>
                    ))}
                    <th className="py-2 text-right">เต็ม</th>
                    <th className="py-2 text-right">ได้</th>
                    <th className="py-2 text-right">ร้อยละ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(r => {
                    const earned = counts[r.id].reduce((a: number, b: number) => a + b, 0) + bonusCounts[r.id] - deductCounts[r.id];
                    const total = totals[r.id].reduce((a: number, b: number) => a + b, 0);
                    const pct = total > 0 ? (earned / total) * 100 : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-600">{r.name}</td>
                        {counts[r.id].map((v: number, i: number) => (
                          <td key={i} className="py-2 text-center font-bold text-slate-500">{v}</td>
                        ))}
                        {Array.from({ length: maxCols - r.cols }).map((_, i) => (
                          <td key={i} className="py-2 text-center text-slate-200">-</td>
                        ))}
                        <td className="py-2 text-right font-black text-slate-400">{total}</td>
                        <td className="py-2 text-right font-black text-slate-700">{earned}</td>
                        <td className="py-2 text-right font-black text-blue-600">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Percentage Table */}
            <div className="p-4">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3">ร้อยละคะแนนที่ผ่านเกณฑ์ (%)</p>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100">
                    <th className="py-2 text-left">หัวข้อการประเมิน</th>
                    {Array.from({ length: maxCols }, (_, i) => (
                      <th key={i} className="py-2 text-center">ข้อ {i + 1}</th>
                    ))}
                    <th className="py-2 text-right">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(r => {
                    const earned = counts[r.id].reduce((a: number, b: number) => a + b, 0) + bonusCounts[r.id] - deductCounts[r.id];
                    const total = totals[r.id].reduce((a: number, b: number) => a + b, 0);
                    const overallPct = total > 0 ? (earned / total) * 100 : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-600">{r.name}</td>
                        {counts[r.id].map((v: number, i: number) => {
                          const t = totals[r.id][i];
                          const p = t > 0 ? (v / t) * 100 : 0;
                          return (
                            <td key={i} className="py-2 text-center">
                              <span className={`font-bold ${p >= 80 ? 'text-emerald-600' : p >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {t > 0 ? p.toFixed(1) : '-'}
                              </span>
                            </td>
                          );
                        })}
                        {Array.from({ length: maxCols - r.cols }).map((_, i) => (
                          <td key={i} className="py-2 text-center text-slate-200">-</td>
                        ))}
                        <td className="py-2 text-right font-black text-emerald-700">{overallPct.toFixed(1)}%</td>
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
  };

  const renderProblemsSummary = () => {
    if (problemsSummary.length === 0) return null;
    const yearForCriteria = selectedYear === 'all' ? '2557' : selectedYear;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 break-inside-avoid">
        <div className="px-6 py-4 border-b border-slate-100" style={{ backgroundColor: '#fef2f2' }}>
          <h3 className="text-sm font-black text-red-800">1. เกณฑ์ ตั้งค่าเกณฑ์การประเมิน {yearForCriteria} (แสดงเฉพาะตัวข้อที่ note คะแนน 0)</h3>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">สรุปปัญหาที่พบจากการประเมิน</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest border-b border-slate-200">
                <th className="px-6 py-3 text-left w-1/2">เกณฑ์</th>
                <th className="px-6 py-3 text-center w-40">ความที่</th>
                <th className="px-6 py-3 text-left">ข้อความที่ note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {problemsSummary.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-1">
                      <span className="text-red-600 font-black">หัวข้อที่ {item.rowId} ข้อที่ {item.colIdx + 1}</span>
                      <p className="text-slate-600 leading-relaxed">{item.criteriaText}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center align-top font-black text-slate-700">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600">
                      {item.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <ul className="list-disc list-inside space-y-1 text-slate-500">
                      {Array.from(item.notes).map((note, nIdx) => (
                        <li key={nIdx}>{note}</li>
                      ))}
                      {item.notes.size === 0 && <span className="text-slate-300 italic">ไม่มีบันทึกข้อความ</span>}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-600" />
            รายงานสรุปผลการประเมิน (Detailed Report)
          </h2>
          <p className="text-sm text-slate-500 font-medium">สรุปคะแนนแยกตามหัวข้อและแผนกแบบละเอียด</p>
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
              setSelectedRound('all');
            }}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
          >
            <option value="all">ทุกปีงบประมาณ</option>
            {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <FileBarChart className="w-4 h-4 text-slate-400" />
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
            value={selectedDoctor} 
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent max-w-[200px]"
          >
            <option value="all">แพทย์ทุกคน</option>
            {doctors.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setReportType('OPD')}
            className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${reportType === 'OPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            OPD
          </button>
          <button 
            onClick={() => setReportType('IPD')}
            className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${reportType === 'IPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            IPD
          </button>
        </div>
      </div>

      <div ref={reportTypeRef} className="space-y-6">
        {/* Overall Matrix */}
        {renderMatrixTable(
        `ภาพรวมการประเมินคุณภาพการบันทึกเวชระเบียน (${reportType})`, 
        overallMatrix, 
        `รอบ: ${selectedRound === 'all' ? 'ทุกรอบ' : selectedRound} | แพทย์: ${selectedDoctor === 'all' ? 'ทุกคน' : selectedDoctor} | จำนวนเคสที่ประเมินแล้ว: ${overallMatrix.totalCases} ฉบับ`
      )}

      {/* Departmental Matrices */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 print:hidden">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">แยกตามแผนก/วอร์ด</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {departments.map(dept => (
          <div key={dept}>
            {renderMatrixTable(
              `สรุปคะแนนแผนก: ${dept} (${reportType})`, 
              deptMatrices[dept],
              `จำนวนเคส: ${deptMatrices[dept].totalCases} ฉบับ`
            )}
          </div>
        ))}
      </div>

      {/* Problems Summary Section */}
      <div className="mt-12">
        <div className="flex items-center gap-4 print:hidden mb-6">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สรุปปัญหาที่พบ</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        {renderProblemsSummary()}
      </div>
    </div>
  </div>
);
}
