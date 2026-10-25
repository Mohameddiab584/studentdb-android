/*
# Create high school student database tables

## Description
Creates a complete student database for Egyptian high school (المرحلة الثانوية العامة) with three grade levels,
school settings, and full Row Level Security. This is a single-tenant app (no auth) so policies use anon+authenticated.

## New Tables

### school_settings
- `id` (int, primary key, always 1) — singleton row for school info
- `school_name` (text) — اسم المدرسة
- `education_administration` (text) — الإدارة التعليمية
- `governorate` (text) — المحافظة
- `updated_at` (timestamptz)

### students
- `id` (uuid, primary key)
- `serial` (int) — المسلسل (entered manually)
- `code` (text, not null) — الكود (entered manually)
- `grade` (text, not null) — الصف: 'first', 'second', 'third'
- `name` (text, not null) — الاسم
- `national_id` (text, not null, unique) — الرقم القومي (14 digits, unique)
- `second_language` (text) — اللغة الأجنبية الثانية
- `classroom` (text) — الفصل
- `education_type` (text) — نوع التعليم: انتظام/منازل/خدمات
- `track` (text) — المسار (second grade only)
- `elective_subject` (text) — المادة الاختيارية (second grade only, linked to track)
- `division` (text) — الشعبة (third grade only): أدبي/علمي علوم/علمي رياضيات
- `guardian_name` (text) — اسم ولي الأمر
- `mother_name` (text) — اسم الأم
- `phone` (text) — رقم التليفون (stored as text)
- `address` (text) — العنوان
- `enrollment_status` (text) — حالة القيد: مستجد/منقول/باقي للاعادة/محول
- `nationality` (text) — الجنسية: مصري/أخرى
- `integration` (text) — الدمج: دمج/لا يوجد
- `religion` (text) — الديانة: مسلم/مسيحي/أخرى
- `gender` (text) — النوع (auto-extracted from national_id): ذكر/أنثى
- `birth_date` (date) — تاريخ الميلاد (auto-extracted from national_id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Security
- RLS enabled on both tables
- CRUD granted to anon + authenticated (single-tenant, no auth)
- Policies allow all operations for anon + authenticated (intentionally public/shared data)
*/