// ============================================================
// WORD NORMALIZATION for choice fields (توحيد الكلمات)
// ------------------------------------------------------------
// Problem: values copied from other sheets (or typed from memory)
// arrive in many spellings — "فرنساوي" / "فرنسية" instead of
// "فرنسي", "عام" / "نظام" instead of "انتظام" — and then filters
// and reports that look for the canonical value miss those rows.
// Manual add/edit is already safe (dropdowns), so this runs where
// free text enters the program: Excel import, plus a one-time
// "clean existing data" pass over stored rows.
//
// Rules:
//  1. A per-field dictionary maps known variants to the one
//     canonical value used everywhere else in the program.
//  2. A comparison key removes the usual Arabic spelling noise
//     (alef variants, ة/ه, ى/ي, tashkeel, extra spaces, and the
//     "ال" prefix on every word) so most variants match even
//     without being listed.
//  3. A value that matches nothing is NEVER guessed: callers get
//     known=false and must surface it for human review.
// ============================================================

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (ch) => ARABIC_DIGITS[ch] ?? ch);
}

function normalizeWord(w: string): string {
  return w
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/^ال/, '');
}

// Comparison key: digits unified, tashkeel stripped, punctuation
// stripped, every word normalized, words joined (so "الطب وعلوم
// الحياة" and "طب وعلوم الحياة" get the same key).
export function arabicKey(s: string): string {
  return toWesternDigits(s)
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[.,،؛:\-_"'«»()\[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeWord)
    .join('');
}

export type ChoiceField =
  | 'second_language'
  | 'education_type'
  | 'track'
  | 'elective_subject'
  | 'division'
  | 'enrollment_status'
  | 'nationality'
  | 'integration'
  | 'religion'
  | 'gender';

export const CHOICE_FIELDS: ChoiceField[] = [
  'second_language',
  'education_type',
  'track',
  'elective_subject',
  'division',
  'enrollment_status',
  'nationality',
  'integration',
  'religion',
  'gender',
];

// [canonical, ...known variants]. The canonical itself is always
// added as a key too, so an already-correct value passes through.
const CHOICE_DICTIONARY: Record<ChoiceField, string[][]> = {
  second_language: [
    ['فرنسي', 'فرنساوي', 'فرنسية', 'فرنساوى', 'الفرنسية'],
    ['ألماني', 'الماني', 'ألمانى', 'المانى'],
    ['إيطالي', 'ايطالي', 'إيطالى'],
    ['معفي', 'معفى', 'معاف', 'إعفاء', 'اعفاء', 'معفي من اللغة'],
  ],
  education_type: [
    ['انتظام', 'نظام', 'نظامي', 'نظامى', 'عام', 'منتظم', 'انتظامي'],
    ['منازل', 'منزل', 'منزلي'],
    ['خدمات', 'خدمة'],
  ],
  track: [
    ['الطب وعلوم الحياة', 'طب', 'الطب', 'طب وعلوم الحياه'],
    ['الهندسة وعلوم الحاسب', 'هندسة', 'حاسب', 'علوم الحاسب', 'هندسه وعلوم الحاسب'],
    ['إدارة الأعمال', 'ادارة اعمال', 'أعمال', 'اعمال', 'ادارة الأعمال'],
    ['الآداب والفنون', 'آداب', 'اداب', 'فنون', 'اداب وفنون'],
  ],
  elective_subject: [
    ['رياضيات', 'رياضه', 'رياضة'],
    ['فيزياء', 'فيزيا'],
    ['كيمياء', 'كيميا'],
    ['برمجة', 'برمجه'],
    ['محاسبة', 'محاسبه'],
    ['إدارة الأعمال', 'ادارة اعمال', 'أعمال'],
    ['فرنسي', 'فرنساوي', 'فرنسية'],
    ['علم نفس', 'علم النفس'],
  ],
  division: [
    ['أدبي', 'ادبى', 'أدبى'],
    ['علمي علوم', 'علمى علوم', 'علوم'],
    ['علمي رياضيات', 'علمى رياضيات', 'رياضيات'],
  ],
  enrollment_status: [
    ['مستجد', 'جديد'],
    ['منقول', 'نقل'],
    ['باقي للاعادة', 'باقى للاعاده', 'راسب', 'راسبين', 'باقي', 'اعادة', 'باقي للإعادة'],
    ['محول', 'تحويل'],
  ],
  nationality: [
    ['مصري', 'مصر', 'مصرية', 'مصرى'],
    ['أخرى', 'اخرى', 'غير مصري', 'اجنبي', 'أجنبى'],
  ],
  integration: [
    ['دمج'],
    ['لا يوجد', 'لا', 'مفيش', 'لا يوجد دمج', 'بدون'],
  ],
  religion: [
    ['مسلم', 'مسلمة', 'اسلام', 'إسلام'],
    ['مسيحي', 'مسيحى', 'قبطي', 'قبطى'],
    ['أخرى', 'اخرى', 'غير ذلك'],
  ],
  gender: [
    ['ذكر', 'ولد', 'بنين', 'ذكور'],
    ['أنثى', 'انثى', 'بنت', 'بنات', 'إناث'],
  ],
};

function buildMap(entries: string[][]): Map<string, string> {
  const map = new Map<string, string>();
  for (const [canonical, ...variants] of entries) {
    for (const v of [canonical, ...variants]) {
      const key = arabicKey(v);
      if (key && !map.has(key)) map.set(key, canonical);
    }
  }
  return map;
}

const CHOICE_MAPS: Record<ChoiceField, Map<string, string>> = {
  second_language: buildMap(CHOICE_DICTIONARY.second_language),
  education_type: buildMap(CHOICE_DICTIONARY.education_type),
  track: buildMap(CHOICE_DICTIONARY.track),
  elective_subject: buildMap(CHOICE_DICTIONARY.elective_subject),
  division: buildMap(CHOICE_DICTIONARY.division),
  enrollment_status: buildMap(CHOICE_DICTIONARY.enrollment_status),
  nationality: buildMap(CHOICE_DICTIONARY.nationality),
  integration: buildMap(CHOICE_DICTIONARY.integration),
  religion: buildMap(CHOICE_DICTIONARY.religion),
  gender: buildMap(CHOICE_DICTIONARY.gender),
};

export function normalizeChoiceValue(
  field: ChoiceField,
  raw: string,
): { value: string; known: boolean } {
  const v = raw.trim();
  if (!v) return { value: '', known: true };
  const canonical = CHOICE_MAPS[field].get(arabicKey(v));
  if (canonical) return { value: canonical, known: true };
  return { value: v, known: false };
}

// Classroom codes like "١/١" become "1/1".
export function normalizeClassroom(raw: string): string {
  return toWesternDigits(raw.trim()).replace(/\s+/g, '');
}
