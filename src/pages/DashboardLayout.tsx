import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, FileText, Home, Users, Settings, LayoutDashboard, ClipboardCheck, ClipboardList, Printer, BookOpen } from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    navigate('/');
    return null;
  }

  const isAdmin = user.role === 'admin' || user.name === 'Admin User' || user.loginname === '0176' || user.loginname === '0382';

  const menuItems = [
    { path: '/dashboard/stats', label: 'Dashboard สรุปผล', icon: LayoutDashboard },
    { path: '/dashboard/report', label: 'รายงานละเอียด', icon: FileText },
    { path: '/dashboard/worksheets', label: 'รายการใบงาน', icon: ClipboardList },
  ];

  const adminItems = [
    { path: '/dashboard/audit-opd', label: 'Audit OPD (สร้างใบงาน)', icon: ClipboardCheck },
    { path: '/dashboard/audit-ipd', label: 'Audit IPD (สร้างใบงาน)', icon: ClipboardCheck },
    { path: '/dashboard/memorandum', label: 'ปริ้นสรุป เสนอเซ็น', icon: Printer },
    { path: '/dashboard/edit-criteria', label: 'ตั้งค่าเกณฑ์ประเมิน', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard/stats" className="flex-shrink-0 flex items-center group">
                <div className="relative">
                  <img 
                    className="h-10 w-10 bg-white rounded-xl p-0.5 object-contain shadow-sm group-hover:scale-105 transition-transform" 
                    src="/logo.svg" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Seal_of_the_Ministry_of_Public_Health_of_Thailand.svg/240px-Seal_of_the_Ministry_of_Public_Health_of_Thailand.svg.png";
                    }}
                    alt="Phothale Hospital Logo" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="ml-3 flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-slate-800 leading-none">MRA Photalae Hospital</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Medical Audit System</span>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase font-bold">{user.role || 'User'}</span>
              </div>
              
              <button 
                onClick={handleLogout}
                className="flex items-center text-sm font-medium text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-4 py-2 rounded-lg transition-all border border-slate-200 hover:border-red-100"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 hidden md:block sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="py-6 px-4">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <Link 
                    key={item.path}
                    to={item.path} 
                    className={`group flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            
            {isAdmin && (
              <div className="mt-8 space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Administration</p>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      className={`group flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
            
            <div className="mt-10 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Support</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                หากพบปัญหาการใช้งาน กรุณาติดต่อศูนย์คอมพิวเตอร์ โรงพยาบาลโพทะเล
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 bg-[#f8fafc]">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
