import { useState } from 'react';
import { Search as SearchIcon, Printer, Pencil, Save, X, Trash2, User } from 'lucide-react';
import { supabase, type Student, type StudentInput } from '../lib/supabase';
import { GRADE_LABELS, FIELD_LABELS } from '../lib/constants';
import { formatDate, parseNationalId, isValidNationalId } from '../lib/nationalId';
import { generatePrintableStudentCard, openPrintWindow, type SchoolSettings } from '../lib/reportUtils';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  SECOND_LANGUAGES, EDUCATION_TYPES, ENROLLMENT_STATUSES, TRACKS, TRACK_ELECTIVES,
  DIVISIONS, NATIONALITIES, INTEGRATION_OPTIONS, RELIGIONS, CLASSROOMS,
} from '../lib/constants';

type Props = {
  settings: SchoolSettings | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

export function SearchPage({ settings, showToast }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<StudentInput | null>(null);
  const [editGender, setEditGender] = useState('');
  const [editBirthDate, setEditBirthDate] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .or(`name.ilike.%${q}%,code.ilike.%${q}%,national_id.ilike.%${q}%`)
      .limit(50);
    if (error) {
      showToast('حدث خطأ أثناء البحث', 'error');
    } else {
      setResults(data || []);
    }
    setLoading(false);
  };

  const handlePrint = (student: Student) => {
    const html = generatePrintableStudentCard(student, settings || { school_name: '', education_administration: '', governorate: '' });
    openPrintWindow(html);
  };

  const startEdit = (student: Student) => {
    setEditForm({
      serial: student.serial,
      code: student.code,
      grade: student.grade,
      name: student.name,
      national_id: student.national_id,
      second_language: student.second_language,
      classroom: student.classroom,
      education_type: student.education_type,
      track: student.track,
      elective_subject: student.elective_subject,
      division: student.division,
      guardian_name: student.guardian_name,
      mother_name: student.mother_name,
      phone: student.phone,
      address: student.address,
      enrollment_status: student.enrollment_status,
      nationality: student.nationality,
      integration: student.integration,
      religion: student.religion,
    });
    setEditGender(student.gender);
    setEditBirthDate(student.birth_date);
    setEditing(true);
  };

  const handleEditNationalId = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 14);
    setEditForm((p) => p ? { ...p, national_id: cleaned } : p);
    if (cleaned.length === 14 && isValidNationalId(cleaned)) {
      const { gender, birthDate } = parseNationalId(cleaned);
      setEditGender(gender);
      setEditBirthDate(birthDate);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm || !selected) return;
    const payload = { ...editForm, gender: editGender, birth_date: editBirthDate };
    const { data, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', selected.id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        showToast('الرقم القومي مكرر', 'error');
      } else {
        showToast('حدث خطأ أثناء الحفظ', 'error');
      }
      return;
    }
    if (data) {
      setSelected(data);
      setEditing(false);
      showToast('تم حفظ التعديلات بنجاح');
      handleSearch();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('students').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('حدث خطأ أثناء الحذف', 'error');
    } else {
      showToast('تم حذف الطالب بنجاح');
      setSelected(null);
      setEditing(false);
      setQuery('');
      setResults([]);
      setSearched(false);
    }
    setDeleteTarget(null);
  };

  const cardFields: { label: string; value: string }[] = selected ? [
    { label: 'الكود', value: selected.code },
    { label: 'الرقم القومي', value: selected.national_id },
    { label: 'النوع', value: selected.gender },
    { label: 'تاريخ الميلاد', value: formatDate(selected.birth_date) },
    { label: 'اللغة الأجنبية الثانية', value: selected.second_language },
    { label: 'الفصل', value: selected.classroom },
    { label: 'نوع التعليم', value: selected.education_type },
    ...(selected.grade === 'second' ? [
      { label: 'المسار', value: selected.track },
      { label: 'المادة الاختيارية', value: selected.elective_subject },
    ] : []),
    ...(selected.grade === 'third' ? [{ label: 'الشعبة', value: selected.division }] : []),
    { label: 'حالة القيد', value: selected.enrollment_status },
    { label: 'الجنسية', value: selected.nationality },
    { label: 'الدمج', value: selected.integration },
    { label: 'الديانة', value: selected.religion },
    { label: 'اسم ولي الأمر', value: selected.guardian_name },
    { label: 'اسم الأم', value: selected.mother_name },
    { label: 'رقم التليفون', value: selected.phone },
    { label: 'العنوان', value: selected.address },
  ] : [];

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center">
          <SearchIcon size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">البحث عن طالب</h1>
          <p className="text-sm text-slate-500">ابحث بالكود أو الرقم القومي أو الاسم</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="اكتب الكود أو الرقم القومي أو الاسم..."
              className="w-full rounded-xl border border-gray-300 bg-white pr-10 pl-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-indigo-700 text-white font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'بحث...' : 'بحث'}
          </button>
        </div>
      </div>

      {/* Results list */}
      {searched && !selected && (
        <div>
          <p className="text-sm text-slate-600 mb-3">عدد النتائج: {results.length}</p>
          {results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <User size={48} className="mx-auto mb-3 opacity-40" />
              <p>لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-right hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <User size={18} className="text-indigo-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-500">كود: {s.code}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{GRADE_LABELS[s.grade]}</span>
                    {s.education_type && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{s.education_type}</span>}
                    {s.gender && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{s.gender}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student card view */}
      {selected && !editing && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-l from-indigo-700 to-slate-800 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <User size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    <p className="text-sm text-indigo-200">{GRADE_LABELS[selected.grade]} - كود: {selected.code}</p>
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setSearched(true); }} className="p-2 rounded-lg hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cardFields.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <span className="text-xs font-bold text-slate-500 w-32 shrink-0">{f.label}</span>
                    <span className="text-sm text-slate-800 font-medium">{f.value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => startEdit(selected)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
                >
                  <Pencil size={16} />
                  تعديل
                </button>
                <button
                  onClick={() => handlePrint(selected)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  <Printer size={16} />
                  طباعة البطاقة
                </button>
                <button
                  onClick={() => setDeleteTarget(selected)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {selected && editing && editForm && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <h2 className="font-bold text-lg text-slate-800">تعديل بيانات الطالب</h2>
            <button onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="م" type="number" value={editForm.serial ?? ''} onChange={(v) => setEditForm((p) => p ? { ...p, serial: v ? parseInt(v) : null } : p)} />
            <Input label="الكود" value={editForm.code} onChange={(v) => setEditForm((p) => p ? { ...p, code: v } : p)} required />
            <Input label="الاسم" value={editForm.name} onChange={(v) => setEditForm((p) => p ? { ...p, name: v } : p)} required />
            <Input label="الرقم القومي" value={editForm.national_id} onChange={handleEditNationalId} maxLength={14} required />
            <Input label="النوع (تلقائي)" value={editGender} onChange={() => {}} readOnly />
            <Input label="تاريخ الميلاد (تلقائي)" value={editBirthDate ? formatDate(editBirthDate) : ''} onChange={() => {}} readOnly />
            <Select label="اللغة الأجنبية الثانية" value={editForm.second_language} onChange={(v) => setEditForm((p) => p ? { ...p, second_language: v } : p)} options={SECOND_LANGUAGES} />
            <Select label="الفصل" value={editForm.classroom} onChange={(v) => setEditForm((p) => p ? { ...p, classroom: v } : p)} options={CLASSROOMS} />
            <Select label="نوع التعليم" value={editForm.education_type} onChange={(v) => setEditForm((p) => p ? { ...p, education_type: v } : p)} options={EDUCATION_TYPES} />
            {selected.grade === 'second' && (
              <>
                <Select label="المسار" value={editForm.track} onChange={(v) => setEditForm((p) => p ? { ...p, track: v, elective_subject: '' } : p)} options={TRACKS} />
                <Select label="المادة الاختيارية" value={editForm.elective_subject} onChange={(v) => setEditForm((p) => p ? { ...p, elective_subject: v } : p)} options={editForm.track ? TRACK_ELECTIVES[editForm.track] || [] : []} />
              </>
            )}
            {selected.grade === 'third' && (
              <Select label="الشعبة" value={editForm.division} onChange={(v) => setEditForm((p) => p ? { ...p, division: v } : p)} options={DIVISIONS} />
            )}
            <Input label="اسم ولي الأمر" value={editForm.guardian_name} onChange={(v) => setEditForm((p) => p ? { ...p, guardian_name: v } : p)} />
            <Input label="اسم الأم" value={editForm.mother_name} onChange={(v) => setEditForm((p) => p ? { ...p, mother_name: v } : p)} />
            <Input label="رقم التليفون" value={editForm.phone} onChange={(v) => setEditForm((p) => p ? { ...p, phone: v } : p)} maxLength={11} />
            <Input label="العنوان" value={editForm.address} onChange={(v) => setEditForm((p) => p ? { ...p, address: v } : p)} className="sm:col-span-2" />
            <Select label="حالة القيد" value={editForm.enrollment_status} onChange={(v) => setEditForm((p) => p ? { ...p, enrollment_status: v } : p)} options={ENROLLMENT_STATUSES} />
            <Select label="الجنسية" value={editForm.nationality} onChange={(v) => setEditForm((p) => p ? { ...p, nationality: v } : p)} options={NATIONALITIES} />
            <Select label="الدمج" value={editForm.integration} onChange={(v) => setEditForm((p) => p ? { ...p, integration: v } : p)} options={INTEGRATION_OPTIONS} />
            <Select label="الديانة" value={editForm.religion} onChange={(v) => setEditForm((p) => p ? { ...p, religion: v } : p)} options={RELIGIONS} />
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button onClick={handleSaveEdit} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">
              <Save size={18} />
              حفظ التعديلات
            </button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              <X size={18} />
              إلغاء
            </button>
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
