/**
 * Streamed.pk API Service
 * Provides live stream links for sports matches
 * Updated to use new API structure
 */

import { cache } from '../utils/cache.js';
import * as nhlScoreApi from './nhlScoreApi.js';

const BASE_URL = 'https://streamed.pk/api';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get all available sports
 * @returns {Promise<Array>} Array of sports
 */
export async function getSports() {
  const cacheKey = 'streamed_sports';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('✅ Using cached sports');
    return cached;
  }
  
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
  }
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
  
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log(`✅ Using cached hockey matches (${filter})`);
    return cached;
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    let matches = await response.json();
    
    // If fetching all live or all today, filter for hockey only
    if (filter === 'live' || filter === 'today') {
      matches = matches.filter(m => m.category === 'hockey');
    }
    
    // Fetch NHL live scores for enrichment
    let nhlGames = [];
    if (enrichWithNHL) {
      try {
        const scoresData = await nhlScoreApi.getLiveScores();
        nhlGames = scoresData.games || [];
        console.log(`✅ Fetched ${nhlGames.length} NHL games for enrichment`);
      } catch (error) {
        console.warn('Could not fetch NHL scores for enrichment:', error);
      }
    }
    
    // Process matches and enrich with NHL data
    const processedMatches = matches.map(match => {
      let nhlGame = null;
      
      // Try to match with NHL game data
      if (nhlGames.length > 0 && match.teams) {
        // Try direct abbreviation first, then fallback to name-based lookup
        let homeAbbrev = match.teams.home?.abbrev;
        let awayAbbrev = match.teams.away?.abbrev;
        
        console.log(`🔍 Enriching: ${match.teams.away?.name} @ ${match.teams.home?.name}`);
        console.log(`   Raw abbrevs: away=${awayAbbrev}, home=${homeAbbrev}`);
        
        // If abbreviations aren't available, try to map from team names
        if (!homeAbbrev && match.teams.home?.name) {
          homeAbbrev = nhlScoreApi.getTeamAbbreviation(match.teams.home.name);
          console.log(`   Mapped home "${match.teams.home.name}" -> ${homeAbbrev}`);
        }
        if (!awayAbbrev && match.teams.away?.name) {
          awayAbbrev = nhlScoreApi.getTeamAbbreviation(match.teams.away.name);
          console.log(`   Mapped away "${match.teams.away.name}" -> ${awayAbbrev}`);
        }
        
        if (homeAbbrev && awayAbbrev) {
          console.log(`   Looking for NHL game: ${awayAbbrev} @ ${homeAbbrev}`);
          
          // Try exact match first (Away @ Home)
          nhlGame = nhlGames.find(g =>
            g.homeTeam?.abbrev === homeAbbrev &&
            g.awayTeam?.abbrev === awayAbbrev
          );
          
          // If not found, try reversed (in case APIs have different home/away designations)
          // This happens with outdoor series games and some special events
          if (!nhlGame) {
            console.log(`   Trying reversed: ${homeAbbrev} @ ${awayAbbrev}`);
            nhlGame = nhlGames.find(g =>
              g.homeTeam?.abbrev === awayAbbrev &&
              g.awayTeam?.abbrev === homeAbbrev
            );
          }
          
          if (nhlGame) {
            console.log(`   ✅ MATCH FOUND! NHL Game ID: ${nhlGame.id}, Score: ${nhlGame.awayTeam.score}-${nhlGame.homeTeam.score}`);
          } else {
            console.log(`   ❌ No NHL game found for ${awayAbbrev} @ ${homeAbbrev}`);
            console.log(`   Available NHL games:`, nhlGames.map(g => `${g.awayTeam?.abbrev} @ ${g.homeTeam?.abbrev}`));
          }
        } else {
          console.log(`   ⚠️ Missing abbreviations: home=${homeAbbrev}, away=${awayAbbrev}`);
        }
      }
      
      return processMatch(match, nhlGame);
    });
    
    // Cache for 15 minutes
    cache.set(cacheKey, processedMatches, CACHE_TTL);
    
    console.log(`✅ Fetched ${processedMatches.length} hockey matches (${filter})`);
    
    return processedMatches;
  } catch (error) {
    console.error('Error fetching hockey matches:', error);
    return cached || [];
  }
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
    console.log(`✅ Using cached all matches (${filter})`);
    return cached;
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const matches = await response.json();
    const processedMatches = matches.map(processMatch);
    
    cache.set(cacheKey, processedMatches, CACHE_TTL);
    
    return processedMatches;
  } catch (error) {
    console.error('Error fetching all matches:', error);
    return cached || [];
  }
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
    console.log(`✅ Using cached stream for ${source}/${id}`);
    return cached;
  }
  
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
  }
}

/**
 * Process raw match data
 * @param {Object} match - Raw match object from API
 * @param {Object} nhlGame - Optional NHL game data for accurate live status
 * @returns {Object} Processed match object
 */
function processMatch(match, nhlGame = null) {
  const now = Date.now();
  const matchTime = match.date;
  
  // Determine status using NHL data if available, otherwise use time-based logic
  let status;
  let liveData = null;
  
  if (nhlGame) {
    // Use NHL API data for accurate status
    const gameState = nhlGame.gameState;
    
    if (gameState === 'LIVE' || gameState === 'CRIT') {
      status = 'live';
      liveData = {
        period: nhlGame.period,
        periodType: nhlGame.periodDescriptor?.periodType,
        timeRemaining: nhlGame.clock?.timeRemaining,
        inIntermission: nhlGame.clock?.inIntermission,
        score: {
          home: nhlGame.homeTeam?.score || 0,
          away: nhlGame.awayTeam?.score || 0
        },
        sog: {
          home: nhlGame.homeTeam?.sog || 0,
          away: nhlGame.awayTeam?.sog || 0
        }
      };
    } else if (gameState === 'FINAL' || gameState === 'OFF') {
      status = 'finished';
      // Still show final score for finished games
      liveData = {
        score: {
          home: nhlGame.homeTeam?.score || 0,
          away: nhlGame.awayTeam?.score || 0
        },
        sog: {
          home: nhlGame.homeTeam?.sog || 0,
          away: nhlGame.awayTeam?.sog || 0
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
  
  // Debug log for highlights feature
  if (nhlGame?.id) {
    console.log(`   📊 Stored NHL game ID ${nhlGame.id} for ${match.title}`);
  }
  
  // Add live data if available
  if (liveData) {
    processedMatch.liveData = liveData;
  }
  
  return processedMatch;
}

/**
 * Get display name for category
 * @param {string} category - Category ID
 * @returns {string} Display name
 */
function getCategoryDisplayName(category) {
  const names = {
    'hockey': 'NHL',
    'basketball': 'NBA',
    'football': 'Soccer',
    'american-football': 'NFL',
    'baseball': 'MLB',
    'fight': 'UFC/Boxing',
    'motor-sports': 'Racing'
  };
  
  return names[category] || category;
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
