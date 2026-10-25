import * as XLSX from 'xlsx';
import type { Student } from './supabase';
import { GRADE_LABELS, FIELD_LABELS } from './constants';
import { formatDate } from './nationalId';

// On Android (Capacitor), browser downloads don't land in a visible
// file, so files are handed to the share bridge instead (same content).
// On desktop/web the plain anchor download is used, unchanged.
declare global {
  interface Window {
    __shareFile?: (fileName: string, blob: Blob) => Promise<void>;
  }
}

function shareOrDownload(fileName: string, blob: Blob): void {
  const bridge = window.__shareFile;
  if (typeof bridge === 'function') {
    bridge(fileName, blob).catch(() => {
      alert('تعذر مشاركة الملف، حاول مجددًا.');
    });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function saveWorkbook(wb: XLSX.WorkBook, fileName: string): void {
  const name = fileName.endsWith('.xlsx') ? fileName : fileName + '.xlsx';
  if (typeof window.__shareFile === 'function') {
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    shareOrDownload(
      name,
      new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    return;
  }
  XLSX.writeFile(wb, name);
}

export function exportStudentsToExcel(students: Student[], fileName: string, sheetName = 'الطلاب') {
  const rows = students.map((s, i) => {
    const row: Record<string, string | number> = {};
    row['م'] = i + 1;
    row['الكود'] = s.code;
    row['الاسم'] = s.name;
    row['الرقم القومي'] = s.national_id;
    row['النوع'] = s.gender;
    row['تاريخ الميلاد'] = formatDate(s.birth_date);
    row['اللغة الأجنبية الثانية'] = s.second_language;
    row['الفصل'] = s.classroom;
    row['نوع التعليم'] = s.education_type;
    row['المسار'] = s.track;
    row['المادة الاختيارية'] = s.elective_subject;
    row['الشعبة'] = s.division;
    row['اسم ولي الأمر'] = s.guardian_name;
    row['اسم الأم'] = s.mother_name;
    row['رقم التليفون'] = s.phone;
    row['العنوان'] = s.address;
    row['حالة القيد'] = s.enrollment_status;
    row['الجنسية'] = s.nationality;
    row['الدمج'] = s.integration;
    row['الديانة'] = s.religion;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || { 'م': 1 }).map((k) => ({ wch: Math.max(k.length * 1.5 + 4, 12) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  saveWorkbook(wb, fileName);
}

export function exportCustomReport(
  students: Student[],
  fields: string[],
  fileName: string,
  sheetName = 'التقرير',
  stats?: { male: number; female: number; total: number }
) {
  const rows = students.map((s, i) => {
    const row: Record<string, string | number> = {};
    row['م'] = i + 1;
    for (const f of fields) {
      const label = FIELD_LABELS[f] || f;
      if (f === 'birth_date') row[label] = formatDate(s.birth_date);
      else row[label] = (s as unknown as Record<string, string | number>)[f] ?? '';
    }
    return row;
  });

  if (stats) {
    rows.push({ 'م': '' } as Record<string, string | number>);
    rows.push({ 'م': 'الإحصائيات', 'الكود': `ذكور: ${stats.male}` } as Record<string, string | number>);
    rows.push({ 'م': '', 'الكود': `إناث: ${stats.female}` } as Record<string, string | number>);
    rows.push({ 'م': '', 'الكود': `الإجمالي: ${stats.total}` } as Record<string, string | number>);
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  saveWorkbook(wb, fileName);
}

export async function importStudentsFromExcel(file: File): Promise<Record<string, string | number>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '' });
  return rows;
}

// The professional templates (with dropdown lists and the dependent
// track -> elective list for grade 2) are pre-built files bundled with
// the app under /templates/. The download button serves the bundled
// file as-is; if it cannot be fetched for any reason, we fall back to
// generating the basic template in code (previous behaviour).
export async function downloadExcelTemplate(grade: 'first' | 'second' | 'third') {
  const gradeLabel = GRADE_LABELS[grade];
  try {
    const res = await fetch(`/templates/template-${grade}.xlsx`);
    if (!res.ok) throw new Error('template fetch failed');
    const blob = await res.blob();
    shareOrDownload(`قالب_${gradeLabel}.xlsx`, blob);
  } catch {
    downloadBasicTemplate(grade);
  }
}

function downloadBasicTemplate(grade: 'first' | 'second' | 'third') {
  const gradeLabel = GRADE_LABELS[grade];
  const baseCols = ['م', 'الكود', 'الاسم', 'الرقم القومي', 'اللغة الأجنبية الثانية', 'الفصل', 'نوع التعليم'];
  if (grade === 'second') {
    baseCols.push('المسار', 'المادة الاختيارية');
  } else if (grade === 'third') {
    baseCols.push('الشعبة');
  }
  baseCols.push('اسم ولي الأمر', 'اسم الأم', 'رقم التليفون', 'العنوان', 'حالة القيد', 'الجنسية', 'الدمج', 'الديانة');

  const sampleRow: Record<string, string> = {};
  for (const c of baseCols) sampleRow[c] = '';
  sampleRow['م'] = '1';
  sampleRow['الكود'] = '1001';
  sampleRow['الاسم'] = 'مثال: أحمد محمد';
  sampleRow['الرقم القومي'] = '30001010100001';

  const ws = XLSX.utils.json_to_sheet([sampleRow]);
  ws['!cols'] = baseCols.map((k) => ({ wch: Math.max(k.length * 1.5 + 4, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, gradeLabel);
  saveWorkbook(wb, `قالب_${gradeLabel}.xlsx`);
}
