
import React, { useState } from 'react';
import { AppView } from '../types';
import { 
  LayoutDashboard, 
  GitCompare, 
  Radio, 
  FileText, 
  ShieldCheck, 
  Plane,
  Menu,
  X,
  Network,
  ClipboardCheck
} from 'lucide-react';

interface LayoutProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { view: AppView.DASHBOARD, label: 'Mission Control', icon: LayoutDashboard },
    { view: AppView.REGULATION_PARSER, label: 'Regulation Engine', icon: Network },
    { view: AppView.COMPLIANCE_HUB, label: 'Compliance & Audit', icon: ClipboardCheck },
    { view: AppView.BOM_RECONCILIATION, label: 'BOM Reconciliation', icon: GitCompare },
    { view: AppView.REGULATORY_ALERTS, label: 'Regulatory Watch', icon: Radio },
    { view: AppView.CM_ASSISTANT, label: 'CM Assistant', icon: FileText },
    { view: AppView.VIRTUAL_AUDITOR, label: 'Virtual Auditor', icon: ShieldCheck },
  ];

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Plane className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">AeroGuard AI</h1>
          <p className="text-xs text-slate-500 font-medium">Airworthiness Guardrail</p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => {
              setCurrentView(item.view);
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
              currentView === item.view
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentView === item.view ? 'text-blue-600' : 'text-slate-400'}`} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 mt-auto">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-700">Gemini 2.5 Flash: Online</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col fixed inset-y-0 z-20">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed inset-x-0 top-0 bg-white border-b border-slate-200 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-slate-900">AeroGuard</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white pt-16">
          <NavContent />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 pt-16 lg:pt-0 p-4 lg:p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
