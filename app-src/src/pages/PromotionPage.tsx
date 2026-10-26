import { useEffect, useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { supabase, type Student, type Graduate } from '../lib/supabase';
import { GRADE_LABELS } from '../lib/constants';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Input } from '../components/Input';

type Props = {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

type Grade = 'first' | 'second' | 'third';

const DEST_LABEL: Record<Grade, string> = {
  first: 'الصف الثاني الثانوي',
  second: 'الصف الثالث الثانوي',
  third: 'الخريجين',
};

// Classroom codes carry the grade as a prefix ("1/1" -> "2/1").
// Anything that doesn't match the expected prefix is left alone.
function bumpClassroom(classroom: string, from: string, to: string): string {
  if (classroom.startsWith(from + '/')) return to + classroom.slice(1);
  return classroom;
}

export function PromotionPage({ showToast }: Props) {
  const [source, setSource] = useState<Grade>('first');
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [year, setYear] = useState('');
  const [gradYears, setGradYears] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const loadStudents = async (g: Grade) => {
    const { data } = await supabase.from('students').select('*').eq('grade', g).order('name');
    setStudents((data || []) as Student[]);
    setSelected(new Set());
  };

  const loadGradYears = async () => {
    const { data } = await supabase.from('graduates').select('graduation_year');
    const years = [...new Set(((data || []) as { graduation_year: string }[]).map((r) => r.graduation_year).filter(Boolean))].sort();
    setGradYears(years);
  };

  useEffect(() => {
    loadStudents(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => {
    loadGradYears();
  }, []);

  const repeaters = students.filter((s) => s.enrollment_status === 'باقي للاعادة');
  const wouldExceedTwoYears =
    source === 'third' && year.trim() !== '' && !gradYears.includes(year.trim()) && gradYears.length >= 2;

  const toggleAll = () => {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map((s) => s.id)));
  };

  const excludeRepeaters = () => {
    const next = new Set(selected);
    for (const s of repeaters) next.delete(s.id);
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const confirmMessage = () => {
    const n = selected.size;
    let msg = `سيتم ترحيل ${n} طالبًا من ${GRADE_LABELS[source]} إلى ${DEST_LABEL[source]}.`;
    if (source === 'first') {
      msg += ' سيُترك المسار والمادة الاختيارية فارغين لتكملهما لاحقًا من التعديل.';
    } else if (source === 'second') {
      msg += ' سيُحتفظ بالمسار والمادة الاختيارية كما هما.';
    } else {
      msg += ` وستُسجل سنة تخرجهم: ${year.trim()}.`;
      if (wouldExceedTwoYears) {
        msg += ` تنبيه: لديك خريجون من ${gradYears.length} سنوات، وبإضافة سنة جديدة سيصبح لديك ${gradYears.length + 1} سنوات. يُنصح بتصدير أقدم سنة ومسحها من الإعدادات — ولن يتم مسح أي خريج تلقائيًا.`;
      }
    }
    msg += ' الطلاب غير المحددين سيبقون في صفهم الحالي.';
    return msg;
  };

  const execute = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setSummary(null);
    const targets = students.filter((s) => selected.has(s.id));
    let done = 0;
    let failed = 0;

    if (source === 'third') {
      const gradYear = year.trim();
      for (const s of targets) {
        const grad: Graduate = { ...s, graduation_year: gradYear };
        const { error: insErr } = await supabase.from('graduates').insert(grad);
        if (insErr) {
          failed++;
          continue;
        }
        const { error: delErr } = await supabase.from('students').delete().eq('id', s.id);
        if (delErr) failed++;
        else done++;
      }
    } else {
      const to = source === 'first' ? 'second' : 'third';
      const fromPrefix = source === 'first' ? '1' : '2';
      const toPrefix = source === 'first' ? '2' : '3';
      for (const s of targets) {
        const patch: Record<string, unknown> = {
          grade: to,
          classroom: bumpClassroom(s.classroom || '', fromPrefix, toPrefix),
        };
        if (source === 'first') {
          patch.track = '';
          patch.elective_subject = '';
        }
        const { error } = await supabase.from('students').update(patch).eq('id', s.id);
        if (error) failed++;
        else done++;
      }
    }

    setBusy(false);
    const msg = `تم ترحيل ${done} طالبًا من ${GRADE_LABELS[source]} إلى ${DEST_LABEL[source]}${failed > 0 ? `، وتعذر ترحيل ${failed} طالبًا` : ''}.`;
    setSummary(msg);
    showToast(msg, failed > 0 ? 'error' : 'success');
    await loadStudents(source);
    if (source === 'third') await loadGradYears();
  };

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
          <ArrowUpCircle size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ترحيل الطلاب</h1>
          <p className="text-sm text-slate-500">ترحيل الناجحين إلى الصف الأعلى، أو نقل طلاب الثالث إلى الخريجين</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الصف المراد ترحيل طلابه</label>
          <div className="grid grid-cols-3 gap-2">
            {(['first', 'second', 'third'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setSource(g)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  source === g
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 border border-blue-100">
          سيتم ترحيل المحددين من <b>{GRADE_LABELS[source]}</b> إلى <b>{DEST_LABEL[source]}</b>
          {source === 'first' && '، مع ترك المسار والمادة الاختيارية فارغين.'}
          {source === 'second' && '، مع الاحتفاظ بالمسار والمادة الاختيارية كما هما.'}
        </div>

        {source === 'third' && (
          <Input
            label="سنة التخرج"
            value={year}
            onChange={setYear}
            placeholder="مثال: 2026"
            required
          />
        )}

        {source === 'third' && wouldExceedTwoYears && (
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800 border border-amber-200 leading-relaxed">
            تنبيه: لديك خريجون من {gradYears.length} سنوات ({gradYears.join('، ')})، وبإضافة سنة جديدة سيصبح لديك {gradYears.length + 1} سنوات.
            يُنصح بتصدير أقدم سنة ومسحها من صفحة الإعدادات — ولن يتم مسح أي خريج تلقائيًا أبدًا.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={toggleAll}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
          >
            {selected.size === students.length && students.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </button>
          <button
            onClick={excludeRepeaters}
            disabled={repeaters.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 disabled:opacity-50"
          >
            استبعاد الباقين للإعادة ({repeaters.length})
          </button>
          <span className="text-sm text-slate-500 mr-auto">
            إجمالي {students.length} طالبًا — المحدد {selected.size}
          </span>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">لا يوجد طلاب في {GRADE_LABELS[source]}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-500 border-b">
                  <th className="py-2 pl-3"></th>
                  <th className="py-2 pl-3">الكود</th>
                  <th className="py-2 pl-3">الاسم</th>
                  <th className="py-2 pl-3">الفصل</th>
                  <th className="py-2 pl-3">نوع التعليم</th>
                  <th className="py-2 pl-3">حالة القيد</th>
                  <th className="py-2 pl-3">المسار / الشعبة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-slate-50">
                    <td className="py-2 pl-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleOne(s.id)}
                        className="w-4 h-4 accent-blue-700 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 pl-3">{s.code}</td>
                    <td className="py-2 pl-3 font-medium">{s.name}</td>
                    <td className="py-2 pl-3">{s.classroom || '—'}</td>
                    <td className="py-2 pl-3">{s.education_type || '—'}</td>
                    <td className="py-2 pl-3">{s.enrollment_status || '—'}</td>
                    <td className="py-2 pl-3">{s.track || s.division || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={busy || selected.size === 0 || (source === 'third' && year.trim() === '')}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {busy ? 'جاري الترحيل...' : `ترحيل المحددين (${selected.size})`}
          </button>
        </div>

        {summary && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3 mt-4">{summary}</p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="تأكيد الترحيل"
        message={confirmMessage()}
        confirmText="ترحيل"
        onConfirm={execute}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
