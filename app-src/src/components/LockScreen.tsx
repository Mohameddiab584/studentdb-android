import { useState } from 'react';
import { Lock, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react';
import { authSet, authVerify } from '../lib/auth';

type Props = {
  mode: 'setup' | 'login';
  onUnlocked: () => void;
};

export function LockScreen({ mode, onUnlocked }: Props) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'setup') {
      if (pw.length < 4) {
        setError('كلمة السر قصيرة جدًا (4 أحرف على الأقل).');
        return;
      }
      if (pw !== confirm) {
        setError('كلمتا السر غير متطابقتين.');
        return;
      }
      setBusy(true);
      const r = await authSet(pw);
      setBusy(false);
      if (r.ok) onUnlocked();
      else setError(r.message || 'تعذر حفظ كلمة السر.');
    } else {
      if (!pw) {
        setError('اكتب كلمة السر.');
        return;
      }
      setBusy(true);
      const ok = await authVerify(pw);
      setBusy(false);
      if (ok) onUnlocked();
      else setError('كلمة السر غير صحيحة، حاول مجددًا.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">قاعدة بيانات الطلاب</h1>
          <p className="text-sm text-slate-500 mt-1">المرحلة الثانوية العامة</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-slate-700 font-bold pb-2 border-b border-gray-100">
            {mode === 'setup' ? (
              <ShieldCheck size={20} className="text-blue-700" />
            ) : (
              <Lock size={20} className="text-blue-700" />
            )}
            <span>{mode === 'setup' ? 'إنشاء كلمة سر للبرنامج' : 'دخول البرنامج'}</span>
          </div>

          {mode === 'setup' && (
            <p className="text-xs text-slate-500 leading-relaxed">
              هذه أول مرة يفتح فيها البرنامج بعد إضافة القفل. اختر كلمة سر لا يعرفها غيرك؛
              سيطلبها البرنامج عند كل فتح بعد ذلك.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {mode === 'setup' ? 'كلمة السر الجديدة' : 'كلمة السر'}
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-gray-300 bg-white text-gray-800 px-4 py-2.5 pl-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                تأكيد كلمة السر
              </label>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white text-gray-800 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <Lock size={18} />
            {busy ? 'جاري التحقق...' : mode === 'setup' ? 'حفظ كلمة السر ودخول البرنامج' : 'دخول'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          جهاز واحد ومستخدم واحد — لا حاجة للإنترنت.
        </p>
      </div>
    </div>
  );
}
