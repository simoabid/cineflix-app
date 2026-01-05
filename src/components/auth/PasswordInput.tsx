import React, { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { getPasswordStrength } from '../../utils/validation';

interface PasswordInputProps {
    id: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    label: string;
    placeholder?: string;
    error?: string;
    showStrengthMeter?: boolean;
    showMatchIndicator?: boolean;
    passwordsMatch?: boolean;
    autoComplete?: string;
    required?: boolean;
    disabled?: boolean;
}

/**
 * Password input with show/hide toggle and optional strength meter
 */
const PasswordInput: React.FC<PasswordInputProps> = ({
    id,
    name,
    value,
    onChange,
    onBlur,
    label,
    placeholder = 'Enter your password',
    error,
    showStrengthMeter = false,
    showMatchIndicator = false,
    passwordsMatch = false,
    autoComplete = 'current-password',
    required = false,
    disabled = false,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const strength = showStrengthMeter ? getPasswordStrength(value) : null;

    return (
        <div className="space-y-2">
            {/* Label */}
            <label
                htmlFor={id}
                className="block text-sm font-medium text-gray-300"
            >
                {label}
                {required && <span className="text-netflix-red ml-1">*</span>}
            </label>

            {/* Input Container */}
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    id={id}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`auth-input pr-12 ${error
                        ? 'border-red-500/50'
                        : passwordsMatch && value
                            ? 'border-green-500/50'
                            : 'border-white/15'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />

                {/* Show/Hide Toggle */}
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                >
                    {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                    ) : (
                        <Eye className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Strength Meter */}
            {showStrengthMeter && value && strength && (
                <div className="space-y-1">
                    <div className="flex gap-1">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                style={{
                                    backgroundColor:
                                        index < strength.score
                                            ? strength.color
                                            : 'rgba(107, 114, 128, 0.3)',
                                }}
                            />
                        ))}
                    </div>
                    <p
                        className="text-xs transition-colors"
                        style={{ color: strength.color }}
                    >
                        {strength.label}
                    </p>
                </div>
            )}

            {/* Password Match Indicator */}
            {showMatchIndicator && value && passwordsMatch && (
                <p className="text-xs text-green-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Passwords match
                </p>
            )}

            {/* Error Message */}
            {error && (
                <p
                    className="text-xs text-red-400 mt-1"
                    id={`${id}-error`}
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
};

export default PasswordInput;
