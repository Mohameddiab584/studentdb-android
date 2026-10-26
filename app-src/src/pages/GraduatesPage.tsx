import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Download, Trash2 } from 'lucide-react';
import { supabase, type Graduate } from '../lib/supabase';
import { exportStudentsToExcel } from '../lib/excel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Input } from '../components/Input';
import { Select } from '../components/Select';

type Props = {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

export function GraduatesPage({ showToast }: Props) {
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [yearFilter, setYearFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Graduate | null>(null);

  const load = async () => {
    const { data } = await supabase.from('graduates').select('*').order('graduation_year').order('name');
    setGraduates((data || []) as Graduate[]);
  };

  useEffect(() => {
    load();
  }, []);

  const years = useMemo(
    () => [...new Set(graduates.map((g) => g.graduation_year).filter(Boolean))].sort(),
    [graduates],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    return graduates.filter((g) => {
      if (yearFilter !== 'all' && g.graduation_year !== yearFilter) return false;
      if (q && !`${g.name} ${g.code} ${g.national_id}`.includes(q)) return false;
      return true;
    });
  }, [graduates, yearFilter, query]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('graduates').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('حدث خطأ أثناء الحذف', 'error');
    } else {
      showToast('تم حذف الخريج بنجاح');
      await load();
    }
    setDeleteTarget(null);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'info');
      return;
    }
    exportStudentsToExcel(filtered, 'الخريجين.xlsx', 'الخريجين', {
      header: 'سنة التخرج',
      value: (s) => (s as unknown as Graduate).graduation_year || '',
    });
    showToast('تم تصدير بيانات الخريجين بنجاح');
  };

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center">
          <GraduationCap size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الخريجون</h1>
          <p className="text-sm text-slate-500">طلاب الصف الثالث الناجحون الذين تم ترحيلهم من البرنامج — بياناتهم محفوظة هنا للرجوع إليها</p>
        </div>
      </div>

      {years.length > 2 && (
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800 border border-amber-200 leading-relaxed mb-6">
          تنبيه: لديك خريجون من {years.length} سنوات ({years.join('، ')}). يُنصح بالاحتفاظ بسنتين على الأكثر: صدّر أقدم سنة من هنا أو من الإعدادات ثم امسحها — ولا يتم مسح أي خريج تلقائيًا أبدًا.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Select
            label="سنة التخرج"
            value={yearFilter}
            onChange={setYearFilter}
            options={[{ value: 'all', label: 'كل السنوات' }, ...years.map((y) => ({ value: y, label: y }))]}
          />
          <Input
            label="بحث"
            value={query}
            onChange={setQuery}
            placeholder="الاسم أو الكود أو الرقم القومي"
            className="md:col-span-2"
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Download size={18} />
            تصدير المعروض ({filtered.length})
          </button>
          <span className="text-sm text-slate-500">إجمالي الخريجين: {graduates.length}</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">لا يوجد خريجون مطابقون.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-500 border-b">
                  <th className="py-2 pl-3">الكود</th>
                  <th className="py-2 pl-3">الاسم</th>
                  <th className="py-2 pl-3">الرقم القومي</th>
                  <th className="py-2 pl-3">سنة التخرج</th>
                  <th className="py-2 pl-3">نوع التعليم</th>
                  <th className="py-2 pl-3">الفصل</th>
                  <th className="py-2 pl-3">المسار / الشعبة</th>
                  <th className="py-2 pl-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 hover:bg-slate-50">
                    <td className="py-2 pl-3">{g.code}</td>
                    <td className="py-2 pl-3 font-medium">{g.name}</td>
                    <td className="py-2 pl-3">{g.national_id}</td>
                    <td className="py-2 pl-3">{g.graduation_year}</td>
                    <td className="py-2 pl-3">{g.education_type || '—'}</td>
                    <td className="py-2 pl-3">{g.classroom || '—'}</td>
                    <td className="py-2 pl-3">{g.track || g.division || '—'}</td>
                    <td className="py-2 pl-3">
                      <button
                        onClick={() => setDeleteTarget(g)}
                        title="حذف"
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="تأكيد حذف الخريج"
        message={`هل أنت متأكد من حذف الخريج "${deleteTarget?.name}" (كود: ${deleteTarget?.code}، سنة التخرج: ${deleteTarget?.graduation_year})؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
