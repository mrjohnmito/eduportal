// School admin passwords become real sign-in passwords, and the sign-in service
// rejects short or commonly leaked passwords. Check them before saving a school.
export function adminPasswordProblem(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use both letters and numbers.';
  if (!/[^A-Za-z0-9]/.test(password) && !/[A-Z]/.test(password)) {
    return 'Add a capital letter or a symbol (for example ! or @).';
  }
  return null;
}
