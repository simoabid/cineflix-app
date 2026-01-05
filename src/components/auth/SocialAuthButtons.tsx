import React from 'react';

// Google Icon SVG
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);

// GitHub Icon SVG
const GitHubIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
        />
    </svg>
);

interface SocialAuthButtonsProps {
    onGoogleClick?: () => void;
    onGithubClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
}

/**
 * Social authentication buttons for Google and GitHub
 */
const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
    onGoogleClick,
    onGithubClick,
    disabled = false,
    isLoading = false,
}) => {
    const handleGoogleClick = () => {
        if (onGoogleClick) {
            onGoogleClick();
        } else {
            // Placeholder - show toast or console message
            console.log('Google OAuth not configured. See AUTH_INTEGRATION.md for setup instructions.');
            alert('Google sign-in will be available soon. Please use email/password for now.');
        }
    };

    const handleGithubClick = () => {
        if (onGithubClick) {
            onGithubClick();
        } else {
            // Placeholder - show toast or console message
            console.log('GitHub OAuth not configured. See AUTH_INTEGRATION.md for setup instructions.');
            alert('GitHub sign-in will be available soon. Please use email/password for now.');
        }
    };

    return (
        <div className="space-y-4 mt-6">
            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 text-gray-400 bg-transparent">or continue with</span>
                </div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-4">
                {/* Google Button */}
                <button
                    type="button"
                    onClick={handleGoogleClick}
                    disabled={disabled || isLoading}
                    className="flex items-center justify-center gap-3 px-4 py-3 
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     rounded-lg text-white font-medium transition-all duration-200 
                     focus:outline-none focus:ring-2 focus:ring-white/20
                     disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Continue with Google"
                >
                    <GoogleIcon />
                    <span>Google</span>
                </button>

                {/* GitHub Button */}
                <button
                    type="button"
                    onClick={handleGithubClick}
                    disabled={disabled || isLoading}
                    className="flex items-center justify-center gap-3 px-4 py-3 
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     rounded-lg text-white font-medium transition-all duration-200 
                     focus:outline-none focus:ring-2 focus:ring-white/20
                     disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Continue with GitHub"
                >
                    <GitHubIcon />
                    <span>GitHub</span>
                </button>
            </div>
        </div>
    );
};

export default SocialAuthButtons;

