import { useState, useEffect, useCallback } from 'react';
import { User, Save, X, RotateCcw } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import {
  SECOND_LANGUAGES,
  EDUCATION_TYPES,
  ENROLLMENT_STATUSES,
  TRACKS,
  TRACK_ELECTIVES,
  DIVISIONS,
  NATIONALITIES,
  INTEGRATION_OPTIONS,
  RELIGIONS,
  CLASSROOMS,
} from '../lib/constants';
import { parseNationalId, isValidNationalId, formatDate } from '../lib/nationalId';
import type { Student, StudentInput } from '../lib/supabase';

type Props = {
  grade: 'first' | 'second' | 'third';
  initialData?: Student | null;
  onSave: (data: StudentInput) => Promise<void>;
  onCancel: () => void;
};

export function StudentForm({ grade, initialData, onSave, onCancel }: Props) {
  const [form, setForm] = useState<StudentInput>({
    serial: null,
    code: '',
    grade,
    name: '',
    national_id: '',
    second_language: '',
    classroom: '',
    education_type: '',
    track: '',
    elective_subject: '',
    division: '',
    guardian_name: '',
    mother_name: '',
    phone: '',
    address: '',
    enrollment_status: '',
    nationality: 'مصري',
    integration: 'لا يوجد',
    religion: 'مسلم',
  });
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nationalIdError, setNationalIdError] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm({
        serial: initialData.serial,
        code: initialData.code,
        grade: initialData.grade,
        name: initialData.name,
        national_id: initialData.national_id,
        second_language: initialData.second_language,
        classroom: initialData.classroom,
        education_type: initialData.education_type,
        track: initialData.track,
        elective_subject: initialData.elective_subject,
        division: initialData.division,
        guardian_name: initialData.guardian_name,
        mother_name: initialData.mother_name,
        phone: initialData.phone,
        address: initialData.address,
        enrollment_status: initialData.enrollment_status,
        nationality: initialData.nationality,
        integration: initialData.integration,
        religion: initialData.religion,
      });
      setGender(initialData.gender);
      setBirthDate(initialData.birth_date);
    }
  }, [initialData]);

  const update = useCallback((field: keyof StudentInput, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleNationalIdChange = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 14);
    update('national_id', cleaned);
    if (cleaned.length === 14 && isValidNationalId(cleaned)) {
      const { gender: g, birthDate: bd } = parseNationalId(cleaned);
      setGender(g);
      setBirthDate(bd);
      setNationalIdError('');
    } else if (cleaned.length === 14) {
      setNationalIdError('الرقم القومي غير صحيح');
      setGender('');
      setBirthDate(null);
    } else {
      setGender('');
      setBirthDate(null);
      setNationalIdError('');
    }
  }, [update]);

  const handleTrackChange = useCallback((value: string) => {
    update('track', value);
    update('elective_subject', '');
  }, [update]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return;
    if (!form.name.trim()) return;
    if (!isValidNationalId(form.national_id)) {
      setNationalIdError('الرقم القومي يجب أن يكون 14 رقماً');
      return;
    }
    setSaving(true);
    const data: StudentInput = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      gender,
      birth_date: birthDate,
    };
    await onSave(data);
    setSaving(false);
  };

  const handleReset = () => {
    setForm({
      serial: null,
      code: '',
      grade,
      name: '',
      national_id: '',
      second_language: '',
      classroom: '',
      education_type: '',
      track: '',
      elective_subject: '',
      division: '',
      guardian_name: '',
      mother_name: '',
      phone: '',
      address: '',
      enrollment_status: '',
      nationality: 'مصري',
      integration: 'لا يوجد',
      religion: 'مسلم',
    });
    setGender('');
    setBirthDate(null);
    setNationalIdError('');
  };

  const electives = form.track ? TRACK_ELECTIVES[form.track] || [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 text-blue-800 font-bold text-lg pb-3 border-b border-gray-200">
        <User size={22} />
        <span>بيانات الطالب</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="م (المسلسل)"
          type="number"
          value={form.serial ?? ''}
          onChange={(v) => update('serial', v ? parseInt(v, 10) : null)}
          placeholder="يدوي"
        />
        <Input
          label="الكود"
          value={form.code}
          onChange={(v) => update('code', v)}
          placeholder="كود الطالب"
          required
        />
        <Input
          label="الاسم"
          value={form.name}
          onChange={(v) => update('name', v)}
          placeholder="اسم الطالب رباعي"
          required
        />
        <div>
          <Input
            label="الرقم القومي"
            value={form.national_id}
            onChange={handleNationalIdChange}
            placeholder="14 رقم"
            maxLength={14}
            required
          />
          {nationalIdError && <p className="text-xs text-red-500 mt-1">{nationalIdError}</p>}
        </div>
        <Input
          label="النوع (تلقائي)"
          value={gender}
          onChange={() => {}}
          readOnly
          placeholder="يستخرج من الرقم القومي"
        />
        <Input
          label="تاريخ الميلاد (تلقائي)"
          value={birthDate ? formatDate(birthDate) : ''}
          onChange={() => {}}
          readOnly
          placeholder="يستخرج من الرقم القومي"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Select
          label="اللغة الأجنبية الثانية"
          value={form.second_language}
          onChange={(v) => update('second_language', v)}
          options={SECOND_LANGUAGES}
        />
        <Select
          label="الفصل"
          value={form.classroom}
          onChange={(v) => update('classroom', v)}
          options={CLASSROOMS}
          placeholder="اختر الفصل"
        />
        <Select
          label="نوع التعليم"
          value={form.education_type}
          onChange={(v) => update('education_type', v)}
          options={EDUCATION_TYPES}
        />
      </div>

      {grade === 'second' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
          <Select
            label="المسار"
            value={form.track}
            onChange={handleTrackChange}
            options={TRACKS}
            placeholder="اختر المسار"
          />
          <Select
            label="المادة الاختيارية (مرتبطة بالمسار)"
            value={form.elective_subject}
            onChange={(v) => update('elective_subject', v)}
            options={electives}
            placeholder={form.track ? 'اختر المادة' : 'اختر المسار أولاً'}
          />
        </div>
      )}

      {grade === 'third' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
          <Select
            label="الشعبة"
            value={form.division}
            onChange={(v) => update('division', v)}
            options={DIVISIONS}
            placeholder="اختر الشعبة"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="اسم ولي الأمر"
          value={form.guardian_name}
          onChange={(v) => update('guardian_name', v)}
          placeholder="اسم ولي الأمر"
        />
        <Input
          label="اسم الأم"
          value={form.mother_name}
          onChange={(v) => update('mother_name', v)}
          placeholder="اسم الأم"
        />
        <Input
          label="رقم التليفون"
          value={form.phone}
          onChange={(v) => update('phone', v)}
          placeholder="رقم التليفون"
          maxLength={11}
        />
        <Input
          label="العنوان"
          value={form.address}
          onChange={(v) => update('address', v)}
          placeholder="العنوان"
          className="lg:col-span-2"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="حالة القيد"
          value={form.enrollment_status}
          onChange={(v) => update('enrollment_status', v)}
          options={ENROLLMENT_STATUSES}
        />
        <Select
          label="الجنسية"
          value={form.nationality}
          onChange={(v) => update('nationality', v)}
          options={NATIONALITIES}
        />
        <Select
          label="الدمج"
          value={form.integration}
          onChange={(v) => update('integration', v)}
          options={INTEGRATION_OPTIONS}
        />
        <Select
          label="الديانة"
          value={form.religion}
          onChange={(v) => update('religion', v)}
          options={RELIGIONS}
        />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={18} />
          مسح
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <X size={18} />
          إلغاء
        </button>
      </div>
    </form>
  );
}
