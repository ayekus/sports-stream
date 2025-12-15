/**
 * Streamed.pk API Service
 * Provides live stream links for sports matches
 * Updated to use new API structure
 */

import { cache } from '../utils/cache.js';

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
 * Get hockey matches
 * @param {string} filter - 'all', 'live', or 'today' (default: 'all')
 * @returns {Promise<Array>} Array of hockey matches
 */
export async function getHockeyMatches(filter = 'all') {
  let endpoint;
  let cacheKey;
  
  switch (filter) {
    case 'live':
      endpoint = '/matches/live';
      cacheKey = 'streamed_hockey_live';
      break;
    case 'today':
      endpoint = '/matches/all-today';
      cacheKey = 'streamed_hockey_today';
      break;
    default:
      endpoint = '/matches/hockey';
      cacheKey = 'streamed_hockey_all';
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
    
    // Process matches to add computed fields
    const processedMatches = matches.map(processMatch);
    
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
    
    // Get the first HD stream or first stream available
    const hdStream = streams.find(s => s.hd);
    const selectedStream = hdStream || streams[0];
    
    const streamData = {
      embedUrl: selectedStream?.embedUrl,
      language: selectedStream?.language,
      hd: selectedStream?.hd,
      streamNo: selectedStream?.streamNo,
      allStreams: streams
    };
    
    // Cache for 5 minutes (streams can change)
    cache.set(cacheKey, streamData, 5 * 60 * 1000);
    
    return streamData;
  } catch (error) {
    console.error(`Error fetching stream ${source}/${id}:`, error);
    return cached || { embedUrl: null, allStreams: [] };
  }
}

/**
 * Process raw match data
 * @param {Object} match - Raw match object from API
 * @returns {Object} Processed match object
 */
function processMatch(match) {
  const now = Date.now();
  const matchTime = match.date;
  const threeHoursLater = matchTime + (3 * 60 * 60 * 1000); // Assume matches last ~3 hours
  
  // Determine status
  let status;
  if (now >= matchTime && now <= threeHoursLater) {
    status = 'live';
  } else if (now < matchTime) {
    status = 'upcoming';
  } else {
    status = 'finished';
  }
  
  return {
    id: match.id,
    title: match.title,
    category: match.category,
    time: match.date, // Unix timestamp in milliseconds
    poster: match.poster,
    popular: match.popular,
    league: getCategoryDisplayName(match.category),
    teams: match.teams,
    sources: match.sources || [],
    status
  };
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
