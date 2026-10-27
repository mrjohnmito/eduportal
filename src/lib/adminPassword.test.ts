import { describe, expect, test } from 'bun:test';
import { adminPasswordProblem } from './adminPassword';

describe('adminPasswordProblem', () => {
  test('rejects short passwords like king123', () => {
    expect(adminPasswordProblem('king123')).not.toBeNull();
  });
  test('rejects passwords without numbers', () => {
    expect(adminPasswordProblem('Kingsunday!')).not.toBeNull();
  });
  test('rejects lowercase letters and numbers only', () => {
    expect(adminPasswordProblem('kingsunday383')).not.toBeNull();
  });
  test('accepts a mixed password', () => {
    expect(adminPasswordProblem('KingSunday@383')).toBeNull();
  });
});
