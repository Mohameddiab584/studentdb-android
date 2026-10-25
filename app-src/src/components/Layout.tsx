import { type ReactNode, useState } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Search,
  FileBarChart,
  Settings,
  FileSpreadsheet,
  Menu,
  X,
  School,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'settings'
  | 'first'
  | 'second'
  | 'third'
  | 'excel'
  | 'search'
  | 'reports';

type Props = {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  schoolName: string;
  children: ReactNode;
};

const NAV_ITEMS: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { key: 'first', label: 'الصف الأول الثانوي', icon: Users },
  { key: 'second', label: 'الصف الثاني الثانوي', icon: Users },
  { key: 'third', label: 'الصف الثالث الثانوي', icon: Users },
  { key: 'excel', label: 'استيراد / تصدير Excel', icon: FileSpreadsheet },
  { key: 'search', label: 'البحث عن طالب', icon: Search },
  { key: 'reports', label: 'مركز تقارير زكي', icon: FileBarChart },
  { key: 'settings', label: 'إعدادات المدرسة', icon: Settings },
];

export function Layout({ currentPage, onPageChange, schoolName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-50 w-72 bg-gradient-to-b from-slate-800 to-slate-900 text-white transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <GraduationCap size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight">قاعدة بيانات الطلاب</h1>
              <p className="text-xs text-slate-400 truncate">المرحلة الثانوية العامة</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onPageChange(item.key);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <School size={14} className="shrink-0" />
            <span className="truncate">{schoolName || '—'}</span>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
          <span className="font-bold text-sm text-slate-800">قاعدة بيانات الطلاب</span>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Close button for mobile sidebar */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 left-4 z-[60] lg:hidden p-2 rounded-lg bg-white/20 text-white"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
