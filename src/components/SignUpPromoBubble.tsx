import React, { useState, useEffect } from 'react';
import { X, Sparkles, Tv, Download, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const SignUpPromoBubble: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already dismissed the promo or signed up
        const hasSeenPromo = localStorage.getItem('hasSeenSignUpPromo');
        const authToken = localStorage.getItem('auth_token');

        if (!hasSeenPromo && !authToken) {
            // Show after a short delay for better effect
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenSignUpPromo', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="absolute top-full right-0 mt-4 w-80 z-50 animate-slide-in-up">
            {/* Arrow pointing up */}
            <div className="absolute -top-2 right-6 w-4 h-4 bg-[#141414] border-t border-l border-white/10 transform rotate-45 z-10"></div>

            <div className="bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-netflix-red/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-20">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                            <span className="bg-gradient-to-r from-netflix-red to-red-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg">
                                <Sparkles className="w-4 h-4 text-white" />
                            </span>
                            <h3 className="text-white font-bold text-lg"></h3>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>Join CINEFLIX now!

                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        Unlock the full experience and enjoy these exclusive benefits:
                    </p>

                    <ul className="space-y-3 mb-5">
                        <li className="flex items-start space-x-3 text-sm text-gray-300">
                            <Tv className="w-4 h-4 text-netflix-red mt-0.5 shrink-0" />
                            <span>Create <span className="text-white font-medium">unlimited</span> watchlists</span>
                        </li>
                        <li className="flex items-start space-x-3 text-sm text-gray-300">
                            <Download className="w-4 h-4 text-netflix-red mt-0.5 shrink-0" />
                            <span>Download to watch <span className="text-white font-medium">offline</span></span>
                        </li>
                        <li className="flex items-start space-x-3 text-sm text-gray-300">
                            <Users className="w-4 h-4 text-netflix-red mt-0.5 shrink-0" />
                            <span>Sync across <span className="text-white font-medium">all devices</span></span>
                        </li>
                    </ul>

                    <Link
                        to="/signup"
                        onClick={handleDismiss}
                        className="block w-full text-center bg-netflix-red hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-red-900/20"
                    >
                        Sign Up Now - It's Free
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SignUpPromoBubble;
