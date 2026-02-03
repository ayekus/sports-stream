/**
 * Teams Page
 * Browse NHL teams with logos and information
 */

import { getAllNHLTeams } from '../services/sportsDbApi.js';
import { createTeamCard, createTeamModal } from '../components/TeamCard.js';
import { debounce } from '../utils/helpers.js';

let allTeams = [];

export async function renderTeamsPage() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        
        <div class="teams-controls mb-lg">
          <input 
            type="text" 
            id="team-search" 
            placeholder="Search teams..." 
            class="search-input"
          />
          <select id="sort-select" class="sort-select">
            <option value="name">Sort by Name</option>
            <option value="year">Sort by Founded Year</option>
          </select>
        </div>
        
        <div class="loading-container">
          <div class="loading"></div>
          <p class="loading-text">Loading teams...</p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const teams = await getAllNHLTeams();
    allTeams = teams;
    
    if (teams.length === 0) {
      app.innerHTML = `
        <div class="page">
          <div class="container">
            
            <div class="empty-state">
              <div class="empty-state-icon">🏒</div>
              <h2 class="empty-state-title">No Teams Found</h2>
              <p>Unable to load NHL teams at this time.</p>
            </div>
          </div>
        </div>
      `;
      return;
    }
    
    renderTeamsUI(teams);
    setupTeamsHandlers();
    
  } catch (error) {
    console.error('Error loading teams:', error);
    app.innerHTML = `
      <div class="page">
        <div class="container">
          
          <div class="error-message">
            <p>⚠️ Failed to load teams. Please try again later.</p>
          </div>
        </div>
      </div>
    `;
  }
}

function renderTeamsUI(teams) {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        
        <div class="teams-controls mb-lg">
          <input 
            type="text" 
            id="team-search" 
            placeholder="Search teams..." 
            class="search-input"
          />
          <select id="sort-select" class="sort-select">
            <option value="name">Sort by Name</option>
            <option value="year">Sort by Founded Year</option>
          </select>
        </div>
        
        <div class="teams-grid" id="teams-grid"></div>
      </div>
    </div>
  `;
  
  renderTeamCards(teams);
}

function renderTeamCards(teams) {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  teams.forEach(team => {
    const card = createTeamCard(team);
    
    // Make entire card clickable
    card.addEventListener('click', () => showTeamDetails(team));
    
    // Button still works independently (stops propagation)
    const button = card.querySelector('.team-button');
    if (button) {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        showTeamDetails(team);
      });
    }
    
    grid.appendChild(card);
  });
}

function showTeamDetails(team) {
  const modal = createTeamModal(team);
  document.body.appendChild(modal);
  
  // Trigger animation
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
}

function setupTeamsHandlers() {
  const searchInput = document.getElementById('team-search');
  const sortSelect = document.getElementById('sort-select');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allTeams.filter(team => 
        team.strTeam.toLowerCase().includes(query) ||
        team.strStadium?.toLowerCase().includes(query)
      );
      renderTeamCards(getSortedTeams(filtered, sortSelect?.value || 'name'));
    }, 300));
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const searchQuery = searchInput?.value.toLowerCase() || '';
      let filtered = allTeams;
      
      if (searchQuery) {
        filtered = allTeams.filter(team => 
          team.strTeam.toLowerCase().includes(searchQuery) ||
          team.strStadium?.toLowerCase().includes(searchQuery)
        );
      }
      
      renderTeamCards(getSortedTeams(filtered, e.target.value));
    });
  }
}

function getSortedTeams(teams, sortBy) {
  const sorted = [...teams];
  
  if (sortBy === 'name') {
    sorted.sort((a, b) => a.strTeam.localeCompare(b.strTeam));
  } else if (sortBy === 'year') {
    sorted.sort((a, b) => {
      const yearA = parseInt(a.intFormedYear) || 0;
      const yearB = parseInt(b.intFormedYear) || 0;
      return yearA - yearB;
    });
  }
  
  return sorted;
}
