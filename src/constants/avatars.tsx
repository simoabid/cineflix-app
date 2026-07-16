// Modern professional illustrated human avatars (flat vector portrait style)
import React from 'react';

export interface AvatarComponentProps {
    className?: string;
}

// ─── Shared face helpers (inline shapes for consistent style) ─────────────────

const FaceBase = ({
    skin,
    cheek,
}: {
    skin: string;
    cheek?: string;
}) => (
    <>
        {/* Neck */}
        <ellipse cx="50" cy="78" rx="14" ry="10" fill={skin} />
        {/* Head */}
        <ellipse cx="50" cy="42" rx="28" ry="32" fill={skin} />
        {/* Cheeks */}
        {cheek && (
            <>
                <ellipse cx="32" cy="48" rx="5" ry="3.5" fill={cheek} opacity="0.45" />
                <ellipse cx="68" cy="48" rx="5" ry="3.5" fill={cheek} opacity="0.45" />
            </>
        )}
    </>
);

const Eyes = ({
    iris = '#3D2914',
    y = 40,
    leftX = 38,
    rightX = 62,
}: {
    iris?: string;
    y?: number;
    leftX?: number;
    rightX?: number;
}) => (
    <>
        {/* Whites */}
        <ellipse cx={leftX} cy={y} rx="5.5" ry="6.5" fill="#FFF" />
        <ellipse cx={rightX} cy={y} rx="5.5" ry="6.5" fill="#FFF" />
        {/* Iris */}
        <circle cx={leftX} cy={y + 0.5} r="3.2" fill={iris} />
        <circle cx={rightX} cy={y + 0.5} r="3.2" fill={iris} />
        {/* Pupils */}
        <circle cx={leftX} cy={y + 0.5} r="1.6" fill="#1A1208" />
        <circle cx={rightX} cy={y + 0.5} r="1.6" fill="#1A1208" />
        {/* Highlights */}
        <circle cx={leftX - 1} cy={y - 1} r="1" fill="#FFF" />
        <circle cx={rightX - 1} cy={y - 1} r="1" fill="#FFF" />
    </>
);

const Brows = ({
    color = '#2C1810',
    y = 30,
}: {
    color?: string;
    y?: number;
}) => (
    <>
        <path
            d={`M30 ${y + 2} Q38 ${y - 2} 46 ${y + 1}`}
            stroke={color}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
        />
        <path
            d={`M54 ${y + 1} Q62 ${y - 2} 70 ${y + 2}`}
            stroke={color}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
        />
    </>
);

const Nose = ({ skin, y = 50 }: { skin: string; y?: number }) => (
    <ellipse cx="50" cy={y} rx="3.5" ry="4.5" fill={skin} opacity="0.55" />
);

const Smile = ({ y = 60 }: { y?: number }) => (
    <path
        d={`M40 ${y} Q50 ${y + 8} 60 ${y}`}
        stroke="#C4785A"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
    />
);

const Glasses = ({
    frame = '#2D3748',
    y = 40,
}: {
    frame?: string;
    y?: number;
}) => (
    <>
        <circle cx="38" cy={y} r="9" fill="none" stroke={frame} strokeWidth="2.5" />
        <circle cx="62" cy={y} r="9" fill="none" stroke={frame} strokeWidth="2.5" />
        <line x1="47" y1={y} x2="53" y2={y} stroke={frame} strokeWidth="2.5" />
        <line x1="29" y1={y} x2="22" y2={y - 2} stroke={frame} strokeWidth="2" strokeLinecap="round" />
        <line x1="71" y1={y} x2="78" y2={y - 2} stroke={frame} strokeWidth="2" strokeLinecap="round" />
    </>
);

// ─── Individual avatars ──────────────────────────────────────────────────────

/** Alex — young man, black hair, glasses, green hoodie */
export const AlexAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="alexBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8F5E9" />
                <stop offset="100%" stopColor="#C8E6C9" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#alexBg)" />
        {/* Shoulders / hoodie */}
        <path d="M8 100 C8 72 22 62 50 62 C78 62 92 72 92 100 Z" fill="#2E7D32" />
        <path d="M35 68 Q50 78 65 68 L68 100 L32 100 Z" fill="#F9A825" />
        <FaceBase skin="#F5C9A0" cheek="#F0A080" />
        {/* Hair */}
        <path
            d="M22 42 C20 18 35 8 50 8 C68 8 80 18 78 42 C78 28 70 18 50 16 C30 18 22 28 22 42 Z"
            fill="#1A1A1A"
        />
        <path d="M22 38 C24 28 30 22 38 20 L36 40 Z" fill="#1A1A1A" />
        <path d="M78 38 C76 28 70 22 62 20 L64 40 Z" fill="#1A1A1A" />
        <Brows color="#1A1A1A" />
        <Eyes iris="#4A3728" />
        <Glasses frame="#1A1A1A" />
        <Nose skin="#E0B080" />
        <Smile />
    </svg>
);

/** Jordan — dark skin, silver glasses, charcoal tee */
export const JordanAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="jordanBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EFEBE9" />
                <stop offset="100%" stopColor="#D7CCC8" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#jordanBg)" />
        <path d="M6 100 C6 70 20 60 50 60 C80 60 94 70 94 100 Z" fill="#424242" />
        <FaceBase skin="#8D5524" cheek="#A56B3A" />
        {/* Short textured hair */}
        <ellipse cx="50" cy="22" rx="28" ry="16" fill="#1A1208" />
        <path d="M22 30 C24 14 40 8 50 8 C62 8 76 14 78 30 C70 18 58 14 50 14 C40 14 28 18 22 30 Z" fill="#1A1208" />
        <Brows color="#1A1208" y={32} />
        <Eyes iris="#3E2723" />
        <Glasses frame="#B0BEC5" />
        <Nose skin="#7A4A1E" />
        <Smile />
    </svg>
);

/** Sam — light skin, black hair, red sweater vest */
export const SamAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="samBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF3E0" />
                <stop offset="100%" stopColor="#FFE0B2" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#samBg)" />
        {/* White shirt */}
        <path d="M10 100 C10 72 24 62 50 62 C76 62 90 72 90 100 Z" fill="#FAFAFA" />
        {/* Red vest */}
        <path d="M18 100 C18 74 28 64 42 64 L45 100 Z" fill="#C62828" />
        <path d="M82 100 C82 74 72 64 58 64 L55 100 Z" fill="#C62828" />
        <FaceBase skin="#FDD9B5" cheek="#F5B8A0" />
        {/* Neat side-part hair */}
        <path
            d="M24 40 C22 16 38 6 50 6 C66 6 78 16 76 40 C76 24 66 14 50 14 C34 14 24 24 24 40 Z"
            fill="#212121"
        />
        <path d="M24 36 C26 22 34 16 42 14 L40 42 Z" fill="#212121" />
        <Brows color="#212121" />
        <Eyes iris="#5D4037" />
        <Glasses frame="#37474F" />
        <Nose skin="#E8C49A" />
        <Smile />
    </svg>
);

/** Casey — warm skin, messy dark hair, rose hoodie */
export const CaseyAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="caseyBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FCE4EC" />
                <stop offset="100%" stopColor="#F8BBD0" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#caseyBg)" />
        <path d="M8 100 C8 70 22 60 50 60 C78 60 92 70 92 100 Z" fill="#AD1457" />
        {/* Hoodie drawstring area */}
        <path d="M38 68 Q50 80 62 68" stroke="#880E4F" strokeWidth="2" fill="none" />
        <FaceBase skin="#E0A070" cheek="#D4886A" />
        {/* Messy layered hair */}
        <path
            d="M20 44 C18 20 32 6 50 6 C70 6 82 20 80 44 C82 28 74 14 50 12 C28 14 18 28 20 44 Z"
            fill="#3E2723"
        />
        <path d="M20 40 Q16 30 24 18 Q28 28 26 42 Z" fill="#3E2723" />
        <path d="M80 40 Q84 30 76 18 Q72 28 74 42 Z" fill="#3E2723" />
        <path d="M40 10 Q50 4 60 10 Q55 16 50 14 Q45 16 40 10 Z" fill="#3E2723" />
        <Brows color="#3E2723" />
        <Eyes iris="#4E342E" />
        <Nose skin="#C88850" />
        <Smile />
    </svg>
);

/** Riley — woman, auburn bob, black glasses, purple cardigan */
export const RileyAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="rileyBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EDE7F6" />
                <stop offset="100%" stopColor="#D1C4E9" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#rileyBg)" />
        <path d="M8 100 C8 72 22 62 50 62 C78 62 92 72 92 100 Z" fill="#5E35B1" />
        <path d="M30 68 L50 78 L70 68 L72 100 L28 100 Z" fill="#26C6DA" />
        <FaceBase skin="#F5C9A8" cheek="#F0A898" />
        {/* Bob hair with fringe */}
        <path
            d="M18 48 C16 18 30 4 50 4 C72 4 84 18 82 48 C82 58 78 62 74 58 C74 40 68 28 50 26 C32 28 26 40 26 58 C22 62 18 58 18 48 Z"
            fill="#A0522D"
        />
        <path d="M28 28 C36 18 46 14 50 14 C56 14 66 18 72 28 C68 22 58 18 50 18 C40 18 32 22 28 28 Z" fill="#8B4513" />
        <Brows color="#6D3B12" y={31} />
        <Eyes iris="#1565C0" />
        <Glasses frame="#212121" />
        <Nose skin="#E0B090" />
        {/* Freckles */}
        <circle cx="34" cy="50" r="0.9" fill="#C9896A" opacity="0.7" />
        <circle cx="38" cy="53" r="0.8" fill="#C9896A" opacity="0.7" />
        <circle cx="66" cy="50" r="0.9" fill="#C9896A" opacity="0.7" />
        <circle cx="62" cy="53" r="0.8" fill="#C9896A" opacity="0.7" />
        <Smile />
    </svg>
);

/** Avery — woman, dark braided hair, burgundy top */
export const AveryAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="averyBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBE9E7" />
                <stop offset="100%" stopColor="#FFCCBC" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#averyBg)" />
        <path d="M10 100 C10 72 24 62 50 62 C76 62 90 72 90 100 Z" fill="#8E2430" />
        {/* Neckline lace hint */}
        <path d="M40 68 Q50 74 60 68" stroke="#6A1B23" strokeWidth="1.5" fill="none" />
        <FaceBase skin="#A0522D" cheek="#B86A40" />
        {/* Volume hair + braid */}
        <path
            d="M20 46 C16 20 30 4 50 4 C72 4 84 20 80 46 C82 56 78 64 72 60 C74 40 66 24 50 22 C34 24 26 40 28 60 C22 64 18 56 20 46 Z"
            fill="#1A1208"
        />
        {/* Braid over shoulder */}
        <path
            d="M72 48 C78 54 80 64 78 74 C76 82 72 88 68 90 C70 82 72 72 70 62 C68 54 70 50 72 48 Z"
            fill="#1A1208"
        />
        <ellipse cx="74" cy="58" rx="3" ry="4" fill="#2C1810" opacity="0.5" />
        <ellipse cx="73" cy="68" rx="2.5" ry="3.5" fill="#2C1810" opacity="0.5" />
        <ellipse cx="71" cy="78" rx="2" ry="3" fill="#2C1810" opacity="0.5" />
        <Brows color="#1A1208" />
        <Eyes iris="#3E2723" />
        <Nose skin="#8B4513" />
        {/* Freckles */}
        <circle cx="35" cy="50" r="0.8" fill="#8B5A2B" opacity="0.6" />
        <circle cx="65" cy="50" r="0.8" fill="#8B5A2B" opacity="0.6" />
        <Smile />
    </svg>
);

/** Quinn — woman, ponytail, red glasses, purple tee */
export const QuinnAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="quinnBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F3E5F5" />
                <stop offset="100%" stopColor="#E1BEE7" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#quinnBg)" />
        <path d="M12 100 C12 72 26 62 50 62 C74 62 88 72 88 100 Z" fill="#7B1FA2" />
        <FaceBase skin="#F0C4A0" cheek="#E8A888" />
        {/* Hair base + ponytail */}
        <path
            d="M24 42 C22 18 36 6 50 6 C66 6 78 18 76 42 C76 28 66 16 50 16 C34 16 24 28 24 42 Z"
            fill="#4E342E"
        />
        <ellipse cx="72" cy="38" rx="10" ry="16" fill="#4E342E" />
        <path d="M68 48 C74 52 80 62 78 78 C76 86 72 88 70 84 C72 72 70 58 68 48 Z" fill="#4E342E" />
        <Brows color="#3E2723" />
        <Eyes iris="#5D4037" />
        <Glasses frame="#C62828" />
        <Nose skin="#D4A07A" />
        <Smile />
    </svg>
);

/** Blake — red hair, blue eyes, green hoodie */
export const BlakeAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="blakeBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8F5E9" />
                <stop offset="100%" stopColor="#A5D6A7" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#blakeBg)" />
        <path d="M8 100 C8 70 22 60 50 60 C78 60 92 70 92 100 Z" fill="#455A64" />
        <path d="M35 66 Q50 78 65 66 L68 100 L32 100 Z" fill="#2E7D32" />
        <FaceBase skin="#FDDCC4" cheek="#F5B8A0" />
        {/* Red/orange hair with volume */}
        <path
            d="M18 46 C14 18 30 2 50 2 C72 2 86 18 82 46 C84 30 74 12 50 10 C28 12 16 30 18 46 Z"
            fill="#E65100"
        />
        <path d="M18 40 Q12 28 22 14 Q28 24 26 42 Z" fill="#EF6C00" />
        <path d="M82 40 Q88 28 78 14 Q72 24 74 42 Z" fill="#EF6C00" />
        <path d="M42 6 Q50 0 58 6 Q54 14 50 12 Q46 14 42 6 Z" fill="#FF8A65" />
        <Brows color="#BF360C" />
        <Eyes iris="#1565C0" />
        <Nose skin="#E8B898" />
        <Smile />
    </svg>
);

/** Morgan — beard, glasses, brown sweater */
export const MorganAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="morganBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EFEBE9" />
                <stop offset="100%" stopColor="#BCAAA4" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#morganBg)" />
        <path d="M8 100 C8 72 22 62 50 62 C78 62 92 72 92 100 Z" fill="#6D4C41" />
        <FaceBase skin="#C68642" cheek="#B87333" />
        {/* Short dark hair */}
        <path
            d="M24 38 C22 16 36 6 50 6 C66 6 78 16 76 38 C74 22 64 14 50 14 C36 14 26 22 24 38 Z"
            fill="#1A1208"
        />
        {/* Full beard */}
        <path
            d="M28 52 C26 62 30 78 50 82 C70 78 74 62 72 52 C68 60 60 66 50 66 C40 66 32 60 28 52 Z"
            fill="#2C1810"
        />
        <path d="M42 58 Q50 64 58 58" fill="#1A1208" opacity="0.4" />
        <Brows color="#1A1208" />
        <Eyes iris="#3E2723" />
        <Glasses frame="#37474F" />
        <Nose skin="#A86F35" />
        {/* Mouth peeks through beard */}
        <path d="M44 64 Q50 68 56 64" stroke="#8D6E63" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
);

/** Drew — collared jacket, side-swept hair */
export const DrewAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="drewBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF8E1" />
                <stop offset="100%" stopColor="#FFECB3" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#drewBg)" />
        {/* Plaid-ish jacket */}
        <path d="M8 100 C8 72 22 62 50 62 C78 62 92 72 92 100 Z" fill="#8D6E63" />
        {/* Orange collar */}
        <path d="M32 66 L50 78 L68 66 L62 64 L50 72 L38 64 Z" fill="#EF6C00" />
        <path d="M38 64 L50 72 L42 100 L28 100 Z" fill="#FF8F00" />
        <path d="M62 64 L50 72 L58 100 L72 100 Z" fill="#FF8F00" />
        <FaceBase skin="#E8B88A" cheek="#D4A07A" />
        {/* Side-swept dark hair */}
        <path
            d="M22 44 C20 18 34 4 52 4 C70 4 80 18 78 40 C76 24 66 12 50 12 C34 14 24 26 22 44 Z"
            fill="#3E2723"
        />
        <path d="M22 40 C18 28 24 16 36 12 L34 44 Z" fill="#3E2723" />
        <path d="M48 8 Q58 4 68 12 Q60 18 52 16 Z" fill="#4E342E" />
        <Brows color="#3E2723" />
        <Eyes iris="#5D4037" />
        <Nose skin="#D4A070" />
        <Smile />
    </svg>
);

/** Skye — white hoodie, sunglasses, cool pose */
export const SkyeAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="skyeBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E3F2FD" />
                <stop offset="100%" stopColor="#BBDEFB" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#skyeBg)" />
        <path d="M8 100 C8 70 22 58 50 58 C78 58 92 70 92 100 Z" fill="#ECEFF1" />
        {/* Hood */}
        <path d="M18 62 C22 48 34 42 50 42 C66 42 78 48 82 62 C78 52 66 48 50 48 C34 48 22 52 18 62 Z" fill="#CFD8DC" />
        <path d="M40 68 Q50 76 60 68" stroke="#B0BEC5" strokeWidth="2" fill="none" />
        <path d="M32 72 L36 100" stroke="#90A4AE" strokeWidth="1.5" />
        <path d="M68 72 L64 100" stroke="#90A4AE" strokeWidth="1.5" />
        <FaceBase skin="#F5C9A0" cheek="#E8A888" />
        {/* Brown wavy hair peeking from hood */}
        <path
            d="M28 40 C26 22 38 10 50 10 C64 10 74 22 72 40 C70 28 62 18 50 18 C38 18 30 28 28 40 Z"
            fill="#5D4037"
        />
        <Brows color="#4E342E" y={32} />
        {/* Sunglasses */}
        <rect x="28" y="36" width="18" height="12" rx="3" fill="#263238" />
        <rect x="54" y="36" width="18" height="12" rx="3" fill="#263238" />
        <line x1="46" y1="42" x2="54" y2="42" stroke="#263238" strokeWidth="2.5" />
        <line x1="28" y1="40" x2="22" y2="38" stroke="#263238" strokeWidth="2" strokeLinecap="round" />
        <line x1="72" y1="40" x2="78" y2="38" stroke="#263238" strokeWidth="2" strokeLinecap="round" />
        {/* Lens shine */}
        <rect x="30" y="38" width="6" height="3" rx="1" fill="#546E7A" opacity="0.6" />
        <rect x="56" y="38" width="6" height="3" rx="1" fill="#546E7A" opacity="0.6" />
        <Nose skin="#E0B080" y={52} />
        <Smile y={62} />
    </svg>
);

/** Kai — short blond hair, glasses, brown turtleneck */
export const KaiAvatar: React.FC<AvatarComponentProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
            <linearGradient id="kaiBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFDE7" />
                <stop offset="100%" stopColor="#FFF59D" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#kaiBg)" />
        <path d="M10 100 C10 72 24 62 50 62 C76 62 90 72 90 100 Z" fill="#5D4037" />
        {/* Turtleneck collar */}
        <ellipse cx="50" cy="68" rx="16" ry="8" fill="#4E342E" />
        <FaceBase skin="#FDDCC4" cheek="#F0B0A0" />
        {/* Blond short hair */}
        <path
            d="M24 40 C22 16 36 6 50 6 C66 6 78 16 76 40 C74 22 64 14 50 14 C36 14 26 22 24 40 Z"
            fill="#F9A825"
        />
        <path d="M24 36 C22 26 30 16 40 14 L38 40 Z" fill="#FFB300" />
        <Brows color="#F57F17" />
        <Eyes iris="#5D4037" />
        <Glasses frame="#212121" />
        <Nose skin="#E8B898" />
        <Smile />
    </svg>
);

// ─── Registry ────────────────────────────────────────────────────────────────

export interface Avatar {
    id: string;
    name: string;
    Component: React.FC<AvatarComponentProps>;
}

export const AVATARS: Avatar[] = [
    { id: 'alex', name: 'Alex', Component: AlexAvatar },
    { id: 'jordan', name: 'Jordan', Component: JordanAvatar },
    { id: 'sam', name: 'Sam', Component: SamAvatar },
    { id: 'casey', name: 'Casey', Component: CaseyAvatar },
    { id: 'riley', name: 'Riley', Component: RileyAvatar },
    { id: 'avery', name: 'Avery', Component: AveryAvatar },
    { id: 'quinn', name: 'Quinn', Component: QuinnAvatar },
    { id: 'blake', name: 'Blake', Component: BlakeAvatar },
    { id: 'morgan', name: 'Morgan', Component: MorganAvatar },
    { id: 'drew', name: 'Drew', Component: DrewAvatar },
    { id: 'skye', name: 'Skye', Component: SkyeAvatar },
    { id: 'kai', name: 'Kai', Component: KaiAvatar },
];

/** Maps legacy animal avatar IDs → new portrait IDs so existing users keep a face */
const LEGACY_AVATAR_MAP: Record<string, string> = {
    lion: 'alex',
    wolf: 'jordan',
    fox: 'casey',
    panda: 'avery',
    owl: 'quinn',
    cat: 'riley',
    penguin: 'blake',
    bear: 'morgan',
};

/** Also export legacy component aliases so any deep imports still typecheck */
export const LionAvatar = AlexAvatar;
export const WolfAvatar = JordanAvatar;
export const FoxAvatar = CaseyAvatar;
export const PandaAvatar = AveryAvatar;
export const OwlAvatar = QuinnAvatar;
export const CatAvatar = RileyAvatar;
export const PenguinAvatar = BlakeAvatar;
export const BearAvatar = MorganAvatar;

export const resolveAvatarId = (id: string): string => LEGACY_AVATAR_MAP[id] ?? id;

export const renderAvatarById = (id: string, className?: string) => {
    // External image URL (e.g. Google OAuth profile picture)
    if (id.startsWith('http://') || id.startsWith('https://') || id.startsWith('data:')) {
        return (
            <img
                src={id}
                alt=""
                className={className}
                referrerPolicy="no-referrer"
                draggable={false}
            />
        );
    }

    const resolved = resolveAvatarId(id);
    const avatar = AVATARS.find((a) => a.id === resolved);
    if (!avatar) return null;
    const { Component } = avatar;
    return <Component className={className} />;
};
