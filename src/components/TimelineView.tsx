import React, { useState } from 'react';
import { CollectionDetails, Movie } from '../types';
import { Calendar, Star, Clock, DollarSign, Film, TrendingUp, Award } from 'lucide-react';
import { getPosterUrl } from '../services/tmdb';

interface TimelineViewProps {
  collection: CollectionDetails;
}

const TimelineView: React.FC<TimelineViewProps> = ({ collection }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [timelineMode, setTimelineMode] = useState<'chronological' | 'production'>('chronological');

  // Sort movies by release date
  const sortedMovies = [...collection.parts].sort((a, b) => 
    new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
  );

  // Get unique years and decade markers
  const years = sortedMovies.map(movie => new Date(movie.release_date).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearSpan = maxYear - minYear;

  // Create decade markers
  const decades: number[] = [];
  const startDecade = Math.floor(minYear / 10) * 10;
  const endDecade = Math.ceil(maxYear / 10) * 10;
  for (let decade = startDecade; decade <= endDecade; decade += 10) {
    decades.push(decade);
  }

  // Get movies for a specific year
  const getMoviesForYear = (year: number): Movie[] => {
    return sortedMovies.filter(movie => new Date(movie.release_date).getFullYear() === year);
  };

  // Calculate position on timeline (percentage)
  const getTimelinePosition = (year: number): number => {
    if (yearSpan === 0) return 50;
    return ((year - minYear) / yearSpan) * 100;
  };

  // Get franchise milestones
  const getMilestones = () => {
    const milestones = [];
    
    // First movie
    if (sortedMovies.length > 0) {
      milestones.push({
        year: new Date(sortedMovies[0].release_date).getFullYear(),
        title: 'Franchise Begins',
        description: `${sortedMovies[0].title} launches the ${collection.name} franchise`,
        type: 'start',
        movie: sortedMovies[0]
      });
    }

    // Highest rated movie
    const highestRated = sortedMovies.reduce((prev, current) => 
      prev.vote_average > current.vote_average ? prev : current
    );
    milestones.push({
      year: new Date(highestRated.release_date).getFullYear(),
      title: 'Critical Peak',
      description: `${highestRated.title} achieves highest rating (${highestRated.vote_average.toFixed(1)}/10)`,
      type: 'peak',
      movie: highestRated
    });

    // Latest movie
    if (sortedMovies.length > 1) {
      const latest = sortedMovies[sortedMovies.length - 1];
      milestones.push({
        year: new Date(latest.release_date).getFullYear(),
        title: collection.status === 'complete' ? 'Franchise Concludes' : 'Latest Release',
        description: `${latest.title} ${collection.status === 'complete' ? 'concludes' : 'continues'} the saga`,
        type: collection.status === 'complete' ? 'end' : 'continue',
        movie: latest
      });
    }

    return milestones;
  };

  const milestones = getMilestones();

  return (
    <div className="space-y-8">
      {/* Timeline Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Franchise Timeline</h2>
        <p className="text-gray-300 mb-6">
          Explore the {collection.name} franchise across {yearSpan + 1} years ({minYear} - {maxYear})
        </p>
        
        {/* Timeline Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setTimelineMode('chronological')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timelineMode === 'chronological'
                  ? 'bg-netflix-red text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Release Timeline
            </button>
            <button
              onClick={() => setTimelineMode('production')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timelineMode === 'production'
                  ? 'bg-netflix-red text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Production History
            </button>
          </div>
        </div>
      </div>

      {timelineMode === 'chronological' ? (
        <>
          {/* Franchise Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <Calendar className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{yearSpan + 1}</div>
              <div className="text-gray-300 text-sm">Years Active</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <Film className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{collection.film_count}</div>
              <div className="text-gray-300 text-sm">Total Films</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {(sortedMovies.reduce((sum, movie) => sum + movie.vote_average, 0) / sortedMovies.length).toFixed(1)}
              </div>
              <div className="text-gray-300 text-sm">Avg Rating</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {Math.round(collection.total_runtime / 60)}h
              </div>
              <div className="text-gray-300 text-sm">Total Runtime</div>
            </div>
          </div>

          {/* Interactive Timeline */}
          <div className="relative bg-gray-800/30 rounded-lg p-8">
            {/* Decade markers */}
            <div className="relative mb-8">
              <div className="absolute top-0 left-0 right-0 h-px bg-gray-600"></div>
              {decades.map(decade => (
                <div
                  key={decade}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${getTimelinePosition(decade)}%` }}
                >
                  <div className="w-2 h-2 bg-gray-500 rounded-full -mt-1"></div>
                  <span className="text-gray-400 text-sm mt-2">{decade}s</span>
                </div>
              ))}
            </div>

            {/* Movies on timeline */}
            <div className="relative h-40 mb-8">
              <div className="absolute top-0 left-0 right-0 h-px bg-netflix-red"></div>
              {sortedMovies.map((movie) => {
                const year = new Date(movie.release_date).getFullYear();
                const position = getTimelinePosition(year);
                const isSelected = selectedYear === year;
                
                return (
                  <div
                    key={movie.id}
                    className="absolute cursor-pointer transform -translate-x-1/2 group"
                    style={{ left: `${position}%` }}
                    onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                  >
                    {/* Movie marker */}
                    <div className={`w-4 h-4 rounded-full -mt-2 transition-all duration-200 ${
                      isSelected ? 'bg-netflix-red scale-150' : 'bg-white group-hover:bg-netflix-red group-hover:scale-125'
                    }`}></div>
                    
                    {/* Movie poster and info */}
                    <div className={`mt-4 transition-all duration-300 ${
                      isSelected ? 'opacity-100 transform scale-110' : 'opacity-70 group-hover:opacity-100'
                    }`}>
                      <div className="w-16 h-24 rounded overflow-hidden shadow-lg mb-2">
                        <img
                          src={getPosterUrl(movie.poster_path, 'w185')}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-center max-w-20">
                        <div className="text-white text-xs font-medium truncate">{movie.title}</div>
                        <div className="text-gray-400 text-xs">{year}</div>
                        <div className="flex items-center justify-center mt-1">
                          <Star className="w-3 h-3 text-yellow-400 mr-1" />
                          <span className="text-gray-300 text-xs">{movie.vote_average.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Milestones */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">Franchise Milestones</h3>
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-center space-x-4 bg-gray-800/50 rounded-lg p-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    milestone.type === 'start' ? 'bg-green-600' :
                    milestone.type === 'peak' ? 'bg-yellow-600' :
                    milestone.type === 'end' ? 'bg-red-600' :
                    'bg-blue-600'
                  }`}>
                    {milestone.type === 'start' ? <Film className="w-6 h-6" /> :
                     milestone.type === 'peak' ? <Award className="w-6 h-6" /> :
                     milestone.type === 'end' ? <Calendar className="w-6 h-6" /> :
                     <TrendingUp className="w-6 h-6" />}
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-white font-semibold">{milestone.title} ({milestone.year})</h4>
                    <p className="text-gray-300 text-sm">{milestone.description}</p>
                  </div>
                  <img
                    src={getPosterUrl(milestone.movie.poster_path, 'w92')}
                    alt={milestone.movie.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                </div>
              ))}
            </div>

            {/* Selected Year Details */}
            {selectedYear && (
              <div className="mt-8 bg-gray-800/70 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">{selectedYear} Releases</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getMoviesForYear(selectedYear).map(movie => (
                    <div key={movie.id} className="flex space-x-3 bg-gray-700/50 rounded-lg p-3">
                      <img
                        src={getPosterUrl(movie.poster_path, 'w92')}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div className="flex-grow">
                        <h4 className="text-white font-medium text-sm">{movie.title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-300 mt-1">
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-400 mr-1" />
                            <span>{movie.vote_average.toFixed(1)}</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(movie.release_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{movie.overview}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Production History View */
        <div className="text-center text-white py-16">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Production History</h2>
          <p className="text-gray-400">Box office performance, production budgets, and behind-the-scenes timeline.</p>
          <p className="text-gray-500 text-sm mt-4">Coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default TimelineView;