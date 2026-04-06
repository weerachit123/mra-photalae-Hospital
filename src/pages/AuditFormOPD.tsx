import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getOPDCriteria } from './EditCriteria';
import { Save, ArrowLeft, Info, Check, X, Minus, MessageSquare, Plus } from 'lucide-react';

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
      const saved = localStorage.getItem(`mra_reasons_${criteriaKey}`);
      setReasons(saved ? JSON.parse(saved) : []);
    }
  }, [isOpen, criteriaKey]);

  const handleSave = (reason: string) => {
    if (!reason.trim()) return;
    
    // Save to reusable list if it's a new reason
    const updatedReasons = Array.from(new Set([...reasons, reason.trim()]));
    localStorage.setItem(`mra_reasons_${criteriaKey}`, JSON.stringify(updatedReasons));
    
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

const ROWS = [
  { id: '1', name: "Patient's Profile", cols: ['1','1','1','1','1','1','1'] },
  { id: '2', name: "History (1st visit)", cols: ['1','1','1','1','1','1','1'] },
  { id: '3', name: "Physical examination", cols: ['1','1','1','1','1','1','1'] },
  { id: '4', name: "Treatment/Investigation", cols: ['1','1','1','1','1','1','1'] },
  { id: '5_1', name: "Follow up ครั้งที่ 1", cols: ['1','1','1','1','1','-','-'], isSub: true },
  { id: '5_2', name: "Follow up ครั้งที่ 2", cols: ['1','1','1','1','1','-','-'], isSub: true },
  { id: '5_3', name: "Follow up ครั้งที่ 3", cols: ['1','1','1','1','1','-','-'], isSub: true },
  { id: '6', name: "Operative note", cols: ['1','1','1','1','1','-','-'] },
  { id: '7', name: "Informed consent", cols: ['1','1','1','1','1','-','-'] },
  { id: '8', name: "Rehabilitation record *", cols: ['1','1','1','1','1','-','-'] },
];

export default function AuditFormOPD() {
  const { hn } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const caseData = location.state || {};

  const [scores, setScores] = useState<Record<string, string>>({});
  const [reasons, setCaseReasons] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [overallFinding, setOverallFinding] = useState<string>('');
  const [overallFindingText, setOverallFindingText] = useState<string>('');
  const [hoveredCriteria, setHoveredCriteria] = useState<string | null>(null);
  const [opdCriteria, setOpdCriteria] = useState<Record<string, string[]>>({});

  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; key: string; name: string } | null>(null);

  useEffect(() => {
    setOpdCriteria(getOPDCriteria());
    
    // Fetch current worksheet state from API
    const fetchWorksheet = async () => {
      const searchParams = new URLSearchParams(location.search);
      const wsId = searchParams.get('wsId');
      if (!wsId) return;

      try {
        const response = await fetch(`/api/mra/worksheets/${wsId}`);
        const data = await response.json();
        if (data.success) {
          const currentCase = data.data.cases.find((c: any) => c.hn === hn);
          if (currentCase && currentCase.status === 'audited') {
            if (currentCase.scores) setScores(currentCase.scores);
            if (currentCase.reasons) setCaseReasons(currentCase.reasons);
            if (currentCase.remarks) setRemarks(currentCase.remarks);
            if (currentCase.overallFinding) setOverallFinding(currentCase.overallFinding);
            if (currentCase.overallFindingText) setOverallFindingText(currentCase.overallFindingText);
          }
        }
      } catch (error) {
        console.error('Failed to fetch worksheet for audit:', error);
        // Fallback to location state if API fails
        if (caseData) {
          if (caseData.scores) setScores(caseData.scores);
          if (caseData.reasons) setCaseReasons(caseData.reasons);
          if (caseData.remarks) setRemarks(caseData.remarks);
          if (caseData.overallFinding) setOverallFinding(caseData.overallFinding);
          if (caseData.overallFindingText) setOverallFindingText(caseData.overallFindingText);
        }
      }
    };

    fetchWorksheet();
  }, [hn, location.search]);

  const toggleScore = (rowId: string, colIdx: number | string, defaultVal: string) => {
    if (defaultVal === '-') return; // Disabled
    
    const key = `${rowId}_${colIdx}`;
    const current = scores[key] || defaultVal;
    
    // Toggle logic: 1 -> 0 -> N -> 1
    let next = '1';
    if (current === '1') {
      next = '0';
      // Trigger reason modal for score 0
      const row = ROWS.find(r => r.id === rowId);
      setModalConfig({
        isOpen: true,
        key: `${rowId}_${colIdx}`,
        name: `${row?.name} (ข้อ ${Number(colIdx) + 1})`
      });
    }
    else if (current === '0') next = 'N';
    else if (current === 'N') next = '1';

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

  const { totalFull, totalEarned } = useMemo(() => {
    let tf = 0;
    let te = 0;
    ROWS.forEach(row => {
      const isNA = getScore(row.id, 'NA', 'N') === '1';
      const isMiss = getScore(row.id, 'M', 'M') === '1';
      if (!isNA) {
        row.cols.forEach((col, colIdx) => {
          if (col !== '-') {
            const score = getScore(row.id, colIdx, col);
            if (isMiss) {
              tf += 1;
            } else {
              if (score === '1') {
                tf += 1;
                te += 1;
              } else if (score === '0') {
                tf += 1;
              }
            }
          }
        });
      }
    });
    return { totalFull: tf, totalEarned: te };
  }, [scores]);

  const totalPct = totalFull > 0 ? ((totalEarned / totalFull) * 100).toFixed(2) : '0.00';

  const handleSave = async () => {
    const searchParams = new URLSearchParams(location.search);
    const wsId = searchParams.get('wsId');

    if (!wsId) return;

    const auditData = {
      hn,
      status: 'audited',
      scores,
      reasons,
      remarks,
      overallFinding,
      overallFindingText
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
          const caseIndex = worksheets[wsIndex].cases.findIndex((c: any) => c.hn === hn);
          if (caseIndex >= 0) {
            worksheets[wsIndex].cases[caseIndex].status = 'audited';
            worksheets[wsIndex].cases[caseIndex].scores = scores;
            worksheets[wsIndex].cases[caseIndex].reasons = reasons;
            worksheets[wsIndex].cases[caseIndex].remarks = remarks;
            worksheets[wsIndex].cases[caseIndex].overallFinding = overallFinding;
            worksheets[wsIndex].cases[caseIndex].overallFindingText = overallFindingText;
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
                แบบบันทึกตรวจประเมินเวชระเบียนผู้ป่วยนอก/ฉุกเฉิน
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                HN: <span className="text-slate-800 font-bold">{hn}</span> | Visit: <span className="text-slate-800 font-bold">{caseData.vstdate}</span>
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
          {/* Header Info Grid - More Compact */}
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
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ประเภทเคส</label>
              <div className="flex gap-1.5 mt-0.5">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="case_type" className="w-3 h-3 accent-emerald-500" defaultChecked />
                  <span className="text-[10px] font-bold text-slate-600">General</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="case_type" className="w-3 h-3 accent-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-600">Chronic</span>
                </label>
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

          {/* Audit Table - Compact */}
          <div className="mb-4 overflow-hidden border border-pink-200 rounded-xl shadow-sm">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr className="bg-[#e91e63] text-white">
                  <th className="px-2 py-2 font-bold uppercase tracking-tighter w-8 border border-pink-700">No</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-tighter border border-pink-700">Contents</th>
                  <th className="px-1 py-2 font-bold uppercase tracking-tighter w-10 border border-pink-700">NA</th>
                  <th className="px-1 py-2 font-bold uppercase tracking-tighter w-10 border border-pink-700">M</th>
                  {[1,2,3,4,5,6,7].map(i => (
                    <th key={i} className="px-1 py-2 font-bold uppercase tracking-tighter w-10 border border-pink-700">เกณฑ์<br/>ข้อ {i}</th>
                  ))}
                  <th className="px-2 py-2 font-bold uppercase tracking-tighter w-12 border border-pink-700">เพิ่ม<br/>คะแนน</th>
                  <th className="px-2 py-2 font-bold uppercase tracking-tighter w-12 border border-pink-700">หัก<br/>คะแนน</th>
                  <th className="px-2 py-2 font-bold uppercase tracking-tighter w-12 border border-pink-700">คะแนน<br/>เต็ม</th>
                  <th className="px-2 py-2 font-bold uppercase tracking-tighter w-12 border border-pink-700">คะแนน<br/>ที่ได้</th>
                  <th className="px-2 py-2 font-bold uppercase tracking-tighter w-24 border border-pink-700">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROWS.map((row, idx) => {
                  const isNA = getScore(row.id, 'NA', 'N') === '1';
                  const isMiss = getScore(row.id, 'M', 'M') === '1';
                  
                  let full = 0;
                  let earned = 0;

                  if (!isNA) {
                    row.cols.forEach((col, colIdx) => {
                      if (col !== '-') {
                        const score = getScore(row.id, colIdx, col);
                        if (isMiss) {
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
                  }
                  
                  let rowBgClass = 'bg-white';
                  if (isNA) rowBgClass = 'bg-slate-100';
                  else if (isMiss) rowBgClass = 'bg-red-50';

                  return (
                    <tr key={row.id} className={`group transition-colors ${rowBgClass} ${!isNA && !isMiss ? 'hover:bg-slate-50' : ''}`}>
                      <td className="px-2 py-2 font-bold text-slate-400 border border-slate-200">{!row.isSub ? row.id : ''}</td>
                      <td className={`px-3 py-2 text-left font-bold text-slate-700 border border-slate-200 ${row.isSub ? 'pl-6 text-slate-500 font-semibold italic' : ''}`}>
                        {row.name}
                      </td>
                      <td className="px-1 py-2 border border-slate-200">
                        <div className="flex justify-center">
                          <button 
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all active:scale-90 ${
                              isNA 
                                ? 'bg-slate-500 border-slate-500 text-white' 
                                : 'bg-white border-slate-200 text-slate-300 hover:border-slate-400'
                            }`}
                            onClick={() => toggleScore(row.id, 'NA', 'N')}
                          >
                            {isNA ? <Check className="w-3 h-3" /> : <Minus className="w-2 h-2" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-2 border border-slate-200">
                        <div className="flex justify-center">
                          <button 
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all active:scale-90 ${
                              isMiss 
                                ? 'bg-red-500 border-red-500 text-white' 
                                : 'bg-white border-slate-200 text-slate-300 hover:border-red-400'
                            }`}
                            onClick={() => toggleScore(row.id, 'M', 'M')}
                          >
                            {isMiss ? <Check className="w-3 h-3" /> : <Minus className="w-2 h-2" />}
                          </button>
                        </div>
                      </td>
                      {row.cols.map((col, colIdx) => {
                        const score = getScore(row.id, colIdx, col);
                        const isOne = score === '1';
                        const isZero = score === '0';
                        const isN = score === 'N';
                        const isDisabled = col === '-' || isNA || isMiss;

                        return (
                          <td key={colIdx} className={`px-1 py-2 border border-slate-200 ${col === '-' ? 'bg-pink-100' : ''}`}>
                            {col !== '-' && (
                              <div className="flex justify-center">
                                <button 
                                  className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold transition-all active:scale-90 ${
                                    isDisabled 
                                      ? 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed' 
                                      : isOne 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : isZero
                                          ? 'bg-red-500 border-red-500 text-white'
                                          : isN
                                            ? 'bg-slate-400 border-slate-400 text-white'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300'
                                  }`}
                                  onClick={() => toggleScore(row.id, colIdx, col)}
                                  onMouseEnter={() => !isDisabled && opdCriteria[row.id]?.[colIdx] ? setHoveredCriteria(opdCriteria[row.id][colIdx]) : null}
                                  onMouseLeave={() => setHoveredCriteria(null)}
                                  disabled={isDisabled}
                                  title={reasons[`${row.id}_${colIdx}`] ? `เหตุผล: ${reasons[`${row.id}_${colIdx}`]}` : ''}
                                >
                                  {isNA || isMiss ? '-' : score}
                                  {isZero && reasons[`${row.id}_${colIdx}`] && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 border border-slate-200 bg-pink-100"></td>
                      <td className="px-2 py-2 border border-slate-200 bg-pink-100"></td>
                      <td className="px-2 py-2 border border-slate-200 text-center font-bold text-slate-700">{full}</td>
                      <td className="px-2 py-2 border border-slate-200 text-center font-bold text-blue-600">{earned}</td>
                      <td className="px-2 py-2 border border-slate-200">
                        <input 
                          type="text" 
                          className="w-full text-[10px] p-1 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                          value={remarks[row.id] || ''}
                          onChange={(e) => setRemarks(prev => ({ ...prev, [row.id]: e.target.value }))}
                          placeholder="หมายเหตุ..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-xs">
                <tr>
                  <td colSpan={13} className="px-3 py-2 text-right border border-slate-200 text-slate-600">
                    Full score รวม
                  </td>
                  <td className="px-2 py-2 text-center border border-slate-200 text-slate-700">{totalFull}</td>
                  <td colSpan={2} className="px-3 py-2 text-left border border-slate-200 text-slate-500 font-normal">
                    คะแนน (ไม่น้อยกว่า 19 คะแนน สำหรับผู้ป่วยนอกทั่วไป /ฉุกเฉิน: General case)
                  </td>
                </tr>
                <tr>
                  <td colSpan={13} className="px-3 py-2 text-right border border-slate-200 text-slate-600">
                    Sum score รวม
                  </td>
                  <td className="px-2 py-2 text-center border border-slate-200 text-blue-600">{totalEarned}</td>
                  <td colSpan={2} className="px-3 py-2 text-left border border-slate-200 text-slate-500 font-normal">
                    คะแนน (ไม่น้อยกว่า 24 คะแนน สำหรับผู้ป่วยนอกโรคเรื้อรัง : Chronic case ที่มีการตรวจ follow up อย่างน้อย 1 ครั้ง)
                  </td>
                </tr>
                <tr>
                  <td colSpan={13} className="px-3 py-2 text-right border border-slate-200 text-slate-600">
                    คิดเป็นร้อยละ
                  </td>
                  <td className="px-2 py-2 text-center border border-slate-200 text-emerald-600">{totalPct}%</td>
                  <td colSpan={2} className="border border-slate-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Overall Findings */}
          <div className="mb-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
            <h4 className="font-bold text-slate-700 mb-3 text-sm">Overall finding (เลือกเพียง 1 ข้อ)</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="overall_finding" 
                  className="w-4 h-4 accent-emerald-500" 
                  checked={overallFinding === 'inadequate'}
                  onChange={() => setOverallFinding('inadequate')}
                />
                <span className="text-xs font-medium text-slate-600">Documentation inadequate for meaningful review (ข้อมูลไม่เพียงพอสำหรับการทบทวน)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="overall_finding" 
                  className="w-4 h-4 accent-emerald-500" 
                  checked={overallFinding === 'no_issue'}
                  onChange={() => setOverallFinding('no_issue')}
                />
                <span className="text-xs font-medium text-slate-600">No significant medical record issue identified (ไม่มีปัญหาสำคัญจากการทบทวน)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="overall_finding" 
                  className="w-4 h-4 accent-emerald-500" 
                  checked={overallFinding === 'issues_found'}
                  onChange={() => setOverallFinding('issues_found')}
                />
                <span className="text-xs font-medium text-slate-600">Certain issues in question specify (มีปัญหาจากการทบทวนที่ต้องค้นต่อ ระบุ)</span>
                <input 
                  type="text" 
                  className="flex-1 ml-2 border-b border-slate-300 bg-transparent focus:outline-none focus:border-emerald-500 text-xs px-2 py-1 disabled:opacity-50" 
                  disabled={overallFinding !== 'issues_found'}
                  value={overallFindingText}
                  onChange={(e) => setOverallFindingText(e.target.value)}
                />
              </label>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
              <p><span className="font-bold">คำอธิบาย:</span></p>
              <p>NA ไม่จำเป็นต้องมีบันทึก สำหรับการ Visit ครั้งนั้น</p>
              <p>Missing (M) ไม่มีเอกสารให้ตรวจสอบ เวชระเบียนไม่ครบ หรือหายไปบางส่วน</p>
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
