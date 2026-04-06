import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, FileSpreadsheet, FileText, Calendar, Users, 
  ChevronDown, ChevronUp, LayoutDashboard, FileBarChart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Criteria Definitions (must match audit forms)
const OPD_ROWS = [
  { id: '1', name: "Patient's Profile", cols: 7 },
  { id: '2', name: "History (1st visit)", cols: 7 },
  { id: '3', name: "Physical examination", cols: 7 },
  { id: '4', name: "Treatment/Investigation", cols: 7 },
  { id: '5_1', name: "Follow up ครั้งที่ 1", cols: 5 },
  { id: '5_2', name: "Follow up ครั้งที่ 2", cols: 5 },
  { id: '5_3', name: "Follow up ครั้งที่ 3", cols: 5 },
  { id: '6', name: "Operative note", cols: 5 },
  { id: '7', name: "Informed consent", cols: 5 },
  { id: '8', name: "Rehabilitation record", cols: 5 },
];

const IPD_ROWS = [
  { id: '1', name: "Discharge summary : Dx, Op", cols: 9 },
  { id: '2', name: "Discharge summary : Other", cols: 7 },
  { id: '3', name: "Informed consent", cols: 8 },
  { id: '4', name: "History", cols: 9 },
  { id: '5', name: "Physical examination", cols: 9 },
  { id: '6', name: "Progress note", cols: 6 },
  { id: '7', name: "Consultation record", cols: 9 },
  { id: '8', name: "Anaesthetic record", cols: 9 },
  { id: '9', name: "Operative note", cols: 9 },
  { id: '10', name: "Labour record", cols: 9 },
  { id: '11', name: "Rehabilitation record", cols: 9 },
  { id: '12', name: "Nurses' note helpful", cols: 5 },
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

export default function DetailedReport() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [reportType, setReportType] = useState<'OPD' | 'IPD'>('OPD');

  useEffect(() => {
    const saved = localStorage.getItem('mra_worksheets');
    if (saved) {
      setWorksheets(JSON.parse(saved));
    }
  }, []);

  const rounds = useMemo(() => {
    const uniqueRounds = Array.from(new Set(worksheets.map(w => w.name)));
    return uniqueRounds.sort();
  }, [worksheets]);

  const filteredWorksheets = useMemo(() => {
    return worksheets.filter(w => {
      const matchRound = selectedRound === 'all' || w.name === selectedRound;
      const matchType = w.type === reportType;
      return matchRound && matchType;
    });
  }, [worksheets, selectedRound, reportType]);

  const departments = useMemo(() => {
    const uniqueDepts = Array.from(new Set(filteredWorksheets.map(w => w.department)));
    return uniqueDepts.sort();
  }, [filteredWorksheets]);

  const calculateMatrix = (wsList: Worksheet[]) => {
    const rows = reportType === 'OPD' ? OPD_ROWS : IPD_ROWS;
    const maxCols = Math.max(...rows.map(r => r.cols));
    
    const counts: Record<string, number[]> = {};
    const totals: Record<string, number[]> = {};
    let totalCases = 0;

    rows.forEach(r => {
      counts[r.id] = new Array(r.cols).fill(0);
      totals[r.id] = new Array(r.cols).fill(0);
    });

    wsList.forEach(ws => {
      ws.cases.forEach(c => {
        if (c.status === 'audited' && c.scores) {
          totalCases++;
          rows.forEach(r => {
            for (let i = 0; i < r.cols; i++) {
              const val = c.scores?.[`${r.id}_${i}`];
              if (val === '1') {
                counts[r.id][i]++;
                totals[r.id][i]++;
              } else if (val === '0') {
                totals[r.id][i]++;
              }
            }
          });
        }
      });
    });

    return { counts, totals, totalCases, maxCols };
  };

  const overallMatrix = useMemo(() => calculateMatrix(filteredWorksheets), [filteredWorksheets, reportType]);

  const deptMatrices = useMemo(() => {
    const matrices: Record<string, any> = {};
    departments.forEach(dept => {
      matrices[dept] = calculateMatrix(filteredWorksheets.filter(w => w.department === dept));
    });
    return matrices;
  }, [filteredWorksheets, departments, reportType]);

  const handlePrint = () => window.print();

  const handleExcel = () => {
    const rows = reportType === 'OPD' ? OPD_ROWS : IPD_ROWS;
    const wb = XLSX.utils.book_new();

    // Overall Sheet
    const overallData = rows.map(r => {
      const row: any = { 'หัวข้อการประเมิน': r.name };
      for (let i = 0; i < r.cols; i++) {
        row[`ข้อ ${i + 1}`] = overallMatrix.counts[r.id][i];
      }
      const earned = overallMatrix.counts[r.id].reduce((a, b) => a + b, 0);
      const total = overallMatrix.totals[r.id].reduce((a, b) => a + b, 0);
      row['คะแนนเต็ม'] = total;
      row['คะแนนที่ได้'] = earned;
      row['ร้อยละ'] = total > 0 ? ((earned / total) * 100).toFixed(2) : '0.00';
      return row;
    });
    const wsOverall = XLSX.utils.json_to_sheet(overallData);
    XLSX.utils.book_append_sheet(wb, wsOverall, 'ภาพรวม');

    // Dept Sheets
    departments.forEach(dept => {
      const m = deptMatrices[dept];
      const deptData = rows.map(r => {
        const row: any = { 'หัวข้อการประเมิน': r.name };
        for (let i = 0; i < r.cols; i++) {
          row[`ข้อ ${i + 1}`] = m.counts[r.id][i];
        }
        const earned = m.counts[r.id].reduce((a, b) => a + b, 0);
        const total = m.totals[r.id].reduce((a, b) => a + b, 0);
        row['คะแนนเต็ม'] = total;
        row['คะแนนที่ได้'] = earned;
        row['ร้อยละ'] = total > 0 ? ((earned / total) * 100).toFixed(2) : '0.00';
        return row;
      });
      const wsDept = XLSX.utils.json_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, wsDept, dept);
    });

    XLSX.writeFile(wb, `MRA_Detailed_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const rows = reportType === 'OPD' ? OPD_ROWS : IPD_ROWS;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Medical Record Audit Detailed Report (${reportType})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Round: ${selectedRound}`, 14, 22);

    const headers = ['Criteria', ...Array.from({ length: overallMatrix.maxCols }, (_, i) => `Item ${i + 1}`), 'Full', 'Earned', '%'];
    const body = rows.map(r => [
      r.name,
      ...overallMatrix.counts[r.id].map(v => v.toString()),
      ...new Array(overallMatrix.maxCols - r.cols).fill('-'),
      overallMatrix.totals[r.id].reduce((a, b) => a + b, 0).toString(),
      overallMatrix.counts[r.id].reduce((a, b) => a + b, 0).toString(),
      (overallMatrix.totals[r.id].reduce((a, b) => a + b, 0) > 0 
        ? (overallMatrix.counts[r.id].reduce((a, b) => a + b, 0) / overallMatrix.totals[r.id].reduce((a, b) => a + b, 0) * 100).toFixed(1) 
        : '0.0') + '%'
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [headers],
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`MRA_Detailed_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const renderMatrixTable = (title: string, matrix: any, subTitle?: string) => {
    const rows = reportType === 'OPD' ? OPD_ROWS : IPD_ROWS;
    const { counts, totals, totalCases, maxCols } = matrix;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 break-inside-avoid">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-800">{title}</h3>
          {subTitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subTitle}</p>}
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-100">
            {/* Counts Table */}
            <div className="p-4">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">จำนวนเวชระเบียนที่ผ่านเกณฑ์ (เคส)</p>
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
                    const earned = counts[r.id].reduce((a: number, b: number) => a + b, 0);
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
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3">ร้อยละเวชระเบียนที่ผ่านเกณฑ์ (%)</p>
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
                    const earned = counts[r.id].reduce((a: number, b: number) => a + b, 0);
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
            value={selectedRound} 
            onChange={(e) => setSelectedRound(e.target.value)}
            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
          >
            <option value="all">ทุกรอบการประเมิน</option>
            {rounds.map(r => <option key={r} value={r}>{r}</option>)}
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

      {/* Overall Matrix */}
      {renderMatrixTable(
        `ภาพรวมการประเมินคุณภาพการบันทึกเวชระเบียน (${reportType})`, 
        overallMatrix, 
        `รอบ: ${selectedRound === 'all' ? 'ทุกรอบ' : selectedRound} | จำนวนเคสที่ประเมินแล้ว: ${overallMatrix.totalCases} ฉบับ`
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
    </div>
  );
}
