/**
 * Validates password complexity.
 * Rules: min 8 chars, uppercase, lowercase, number, symbol
 */
export interface PasswordValidation {
  valid: boolean
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSymbol: boolean
}

export function validatePassword(password: string): PasswordValidation {
  const minLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const valid = minLength && hasUppercase && hasLowercase && hasNumber && hasSymbol
  return { valid, minLength, hasUppercase, hasLowercase, hasNumber, hasSymbol }
}
