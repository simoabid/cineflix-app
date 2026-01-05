import React from 'react';
import { 
  X, 
  BarChart3, 
  Star, 
  Film, 
  Tv, 
  TrendingUp,
  Award,
  Target
} from 'lucide-react';
import { ListStats, MyListItem } from '../../types/myList';

interface StatsModalProps {
  stats: ListStats;
  items: MyListItem[];
  onClose: () => void;
}

/**
 * Safely format runtime hours into a human readable string.
 * Examples:
 *  - 0.5 -> "30m"
 *  - 3 -> "3h"
 *  - 49 -> "2d 1h"
 *
 * Exported for unit testing.
 */
export function formatHours(hours: number): string {
  try {
    if (!Number.isFinite(hours) || hours <= 0) return '0m';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  } catch (err) {
    // Fallback to safe string on unexpected input
    return '0m';
  }
}

/**
 * Compute top genres from a genre distribution map.
 * Returns array of [genre, count] sorted desc and limited to `limit`.
 * Exported for unit testing.
 */
export function computeTopGenres(stats: ListStats, limit = 5): [string, number][] {
  try {
    if (!stats || !stats.genreDistribution) return [];
    return Object.entries(stats.genreDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  } catch (err) {
    return [];
  }
}

/**
 * Convert monthlyAdditions map to array of last N months entries.
 * Each entry: { month: 'Jan', count: number }
 * Exported for unit testing.
 */
export function computeMonthlyData(stats: ListStats, months = 6): { month: string; count: number }[] {
  try {
    if (!stats || !stats.monthlyAdditions) return [];
    const entries = Object.entries(stats.monthlyAdditions)
      .slice(-months)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        count
      }));
    return entries;
  } catch (err) {
    return [];
  }
}

/**
 * Compute insights based on completionRate, totalHours, averageRating.
 * Returns array of insights with type and text.
 * Exported for unit testing.
 */
export function computeCompletionInsights(stats: ListStats): { type: string; text: string }[] {
  try {
    if (!stats) return [];
    const insights: { type: string; text: string }[] = [];

    if (typeof stats.completionRate === 'number') {
      if (stats.completionRate > 70) {
        insights.push({
          type: 'positive',
          text: `Great job! You complete ${stats.completionRate}% of what you add to your list.`
        });
      } else if (stats.completionRate < 30) {
        insights.push({
          type: 'suggestion',
          text: `Consider removing items you're unlikely to watch to keep your list focused.`
        });
      }
    }

    if (typeof stats.totalHours === 'number' && stats.totalHours > 100) {
      insights.push({
        type: 'info',
        text: `You have ${formatHours(stats.totalHours)} of content - that's quite a collection!`
      });
    }

    if (typeof stats.averageRating === 'number' && stats.averageRating > 4) {
      insights.push({
        type: 'positive',
        text: `You have excellent taste! Your average rating is ${stats.averageRating}/5.`
      });
    }

    return insights;
  } catch (err) {
    return [];
  }
}

/**
 * Ensure a stats object has safe defaults for all fields used by the UI.
 * This function is defensive and will guard against missing or malformed stored data.
 * Exported for unit testing.
 */
export function sanitizeStats(input?: ListStats | null): ListStats {
  const s = (input || {}) as Partial<ListStats>;
  const safeStatus = (s.statusDistribution || {}) as Record<string, number>;
  const safeGenre = (s.genreDistribution && typeof s.genreDistribution === 'object') ? s.genreDistribution : {};
  const safeMonthly = (s.monthlyAdditions && typeof s.monthlyAdditions === 'object') ? s.monthlyAdditions : {};

  return {
    totalItems: Number.isFinite(s.totalItems as number) && (s.totalItems as number) > 0 ? (s.totalItems as number) : 0,
    completionRate: Number.isFinite(s.completionRate as number) ? (s.completionRate as number) : 0,
    totalHours: Number.isFinite(s.totalHours as number) ? (s.totalHours as number) : 0,
    averageRating: Number.isFinite(s.averageRating as number) ? (s.averageRating as number) : 0,
    totalMovies: Number.isFinite(s.totalMovies as number) ? (s.totalMovies as number) : 0,
    totalTVShows: Number.isFinite(s.totalTVShows as number) ? (s.totalTVShows as number) : 0,
    statusDistribution: {
      notStarted: Number.isFinite(safeStatus.notStarted) ? safeStatus.notStarted : 0,
      inProgress: Number.isFinite(safeStatus.inProgress) ? safeStatus.inProgress : 0,
      completed: Number.isFinite(safeStatus.completed) ? safeStatus.completed : 0,
      dropped: Number.isFinite(safeStatus.dropped) ? safeStatus.dropped : 0,
    } as any,
    genreDistribution: safeGenre as any,
    monthlyAdditions: safeMonthly as any,
  } as ListStats;
}

/**
 * Compute a safe percentage for progress bars and widths.
 * Returns 0 if total is not a positive number.
 * Exported for unit testing.
 */
export function computePercent(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return (part / total) * 100;
}

const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  onClose
}) => {
  // Sanitize incoming stats to defend against malformed stored data
  const safeStats = sanitizeStats(stats);

  // Precompute derived data once to avoid repeated computation in JSX
  const topGenres = computeTopGenres(safeStats);
  const monthlyData = computeMonthlyData(safeStats);
  const insights = computeCompletionInsights(safeStats);

  // Safe guard values
  const totalItemsSafe = safeStats.totalItems;
  const maxMonthlyCount = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.count)) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-netflix-red" />
            <h2 className="text-2xl font-bold text-white">My List Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-netflix-red mb-1">{safeStats.totalItems}</div>
              <div className="text-gray-400 text-sm">Total Items</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-netflix-red mb-1">{safeStats.completionRate}%</div>
              <div className="text-gray-400 text-sm">Completion Rate</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-netflix-red mb-1">{formatHours(safeStats.totalHours)}</div>
              <div className="text-gray-400 text-sm">Total Runtime</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-netflix-red mb-1">{safeStats.averageRating || 'N/A'}</div>
              <div className="text-gray-400 text-sm">Avg Rating</div>
            </div>
          </div>

          {/* Content Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content Types */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Film className="w-5 h-5" />
                Content Types
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-blue-400" />
                    <span className="text-white">Movies</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full"
                        style={{ width: `${computePercent(safeStats.totalMovies, totalItemsSafe)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{safeStats.totalMovies}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-green-400" />
                    <span className="text-white">TV Shows</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${computePercent(safeStats.totalTVShows, totalItemsSafe)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{safeStats.totalTVShows}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Watch Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white">Not Started</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gray-400 h-2 rounded-full"
                        style={{ width: `${computePercent(safeStats.statusDistribution.notStarted, totalItemsSafe)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{safeStats.statusDistribution.notStarted}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">In Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${computePercent(safeStats.statusDistribution.inProgress, totalItemsSafe)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{safeStats.statusDistribution.inProgress}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${computePercent(safeStats.statusDistribution.completed, totalItemsSafe)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{safeStats.statusDistribution.completed}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Dropped</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-400 h-2 rounded-full"
                        style={{ width: `${computePercent(safeStats.statusDistribution.dropped, totalItemsSafe)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{safeStats.statusDistribution.dropped}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Genres */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Genres
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topGenres.map(([genre, count], index) => (
                <div key={genre} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-netflix-red rounded text-white text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span className="text-white">{genre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-netflix-red h-2 rounded-full"
                        style={{ width: `${computePercent(count, totalItemsSafe)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Additions Chart */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity (Last 6 Months)
            </h3>
            <div className="flex items-end justify-between h-32 gap-2">
              {monthlyData.map(({ month, count }) => (
                <div key={month} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-netflix-red rounded-t"
                    style={{ 
                      height: `${Math.max((maxMonthlyCount > 0 ? (count / maxMonthlyCount) * 100 : 0), 5)}%`,
                      minHeight: '4px'
                    }}
                  />
                  <div className="text-xs text-gray-400 mt-2">{month}</div>
                  <div className="text-xs text-white">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Insights
            </h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${
                    insight.type === 'positive' ? 'bg-green-900/30 border border-green-700' :
                    insight.type === 'suggestion' ? 'bg-yellow-900/30 border border-yellow-700' :
                    'bg-blue-900/30 border border-blue-700'
                  }`}
                >
                  <p className="text-white text-sm">{insight.text}</p>
                </div>
              ))}
              
              {insights.length === 0 && (
                <p className="text-gray-400 text-sm">
                  Keep using your list to unlock personalized insights!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;