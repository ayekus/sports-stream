/**
 * Senators Team Info Page
 * Shows comprehensive team information including roster, injuries, leaders, and stats
 */

import { getSensRoster, getTeamInjuries, getSensLeaders, getSensTeamStats } from '../services/espnApi.js';
import { router } from '../router.js';
import { openPlayerModal, destroyPlayerModal } from '../components/PlayerModal.js';

export async function renderSensTeamInfo() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="sens-hub-page">
      <div class="sens-hub-container">
        <div class="salary-cap-header">
          <h1 class="countdown-title">👥 Team Info</h1>
        </div>
        
        <div class="loading-container">
          <div class="loading"><span></span><span></span><span></span></div>
          <p class="loading-text">Loading team information...</p>
        </div>
      </div>
    </div>
  `;
  
  await loadTeamInfo();
}

async function loadTeamInfo() {
  const container = document.querySelector('.sens-hub-container');
  
  try {
    const [roster, injuries, leaders, stats] = await Promise.all([
      getSensRoster(),
      getTeamInjuries(),
      getSensLeaders(),
      getSensTeamStats()
    ]);
    
    renderTeamInfoUI(roster, injuries, leaders, stats);
    
  } catch (error) {
    console.error('Error loading team info:', error);
    container.innerHTML = `
      <div class="error-message">
        <p>⚠️ Failed to load team information. Please try again later.</p>
      </div>
    `;
  }
}

function renderTeamInfoUI(roster, injuries, leaders, stats) {
  const container = document.querySelector('.sens-hub-container');
  
  container.innerHTML = `
    <div class="salary-cap-header">
      <h1 class="countdown-title">👥 Team Info</h1>
    </div>
    
    <!-- Tab Navigation (without Leaders) -->
    <div class="team-info-tabs">
      <button class="team-info-tab active" data-tab="roster">
        <span class="tab-icon">🏒</span>
        <span>Roster</span>
      </button>
      <button class="team-info-tab" data-tab="injuries">
        <span class="tab-icon">🏥</span>
        <span>Injuries</span>
        ${injuries.length > 0 ? `<span class="tab-badge">${injuries.length}</span>` : ''}
      </button>
      <button class="team-info-tab" data-tab="highlights">
        <span class="tab-icon">⭐</span>
        <span>Team Highlights</span>
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="team-info-content">
      ${renderRosterTab(roster)}
      ${renderInjuriesTab(injuries)}
      ${renderHighlightsTab(stats)}
    </div>
  `;
  
  // Add tab switching functionality
  setupTabSwitching();
  
  // Add roster card click handlers
  setupRosterClickHandlers(roster);
}

/**
 * Setup click handlers for roster cards
 */
function setupRosterClickHandlers(roster) {
  const allPlayers = roster.flatMap(group => group.items || []);
  const rosterCards = document.querySelectorAll('.roster-card');
  
  rosterCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const playerIndex = parseInt(card.dataset.playerIndex);
      const player = allPlayers[playerIndex];
      
      if (player) {
        openPlayerModal(player, playerIndex, allPlayers);
      }
    });
  });
}

/**
 * Cleanup function for route changes
 * Called automatically by router when navigating away
 */
export function cleanupSensTeamInfo() {
  destroyPlayerModal();
}

function renderRosterTab(roster) {
  if (!roster || roster.length === 0) {
    return `
      <div class="team-info-tab-pane active" data-tab-content="roster">
        <div class="empty-state">
          <p>No roster data available</p>
        </div>
      </div>
    `;
  }
  
  // Flatten the roster data for easier navigation
  const allPlayers = roster.flatMap(group => group.items || []);
  
  return `
    <div class="team-info-tab-pane active" data-tab-content="roster">
      ${roster.map(group => `
        <div class="roster-group">
          <h2 class="roster-group-title">${group.position || 'Players'}</h2>
          <div class="roster-grid">
            ${(group.items || []).map(player => {
              const hasInjury = player.injuries && player.injuries.length > 0;
              const playerIndex = allPlayers.findIndex(p => p.id === player.id);
              
              return `
                <button class="roster-card" data-player-id="${player.id}" data-player-index="${playerIndex}">
                  <div class="roster-player-header">
                    ${player.headshot?.href ? 
                      `<img src="${player.headshot.href}" alt="${player.displayName}" class="roster-player-img" />` :
                      `<div class="roster-player-avatar">${player.jersey || '?'}</div>`
                    }
                    <div class="roster-player-info">
                      <div class="roster-player-name">${player.displayName || player.fullName}</div>
                      <div class="roster-player-position">
                        ${player.position?.abbreviation || 'N/A'}
                        ${player.jersey ? ` • #${player.jersey}` : ''}
                      </div>
                    </div>
                  </div>
                  ${hasInjury ? 
                    `<div class="roster-player-status injury">${player.injuries[0].status}</div>` : ''
                  }
                  <div class="roster-card-hover-text">Click to view info →</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderInjuriesTab(injuries) {
  if (!injuries || injuries.length === 0) {
    return `
      <div class="team-info-tab-pane" data-tab-content="injuries">
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h2 class="empty-state-title">No Injuries Reported</h2>
          <p>The team is healthy and ready to play!</p>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="team-info-tab-pane" data-tab-content="injuries">
      <div class="injury-report-list">
        ${injuries.map(injury => `
          <div class="injury-card">
            ${injury.headshot ? 
              `<img src="${injury.headshot}" alt="${injury.name}" class="injury-player-img" />` :
              `<div class="injury-player-avatar">${injury.jerseyNumber || '🏒'}</div>`
            }
            
            <div class="injury-player-info">
              <div class="injury-player-name">${injury.name}</div>
              <div class="injury-player-position">${injury.position}${injury.jerseyNumber ? ` • #${injury.jerseyNumber}` : ''}</div>
            </div>
            
            <div class="injury-details">
              <div class="injury-type">
                <span>${injury.injury}</span>
              </div>
              <span class="injury-status ${injury.status.toLowerCase().replace(/\s+/g, '-')}">
                ${injury.status}
              </span>
              ${injury.description ? `<div class="injury-return">${injury.description}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderHighlightsTab(stats) {
  // Extract key stats from the ESPN response
  const categories = stats?.results?.stats?.categories || [];
  
  if (categories.length === 0) {
    return `
      <div class="team-info-tab-pane" data-tab-content="highlights">
        <div class="empty-state">
          <p>No team highlights available</p>
        </div>
      </div>
    `;
  }
  
  // Helper function to get stat value
  const getStat = (categoryName, statName) => {
    const category = categories.find(cat => cat.name === categoryName);
    const stat = category?.stats.find(s => s.name === statName);
    return stat?.displayValue || stat?.value || 'N/A';
  };
  
  return `
    <div class="team-info-tab-pane" data-tab-content="highlights">
      <div class="team-stats-grid">
        <!-- Record Card -->
        <div class="team-stat-card">
          <div class="team-stat-icon">🏆</div>
          <h3 class="team-stat-title">Team Record</h3>
          <div class="team-stat-value">${getStat('general', 'wins')}-${getStat('general', 'losses')}-${getStat('general', 'otLosses')}</div>
          <div class="team-stat-label">W-L-OTL</div>
        </div>
        
        <!-- Goals For -->
        <div class="team-stat-card">
          <div class="team-stat-icon">🎯</div>
          <h3 class="team-stat-title">Goals Scored</h3>
          <div class="team-stat-value">${getStat('offensive', 'goals')}</div>
          <div class="team-stat-label">${getStat('offensive', 'goals') / getStat('general', 'games')} per game</div>
        </div>
        
        <!-- Shooting % -->
        <div class="team-stat-card">
          <div class="team-stat-icon">📊</div>
          <h3 class="team-stat-title">Shooting %</h3>
          <div class="team-stat-value">${getStat('offensive', 'shootingPct')}%</div>
          <div class="team-stat-label">${getStat('offensive', 'shotsTotal')} total shots</div>
        </div>
        
        <!-- Power Play -->
        <div class="team-stat-card">
          <div class="team-stat-icon">⚡</div>
          <h3 class="team-stat-title">Power Play</h3>
          <div class="team-stat-value">${getStat('offensive', 'powerPlayGoals')} PPG</div>
          <div class="team-stat-label">${getStat('offensive', 'powerPlayAssists')} assists</div>
        </div>
        
        <!-- Save % -->
        <div class="team-stat-card">
          <div class="team-stat-icon">🥅</div>
          <h3 class="team-stat-title">Save %</h3>
          <div class="team-stat-value">${getStat('defensive', 'savePct')}</div>
          <div class="team-stat-label">${getStat('defensive', 'saves')} total saves</div>
        </div>
        
        <!-- Goals Against Avg -->
        <div class="team-stat-card">
          <div class="team-stat-icon">🛡️</div>
          <h3 class="team-stat-title">Goals Against Avg</h3>
          <div class="team-stat-value">${getStat('defensive', 'avgGoalsAgainst')}</div>
          <div class="team-stat-label">Per game</div>
        </div>
        
        <!-- Faceoff % -->
        <div class="team-stat-card">
          <div class="team-stat-icon">🏒</div>
          <h3 class="team-stat-title">Faceoff Win %</h3>
          <div class="team-stat-value">${getStat('offensive', 'faceoffPercent')}%</div>
          <div class="team-stat-label">${getStat('offensive', 'faceoffsWon')} FO wins</div>
        </div>
        
        <!-- Penalty Minutes -->
        <div class="team-stat-card">
          <div class="team-stat-icon">⏱️</div>
          <h3 class="team-stat-title">Penalty Minutes</h3>
          <div class="team-stat-value">${getStat('penalties', 'penaltyMinutes')}</div>
          <div class="team-stat-label">Total PIM</div>
        </div>
      </div>
    </div>
  `;
}

function setupTabSwitching() {
  const tabs = document.querySelectorAll('.team-info-tab');
  const panes = document.querySelectorAll('.team-info-tab-pane');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Remove active class from all tabs and panes
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding pane
      tab.classList.add('active');
      document.querySelector(`[data-tab-content="${targetTab}"]`)?.classList.add('active');
    });
  });
}
