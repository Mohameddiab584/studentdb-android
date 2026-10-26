import { useEffect, useState } from 'react';
import { School, Save, MapPin, Building2, Lock, Trash2, Download } from 'lucide-react';
import { supabase, type SchoolSettings as SchoolSettingsType, type Student, type Graduate } from '../lib/supabase';
import { GRADE_LABELS, EDUCATION_TYPES } from '../lib/constants';
import { exportStudentsToExcel } from '../lib/excel';
import { authChange, hasAuthBridge } from '../lib/auth';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { ConfirmDialog } from '../components/ConfirmDialog';

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

  // ---- Danger zone: scoped data deletion ----
  // Deletion touches students (or graduates by year) only — school
  // settings are never affected. Every deletion is confirmed with
  // the exact scope and count, and the scope can be exported first.
  const [delScope, setDelScope] = useState<'all' | 'grade' | 'category' | 'grad-year'>('all');
  const [delGrade, setDelGrade] = useState<'first' | 'second' | 'third'>('first');
  const [delCategory, setDelCategory] = useState('');
  const [delYear, setDelYear] = useState('');
  const [gradYears, setGradYears] = useState<string[]>([]);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('graduates').select('graduation_year');
      setGradYears([...new Set(((data || []) as { graduation_year: string }[]).map((r) => r.graduation_year).filter(Boolean))].sort());
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (delScope === 'category' && !delCategory) { setAffectedCount(null); return; }
      if (delScope === 'grad-year' && !delYear) { setAffectedCount(null); return; }
      let count = 0;
      if (delScope === 'grad-year') {
        const { data } = await supabase.from('graduates').select('*').eq('graduation_year', delYear);
        count = (data || []).length;
      } else {
        let q = supabase.from('students').select('*');
        if (delScope !== 'all') q = q.eq('grade', delGrade);
        if (delScope === 'category') q = q.eq('education_type', delCategory);
        const { data } = await q;
        count = (data || []).length;
      }
      setAffectedCount(count);
    })();
  }, [delScope, delGrade, delCategory, delYear]);

  const delScopeLabel = () => {
    if (delScope === 'all') return 'جميع الطلاب في كل الصفوف';
    if (delScope === 'grade') return GRADE_LABELS[delGrade];
    if (delScope === 'category') return `${GRADE_LABELS[delGrade]} — ${delCategory}`;
    return `خريجو سنة ${delYear}`;
  };

  const fetchScopeRows = async (): Promise<Student[] | Graduate[]> => {
    if (delScope === 'grad-year') {
      const { data } = await supabase.from('graduates').select('*').eq('graduation_year', delYear);
      return (data || []) as Graduate[];
    }
    let q = supabase.from('students').select('*');
    if (delScope !== 'all') q = q.eq('grade', delGrade);
    if (delScope === 'category') q = q.eq('education_type', delCategory);
    const { data } = await q;
    return (data || []) as Student[];
  };

  const handleExportScope = async () => {
    const rows = await fetchScopeRows();
    if (rows.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'info');
      return;
    }
    if (delScope === 'grad-year') {
      exportStudentsToExcel(rows as Student[], `الخريجون_${delYear}.xlsx`, 'الخريجين', {
        header: 'سنة التخرج',
        value: (s) => (s as unknown as Graduate).graduation_year || '',
      });
    } else {
      const name = delScope === 'all'
        ? 'جميع_الطلاب_قبل_المسح'
        : delScope === 'grade'
          ? `${GRADE_LABELS[delGrade]}_قبل_المسح`
          : `${GRADE_LABELS[delGrade]}_${delCategory}_قبل_المسح`;
      exportStudentsToExcel(rows as Student[], `${name}.xlsx`, 'الطلاب');
    }
    showToast('تم تصدير النطاق بنجاح — يمكنك الآن المسح بأمان');
  };

  const handleDeleteScope = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    setDeleteResult(null);
    let error = null;
    if (delScope === 'grad-year') {
      ({ error } = await supabase.from('graduates').delete().eq('graduation_year', delYear));
    } else {
      let qb = supabase.from('students').delete();
      if (delScope !== 'all') qb = qb.eq('grade', delGrade);
      if (delScope === 'category') qb = qb.eq('education_type', delCategory);
      ({ error } = await qb);
    }
    setDeleting(false);
    if (error) {
      showToast('حدث خطأ أثناء المسح', 'error');
      return;
    }
    const msg = `تم مسح ${affectedCount ?? 0} ${delScope === 'grad-year' ? 'خريجًا' : 'طالبًا'} من (${delScopeLabel()}).`;
    setDeleteResult(msg);
    showToast(msg);
    setAffectedCount(0);
  };

  const canAct =
    affectedCount !== null &&
    affectedCount > 0 &&
    (delScope !== 'category' || delCategory !== '') &&
    (delScope !== 'grad-year' || delYear !== '');

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

      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 space-y-5 mt-6">
        <div className="flex items-center gap-2 text-red-700 font-bold pb-3 border-b border-red-100">
          <Trash2 size={20} />
          <span>مسح البيانات (منطقة خطر)</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          المسح يشمل الطلاب فقط، ولا يمس الخريجين إلا باختيار «خريجو سنة محددة». إعدادات المدرسة لا تتأثر أبدًا. المسح نهائي — الرجوع ممكن فقط من نسخة احتياطية أو ملف Excel مصدّر.
        </p>
        <Select
          label="نطاق المسح"
          value={delScope}
          onChange={(v) => setDelScope(v as typeof delScope)}
          options={[
            { value: 'all', label: 'كل الصفوف' },
            { value: 'grade', label: 'صف محدد' },
            { value: 'category', label: 'فئة محددة داخل صف محدد' },
            { value: 'grad-year', label: 'خريجو سنة محددة' },
          ]}
        />
        {(delScope === 'grade' || delScope === 'category') && (
          <Select
            label="الصف"
            value={delGrade}
            onChange={(v) => setDelGrade(v as typeof delGrade)}
            options={[
              { value: 'first', label: GRADE_LABELS.first },
              { value: 'second', label: GRADE_LABELS.second },
              { value: 'third', label: GRADE_LABELS.third },
            ]}
          />
        )}
        {delScope === 'category' && (
          <Select
            label="الفئة"
            value={delCategory}
            onChange={setDelCategory}
            options={[...EDUCATION_TYPES]}
          />
        )}
        {delScope === 'grad-year' && (
          <Select
            label="سنة التخرج"
            value={delYear}
            onChange={setDelYear}
            options={gradYears}
            placeholder={gradYears.length === 0 ? 'لا يوجد خريجون بعد' : 'اختر سنة التخرج'}
          />
        )}
        <div className="bg-red-50 rounded-xl p-4 text-sm text-red-800">
          {affectedCount === null
            ? 'اختر النطاق لعرض عدد السجلات التي سيتم مسحها.'
            : `سيتم مسح ${affectedCount} ${delScope === 'grad-year' ? 'خريجًا' : 'طالبًا'} من (${delScopeLabel()}).`}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportScope}
            disabled={!canAct}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-50 disabled:opacity-50"
          >
            <Download size={18} />
            تصدير النطاق أولًا
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={!canAct || deleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 size={18} />
            {deleting ? 'جاري المسح...' : 'مسح النطاق'}
          </button>
        </div>
        {deleteResult && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">{deleteResult}</p>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="تأكيد المسح النهائي"
        message={`سيتم مسح ${affectedCount ?? 0} ${delScope === 'grad-year' ? 'خريجًا' : 'طالبًا'} نهائيًا من (${delScopeLabel()}). إعدادات المدرسة لن تتأثر. لا يمكن التراجع عن هذا الإجراء — الرجوع ممكن فقط من نسخة احتياطية أو ملف Excel مصدّر.`}
        confirmText="مسح نهائي"
        onConfirm={handleDeleteScope}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="mt-4 bg-blue-50 rounded-xl p-4 text-sm text-blue-800 border border-blue-100">
        <p className="font-medium mb-1">ملاحظة</p>
        <p className="text-blue-600 text-xs leading-relaxed">
          هذه البيانات تظهر تلقائياً في جميع التقارير وبطاقات الطلاب. يتم حفظها مرة واحدة فقط.
        </p>
      </div>
    </div>
  );
}
