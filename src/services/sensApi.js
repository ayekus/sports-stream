/**
 * Ottawa Senators API Service
 * Fetches Senators-specific data from NHL API or RapidAPI
 */

import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

const SENS_TEAM_ABBREV = 'OTT';

// Use local proxy server to bypass CORS issues
const PROXY_BASE = 'http://localhost:3001/api/nhl';
const NHL_API_BASE = import.meta.env.DEV ? PROXY_BASE : 'https://api-web.nhle.com/v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Track pending requests to avoid duplicate fetches
const pendingRequests = new Map();

/**
 * Fetch from NHL API through proxy
 */
async function fetchNHL(endpoint) {
  const response = await fetch(`${NHL_API_BASE}${endpoint}`);
  return response;
}

/**
 * Get the next scheduled Senators game
 * @returns {Promise<Object>} Next game data
 */
export async function getSensNextGame() {
  const cacheKey = 'sens_next_game';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchNHL(`/club-schedule/${SENS_TEAM_ABBREV}/week/now`);

      if (!response.ok) {
        console.warn('NHL API request failed');
        return null;
      }

      const data = await response.json();
      const now = new Date();

      // First try to find an upcoming game this week
      const nextGame = data.games?.find(game => {
        const gameDate = new Date(game.startTimeUTC);
        return gameDate >= now;
      });
      
      if (nextGame) {
        cache.set(cacheKey, nextGame, CACHE_DURATION);
        return nextGame;
      }

      // If no upcoming game, check if there's a live game today
      const liveGame = data.games?.find(game => {
        const gameDate = new Date(game.startTimeUTC);
        const gameEndEstimate = new Date(gameDate.getTime() + (3 * 60 * 60 * 1000)); // Assume 3 hour max
        return gameDate < now && now < gameEndEstimate && game.gameState !== 'OFF';
      });
      
      if (liveGame) {
        cache.set(cacheKey, liveGame, 60 * 1000); // 1 minute cache for live games
        return liveGame;
      }

      // If no game found this week, try next week
      const nextWeekResponse = await fetchNHL(`/club-schedule/${SENS_TEAM_ABBREV}/week/next`);
      if (nextWeekResponse.ok) {
        const nextWeekData = await nextWeekResponse.json();
        const nextWeekGame = nextWeekData.games?.find(game => {
          const gameDate = new Date(game.startTimeUTC);
          return gameDate >= now;
        });

        if (nextWeekGame) {
          cache.set(cacheKey, nextWeekGame, CACHE_DURATION);
          return nextWeekGame;
        }
      }

      // If still no game, check the entire month
      const monthResponse = await fetchNHL(`/club-schedule/${SENS_TEAM_ABBREV}/month/now`);
      if (monthResponse.ok) {
        const monthData = await monthResponse.json();
        const monthGame = monthData.games?.find(game => {
          const gameDate = new Date(game.startTimeUTC);
          return gameDate >= now;
        });

        if (monthGame) {
          cache.set(cacheKey, monthGame, CACHE_DURATION);
          return monthGame;
        }
      }

      // No games found
      cache.set(cacheKey, null, CACHE_DURATION);
      return null;
    } catch (error) {
      console.error('Error fetching next Sens game:', error);
      return null;
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
 * Get current Senators roster
 * @returns {Promise<Object>} Roster data with forwards, defensemen, goalies
 */
export async function getSensRoster() {
  const cacheKey = 'sens_roster';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchNHL(`/roster/${SENS_TEAM_ABBREV}/current`);
      if (!response.ok) throw new Error('Failed to fetch roster');

      const data = await response.json();
      cache.set(cacheKey, data, 15 * 60 * 1000);
      return data;
    } catch (error) {
      console.error('Error fetching Sens roster:', error);
      return null;
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
 * Get current standings with Senators position
 * @returns {Promise<Object>} Standings data
 */
export async function getSensStandings() {
  const cacheKey = 'sens_standings';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchNHL('/standings/now');
      if (!response.ok) throw new Error('Failed to fetch standings');

      const data = await response.json();
      cache.set(cacheKey, data, 15 * 60 * 1000);
      return data;
    } catch (error) {
      console.error('Error fetching standings:', error);
      return null;
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
 * Get Senators schedule for upcoming games
 * @param {number} count - Number of games to return (default 5)
 * @returns {Promise<Array>} Array of upcoming games
 */
export async function getSensSchedule(count = 5) {
  const cacheKey = `sens_schedule_${count}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      // Fetch current month
      const response = await fetchNHL(`/club-schedule/${SENS_TEAM_ABBREV}/month/now`);
      if (!response.ok) throw new Error('Failed to fetch schedule');
      
      const data = await response.json();
      
      const now = new Date();

      let upcomingGames = data.games?.filter(game => {
        const gameDate = new Date(game.startTimeUTC);
        return gameDate >= now;
      }) || [];

      // If we don't have enough games, fetch additional months incrementally
      if (upcomingGames.length < count) {

        // Fetch months incrementally until we have enough
        let monthsToFetch = 0; // Start at 0 to get the rest of the current month
        const maxMonths = 3; // Don't fetch more than 3 months ahead

        while (upcomingGames.length < count && monthsToFetch <= maxMonths) {
          try {
            const monthResponse = await fetchNHL(`/club-schedule/${SENS_TEAM_ABBREV}/month/${getMonthOffset(monthsToFetch)}`);
            
            if (monthResponse.ok) {
              const monthData = await monthResponse.json();
              const monthGames = monthData.games?.filter(game => {
                const gameDate = new Date(game.startTimeUTC);
                return gameDate >= now && !upcomingGames.find(g => g.id === game.id);
              }) || [];

              if (monthGames.length > 0) {
                upcomingGames = [...upcomingGames, ...monthGames];
              }
            }
          } catch (error) {
            console.warn(`Could not fetch month +${monthsToFetch}:`, error);
          }

          monthsToFetch++;
        }
      }

      // Take only what we need
      const result = upcomingGames.slice(0, count);
      cache.set(cacheKey, result, CACHE_DURATION);
      return result;
    } catch (error) {
      console.error('Error fetching Sens schedule:', error);
      return [];
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store promise
  pendingRequests.set(cacheKey, promise);

  return promise;
}

// Helper to get month offset date string
function getMonthOffset(monthsAhead) {
  const date = new Date();
  date.setDate(1); // Set to 1st to avoid end-of-month rollover bugs
  date.setMonth(date.getMonth() + monthsAhead);
  return date.toISOString().split('T')[0].substring(0, 7); // Returns YYYY-MM
}

/**
 * Get current season record for Senators
 * @returns {Promise<Object>} Season record data
 */
export async function getSensSeasonRecord() {
  const cacheKey = 'sens_season_record';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const standings = await getSensStandings();
      if (!standings) return null;

      const sensTeam = standings.standings?.find(team =>
        team.teamAbbrev?.default === SENS_TEAM_ABBREV
      );

      if (!sensTeam) return null;

      const record = {
        wins: sensTeam.wins || 0,
        losses: sensTeam.losses || 0,
        otLosses: sensTeam.otLosses || 0,
        points: sensTeam.points || 0,
        gamesPlayed: sensTeam.gamesPlayed || 0,
        goalDifferential: sensTeam.goalDifferential || 0,
        divisionSequence: sensTeam.divisionSequence || null,
        conferenceSequence: sensTeam.conferenceSequence || null,
        wildcardSequence: sensTeam.wildcardSequence || null,
        leagueSequence: sensTeam.leagueSequence || null,
        streakCode: sensTeam.streakCode || '',
        streakCount: sensTeam.streakCount || 0
      };

      cache.set(cacheKey, record, 15 * 60 * 1000);
      return record;
    } catch (error) {
      console.error('Error fetching season record:', error);
      return null;
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store promise
  pendingRequests.set(cacheKey, promise);

  return promise;
}
