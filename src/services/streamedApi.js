/**
 * Streamed.pk API Service
 * Provides access to live sports streams
 */

import { cache } from '../utils/cache.js';

const BASE_URL = 'https://streamed.pk/api';
const CACHE_TTL = {
  MATCHES: 15 * 60 * 1000, // 15 minutes
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Fetch all hockey matches
 * @returns {Promise<Array>} Array of hockey matches
 */
export async function getHockeyMatches() {
  const cacheKey = 'streamed_hockey_matches';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('✅ Using cached hockey matches');
    return cached;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/matches/ice-hockey`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const matches = await response.json();
    cache.set(cacheKey, matches, CACHE_TTL.MATCHES);
    
    return matches;
  } catch (error) {
    console.error('Error fetching hockey matches:', error);
    return [];
  }
}

/**
 * Fetch stream URLs for a specific match
 * @param {string} source - Stream source provider
 * @param {string} id - Match/stream ID
 * @returns {Promise<Object>} Stream data with URLs
 */
export async function getStreamUrls(source, id) {
  try {
    const response = await fetch(`${BASE_URL}/stream/${source}/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const streamData = await response.json();
    return streamData;
  } catch (error) {
    console.error('Error fetching stream URLs:', error);
    throw error;
  }
}

/**
 * Fetch all available sports
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
    cache.set(cacheKey, sports, CACHE_TTL.SPORTS);
    
    return sports;
  } catch (error) {
    console.error('Error fetching sports:', error);
    return [];
  }
}

/**
 * Get event image URL
 * @param {string} eventId - Event ID
 * @returns {string} Image URL
 */
export function getEventImageUrl(eventId) {
  return `${BASE_URL}/images/event/${eventId}`;
}

/**
 * Process match data to standardized format
 * @param {Object} rawMatch - Raw match data from API
 * @returns {Object} Processed match object
 */
export function processMatch(rawMatch) {
  return {
    id: rawMatch.id,
    title: rawMatch.title,
    time: rawMatch.time,
    league: rawMatch.league || 'Unknown',
    sources: rawMatch.sources || [],
    poster: rawMatch.poster || null,
    status: determineMatchStatus(rawMatch.time),
  };
}

/**
 * Determine match status based on time
 * @param {string} matchTime - Match start time
 * @returns {string} Status: 'live', 'upcoming', or 'finished'
 */
function determineMatchStatus(matchTime) {
  const now = new Date();
  const matchDate = new Date(matchTime);
  const endTime = new Date(matchDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours
  
  if (now >= matchDate && now <= endTime) {
    return 'live';
  } else if (now < matchDate) {
    return 'upcoming';
  } else {
    return 'finished';
  }
}
