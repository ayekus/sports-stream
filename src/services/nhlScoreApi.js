/**
 * NHL Live Score API Service
 * Provides real-time game scores, periods, and game states
 */

import { cache } from '../utils/cache.js';
import { toAPIDate } from '../utils/date.js';
import { logger } from '../utils/logger.js';

// Use Vite proxy to avoid CORS issues
const BASE_URL = '/api/nhl';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for live data

// Track pending requests to avoid duplicate fetches
const pendingRequests = new Map();

/**
 * Get live NHL scores for today
 * @returns {Promise<Object>} Live scores data with game details
 */
export async function getLiveScores() {
  // Use toAPIDate to avoid UTC rollover issues
  const today = toAPIDate();
  return getScoresByDate(today);
}

/**
 * Get scores for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Scores data for the date
 */
export async function getScoresByDate(date) {
  const cacheKey = `nhl_scores_${date}`;

  // 1. Check Cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Check Pending Requests (Coalescing)
  if (pendingRequests.has(cacheKey)) {
    logger.log(`⚡ Joining pending request for NHL scores (${date})`);
    return pendingRequests.get(cacheKey);
  }

  // 3. Create New Request
  const promise = (async () => {
    try {
      logger.log(`🔄 Fetching fresh NHL scores for ${date}...`);

      const response = await fetch(`${BASE_URL}/score/${date}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      logger.log(`✅ Fetched ${data.games?.length || 0} NHL games for ${date}`);

      // Determine Cache TTL based on game states
      let ttl = CACHE_TTL; // Default 2 mins

      const allFinal = data.games?.length > 0 &&
                       data.games.every(g => g.gameState === 'FINAL' || g.gameState === 'OFF');

      const today = toAPIDate();

      // If all games are final, we can cache for much longer (24 hours)
      // If date is in the past and no games (e.g. off season day), also cache longer
      if (allFinal) {
        ttl = 24 * 60 * 60 * 1000; // 24 hours
        logger.log(`🔒 Caching final scores for ${date} (24h)`);
      } else if (date < today && (!data.games || data.games.length === 0)) {
        ttl = 24 * 60 * 60 * 1000; // 24 hours for past empty days
        logger.log(`🔒 Caching empty past schedule for ${date} (24h)`);
      } else if (date > today) {
        ttl = 60 * 60 * 1000; // 1 hour for future schedule
        logger.log(`📅 Caching future schedule for ${date} (1h)`);
      }

      // Cache the result
      cache.set(cacheKey, data, ttl);

      return data;
    } catch (error) {
      console.error(`Error fetching scores for ${date}:`, error);
      return { games: [] };
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
 * Find NHL game by team abbreviations
 * @param {string} homeTeam - Home team abbreviation (e.g., 'TOR')
 * @param {string} awayTeam - Away team abbreviation (e.g., 'MTL')
 * @returns {Promise<Object|null>} Game data or null if not found
 */
export async function findGameByTeams(homeTeam, awayTeam) {
  const scores = await getLiveScores();
  
  const game = scores.games?.find(g => 
    g.homeTeam?.abbrev === homeTeam && g.awayTeam?.abbrev === awayTeam
  );
  
  return game || null;
}

/**
 * Get enriched game state from NHL API
 * Determines if game is truly live based on game state from NHL
 * @param {Object} nhlGame - NHL game object
 * @returns {Object} Enhanced game state info
 */
export function getGameState(nhlGame) {
  if (!nhlGame) {
    return {
      status: 'unknown',
      isLive: false,
      period: null,
      timeRemaining: null,
      score: null
    };
  }
  
  const state = nhlGame.gameState;
  const isLive = state === 'LIVE' || state === 'CRIT';
  const isFinal = state === 'FINAL' || state === 'OFF';
  
  return {
    status: isLive ? 'live' : (isFinal ? 'finished' : 'upcoming'),
    isLive,
    isFinal,
    period: nhlGame.period || null,
    periodType: nhlGame.periodDescriptor?.periodType || null,
    timeRemaining: nhlGame.clock?.timeRemaining || null,
    inIntermission: nhlGame.clock?.inIntermission || false,
    score: {
      home: nhlGame.homeTeam?.score || 0,
      away: nhlGame.awayTeam?.score || 0
    },
    sog: {
      home: nhlGame.homeTeam?.sog || 0,
      away: nhlGame.awayTeam?.sog || 0
    }
  };
}

/**
 * Format period for display
 * @param {number} period - Period number
 * @param {string} periodType - Period type (REG, OT, SO)
 * @returns {string} Formatted period text
 */
export function formatPeriod(period, periodType) {
  if (!period) return '';
  
  if (periodType === 'SO') return 'SO'; // Shootout
  if (periodType === 'OT') return `OT${period > 4 ? period - 3 : ''}`; // OT, 2OT, 3OT...
  
  // Regular periods
  const ordinals = ['', '1st', '2nd', '3rd'];
  return ordinals[period] || `${period}th`;
}

// NHL team name variations to abbreviations
// Defined outside function to prevent recreation on every call
const NHL_TEAM_ABBREVIATIONS = {
  'Toronto Maple Leafs': 'TOR',
  'Toronto': 'TOR',
  'Maple Leafs': 'TOR',
  'Montreal Canadiens': 'MTL',
  'Montreal': 'MTL',
  'Canadiens': 'MTL',
  'Ottawa Senators': 'OTT',
  'Ottawa': 'OTT',
  'Senators': 'OTT',
  'Boston Bruins': 'BOS',
  'Boston': 'BOS',
  'Bruins': 'BOS',
  'Buffalo Sabres': 'BUF',
  'Buffalo': 'BUF',
  'Sabres': 'BUF',
  'Detroit Red Wings': 'DET',
  'Detroit': 'DET',
  'Red Wings': 'DET',
  'Florida Panthers': 'FLA',
  'Florida': 'FLA',
  'Panthers': 'FLA',
  'Tampa Bay Lightning': 'TBL',
  'Tampa Bay': 'TBL',
  'Lightning': 'TBL',
  'New York Rangers': 'NYR',
  'Rangers': 'NYR',
  'New York Islanders': 'NYI',
  'Islanders': 'NYI',
  'New Jersey Devils': 'NJD',
  'New Jersey': 'NJD',
  'Devils': 'NJD',
  'Philadelphia Flyers': 'PHI',
  'Philadelphia': 'PHI',
  'Flyers': 'PHI',
  'Pittsburgh Penguins': 'PIT',
  'Pittsburgh': 'PIT',
  'Penguins': 'PIT',
  'Washington Capitals': 'WSH',
  'Washington': 'WSH',
  'Capitals': 'WSH',
  'Carolina Hurricanes': 'CAR',
  'Carolina': 'CAR',
  'Hurricanes': 'CAR',
  'Columbus Blue Jackets': 'CBJ',
  'Columbus': 'CBJ',
  'Blue Jackets': 'CBJ',
  'Chicago Blackhawks': 'CHI',
  'Chicago': 'CHI',
  'Blackhawks': 'CHI',
  'Colorado Avalanche': 'COL',
  'Colorado': 'COL',
  'Avalanche': 'COL',
  'Dallas Stars': 'DAL',
  'Dallas': 'DAL',
  'Stars': 'DAL',
  'Minnesota Wild': 'MIN',
  'Minnesota': 'MIN',
  'Wild': 'MIN',
  'Nashville Predators': 'NSH',
  'Nashville': 'NSH',
  'Predators': 'NSH',
  'St. Louis Blues': 'STL',
  'St. Louis': 'STL',
  'Blues': 'STL',
  'Winnipeg Jets': 'WPG',
  'Winnipeg': 'WPG',
  'Jets': 'WPG',
  'Anaheim Ducks': 'ANA',
  'Anaheim': 'ANA',
  'Ducks': 'ANA',
  'Arizona Coyotes': 'ARI',
  'Arizona': 'ARI',
  'Coyotes': 'ARI',
  'Calgary Flames': 'CGY',
  'Calgary': 'CGY',
  'Flames': 'CGY',
  'Edmonton Oilers': 'EDM',
  'Edmonton': 'EDM',
  'Oilers': 'EDM',
  'Los Angeles Kings': 'LAK',
  'Los Angeles': 'LAK',
  'Kings': 'LAK',
  'San Jose Sharks': 'SJS',
  'San Jose': 'SJS',
  'Sharks': 'SJS',
  'Seattle Kraken': 'SEA',
  'Seattle': 'SEA',
  'Kraken': 'SEA',
  'Vancouver Canucks': 'VAN',
  'Vancouver': 'VAN',
  'Canucks': 'VAN',
  'Vegas Golden Knights': 'VGK',
  'Vegas': 'VGK',
  'Golden Knights': 'VGK',
  'Utah Hockey Club': 'UTA',
  'Utah Mammoth': 'UTA',
  'Utah': 'UTA'
};

/**
 * Map team name to NHL abbreviation
 * @param {string} teamName - Full team name
 * @returns {string|null} Team abbreviation or null
 */
export function getTeamAbbreviation(teamName) {
  return NHL_TEAM_ABBREVIATIONS[teamName] || null;
}

/**
 * Check if a team is an NHL team
 * @param {string} teamName - Team name to check
 * @returns {boolean} True if team is NHL team
 */
export function isNHLTeam(teamName) {
  if (!teamName || teamName === 'TBA') return false;
  return getTeamAbbreviation(teamName) !== null;
}

// Olympic keywords
// Defined outside function to prevent recreation on every call
const OLYMPIC_KEYWORDS = [
  'olympic',
  'olympics',
  'world juniors',
  'world championship',
  'iihf',
  'u18',
  'u20',
  'world cup',
  'spengler cup'
];

// National team keywords
// Defined outside function to prevent recreation on every call
const NATIONAL_TEAM_KEYWORDS = [
  'canada', 'usa', 'united states', 'sweden', 'finland', 'russia',
  'czechia', 'czech republic', 'switzerland', 'germany', 'slovakia',
  'latvia', 'norway', 'denmark', 'austria', 'france', 'kazakhstan',
  'japan', 'italy', 'china', 'great britain', 'korea', 'poland',
  'hungary', 'slovenia', 'ukraine', 'belarus'
];

/**
 * Check if a game is an Olympic or IIHF tournament game
 * @param {string} title - Game title
 * @param {Object} teams - Teams object with home and away teams
 * @returns {boolean} True if game is Olympic/IIHF
 */
export function isOlympicGame(title, teams) {
  if (!title) return false;
  
  const titleLower = title.toLowerCase();
  
  // Check if title contains Olympic/IIHF keywords
  if (OLYMPIC_KEYWORDS.some(keyword => titleLower.includes(keyword))) {
    return true;
  }
  
  if (teams?.home?.name && teams?.away?.name) {
    const homeLower = teams.home.name.toLowerCase();
    const awayLower = teams.away.name.toLowerCase();
    
    // If both teams are national teams, it's likely an Olympic/IIHF game
    const homeIsNational = NATIONAL_TEAM_KEYWORDS.some(keyword => homeLower.includes(keyword));
    const awayIsNational = NATIONAL_TEAM_KEYWORDS.some(keyword => awayLower.includes(keyword));
    
    if (homeIsNational && awayIsNational) {
      return true;
    }
  }
  
  return false;
}
