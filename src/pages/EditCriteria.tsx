import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_OPD_CRITERIA: Record<string, string[]> = {
  '1': [
    '1. มีข้อมูลผู้ป่วยถูกต้อง ครบถ้วน ได้แก่ ข้อมูลชื่อ นามสกุล เพศ (หรือคำนำหน้าชื่อเช่น นาย นาง….) HN และอายุ หรือวันเดือนปีเกิดของผู้ป่วย กรณีไม่ทราบวันเดือนเกิด อนุโลมให้มีเฉพาะปีพ.ศ.ได้',
    '2. มีข้อมูลที่อยู่ของผู้ป่วยที่สามารถติดต่อได้',
    '3. มีข้อมูลอาชีพของผู้ป่วย',
    '4. มีข้อมูลสิทธิการรักษาพยาบาล',
    '5. มีข้อมูลเลขประจำตัวประชาชน 13 หลัก',
    '6. มีข้อมูลสถานภาพสมรส',
    '7. มีข้อมูลชื่อ-สกุล ของผู้ที่สามารถติดต่อได้ในกรณีฉุกเฉิน พร้อมระบุความสัมพันธ์ และหมายเลขโทรศัพท์',
  ],
  '2': [
    '1. Chief complaint (CC) อาการสำคัญที่ทำให้ผู้ป่วยต้องมารับการตรวจรักษา พร้อมระบุระยะเวลา',
    '2. Present illness (PI) ประวัติการเจ็บป่วยปัจจุบันที่สอดคล้องกับอาการสำคัญ',
    '3. Past history (PH) ประวัติการเจ็บป่วยในอดีต / โรคประจำตัว / ประวัติการผ่าตัด',
    '4. Family history (FH) ประวัติความเจ็บป่วยของบุคคลในครอบครัว (ถ้ามี)',
    '5. ประวัติการแพ้ยา / แพ้อาหาร',
    '6. ประวัติประจำเดือน (ในผู้หญิงวัยเจริญพันธุ์)',
    '7. ประวัติการสูบบุหรี่ / ดื่มสุรา / สารเสพติด',
  ],
  '3': [
    '1. Vital signs (V/S) ครบถ้วน (BP, PR, RR, T)',
    '2. Body weight (BW) / Height (ส่วนสูงในเด็ก)',
    '3. General appearance (GA)',
    '4. Systemic examination ตรวจร่างกายตามระบบที่เกี่ยวข้องกับ CC และ PI',
    '5. Pain score (ถ้ามีอาการปวด)',
    '6. Neuro sign (กรณีผู้ป่วยอุบัติเหตุทางสมอง หรือโรคทางระบบประสาท)',
    '7. การตรวจทางสูตินรีเวช / ตรวจครรภ์ (ถ้ามี)',
  ],
  '4': [
    '1. Diagnosis (Dx) การวินิจฉัยโรคเบื้องต้น หรือ Final Dx',
    '2. Treatment (Rx) การรักษาที่สอดคล้องกับการวินิจฉัยโรค',
    '3. การสั่งยาชัดเจน (ชื่อยา, ขนาด, วิธีใช้)',
    '4. Investigation (Lab/X-ray) การส่งตรวจที่สอดคล้องกับโรค',
    '5. การบันทึกผล Lab/X-ray หรือผลการตรวจพิเศษอื่นๆ',
    '6. การให้คำแนะนำ (Advice)',
    '7. ลงลายมือชื่อแพทย์ผู้ตรวจรักษา (อ่านออกหรือมีรหัสแพทย์)',
  ],
  '5_1': [
    '1. อาการเปลี่ยนแปลง (Progress of symptoms)',
    '2. V/S, BW',
    '3. Physical examination ที่เกี่ยวข้อง',
    '4. Treatment / Plan of management',
    '5. ลงลายมือชื่อแพทย์ผู้ตรวจรักษา',
    '', ''
  ],
  '5_2': [
    '1. อาการเปลี่ยนแปลง (Progress of symptoms)',
    '2. V/S, BW',
    '3. Physical examination ที่เกี่ยวข้อง',
    '4. Treatment / Plan of management',
    '5. ลงลายมือชื่อแพทย์ผู้ตรวจรักษา',
    '', ''
  ],
  '5_3': [
    '1. อาการเปลี่ยนแปลง (Progress of symptoms)',
    '2. V/S, BW',
    '3. Physical examination ที่เกี่ยวข้อง',
    '4. Treatment / Plan of management',
    '5. ลงลายมือชื่อแพทย์ผู้ตรวจรักษา',
    '', ''
  ],
  '6': [
    '1. Diagnosis (Pre-op / Post-op)',
    '2. Name of operation / Procedure',
    '3. Surgeon / Assistant (ถ้ามี)',
    '4. Operative finding / Procedure details',
    '5. ลงลายมือชื่อแพทย์ผู้ทำหัตถการ',
    '', ''
  ],
  '7': [
    '1. ชื่อ-สกุล ผู้ป่วย',
    '2. ชื่อการรักษา / ผ่าตัด / หัตถการ',
    '3. ลายมือชื่อผู้ป่วย / ญาติ (ผู้แทนโดยชอบธรรม)',
    '4. ลายมือชื่อแพทย์ผู้ให้ข้อมูล',
    '5. พยาน (อย่างน้อย 1 คน)',
    '', ''
  ],
  '8': [
    '1. Diagnosis / Problem',
    '2. Goal / Plan of treatment',
    '3. Treatment / Modality',
    '4. Progress note',
    '5. ลงลายมือชื่อผู้บำบัด',
    '', ''
  ],
};

const DEFAULT_IPD_CRITERIA: Record<string, string[]> = {
  '1': ['Principal Dx', 'Comorbidity', 'Complication', 'Other Dx', 'External cause', 'OR Code', 'OR Date', 'OR Time', 'ลงลายมือชื่อแพทย์'],
  '2': ['CC', 'PI', 'Physical Exam', 'Lab/X-ray', 'Treatment', 'Hospital Course', 'Condition on D/C', '', ''],
  '3': ['ชื่อ-สกุล ผู้ป่วย', 'ชื่อการรักษา/ผ่าตัด', 'ข้อบ่งชี้/ทางเลือก', 'ความเสี่ยง/ผลแทรกซ้อน', 'ลายมือชื่อผู้ป่วย/ญาติ', 'ลายมือชื่อแพทย์', 'พยาน', 'วันที่/เวลา', ''],
  '4': ['CC', 'PI', 'PH', 'FH', 'Allergy', 'Menstruation', 'Smoking/Alcohol', 'ลงลายมือชื่อแพทย์', 'วันที่/เวลา'],
  '5': ['V/S (BP, PR, RR, T)', 'BW / Height', 'General Appearance', 'Systemic Exam', 'Pain Score', 'Neuro sign', 'อื่นๆ', 'ลงลายมือชื่อแพทย์', 'วันที่/เวลา'],
  '6': ['Date/Time', 'Subjective', 'Objective', 'Assessment', 'Plan', 'ลงลายมือชื่อแพทย์', '', '', ''],
  '7': ['', '', '', '', '', '', '', '', ''],
  '8': ['', '', '', '', '', '', '', '', ''],
  '9': ['', '', '', '', '', '', '', '', ''],
  '10': ['', '', '', '', '', '', '', '', ''],
  '11': ['', '', '', '', '', '', '', '', ''],
  '12': ['Date/Time', 'Focus/Problem', 'Data/Action', 'Response', 'ลงลายมือชื่อพยาบาล', '', '', '', ''],
};

export const getOPDCriteria = () => {
  const saved = localStorage.getItem('mra_opd_criteria');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing OPD criteria', e);
    }
  }
  return DEFAULT_OPD_CRITERIA;
};

export const getIPDCriteria = () => {
  const saved = localStorage.getItem('mra_ipd_criteria');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing IPD criteria', e);
    }
  }
  return DEFAULT_IPD_CRITERIA;
};

export default function EditCriteria() {
  const navigate = useNavigate();
  const [opdCriteria, setOpdCriteria] = useState<Record<string, string[]>>({});
  const [ipdCriteria, setIpdCriteria] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<'OPD' | 'IPD'>('OPD');

  useEffect(() => {
    setOpdCriteria(getOPDCriteria());
    setIpdCriteria(getIPDCriteria());
  }, []);

  const handleOpdChange = (rowId: string, colIdx: number, value: string) => {
    setOpdCriteria(prev => {
      const newRow = [...(prev[rowId] || [])];
      newRow[colIdx] = value;
      return { ...prev, [rowId]: newRow };
    });
  };

  const handleIpdChange = (rowId: string, colIdx: number, value: string) => {
    setIpdCriteria(prev => {
      const newRow = [...(prev[rowId] || [])];
      newRow[colIdx] = value;
      return { ...prev, [rowId]: newRow };
    });
  };

  const handleSave = () => {
    localStorage.setItem('mra_opd_criteria', JSON.stringify(opdCriteria));
    localStorage.setItem('mra_ipd_criteria', JSON.stringify(ipdCriteria));
    alert('บันทึกข้อมูลเกณฑ์การประเมินเรียบร้อยแล้ว');
  };

  const handleReset = () => {
    if (window.confirm('คุณต้องการคืนค่าเกณฑ์เริ่มต้นทั้งหมดหรือไม่?')) {
      setOpdCriteria(DEFAULT_OPD_CRITERIA);
      setIpdCriteria(DEFAULT_IPD_CRITERIA);
      localStorage.setItem('mra_opd_criteria', JSON.stringify(DEFAULT_OPD_CRITERIA));
      localStorage.setItem('mra_ipd_criteria', JSON.stringify(DEFAULT_IPD_CRITERIA));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">แก้ไขข้อมูลเกณฑ์การประเมิน</h2>
        <div className="space-x-2">
          <button onClick={handleReset} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded shadow">
            คืนค่าเริ่มต้น
          </button>
          <button onClick={handleSave} className="bg-[#d98b73] hover:bg-[#c27a64] text-white px-4 py-2 rounded shadow font-bold">
            บันทึกการเปลี่ยนแปลง
          </button>
          <button onClick={() => navigate(-1)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded shadow">
            กลับ
          </button>
        </div>
      </div>

      <div className="flex border-b mb-6">
        <button 
          className={`px-6 py-3 font-bold text-lg ${activeTab === 'OPD' ? 'border-b-4 border-[#d98b73] text-[#d98b73]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('OPD')}
        >
          เกณฑ์ผู้ป่วยนอก (OPD)
        </button>
        <button 
          className={`px-6 py-3 font-bold text-lg ${activeTab === 'IPD' ? 'border-b-4 border-[#d98b73] text-[#d98b73]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('IPD')}
        >
          เกณฑ์ผู้ป่วยใน (IPD)
        </button>
      </div>

      {activeTab === 'OPD' && (
        <div className="space-y-8">
          {(Object.entries(opdCriteria) as [string, string[]][]).map(([rowId, cols]) => (
            <div key={rowId} className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">หัวข้อที่ {rowId}</h3>
              <div className="grid grid-cols-1 gap-3">
                {cols.map((colText, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <span className="font-bold text-gray-600 w-16 pt-2">ข้อ {idx + 1}</span>
                    <textarea 
                      className="flex-1 border rounded p-2 text-sm min-h-[60px] focus:ring-2 focus:ring-blue-200 outline-none"
                      value={colText}
                      onChange={(e) => handleOpdChange(rowId, idx, e.target.value)}
                      placeholder={`เกณฑ์ข้อที่ ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'IPD' && (
        <div className="space-y-8">
          {(Object.entries(ipdCriteria) as [string, string[]][]).map(([rowId, cols]) => (
            <div key={rowId} className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">หัวข้อที่ {rowId}</h3>
              <div className="grid grid-cols-1 gap-3">
                {cols.map((colText, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <span className="font-bold text-gray-600 w-16 pt-2">ข้อ {idx + 1}</span>
                    <textarea 
                      className="flex-1 border rounded p-2 text-sm min-h-[60px] focus:ring-2 focus:ring-blue-200 outline-none"
                      value={colText}
                      onChange={(e) => handleIpdChange(rowId, idx, e.target.value)}
                      placeholder={`เกณฑ์ข้อที่ ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
