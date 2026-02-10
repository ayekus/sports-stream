/**
 * Senators Injury Report Page
 * Shows current team injuries with status and return estimates
 */

import { getTeamInjuries, getInjurySummary } from '../services/sensInjuryApi.js';
import { router } from '../router.js';

export async function renderSensInjuries() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="sens-hub-page">
      <div class="sens-hub-container">
        <div class="salary-cap-header">
          <h1 class="countdown-title">🏥 Injury Report</h1>
        </div>
        
        <div class="loading-container">
          <div class="loading"><span></span><span></span><span></span></div>
          <p class="loading-text">Loading injury report...</p>
        </div>
      </div>
    </div>
  `;
  
  await loadInjuryData();
}

async function loadInjuryData() {
  const container = document.querySelector('.sens-hub-container');
  
  try {
    const [injuries, summary] = await Promise.all([
      getTeamInjuries(),
      getInjurySummary()
    ]);
    
    renderInjuryUI(injuries, summary);
    
  } catch (error) {
    console.error('Error loading injury data:', error);
    container.innerHTML = `
      <div class="error-message">
        <p>⚠️ Failed to load injury report. Please try again later.</p>
      </div>
    `;
  }
}

function renderInjuryUI(injuries, summary) {
  const container = document.querySelector('.sens-hub-container');
  
  if (!injuries || injuries.length === 0) {
    container.innerHTML = `
      <div class="salary-cap-header">
        <h1 class="countdown-title">🏥 Injury Report</h1>
      </div>
      
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h2 class="empty-state-title">No Injuries Reported</h2>
        <p>The team is healthy and ready to play!</p>
      </div>
    `;
    return;
  }
  
  const getStatusClass = (status) => {
    return status.toLowerCase().replace(/\s+/g, '-');
  };
  
  container.innerHTML = `
    <div class="salary-cap-header">
      <h1 class="countdown-title">🏥 Injury Report</h1>
    </div>
    
    <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: var(--radius-md); padding: var(--spacing-md); margin-bottom: var(--spacing-xl); color: #fcd34d;">
      <strong>ℹ️ Note:</strong> Detailed injury data is not available through the NHL API. The data shown below is placeholder information for demonstration purposes.
    </div>
    
    <div class="injury-report-list">
      ${injuries.map(injury => `
        <div class="injury-card">
          <div class="injury-player-avatar">
            ${injury.jerseyNumber ? `#${injury.jerseyNumber}` : '🏒'}
          </div>
          
          <div class="injury-player-info">
            <div class="injury-player-name">${injury.playerName}</div>
            <div class="injury-player-position">${injury.position}</div>
          </div>
          
          <div class="injury-details">
            <div class="injury-type">
              <span>${injury.injury}</span>
            </div>
            
            <span class="injury-status ${getStatusClass(injury.status)}">
              ${injury.status}
            </span>
            
            <div class="injury-return">
              ${injury.estimatedReturn}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="injury-summary">
      <strong>${summary.total} Player${summary.total !== 1 ? 's' : ''} Injured</strong>
      ${summary.dayToDay > 0 ? ` • ${summary.dayToDay} Day-to-Day` : ''}
      ${summary.out > 0 ? ` • ${summary.out} Out` : ''}
      ${summary.ir > 0 ? ` • ${summary.ir} IR` : ''}
      ${summary.probable > 0 ? ` • ${summary.probable} Probable` : ''}
    </div>
  `;
}
