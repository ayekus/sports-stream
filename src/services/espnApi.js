/**
 * ESPN API Service
 * Fetches NHL data from ESPN's hidden API including roster, injuries, and team stats
 */

import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

const ESPN_PROXY_BASE = 'http://localhost:3001/api/espn';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Ottawa Senators ESPN team ID
const OTT_ESPN_ID = '14';

// Track pending requests to avoid duplicate fetches
const pendingRequests = new Map();

/**
 * Fetch from ESPN API through our proxy
 */
async function fetchESPN(endpoint) {
  const response = await fetch(`${ESPN_PROXY_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status}`);
  }
  return response;
}

/**
 * Get Senators team information including roster
 * @returns {Promise<Object>} Team data with roster
 */
export async function getSensTeamInfo() {
  const cacheKey = 'espn_sens_team_info';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchESPN(`/teams/${OTT_ESPN_ID}`);
      const data = await response.json();

      cache.set(cacheKey, data, CACHE_DURATION);
      return data;
    } catch (error) {
      console.error('Error fetching Sens team info from ESPN:', error);
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
 * Get Senators full roster with athlete details
 * @returns {Promise<Array>} Array of players
 */
export async function getSensRoster() {
  const cacheKey = 'espn_sens_roster';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchESPN(`/teams/${OTT_ESPN_ID}/roster`);
      const data = await response.json();

      // Extract athletes from the response
      const roster = data.athletes || [];

      cache.set(cacheKey, roster, CACHE_DURATION);
      return roster;
    } catch (error) {
      console.error('Error fetching Sens roster from ESPN:', error);
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

/**
 * Get Senators team statistics
 * @returns {Promise<Object>} Team statistics
 */
export async function getSensTeamStats() {
  const cacheKey = 'espn_sens_stats';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchESPN(`/teams/${OTT_ESPN_ID}/statistics`);
      const data = await response.json();

      cache.set(cacheKey, data, CACHE_DURATION);
      return data;
    } catch (error) {
      console.error('Error fetching Sens stats from ESPN:', error);
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
 * Get injuries for a specific team
 * @param {string} teamId - ESPN team ID
 * @returns {Promise<Array>} Array of injured players
 */
export async function getTeamInjuries(teamId = OTT_ESPN_ID) {
  const cacheKey = `espn_team_injuries_${teamId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      // ESPN doesn't have a direct injuries endpoint, but we can check roster for injury status
      const roster = await getSensRoster();

      // Filter for injured players
      // ESPN stores injury info in the 'injuries' array, not in status.type
      const injuries = roster
        .flatMap(group => group.items || [])
        .filter(player => {
          // Check if player has any injuries in the injuries array
          return player.injuries && player.injuries.length > 0;
        })
        .map(player => {
          // Get the most recent injury (first in array)
          const injury = player.injuries[0];
          return {
            id: player.id,
            name: player.fullName || player.displayName,
            position: player.position?.abbreviation || 'N/A',
            jerseyNumber: player.jersey || '',
            injury: injury.status || 'Unknown',
            status: injury.status || 'Unknown',
            description: injury.description || '',
            date: injury.date || null,
            headshot: player.headshot?.href || null
          };
        });

      cache.set(cacheKey, injuries, CACHE_DURATION);
      return injuries;
    } catch (error) {
      console.error('Error fetching team injuries from ESPN:', error);
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

/**
 * Get team leaders (top scorers, etc.)
 * @returns {Promise<Object>} Team leaders data
 */
export async function getSensLeaders() {
  const cacheKey = 'espn_sens_leaders';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchESPN(`/teams/${OTT_ESPN_ID}/leaders`);
      const data = await response.json();

      cache.set(cacheKey, data, CACHE_DURATION);
      return data;
    } catch (error) {
      console.error('Error fetching Sens leaders from ESPN:', error);
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
 * Get current season scoreboard/schedule
 * @returns {Promise<Object>} Scoreboard data
 */
export async function getScoreboard(date = null) {
  const dateStr = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  const cacheKey = `espn_scoreboard_${dateStr}`;
  const cached = cache.get(cacheKey, 5 * 60 * 1000); // 5 min cache for scoreboard
  if (cached) return cached;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const response = await fetchESPN(`/scoreboard?dates=${dateStr}`);
      const data = await response.json();

      cache.set(cacheKey, data, 5 * 60 * 1000);
      return data;
    } catch (error) {
      console.error('Error fetching scoreboard from ESPN:', error);
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
