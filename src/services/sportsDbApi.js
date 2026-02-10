/**
 * TheSportsDB API Service
 * Provides team logos, images, and sports data
 */

import { cache } from '../utils/cache.js';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = 3;
const CACHE_TTL = {
  TEAMS: 30 * 24 * 60 * 60 * 1000, // 30 days - team data rarely changes
};

/**
 * Search for NHL teams
 * @returns {Promise<Array>} Array of NHL teams
 */
export async function getAllNHLTeams() {
  const cacheKey = 'sportsdb_nhl_teams';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('✅ Using cached NHL teams');
    return cached;
  }
  
  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/search_all_teams.php?l=NHL`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const teams = data.teams || [];
    
    cache.set(cacheKey, teams, CACHE_TTL.TEAMS);
    return teams;
  } catch (error) {
    console.error('Error fetching NHL teams:', error);
    return [];
  }
}


