/**
 * API-Sports Hockey API Service
 * Provides official NHL schedules, scores, and statistics
 */

import { cache } from '../utils/cache.js';
import { toAPIDate } from '../utils/date.js';

const BASE_URL = 'https://v1.hockey.api-sports.io';
const API_KEY = import.meta.env.VITE_API_SPORTS_KEY;
const CACHE_TTL = {
  SCHEDULE: 2 * 60 * 60 * 1000, // 2 hours
  TEAMS: 24 * 60 * 60 * 1000, // 24 hours
  STANDINGS: 6 * 60 * 60 * 1000, // 6 hours
  STATS: 5 * 60 * 1000, // 5 minutes for live game stats
};

// NHL League ID in API-Sports
const NHL_LEAGUE_ID = 57;
const CURRENT_SEASON = 2024;

/**
 * Make API request with authentication
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response data
 */
async function apiRequest(endpoint, params = {}) {
  if (!API_KEY) {
    console.warn('⚠️ API-Sports key not configured. Using cached data only.');
    return { response: [] };
  }
  
  const queryString = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v1.hockey.api-sports.io'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Using cached data.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API-Sports request error:', error);
    throw error;
  }
}

/**
 * Get NHL games for a specific date
 * @param {string} date - Date in YYYY-MM-DD format (default: today)
 * @returns {Promise<Array>} Array of games
 */
export async function getGamesByDate(date = null) {
  const targetDate = date || toAPIDate();
  const cacheKey = `apisports_games_${targetDate}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log(`✅ Using cached games for ${targetDate}`);
    return cached;
  }
  
  try {
    const data = await apiRequest('/games', {
      league: NHL_LEAGUE_ID,
      season: CURRENT_SEASON,
      date: targetDate
    });
    
    const games = data.response || [];
    cache.set(cacheKey, games, CACHE_TTL.SCHEDULE);
    
    return games;
  } catch (error) {
    console.error(`Error fetching games for ${targetDate}:`, error);
    return cached || []; // Return cached if available, empty array otherwise
  }
}

/**
 * Get all NHL teams
 * @returns {Promise<Array>} Array of teams
 */
export async function getNHLTeams() {
  const cacheKey = 'apisports_nhl_teams';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('✅ Using cached NHL teams');
    return cached;
  }
  
  try {
    const data = await apiRequest('/teams', {
      league: NHL_LEAGUE_ID,
      season: CURRENT_SEASON
    });
    
    const teams = data.response || [];
    cache.set(cacheKey, teams, CACHE_TTL.TEAMS);
    
    return teams;
  } catch (error) {
    console.error('Error fetching NHL teams:', error);
    return cached || [];
  }
}

/**
 * Get NHL standings
 * @returns {Promise<Array>} Array of standings
 */
export async function getStandings() {
  const cacheKey = 'apisports_nhl_standings';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('✅ Using cached standings');
    return cached;
  }
  
  try {
    const data = await apiRequest('/standings', {
      league: NHL_LEAGUE_ID,
      season: CURRENT_SEASON
    });
    
    const standings = data.response || [];
    cache.set(cacheKey, standings, CACHE_TTL.STANDINGS);
    
    return standings;
  } catch (error) {
    console.error('Error fetching standings:', error);
    return cached || [];
  }
}

/**
 * Get game statistics by game ID
 * @param {number} gameId - Game ID
 * @returns {Promise<Object>} Game statistics
 */
export async function getGameStats(gameId) {
  const cacheKey = `apisports_game_stats_${gameId}`;
  const cached = cache.get(cacheKey, CACHE_TTL.STATS);
  
  if (cached) {
    console.log(`✅ Using cached stats for game ${gameId}`);
    return cached;
  }
  
  try {
    const data = await apiRequest('/games/statistics', {
      id: gameId
    });
    
    const stats = data.response?.[0] || {};
    cache.set(cacheKey, stats, CACHE_TTL.STATS);
    
    return stats;
  } catch (error) {
    console.error(`Error fetching stats for game ${gameId}:`, error);
    return cached || {};
  }
}

/**
 * Process game data to standardized format
 * @param {Object} game - Raw game data from API
 * @returns {Object} Processed game object
 */
export function processGame(game) {
  return {
    id: game.id,
    date: game.date,
    time: game.time,
    timestamp: game.timestamp,
    status: game.status?.long || 'Unknown',
    statusShort: game.status?.short || '',
    league: {
      id: game.league?.id,
      name: game.league?.name,
      logo: game.league?.logo
    },
    teams: {
      home: {
        id: game.teams?.home?.id,
        name: game.teams?.home?.name,
        logo: game.teams?.home?.logo
      },
      away: {
        id: game.teams?.away?.id,
        name: game.teams?.away?.name,
        logo: game.teams?.away?.logo
      }
    },
    scores: {
      home: game.scores?.home,
      away: game.scores?.away
    }
  };
}

/**
 * Check if API key is configured
 * @returns {boolean} True if API key is set
 */
export function isConfigured() {
  return !!API_KEY;
}
