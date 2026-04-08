import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Activity, Database, X, Save, Server, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    host: '',
    user: 'root',
    password: '',
    database: 'mra_audit',
    hosDatabase: 'hos',
    port: '3306'
  });

  const navigate = useNavigate();

  useEffect(() => {
    const savedConfig = localStorage.getItem('mra_db_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setDbConfig({
        ...parsed,
        database: parsed.database || 'mra_audit',
        hosDatabase: parsed.hosDatabase || 'hos'
      });
    }
  }, []);

  const handleSaveDbConfig = async () => {
    setLoading(true);
    try {
      // Save to local storage first
      localStorage.setItem('mra_db_config', JSON.stringify(dbConfig));
      
      // 1. Setup MRA Database
      const mraResponse = await fetch('/api/setup-mra-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: dbConfig }),
      });
      
      // 2. Setup HOS Database
      const hosResponse = await fetch('/api/setup-hos-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: {
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.hosDatabase,
            port: dbConfig.port
          } 
        }),
      });
      
      const mraData = await mraResponse.json();
      const hosData = await hosResponse.json();
      
      if (mraData.success && hosData.success) {
        alert('เชื่อมต่อฐานข้อมูล HosXP และ MRA สำเร็จ!');
        setShowDbSettings(false);
      } else {
        let msg = '';
        if (!mraData.success) msg += `MRA Error: ${mraData.message}\n`;
        if (!hosData.success) msg += `HosXP Error: ${hosData.message}`;
        alert(msg);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDb = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch('/api/setup-mra-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: dbConfig }),
      });
      const data = await response.json();
      if (data.success) {
        alert('สร้างฐานข้อมูลและตารางเรียบร้อยแล้ว: ' + data.message);
      } else {
        alert('ไม่สามารถสร้างฐานข้อมูลได้:\n' + data.message + (data.error ? '\nCode: ' + data.error : ''));
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์\nกรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงานอยู่');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans p-4 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img 
              src="/logo.svg" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Seal_of_the_Ministry_of_Public_Health_of_Thailand.svg/240px-Seal_of_the_Ministry_of_Public_Health_of_Thailand.svg.png";
              }}
              alt="Logo" 
              className="w-14 h-14 object-contain relative z-10"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2 flex items-center gap-2">
            MRA <span className="text-blue-600">Photalae Hospital</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 tracking-wide uppercase">Medical Record Audit System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10 relative">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center border border-red-100 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-slate-900/20'}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Database Settings Trigger */}
          <button 
            onClick={() => setShowDbSettings(true)}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-blue-500 transition-colors"
            title="Database Settings"
          >
            <Database className="w-5 h-5" />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Phothale Hospital Quality Assurance
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-2 text-slate-400 text-[10px] font-medium">
            <span>© 2026 photalae Hospital</span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span>Created by Weerachit Klinhom Mrs37</span>
          </div>
        </div>
      </div>

      {/* Database Settings Modal */}
      {showDbSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" />
                ตั้งค่าการเชื่อมต่อฐานข้อมูล
              </h3>
              <button onClick={() => setShowDbSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Database Host</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    placeholder="e.g. 192.168.1.100"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">DB User</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({...dbConfig, user: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">DB Port</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({...dbConfig, port: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">DB Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">MRA Database Name (Audit)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">HosXP Database Name (HIS)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    value={dbConfig.hosDatabase}
                    onChange={(e) => setDbConfig({...dbConfig, hosDatabase: e.target.value})}
                  />
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 italic">
                * การตั้งค่านี้จะถูกบันทึกไว้ในเบราว์เซอร์ของคุณ
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <Link 
                  to="/manual" 
                  target="_blank"
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  ดูคู่มือการใช้งาน
                </Link>
                <button
                  onClick={handleSetupDb}
                  disabled={isSettingUp}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Database className="w-3 h-3" />
                  {isSettingUp ? 'กำลังสร้าง...' : 'คลิกเพื่อสร้าง Database ใหม่'}
                </button>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDbSettings(false)} 
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveDbConfig}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

