/**
 * Schedule Page
 * Calendar view of upcoming NHL games
 */

import { getGamesByDate } from '../services/hockeyApi.js';
import { toAPIDate, formatDate, formatTime } from '../utils/date.js';
import { searchTeam } from '../services/sportsDbApi.js';

let currentGames = [];

export async function renderSchedulePage() {
  const app = document.getElementById('app-content');
  
  const today = new Date();
  const todayStr = toAPIDate(today);
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Game Schedule</h1>
          <p class="page-subtitle">NHL games and fixtures</p>
        </div>
        
        <div class="schedule-controls mb-lg">
          <input 
            type="date" 
            id="date-picker" 
            value="${todayStr}"
            class="date-picker"
          />
          <input 
            type="text" 
            id="schedule-search" 
            placeholder="Search teams..." 
            class="search-input"
          />
        </div>
        
        <div class="loading-container">
          <div class="loading"></div>
          <p class="loading-text">Loading schedule...</p>
        </div>
      </div>
    </div>
  `;
  
  await loadSchedule(todayStr);
  setupScheduleHandlers();
}

async function loadSchedule(date) {
  const app = document.getElementById('app-content');
  
  try {
    const games = await getGamesByDate(date);
    currentGames = games;
    
    if (games.length === 0) {
      renderEmptySchedule(date);
      return;
    }
    
    renderScheduleUI(games, date);
    
  } catch (error) {
    console.error('Error loading schedule:', error);
    
    app.innerHTML = `
      <div class="page">
        <div class="container">
          <div class="page-header">
            <h1 class="page-title">Game Schedule</h1>
            <p class="page-subtitle">NHL games and fixtures</p>
          </div>
          
          <div class="schedule-controls mb-lg">
            <input 
              type="date" 
              id="date-picker" 
              value="${date}"
              class="date-picker"
            />
            <input 
              type="text" 
              id="schedule-search" 
              placeholder="Search teams..." 
              class="search-input"
            />
          </div>
          
          <div class="error-message">
            <p>⚠️ Failed to load schedule. ${!import.meta.env.VITE_API_SPORTS_KEY ? 'API key not configured.' : 'Please try again later.'}</p>
            ${!import.meta.env.VITE_API_SPORTS_KEY ? `
              <p class="mt-md text-secondary">Configure your API-Sports key in Settings to enable this feature.</p>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

function renderEmptySchedule(date) {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Game Schedule</h1>
          <p class="page-subtitle">NHL games and fixtures</p>
        </div>
        
        <div class="schedule-controls mb-lg">
          <input 
            type="date" 
            id="date-picker" 
            value="${date}"
            class="date-picker"
          />
          <input 
            type="text" 
            id="schedule-search" 
            placeholder="Search teams..." 
            class="search-input"
          />
        </div>
        
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h2 class="empty-state-title">No Games Scheduled</h2>
          <p>There are no NHL games scheduled for ${formatDate(new Date(date))}.</p>
        </div>
      </div>
    </div>
  `;
  
  setupScheduleHandlers();
}

function renderScheduleUI(games, date) {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Game Schedule</h1>
          <p class="page-subtitle">${games.length} game${games.length !== 1 ? 's' : ''} on ${formatDate(new Date(date))}</p>
        </div>
        
        <div class="schedule-controls mb-lg">
          <input 
            type="date" 
            id="date-picker" 
            value="${date}"
            class="date-picker"
          />
          <input 
            type="text" 
            id="schedule-search" 
            placeholder="Search teams..." 
            class="search-input"
          />
        </div>
        
        <div class="schedule-list" id="schedule-list"></div>
      </div>
    </div>
  `;
  
  renderGameCards(games);
}

function renderGameCards(games) {
  const list = document.getElementById('schedule-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  games.forEach(game => {
    const card = createGameCard(game);
    list.appendChild(card);
  });
}

function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card card';
  
  const gameTime = new Date(game.timestamp * 1000);
  const status = game.status?.short || 'NS';
  const isLive = status === '1P' || status === '2P' || status === '3P' || status === 'OT';
  
  card.innerHTML = `
    <div class="game-time">
      <span class="time">${formatTime(gameTime)}</span>
      ${isLive ? '<span class="badge live">Live</span>' : ''}
    </div>
    
    <div class="game-teams">
      <div class="team">
        ${game.teams?.away?.logo ? `<img src="${game.teams.away.logo}" alt="${game.teams.away.name}" class="team-logo-small" />` : ''}
        <span class="team-name">${game.teams?.away?.name || 'TBA'}</span>
        ${game.scores?.away !== null ? `<span class="team-score">${game.scores.away}</span>` : ''}
      </div>
      
      <div class="game-vs">VS</div>
      
      <div class="team">
        ${game.teams?.home?.logo ? `<img src="${game.teams.home.logo}" alt="${game.teams.home.name}" class="team-logo-small" />` : ''}
        <span class="team-name">${game.teams?.home?.name || 'TBA'}</span>
        ${game.scores?.home !== null ? `<span class="team-score">${game.scores.home}</span>` : ''}
      </div>
    </div>
    
    <div class="game-status">
      <span class="status-text">${game.status?.long || 'Not Started'}</span>
      ${game.league?.name ? `<span class="league-name text-muted">${game.league.name}</span>` : ''}
    </div>
  `;
  
  return card;
}

function setupScheduleHandlers() {
  const datePicker = document.getElementById('date-picker');
  const searchInput = document.getElementById('schedule-search');
  
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      loadSchedule(e.target.value);
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = currentGames.filter(game =>
        game.teams?.home?.name?.toLowerCase().includes(query) ||
        game.teams?.away?.name?.toLowerCase().includes(query)
      );
      renderGameCards(filtered);
    });
  }
}
