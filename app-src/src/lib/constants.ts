export const GRADE_LABELS: Record<string, string> = {
  first: 'الصف الأول الثانوي',
  second: 'الصف الثاني الثانوي',
  third: 'الصف الثالث الثانوي',
};

export const EDUCATION_TYPES = ['انتظام', 'منازل', 'خدمات'] as const;

export const SECOND_LANGUAGES = ['فرنسي', 'ألماني', 'إيطالي', 'معفي'] as const;

export const ENROLLMENT_STATUSES = ['مستجد', 'منقول', 'باقي للاعادة', 'محول'] as const;

export const TRACKS = [
  'الطب وعلوم الحياة',
  'الهندسة وعلوم الحاسب',
  'إدارة الأعمال',
  'الآداب والفنون',
] as const;

export const TRACK_ELECTIVES: Record<string, string[]> = {
  'الطب وعلوم الحياة': ['رياضيات', 'فيزياء'],
  'الهندسة وعلوم الحاسب': ['كيمياء', 'برمجة'],
  'إدارة الأعمال': ['محاسبة', 'إدارة الأعمال'],
  'الآداب والفنون': ['فرنسي', 'علم نفس'],
};

export const DIVISIONS = ['أدبي', 'علمي علوم', 'علمي رياضيات'] as const;

export const NATIONALITIES = ['مصري', 'أخرى'] as const;

export const INTEGRATION_OPTIONS = ['دمج', 'لا يوجد'] as const;

export const RELIGIONS = ['مسلم', 'مسيحي', 'أخرى'] as const;

export const GENDERS = ['ذكر', 'أنثى'] as const;

export const CLASSROOMS = [
  '1/1', '1/2', '1/3', '1/4', '1/5', '1/6',
  '2/1', '2/2', '2/3', '2/4', '2/5', '2/6',
  '3/1', '3/2', '3/3', '3/4', '3/5', '3/6',
] as const;

export const FIELD_LABELS: Record<string, string> = {
  serial: 'م',
  code: 'الكود',
  name: 'الاسم',
  national_id: 'الرقم القومي',
  gender: 'النوع',
  birth_date: 'تاريخ الميلاد',
  second_language: 'اللغة الأجنبية الثانية',
  classroom: 'الفصل',
  education_type: 'نوع التعليم',
  track: 'المسار',
  elective_subject: 'المادة الاختيارية',
  division: 'الشعبة',
  guardian_name: 'اسم ولي الأمر',
  mother_name: 'اسم الأم',
  phone: 'رقم التليفون',
  address: 'العنوان',
  enrollment_status: 'حالة القيد',
  nationality: 'الجنسية',
  integration: 'الدمج',
  religion: 'الديانة',
};

export const ALL_REPORT_FIELDS = [
  'serial', 'code', 'name', 'national_id', 'gender', 'birth_date',
  'second_language', 'classroom', 'education_type', 'track',
  'elective_subject', 'division', 'guardian_name', 'mother_name',
  'phone', 'address', 'enrollment_status', 'nationality', 'integration', 'religion',
] as const;

export const DEFAULT_REPORT_FIELDS = [
  'serial', 'code', 'name', 'national_id', 'gender',
  'classroom', 'education_type', 'enrollment_status',
] as const;
