/**
 * Extracts gender and birth date from an Egyptian national ID (14 digits).
 * Format: century(1) + year(2) + month(2) + day(2) + governorate/region(2) + sequence(3) + gender_digit(1)
 * - Centuries: 2 → 19xx, 3 → 20xx
 * - Gender: odd digit → ذكر, even digit → أنثى
 */
export function parseNationalId(nationalId: string): { gender: string; birthDate: string | null } {
  const cleaned = (nationalId || '').replace(/\s/g, '');
  if (cleaned.length !== 14 || !/^\d{14}$/.test(cleaned)) {
    return { gender: '', birthDate: null };
  }

  const centuryCode = cleaned[0];
  const yearPart = cleaned.substring(1, 3);
  const monthPart = cleaned.substring(3, 5);
  const dayPart = cleaned.substring(5, 7);
  const genderDigit = cleaned[13];

  let year: number;
  if (centuryCode === '2') year = 1900 + parseInt(yearPart, 10);
  else if (centuryCode === '3') year = 2000 + parseInt(yearPart, 10);
  else year = parseInt(yearPart, 10);

  const month = parseInt(monthPart, 10);
  const day = parseInt(dayPart, 10);

  let birthDate: string | null = null;
  if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    birthDate = `${year}-${mm}-${dd}`;
  }

  const gender = parseInt(genderDigit, 10) % 2 === 0 ? 'أنثى' : 'ذكر';

  return { gender, birthDate };
}

export function isValidNationalId(nationalId: string): boolean {
  return /^\d{14}$/.test((nationalId || '').replace(/\s/g, ''));
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dateStr;
  }
}
