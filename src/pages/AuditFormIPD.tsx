import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getIPDCriteria } from './EditCriteria';
import { Save, ArrowLeft, Info, Check, X, Minus, MessageSquare, Plus } from 'lucide-react';
import dayjs from 'dayjs';

// --- Reason Modal Component ---
interface ReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reason: string) => void;
  criteriaKey: string;
  criteriaName: string;
}

function ReasonModal({ isOpen, onClose, onSave, criteriaKey, criteriaName }: ReasonModalProps) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`mra_reasons_ipd_${criteriaKey}`);
      setReasons(saved ? JSON.parse(saved) : []);
    }
  }, [isOpen, criteriaKey]);

  const handleSave = (reason: string) => {
    if (!reason.trim()) return;
    
    const updatedReasons = Array.from(new Set([...reasons, reason.trim()]));
    localStorage.setItem(`mra_reasons_ipd_${criteriaKey}`, JSON.stringify(updatedReasons));
    
    onSave(reason.trim());
    setNewReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-red-500" />
            ระบุเหตุผลที่ให้ 0 คะแนน
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">หัวข้อ: {criteriaName}</div>
          
          {reasons.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">เลือกจากเหตุผลที่เคยบันทึก:</label>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {reasons.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSave(r)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-100 hover:border-red-200 hover:bg-red-50 text-slate-600 transition-all"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">พิมพ์เหตุผลใหม่:</label>
            <textarea
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="ระบุเหตุผล..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 min-h-[100px] transition-all"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">ยกเลิก</button>
          <button
            onClick={() => handleSave(newReason)}
            disabled={!newReason.trim()}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            บันทึกเหตุผล
          </button>
        </div>
      </div>
    </div>
  );
}

const ROWS_2557 = [
  { id: '1', name: "Discharge summary : Dx., OP.", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '2', name: "Discharge summary : Other", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '3', name: "Informed consent", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '4', name: "History", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '5', name: "Physical exam", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '6', name: "Progress note", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '7', name: "Consultation record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '8', name: "Anesthetic record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '9', name: "Operative note", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '10', name: "Labour record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '11', name: "Rehabilitation record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '12', name: "Nurses' note helpful", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: false },
];

const ROWS_2563 = [
  { id: '1', name: "Discharge summary : Dx., OP.", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '2', name: "Discharge summary : Other", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true, blockedCols: [7, 8] },
  { id: '3', name: "Informed consent", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '4', name: "History", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '5', name: "Physical exam", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '6', name: "Progress note", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: true },
  { id: '7', name: "Consultation record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '8', name: "Anesthetic record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '9', name: "Operative note*", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '10', name: "Labour record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '11', name: "Rehabilitation record", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: false, deductBlocked: true },
  { id: '12', name: "Nurses' note", cols: ['1','1','1','1','1','1','1','1','1'], naBlocked: true, deductBlocked: false },
];

export default function AuditFormIPD() {
  const { an } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const caseData = location.state || {};
  const criteriaYear = caseData.criteria_year || '2557';
  const ROWS = criteriaYear === '2563' ? ROWS_2563 : ROWS_2557;
  const minScore = criteriaYear === '2563' ? 57 : 63;

  const [scores, setScores] = useState<Record<string, string>>({});
  const [reasons, setCaseReasons] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [hoveredCriteria, setHoveredCriteria] = useState<string | null>(null);
  const [ipdCriteria, setIpdCriteria] = useState<Record<string, string[]>>({});

  // Overall Findings State
  const [overallFindings, setOverallFindings] = useState({
    sortingStandard: false,
    missingInfo: false,
    meaningfulReview: false,
    noSignificantIssue: false,
    certainIssues: false,
    certainIssuesText: ''
  });

  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; key: string; name: string } | null>(null);

  useEffect(() => {
    setIpdCriteria(getIPDCriteria(criteriaYear));

    // Check permission
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    if (!user) {
      navigate('/');
      return;
    }
    const isAdmin = user.role === 'admin' || user.loginname === '0176' || user.loginname === '0382';

    // Fetch current worksheet state from API
    const fetchWorksheet = async () => {
      const searchParams = new URLSearchParams(location.search);
      const wsId = searchParams.get('wsId');
      if (!wsId) return;

      try {
        const response = await fetch(`/api/mra/worksheets/${wsId}`);
        const data = await response.json();
        if (data.success) {
          const worksheet = data.data;
          
          // Permission check: Admins see all, others see only their department's worksheets
          if (!isAdmin) {
            const hasAccess = worksheet.department.includes(user.department) || user.department.includes(worksheet.department);
            if (!hasAccess) {
              alert('คุณไม่มีสิทธิ์เข้าถึงใบงานของแผนกนี้');
              navigate('/dashboard/worksheets');
              return;
            }
          }

          const currentCase = worksheet.cases.find((c: any) => c.an === an);
          if (currentCase && currentCase.status === 'audited') {
            if (currentCase.scores) setScores(currentCase.scores);
            if (currentCase.reasons) setCaseReasons(currentCase.reasons);
            if (currentCase.remarks) setRemarks(currentCase.remarks);
            if (currentCase.overallFindings) setOverallFindings(currentCase.overallFindings);
          }
        }
      } catch (error) {
        console.error('Failed to fetch worksheet for audit:', error);
        // Fallback to location state if API fails
        if (caseData) {
          if (caseData.scores) setScores(caseData.scores);
          if (caseData.reasons) setCaseReasons(caseData.reasons);
          if (caseData.remarks) setRemarks(caseData.remarks);
          if (caseData.overallFindings) setOverallFindings(caseData.overallFindings);
        }
      }
    };

    fetchWorksheet();
  }, [an, location.search, navigate]);

  const toggleScore = (rowId: string, colIdx: number | string, defaultVal: string) => {
    if (defaultVal === '-') return; // Disabled
    
    const key = `${rowId}_${colIdx}`;
    const current = scores[key] || defaultVal;
    
    // Toggle logic: 1 -> N -> 0 -> 1
    let next = '1';
    if (current === '1') {
      next = 'N';
    }
    else if (current === 'N') {
      next = '0';
      // Trigger reason modal for score 0
      const row = ROWS.find(r => r.id === rowId);
      setModalConfig({
        isOpen: true,
        key: `${rowId}_${colIdx}`,
        name: `${row?.name} (ข้อ ${Number(colIdx) + 1})`
      });
    }
    else if (current === '0') next = '1';

    setScores(prev => ({ ...prev, [key]: next }));
  };

  const handleReasonSave = (reason: string) => {
    if (modalConfig) {
      setCaseReasons(prev => ({ ...prev, [modalConfig.key]: reason }));
    }
  };

  const getScore = (rowId: string, colIdx: number | string, defaultVal: string) => {
    if (defaultVal === '-') return '-';
    return scores[`${rowId}_${colIdx}`] || defaultVal;
  };

  const handleSave = async () => {
    const searchParams = new URLSearchParams(location.search);
    const wsId = searchParams.get('wsId');

    if (!wsId) return;

    const auditData = {
      hn: caseData.hn,
      an,
      status: 'audited',
      scores,
      reasons,
      remarks,
      overallFindings,
      auditor_name: caseData.auditor_name || JSON.parse(localStorage.getItem('user') || '{}').name,
      audit_date: caseData.audit_date || new Date().toISOString()
    };

    try {
      const response = await fetch(`/api/mra/worksheets/${wsId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditData)
      });
      const data = await response.json();
      if (data.success) {
        alert('บันทึกข้อมูลเรียบร้อยแล้ว');
        navigate(-1);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Failed to save audit to DB:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('mra_worksheets');
      if (saved) {
        const worksheets = JSON.parse(saved);
        const wsIndex = worksheets.findIndex((w: any) => w.id === wsId);
        if (wsIndex >= 0) {
          const caseIndex = worksheets[wsIndex].cases.findIndex((c: any) => c.an === an);
          if (caseIndex >= 0) {
            worksheets[wsIndex].cases[caseIndex].status = 'audited';
            worksheets[wsIndex].cases[caseIndex].scores = scores;
            worksheets[wsIndex].cases[caseIndex].reasons = reasons;
            worksheets[wsIndex].cases[caseIndex].remarks = remarks;
            worksheets[wsIndex].cases[caseIndex].overallFindings = overallFindings;
            localStorage.setItem('mra_worksheets', JSON.stringify(worksheets));
          }
        }
      }
      alert('บันทึกข้อมูลเรียบร้อยแล้ว (บันทึกในเครื่อง)');
      navigate(-1);
    }
  };

  return (
    <div className="space-y-4">
      {modalConfig && (
        <ReasonModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig(null)}
          onSave={handleReasonSave}
          criteriaKey={modalConfig.key}
          criteriaName={modalConfig.name}
        />
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => navigate(-1)}
              className="mr-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-95 border border-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                แบบบันทึกตรวจประเมินเวชระเบียนผู้ป่วยใน
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                AN: <span className="text-slate-800 font-bold">{an}</span> | HN: <span className="text-slate-800 font-bold">{caseData.hn}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-md shadow-emerald-100 flex items-center text-sm transition-all active:scale-95"
          >
            <Save className="w-4 h-4 mr-2" />
            บันทึก
          </button>
        </div>

        <div className="p-4">
          {/* Header Info Grid - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">HCODE</label>
              <div className="text-xs font-bold text-slate-700">10670</div>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">แพทย์ผู้ตรวจ</label>
              <div className="text-xs font-bold text-slate-700 truncate">{caseData.doctor_name || '-'}</div>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">วันที่ Admit / Discharge</label>
              <div className="text-[10px] font-bold text-slate-700 truncate">
                {dayjs(caseData.regdate).format('DD/MM/YYYY')} - {dayjs(caseData.dchdate).format('DD/MM/YYYY')}
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">วันที่ประเมิน</label>
              <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          {/* Criteria Description Zone - Smaller */}
          <div className="mb-4 min-h-[60px] p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-800 text-center shadow-sm">
            {hoveredCriteria ? (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs font-bold leading-tight">{hoveredCriteria}</p>
              </div>
            ) : (
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest italic">ชี้ที่ปุ่มเพื่อดูเกณฑ์การประเมิน</p>
            )}
          </div>

          {/* Audit Table - Updated to match image */}
          <div className="mb-4 overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full border-collapse text-center text-[11px]">
              <thead>
                <tr className="bg-[#e91e63] text-white">
                  <th className="px-2 py-2 text-left font-bold border-r border-white/20 min-w-[150px]">Content of medical record</th>
                  <th className="px-1 py-2 font-bold border-r border-white/20 w-8">NA</th>
                  <th className="px-1 py-2 font-bold border-r border-white/20 w-10">Missing</th>
                  <th className="px-1 py-2 font-bold border-r border-white/20 w-8">No</th>
                  {[1,2,3,4,5,6,7,8,9].map(i => (
                    <th key={i} className="px-1 py-2 font-bold border-r border-white/20 w-8">เกณฑ์ ข้อ {i}</th>
                  ))}
                  <th className="px-1 py-2 font-bold border-r border-white/20 w-10">หัก<br/>คะแนน</th>
                  <th className="px-1 py-2 font-bold border-r border-white/20 w-16">รวม<br/>คะแนน</th>
                  <th className="px-2 py-2 font-bold w-24">หมาย เหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROWS.map((row) => {
                  const isNA = !row.naBlocked && getScore(row.id, 'NA', 'N') === '1';
                  const isMissing = getScore(row.id, 'M', 'M') === '1';
                  const isNo = getScore(row.id, 'O', 'O') === '1';
                  
                  let rowBgClass = 'bg-white';
                  if (isNA) rowBgClass = 'bg-slate-50';
                  else if (isMissing) rowBgClass = 'bg-red-50/30';
                  else if (isNo) rowBgClass = 'bg-amber-50/30';

                  // Scoring Logic
                  let full = 0;
                  let earned = 0;
                  
                  if (!isNA) {
                    row.cols.forEach((col, colIdx) => {
                      if (col !== '-') {
                        const score = getScore(row.id, colIdx, col);
                        if (isMissing || isNo) {
                          full += 1;
                        } else {
                          if (score === '1') {
                            full += 1;
                            earned += 1;
                          } else if (score === '0') {
                            full += 1;
                          }
                        }
                      }
                    });
                    // Subtract Deduct from row earned score
                    const deduct = scores[`${row.id}_deduct`] === '1' ? 1 : 0;
                    earned -= deduct;
                  }

                  return (
                    <tr key={row.id} className={`group transition-colors ${rowBgClass} hover:bg-slate-50/50`}>
                      <td className="px-2 py-1.5 text-left font-medium text-slate-700 border-r border-slate-100">
                        {row.id}. {row.name}
                      </td>
                      <td className="px-0.5 py-1.5 border-r border-slate-100">
                        {row.naBlocked ? (
                          <div className="w-5 h-5 mx-auto rounded bg-pink-400/40 border border-pink-500/30"></div>
                        ) : (
                          <button 
                            className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-all ${
                              isNA ? 'bg-slate-400 border-slate-400 text-white' : 'bg-white border-slate-200 text-slate-200'
                            }`}
                            onClick={() => toggleScore(row.id, 'NA', 'N')}
                          >
                            {isNA && <Check className="w-3 h-3" />}
                          </button>
                        )}
                      </td>
                      <td className="px-0.5 py-1.5 border-r border-slate-100">
                        <button 
                          className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-all ${
                            isMissing ? 'bg-red-400 border-red-400 text-white' : 'bg-white border-slate-200 text-slate-200'
                          }`}
                          onClick={() => toggleScore(row.id, 'M', 'M')}
                        >
                          {isMissing && <Check className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="px-0.5 py-1.5 border-r border-slate-100">
                        <button 
                          className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-all ${
                            isNo ? 'bg-amber-400 border-amber-400 text-white' : 'bg-white border-slate-200 text-slate-200'
                          }`}
                          onClick={() => toggleScore(row.id, 'O', 'O')}
                        >
                          {isNo && <Check className="w-3 h-3" />}
                        </button>
                      </td>
                      {row.cols.map((col, colIdx) => {
                        const score = getScore(row.id, colIdx, col);
                        const isOne = score === '1';
                        const isZero = score === '0';
                        const isN = score === 'N';
                        const isBlocked = (row as any).blockedCols?.includes(colIdx);
                        const isDisabled = col === '-' || isNA || isMissing || isNo || isBlocked;

                        return (
                          <td key={colIdx} className={`px-0.5 py-1.5 border-r border-slate-100 ${isBlocked ? 'bg-pink-400/40' : ''}`}>
                            {!isBlocked && (
                              <button 
                                className={`w-6 h-6 mx-auto rounded-md border flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isDisabled 
                                    ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed' 
                                    : isOne 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                                      : isZero
                                        ? 'bg-red-500 border-red-500 text-white'
                                        : isN
                                          ? 'bg-slate-400 border-slate-400 text-white'
                                          : 'bg-white border-slate-200 text-slate-400'
                                }`}
                                onClick={() => toggleScore(row.id, colIdx, col)}
                                onMouseEnter={() => !isDisabled && ipdCriteria[row.id]?.[colIdx] ? setHoveredCriteria(ipdCriteria[row.id][colIdx]) : null}
                                onMouseLeave={() => setHoveredCriteria(null)}
                                disabled={isDisabled}
                              >
                                {isNA ? '-' : (score === 'N' ? 'NA' : score)}
                                {isZero && reasons[`${row.id}_${colIdx}`] && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className={`px-1 py-1.5 border-r border-slate-100 ${row.deductBlocked ? 'bg-pink-400/40' : ''}`}>
                        {!row.deductBlocked && !isNA && (
                          <div className="flex justify-center">
                            <button 
                              className={`w-7 h-7 rounded-md border text-center text-[10px] font-bold transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-400/50 ${
                                scores[`${row.id}_deduct`] === '1' 
                                  ? 'bg-red-500 border-red-500 text-white' 
                                  : 'bg-white border-slate-300 text-slate-700 hover:border-red-300'
                              }`}
                              onClick={() => setScores(prev => ({ ...prev, [`${row.id}_deduct`]: prev[`${row.id}_deduct`] === '1' ? '' : '1' }))}
                            >
                              {scores[`${row.id}_deduct`] || ''}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-1.5 border-r border-slate-100 font-bold text-blue-600">
                        {isNA ? '-' : `${earned}/${full}`}
                      </td>
                      <td className="px-1 py-1.5">
                        <input 
                          type="text" 
                          className="w-full bg-transparent text-[10px] focus:outline-none border-b border-transparent focus:border-slate-300"
                          placeholder="หมายเหตุ..."
                          value={remarks[row.id] || ''}
                          onChange={(e) => setRemarks(prev => ({ ...prev, [row.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Summary - Updated to match image */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span>Full score รวม:</span>
                <span className="text-slate-900 underline decoration-dotted">
                  {(() => {
                    let tf = 0;
                    ROWS.forEach(row => {
                      const isRowNA = !row.naBlocked && getScore(row.id, 'NA', 'N') === '1';
                      if (!isRowNA) {
                        row.cols.forEach((col, colIdx) => {
                          if (col !== '-') {
                            const score = getScore(row.id, colIdx, col);
                            if (score !== 'N') tf++;
                          }
                        });
                      }
                    });
                    return tf;
                  })()}
                </span>
                <span className="text-xs text-slate-500 font-normal">(ต้องไม่น้อยกว่า {minScore} คะแนน)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Sum score:</span>
                <span className="text-blue-600 underline decoration-dotted">
                  {(() => {
                    let te = 0;
                    ROWS.forEach(row => {
                      const isRowNA = !row.naBlocked && getScore(row.id, 'NA', 'N') === '1';
                      const isMissing = getScore(row.id, 'M', 'M') === '1';
                      const isNo = getScore(row.id, 'O', 'O') === '1';
                      if (!isRowNA && !isMissing && !isNo) {
                        let rowEarned = 0;
                        row.cols.forEach((col, colIdx) => {
                          if (col !== '-' && getScore(row.id, colIdx, col) === '1') rowEarned++;
                        });
                        const deduct = Number(scores[`${row.id}_deduct`] || 0);
                        te += (rowEarned - deduct);
                      }
                    });
                    return te;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>ร้อยละ:</span>
                <span className="text-emerald-600 underline decoration-dotted">
                  {(() => {
                    let tf = 0;
                    let te = 0;
                    ROWS.forEach(row => {
                      const isRowNA = !row.naBlocked && getScore(row.id, 'NA', 'N') === '1';
                      const isMissing = getScore(row.id, 'M', 'M') === '1';
                      const isNo = getScore(row.id, 'O', 'O') === '1';
                      
                      if (!isRowNA) {
                        let rowFull = 0;
                        let rowEarned = 0;
                        row.cols.forEach((col, colIdx) => {
                          if (col !== '-') {
                            const score = getScore(row.id, colIdx, col);
                            if (score !== 'N') {
                              rowFull++;
                              if (!isMissing && !isNo && score === '1') rowEarned++;
                            }
                          }
                        });
                        tf += rowFull;
                        if (!isMissing && !isNo) {
                          const deduct = Number(scores[`${row.id}_deduct`] || 0);
                          te += (rowEarned - deduct);
                        }
                      }
                    });
                    return tf > 0 ? ((te / tf) * 100).toFixed(2) : '0.00';
                  })()}%
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-[#e91e63] uppercase tracking-widest mb-3">Overall finding</h4>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-[#e91e63] focus:ring-[#e91e63]"
                    checked={overallFindings.sortingStandard}
                    onChange={(e) => setOverallFindings(prev => ({ ...prev, sortingStandard: e.target.checked }))}
                  />
                  <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                    (...) การจัดเรียงเวชระเบียนไม่เป็นไปตามมาตรฐานที่กำหนด
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-[#e91e63] focus:ring-[#e91e63]"
                    checked={overallFindings.missingInfo}
                    onChange={(e) => setOverallFindings(prev => ({ ...prev, missingInfo: e.target.checked }))}
                  />
                  <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                    (...) เอกสารบางแผ่น ไม่มีชื่อผู้รับบริการ, HN, AN ทำให้ไม่สามารถระบุได้ว่า เอกสารแผ่นนี้เป็นของใคร จึงไม่สามารถทบทวนเอกสารแผ่นนั้นได้
                  </span>
                </label>
                
                <div className="pl-7 space-y-2">
                  <p className="text-[10px] font-bold text-red-500">(เลือกเพียง 1 ข้อ)</p>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="overall_finding_select"
                      className="w-4 h-4 border-slate-300 text-[#e91e63] focus:ring-[#e91e63]"
                      checked={overallFindings.meaningfulReview}
                      onChange={() => setOverallFindings(prev => ({ ...prev, meaningfulReview: true, noSignificantIssue: false, certainIssues: false }))}
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors flex-1">
                      (...) Documentation inadequate for meaningful review (ข้อมูลไม่เพียงพอสำหรับการทบทวน)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="overall_finding_select"
                      className="w-4 h-4 border-slate-300 text-[#e91e63] focus:ring-[#e91e63]"
                      checked={overallFindings.noSignificantIssue}
                      onChange={() => setOverallFindings(prev => ({ ...prev, meaningfulReview: false, noSignificantIssue: true, certainIssues: false }))}
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors flex-1">
                      (...) No significant medical record issue identified (ไม่มีปัญหาสำคัญจากการทบทวน)
                    </span>
                  </label>
                  <div className="flex items-center gap-3 group">
                    <input 
                      type="radio" 
                      name="overall_finding_select"
                      className="w-4 h-4 border-slate-300 text-[#e91e63] focus:ring-[#e91e63]"
                      checked={overallFindings.certainIssues}
                      onChange={() => setOverallFindings(prev => ({ ...prev, meaningfulReview: false, noSignificantIssue: false, certainIssues: true }))}
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors whitespace-nowrap">
                        (...) Certain issues in question specify (มีปัญหาจากการทบทวนที่ต้องค้นต่อ ระบุ:
                      </span>
                      <input 
                        type="text" 
                        className="flex-1 bg-transparent border-b border-slate-300 focus:border-[#e91e63] focus:outline-none text-xs"
                        value={overallFindings.certainIssuesText}
                        onChange={(e) => setOverallFindings(prev => ({ ...prev, certainIssuesText: e.target.value }))}
                        disabled={!overallFindings.certainIssues}
                      />
                      <span className="text-xs text-slate-600">)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center text-sm border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Audit by:</span>
                <span className="text-slate-600 border-b border-slate-300 px-4 py-1 min-w-[200px] inline-block">
                  {caseData.auditor_name || JSON.parse(localStorage.getItem('user') || '{}').name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Audit Date:</span>
                <span className="text-slate-600 border-b border-slate-300 px-4 py-1 min-w-[150px] inline-block">
                  {caseData.audit_date ? new Date(caseData.audit_date).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')}
                </span>
              </div>
            </div>
          </div>

          {/* Actions - Compact */}
          <div className="flex justify-center gap-3">
            <button 
              onClick={handleSave} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center text-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              บันทึกข้อมูล
            </button>
            <button 
              onClick={() => navigate(-1)} 
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-8 py-2 rounded-xl font-bold shadow-sm transition-all active:scale-95 flex items-center text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              กลับ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
