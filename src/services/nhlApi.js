/**
 * NHL Standings API Service
 * Uses unofficial NHL API for current standings
 */

import { cache } from '../utils/cache.js';

// Use Vite proxy to avoid CORS issues
const BASE_URL = '/api/nhl';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Track pending requests to avoid duplicate fetches
const pendingRequests = new Map();

/**
 * Get current NHL standings
 * @returns {Promise<Object>} Standings data with divisions
 */
export async function getNHLStandings() {
  const cacheKey = 'nhl_standings_current';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('✅ Using cached NHL standings');
    return cached;
  }
  
  // Check for pending request to avoid race conditions
  if (pendingRequests.has(cacheKey)) {
    console.log('⚡ Joining pending request for NHL standings');
    return pendingRequests.get(cacheKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      // Use today's date instead of /now endpoint
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${BASE_URL}/standings/${today}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache for 6 hours
      cache.set(cacheKey, data, CACHE_TTL);

      console.log('✅ Fetched NHL standings', data);

      return data;
    } catch (error) {
      console.error('Error fetching NHL standings:', error);
      return cached || { standings: [] };
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
 * Get team logo URL from NHL assets
 * @param {string} teamAbbrev - Team abbreviation (e.g., 'TOR', 'MTL')
 * @returns {string} Logo URL
 */
export function getTeamLogoUrl(teamAbbrev) {
  return `https://assets.nhle.com/logos/nhl/svg/${teamAbbrev}_light.svg`;
}
