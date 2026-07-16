import React from 'react';
import { Play, Sparkles, ExternalLink } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { useSmartPlayer } from '../../hooks/useSmartPlayer';

interface WhereToWatchSectionProps {
  readonly contentId: number;
  readonly type: 'movie' | 'tv';
}

interface Provider {
  name: string;
  logo: React.ReactNode;
  status: 'available' | 'subscription' | 'rent';
  badge?: string;
  badgeColor?: string;
  primary?: boolean;
  external?: boolean;
}

/**
 * "Where to Watch" panel highlighting CINEFLIX as the primary streaming option
 * with a curated list of secondary providers shown for completeness.
 */
const WhereToWatchSection: React.FC<WhereToWatchSectionProps> = ({ contentId, type }) => {
  const { openPlayer } = useSmartPlayer();

  const providers: Provider[] = [
    {
      name: 'CINEFLIX',
      logo: <Play className="w-5 h-5 fill-current text-white" />,
      status: 'available',
      badge: 'FREE',
      badgeColor: 'bg-emerald-500',
      primary: true,
    },
    {
      name: 'Netflix',
      logo: (
        <span className="text-white font-bold text-lg tracking-tight">N</span>
      ),
      status: 'subscription',
      external: true,
    },
    {
      name: 'Prime Video',
      logo: <Play className="w-5 h-5 text-white" />,
      status: 'rent',
      badge: '$3.99',
      badgeColor: 'bg-blue-500',
      external: true,
    },
  ];

  const handleWatch = () => {
    openPlayer({ tmdbId: contentId, type });
  };

  return (
    <section>
      <SectionHeader
        eyebrow="Streaming"
        icon={Sparkles}
        title="Where to Watch"
        size="sm"
      />

      <div className="space-y-3">
        {providers.map((provider) => (
          <button
            key={provider.name}
            onClick={provider.primary ? handleWatch : undefined}
            disabled={!provider.primary}
            className={`group relative w-full text-left overflow-hidden rounded-2xl p-4 border transition-all duration-300 ${
              provider.primary
                ? 'bg-gradient-to-r from-buttons-purple/20 via-buttons-purple/10 to-transparent border-buttons-purple/40 hover:border-buttons-purple/70 hover:shadow-[0_8px_24px_rgba(229,9,20,0.25)] cursor-pointer'
                : 'bg-white/[0.03] border-white/10 opacity-60 cursor-default'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                  provider.primary
                    ? 'bg-buttons-purple shadow-lg shadow-buttons-purple/40 group-hover:scale-110'
                    : 'bg-white/10'
                }`}
              >
                {provider.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm sm:text-base truncate">{provider.name}</p>
                <p className={`text-xs mt-0.5 font-medium truncate ${
                  provider.status === 'available'
                    ? 'text-emerald-400'
                    : provider.status === 'subscription'
                      ? 'text-blue-400'
                      : 'text-amber-400'
                }`}>
                  {provider.status === 'available' && '✓ Available now — Watch Free'}
                  {provider.status === 'subscription' && 'Subscription required'}
                  {provider.status === 'rent' && 'Rent or buy'}
                </p>
              </div>
              {provider.external && (
                <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
            </div>
            {provider.badge && (
              <span
                className={`absolute top-2.5 right-2.5 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full ${provider.badgeColor}`}
              >
                {provider.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};

export default WhereToWatchSection;
