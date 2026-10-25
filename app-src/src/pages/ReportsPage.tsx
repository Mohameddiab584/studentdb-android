import { useEffect, useState, useMemo } from 'react';
import {
  FileBarChart, Printer, FileSpreadsheet, Eye, EyeOff, ChevronLeft, FileText,
} from 'lucide-react';
import { supabase, type Student } from '../lib/supabase';
import {
  GRADE_LABELS, FIELD_LABELS, ALL_REPORT_FIELDS, DEFAULT_REPORT_FIELDS, TRACKS,
} from '../lib/constants';
import { formatDate } from '../lib/nationalId';
import { exportCustomReport } from '../lib/excel';
import {
  generatePrintableReport, openPrintWindow, computeStats, type SchoolSettings,
} from '../lib/reportUtils';

type Props = {
  settings: SchoolSettings | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

type ReportDef = {
  id: string;
  title: string;
  grade: 'first' | 'second' | 'third' | 'all';
  educationType?: string;
  track?: string;
  division?: string;
  category: string;
};

const REPORT_DEFS: ReportDef[] = [
  // First grade
  { id: 'f_regular', title: 'الصف الأول - انتظام', grade: 'first', educationType: 'انتظام', category: 'الصف الأول' },
  { id: 'f_home', title: 'الصف الأول - منازل', grade: 'first', educationType: 'منازل', category: 'الصف الأول' },
  { id: 'f_services', title: 'الصف الأول - خدمات', grade: 'first', educationType: 'خدمات', category: 'الصف الأول' },
  // Second grade - regular
  { id: 's_reg_all', title: 'الصف الثاني انتظام - كامل', grade: 'second', educationType: 'انتظام', category: 'الصف الثاني - انتظام' },
  { id: 's_reg_med', title: 'الصف الثاني انتظام - الطب وعلوم الحياة', grade: 'second', educationType: 'انتظام', track: 'الطب وعلوم الحياة', category: 'الصف الثاني - انتظام' },
  { id: 's_reg_eng', title: 'الصف الثاني انتظام - الهندسة وعلوم الحاسب', grade: 'second', educationType: 'انتظام', track: 'الهندسة وعلوم الحاسب', category: 'الصف الثاني - انتظام' },
  { id: 's_reg_bus', title: 'الصف الثاني انتظام - إدارة الأعمال', grade: 'second', educationType: 'انتظام', track: 'إدارة الأعمال', category: 'الصف الثاني - انتظام' },
  { id: 's_reg_art', title: 'الصف الثاني انتظام - الآداب والفنون', grade: 'second', educationType: 'انتظام', track: 'الآداب والفنون', category: 'الصف الثاني - انتظام' },
  // Second grade - home
  { id: 's_home_all', title: 'الصف الثاني منازل - كامل', grade: 'second', educationType: 'منازل', category: 'الصف الثاني - منازل' },
  { id: 's_home_med', title: 'الصف الثاني منازل - الطب وعلوم الحياة', grade: 'second', educationType: 'منازل', track: 'الطب وعلوم الحياة', category: 'الصف الثاني - منازل' },
  { id: 's_home_eng', title: 'الصف الثاني منازل - الهندسة وعلوم الحاسب', grade: 'second', educationType: 'منازل', track: 'الهندسة وعلوم الحاسب', category: 'الصف الثاني - منازل' },
  { id: 's_home_bus', title: 'الصف الثاني منازل - إدارة الأعمال', grade: 'second', educationType: 'منازل', track: 'إدارة الأعمال', category: 'الصف الثاني - منازل' },
  { id: 's_home_art', title: 'الصف الثاني منازل - الآداب والفنون', grade: 'second', educationType: 'منازل', track: 'الآداب والفنون', category: 'الصف الثاني - منازل' },
  // Second grade - services
  { id: 's_srv_all', title: 'الصف الثاني خدمات - كامل', grade: 'second', educationType: 'خدمات', category: 'الصف الثاني - خدمات' },
  { id: 's_srv_med', title: 'الصف الثاني خدمات - الطب وعلوم الحياة', grade: 'second', educationType: 'خدمات', track: 'الطب وعلوم الحياة', category: 'الصف الثاني - خدمات' },
  { id: 's_srv_eng', title: 'الصف الثاني خدمات - الهندسة وعلوم الحاسب', grade: 'second', educationType: 'خدمات', track: 'الهندسة وعلوم الحاسب', category: 'الصف الثاني - خدمات' },
  { id: 's_srv_bus', title: 'الصف الثاني خدمات - إدارة الأعمال', grade: 'second', educationType: 'خدمات', track: 'إدارة الأعمال', category: 'الصف الثاني - خدمات' },
  { id: 's_srv_art', title: 'الصف الثاني خدمات - الآداب والفنون', grade: 'second', educationType: 'خدمات', track: 'الآداب والفنون', category: 'الصف الثاني - خدمات' },
  // Third grade
  { id: 't_reg_all', title: 'الصف الثالث انتظام - كامل', grade: 'third', educationType: 'انتظام', category: 'الصف الثالث - انتظام' },
  { id: 't_reg_sci', title: 'الصف الثالث انتظام - علمي علوم', grade: 'third', educationType: 'انتظام', division: 'علمي علوم', category: 'الصف الثالث - انتظام' },
  { id: 't_reg_math', title: 'الصف الثالث انتظام - علمي رياضيات', grade: 'third', educationType: 'انتظام', division: 'علمي رياضيات', category: 'الصف الثالث - انتظام' },
  { id: 't_reg_lit', title: 'الصف الثالث انتظام - أدبي', grade: 'third', educationType: 'انتظام', division: 'أدبي', category: 'الصف الثالث - انتظام' },
  { id: 't_home_all', title: 'الصف الثالث منازل - كامل', grade: 'third', educationType: 'منازل', category: 'الصف الثالث - منازل' },
  { id: 't_home_sci', title: 'الصف الثالث منازل - علمي علوم', grade: 'third', educationType: 'منازل', division: 'علمي علوم', category: 'الصف الثالث - منازل' },
  { id: 't_home_math', title: 'الصف الثالث منازل - علمي رياضيات', grade: 'third', educationType: 'منازل', division: 'علمي رياضيات', category: 'الصف الثالث - منازل' },
  { id: 't_home_lit', title: 'الصف الثالث منازل - أدبي', grade: 'third', educationType: 'منازل', division: 'أدبي', category: 'الصف الثالث - منازل' },
  { id: 't_srv_all', title: 'الصف الثالث خدمات - كامل', grade: 'third', educationType: 'خدمات', category: 'الصف الثالث - خدمات' },
  { id: 't_srv_sci', title: 'الصف الثالث خدمات - علمي علوم', grade: 'third', educationType: 'خدمات', division: 'علمي علوم', category: 'الصف الثالث - خدمات' },
  { id: 't_srv_math', title: 'الصف الثالث خدمات - علمي رياضيات', grade: 'third', educationType: 'خدمات', division: 'علمي رياضيات', category: 'الصف الثالث - خدمات' },
  { id: 't_srv_lit', title: 'الصف الثالث خدمات - أدبي', grade: 'third', educationType: 'خدمات', division: 'أدبي', category: 'الصف الثالث - خدمات' },
  { id: 't_all', title: 'الصف الثالث كامل (انتظام + منازل + خدمات)', grade: 'third', category: 'الصف الثالث - عام' },
];

function filterStudents(students: Student[], def: ReportDef): Student[] {
  let result = students;
  if (def.grade !== 'all') {
    result = result.filter((s) => s.grade === def.grade);
  }
  if (def.educationType) {
    result = result.filter((s) => s.education_type === def.educationType);
  }
  if (def.track) {
    result = result.filter((s) => s.track === def.track);
  }
  if (def.division) {
    result = result.filter((s) => s.division === def.division);
  }
  return result.sort((a, b) => (a.serial ?? 0) - (b.serial ?? 0));
}

function getReportFields(grade: string): string[] {
  const base = [...DEFAULT_REPORT_FIELDS];
  if (grade === 'second') {
    return [...base, 'track', 'elective_subject'];
  } else if (grade === 'third') {
    return [...base, 'division'];
  }
  return base;
}

export function ReportsPage({ settings, showToast }: Props) {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<ReportDef | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [reportStudents, setReportStudents] = useState<Student[]>([]);

  // Custom report state
  const [customGrade, setCustomGrade] = useState<string>('all');
  const [customEdu, setCustomEdu] = useState<string>('');
  const [customTrack, setCustomTrack] = useState<string>('');
  const [customDivision, setCustomDivision] = useState<string>('');
  const [customFields, setCustomFields] = useState<string[]>([...DEFAULT_REPORT_FIELDS]);
  const [customShowStats, setCustomShowStats] = useState(true);
  const [customResult, setCustomResult] = useState<Student[] | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('students').select('*');
      setAllStudents(data || []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const cats: Record<string, ReportDef[]> = {};
    for (const r of REPORT_DEFS) {
      if (!cats[r.category]) cats[r.category] = [];
      cats[r.category].push(r);
    }
    return cats;
  }, []);

  const handleRunReport = (def: ReportDef) => {
    const filtered = filterStudents(allStudents, def);
    setActiveReport(def);
    setReportStudents(filtered);
    setShowStats(true);
  };

  const handlePrintReport = () => {
    if (!activeReport) return;
    const fields = getReportFields(activeReport.grade);
    const html = generatePrintableReport(
      reportStudents,
      fields,
      activeReport.title,
      settings || { school_name: '', education_administration: '', governorate: '' },
      showStats
    );
    openPrintWindow(html);
  };

  const handleExportReport = () => {
    if (!activeReport) return;
    if (reportStudents.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'info');
      return;
    }
    const fields = getReportFields(activeReport.grade);
    const stats = computeStats(reportStudents);
    exportCustomReport(reportStudents, fields, `${activeReport.title}.xlsx`, activeReport.title, showStats ? stats : undefined);
    showToast('تم تصدير التقرير إلى Excel');
  };

  const handleRunCustomReport = () => {
    let result = allStudents;
    if (customGrade !== 'all') result = result.filter((s) => s.grade === customGrade);
    if (customEdu) result = result.filter((s) => s.education_type === customEdu);
    if (customTrack) result = result.filter((s) => s.track === customTrack);
    if (customDivision) result = result.filter((s) => s.division === customDivision);
    result = [...result].sort((a, b) => (a.serial ?? 0) - (b.serial ?? 0));
    setCustomResult(result);
  };

  const handlePrintCustom = () => {
    if (!customResult) return;
    const html = generatePrintableReport(
      customResult,
      customFields,
      'تقرير مخصص',
      settings || { school_name: '', education_administration: '', governorate: '' },
      customShowStats
    );
    openPrintWindow(html);
  };

  const handleExportCustom = () => {
    if (!customResult || customResult.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'info');
      return;
    }
    const stats = computeStats(customResult);
    exportCustomReport(customResult, customFields, 'تقرير_مخصص.xlsx', 'تقرير مخصص', customShowStats ? stats : undefined);
    showToast('تم تصدير التقرير المخصص');
  };

  const toggleCustomField = (field: string) => {
    setCustomFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const currentFields = activeReport ? getReportFields(activeReport.grade) : [];
  const currentStats = activeReport ? computeStats(reportStudents) : null;

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <FileBarChart size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مركز تقارير زكي</h1>
          <p className="text-sm text-slate-500">تقارير احترافية جاهزة للطباعة والتصدير</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-s-slate-700 rounded-full animate-spin" />
        </div>
      ) : activeReport || (showCustom && customResult) ? (
        /* Report viewer */
        <div>
          <button
            onClick={() => { setActiveReport(null); setCustomResult(null); setShowCustom(false); }}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4 font-medium"
          >
            <ChevronLeft size={18} />
            رجوع لقائمة التقارير
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-lg text-slate-800">
                {activeReport ? activeReport.title : 'تقرير مخصص'}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => activeReport ? setShowStats(!showStats) : setCustomShowStats(!customShowStats)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {((activeReport ? showStats : customShowStats)) ? <EyeOff size={16} /> : <Eye size={16} />}
                  {((activeReport ? showStats : customShowStats)) ? 'إخفاء الإحصائيات' : 'إظهار الإحصائيات'}
                </button>
                <button
                  onClick={activeReport ? handleExportReport : handleExportCustom}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <FileSpreadsheet size={16} />
                  تصدير Excel
                </button>
                <button
                  onClick={activeReport ? handlePrintReport : handlePrintCustom}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  <Printer size={16} />
                  طباعة / PDF
                </button>
              </div>
            </div>

            {/* Stats bar */}
            {((activeReport ? showStats : customShowStats)) && (activeReport ? currentStats : (customResult ? computeStats(customResult) : null)) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {(() => {
                  const stats = activeReport ? currentStats! : computeStats(customResult!);
                  return (
                    <>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-blue-600 mb-1">ذكور</p>
                        <p className="text-xl font-bold text-blue-700">{stats.male}</p>
                      </div>
                      <div className="bg-pink-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-pink-600 mb-1">إناث</p>
                        <p className="text-xl font-bold text-pink-700">{stats.female}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-600 mb-1">الإجمالي</p>
                        <p className="text-xl font-bold text-slate-800">{stats.total}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Report table */}
            <div className="overflow-x-auto">
              {(() => {
                const students = activeReport ? reportStudents : (customResult || []);
                const fields = activeReport ? currentFields : customFields;
                if (students.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400">
                      <FileText size={40} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">لا توجد بيانات في هذا التقرير</p>
                    </div>
                  );
                }
                return (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="px-2 py-2 text-center font-bold text-slate-600">م</th>
                        {fields.map((f) => (
                          <th key={f} className="px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap">
                            {FIELD_LABELS[f]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-blue-50/20">
                          <td className="px-2 py-1.5 text-center text-slate-600">{i + 1}</td>
                          {fields.map((f) => {
                            let val: string;
                            if (f === 'birth_date') val = formatDate(s.birth_date);
                            else val = String((s as unknown as Record<string, string | number>)[f] ?? '');
                            return (
                              <td key={f} className="px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                                {val || '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Stats below report */}
            {((activeReport ? showStats : customShowStats)) && (activeReport ? reportStudents : customResult)?.length ? (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {(() => {
                  const stats = activeReport ? currentStats! : computeStats(customResult!);
                  return (
                    <table className="w-full max-w-sm mx-auto text-sm">
                      <thead>
                        <tr className="bg-emerald-600 text-white">
                          <th className="px-4 py-2 text-center rounded-r-lg">ذكور</th>
                          <th className="px-4 py-2 text-center">إناث</th>
                          <th className="px-4 py-2 text-center rounded-l-lg">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-bold">
                          <td className="px-4 py-2 text-center border border-gray-200">{stats.male}</td>
                          <td className="px-4 py-2 text-center border border-gray-200">{stats.female}</td>
                          <td className="px-4 py-2 text-center border border-gray-200">{stats.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* Report list */
        <div className="space-y-6">
          {/* Custom report builder */}
          <div className="bg-gradient-to-l from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={22} className="text-amber-700" />
              <h2 className="font-bold text-slate-800">التقرير العام / المخصص</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">اختر الحقول والفلاتر لإنشاء تقرير مخصص حسب احتياجك</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">الصف</label>
                <select
                  value={customGrade}
                  onChange={(e) => setCustomGrade(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  <option value="all">كل الصفوف</option>
                  <option value="first">الصف الأول</option>
                  <option value="second">الصف الثاني</option>
                  <option value="third">الصف الثالث</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">نوع التعليم</label>
                <select
                  value={customEdu}
                  onChange={(e) => setCustomEdu(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">الكل</option>
                  <option value="انتظام">انتظام</option>
                  <option value="منازل">منازل</option>
                  <option value="خدمات">خدمات</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">المسار</label>
                <select
                  value={customTrack}
                  onChange={(e) => setCustomTrack(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">الكل</option>
                  {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">الشعبة</label>
                <select
                  value={customDivision}
                  onChange={(e) => setCustomDivision(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">الكل</option>
                  <option value="أدبي">أدبي</option>
                  <option value="علمي علوم">علمي علوم</option>
                  <option value="علمي رياضيات">علمي رياضيات</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">الحقول المطلوبة</label>
              <div className="flex flex-wrap gap-2">
                {ALL_REPORT_FIELDS.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleCustomField(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      customFields.includes(f)
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-amber-50'
                    }`}
                  >
                    {FIELD_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRunCustomReport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
            >
              <FileBarChart size={18} />
              إنشاء التقرير المخصص
            </button>
          </div>

          {/* Predefined reports */}
          {Object.entries(categories).map(([cat, reports]) => (
            <div key={cat}>
              <h3 className="font-bold text-slate-700 mb-3 text-sm">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {reports.map((r) => {
                  const count = filterStudents(allStudents, r).length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRunReport(r)}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-right hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <FileText size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{count} طالب</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-snug">{r.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
