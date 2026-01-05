import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthCard, FormInput, PasswordInput, SocialAuthButtons } from '../components/auth';
import {
    validateEmail,
    validatePassword,
    validatePasswordMatch,
    validateName
} from '../utils/validation';
import { AUTH_STRINGS } from '../utils/strings';
import { AVATARS } from '../constants/avatars';

interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    server?: string;
}

const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const { register, isAuthenticated, isLoading: authLoading } = useAuth();

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate]);

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        const nameValidation = validateName(name);
        if (!nameValidation.valid) {
            newErrors.name = nameValidation.error;
            isValid = false;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            newErrors.email = emailValidation.error;
            isValid = false;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            newErrors.password = passwordValidation.errors[0];
            isValid = false;
        }

        const matchValidation = validatePasswordMatch(password, confirmPassword);
        if (!matchValidation.valid) {
            newErrors.confirmPassword = matchValidation.error;
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setHasSubmitted(true);

        // Clear server error
        setErrors(prev => ({ ...prev, server: undefined }));

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await register(email, password, name, selectedAvatar);

            if (result.success) {
                navigate('/', { replace: true });
            } else {
                setErrors(prev => ({
                    ...prev,
                    server: result.error || AUTH_STRINGS.errors.serverError,
                }));
            }
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                server: AUTH_STRINGS.errors.serverError,
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading if checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-netflix-black">
                <div className="auth-spinner" />
            </div>
        );
    }

    return (
        <AuthCard
            title={AUTH_STRINGS.signup.title}
            subtitle={AUTH_STRINGS.signup.subtitle}
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Server Error */}
                {errors.server && (
                    <div
                        className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm"
                        role="alert"
                        aria-live="polite"
                    >
                        {errors.server}
                    </div>
                )}

                {/* Avatar Selection */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">Choose your Avatar</label>
                    <div className="flex justify-center">
                        <div className="flex gap-4 p-2">
                            {AVATARS.map((avatar) => {
                                const AvatarComponent = avatar.Component;
                                const isSelected = selectedAvatar === avatar.id;
                                return (
                                    <button
                                        key={avatar.id}
                                        type="button"
                                        onClick={() => setSelectedAvatar(avatar.id)}
                                        className={`relative group rounded-full overflow-hidden transition-all duration-200 w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 ${isSelected
                                            ? 'ring-2 ring-netflix-red ring-offset-2 ring-offset-black/50 scale-110 shadow-lg shadow-netflix-red/30'
                                            : 'ring-1 ring-white/20 hover:ring-white/40 hover:scale-105'
                                            }`}
                                        title={avatar.name}
                                    >
                                        <AvatarComponent className="w-full h-full" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">Selected: {AVATARS.find(a => a.id === selectedAvatar)?.name}</p>
                </div>

                {/* Full Name - full width */}
                <FormInput
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    label={AUTH_STRINGS.labels.fullName}
                    placeholder={AUTH_STRINGS.placeholders.fullName}
                    error={hasSubmitted ? errors.name : undefined}
                    autoComplete="name"
                    required
                    autoFocus
                />

                {/* Email - full width */}
                <FormInput
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    label={AUTH_STRINGS.labels.email}
                    placeholder={AUTH_STRINGS.placeholders.email}
                    error={hasSubmitted ? errors.email : undefined}
                    autoComplete="email"
                    required
                />

                {/* Two-column grid for passwords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Password */}
                    <PasswordInput
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        label={AUTH_STRINGS.labels.password}
                        placeholder={AUTH_STRINGS.placeholders.password}
                        autoComplete="new-password"
                        required
                        showStrengthMeter
                        error={hasSubmitted ? errors.password : undefined}
                    />

                    {/* Confirm Password */}
                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        label={AUTH_STRINGS.labels.confirmPassword}
                        placeholder={AUTH_STRINGS.placeholders.confirmPassword}
                        autoComplete="new-password"
                        required
                        showMatchIndicator
                        passwordsMatch={password === confirmPassword && password.length > 0}
                        error={hasSubmitted ? errors.confirmPassword : undefined}
                    />
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="auth-checkbox"
                        />
                        <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                            {AUTH_STRINGS.labels.rememberMe}
                        </span>
                    </label>

                    <Link
                        to="/forgot-password"
                        className="text-sm auth-link"
                    >
                        {AUTH_STRINGS.buttons.forgotPassword}
                    </Link>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="auth-button-primary flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <span className="auth-spinner" />
                            <span>{AUTH_STRINGS.misc.loading}</span>
                        </>
                    ) : (
                        AUTH_STRINGS.buttons.signUp
                    )}
                </button>

                {/* Social Auth */}
                <SocialAuthButtons disabled={isSubmitting} />

                {/* Sign In Link */}
                <p className="text-center text-gray-400 text-sm">
                    {AUTH_STRINGS.links.hasAccount}{' '}
                    <Link to="/login" className="auth-link">
                        {AUTH_STRINGS.links.signInLink}
                    </Link>
                </p>
            </form>
        </AuthCard>
    );
};

export default SignupPage;
