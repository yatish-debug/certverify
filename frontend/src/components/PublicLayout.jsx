import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b shadow-sm py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-slate-800 tracking-tight">CertVerify</span>
          </div>
          <a href="/admin/login" className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
            Admin Portal
          </a>
        </div>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-400 py-6 text-center">
        <div className="container mx-auto px-4">
          <p className="text-sm">&copy; {new Date().getFullYear()} CertVerify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
