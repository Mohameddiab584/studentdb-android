/*
# Create students and school_settings tables

## New Tables
### school_settings (singleton)
- school_name, education_administration, governorate
### students
- Full student record for 3 grades with national_id auto-derived gender/birth_date
## Security
- RLS on both, CRUD for anon+authenticated
*/

CREATE TABLE IF NOT EXISTS school_settings (
  id int PRIMARY KEY DEFAULT 1,
  school_name text DEFAULT '',
  education_administration text DEFAULT '',
  governorate text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT singleton_school CHECK (id = 1)
);

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON school_settings TO anon, authenticated;

DROP POLICY IF EXISTS "anon_all_school_settings" ON school_settings;
CREATE POLICY "anon_all_school_settings" ON school_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_ins_school_settings" ON school_settings;
CREATE POLICY "anon_ins_school_settings" ON school_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_upd_school_settings" ON school_settings;
CREATE POLICY "anon_upd_school_settings" ON school_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_del_school_settings" ON school_settings;
CREATE POLICY "anon_del_school_settings" ON school_settings FOR DELETE TO anon, authenticated USING (true);

INSERT INTO school_settings (id, school_name, education_administration, governorate)
VALUES (1, 'مدرسة سعاد جودة عزب الثانوية', 'إدارة منيا القمح التعليمية', 'محافظة الشرقية')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial int,
  code text NOT NULL,
  grade text NOT NULL CHECK (grade IN ('first', 'second', 'third')),
  name text NOT NULL,
  national_id text NOT NULL UNIQUE,
  second_language text DEFAULT '',
  classroom text DEFAULT '',
  education_type text DEFAULT '',
  track text DEFAULT '',
  elective_subject text DEFAULT '',
  division text DEFAULT '',
  guardian_name text DEFAULT '',
  mother_name text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  enrollment_status text DEFAULT '',
  nationality text DEFAULT 'مصري',
  integration text DEFAULT 'لا يوجد',
  religion text DEFAULT 'مسلم',
  gender text DEFAULT '',
  birth_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON students TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(code);
CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
CREATE INDEX IF NOT EXISTS idx_students_education_type ON students(education_type);
CREATE INDEX IF NOT EXISTS idx_students_track ON students(track);
CREATE INDEX IF NOT EXISTS idx_students_division ON students(division);