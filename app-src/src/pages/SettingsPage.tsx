import { useEffect, useState } from 'react';
import { School, Save, MapPin, Building2, Lock } from 'lucide-react';
import { supabase, type SchoolSettings as SchoolSettingsType } from '../lib/supabase';
import { authChange, hasAuthBridge } from '../lib/auth';
import { Input } from '../components/Input';

type Props = {
  settings: SchoolSettingsType | null;
  onUpdate: (settings: SchoolSettingsType) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

export function SettingsPage({ settings, onUpdate, showToast }: Props) {
  const [form, setForm] = useState<SchoolSettingsType>({
    id: 1,
    school_name: '',
    education_administration: '',
    governorate: '',
  });
  const [saving, setSaving] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 4) {
      showToast('كلمة السر الجديدة قصيرة جدًا (4 أحرف على الأقل).', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      showToast('كلمتا السر غير متطابقتين.', 'error');
      return;
    }
    setChanging(true);
    const r = await authChange(curPw, newPw);
    setChanging(false);
    if (r.ok) {
      showToast('تم تغيير كلمة السر بنجاح');
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
    } else {
      showToast(r.message || 'تعذر تغيير كلمة السر.', 'error');
    }
  };

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('school_settings')
      .upsert({
        id: 1,
        school_name: form.school_name,
        education_administration: form.education_administration,
        governorate: form.governorate,
      })
      .select()
      .single();

    if (error) {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } else if (data) {
      onUpdate(data);
      showToast('تم حفظ الإعدادات بنجاح');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
          <School size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إعدادات المدرسة</h1>
          <p className="text-sm text-slate-500">تُكتب مرة واحدة وتظهر تلقائياً في جميع التقارير</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-2 text-slate-700 font-bold pb-3 border-b border-gray-100">
          <Building2 size={20} className="text-blue-700" />
          <span>بيانات المدرسة</span>
        </div>

        <Input
          label="اسم المدرسة"
          value={form.school_name}
          onChange={(v) => setForm((p) => ({ ...p, school_name: v }))}
          placeholder="مدرسة سعاد جودة عزب الثانوية"
        />

        <Input
          label="الإدارة التعليمية"
          value={form.education_administration}
          onChange={(v) => setForm((p) => ({ ...p, education_administration: v }))}
          placeholder="إدارة منيا القمح التعليمية"
        />

        <div className="flex items-center gap-2 text-slate-700 font-bold pb-3 border-b border-gray-100 pt-4">
          <MapPin size={20} className="text-emerald-700" />
          <span>الموقع</span>
        </div>

        <Input
          label="المحافظة"
          value={form.governorate}
          onChange={(v) => setForm((p) => ({ ...p, governorate: v }))}
          placeholder="محافظة الشرقية"
        />

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {hasAuthBridge() && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5 mt-6">
          <div className="flex items-center gap-2 text-slate-700 font-bold pb-3 border-b border-gray-100">
            <Lock size={20} className="text-blue-700" />
            <span>كلمة سر البرنامج</span>
          </div>

          <Input
            label="كلمة السر الحالية"
            type="password"
            value={curPw}
            onChange={setCurPw}
            placeholder="••••••••"
          />
          <Input
            label="كلمة السر الجديدة"
            type="password"
            value={newPw}
            onChange={setNewPw}
            placeholder="4 أحرف على الأقل"
          />
          <Input
            label="تأكيد كلمة السر الجديدة"
            type="password"
            value={confirmPw}
            onChange={setConfirmPw}
            placeholder="••••••••"
          />

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleChangePassword}
              disabled={changing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              <Lock size={18} />
              {changing ? 'جاري التغيير...' : 'تغيير كلمة السر'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 bg-blue-50 rounded-xl p-4 text-sm text-blue-800 border border-blue-100">
        <p className="font-medium mb-1">ملاحظة</p>
        <p className="text-blue-600 text-xs leading-relaxed">
          هذه البيانات تظهر تلقائياً في جميع التقارير وبطاقات الطلاب. يتم حفظها مرة واحدة فقط.
        </p>
      </div>
    </div>
  );
}
