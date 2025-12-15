/**
 * TheSportsDB API Service
 * Provides team logos, images, and sports data
 */

import { cache } from '../utils/cache.js';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = import.meta.env.VITE_SPORTSDB_KEY || '3'; // Default to test key
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

/**
 * Search for a specific team by name
 * @param {string} teamName - Team name to search
 * @returns {Promise<Object|null>} Team object or null
 */
export async function searchTeam(teamName) {
  const cacheKey = `sportsdb_team_${teamName.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log(`✅ Using cached team: ${teamName}`);
    return cached;
  }
  
  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/searchteams.php?t=${encodeURIComponent(teamName)}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const team = data.teams?.[0] || null;
    
    if (team) {
      cache.set(cacheKey, team, CACHE_TTL.TEAMS);
    }
    
    return team;
  } catch (error) {
    console.error(`Error searching for team ${teamName}:`, error);
    return null;
  }
}

/**
 * Get team by ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object|null>} Team object or null
 */
export async function getTeamById(teamId) {
  const cacheKey = `sportsdb_team_id_${teamId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log(`✅ Using cached team ID: ${teamId}`);
    return cached;
  }
  
  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/lookupteam.php?id=${teamId}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const team = data.teams?.[0] || null;
    
    if (team) {
      cache.set(cacheKey, team, CACHE_TTL.TEAMS);
    }
    
    return team;
  } catch (error) {
    console.error(`Error fetching team ${teamId}:`, error);
    return null;
  }
}

/**
 * Extract team logo URL from team object
 * @param {Object} team - Team object from API
 * @returns {string|null} Logo URL or null
 */
export function getTeamLogo(team) {
  return team?.strBadge || team?.strLogo || null;
}

/**
 * Get all team images
 * @param {Object} team - Team object from API
 * @returns {Object} Object with all image URLs
 */
export function getTeamImages(team) {
  if (!team) return {};
  
  return {
    logo: team.strBadge,
    alternateLogo: team.strLogo,
    banner: team.strTeamBanner,
    jersey: team.strTeamJersey,
    stadium: team.strStadiumThumb,
    fanart: team.strTeamFanart1,
  };
}

/**
 * Map team name variations to consistent names
 * (Streamed.pk might use different names than TheSportsDB)
 * @param {string} teamName - Team name from Streamed.pk
 * @returns {string} Normalized team name
 */
export function normalizeTeamName(teamName) {
  const nameMap = {
    // Add mappings as needed
    'Montreal': 'Montreal Canadiens',
    'Toronto': 'Toronto Maple Leafs',
    'Vancouver': 'Vancouver Canucks',
    // ... add more as discovered
  };
  
  return nameMap[teamName] || teamName;
}
