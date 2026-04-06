/**
 * Senators Season Tracker Page
 * Combined season progress and playoff race dashboard
 */

import { getSensStandings, getSensSeasonRecord } from '../services/sensApi.js';
import { getTeamLogoUrl } from '../services/nhlApi.js';
import { router } from '../router.js';

/**
 * Convert number to ordinal (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export async function renderSensSeasonTracker() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="sens-hub-page">
      <div class="sens-hub-container">
        <div class="salary-cap-header">
          <h1 class="countdown-title">📊 Season Tracker</h1>
        </div>
        
        <div class="loading-container">
          <div class="loading"><span></span><span></span><span></span></div>
          <p class="loading-text">Loading season data...</p>
        </div>
      </div>
    </div>
  `;
  
  await loadSeasonData();
}

async function loadSeasonData() {
  const container = document.querySelector('.sens-hub-container');
  
  try {
    const [standings, seasonRecord] = await Promise.all([
      getSensStandings(),
      getSensSeasonRecord()
    ]);
    
    if (!standings || !seasonRecord) {
      throw new Error('Failed to load season data');
    }
    
    renderSeasonTrackerUI(standings, seasonRecord);
    
  } catch (error) {
    console.error('Error loading season data:', error);
    container.innerHTML = `
      <div class="error-message">
        <p>⚠️ Failed to load season tracker. Please try again later.</p>
      </div>
    `;
  }
}

function renderSeasonTrackerUI(standingsData, seasonRecord) {
  const container = document.querySelector('.sens-hub-container');
  
  const totalGames = 82;
  const gamesPlayed = seasonRecord.gamesPlayed || 0;
  const wins = seasonRecord.wins || 0;
  const losses = seasonRecord.losses || 0;
  const otLosses = seasonRecord.otLosses || 0;
  const remaining = totalGames - gamesPlayed;
  
  // Calculate percentages for segmented progress bar
  const winsPercent = (wins / totalGames) * 100;
  const lossesPercent = (losses / totalGames) * 100;
  const otLossesPercent = (otLosses / totalGames) * 100;
  const remainingPercent = (remaining / totalGames) * 100;
  
  // Get all Eastern Conference teams and sort by conference sequence
  const easternTeams = standingsData.standings
    ?.filter(team => team.conferenceName === 'Eastern')
    .sort((a, b) => a.conferenceSequence - b.conferenceSequence) || [];
  
  container.innerHTML = `
    <div class="salary-cap-header">
      <h1 class="countdown-title">📊 Season Tracker</h1>
    </div>
    
    <div class="season-progress-section">
      <h2 style="color: var(--color-sens-gold); margin-bottom: var(--spacing-md); font-size: var(--font-size-xl);">
        Season Progress
      </h2>
      
      <div class="season-progress-stats">
        <span>${wins}W - ${losses}L - ${otLosses}OT (${gamesPlayed}/${totalGames} GP)</span>
        <span>${remaining} Games Remaining</span>
      </div>
      
      <div class="season-progress-bar">
        <div class="season-progress-segment wins" style="width: ${winsPercent}%" title="${wins} Wins">
          ${wins > 0 ? `${wins}W` : ''}
        </div>
        <div class="season-progress-segment ot-losses" style="width: ${otLossesPercent}%" title="${otLosses} OT Losses">
          ${otLosses > 0 ? `${otLosses}OT` : ''}
        </div>
        <div class="season-progress-segment losses" style="width: ${lossesPercent}%" title="${losses} Losses">
          ${losses > 0 ? `${losses}L` : ''}
        </div>
        <div class="season-progress-segment remaining" style="width: ${remainingPercent}%" title="${remaining} Remaining">
          ${remaining > 0 ? `${remaining}` : ''}
        </div>
      </div>
    </div>
    
    <div>
      <h2 style="color: var(--color-sens-gold); margin-bottom: var(--spacing-lg); font-size: var(--font-size-xl);">
        Eastern Conference Standings
      </h2>
      
      <table class="playoff-race-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>GP</th>
            <th>Record</th>
            <th>PTS</th>
            <th>Playoff Status</th>
          </tr>
        </thead>
        <tbody>
          ${easternTeams.map((team, index) => {
            const isSens = team.teamAbbrev?.default === 'OTT';
            const teamName = team.teamName?.default || team.teamAbbrev?.default;
            const record = `${team.wins}-${team.losses}-${team.otLosses}`;
            
            // Determine playoff position
            let positionClass = 'out';
            let positionText = 'Out';
            
            // Top 3 per division make playoffs (8 teams total: 3 ATL + 3 MET)
            if (team.divisionSequence && team.divisionSequence <= 3) {
              positionClass = 'playoff';
              const ordinal = getOrdinal(team.divisionSequence);
              positionText = `${ordinal} ${team.divisionName}`;
            }
            // Next 2 teams are wildcards (conference rank 9-10 typically)
            else if (team.wildcardSequence > 0 && team.wildcardSequence <= 2) {
              positionClass = 'wildcard';
              positionText = `WC${team.wildcardSequence}`;
            }
            
            return `
              <tr class="${isSens ? 'sens-row' : ''}" style="position: relative;">
                <td style="position: relative;">
                  <div class="playoff-position-indicator ${positionClass}"></div>
                  ${team.conferenceSequence}
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                    <img src="${getTeamLogoUrl(team.teamAbbrev?.default)}" 
                         alt="${teamName}" 
                         style="width: 24px; height: 24px;" 
                         onerror="this.style.display='none'" loading="lazy" />
                    <strong>${teamName}</strong>
                  </div>
                </td>
                <td>${team.gamesPlayed}</td>
                <td>${record}</td>
                <td><strong>${team.points}</strong></td>
                <td><span class="playoff-status ${positionClass}">${positionText}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <div style="margin-top: var(--spacing-xl);">
      <div class="quick-stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-label">Current Streak</div>
          <div class="stat-value">${seasonRecord.streakCode || '-'}${seasonRecord.streakCount || 0}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⚖️</div>
          <div class="stat-label">Goal Differential</div>
          <div class="stat-value" style="color: ${seasonRecord.goalDifferential >= 0 ? '#22c55e' : '#ef4444'}">
            ${seasonRecord.goalDifferential >= 0 ? '+' : ''}${seasonRecord.goalDifferential || 0}
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-label">Points</div>
          <div class="stat-value">${seasonRecord.points || 0}</div>
        </div>
      </div>
    </div>
  `;
}
