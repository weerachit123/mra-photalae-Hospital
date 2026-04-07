import React from 'react';
import { FileText, Download, CheckCircle2, AlertCircle, Info, LogIn, ClipboardList, Printer, Settings, Server, LayoutDashboard } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function UserManual() {
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Set Thai font (using a standard one that supports most characters)
    // Note: In a real app, we'd need to embed a Thai font file.
    // For this demo, we'll use English headers and Thai-like structure.
    
    doc.setFontSize(22);
    doc.text('MRA Photalae Hospital User Manual', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('1. Introduction', 20, 40);
    doc.setFontSize(12);
    doc.text('Medical Record Audit (MRA) system for Phothale Hospital.', 20, 50);
    
    doc.setFontSize(16);
    doc.text('2. Getting Started', 20, 70);
    doc.setFontSize(12);
    doc.text('- Open your web browser and go to the application URL.', 20, 80);
    doc.text('- Login with your HosXP username and password.', 20, 90);
    
    doc.setFontSize(16);
    doc.text('3. Main Features', 20, 110);
    doc.setFontSize(12);
    doc.text('- Dashboard: View summary statistics of audits.', 20, 120);
    doc.text('- Audit OPD/IPD: Create new audit worksheets by random sampling.', 20, 130);
    doc.text('- Worksheet List: View and perform audits on selected cases.', 20, 140);
    doc.text('- Detailed Report: Export audit results to Excel.', 20, 150);
    doc.text('- Memorandum (Admin): Print summary for signing.', 20, 160);

    doc.save('MRA_Photalae_Hospital_Manual.pdf');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">คู่มือการใช้งาน</h1>
          <p className="text-slate-500 mt-1">MRA Photalae Hospital (Medical Record Audit System)</p>
        </div>
        <button 
          onClick={exportToPDF}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Download className="w-5 h-5" />
          ดาวน์โหลดคู่มือ (PDF)
        </button>
      </div>

      {/* Section 1: Introduction */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Info className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">1. บทนำ</h2>
        </div>
        <p className="text-slate-600 leading-relaxed">
          ระบบ MRA Photalae Hospital คือระบบตรวจสอบคุณภาพเวชระเบียน (Medical Record Audit) 
          ที่ออกแบบมาเพื่อช่วยให้เจ้าหน้าที่โรงพยาบาลโพทะเลสามารถสุ่มเคสจากระบบ HosXP 
          และทำการประเมินคุณภาพได้อย่างรวดเร็วและเป็นระบบ
        </p>
      </section>

      {/* Section 2: Installation & Login */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">2. การเข้าใช้งานระบบ</h2>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-slate-400 shadow-sm flex-shrink-0">1</div>
            <div>
              <p className="font-bold text-slate-700">เปิดโปรแกรม</p>
              <p className="text-sm text-slate-500">เปิด Google Chrome หรือ Microsoft Edge แล้วพิมพ์ที่อยู่ของระบบ (URL) ที่ได้รับจากศูนย์คอมพิวเตอร์</p>
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-slate-400 shadow-sm flex-shrink-0">2</div>
            <div>
              <p className="font-bold text-slate-700">เข้าสู่ระบบ</p>
              <p className="text-sm text-slate-500">ใช้ชื่อผู้ใช้งาน (Username) และรหัสผ่าน (Password) เดียวกับที่ใช้เข้าโปรแกรม HosXP ของคุณ</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Usage */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">3. ขั้นตอนการใช้งานหลัก</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-100 p-6 rounded-2xl hover:bg-slate-50 transition-colors">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              การสุ่มเคส (Audit OPD/IPD)
            </h3>
            <ul className="text-sm text-slate-500 space-y-2 list-disc ml-4">
              <li>เลือกช่วงวันที่ต้องการตรวจสอบ</li>
              <li>เลือกแผนก หรือ Ward ที่ต้องการ</li>
              <li>กดปุ่ม "สุ่มเคส Audit" เพื่อดึงข้อมูลจาก HosXP</li>
              <li>กดปุ่ม "สร้างใบงานประเมิน" เพื่อเริ่มการตรวจสอบ</li>
            </ul>
          </div>

          <div className="border border-slate-100 p-6 rounded-2xl hover:bg-slate-50 transition-colors">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              การประเมิน (Worksheet List)
            </h3>
            <ul className="text-sm text-slate-500 space-y-2 list-disc ml-4">
              <li>ไปที่เมนู "รายการใบงาน"</li>
              <li>เลือกใบงานที่ต้องการประเมิน</li>
              <li>คลิกที่ชื่อเคสเพื่อเปิดแบบฟอร์มประเมิน</li>
              <li>ติ๊กเลือกคะแนนตามเกณฑ์ และกดบันทึก</li>
            </ul>
          </div>

          <div className="border border-slate-100 p-6 rounded-2xl hover:bg-slate-50 transition-colors">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Printer className="w-4 h-4 text-purple-500" />
              การสรุปผล (Memorandum)
            </h3>
            <ul className="text-sm text-slate-500 space-y-2 list-disc ml-4">
              <li>(สำหรับ Admin เท่านั้น)</li>
              <li>ไปที่เมนู "ปริ้นสรุป เสนอเซ็น"</li>
              <li>ระบบจะสรุปคะแนนแยกตามเกณฑ์และแผนก</li>
              <li>สามารถสั่งพิมพ์ออกมาเป็นกระดาษเพื่อเสนอเซ็นได้ทันที</li>
            </ul>
          </div>

          <div className="border border-slate-100 p-6 rounded-2xl hover:bg-slate-50 transition-colors">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              การตั้งค่าฐานข้อมูล
            </h3>
            <ul className="text-sm text-slate-500 space-y-2 list-disc ml-4">
              <li>หากระบบแจ้งว่า "ไม่สามารถเชื่อมต่อฐานข้อมูลได้"</li>
              <li>ให้กดรูปไอคอนฐานข้อมูลที่หน้า Login</li>
              <li>ตรวจสอบ IP Address ของเซิร์ฟเวอร์ HosXP ให้ถูกต้อง</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: Installation for IT */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Server className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">4. สำหรับเจ้าหน้าที่ IT (การติดตั้งบนเซิร์ฟเวอร์)</h2>
        </div>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>หากต้องการนำระบบไปรันบนเซิร์ฟเวอร์ของโรงพยาบาลเอง ให้ดำเนินการดังนี้:</p>
          <ol className="list-decimal ml-5 space-y-2">
            <li>ติดตั้ง <strong>Node.js</strong> (เวอร์ชัน 18 ขึ้นไป) บนเครื่องเซิร์ฟเวอร์</li>
            <li>ดาวน์โหลดไฟล์โปรเจกต์ (Export ZIP) จากระบบ AI Studio</li>
            <li>แตกไฟล์ ZIP และเปิด Command Prompt ในโฟลเดอร์นั้น</li>
            <li>พิมพ์คำสั่ง <code>npm install</code> เพื่อติดตั้งไลบรารีที่จำเป็น</li>
            <li>สร้างไฟล์ <code>.env</code> เพื่อตั้งค่าการเชื่อมต่อฐานข้อมูล (Host, User, Password)</li>
            <li>พิมพ์คำสั่ง <code>npm run build</code> และตามด้วย <code>npm start</code></li>
          </ol>
        </div>
      </section>

      {/* Section 5: Desktop Shortcut */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">5. วิธีสร้างไอคอนไว้บนหน้าจอ (Desktop Shortcut)</h2>
        </div>
        <p className="text-slate-600 text-sm mb-4">เพื่อให้เข้าใช้งานได้ง่ายเหมือนโปรแกรมทั่วไป ให้ทำดังนี้:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-700 mb-1">สำหรับ Google Chrome</p>
            <p className="text-xs text-slate-500">1. เปิดหน้าเว็บระบบ MRA</p>
            <p className="text-xs text-slate-500">2. กดจุด 3 จุดที่มุมขวาบน</p>
            <p className="text-xs text-slate-500">3. เลือก "เครื่องมือเพิ่มเติม" (More Tools)</p>
            <p className="text-xs text-slate-500">4. เลือก "สร้างทางลัด..." (Create Shortcut)</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-700 mb-1">สำหรับ Microsoft Edge</p>
            <p className="text-xs text-slate-500">1. เปิดหน้าเว็บระบบ MRA</p>
            <p className="text-xs text-slate-500">2. กดจุด 3 จุดที่มุมขวาบน</p>
            <p className="text-xs text-slate-500">3. เลือก "แอป" (Apps)</p>
            <p className="text-xs text-slate-500">4. เลือก "ติดตั้งไซต์นี้เป็นแอป" (Install this site as an app)</p>
          </div>
        </div>
      </section>

      {/* Section 6: Troubleshooting */}
      <section className="bg-red-50 p-8 rounded-2xl border border-red-100">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-bold text-red-800">ข้อควรระวัง</h2>
        </div>
        <ul className="text-sm text-red-700 space-y-2 list-disc ml-6 font-medium">
          <li>ห้ามปิดหน้าต่างเบราว์เซอร์ขณะกำลังบันทึกข้อมูล</li>
          <li>หากอินเทอร์เน็ตหลุด ระบบจะบันทึกข้อมูลไว้ในเครื่องชั่วคราว (Local Storage)</li>
          <li>กรุณาตรวจสอบความถูกต้องของ HN และวันที่รับบริการก่อนกดบันทึก</li>
        </ul>
      </section>
    </div>
  );
}
