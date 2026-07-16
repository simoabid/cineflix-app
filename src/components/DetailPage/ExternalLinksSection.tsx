import React from 'react';
import { Globe, Link2, ExternalLink } from 'lucide-react';
import { ExternalIds } from '../../types';
import SectionHeader from './SectionHeader';

interface ExternalLinksSectionProps {
  readonly externalIds: ExternalIds | null;
  readonly homepage?: string;
}

interface SocialLink {
  name: string;
  url: string;
  icon: React.ReactNode;
  gradient: string;
  description: string;
}

const FacebookIcon = () => (
  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ImdbIcon = () => (
  <span className="text-black font-black text-[10px] tracking-tight bg-yellow-400 px-1.5 py-0.5 rounded">IMDb</span>
);

/**
 * Modernized external links section. Displays social media presence and the
 * official homepage when available; renders an empty state otherwise.
 */
const ExternalLinksSection: React.FC<ExternalLinksSectionProps> = ({
  externalIds,
  homepage,
}) => {
  const links: SocialLink[] = [];

  if (externalIds?.facebook_id) {
    links.push({
      name: 'Facebook',
      url: `https://www.facebook.com/${externalIds.facebook_id}`,
      icon: <FacebookIcon />,
      gradient: 'from-blue-600 to-blue-700',
      description: 'Follow on Facebook',
    });
  }
  if (externalIds?.instagram_id) {
    links.push({
      name: 'Instagram',
      url: `https://www.instagram.com/${externalIds.instagram_id}`,
      icon: <InstagramIcon />,
      gradient: 'from-purple-500 via-pink-500 to-orange-400',
      description: 'Follow on Instagram',
    });
  }
  if (externalIds?.twitter_id) {
    links.push({
      name: 'X / Twitter',
      url: `https://twitter.com/${externalIds.twitter_id}`,
      icon: <TwitterIcon />,
      gradient: 'from-gray-700 to-black',
      description: 'Follow on X',
    });
  }
  if (externalIds?.imdb_id) {
    links.push({
      name: 'IMDb',
      url: `https://www.imdb.com/title/${externalIds.imdb_id}`,
      icon: <ImdbIcon />,
      gradient: 'from-yellow-500 to-amber-600',
      description: 'View on IMDb',
    });
  }
  if (homepage) {
    links.push({
      name: 'Official Website',
      url: homepage,
      icon: <Globe className="w-5 h-5 text-white" />,
      gradient: 'from-slate-600 to-slate-800',
      description: 'Visit homepage',
    });
  }

  return (
    <section>
      <SectionHeader
        eyebrow="External"
        icon={Link2}
        title="Links & Resources"
        size="sm"
      />

      {links.length > 0 ? (
        <div className="space-y-2.5">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300"
            >
              <div className={`w-11 h-11 bg-gradient-to-br ${link.gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {link.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm group-hover:text-type-logo transition-colors truncate">
                  {link.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{link.description}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No external links available</p>
        </div>
      )}
    </section>
  );
};

export default ExternalLinksSection;
