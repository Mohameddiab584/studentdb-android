import { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, type StudentInput } from '../lib/supabase';
import { GRADE_LABELS } from '../lib/constants';
import { importStudentsFromExcel, downloadExcelTemplate, exportStudentsToExcel } from '../lib/excel';
import { parseNationalId } from '../lib/nationalId';
import type { Student } from '../lib/supabase';
import type { SchoolSettings } from '../lib/reportUtils';

type Props = {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

const EXCEL_FIELD_MAP: Record<string, keyof StudentInput> = {
  'م': 'serial',
  'الكود': 'code',
  'الاسم': 'name',
  'الرقم القومي': 'national_id',
  'اللغة الأجنبية الثانية': 'second_language',
  'الفصل': 'classroom',
  'نوع التعليم': 'education_type',
  'المسار': 'track',
  'المادة الاختيارية': 'elective_subject',
  'الشعبة': 'division',
  'اسم ولي الأمر': 'guardian_name',
  'اسم الأم': 'mother_name',
  'رقم التليفون': 'phone',
  'العنوان': 'address',
  'حالة القيد': 'enrollment_status',
  'الجنسية': 'nationality',
  'الدمج': 'integration',
  'الديانة': 'religion',
};

export function ExcelPage({ showToast }: Props) {
  const [selectedGrade, setSelectedGrade] = useState<'first' | 'second' | 'third'>('first');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const rows = await importStudentsFromExcel(file);
      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const obj: Partial<StudentInput> = { grade: selectedGrade };

        for (const [excelKey, dbField] of Object.entries(EXCEL_FIELD_MAP)) {
          const val = row[excelKey];
          if (val === undefined || val === '' || val === null) continue;
          if (dbField === 'serial') {
            obj.serial = parseInt(String(val), 10) || null;
          } else {
            (obj as Record<string, unknown>)[dbField] = String(val).trim();
          }
        }

        if (!obj.code || !obj.name || !obj.national_id) {
          errors.push(`الصف ${i + 2}: بيانات ناقصة (كود/اسم/رقم قومي)`);
          continue;
        }

        const nationalId = String(obj.national_id).replace(/\D/g, '');
        if (nationalId.length !== 14) {
          errors.push(`الصف ${i + 2}: الرقم القومي يجب أن يكون 14 رقم`);
          continue;
        }
        obj.national_id = nationalId;

        const { gender, birthDate } = parseNationalId(nationalId);
        const fullObj: StudentInput = {
          serial: obj.serial ?? null,
          code: obj.code,
          grade: selectedGrade,
          name: obj.name,
          national_id: obj.national_id,
          second_language: obj.second_language || '',
          classroom: obj.classroom || '',
          education_type: obj.education_type || '',
          track: obj.track || '',
          elective_subject: obj.elective_subject || '',
          division: obj.division || '',
          guardian_name: obj.guardian_name || '',
          mother_name: obj.mother_name || '',
          phone: obj.phone || '',
          address: obj.address || '',
          enrollment_status: obj.enrollment_status || '',
          nationality: obj.nationality || 'مصري',
          integration: obj.integration || 'لا يوجد',
          religion: obj.religion || 'مسلم',
          gender,
          birth_date: birthDate,
        };

        const { error } = await supabase.from('students').insert(fullObj);
        if (error) {
          if (error.code === '23505') {
            errors.push(`الصف ${i + 2}: الرقم القومي مكرر (${nationalId})`);
          } else {
            errors.push(`الصف ${i + 2}: ${error.message}`);
          }
        } else {
          success++;
        }
      }

      setImportResult({ success, errors });
      if (success > 0) showToast(`تم استيراد ${success} طالب بنجاح`, 'success');
      if (errors.length > 0) showToast(`يوجد ${errors.length} خطأ في الاستيراد`, 'error');
    } catch {
      showToast('فشل قراءة الملف. تأكد من أنه ملف Excel صحيح', 'error');
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExportGrade = async (grade: 'first' | 'second' | 'third') => {
    const { data, error } = await supabase.from('students').select('*').eq('grade', grade);
    if (error || !data || data.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'info');
      return;
    }
    exportStudentsToExcel(data as Student[], `${GRADE_LABELS[grade]}.xlsx`, GRADE_LABELS[grade]);
    showToast('تم تصدير البيانات بنجاح');
  };

  const handleExportAll = async () => {
    const { data, error } = await supabase.from('students').select('*');
    if (error || !data || data.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'info');
      return;
    }
    exportStudentsToExcel(data as Student[], 'جميع_الطلاب.xlsx', 'جميع الطلاب');
    showToast('تم تصدير جميع البيانات بنجاح');
  };

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center">
          <FileSpreadsheet size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">استيراد / تصدير Excel</h1>
          <p className="text-sm text-slate-500">استيراد طلاب من ملف Excel أو تصدير البيانات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload size={20} className="text-blue-700" />
            <h2 className="font-bold text-slate-800">استيراد من Excel</h2>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">اختر الصف</label>
            <div className="grid grid-cols-3 gap-2">
              {(['first', 'second', 'third'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedGrade === g
                      ? 'bg-blue-700 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {GRADE_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => downloadExcelTemplate(selectedGrade)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors mb-4"
          >
            <FileDown size={18} />
            تحميل قالب Excel للصف
          </button>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) handleImport(e.dataTransfer.files[0]);
            }}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
          >
            <Upload size={36} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 font-medium">اضغط لاختيار ملف أو اسحبه هنا</p>
            <p className="text-xs text-gray-400 mt-1">xlsx, xls</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            />
          </div>

          {importing && (
            <div className="flex items-center justify-center gap-2 mt-4 text-blue-700">
              <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
              <span className="text-sm">جاري الاستيراد...</span>
            </div>
          )}

          {importResult && !importing && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl p-3">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">تم استيراد {importResult.success} طالب بنجاح</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">{importResult.errors.length} خطأ</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download size={20} className="text-emerald-700" />
            <h2 className="font-bold text-slate-800">تصدير إلى Excel</h2>
          </div>

          <div className="space-y-3">
            {(['first', 'second', 'third'] as const).map((g) => (
              <button
                key={g}
                onClick={() => handleExportGrade(g)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-all group"
              >
                <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">{GRADE_LABELS[g]}</span>
                <Download size={18} className="text-gray-400 group-hover:text-emerald-600" />
              </button>
            ))}
            <button
              onClick={handleExportAll}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
            >
              <span className="text-sm font-bold">تصدير جميع الطلاب</span>
              <Download size={18} />
            </button>
          </div>

          <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-800 border border-blue-100">
            <p className="font-medium mb-2">طريقة الاستخدام:</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal pr-4">
              <li>حمّل قالب Excel للصف المطلوب</li>
              <li>املأ البيانات في القالب (نسخ ولصق)</li>
              <li>الرقم القومي يجب أن يكون 14 رقم</li>
              <li>النوع وتاريخ الميلاد يستخرجان تلقائياً من الرقم القومي</li>
              <li>ارفع الملف لاستيراد الطلاب</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
