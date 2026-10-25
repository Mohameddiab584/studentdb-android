import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Download, Users, X, Search } from 'lucide-react';
import { supabase, type Student, type StudentInput } from '../lib/supabase';
import { GRADE_LABELS, FIELD_LABELS } from '../lib/constants';
import { formatDate } from '../lib/nationalId';
import { exportStudentsToExcel } from '../lib/excel';
import { StudentForm } from '../components/StudentForm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Select } from '../components/Select';
import { EDUCATION_TYPES } from '../lib/constants';
import type { SchoolSettings } from '../lib/reportUtils';

type Props = {
  grade: 'first' | 'second' | 'third';
  settings: SchoolSettings | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

const ALL_TABLE_FIELDS = [
  'serial', 'code', 'name', 'national_id', 'gender', 'birth_date',
  'second_language', 'classroom', 'education_type', 'enrollment_status',
  'guardian_name', 'mother_name', 'phone',
];

export function GradePage({ grade, settings, showToast }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEducation, setFilterEducation] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('grade', grade)
      .order('serial', { ascending: true, nullsFirst: false });
    if (error) {
      showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  }, [grade, showToast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSave = async (data: StudentInput) => {
    const payload = { ...data, grade };
    if (editing) {
      const { error } = await supabase.from('students').update(payload).eq('id', editing.id);
      if (error) {
        if (error.code === '23505') {
          showToast('الرقم القومي مكرر - يجب أن يكون فريداً', 'error');
        } else {
          showToast('حدث خطأ أثناء التعديل', 'error');
        }
        return;
      }
      showToast('تم تعديل البيانات بنجاح');
    } else {
      const { error } = await supabase.from('students').insert(payload);
      if (error) {
        if (error.code === '23505') {
          showToast('الرقم القومي مكرد - يجب أن يكون فريداً', 'error');
        } else {
          showToast('حدث خطأ أثناء الإضافة', 'error');
        }
        return;
      }
      showToast('تم إضافة الطالب بنجاح');
    }
    setShowForm(false);
    setEditing(null);
    loadStudents();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('students').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('حدث خطأ أثناء الحذف', 'error');
    } else {
      showToast('تم حذف الطالب بنجاح');
      loadStudents();
    }
    setDeleteTarget(null);
  };

  const handleExport = () => {
    if (students.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'info');
      return;
    }
    exportStudentsToExcel(students, `${GRADE_LABELS[grade]}.xlsx`, GRADE_LABELS[grade]);
    showToast('تم تصدير البيانات إلى Excel');
  };

  const filtered = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.national_id.includes(q);
    const matchesEdu = !filterEducation || s.education_type === filterEducation;
    return matchesSearch && matchesEdu;
  });

  const males = filtered.filter((s) => s.gender === 'ذكر').length;
  const females = filtered.filter((s) => s.gender === 'أنثى').length;

  const gradeColors: Record<string, string> = {
    first: 'from-blue-600 to-blue-700',
    second: 'from-emerald-600 to-emerald-700',
    third: 'from-amber-600 to-amber-700',
  };

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradeColors[grade]} flex items-center justify-center`}>
            <Users size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{GRADE_LABELS[grade]}</h1>
            <p className="text-sm text-slate-500">إدارة بيانات الطلاب - {filtered.length} طالب</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Download size={18} />
            تصدير Excel
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus size={18} />
            إضافة طالب
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-1">ذكور</p>
          <p className="text-2xl font-bold text-blue-700">{males}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-1">إناث</p>
          <p className="text-2xl font-bold text-pink-700">{females}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-1">الإجمالي</p>
          <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الكود أو الرقم القومي..."
            className="w-full rounded-xl border border-gray-300 bg-white pr-10 pl-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>
        <div className="w-48">
          <Select
            value={filterEducation}
            onChange={setFilterEducation}
            options={EDUCATION_TYPES}
            placeholder="كل أنواع التعليم"
          />
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-bold text-lg text-slate-800">
                {editing ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'} - {GRADE_LABELS[grade]}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <StudentForm
                grade={grade}
                initialData={editing}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">لا توجد بيانات. اضغط "إضافة طالب" لبدء الإدخال</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  {ALL_TABLE_FIELDS.map((f) => (
                    <th key={f} className="px-3 py-3 text-center font-bold text-slate-600 whitespace-nowrap">
                      {FIELD_LABELS[f]}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-slate-600">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    {ALL_TABLE_FIELDS.map((f) => {
                      let val: string = '';
                      if (f === 'serial') val = String(i + 1);
                      else if (f === 'birth_date') val = formatDate(s.birth_date);
                      else val = String((s as unknown as Record<string, string | number>)[f] ?? '');
                      return (
                        <td key={f} className="px-3 py-2.5 text-center text-slate-700 whitespace-nowrap">
                          {val || '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditing(s); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                          title="تعديل"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="تأكيد حذف الطالب"
        message={`هل أنت متأكد من حذف الطالب "${deleteTarget?.name}" (كود: ${deleteTarget?.code})؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
