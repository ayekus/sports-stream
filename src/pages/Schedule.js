/**
 * Schedule Page
 * Shows upcoming and live hockey games from Streamed.pk
 */

import { getHockeyMatches, getTeamBadgeUrl } from '../services/streamedApi.js';
import { formatTime } from '../utils/date.js';
import { router } from '../router.js';
import { isNHLTeam, isOlympicGame } from '../services/nhlScoreApi.js';

let currentGames = [];

export async function renderSchedulePage() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        
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
  
  // Check for team query parameter and pre-fill search
  const urlParams = new URLSearchParams(window.location.search);
  const teamParam = urlParams.get('team');
  if (teamParam) {
    const searchInput = document.getElementById('schedule-search');
    if (searchInput) {
      searchInput.value = teamParam;
      // Trigger filter to show games for this team
      applyFilters();
    }
  }
}

async function loadSchedule() {
  const app = document.getElementById('app-content');
  
  try {
    // Get all hockey games for today
    const games = await getHockeyMatches('today');
    
    // Filter out TBA games and non-NHL/non-Olympic games
    const filteredGames = games.filter(game => {
      const homeTeam = game.teams?.home?.name || 'TBA';
      const awayTeam = game.teams?.away?.name || 'TBA';
      
      // Exclude games where both teams are TBA
      if (homeTeam === 'TBA' && awayTeam === 'TBA') {
        return false;
      }
      
      // Check if it's an Olympic/IIHF game (World Juniors, etc.)
      if (isOlympicGame(game.title, game.teams)) {
        console.log(`✅ Including Olympic/IIHF game: ${game.title}`);
        return true;
      }
      
      // Check if both teams are NHL teams
      const homeIsNHL = isNHLTeam(homeTeam);
      const awayIsNHL = isNHLTeam(awayTeam);
      
      if (homeIsNHL && awayIsNHL) {
        console.log(`✅ Including NHL game: ${awayTeam} @ ${homeTeam}`);
        return true;
      }
      
      // Exclude all other games (European leagues, etc.)
      console.log(`❌ Excluding non-NHL/non-Olympic game: ${game.title}`);
      return false;
    });
    
    currentGames = filteredGames;
    
    if (filteredGames.length === 0) {
      renderEmptySchedule();
      return;
    }
    
    renderScheduleUI(filteredGames);
    
  } catch (error) {
    console.error('Error loading schedule:', error);
    
    app.innerHTML = `
      <div class="page">
        <div class="container">
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
          <button id="refresh-stats" class="refresh-stats-btn" title="Refresh live scores">
            🔄 Refresh Stats
          </button>
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
  
  // Group games by date
  const gamesByDate = {};
  games.forEach(game => {
    const gameDate = new Date(game.time);
    const dateKey = gameDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (!gamesByDate[dateKey]) {
      gamesByDate[dateKey] = [];
    }
    gamesByDate[dateKey].push(game);
  });
  
  // Render games grouped by date
  Object.entries(gamesByDate).forEach(([date, gamesForDate]) => {
    // Create date header
    const dateHeader = document.createElement('div');
    dateHeader.className = 'schedule-date-header';
    dateHeader.innerHTML = `
      <h3 class="date-title">${date}</h3>
      <span class="game-count">${gamesForDate.length} game${gamesForDate.length !== 1 ? 's' : ''}</span>
    `;
    list.appendChild(dateHeader);
    
    // Create games container for this date
    const gamesContainer = document.createElement('div');
    gamesContainer.className = 'games-by-date';
    
    gamesForDate.forEach(game => {
      const card = createGameCard(game);
      gamesContainer.appendChild(card);
    });
    
    list.appendChild(gamesContainer);
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
  
  const liveData = game.liveData;
  
  // Format period display
  let periodDisplay = '';
  if (liveData && isLive) {
    const periodMap = {
      'REG': (num) => ['1st', '2nd', '3rd'][num - 1] || `${num}th`,
      'OT': (num) => num > 4 ? `${num - 3}OT` : 'OT',
      'SO': () => 'SO'
    };
    
    const periodText = periodMap[liveData.periodType]?.(liveData.period) || '';
    const time = liveData.timeRemaining || '';
    
    periodDisplay = liveData.inIntermission 
      ? 'Intermission'
      : `${periodText}${time ? ` - ${time}` : ''}`;
  }
  
  card.innerHTML = `
    <div class="game-card-row">
      <div class="game-time-section">
        <span class="time-large">${formatTime(gameTime)}</span>
        ${isLive ? '<span class="live-indicator">●</span>' : ''}
      </div>
      
      <div class="game-divider"></div>
      
      ${liveData ? `
        <!-- Live game with score -->
        <div class="game-matchup-row">
          <div class="team-section">
            ${game.teams?.away?.badge ? `<img src="${getTeamBadgeUrl(game.teams.away.badge)}" alt="${awayTeam}" class="team-logo-inline" onerror="this.style.display='none'" />` : ''}
            <span class="team-name-large">${awayTeam}</span>
          </div>
          
          <div class="score-display-large">
            <span class="score-num">${liveData.score.away}</span>
            <span class="score-sep">-</span>
            <span class="score-num">${liveData.score.home}</span>
          </div>
          
          <div class="team-section team-home">
            <span class="team-name-large">${homeTeam}</span>
            ${game.teams?.home?.badge ? `<img src="${getTeamBadgeUrl(game.teams.home.badge)}" alt="${homeTeam}" class="team-logo-inline" onerror="this.style.display='none'" />` : ''}
          </div>
        </div>
      ` : `
        <!-- Non-live game without score -->
        <div class="game-matchup-row">
          <div class="team-section">
            ${game.teams?.away?.badge ? `<img src="${getTeamBadgeUrl(game.teams.away.badge)}" alt="${awayTeam}" class="team-logo-inline" onerror="this.style.display='none'" />` : ''}
            <span class="team-name-large">${awayTeam}</span>
          </div>
          
          <span class="vs-text">vs</span>
          
          <div class="team-section team-home">
            <span class="team-name-large">${homeTeam}</span>
            ${game.teams?.home?.badge ? `<img src="${getTeamBadgeUrl(game.teams.home.badge)}" alt="${homeTeam}" class="team-logo-inline" onerror="this.style.display='none'" />` : ''}
          </div>
        </div>
      `}
    </div>
  `;
  
  // Make entire card clickable
  card.addEventListener('click', () => {
    router.navigateTo(`/match/${game.id}`);
  });
  
  return card;
}

function setupScheduleHandlers() {
  const filterSelect = document.getElementById('filter-select');
  const searchInput = document.getElementById('schedule-search');
  const refreshButton = document.getElementById('refresh-stats');
  
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
  
  if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
      // Show loading state
      refreshButton.disabled = true;
      refreshButton.innerHTML = '⏳ Loading...';
      
      try {
        // Clear cache
        const { cache } = await import('../utils/cache.js');
        cache.clear();
        
        // Reload schedule with fresh data
        await loadSchedule();
        
        // Success feedback
        refreshButton.innerHTML = '✅ Refreshed!';
        setTimeout(() => {
          if (refreshButton) {
            refreshButton.innerHTML = '🔄 Refresh Stats';
            refreshButton.disabled = false;
          }
        }, 2000);
      } catch (error) {
        console.error('Error refreshing stats:', error);
        refreshButton.innerHTML = '❌ Error';
        setTimeout(() => {
          if (refreshButton) {
            refreshButton.innerHTML = '🔄 Refresh Stats';
            refreshButton.disabled = false;
          }
        }, 2000);
      }
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
