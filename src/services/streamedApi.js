/**
 * Streamed.pk API Service
 * Provides live stream links for sports matches
 * Updated to use new API structure
 */

import { cache } from '../utils/cache.js';
import * as nhlScoreApi from './nhlScoreApi.js';
import { logger } from '../utils/logger.js';

const BASE_URL = 'https://streamed.pk/api';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Track pending requests to avoid duplicate fetches
const pendingRequests = new Map();

/**
 * Get all available sports
 * @returns {Promise<Array>} Array of sports
 */
export async function getSports() {
  const cacheKey = 'streamed_sports';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    logger.log(`⚡ Joining pending request for sports`);
    return pendingRequests.get(cacheKey);
  }
  
  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/sports`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sports = await response.json();

      // Cache for 24 hours (sports don't change often)
      cache.set(cacheKey, sports, 24 * 60 * 60 * 1000);

      return sports;
    } catch (error) {
      console.error('Error fetching sports:', error);
      return cached || [];
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store promise
  pendingRequests.set(cacheKey, promise);

  return promise;
}

/**
 * Get hockey matches with enriched NHL data
 * @param {string} filter - 'all', 'live', or 'today' (default: 'all')
 * @param {boolean} enrichWithNHL - Whether to enrich with NHL live data (default: true)
 * @returns {Promise<Array>} Array of hockey matches
 */
export async function getHockeyMatches(filter = 'all', enrichWithNHL = true) {
  let endpoint;
  let cacheKey;
  
  switch (filter) {
    case 'live':
      endpoint = '/matches/live';
      cacheKey = 'streamed_hockey_live_v2'; // v2 = includes nhlGameId
      break;
    case 'today':
      endpoint = '/matches/all-today';
      cacheKey = 'streamed_hockey_today_v2'; // v2 = includes nhlGameId
      break;
    default:
      endpoint = '/matches/hockey';
      cacheKey = 'streamed_hockey_all_v2'; // v2 = includes nhlGameId
  }

  // Append enrichment status to cache key to separate enriched/non-enriched results
  if (enrichWithNHL) {
    cacheKey += '_enriched';
  }
  
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    logger.log(`⚡ Joining pending request for hockey matches (${filter})`);
    return pendingRequests.get(cacheKey);
  }
  
  // Create new request promise
  const promise = (async () => {
    try {
      // 1. Fetch matches from Streamed.pk
      const matchesPromise = fetch(`${BASE_URL}${endpoint}`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          let matches = await res.json();
          // If fetching all live or all today, filter for hockey only
          if (filter === 'live' || filter === 'today') {
            matches = matches.filter(m => m.category === 'hockey');
          }
          return matches;
        });

      // 2. Fetch NHL live scores for enrichment (in parallel)
      const nhlScoresPromise = enrichWithNHL
        ? nhlScoreApi.getLiveScores().catch(error => {
            console.warn('Could not fetch NHL scores for enrichment:', error);
            return { games: [] };
          })
        : Promise.resolve({ games: [] });

      // Wait for both requests to complete
      const [matches, scoresData] = await Promise.all([matchesPromise, nhlScoresPromise]);
      const nhlGames = scoresData.games || [];

      // Process matches and enrich with NHL data
      const processedMatches = matches.map(match => {
        let nhlGame = null;
        let teamsReversed = false; // Track if home/away are swapped between APIs
        
        // Try to match with NHL game data
        if (nhlGames.length > 0 && match.teams) {
          // Try direct abbreviation first, then fallback to name-based lookup
          let homeAbbrev = match.teams.home?.abbrev;
          let awayAbbrev = match.teams.away?.abbrev;
          
          // If abbreviations aren't available, try to map from team names
          if (!homeAbbrev && match.teams.home?.name) {
            homeAbbrev = nhlScoreApi.getTeamAbbreviation(match.teams.home.name);
          }
          if (!awayAbbrev && match.teams.away?.name) {
            awayAbbrev = nhlScoreApi.getTeamAbbreviation(match.teams.away.name);
          }

          // Store abbreviations on team objects for logo display
          if (homeAbbrev && match.teams.home) {
            match.teams.home.abbrev = homeAbbrev;
          }
          if (awayAbbrev && match.teams.away) {
            match.teams.away.abbrev = awayAbbrev;
          }

          if (homeAbbrev && awayAbbrev) {
            // Try exact match first (Away @ Home)
            nhlGame = nhlGames.find(g =>
              g.homeTeam?.abbrev === homeAbbrev &&
              g.awayTeam?.abbrev === awayAbbrev
            );

            // If not found, try reversed (in case APIs have different home/away designations)
            // This happens with outdoor series games and some special events
            if (!nhlGame) {
              nhlGame = nhlGames.find(g =>
                g.homeTeam?.abbrev === awayAbbrev &&
                g.awayTeam?.abbrev === homeAbbrev
              );
              if (nhlGame) {
                teamsReversed = true; // Mark that we need to swap scores
              }
            }
          }
        }

        return processMatch(match, nhlGame, teamsReversed);
      });
      
      // Cache for 15 minutes
      cache.set(cacheKey, processedMatches, CACHE_TTL);

      return processedMatches;
    } catch (error) {
      console.error('Error fetching hockey matches:', error);
      return cached || [];
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store promise
  pendingRequests.set(cacheKey, promise);

  return promise;
}

/**
 * Get all matches (all sports)
 * @param {string} filter - 'all', 'live', or 'today'
 * @returns {Promise<Array>} Array of all matches
 */
export async function getAllMatches(filter = 'all') {
  let endpoint;
  let cacheKey;
  
  switch (filter) {
    case 'live':
      endpoint = '/matches/live';
      cacheKey = 'streamed_all_live';
      break;
    case 'today':
      endpoint = '/matches/all-today';
      cacheKey = 'streamed_all_today';
      break;
    default:
      endpoint = '/matches/all';
      cacheKey = 'streamed_all';
  }
  
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    logger.log(`⚡ Joining pending request for all matches (${filter})`);
    return pendingRequests.get(cacheKey);
  }
  
  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const matches = await response.json();
      const processedMatches = matches.map(m => processMatch(m));

      cache.set(cacheKey, processedMatches, CACHE_TTL);

      return processedMatches;
    } catch (error) {
      console.error('Error fetching all matches:', error);
      return cached || [];
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store promise
  pendingRequests.set(cacheKey, promise);

  return promise;
}

/**
 * Get stream details for a match
 * @param {string} source - Source identifier (e.g., 'alpha', 'charlie')
 * @param {string} id - Match ID for the source
 * @returns {Promise<Object>} Stream data
 */
export async function getStreamUrls(source, id) {
  const cacheKey = `streamed_stream_${source}_${id}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    logger.log(`⚡ Joining pending request for ${source}/${id}`);
    return pendingRequests.get(cacheKey);
  }
  
  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/stream/${source}/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const streams = await response.json();

      // Return all streams instead of just selecting one
      // This allows the UI to display all available feeds (Home, Away, French, etc.)
      const streamData = {
        streams: streams, // All available streams for this source
        allStreams: streams // Keep for backwards compatibility
      };

      // Cache for 5 minutes (streams can change)
      cache.set(cacheKey, streamData, 5 * 60 * 1000);

      return streamData;
    } catch (error) {
      console.error(`Error fetching stream ${source}/${id}:`, error);
      return cached || { streams: [], allStreams: [] };
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store promise
  pendingRequests.set(cacheKey, promise);

  return promise;
}

/**
 * Process raw match data
 * @param {Object} match - Raw match object from API
 * @param {Object} nhlGame - Optional NHL game data for accurate live status
 * @param {boolean} teamsReversed - Whether home/away teams are swapped between APIs
 * @returns {Object} Processed match object
 */
function processMatch(match, nhlGame = null, teamsReversed = false) {
  const now = Date.now();
  const matchTime = match.date;
  
  // Determine status using NHL data if available, otherwise use time-based logic
  let status;
  let liveData = null;
  
  if (nhlGame) {
    // Use NHL API data for accurate status
    const gameState = nhlGame.gameState;
    
    // If teams are reversed, we need to swap home/away scores
    // match.home maps to nhlGame.awayTeam if reversed
    const homeTeamScore = teamsReversed ? (nhlGame.awayTeam?.score || 0) : (nhlGame.homeTeam?.score || 0);
    const awayTeamScore = teamsReversed ? (nhlGame.homeTeam?.score || 0) : (nhlGame.awayTeam?.score || 0);
    
    const homeTeamSog = teamsReversed ? (nhlGame.awayTeam?.sog || 0) : (nhlGame.homeTeam?.sog || 0);
    const awayTeamSog = teamsReversed ? (nhlGame.homeTeam?.sog || 0) : (nhlGame.awayTeam?.sog || 0);
    
    if (gameState === 'LIVE' || gameState === 'CRIT') {
      status = 'live';
      liveData = {
        period: nhlGame.period,
        periodType: nhlGame.periodDescriptor?.periodType,
        timeRemaining: nhlGame.clock?.timeRemaining,
        inIntermission: nhlGame.clock?.inIntermission,
        score: {
          home: homeTeamScore,
          away: awayTeamScore
        },
        sog: {
          home: homeTeamSog,
          away: awayTeamSog
        }
      };
    } else if (gameState === 'FINAL' || gameState === 'OFF') {
      status = 'finished';
      // Still show final score for finished games
      liveData = {
        score: {
          home: homeTeamScore,
          away: awayTeamScore
        },
        sog: {
          home: homeTeamSog,
          away: awayTeamSog
        }
      };
    } else if (gameState === 'FUT' || gameState === 'PRE') {
      status = 'upcoming';
    } else {
      // Fallback to time-based if unknown state
      status = now < matchTime ? 'upcoming' : 'finished';
    }
  } else {
    // Fallback to time-based logic for non-NHL games (World Juniors, etc.)
    // Use a combination of time and stream availability to determine status
    const fourHoursLater = matchTime + (4 * 60 * 60 * 1000); // Extended to 4 hours for potential overtime
    const hasStreams = match.sources && match.sources.length > 0;
    
    if (now < matchTime) {
      // Game hasn't started yet
      status = 'upcoming';
    } else if (now >= matchTime && now <= fourHoursLater) {
      // Within 4-hour window from start - likely live or recently finished
      // If streams are available, assume it's live
      status = hasStreams ? 'live' : 'finished';
    } else {
      // More than 4 hours after start time
      status = 'finished';
    }
  }
  
  const processedMatch = {
    id: match.id,
    title: match.title,
    category: match.category,
    time: match.date, // Unix timestamp in milliseconds
    poster: match.poster,
    popular: match.popular,
    league: getCategoryDisplayName(match.category),
    teams: match.teams,
    sources: match.sources || [],
    status,
    nhlGameId: nhlGame?.id || null // Store NHL game ID for highlights
  };
  
  // Store NHL game ID for highlights feature
  
  // Add live data if available
  if (liveData) {
    processedMatch.liveData = liveData;
  }
  
  return processedMatch;
}

const CATEGORY_DISPLAY_NAMES = {
  'hockey': 'NHL',
  'basketball': 'NBA',
  'football': 'Soccer',
  'american-football': 'NFL',
  'baseball': 'MLB',
  'fight': 'UFC/Boxing',
  'motor-sports': 'Racing'
};

/**
 * Get display name for category
 * @param {string} category - Category ID
 * @returns {string} Display name
 */
function getCategoryDisplayName(category) {
  return CATEGORY_DISPLAY_NAMES[category] || category;
}

/**
 * Get image URL for team badge
 * @param {string} badgeId - Badge identifier
 * @returns {string} Full URL to badge image
 */
export function getTeamBadgeUrl(badgeId) {
  return `https://streamed.pk/api/images/badge/${badgeId}.webp`;
}

/**
 * Get image URL for match poster
 * @param {string} posterPath - Poster path from match object
 * @returns {string} Full URL to poster image
 */
export function getMatchPosterUrl(posterPath) {
  if (posterPath.startsWith('/')) {
    return `https://streamed.pk${posterPath}`;
  }
  return posterPath;
}
