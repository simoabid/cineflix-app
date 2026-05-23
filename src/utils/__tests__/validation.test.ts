import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  validatePasswordMatch,
  validateName,
  PASSWORD_RULES,
} from '../validation';

describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });

  it('should accept email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toEqual({ valid: true });
  });

  it('should reject empty email', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Email is required');
  });

  it('should reject whitespace-only email', () => {
    const result = validateEmail('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Email is required');
  });

  it('should reject email without @', () => {
    const result = validateEmail('userexample.com');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a valid email address');
  });

  it('should reject email without domain', () => {
    const result = validateEmail('user@');
    expect(result.valid).toBe(false);
  });

  it('should reject email without local part', () => {
    const result = validateEmail('@example.com');
    expect(result.valid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('should accept a valid complex password', () => {
    const result = validatePassword('MyP@ss1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept a strong password', () => {
    expect(validatePassword('Str0ng!Pass').valid).toBe(true);
  });

  it('should reject empty password', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password is required');
  });

  it('should reject short password', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('abcdefg1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject password without lowercase', () => {
    const result = validatePassword('ABCDEFG1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('Abcdefgh!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should reject password without special character', () => {
    const result = validatePassword('Abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('should return multiple errors for very weak password', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('getPasswordStrength', () => {
  it('should return Very Weak for empty password', () => {
    const result = getPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('Very Weak');
  });

  it('should return Weak for simple password', () => {
    const result = getPasswordStrength('abc');
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('should return Good for complex long password', () => {
    // Max raw score is 7 (3 length checks + 4 char variety), floor(7/2) = 3
    const result = getPasswordStrength('MyStr0ng!P@ssw0rd!!!');
    expect(result.score).toBe(3);
    expect(result.label).toBe('Good');
  });

  it('should increase score with length', () => {
    const short = getPasswordStrength('Ab1!');
    const long = getPasswordStrength('Ab1!abcdefg');
    expect(long.score).toBeGreaterThanOrEqual(short.score);
  });

  it('should include color for each level', () => {
    // Score 0-3 are reachable (max raw score 7, floor(7/2)=3)
    const cases = ['', 'abc', 'abcdefgh', 'abcdefghA1!'];
    for (const pw of cases) {
      const result = getPasswordStrength(pw);
      expect(result.color).toMatch(/^#/);
    }
  });

  it('should cap score at 3 (max achievable)', () => {
    const result = getPasswordStrength('MyUltraStr0ng!P@ssw0rd!!!');
    expect(result.score).toBeLessThanOrEqual(3);
  });
});

describe('validatePasswordMatch', () => {
  it('should accept matching passwords', () => {
    expect(validatePasswordMatch('Pass1!', 'Pass1!')).toEqual({ valid: true });
  });

  it('should reject empty confirmation', () => {
    const result = validatePasswordMatch('Pass1!', '');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please confirm your password');
  });

  it('should reject mismatched passwords', () => {
    const result = validatePasswordMatch('Pass1!', 'Pass2!');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Passwords do not match');
  });
});

describe('validateName', () => {
  it('should accept valid name', () => {
    expect(validateName('John Doe')).toEqual({ valid: true });
  });

  it('should accept two-character name', () => {
    expect(validateName('Jo')).toEqual({ valid: true });
  });

  it('should reject empty name', () => {
    const result = validateName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Full name is required');
  });

  it('should reject whitespace-only name', () => {
    const result = validateName('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Full name is required');
  });

  it('should reject single-character name', () => {
    const result = validateName('J');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Name must be at least 2 characters');
  });
});

describe('PASSWORD_RULES', () => {
  it('should have correct minimum length', () => {
    expect(PASSWORD_RULES.minLength).toBe(8);
  });

  it('should require all character types', () => {
    expect(PASSWORD_RULES.requireUppercase).toBe(true);
    expect(PASSWORD_RULES.requireLowercase).toBe(true);
    expect(PASSWORD_RULES.requireNumber).toBe(true);
    expect(PASSWORD_RULES.requireSpecialChar).toBe(true);
  });
});
