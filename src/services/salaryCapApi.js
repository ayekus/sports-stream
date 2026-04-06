/**
 * Salary Cap API Service
 * Fetches salary cap and player contract data from our scraper endpoint
 */

import { cache } from '../utils/cache.js';

const PROXY_BASE = 'http://localhost:3001';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Track pending requests to avoid duplicate fetches
const pendingRequests = new Map();

/**
 * Get Ottawa Senators salary cap and player contract data
 * @returns {Promise<Object>} Salary cap data including summary and players
 */
export async function getSenatorsSalaryCap(forceRefresh = false) {
  const cacheKey = 'senators_salary_cap';

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  // Request key to differentiate between refresh and normal requests
  // Normal requests can share a promise, forced refreshes should be distinct or handled carefully
  // If forceRefresh is true, we always want to fetch. But if multiple forceRefreshes happen, they can coalesce.
  const requestKey = `senators_salary_cap_${forceRefresh}`;

  // Check for pending request to avoid race conditions
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const url = forceRefresh
        ? `${PROXY_BASE}/api/salary-cap/senators?refresh=true`
        : `${PROXY_BASE}/api/salary-cap/senators`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch salary cap data: ${response.statusText}`);
      }

      const data = await response.json();

      // Categorize players by position for easier display
      const forwards = [];
      const defense = [];
      const goalies = [];

      data.players.forEach(player => {
        const pos = player.position || '';

        if (pos.includes('G')) {
          goalies.push(player);
        } else if (pos.includes('D') || pos === 'LD' || pos === 'RD') {
          defense.push(player);
        } else {
          forwards.push(player);
        }
      });

      // ⚡ Bolt Performance Optimization: Pre-compute and cache parsed numeric values
      // during the initial fetch to avoid redundant O(N log N) regex and parseFloat
      // executions during frequent frontend sorting and filtering operations.
      let totalCapHit = 0;
      data.players.forEach(player => {
        const currentYear = '2025-26'; // Or calculate dynamically
        const salary = player.contractYears?.[currentYear];

        player._parsedSalary = 0;
        if (salary && salary !== 'UFA' && salary !== 'RFA') {
          const amount = parseFloat(salary.replace(/[$,]/g, ''));
          if (!isNaN(amount)) {
            totalCapHit += amount;
            player._parsedSalary = amount;
          }
        }

        const yearsMatch = player.yearsRemaining?.match(/\d+/);
        player._parsedYears = yearsMatch ? parseInt(yearsMatch[0]) : null;
      });

      // Enhance summary with calculated values
      const enhancedSummary = {
        ...data.summary,
        capHit: data.summary.capHit || totalCapHit.toString(),
        capSpace: data.summary.capSpace || (96000000 - totalCapHit).toString(), // 2025-26 cap ceiling
        roster: data.summary.roster || { current: forwards.length + defense.length + goalies.length, max: 23 },
        contracts: data.summary.contracts || { current: data.totalPlayers, max: 50 }
      };

      const result = {
        ...data,
        summary: enhancedSummary,
        categorizedPlayers: {
          forwards,
          defense,
          goalies
        }
      };

      // Cache the result
      cache.set(cacheKey, result, CACHE_DURATION);

      return result;

    } catch (error) {
      console.error('Error fetching salary cap data:', error);
      // If error, try to return cached data even if expired or not forced?
      // For now, rethrow or return null.
      // If forceRefresh failed, maybe return old cache if exists?
      if (forceRefresh) {
         const oldCache = cache.get(cacheKey);
         if (oldCache) return oldCache;
      }
      throw error;
    } finally {
      // Clean up pending request
      pendingRequests.delete(requestKey);
    }
  })();

  // Store promise
  pendingRequests.set(requestKey, promise);

  return promise;
}

/**
 * Format salary value for display
 * @param {string} salary - Raw salary string like "$8,350,000"
 * @returns {string} Formatted salary
 */
export function formatSalary(salary) {
  if (!salary || salary === 'UFA' || salary === 'RFA' || salary === '') {
    return salary || '-';
  }
  
  const amount = parseFloat(salary.replace(/[$,]/g, ''));
  if (isNaN(amount)) return salary;
  
  return `$${(amount / 1000000).toFixed(2)}M`;
}

// Cached formatter — constructing Intl.NumberFormat on each call has overhead
const _numberFormatter = new Intl.NumberFormat(undefined);

/**
 * Format large numbers with commas
 */
export function formatNumber(num) {
  if (typeof num === 'string') {
    num = parseFloat(num.replace(/,/g, ''));
  }
  return _numberFormatter.format(num);
}
