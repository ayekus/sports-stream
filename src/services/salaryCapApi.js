/**
 * Salary Cap API Service
 * Fetches salary cap and player contract data from our scraper endpoint
 */

const PROXY_BASE = 'http://localhost:3001';

/**
 * Get Ottawa Senators salary cap and player contract data
 * @returns {Promise<Object>} Salary cap data including summary and players
 */
export async function getSenatorsSalaryCap(forceRefresh = false) {
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
    
    // Calculate total cap hit from players
    let totalCapHit = 0;
    data.players.forEach(player => {
      const currentYear = '2025-26'; // Or calculate dynamically
      const salary = player.contractYears?.[currentYear];
      if (salary && salary !== 'UFA' && salary !== 'RFA') {
        const amount = parseFloat(salary.replace(/[$,]/g, ''));
        if (!isNaN(amount)) {
          totalCapHit += amount;
        }
      }
    });
    
    // Enhance summary with calculated values
    const enhancedSummary = {
      ...data.summary,
      capHit: data.summary.capHit || totalCapHit.toString(),
      capSpace: data.summary.capSpace || (96000000 - totalCapHit).toString(), // 2025-26 cap ceiling
      roster: data.summary.roster || { current: forwards.length + defense.length + goalies.length, max: 23 },
      contracts: data.summary.contracts || { current: data.totalPlayers, max: 50 }
    };
    
    return {
      ...data,
      summary: enhancedSummary,
      categorizedPlayers: {
        forwards,
        defense,
        goalies
      }
    };
    
  } catch (error) {
    console.error('Error fetching salary cap data:', error);
    throw error;
  }
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

/**
 * Format large numbers with commas
 */
export function formatNumber(num) {
  if (typeof num === 'string') {
    num = parseFloat(num.replace(/,/g, ''));
  }
  return num.toLocaleString();
}
