import React from 'react';
import { ScrollText } from 'lucide-react';

interface OverviewSectionProps {
  readonly overview: string;
  readonly tagline?: string;
  readonly title?: string;
}

/**
 * Cinematic plot synopsis card with refined typography and a quote-mark
 * decorative accent. Renders the title's tagline as an italic pull-quote
 * when provided.
 */
const OverviewSection: React.FC<OverviewSectionProps> = ({
  overview,
  tagline,
  title = 'Plot Synopsis',
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/10 p-5 sm:p-6">
      {/* Decorative quote glyph */}
      <div className="absolute -top-2 -right-2 text-[120px] leading-none font-serif text-type-logo/10 select-none pointer-events-none">
        “
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-buttons-purple/15 flex items-center justify-center">
            <ScrollText className="w-4 h-4 text-type-logo" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
        </div>

        {tagline && (
          <p className="text-sm sm:text-base text-gray-300 italic mb-4 border-l-2 border-buttons-purple/50 pl-3">
            “{tagline}”
          </p>
        )}

        <p className="text-gray-200 text-sm sm:text-[15px] leading-relaxed">
          {overview || 'No synopsis available for this title.'}
        </p>
      </div>
    </div>
  );
};

export default OverviewSection;
