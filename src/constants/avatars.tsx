// Premium Animal Avatar Components - Realistic & Professional
import React from 'react';

export interface AvatarComponentProps {
    className?: string;
}

// Lion Avatar - Realistic
export const LionAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="lionMane" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#D4A84B" />
                <stop offset="70%" stopColor="#8B6914" />
                <stop offset="100%" stopColor="#5C4A1F" />
            </radialGradient>
            <radialGradient id="lionFace" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#E8C56B" />
                <stop offset="100%" stopColor="#C9A33A" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#lionMane)" />
        <ellipse cx="50" cy="54" rx="28" ry="26" fill="url(#lionFace)" />
        <ellipse cx="50" cy="62" rx="12" ry="8" fill="#E8D5A8" />
        <ellipse cx="42" cy="48" rx="4" ry="5" fill="#2D1F0F" />
        <ellipse cx="58" cy="48" rx="4" ry="5" fill="#2D1F0F" />
        <circle cx="43" cy="47" r="1.5" fill="white" />
        <circle cx="59" cy="47" r="1.5" fill="white" />
        <ellipse cx="50" cy="58" rx="4" ry="3" fill="#4A3520" />
        <path d="M46 64 Q50 68 54 64" stroke="#4A3520" strokeWidth="1.5" fill="none" />
        <path d="M50 58 L50 64" stroke="#4A3520" strokeWidth="1" />
    </svg>
);

// Wolf Avatar - Realistic
export const WolfAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="wolfBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4A5568" />
                <stop offset="100%" stopColor="#1A202C" />
            </radialGradient>
            <linearGradient id="wolfFur" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#718096" />
                <stop offset="100%" stopColor="#4A5568" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#wolfBg)" />
        <polygon points="22,25 32,55 18,50" fill="#718096" />
        <polygon points="78,25 68,55 82,50" fill="#718096" />
        <polygon points="24,28 30,50 20,48" fill="#CBD5E0" />
        <polygon points="76,28 70,50 80,48" fill="#CBD5E0" />
        <ellipse cx="50" cy="58" rx="26" ry="24" fill="url(#wolfFur)" />
        <ellipse cx="50" cy="68" rx="14" ry="10" fill="#E2E8F0" />
        <ellipse cx="40" cy="52" rx="5" ry="6" fill="#F6AD55" />
        <ellipse cx="60" cy="52" rx="5" ry="6" fill="#F6AD55" />
        <ellipse cx="40" cy="53" rx="2.5" ry="4" fill="#1A202C" />
        <ellipse cx="60" cy="53" rx="2.5" ry="4" fill="#1A202C" />
        <ellipse cx="50" cy="64" rx="4" ry="3" fill="#2D3748" />
    </svg>
);

// Fox Avatar - Realistic
export const FoxAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="foxBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ED8936" />
                <stop offset="100%" stopColor="#C05621" />
            </radialGradient>
            <linearGradient id="foxFur" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F6AD55" />
                <stop offset="100%" stopColor="#DD6B20" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#foxBg)" />
        <polygon points="18,20 30,55 12,45" fill="#DD6B20" />
        <polygon points="82,20 70,55 88,45" fill="#DD6B20" />
        <polygon points="20,25 28,48 15,42" fill="#2D3748" />
        <polygon points="80,25 72,48 85,42" fill="#2D3748" />
        <ellipse cx="50" cy="58" rx="28" ry="26" fill="url(#foxFur)" />
        <ellipse cx="50" cy="70" rx="16" ry="12" fill="#FFFAF0" />
        <ellipse cx="38" cy="52" rx="5" ry="6" fill="#2D3748" />
        <ellipse cx="62" cy="52" rx="5" ry="6" fill="#2D3748" />
        <circle cx="39" cy="51" r="2" fill="white" />
        <circle cx="63" cy="51" r="2" fill="white" />
        <ellipse cx="50" cy="64" rx="4" ry="3" fill="#1A202C" />
        <path d="M46 70 Q50 74 54 70" stroke="#C05621" strokeWidth="1.5" fill="none" />
    </svg>
);

// Panda Avatar - Realistic
export const PandaAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="pandaBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#48BB78" />
                <stop offset="100%" stopColor="#276749" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#pandaBg)" />
        <circle cx="28" cy="32" r="10" fill="#1A202C" />
        <circle cx="72" cy="32" r="10" fill="#1A202C" />
        <circle cx="50" cy="55" r="30" fill="#FFFAF0" />
        <ellipse cx="36" cy="50" rx="10" ry="12" fill="#1A202C" />
        <ellipse cx="64" cy="50" rx="10" ry="12" fill="#1A202C" />
        <ellipse cx="36" cy="50" rx="4" ry="5" fill="#4A5568" />
        <ellipse cx="64" cy="50" rx="4" ry="5" fill="#4A5568" />
        <circle cx="37" cy="49" r="1.5" fill="white" />
        <circle cx="65" cy="49" r="1.5" fill="white" />
        <ellipse cx="50" cy="64" rx="5" ry="4" fill="#1A202C" />
        <path d="M45 72 Q50 78 55 72" stroke="#1A202C" strokeWidth="2" fill="none" />
    </svg>
);

// Owl Avatar - Realistic
export const OwlAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="owlBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#805AD5" />
                <stop offset="100%" stopColor="#44337A" />
            </radialGradient>
            <radialGradient id="owlFeathers" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#9F7AEA" />
                <stop offset="100%" stopColor="#6B46C1" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#owlBg)" />
        <polygon points="28,18 36,42 22,38" fill="#6B46C1" />
        <polygon points="72,18 64,42 78,38" fill="#6B46C1" />
        <ellipse cx="50" cy="58" rx="28" ry="28" fill="url(#owlFeathers)" />
        <circle cx="36" cy="50" r="12" fill="#FFFAF0" />
        <circle cx="64" cy="50" r="12" fill="#FFFAF0" />
        <circle cx="36" cy="50" r="7" fill="#F6AD55" />
        <circle cx="64" cy="50" r="7" fill="#F6AD55" />
        <circle cx="36" cy="50" r="4" fill="#1A202C" />
        <circle cx="64" cy="50" r="4" fill="#1A202C" />
        <circle cx="37" cy="49" r="1.5" fill="white" />
        <circle cx="65" cy="49" r="1.5" fill="white" />
        <polygon points="50,60 46,70 54,70" fill="#F6AD55" />
    </svg>
);

// Cat Avatar - Realistic
export const CatAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="catBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E53E3E" />
                <stop offset="100%" stopColor="#822727" />
            </radialGradient>
            <linearGradient id="catFur" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4A5568" />
                <stop offset="100%" stopColor="#2D3748" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#catBg)" />
        <polygon points="20,22 32,55 14,48" fill="#4A5568" />
        <polygon points="80,22 68,55 86,48" fill="#4A5568" />
        <polygon points="22,26 30,50 17,45" fill="#FC8181" />
        <polygon points="78,26 70,50 83,45" fill="#FC8181" />
        <ellipse cx="50" cy="58" rx="26" ry="26" fill="url(#catFur)" />
        <ellipse cx="38" cy="52" rx="6" ry="8" fill="#68D391" />
        <ellipse cx="62" cy="52" rx="6" ry="8" fill="#68D391" />
        <ellipse cx="38" cy="53" rx="2" ry="5" fill="#1A202C" />
        <ellipse cx="62" cy="53" rx="2" ry="5" fill="#1A202C" />
        <ellipse cx="50" cy="64" rx="4" ry="3" fill="#FC8181" />
        <line x1="22" y1="62" x2="42" y2="65" stroke="#A0AEC0" strokeWidth="1" />
        <line x1="22" y1="68" x2="42" y2="68" stroke="#A0AEC0" strokeWidth="1" />
        <line x1="58" y1="65" x2="78" y2="62" stroke="#A0AEC0" strokeWidth="1" />
        <line x1="58" y1="68" x2="78" y2="68" stroke="#A0AEC0" strokeWidth="1" />
    </svg>
);

// Penguin Avatar - Realistic
export const PenguinAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="penguinBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4299E1" />
                <stop offset="100%" stopColor="#2B6CB0" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#penguinBg)" />
        <ellipse cx="50" cy="58" rx="26" ry="30" fill="#1A202C" />
        <ellipse cx="50" cy="65" rx="16" ry="22" fill="#FFFAF0" />
        <circle cx="40" cy="46" r="8" fill="#FFFAF0" />
        <circle cx="60" cy="46" r="8" fill="#FFFAF0" />
        <circle cx="40" cy="46" r="4" fill="#1A202C" />
        <circle cx="60" cy="46" r="4" fill="#1A202C" />
        <circle cx="41" cy="45" r="1.5" fill="white" />
        <circle cx="61" cy="45" r="1.5" fill="white" />
        <polygon points="50,54 44,64 56,64" fill="#F6AD55" />
    </svg>
);

// Bear Avatar - Realistic
export const BearAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="bearBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#A0522D" />
                <stop offset="100%" stopColor="#5C3317" />
            </radialGradient>
            <radialGradient id="bearFace" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#CD853F" />
                <stop offset="100%" stopColor="#8B4513" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#bearBg)" />
        <circle cx="26" cy="30" r="10" fill="#8B4513" />
        <circle cx="74" cy="30" r="10" fill="#8B4513" />
        <circle cx="26" cy="30" r="5" fill="#DEB887" />
        <circle cx="74" cy="30" r="5" fill="#DEB887" />
        <circle cx="50" cy="55" r="28" fill="url(#bearFace)" />
        <ellipse cx="50" cy="64" rx="14" ry="10" fill="#DEB887" />
        <circle cx="40" cy="50" r="4" fill="#1A202C" />
        <circle cx="60" cy="50" r="4" fill="#1A202C" />
        <circle cx="41" cy="49" r="1.5" fill="white" />
        <circle cx="61" cy="49" r="1.5" fill="white" />
        <ellipse cx="50" cy="62" rx="5" ry="4" fill="#1A202C" />
        <path d="M45 70 Q50 76 55 70" stroke="#1A202C" strokeWidth="2" fill="none" />
    </svg>
);

// Avatar registry
export interface Avatar {
    id: string;
    name: string;
    Component: React.FC<AvatarComponentProps>;
}

export const AVATARS: Avatar[] = [
    { id: 'lion', name: 'King Lion', Component: LionAvatar },
    { id: 'wolf', name: 'Alpha Wolf', Component: WolfAvatar },
    { id: 'fox', name: 'Sly Fox', Component: FoxAvatar },
    { id: 'panda', name: 'Zen Panda', Component: PandaAvatar },
    { id: 'owl', name: 'Wise Owl', Component: OwlAvatar },
    { id: 'cat', name: 'Cool Cat', Component: CatAvatar },
    { id: 'penguin', name: 'Arctic Penguin', Component: PenguinAvatar },
    { id: 'bear', name: 'Grizzly Bear', Component: BearAvatar },
];

// Helper to render avatar by ID
export const renderAvatarById = (id: string, className?: string) => {
    const avatar = AVATARS.find(a => a.id === id);
    if (!avatar) return null;
    const { Component } = avatar;
    return <Component className={className} />;
};
