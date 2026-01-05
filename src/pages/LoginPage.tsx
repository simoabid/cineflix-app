import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthCard, FormInput, PasswordInput, SocialAuthButtons } from '../components/auth';
import { validateEmail } from '../utils/validation';
import { AUTH_STRINGS } from '../utils/strings';

interface FormErrors {
    email?: string;
    password?: string;
    server?: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Get the intended destination
    const from = (location.state as { from?: Location })?.from?.pathname || '/';

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, from]);

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            newErrors.email = emailValidation.error;
            isValid = false;
        }

        if (!password) {
            newErrors.password = AUTH_STRINGS.errors.passwordRequired;
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
            const result = await login(email, password);

            if (result.success) {
                // Navigate to intended destination
                navigate(from, { replace: true });
            } else {
                setErrors(prev => ({
                    ...prev,
                    server: result.error || AUTH_STRINGS.errors.invalidCredentials,
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
            title={AUTH_STRINGS.login.title}
            subtitle={AUTH_STRINGS.login.subtitle}
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

                {/* Email */}
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
                    autoFocus
                />

                {/* Password */}
                <PasswordInput
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    label={AUTH_STRINGS.labels.password}
                    placeholder={AUTH_STRINGS.placeholders.password}
                    error={hasSubmitted ? errors.password : undefined}
                    autoComplete="current-password"
                    required
                />

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
                        AUTH_STRINGS.buttons.signIn
                    )}
                </button>

                {/* Social Auth */}
                <SocialAuthButtons disabled={isSubmitting} />

                {/* Sign Up Link */}
                <p className="text-center text-gray-400 text-sm">
                    {AUTH_STRINGS.links.noAccount}{' '}
                    <Link to="/signup" className="auth-link">
                        {AUTH_STRINGS.links.signUpLink}
                    </Link>
                </p>
            </form>
        </AuthCard>
    );
};

export default LoginPage;
