import type { Student } from './supabase';
import { GRADE_LABELS, FIELD_LABELS } from './constants';
import { formatDate } from './nationalId';

export type SchoolSettings = {
  school_name: string;
  education_administration: string;
  governorate: string;
};

export type ReportStats = {
  male: number;
  female: number;
  total: number;
};

export function computeStats(students: Student[]): ReportStats {
  let male = 0;
  let female = 0;
  for (const s of students) {
    if (s.gender === 'ذكر') male++;
    else if (s.gender === 'أنثى') female++;
  }
  return { male, female, total: students.length };
}

export function openPrintWindow(html: string) {
  // On Android there is no second window: share the printable HTML
  // file instead. Opening it in Chrome auto-shows the print dialog,
  // because the HTML itself calls window.print() on load.
  const shareFile = (
    window as unknown as {
      __shareFile?: (fileName: string, blob: Blob) => Promise<void>;
    }
  ).__shareFile;
  if (typeof shareFile === 'function') {
    shareFile('طباعة.html', new Blob([html], { type: 'text/html;charset=utf-8' })).catch(() => {
      alert('تعذر مشاركة ملف الطباعة، حاول مجددًا.');
    });
    return;
  }
  const w = window.open('', '_blank', 'width=1000,height=700');
  if (!w) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function generatePrintableReport(
  students: Student[],
  fields: string[],
  title: string,
  settings: SchoolSettings,
  showStats: boolean,
  stats?: ReportStats
): string {
  const statsData = stats || computeStats(students);

  const headerInfo = `
    <div class="report-header">
      <div class="school-info">
        <div>المحافظة: ${settings.governorate}</div>
        <div>الإدارة التعليمية: ${settings.education_administration}</div>
        <div>المدرسة: ${settings.school_name}</div>
      </div>
      <h1 class="report-title">${title}</h1>
      <div class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
    </div>
  `;

  const tableHeaders = fields.map((f) => `<th>${FIELD_LABELS[f] || f}</th>`).join('');

  const tableRows = students
    .map(
      (s, i) => `
      <tr>
        ${fields
          .map((f) => {
            let val: string;
            if (f === 'serial') val = String(i + 1);
            else if (f === 'birth_date') val = formatDate(s.birth_date);
            else val = String((s as unknown as Record<string, string | number>)[f] ?? '');
            return `<td>${val}</td>`;
          })
          .join('')}
      </tr>
    `
    )
    .join('');

  const statsHtml = showStats
    ? `
    <div class="stats-section">
      <h3>الإحصائيات</h3>
      <table class="stats-table">
        <tr><th>ذكور</th><th>إناث</th><th>الإجمالي</th></tr>
        <tr><td>${statsData.male}</td><td>${statsData.female}</td><td>${statsData.total}</td></tr>
      </table>
    </div>
  `
    : '';

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 1cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif; direction: rtl; color: #1a1a2e; padding: 20px; }
  .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a4d8f; padding-bottom: 15px; }
  .school-info { font-size: 12px; color: #555; margin-bottom: 8px; display: flex; justify-content: space-between; }
  .school-info div { display: inline-block; margin: 0 10px; }
  .report-title { font-size: 20px; color: #1a4d8f; margin: 8px 0; }
  .report-date { font-size: 11px; color: #777; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
  th { background: #1a4d8f; color: #fff; padding: 6px 8px; border: 1px solid #ccc; text-align: center; font-weight: 600; }
  td { padding: 5px 8px; border: 1px solid #ddd; text-align: center; }
  tr:nth-child(even) { background: #f5f7fa; }
  .stats-section { margin-top: 20px; text-align: center; }
  .stats-section h3 { color: #1a4d8f; margin-bottom: 8px; }
  .stats-table { width: 300px; margin: 0 auto; }
  .stats-table th { background: #2d7d46; }
  .stats-table td { font-weight: bold; font-size: 14px; }
  .no-data { text-align: center; padding: 30px; color: #999; font-size: 16px; }
  @media print { .report-header { border-bottom: 2px solid #1a4d8f; } body { padding: 0; } }
</style>
</head>
<body>
  ${headerInfo}
  ${students.length === 0 ? '<div class="no-data">لا توجد بيانات</div>' : `
  <table>
    <thead><tr>${tableHeaders}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  `}
  ${statsHtml}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
</body>
</html>
  `;
}

export function generatePrintableStudentCard(
  student: Student,
  settings: SchoolSettings
): string {
  const gradeLabel = GRADE_LABELS[student.grade];
  const allFields: { label: string; value: string }[] = [
    { label: 'الكود', value: student.code },
    { label: 'الاسم', value: student.name },
    { label: 'الرقم القومي', value: student.national_id },
    { label: 'النوع', value: student.gender },
    { label: 'تاريخ الميلاد', value: formatDate(student.birth_date) },
    { label: 'اللغة الأجنبية الثانية', value: student.second_language },
    { label: 'الفصل', value: student.classroom },
    { label: 'نوع التعليم', value: student.education_type },
  ];

  if (student.grade === 'second') {
    allFields.push(
      { label: 'المسار', value: student.track },
      { label: 'المادة الاختيارية', value: student.elective_subject }
    );
  } else if (student.grade === 'third') {
    allFields.push({ label: 'الشعبة', value: student.division });
  }

  allFields.push(
    { label: 'حالة القيد', value: student.enrollment_status },
    { label: 'اسم ولي الأمر', value: student.guardian_name },
    { label: 'اسم الأم', value: student.mother_name },
    { label: 'رقم التليفون', value: student.phone },
    { label: 'العنوان', value: student.address },
    { label: 'الجنسية', value: student.nationality },
    { label: 'الدمج', value: student.integration },
    { label: 'الديانة', value: student.religion }
  );

  const rows = allFields
    .map(
      (f) => `
    <tr><td class="field-label">${f.label}</td><td class="field-value">${f.value || '—'}</td></tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>بطاقة طالب - ${student.name}</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif; direction: rtl; color: #1a1a2e; padding: 20px; }
  .card-header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #1a4d8f; padding-bottom: 15px; }
  .school-info { font-size: 12px; color: #555; margin-bottom: 6px; }
  .card-title { font-size: 22px; color: #1a4d8f; margin: 8px 0; }
  .grade-label { font-size: 14px; color: #2d7d46; font-weight: 600; }
  table.card { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
  table.card td { padding: 10px 15px; border: 1px solid #ccc; }
  .field-label { background: #e8f0fe; font-weight: 600; width: 35%; color: #1a4d8f; }
  .field-value { background: #fff; }
  .student-photo-area { text-align: center; margin-bottom: 15px; }
  .photo-box { width: 100px; height: 120px; border: 2px dashed #aaa; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="card-header">
    <div class="school-info">
      المحافظة: ${settings.governorate} &nbsp;|&nbsp;
      الإدارة التعليمية: ${settings.education_administration} &nbsp;|&nbsp;
      المدرسة: ${settings.school_name}
    </div>
    <h1 class="card-title">بطاقة طالب</h1>
    <div class="grade-label">${gradeLabel}</div>
  </div>
  <table class="card">
    ${rows}
  </table>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>
  `;
}
