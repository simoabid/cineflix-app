import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  readonly icon?: LucideIcon;
  readonly eyebrow?: string;
  readonly title: string;
  readonly count?: number | string;
  readonly action?: React.ReactNode;
  readonly tone?: 'default' | 'accent';
  readonly size?: 'sm' | 'md' | 'lg';
}

/**
 * Standardised, cinematic section header for the DetailPage.
 * Features a coloured accent bar, optional eyebrow chip, and an
 * optional trailing action slot (counts, controls, etc.).
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  eyebrow,
  title,
  count,
  action,
  tone = 'default',
  size = 'md',
}) => {
  const accentColor = tone === 'accent' ? 'bg-buttons-purple' : 'bg-gradient-to-b from-buttons-purple to-red-900';

  const titleSize = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl md:text-3xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl',
  }[size];

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8">
      <div className="space-y-2 sm:space-y-3">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-[0.18em]">
            {Icon && <Icon className="h-3 w-3 text-type-logo" />}
            {eyebrow}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className={`w-1 ${size === 'sm' ? 'h-6' : 'h-7 sm:h-9'} ${accentColor} rounded-full shadow-[0_0_12px_rgba(229,9,20,0.5)]`} />
          <h2 className={`${titleSize} font-bold tracking-tight bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent`}>
            {title}
          </h2>
          {count !== undefined && (
            <span className="bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold">
              {count}
            </span>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

export default SectionHeader;
