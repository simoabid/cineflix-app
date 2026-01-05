// ============================================
// CINEFLIX Auth Validation Utilities
// ============================================

/**
 * Password complexity configuration
 */
export const PASSWORD_RULES = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email || email.trim() === '') {
        return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Please enter a valid email address' };
    }

    return { valid: true };
};

/**
 * Validate password complexity
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!password) {
        return { valid: false, errors: ['Password is required'] };
    }

    if (password.length < PASSWORD_RULES.minLength) {
        errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
    }

    if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (PASSWORD_RULES.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Calculate password strength (0-4)
 * 0 = Very Weak, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
 */
export const getPasswordStrength = (password: string): {
    score: number;
    label: string;
    color: string;
} => {
    if (!password) {
        return { score: 0, label: 'Very Weak', color: '#6b7280' };
    }

    let score = 0;

    // Length checks
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    // Normalize score to 0-4
    const normalizedScore = Math.min(4, Math.floor(score / 2));

    const labels: Record<number, { label: string; color: string }> = {
        0: { label: 'Very Weak', color: '#ef4444' },
        1: { label: 'Weak', color: '#f97316' },
        2: { label: 'Fair', color: '#eab308' },
        3: { label: 'Good', color: '#22c55e' },
        4: { label: 'Strong', color: '#10b981' },
    };

    return {
        score: normalizedScore,
        ...labels[normalizedScore],
    };
};

/**
 * Validate password confirmation matches
 */
export const validatePasswordMatch = (
    password: string,
    confirmPassword: string
): { valid: boolean; error?: string } => {
    if (!confirmPassword) {
        return { valid: false, error: 'Please confirm your password' };
    }

    if (password !== confirmPassword) {
        return { valid: false, error: 'Passwords do not match' };
    }

    return { valid: true };
};

/**
 * Validate full name
 */
export const validateName = (name: string): { valid: boolean; error?: string } => {
    if (!name || name.trim() === '') {
        return { valid: false, error: 'Full name is required' };
    }

    if (name.trim().length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters' };
    }

    return { valid: true };
};
