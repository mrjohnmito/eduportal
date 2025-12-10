export type ClassLevel = 'basic7' | 'basic8' | 'basic9';

export interface Student {
  id: string;
  name: string;
  classLevel: string;
  photo?: string;
  indexNumber?: string;
  attendanceDays?: number;
}

export interface SubjectScore {
  id: string;
  studentId: string;
  subject: string;
  classLevel: ClassLevel;
  test1: number | null;
  groupWork: number | null;
  test2: number | null;
  project: number | null;
  examScore: number | null;
}

export interface CalculatedScore extends SubjectScore {
  subtotal: number;
  caScore: number; // 50% of subtotal
  examPercent: number; // 50% of exam
  overallTotal: number;
  grade: number;
  remark: string;
}

export { type CalculatedScore as CalculatedScoreType };

export interface SchoolSettings {
  schoolName: string;
  schoolLogo?: string;
  academicYear: string;
  term: string;
  motto: string;
  email: string;
  contacts: string[];
  totalSchoolDays?: number;
}

export interface AdminUser {
  email: string;
  password: string;
}

export const SUBJECTS = [
  'Mathematics',
  'English Language',
  'Science',
  'Social Studies',
  'RME',
  'Career Technology',
  'French',
  'Dangme',
  'ICT',
  'Creative Art',
] as const;

export type Subject = typeof SUBJECTS[number];

export const CLASS_LEVELS: { id: ClassLevel; name: string; color: string }[] = [
  { id: 'basic7', name: 'Basic 7', color: 'basic7' },
  { id: 'basic8', name: 'Basic 8', color: 'basic8' },
  { id: 'basic9', name: 'Basic 9', color: 'basic9' },
];

export const GRADE_SCALE: { min: number; max: number; grade: number; remark: string }[] = [
  { min: 80, max: 100, grade: 1, remark: 'Excellent' },
  { min: 70, max: 79, grade: 2, remark: 'Very Good' },
  { min: 65, max: 69, grade: 3, remark: 'Good' },
  { min: 60, max: 64, grade: 4, remark: 'High Average' },
  { min: 55, max: 59, grade: 5, remark: 'Average' },
  { min: 50, max: 54, grade: 6, remark: 'Below Average' },
  { min: 40, max: 49, grade: 7, remark: 'Weak' },
  { min: 30, max: 39, grade: 8, remark: 'Very Weak' },
  { min: 0, max: 29, grade: 9, remark: 'Fail' },
];

export const TOTAL_SCORE_REMARKS: { min: number; max: number; remark: string }[] = [
  { min: 0, max: 99, remark: 'There is the need to sit up.' },
  { min: 100, max: 249, remark: 'Buck up in weaker subjects.' },
  { min: 250, max: 299, remark: 'There is the need for increased parental support.' },
  { min: 300, max: 399, remark: 'Extra motivation needed.' },
  { min: 400, max: 449, remark: 'Good work done, keep it up.' },
  { min: 450, max: 499, remark: 'Impressive performance.' },
  { min: 500, max: 649, remark: 'Do not rest on your oars.' },
  { min: 650, max: 699, remark: 'What a promising performance!' },
  { min: 700, max: 899, remark: 'Incredible display of academic prowess.' },
  { min: 900, max: 1000, remark: 'You are simply a genius.' },
];
