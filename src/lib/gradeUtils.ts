import { GRADE_SCALE, TOTAL_SCORE_REMARKS, HEADTEACHER_REMARKS, CLASS_TEACHER_REMARKS, SubjectScore, CalculatedScore } from '@/types/school';

export function calculateGrade(score: number): { grade: number; remark: string } {
  const rounded = Math.round(score);
  for (const scale of GRADE_SCALE) {
    if (rounded >= scale.min && rounded <= scale.max) {
      return { grade: scale.grade, remark: scale.remark };
    }
  }
  return { grade: 9, remark: 'Fail' };
}

export function getTotalScoreRemark(totalScore: number): string {
  for (const item of TOTAL_SCORE_REMARKS) {
    if (totalScore >= item.min && totalScore <= item.max) {
      return item.remark;
    }
  }
  return 'Keep working hard!';
}

export function calculateScores(score: SubjectScore): CalculatedScore {
  const test1 = score.test1 ?? 0;
  const groupWork = score.groupWork ?? 0;
  const test2 = score.test2 ?? 0;
  const project = score.project ?? 0;
  const examScore = score.examScore ?? 0;

  const subtotal = test1 + groupWork + test2 + project;
  const caScore = subtotal * 0.5; // 50% of CA
  const examPercent = examScore * 0.5; // 50% of Exam
  const overallTotal = caScore + examPercent;

  const { grade, remark } = calculateGrade(overallTotal);

  return {
    ...score,
    subtotal,
    caScore,
    examPercent,
    overallTotal,
    grade,
    remark,
  };
}

export function validateScore(value: number, maxValue: number): boolean {
  return value >= 0 && value <= maxValue;
}

export function calculateAggregate(
  scores: CalculatedScore[]
): { aggregate: number; subjects: string[] } {
  // Fixed subjects: Maths, English, Science, Social
  const fixedSubjects = ['Mathematics', 'English Language', 'Science', 'Social Studies'];
  
  const fixedScores = scores.filter(s => fixedSubjects.includes(s.subject));
  const otherScores = scores
    .filter(s => !fixedSubjects.includes(s.subject))
    .sort((a, b) => a.grade - b.grade)
    .slice(0, 2); // Best 2 additional subjects

  const allSelectedScores = [...fixedScores, ...otherScores];
  const aggregate = allSelectedScores.reduce((sum, s) => sum + s.grade, 0);

  return {
    aggregate,
    subjects: allSelectedScores.map(s => s.subject),
  };
}

export function calculatePositions(
  studentTotals: { studentId: string; total: number }[]
): Map<string, number> {
  const sorted = [...studentTotals].sort((a, b) => b.total - a.total);
  const positions = new Map<string, number>();

  sorted.forEach((item, index) => {
    positions.set(item.studentId, index + 1);
  });

  return positions;
}

export function getPositionSuffix(position: number): string {
  if (position >= 11 && position <= 13) return 'th';
  switch (position % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
