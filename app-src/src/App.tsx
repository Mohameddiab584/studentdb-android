import { useEffect, useState } from 'react';
import { Layout, type PageKey } from './components/Layout';
import { LockScreen } from './components/LockScreen';
import { authIsSet } from './lib/auth';
import { ToastContainer } from './components/Toast';
import { Dashboard } from './pages/Dashboard';
import { SettingsPage } from './pages/SettingsPage';
import { GradePage } from './pages/GradePage';
import { ExcelPage } from './pages/ExcelPage';
import { SearchPage } from './pages/SearchPage';
import { ReportsPage } from './pages/ReportsPage';
import { supabase, type SchoolSettings } from './lib/supabase';
import { useToast } from './hooks/useToast';
import type { SchoolSettings as ReportSettings } from './lib/reportUtils';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [auth, setAuth] = useState<'loading' | 'setup' | 'login' | 'unlocked'>('loading');
  const { toasts, showToast } = useToast();

  // Lock screen first: no page (and no settings load) until unlocked.
  useEffect(() => {
    (async () => {
      const s = await authIsSet();
      if (s === null) setAuth('unlocked'); // no bridge (plain web dev)
      else setAuth(s ? 'login' : 'setup');
    })();
  }, []);

  useEffect(() => {
    if (auth !== 'unlocked') return;
    (async () => {
      const { data } = await supabase
        .from('school_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (data) setSettings(data);
    })();
  }, [auth]);

  if (auth === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <p className="text-sm text-slate-500">جاري التحميل...</p>
      </div>
    );
  }

  if (auth === 'setup' || auth === 'login') {
    return <LockScreen mode={auth} onUnlocked={() => setAuth('unlocked')} />;
  }

  const reportSettings: ReportSettings | null = settings
    ? {
        school_name: settings.school_name,
        education_administration: settings.education_administration,
        governorate: settings.governorate,
      }
    : null;

  return (
    <>
      <Layout
        currentPage={page}
        onPageChange={setPage}
        schoolName={settings?.school_name || ''}
      >
        {page === 'dashboard' && <Dashboard settings={reportSettings} onNavigate={setPage} />}
        {page === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdate={setSettings}
            showToast={showToast}
          />
        )}
        {page === 'first' && (
          <GradePage grade="first" settings={reportSettings} showToast={showToast} />
        )}
        {page === 'second' && (
          <GradePage grade="second" settings={reportSettings} showToast={showToast} />
        )}
        {page === 'third' && (
          <GradePage grade="third" settings={reportSettings} showToast={showToast} />
        )}
        {page === 'excel' && <ExcelPage showToast={showToast} />}
        {page === 'search' && <SearchPage settings={reportSettings} showToast={showToast} />}
        {page === 'reports' && <ReportsPage settings={reportSettings} showToast={showToast} />}
      </Layout>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
