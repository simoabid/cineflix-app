import React from 'react';
import { Search, Film, FolderOpen, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

type EmptyVariant = 'search' | 'list' | 'content' | 'generic';

interface EmptyStateProps {
  /** Controls which icon and default copy to render. */
  variant?: EmptyVariant;
  /** Primary heading text. */
  title?: string;
  /** Descriptive paragraph text. */
  description?: string;
  /** CTA button label. If omitted the CTA is hidden. */
  actionLabel?: string;
  /** Handler for the CTA button. */
  onAction?: () => void;
  /** If provided, renders a Link instead of a button. */
  actionHref?: string;
}

const VARIANT_DEFAULTS: Record<EmptyVariant, { icon: React.ReactNode; title: string; description: string }> = {
  search: {
    icon: <Search className="w-12 h-12 text-gray-500" strokeWidth={1.5} />,
    title: 'No results found',
    description: "Try adjusting your search or filters to find what you're looking for."
  },
  list: {
    icon: <Inbox className="w-12 h-12 text-gray-500" strokeWidth={1.5} />,
    title: 'Your list is empty',
    description: 'Start adding movies and TV shows to build your watchlist.'
  },
  content: {
    icon: <Film className="w-12 h-12 text-gray-500" strokeWidth={1.5} />,
    title: 'No content available',
    description: 'Content could not be loaded. Please try again later.'
  },
  generic: {
    icon: <FolderOpen className="w-12 h-12 text-gray-500" strokeWidth={1.5} />,
    title: 'Nothing here yet',
    description: "There's nothing to display at the moment."
  }
};

/**
 * Standardised empty-state component with icon, copy, and an optional CTA.
 * Announces itself to screen readers via `role="status"`.
 */
const FeedbackEmptyState: React.FC<EmptyStateProps> = ({
  variant = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  actionHref
}) => {
  // Use switch-case dot notation to secure access and prevent code injection warnings
  let defaults;
  switch (variant) {
    case 'search':
      defaults = VARIANT_DEFAULTS.search;
      break;
    case 'list':
      defaults = VARIANT_DEFAULTS.list;
      break;
    case 'content':
      defaults = VARIANT_DEFAULTS.content;
      break;
    case 'generic':
    default:
      defaults = VARIANT_DEFAULTS.generic;
      break;
  }

  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center" role="status">
      {/* Glowing icon container */}
      <div className="w-24 h-24 rounded-full bg-gray-800/60 border border-gray-700/50 flex items-center justify-center mb-6 shadow-lg shadow-black/20">
        {defaults.icon}
      </div>

      <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{resolvedTitle}</h3>
      <p className="text-gray-400 text-sm md:text-base max-w-md mb-8">{resolvedDescription}</p>

      {actionLabel && actionHref && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-2 px-6 py-3 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-netflix-red outline-none"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-netflix-red outline-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default FeedbackEmptyState;
