import { useEffect, useState } from 'react';
import { Users, GraduationCap, FileBarChart, Search, TrendingUp, BookOpen } from 'lucide-react';
import { supabase, type Student, type SchoolSettings } from '../lib/supabase';
import { GRADE_LABELS } from '../lib/constants';
import type { PageKey } from '../components/Layout';

type Props = {
  settings: SchoolSettings | null;
  onNavigate: (page: PageKey) => void;
};

export function Dashboard({ settings, onNavigate }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('students').select('*');
      setStudents(data || []);
      setLoading(false);
    })();
  }, []);

  const firstGrade = students.filter((s) => s.grade === 'first');
  const secondGrade = students.filter((s) => s.grade === 'second');
  const thirdGrade = students.filter((s) => s.grade === 'third');
  const males = students.filter((s) => s.gender === 'ذكر').length;
  const females = students.filter((s) => s.gender === 'أنثى').length;

  const cards = [
    { label: 'الصف الأول', count: firstGrade.length, grade: 'first' as const, color: 'from-blue-500 to-blue-600' },
    { label: 'الصف الثاني', count: secondGrade.length, grade: 'second' as const, color: 'from-emerald-500 to-emerald-600' },
    { label: 'الصف الثالث', count: thirdGrade.length, grade: 'third' as const, color: 'from-amber-500 to-amber-600' },
  ];

  const actions = [
    { label: 'إدخال بيانات الطلاب', icon: Users, page: 'first' as PageKey, desc: 'إضافة وتعديل طلاب الصفوف' },
    { label: 'البحث عن طالب', icon: Search, page: 'search' as PageKey, desc: 'بحث بالكود أو الرقم القومي أو الاسم' },
    { label: 'مركز تقارير زكي', icon: FileBarChart, page: 'reports' as PageKey, desc: 'تقارير وإحصائيات احترافية' },
    { label: 'استيراد Excel', icon: BookOpen, page: 'excel' as PageKey, desc: 'استيراد وتصدير ملفات Excel' },
  ];

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <GraduationCap size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">لوحة التحكم</h1>
            <p className="text-sm text-slate-500">نظام إدارة قاعدة بيانات طلاب الثانوية العامة</p>
          </div>
        </div>
      </div>

      {/* School info banner */}
      {settings && (
        <div className="mb-6 rounded-2xl bg-gradient-to-l from-blue-700 to-slate-800 p-5 text-white shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-right">
            <div>
              <p className="text-xs text-blue-200 mb-1">المدرسة</p>
              <p className="font-bold text-sm">{settings.school_name}</p>
            </div>
            <div>
              <p className="text-xs text-blue-200 mb-1">الإدارة التعليمية</p>
              <p className="font-bold text-sm">{settings.education_administration}</p>
            </div>
            <div>
              <p className="text-xs text-blue-200 mb-1">المحافظة</p>
              <p className="font-bold text-sm">{settings.governorate}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Grade cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {cards.map((c) => (
              <button
                key={c.grade}
                onClick={() => onNavigate(c.grade)}
                className={`bg-gradient-to-br ${c.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] text-right`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Users size={28} className="opacity-80" />
                  <span className="text-4xl font-bold">{c.count}</span>
                </div>
                <p className="font-bold text-lg">{c.label}</p>
                <p className="text-xs text-white/80 mt-1">طالب</p>
              </button>
            ))}
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-blue-600" />
                <span className="text-xs text-gray-500">الإجمالي</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{students.length}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-blue-600" />
                <span className="text-xs text-gray-500">ذكور</span>
              </div>
              <p className="text-3xl font-bold text-blue-700">{males}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-pink-600" />
                <span className="text-xs text-gray-500">إناث</span>
              </div>
              <p className="text-3xl font-bold text-pink-700">{females}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={18} className="text-emerald-600" />
                <span className="text-xs text-gray-500">الصفوف</span>
              </div>
              <p className="text-3xl font-bold text-emerald-700">3</p>
            </div>
          </div>

          {/* Quick actions */}
          <h2 className="text-lg font-bold text-slate-800 mb-4">إجراءات سريعة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => onNavigate(a.page)}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-right group"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                    <Icon size={22} className="text-blue-700" />
                  </div>
                  <p className="font-bold text-sm text-slate-800 mb-1">{a.label}</p>
                  <p className="text-xs text-gray-500">{a.desc}</p>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
