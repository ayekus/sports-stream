/**
 * Senators Countdown Page
 * Main Fan Hub landing page with countdown to next game
 */

import { getSensNextGame, getSensSeasonRecord, getSensSchedule } from '../services/sensApi.js';
import { createCountdownTimer, formatCountdown, getCountdownMessage } from '../utils/countdown.js';
import { getTeamLogoUrl } from '../services/nhlApi.js';
import { formatTime, formatDateLocal } from '../utils/date.js';
import { router } from '../router.js';
import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

let countdownTimer = null;

/**
 * Get readable playoff position text
 */
function getPlayoffPositionText(record) {
  if (!record) return 'N/A';
  
  // Division rank takes priority (top 3 in each division make playoffs)
  if (record.divisionSequence && record.divisionSequence <= 3) {
    return `${getOrdinal(record.divisionSequence)} in Division`;
  }
  
  // Wildcard position
  if (record.wildcardSequence && record.wildcardSequence > 0) {
    return `Wild Card ${record.wildcardSequence}`;
  }
  
  // Conference position (not in playoffs)
  if (record.conferenceSequence) {
    return `${getOrdinal(record.conferenceSequence)} in Conference`;
  }
  
  return 'N/A';
}

/**
 * Convert number to ordinal (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export async function renderSensCountdown() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="sens-hub-page">
      <div class="sens-hub-container">
        <div class="countdown-header">
          <h1 class="countdown-title">Next Game</h1>
        </div>
        
        <div class="loading-container">
          <div class="loading"><span></span><span></span><span></span></div>
          <p class="loading-text">Loading countdown...</p>
        </div>
      </div>
    </div>
  `;
  
  await loadCountdown();
}

async function loadCountdown() {
  const container = document.querySelector('.sens-hub-container');
  
  try {
    const [nextGame, seasonRecord, upcomingGames] = await Promise.all([
      getSensNextGame(),
      getSensSeasonRecord(),
      getSensSchedule(10) // Get 10 to ensure we have 5 after filtering out current/past games
    ]);
    
    if (!nextGame) {
      // Still try to get season record and schedule for display
      const playoffPos = getPlayoffPositionText(seasonRecord);
      
      container.innerHTML = `
        <div class="countdown-header">
          <h1 class="countdown-title">Senators Fan Hub</h1>
        </div>
        
        <div class="empty-state">
          <div class="empty-state-icon">🏒</div>
          <h2 class="empty-state-title">No Upcoming Games</h2>
          <p>Check back later for the next Senators game!</p>
        </div>
        
        <div class="quick-stats-grid">
          <a href="/sens-hub/salary-cap" data-link class="stat-card" style="text-decoration: none; cursor: pointer;">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <div class="stat-label">Salary Cap</div>
            <div class="stat-value" style="font-size: 0.9rem;">View cap space</div>
          </a>
          
          <a href="/sens-hub/team" data-link class="stat-card" style="text-decoration: none; cursor: pointer;">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <div class="stat-label">Team Info</div>
            <div class="stat-value" style="font-size: 0.9rem;">Roster & injuries</div>
          </a>
          
          <a href="/sens-hub/season" data-link class="stat-card" style="text-decoration: none; cursor: pointer;">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="20" x2="12" y2="10"></line>
              <line x1="18" y1="20" x2="18" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="16"></line>
            </svg>
            <div class="stat-label">Season Tracker</div>
            <div class="stat-value" style="font-size: 0.9rem;">Playoff race</div>
          </a>
          
          ${seasonRecord ? `
            <div class="stat-card">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
              </svg>
              <div class="stat-label">Record</div>
              <div class="stat-value">${seasonRecord.wins || 0}-${seasonRecord.losses || 0}-${seasonRecord.otLosses || 0}</div>
            </div>
            
            <div class="stat-card">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <div class="stat-label">Playoff Position</div>
              <div class="stat-value">${playoffPos}</div>
            </div>
          ` : ''}
        </div>
      `;
      
      // Attach listeners to navigation cards
      document.querySelectorAll('[data-link]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          router.navigateTo(link.getAttribute('href'));
        });
      });
      return;
    }
    
    renderCountdownUI(nextGame, seasonRecord, upcomingGames);
    
    // Start countdown timer
    if (countdownTimer) {
      countdownTimer.stop();
    }
    
    countdownTimer = createCountdownTimer(nextGame.startTimeUTC, (timeRemaining) => {
      updateCountdownDisplay(timeRemaining);
      
      // If game started, navigate to it
      if (timeRemaining.isExpired) {
        // You could navigate to the game stream here
        logger.log('Game time! Countdown expired.');
      }
    });
    
  } catch (error) {
    console.error('Error loading countdown:', error);
    container.innerHTML = `
      <div class="error-message">
        <p>⚠️ Failed to load countdown data. Please try again later.</p>
      </div>
    `;
  }
}

function renderCountdownUI(nextGame, seasonRecord, upcomingGames) {
  const container = document.querySelector('.sens-hub-container');
  
  const isHomeGame = nextGame.homeTeam.abbrev === 'OTT';
  const opponent = isHomeGame ? nextGame.awayTeam : nextGame.homeTeam;
  const sensTeam = isHomeGame ? nextGame.homeTeam : nextGame.awayTeam;
  
  const gameDate = new Date(nextGame.startTimeUTC);
  const now = new Date();
  const isLive = gameDate < now && (nextGame.gameState === 'LIVE' || nextGame.gameState === 'CRIT');
  
  const dateStr = formatDateLocal(gameDate);
  const timeStr = formatTime(gameDate);
  
  // Format next 5 games with correct home/away indicators
  const next5HTML = upcomingGames
    .filter(game => game.id !== nextGame.id)
    .slice(0, 5)
    .map(game => {
      const sensIsHome = game.homeTeam.abbrev === 'OTT';
      const opp = sensIsHome ? game.awayTeam : game.homeTeam;
      const location = sensIsHome ? 'vs' : '@';
      const date = new Date(game.startTimeUTC);
      const dateShort = `${date.getMonth() + 1}/${date.getDate()}`;
      return `${location} ${opp.abbrev} (${dateShort})`;
    }).join(', ');
  
  // Get playoff position text
  const playoffPos = getPlayoffPositionText(seasonRecord);
  
  // Get full team name - combine placeName with commonName for full name
  const opponentPlace = opponent.placeName?.default || '';
  const opponentTeamName = opponent.commonName?.default || opponent.name?.default || opponent.abbrev;
  const opponentFullName = opponentPlace ? `${opponentPlace} ${opponentTeamName}` : opponentTeamName;
  
  // Determine vs or @ based on home/away
  const vsOrAt = isHomeGame ? 'vs' : '@';
  
  container.innerHTML = `
    <div class="countdown-header">
      <h1 class="countdown-title">${isLive ? 'Live Now!' : 'Next Game'}</h1>
    </div>
    
    ${isLive ? `
      <div class="live-game-banner">
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span class="live-text">LIVE NOW</span>
        </div>
        ${nextGame.homeTeam.score !== undefined && nextGame.awayTeam.score !== undefined ? `
          <div class="live-score">
            <span class="team-score">${sensTeam.abbrev} ${sensTeam.score}</span>
            <span class="score-separator">-</span>
            <span class="team-score">${opponent.abbrev} ${opponent.score}</span>
          </div>
        ` : ''}
      </div>
    ` : `
    <div class="countdown-display" id="countdown-display">
      <div class="countdown-unit">
        <span class="countdown-value" id="countdown-days">0</span>
        <span class="countdown-label">Days</span>
      </div>
      <span class="countdown-separator">:</span>
      <div class="countdown-unit">
        <span class="countdown-value" id="countdown-hours">00</span>
        <span class="countdown-label">Hours</span>
      </div>
      <span class="countdown-separator">:</span>
      <div class="countdown-unit">
        <span class="countdown-value" id="countdown-minutes">00</span>
        <span class="countdown-label">Mins</span>
      </div>
      <span class="countdown-separator">:</span>
      <div class="countdown-unit">
        <span class="countdown-value" id="countdown-seconds">00</span>
        <span class="countdown-label">Secs</span>
      </div>
    </div>
    `}
    
    <div class="next-game-card">
      <div class="game-matchup-horizontal">
        <div class="team-logo-side">
          <img src="${getTeamLogoUrl('OTT')}" alt="Ottawa Senators" />
        </div>
        
        <div class="matchup-text">
          <h2 class="matchup-title">Ottawa Senators ${vsOrAt} ${opponentFullName}</h2>
        </div>
        
        <div class="team-logo-side">
          <img src="${getTeamLogoUrl(opponent.abbrev)}" alt="${opponentFullName}" />
        </div>
      </div>
      
      <div class="game-details-info-horizontal">
        <div class="game-detail-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>${dateStr}</span>
        </div>
        <span class="detail-separator">•</span>
        <div class="game-detail-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>${timeStr} ET</span>
        </div>
        <span class="detail-separator">•</span>
        <div class="game-detail-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${nextGame.venue?.default || 'TBD'}</span>
        </div>
      </div>
    </div>
    
    <div class="quick-stats-grid">
      <div class="stat-card">
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
          <path d="M4 22h16"></path>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
        </svg>
        <div class="stat-label">Record</div>
        <div class="stat-value">${seasonRecord?.wins || 0}-${seasonRecord?.losses || 0}-${seasonRecord?.otLosses || 0}</div>
      </div>
      
      <div class="stat-card">
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <div class="stat-label">Playoff Position</div>
        <div class="stat-value">${playoffPos}</div>
      </div>
      
      <div class="stat-card">
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <div class="stat-label">Next 5 Games</div>
        <div class="stat-value" style="font-size: 0.9rem;">${next5HTML}</div>
      </div>
    </div>
  `;
  
  // Attach listeners to navigation cards
  document.querySelectorAll('[data-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigateTo(link.getAttribute('href'));
    });
  });
}

function updateCountdownDisplay(timeRemaining) {
  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minutesEl = document.getElementById('countdown-minutes');
  const secondsEl = document.getElementById('countdown-seconds');
  
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;
  
  const pad = (num) => String(num).padStart(2, '0');
  
  daysEl.textContent = timeRemaining.days;
  hoursEl.textContent = pad(timeRemaining.hours);
  minutesEl.textContent = pad(timeRemaining.minutes);
  secondsEl.textContent = pad(timeRemaining.seconds);
}

// Clean up timer when leaving page
export function cleanupSensCountdown() {
  if (countdownTimer) {
    countdownTimer.stop();
    countdownTimer = null;
  }
}
