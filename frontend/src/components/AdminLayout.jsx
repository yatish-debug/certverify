import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LayoutDashboard, LogOut } from 'lucide-react';

const AdminLayout = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (!token) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-slate-800">
          <ShieldCheck className="w-8 h-8 text-primary-500" />
          <span className="text-xl font-bold tracking-tight">Admin Portal</span>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            <li>
              <a 
                href="/admin/dashboard" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === '/admin/dashboard' ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </a>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b shadow-sm h-16 flex items-center px-8">
          <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
