import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: React.ReactNode;
  readonly subValue?: React.ReactNode;
  readonly accent?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
  readonly className?: string;
}

const ACCENT_MAP = {
  red: { bg: 'bg-red-500/15', text: 'text-red-400', glow: 'group-hover:shadow-buttons-purple/20' },
  blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/20' },
  green: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/20' },
  yellow: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', glow: 'group-hover:shadow-yellow-500/20' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/20' },
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', glow: 'group-hover:shadow-orange-500/20' },
} as const;

/**
 * Compact, glass-morphic data card used to display a single piece of metadata
 * (e.g. status, runtime, rating, language) with an icon and accent colour.
 */
const InfoCard: React.FC<InfoCardProps> = ({
  icon: Icon,
  label,
  value,
  subValue,
  accent = 'red',
  className = '',
}) => {
  const a = ACCENT_MAP[accent];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl ${a.glow} ${className}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 ${a.bg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-4 h-4 ${a.text}`} />
        </div>
        <span className="text-[11px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-semibold text-sm sm:text-base truncate">{value}</p>
      {subValue && <p className="text-gray-500 text-xs mt-0.5 truncate">{subValue}</p>}
    </div>
  );
};

export default InfoCard;
