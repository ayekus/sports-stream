/**
 * Senators Injury Report API Service
 * Fetches current injury information
 * 
 * NOTE: This uses mock data for now. In production, you would:
 * 1. Sign up for RapidAPI NHL API (free tier available)
 * 2. Add API key to .env file
 * 3. Replace mock data with actual API calls to /injuries endpoint
 */

import { cache } from '../utils/cache.js';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get current team injuries
 * @returns {Promise<Array>} Array of injured players
 */
export async function getTeamInjuries() {
  const cacheKey = 'sens_injuries';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // TODO: Replace with actual API call
    // const response = await fetch('https://nhl-api.p.rapidapi.com/injuries', {
    //   headers: {
    //     'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    //     'X-RapidAPI-Host': 'nhl-api.p.rapidapi.com'
    //   }
    // });
    // const data = await response.json();
    // Filter for Ottawa Senators
    
    // Mock data for development
    const mockInjuries = [
      {
        id: 1,
        playerId: 4,
        playerName: 'Josh Norris',
        position: 'C',
        jerseyNumber: 9,
        injury: 'Upper Body',
        status: 'Day-to-Day',
        estimatedReturn: '2-3 weeks',
        dateInjured: '2026-01-28',
        lastUpdate: '2026-02-01'
      },
      {
        id: 2,
        playerId: 6,
        playerName: 'Thomas Chabot',
        position: 'D',
        jerseyNumber: 72,
        injury: 'Lower Body',
        status: 'Out',
        estimatedReturn: '4-6 weeks',
        dateInjured: '2026-01-15',
        lastUpdate: '2026-02-01'
      },
      {
        id: 3,
        playerId: 9,
        playerName: 'Ridly Greig',
        position: 'C',
        jerseyNumber: 37,
        injury: 'Knee',
        status: 'IR',
        estimatedReturn: 'Indefinite',
        dateInjured: '2026-01-10',
        lastUpdate: '2026-02-01'
      },
      {
        id: 4,
        playerId: 11,
        playerName: 'Joonas Korpisalo',
        position: 'G',
        jerseyNumber: 70,
        injury: 'Groin',
        status: 'Probable',
        estimatedReturn: 'Game Time Decision',
        dateInjured: '2026-02-02',
        lastUpdate: '2026-02-03'
      }
    ];
    
    cache.set(cacheKey, mockInjuries, CACHE_DURATION);
    return mockInjuries;
  } catch (error) {
    console.error('Error fetching injury data:', error);
    return [];
  }
}

/**
 * Get injury summary statistics
 * @returns {Promise<Object>} Summary of injuries by status
 */
export async function getInjurySummary() {
  const injuries = await getTeamInjuries();
  if (!injuries || injuries.length === 0) {
    return {
      total: 0,
      dayToDay: 0,
      out: 0,
      ir: 0,
      probable: 0
    };
  }
  
  // ⚡ Bolt Performance Optimization: Replace multiple .filter().length calls (O(4N))
  // with a single-pass O(N) loop to eliminate redundant array allocations and iterations.
  const summary = {
    total: injuries.length,
    dayToDay: 0,
    out: 0,
    ir: 0,
    probable: 0
  };

  for (const injury of injuries) {
    if (injury.status === 'Day-to-Day') summary.dayToDay++;
    else if (injury.status === 'Out') summary.out++;
    else if (injury.status === 'IR') summary.ir++;
    else if (injury.status === 'Probable') summary.probable++;
  }
  
  return summary;
}

/**
 * Get detailed injury info for a specific player
 * @param {number} playerId - Player ID
 * @returns {Promise<Object|null>} Injury details or null
 */
export async function getPlayerInjury(playerId) {
  const injuries = await getTeamInjuries();
  return injuries?.find(injury => injury.playerId === playerId) || null;
}
