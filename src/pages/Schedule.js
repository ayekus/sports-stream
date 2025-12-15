/**
 * Schedule Page
 * Shows upcoming and live hockey games from Streamed.pk
 */

import { getHockeyMatches, getTeamBadgeUrl } from '../services/streamedApi.js';
import { formatTime, formatDate } from '../utils/date.js';
import { router } from '../router.js';

let currentGames = [];

export async function renderSchedulePage() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Game Schedule</h1>
          <p class="page-subtitle">Live and upcoming hockey matches</p>
        </div>
        
        <div class="schedule-controls mb-lg">
          <select id="filter-select" class="sort-select">
            <option value="all">All Games</option>
            <option value="live">Live Only</option>
            <option value="upcoming">Upcoming Only</option>
          </select>
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
  
  await loadSchedule();
  setupScheduleHandlers();
}

async function loadSchedule() {
  const app = document.getElementById('app-content');
  
  try {
    // Get all hockey games for today
    const games = await getHockeyMatches('today');
    currentGames = games;
    
    if (games.length === 0) {
      renderEmptySchedule();
      return;
    }
    
    renderScheduleUI(games);
    
  } catch (error) {
    console.error('Error loading schedule:', error);
    
    app.innerHTML = `
      <div class="page">
        <div class="container">
          <div class="page-header">
            <h1 class="page-title">Game Schedule</h1>
            <p class="page-subtitle">Live and upcoming hockey matches</p>
          </div>
          
          <div class="schedule-controls mb-lg">
            <select id="filter-select" class="sort-select">
              <option value="all">All Games</option>
              <option value="live">Live Only</option>
              <option value="upcoming">Upcoming Only</option>
            </select>
            <input 
              type="text" 
              id="schedule-search" 
              placeholder="Search teams..." 
              class="search-input"
            />
          </div>
          
          <div class="error-message">
            <p>⚠️ Failed to load schedule. Please try again later.</p>
          </div>
        </div>
      </div>
    `;
    setupScheduleHandlers();
  }
}

function renderEmptySchedule() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Game Schedule</h1>
          <p class="page-subtitle">Live and upcoming hockey matches</p>
        </div>
        
        <div class="schedule-controls mb-lg">
          <select id="filter-select" class="sort-select">
            <option value="all">All Games</option>
            <option value="live">Live Only</option>
            <option value="upcoming">Upcoming Only</option>
          </select>
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
          <p>There are no hockey games scheduled for today.</p>
        </div>
      </div>
    </div>
  `;
  
  setupScheduleHandlers();
}

function renderScheduleUI(games) {
  const app = document.getElementById('app-content');
  
  const liveGames = games.filter(g => g.status === 'live');
  const upcomingGames = games.filter(g => g.status === 'upcoming');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Game Schedule</h1>
          <p class="page-subtitle">${games.length} game${games.length !== 1 ? 's' : ''} today</p>
        </div>
        
        <div class="schedule-controls mb-lg">
          <select id="filter-select" class="sort-select">
            <option value="all">All Games (${games.length})</option>
            <option value="live">Live Only (${liveGames.length})</option>
            <option value="upcoming">Upcoming Only (${upcomingGames.length})</option>
          </select>
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
  
  if (games.length === 0) {
    list.innerHTML = '<p class="text-center text-secondary">No games match your filter.</p>';
    return;
  }
  
  games.forEach(game => {
    const card = createGameCard(game);
    list.appendChild(card);
  });
}

function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card card';
  
  const gameTime = new Date(game.time);
  const isLive = game.status === 'live';
  
  // Extract team names from title or use teams object
  let homeTeam = 'TBA';
  let awayTeam = 'TBA';
  
  if (game.teams) {
    homeTeam = game.teams.home?.name || 'TBA';
    awayTeam = game.teams.away?.name || 'TBA';
  }
  
  card.innerHTML = `
    <div class="game-time">
      <span class="time">${formatTime(gameTime)}</span>
      ${isLive ? '<span class="badge live">Live</span>' : ''}
    </div>
    
    <div class="game-teams">
      <div class="team">
        ${game.teams?.away?.badge ? `<img src="${getTeamBadgeUrl(game.teams.away.badge)}" alt="${awayTeam}" class="team-logo-small" onerror="this.style.display='none'" />` : ''}
        <span class="team-name">${awayTeam}</span>
      </div>
      
      <div class="game-vs">VS</div>
      
      <div class="team">
        ${game.teams?.home?.badge ? `<img src="${getTeamBadgeUrl(game.teams.home.badge)}" alt="${homeTeam}" class="team-logo-small" onerror="this.style.display='none'" />` : ''}
        <span class="team-name">${homeTeam}</span>
      </div>
    </div>
    
    <div class="game-status">
      <span class="status-text">${game.status === 'live' ? 'Live Now' : game.status === 'upcoming' ? 'Upcoming' : 'Finished'}</span>
      <span class="league-name text-muted">${game.league || 'Hockey'}</span>
      <button class="watch-button-small mt-sm" data-game-id="${game.id}">
        ${isLive ? '🔴 Watch' : 'View Streams'}
      </button>
    </div>
  `;
  
  // Add click handler for watch button
  const button = card.querySelector('.watch-button-small');
  button.addEventListener('click', () => {
    router.navigateTo(`/match/${game.id}`);
  });
  
  return card;
}

function setupScheduleHandlers() {
  const filterSelect = document.getElementById('filter-select');
  const searchInput = document.getElementById('schedule-search');
  
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      applyFilters();
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      applyFilters();
    });
  }
}

function applyFilters() {
  const filterSelect = document.getElementById('filter-select');
  const searchInput = document.getElementById('schedule-search');
  
  let filtered = [...currentGames];
  
  // Apply status filter
  if (filterSelect) {
    const filterValue = filterSelect.value;
    if (filterValue === 'live') {
      filtered = filtered.filter(g => g.status === 'live');
    } else if (filterValue === 'upcoming') {
      filtered = filtered.filter(g => g.status === 'upcoming');
    }
  }
  
  // Apply search filter
  if (searchInput) {
    const query = searchInput.value.toLowerCase();
    if (query) {
      filtered = filtered.filter(game => {
        const homeTeam = game.teams?.home?.name?.toLowerCase() || '';
        const awayTeam = game.teams?.away?.name?.toLowerCase() || '';
        const title = game.title?.toLowerCase() || '';
        
        return homeTeam.includes(query) || 
               awayTeam.includes(query) || 
               title.includes(query);
      });
    }
  }
  
  renderGameCards(filtered);
}
