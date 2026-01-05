// ============================================
// CINEFLIX Localization Strings
// ============================================
// All user-facing text in one place for easy i18n

export const AUTH_STRINGS = {
    // Page Titles
    login: {
        title: 'Sign In',
        subtitle: 'Welcome back to CINEFLIX',
    },
    signup: {
        title: 'Create Account',
        subtitle: 'Join CINEFLIX today',
    },

    // Form Labels
    labels: {
        email: 'Email Address',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        fullName: 'Full Name',
        rememberMe: 'Remember me',
    },

    // Placeholders
    placeholders: {
        email: 'Enter your email',
        password: 'Enter your password',
        confirmPassword: 'Confirm your password',
        fullName: 'Enter your full name',
    },

    // Buttons
    buttons: {
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        continueWithGoogle: 'Continue with Google',
        continueWithGithub: 'Continue with GitHub',
        forgotPassword: 'Forgot password?',
        resetPassword: 'Reset Password',
        changePassword: 'Change Password',
        saveChanges: 'Save Changes',
        cancel: 'Cancel',
    },

    // Links
    links: {
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        signUpLink: 'Sign up',
        signInLink: 'Sign in',
        backToLogin: 'Back to login',
    },

    // Validation Errors
    errors: {
        emailRequired: 'Email is required',
        emailInvalid: 'Please enter a valid email address',
        passwordRequired: 'Password is required',
        passwordMinLength: 'Password must be at least 8 characters',
        passwordUppercase: 'Password must contain at least one uppercase letter',
        passwordLowercase: 'Password must contain at least one lowercase letter',
        passwordNumber: 'Password must contain at least one number',
        passwordSpecial: 'Password must contain at least one special character',
        passwordMismatch: 'Passwords do not match',
        nameRequired: 'Full name is required',
        nameMinLength: 'Name must be at least 2 characters',
        invalidCredentials: 'Invalid email or password',
        emailExists: 'An account with this email already exists',
        serverError: 'Something went wrong. Please try again.',
        networkError: 'Unable to connect. Please check your internet connection.',
    },

    // Success Messages
    success: {
        accountCreated: 'Account created successfully!',
        passwordChanged: 'Password changed successfully!',
        profileUpdated: 'Profile updated successfully!',
        loggedOut: 'You have been signed out.',
    },

    // Password Strength
    passwordStrength: {
        veryWeak: 'Very Weak',
        weak: 'Weak',
        fair: 'Fair',
        good: 'Good',
        strong: 'Strong',
    },

    // Misc
    misc: {
        or: 'or',
        loading: 'Loading...',
        memberSince: 'Member since',
    },
};

export default AUTH_STRINGS;
