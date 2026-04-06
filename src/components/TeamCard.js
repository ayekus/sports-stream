/**
 * TeamCard Component
 * Displays an NHL team card with logo and information
 */

import { logger } from '../utils/logger.js';

// Cache formatter instance — constructing Intl.NumberFormat on every call is expensive
const numberFormatter = new Intl.NumberFormat(undefined);

export function createTeamCard(team) {
  const card = document.createElement('div');
  card.className = 'team-card card';
  
  const logo = team.strBadge || team.strLogo || '';
  const stadium = team.strStadium || 'Unknown';
  const formed = team.intFormedYear || 'N/A';
  card.dataset.teamId = team.idTeam;
  
  card.innerHTML = `
    <div class="team-logo">
      ${logo ? `<img src="${logo}" alt="${team.strTeam}" loading="lazy" />` : `
        <div class="logo-placeholder">🏒</div>
      `}
    </div>
    
    <div class="team-info">
      <h3 class="team-name">${team.strTeam}</h3>
      <p class="team-league text-muted">${team.strLeague || 'NHL'}</p>
      
      <div class="team-details mt-sm">
        <span class="detail-item">
          <strong>Arena:</strong> ${stadium}
        </span>
        <span class="detail-item">
          <strong>Founded:</strong> ${formed}
        </span>
      </div>
    </div>
    
    <button class="team-button" data-team-id="${team.idTeam}">
      View Details
    </button>
  `;
  
  return card;
}

/**
 * Create team detail modal
 * @param {Object} team - Team object
 * @returns {HTMLElement} Modal element
 */
export function createTeamModal(team) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'team-modal';
  
  const logo = team.strBadge || team.strLogo || '';
  const banner = team.strTeamBanner || '';
  const description = team.strDescriptionEN || team.strDescription || 'No description available.';
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeTeamModal()"></div>
    <div class="modal-content">
      <button class="modal-close" onclick="closeTeamModal()">×</button>
      
      ${banner ? `
        <div class="modal-banner">
          <img src="${banner}" alt="${team.strTeam}" loading="lazy" />
        </div>
      ` : ''}
      
      <div class="modal-body">
        <div class="modal-header">
          ${logo ? `<img src="${logo}" alt="${team.strTeam}" class="modal-logo" loading="lazy" />` : ''}
          <div>
            <h2>${team.strTeam}</h2>
            <p class="text-secondary">${team.strLeague || 'NHL'}</p>
          </div>
        </div>
        
        <div class="modal-details">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Arena</span>
              <span class="detail-value">${team.strStadium || 'Unknown'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Founded</span>
              <span class="detail-value">${team.intFormedYear || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Capacity</span>
              <span class="detail-value">${team.intStadiumCapacity ? numberFormatter.format(parseInt(team.intStadiumCapacity)) : 'N/A'}</span>
            </div>
          </div>
          
          <div class="modal-actions mt-lg">
            <button class="view-games-button" data-team-name="${team.strTeam}">
              📅 View Games
            </button>
            ${team.strWebsite ? `
              <a href="https://${team.strTeam === 'Ottawa Senators' ? 'www.nhl.com/senators' : team.strWebsite}" target="_blank" rel="noopener noreferrer" class="team-website">
                🌐 Visit Official Website
              </a>
            ` : ''}
          </div>
          
          <div class="team-stats mt-lg" id="team-stats-${team.idTeam}">
            <h4>Current Season</h4>
            <div class="stats-row" style="display: flex; gap: 12px; flex-wrap: wrap;">
              <div class="loading" style="margin: 0 auto;"></div>
            </div>
          </div>
          
          <div class="team-description mt-lg">
            <h4>About</h4>
            <p>${description.substring(0, 500)}${description.length > 500 ? '...' : ''}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add click handler for View Games button
  setTimeout(() => {
    const viewGamesBtn = modal.querySelector('.view-games-button');
    if (viewGamesBtn) {
      viewGamesBtn.addEventListener('click', () => {
        const teamName = viewGamesBtn.dataset.teamName;
        closeTeamModal();
        // Navigate to schedule with team search
        window.router.navigateTo(`/schedule?team=${encodeURIComponent(teamName)}`);
      });
    }
    
    // Load team stats 
    loadTeamStats(team);
  }, 10);
  
  return modal;
}

/**
 * Load team stats from NHL API (same method as standings page)
 */
async function loadTeamStats(team) {
  const statsContainer = document.getElementById(`team-stats-${team.idTeam}`);
  if (!statsContainer) return;
  
  try {
    // Import NHL API service - use absolute path
    const nhlApi = await import('/src/services/nhlApi.js');
    const standingsData = await nhlApi.getNHLStandings();
    
    // getNHLStandings returns { standings: [...] }
    const standings = standingsData.standings || standingsData;
    
    logger.log('Looking for team:', team.strTeam, 'Short:', team.strTeamShort);
    logger.log('Available teams:', standings.map(t => ({ name: t.teamName?.default, abbrev: t.teamAbbrev?.default })));
    
    // Find team by abbreviation or name matching
    const teamStats = standings.find(t => {
      const abbrev = t.teamAbbrev?.default;
      const name = t.teamName?.default || t.teamCommonName?.default || '';
      
      // Get team abbreviation - try different fields
      const teamShort = team.strTeamShort || team.strTeamBadge?.match(/([A-Z]{2,3})/)?.[1];
      
      // Try matching by abbreviation first (most reliable)
      if (teamShort && abbrev && abbrev.toLowerCase() === teamShort.toLowerCase()) {
        logger.log('Matched by abbrev:', abbrev);
        return true;
      }
      
      // Try matching by team name
      if (name.toLowerCase().includes(team.strTeam.toLowerCase()) ||
          team.strTeam.toLowerCase().includes(name.toLowerCase())) {
        logger.log('Matched by name:', name);
        return true;
      }
      
      // Try matching by last word of team name (e.g., "Senators", "Maple Leafs")
      const teamWords = team.strTeam.toLowerCase().split(' ');
      const lastWord = teamWords[teamWords.length - 1];
      if (name.toLowerCase().includes(lastWord)) {
        logger.log('Matched by last word:', lastWord, 'in', name);
        return true;
      }
      
      return false;
    });
    
    if (!teamStats) {
      logger.error('Team not found in standings:', team.strTeam);
      statsContainer.innerHTML = '<h4>Current Season</h4><p class="text-secondary" style="font-size: 0.9rem;">Stats unavailable</p>';
      return;
    }
    
    logger.log('Found stats for:', teamStats.teamName?.default);
    
    // Display main stats only
    statsContainer.innerHTML = `
      <h4>Current Season</h4>
      <div class="stats-row" style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.9rem;">
        <span style="padding: 6px 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
          <strong>${teamStats.gamesPlayed}</strong> GP
        </span>
        <span style="padding: 6px 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
          <strong>${teamStats.wins}</strong>-<strong>${teamStats.losses}</strong>-<strong>${teamStats.otLosses}</strong>
        </span>
        <span style="padding: 6px 12px; background: var(--color-accent-gradient); border-radius: 6px; font-weight: bold;">
          ${teamStats.points} PTS
        </span>
        <span style="padding: 6px 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
          ${teamStats.goalFor} GF
        </span>
        <span style="padding: 6px 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
          ${teamStats.goalAgainst} GA
        </span>
        <span style="padding: 6px 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
          ${teamStats.goalDifferential > 0 ? '+' : ''}${teamStats.goalDifferential} DIFF
        </span>
      </div>
    `;
  } catch (error) {
    logger.error('Error loading team stats:', error);
    statsContainer.innerHTML = '<h4>Current Season</h4><p class="text-secondary" style="font-size: 0.9rem;">Unable to load stats</p>';
  }
}

/**
 * Close team modal
 */
window.closeTeamModal = function() {
  const modal = document.getElementById('team-modal');
  if (modal) {
    modal.remove();
  }
};
