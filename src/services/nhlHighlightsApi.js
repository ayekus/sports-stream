/**
 * NHL Highlights API Service
 * Fetches goal highlight videos from NHL API
 */

import { cache } from '../utils/cache.js';

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for highlights

/**
 * Get goal highlights for a specific game
 * @param {number} gameId - NHL game ID
 * @param {string} date - Game date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of goal highlights
 */
export async function getGameHighlights(gameId, date) {
  const cacheKey = `nhl_highlights_${gameId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log(`✅ Using cached highlights for game ${gameId}`);
    return cached;
  }
  
  try {
    // Fetch game data from NHL API which includes goals array
    console.log(`📅 Fetching NHL scores for date: ${date}`);
    const response = await fetch(`/api/nhl/score/${date}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`📊 NHL API returned ${data.games?.length || 0} games`);
    if (data.games) {
      console.log(`📋 Game IDs in response:`, data.games.map(g => g.id));
    }
    
    // Find the specific game by ID
    const game = data.games?.find(g => g.id === gameId);
    
    if (!game) {
      console.log(`❌ Game ${gameId} not found in NHL API response for date ${date}`);
      return [];
    }
    
    // Debug: log what we got
    console.log(`🔍 Game found:`, game.id, game.homeTeam?.abbrev, 'vs', game.awayTeam?.abbrev);
    console.log(`🔍 Game keys:`, Object.keys(game));
    console.log(`🔍 Has goals property:`, 'goals' in game, 'goals count:', game.goals?.length);
    
    if (!game.goals || game.goals.length === 0) {
      console.log(`No goals found for game ${gameId}`);
      return [];
    }
    
    // Process and format goals for UI
    const highlights = game.goals.map(goal => formatGoalHighlight(goal, game));
    
    // Cache the highlights
    cache.set(cacheKey, highlights, CACHE_TTL);
    
    console.log(`✅ Fetched ${highlights.length} highlights for game ${gameId}`);
    
    return highlights;
  } catch (error) {
    console.error(`Error fetching highlights for game ${gameId}:`, error);
    return cached || [];
  }
}

/**
 * Format goal data for UI consumption
 * @param {Object} goal - Raw goal object from NHL API
 * @param {Object} game - Game object containing team info
 * @returns {Object} Formatted highlight object
 */
function formatGoalHighlight(goal, game) {
  const isHomeGoal = goal.teamAbbrev === game.homeTeam.abbrev;
  const scoringTeam = isHomeGoal ? game.homeTeam : game.awayTeam;
  
  return {
    // Goal identification
    goalId: goal.highlightClip || goal.discreteClip,
    
    // Scorer information
    scorer: {
      name: goal.name?.default || 'Unknown',
      firstName: goal.firstName?.default || '',
      lastName: goal.lastName?.default || '',
      playerId: goal.playerId,
      mugshot: goal.mugshot
    },
    
    // Assists information
    assists: goal.assists?.map(assist => ({
      name: assist.name?.default || 'Unknown',
      playerId: assist.playerId,
      assistsToDate: assist.assistsToDate
    })) || [],
    
    // Team information
    team: {
      abbrev: goal.teamAbbrev,
      name: scoringTeam.name?.default || goal.teamAbbrev,
      logo: scoringTeam.logo,
      isHome: isHomeGoal
    },
    
    // Time information
    period: goal.period,
    periodType: goal.periodDescriptor?.periodType || 'REG',
    timeInPeriod: goal.timeInPeriod,
    periodDisplay: formatPeriodDisplay(goal.period, goal.periodDescriptor?.periodType),
    
    // Score information
    score: {
      away: goal.awayScore,
      home: goal.homeScore,
      display: `${goal.awayScore}-${goal.homeScore}`
    },
    
    // Goal type
    strength: goal.strength,
    strengthDisplay: formatStrength(goal.strength),
    goalModifier: goal.goalModifier,
    
    // Video URLs
    videos: {
      highlightUrl: goal.highlightClipSharingUrl,
      highlightUrlFr: goal.highlightClipSharingUrlFr,
      discreteUrl: constructDiscreteUrl(goal.discreteClip),
      discreteUrlFr: constructDiscreteUrl(goal.discreteClipFr)
    },
    
    // Stats
    goalsToDate: goal.goalsToDate
  };
}

/**
 * Format period for display
 * @param {number} period - Period number
 * @param {string} periodType - Period type (REG, OT, SO)
 * @returns {string} Formatted period display
 */
function formatPeriodDisplay(period, periodType) {
  if (periodType === 'SO') return 'Shootout';
  if (periodType === 'OT') {
    const otNumber = period - 3;
    return otNumber === 1 ? 'OT' : `${otNumber}OT`;
  }
  
  const ordinals = ['', '1st', '2nd', '3rd'];
  return ordinals[period] || `${period}th`;
}

/**
 * Format goal strength for display
 * @param {string} strength - Goal strength code
 * @returns {string} Display text
 */
function formatStrength(strength) {
  const strengthMap = {
    'ev': 'Even Strength',
    'pp': 'Power Play',
    'sh': 'Short Handed',
    'ps': 'Penalty Shot'
  };
  
  return strengthMap[strength] || 'Even Strength';
}

/**
 * Construct discrete video URL from clip ID
 * @param {number} clipId - Video clip ID
 * @returns {string} Full URL
 */
function constructDiscreteUrl(clipId) {
  if (!clipId) return null;
  return `https://nhl.com/video/${clipId}`;
}

/**
 * Get game recap videos
 * @param {number} gameId - NHL game ID
 * @param {string} date - Game date in YYYY-MM-DD format
 * @returns {Promise<Object>} Recap video URLs
 */
export async function getGameRecaps(gameId, date) {
  const cacheKey = `nhl_recaps_${gameId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(`/api/nhl/score/${date}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const game = data.games?.find(g => g.id === gameId);
    
    if (!game) {
      return null;
    }
    
    const recaps = {
      threeMinRecap: game.threeMinRecap,
      threeMinRecapFr: game.threeMinRecapFr,
      condensedGame: game.condensedGame,
      condensedGameFr: game.condensedGameFr
    };
    
    cache.set(cacheKey, recaps, CACHE_TTL);
    
    return recaps;
  } catch (error) {
    console.error(`Error fetching recaps for game ${gameId}:`, error);
    return cached || null;
  }
}
