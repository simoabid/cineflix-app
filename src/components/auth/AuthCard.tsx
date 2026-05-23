import React from 'react';
import { Link } from 'react-router-dom';


interface AuthCardProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

/**
 * Glassmorphism auth card component
 * Provides consistent styling for Login and Signup pages
 */
const AuthCard: React.FC<AuthCardProps> = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen w-full flex flex-col justify-start sm:justify-center items-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8 auth-background overflow-y-auto">
            {/* Overlay */}
            <div className="fixed inset-0 auth-overlay" />

            {/* Card Container */}
            <div className="relative z-10 w-full max-w-xl animate-fade-in my-auto">
                {/* Logo */}
                <div className="flex justify-center mb-6 relative z-20">
                    <Link to="/" className="transition-transform hover:scale-105">
                        <img
                            src={`${import.meta.env.BASE_URL}cineflix-logo.png`}
                            alt="CINEFLIX - Your Streaming Destination"
                            className="h-8 sm:h-10 w-auto logo-glow"
                        />
                    </Link>
                </div>

                {/* Card */}
                <div className="auth-card rounded-2xl p-5 sm:p-8 shadow-2xl relative z-10">
                    {/* Header */}
                    <div className="text-center mb-4 sm:mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-gray-400 text-xs sm:text-sm">{subtitle}</p>
                        )}
                    </div>

                    {/* Content */}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthCard;
