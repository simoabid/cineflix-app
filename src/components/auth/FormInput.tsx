import React from 'react';

interface FormInputProps {
    id: string;
    name: string;
    type?: 'text' | 'email' | 'tel' | 'url';
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    label: string;
    placeholder?: string;
    error?: string;
    autoComplete?: string;
    required?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
}

/**
 * Styled form input component
 */
const FormInput: React.FC<FormInputProps> = ({
    id,
    name,
    type = 'text',
    value,
    onChange,
    onBlur,
    label,
    placeholder,
    error,
    autoComplete,
    required = false,
    disabled = false,
    autoFocus = false,
}) => {
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

            {/* Input */}
            <input
                type={type}
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required={required}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                className={`auth-input ${error
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-600/50 focus:ring-netflix-red'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />

            {/* Error Message */}
            {error && (
                <p
                    id={`${id}-error`}
                    className="text-sm text-red-400 flex items-center gap-1"
                    role="alert"
                >
                    <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
                    {error}
                </p>
            )}
        </div>
    );
};

export default FormInput;
