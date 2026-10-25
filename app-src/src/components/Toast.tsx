import { CheckCircle2, XCircle, Info } from 'lucide-react';
import type { Toast as ToastType } from '../hooks/useToast';

export function ToastContainer({ toasts }: { toasts: ToastType[] }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-slide-down ${
            t.type === 'success'
              ? 'bg-emerald-600'
              : t.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 size={20} />}
          {t.type === 'error' && <XCircle size={20} />}
          {t.type === 'info' && <Info size={20} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
