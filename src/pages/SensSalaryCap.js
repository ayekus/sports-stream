/**
 * Senators Salary Cap Dashboard
 * Shows team cap space, player salaries, and contract information
 * Now using REAL data scraped from CapWages.com!
 */

import { getSenatorsSalaryCap, formatSalary, formatNumber } from '../services/salaryCapApi.js';
import { router } from '../router.js';

// Cache Intl.DateTimeFormat instance for performance
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
});

let currentData = null;
let currentSort = 'salary-desc';
let currentFilter = 'nhl'; // Default to NHL Only

export async function renderSensSalaryCap() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="sens-page">
      <div class="loading-container">
        <div class="loading"><span></span><span></span><span></span></div>
        <p class="loading-text">Loading Salary Cap Data...</p>
      </div>
    </div>
  `;
  
  await loadSalaryCapData(false); // false = no force refresh
}

async function loadSalaryCapData(forceRefresh = false) {
  const app = document.getElementById('app-content'); // Re-query app-content for error display
  
  try {
    // Fetch REAL scraped data from CapWages
    const salaryData = await getSenatorsSalaryCap(forceRefresh);
    
    if (!salaryData || !salaryData.players) {
      throw new Error('Failed to load salary data');
    }
    
    currentData = salaryData;
    renderSalaryCapUI(salaryData);
    attachEventListeners();
    
  } catch (error) {
    console.error('Error loading salary cap data:', error);
    app.innerHTML = `
      <div class="sens-page">
        <div class="error-message">
          <p>⚠️ Failed to load salary cap data. Please try again later.</p>
          <p style="font-size: 0.9rem; color: rgba(255,255,255,0.6); margin-top: 0.5rem;">
            ${error.message}
          </p>
          <button id="refresh-data-btn" class="refresh-btn" style="margin-top: 1rem;">
            <span>↻</span>
            <span>Try Again</span>
          </button>
        </div>
      </div>
    `;
    // Attach event listener for the refresh button in case of error
    document.getElementById('refresh-data-btn')?.addEventListener('click', () => {
      renderSensSalaryCap(); // Re-render the whole page, which will call loadSalaryCapData(false)
    });
  }
}

/**
 * Uses Event Delegation to handle all clicks within the salary cap page
 */
function attachEventListeners() {
  const container = document.querySelector('.sens-hub-container');
  if (!container) return;

  // Remove any existing listener if this is called multiple times
  if (container._delegatedEventListener) {
    container.removeEventListener('click', container._delegatedEventListener);
  }

  container._delegatedEventListener = (e) => {
    // 1. Handle Sort Buttons
    const sortBtn = e.target.closest('.segment-btn[data-sort]');
    if (sortBtn && !sortBtn.classList.contains('filter-btn')) {
      currentSort = sortBtn.dataset.sort;
      // Update UI state of buttons
      document.querySelectorAll('.segment-btn[data-sort]:not(.filter-btn)').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === currentSort);
      });
      updatePlayerDisplay();
      return;
    }

    // 2. Handle Filter Buttons
    const filterBtn = e.target.closest('.filter-btn');
    if (filterBtn) {
      currentFilter = filterBtn.dataset.filter;
      // Update UI state of buttons
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
      });
      updatePlayerDisplay();
      return;
    }

    // 3. Handle Player Card Clicks
    const playerCard = e.target.closest('.player-contract-card');
    if (playerCard) {
      const modalDataEl = playerCard.querySelector('.modal-data');
      if (modalDataEl) {
        try {
          const data = JSON.parse(modalDataEl.textContent);
          openPlayerModal(data);
        } catch (err) {
          console.error('Error parsing player data:', err);
        }
      }
      return;
    }

    // 4. Handle Refresh Button
    const refreshBtn = e.target.closest('#refresh-data-btn');
    if (refreshBtn) {
      loadSalaryCapData(true); // true = force refresh
      return;
    }
  };

  container.addEventListener('click', container._delegatedEventListener);
}

function updatePlayerDisplay() {
  if (!currentData) return;
  
  const playersContainer = document.querySelector('.players-section');
  if (!playersContainer) return;
  
  playersContainer.innerHTML = renderPlayersSection(currentData);
}

function calculateRosterCapHit(players) {
  // Only count players with NHL status
  let total = 0;
  players.forEach(player => {
    if (player.status === 'NHL') {
      total += player._parsedSalary || 0;
    }
  });
  return total;
}

function renderSalaryCapUI(salaryData) {
  const app = document.getElementById('app-content');
  
  const { categorizedPlayers, scrapedAt, totalPlayers, players } = salaryData;
  
  const capCeiling = 96000000; // 2025-26 NHL salary cap
  
  // Calculate REAL cap hit (only NHL roster players)
  const rosterCapHit = calculateRosterCapHit(players);
  const rosterCapSpace = capCeiling - rosterCapHit;
  const usedPercent = (rosterCapHit / capCeiling) * 100;
  const spacePercent = (rosterCapSpace / capCeiling) * 100;
  
  // Count NHL roster
  const rosterCount = players.filter(p => p.status === 'NHL').length;
  
  app.innerHTML = `
    <div class="sens-hub-page">
      <div class="sens-hub-container">
        <div class="salary-cap-header">
          <h1 class="countdown-title">Salary Cap Dashboard</h1>
        </div>
        
        <div class="cap-usage-bar">
          <div class="cap-usage-stats">
            <div class="cap-stat-item">
              <span class="cap-stat-label">Cap Hit</span>
              <span class="cap-stat-value used">$${formatNumber(rosterCapHit)}</span>
            </div>
            <div class="cap-stat-item">
              <span class="cap-stat-label">Salary Cap</span>
              <span class="cap-stat-value">$${formatNumber(capCeiling)}</span>
            </div>
            <div class="cap-stat-item">
              <span class="cap-stat-label">Cap Space</span>
              <span class="cap-stat-value space">$${formatNumber(rosterCapSpace)}</span>
            </div>
            <div class="cap-stat-item">
              <span class="cap-stat-label">NHL Roster</span>
              <span class="cap-stat-value">${rosterCount} / 23</span>
            </div>
            <div class="cap-stat-item">
              <span class="cap-stat-label">Total Contracts</span>
              <span class="cap-stat-value">${totalPlayers} / 50</span>
            </div>
          </div>
          
          <div class="cap-progress-bar">
            <div class="cap-progress-fill">
              <div class="cap-used" style="width: ${usedPercent}%">
                ${usedPercent.toFixed(1)}%
              </div>
              <div class="cap-space" style="width: ${spacePercent}%">
                ${spacePercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        
        ${renderContractTimeline(players)}
        
        <div class="players-section">
          ${renderPlayersSection(salaryData)}
        </div>
        
        <!-- Last Updated Footer -->
        <div style="margin-top: var(--spacing-2xl); padding: var(--spacing-lg); text-align: center; border-top: 1px solid rgba(183, 146, 87, 0.2);">
          <div style="font-size: 0.875rem; color: rgba(255,255,255,0.5); margin-bottom: var(--spacing-md);">
            Data from CapWages.com • Last updated: ${dateTimeFormatter.format(new Date(salaryData.scrapedAt))}
          </div>
          <button id="refresh-data-btn" class="refresh-btn">
            <span>↻</span>
            <span>Refresh Data</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderContractTimeline(players) {
  // Group NHL players only by contract expiry year
  const expiries = {};
  const currentYear = 2025;
  
  players.forEach(player => {
    // Only include NHL roster players
    if (player.status !== 'NHL') return;
    
    if (player._parsedYears !== null && player._parsedYears !== undefined) {
      const expiryYear = currentYear + player._parsedYears;
      if (!expiries[expiryYear]) {
        expiries[expiryYear] = {
          players: [],
          totalCap: 0
        };
      }
      
      // Add player and calculate total cap hit
      expiries[expiryYear].players.push(player);
      
      expiries[expiryYear].totalCap += player._parsedSalary || 0;
    }
  });
  
  const sortedYears = Object.keys(expiries).sort();
  if (sortedYears.length === 0) return '';
  
  return `
    <div style="margin: var(--spacing-2xl) 0;">
      <h2 style="color: var(--color-sens-gold); margin-bottom: var(--spacing-2xl); font-size: var(--font-size-2xl); text-align: center;">
        Contract Expiry Timeline
      </h2>
      
      <div class="timeline-vertical-container">
        ${sortedYears.map((year, index) => {
          const data = expiries[year];
          const yearColor = year === '2026' ? '#ef4444' : 
                           year === '2027' ? '#f59e0b' : 
                           year === '2028' ? '#3b82f6' : '#8b5cf6';
          const isLast = index === sortedYears.length - 1;
          
          return `
            <div class="timeline-year-section ${isLast ? 'timeline-last' : ''}">
              <!-- Year Badge with Connector Line -->
              <div class="timeline-year-marker">
                <div class="timeline-connector-line"></div>
                <div class="timeline-year-dot" style="background: ${yearColor}; box-shadow: 0 0 20px ${yearColor}80, 0 0 40px ${yearColor}40;">
                  <span class="timeline-year-text">${year}</span>
                </div>
              </div>
              
              <!-- Content Section -->
              <div class="timeline-content-section">
                <!-- Player Cards Grid -->
                <div class="timeline-player-cards">
                  ${data.players.map(p => {
                    const salary = p.contractYears?.['2025-26'] || '-';
                    const position = p.position?.split('/')[0]?.trim() || 'F';
                    const positionIcon = position === 'C' || position === 'LW' || position === 'RW' ? '⚡' :
                                        position === 'D' ? '🛡' : '🥅';
                    
                    return `
                      <div class="timeline-player-card">
                        <div class="timeline-player-header">
                          <div class="timeline-player-position">${position}</div>
                          <div class="timeline-player-name">${p.name.split(',')[0]}</div>
                        </div>
                        <div class="timeline-player-salary">${formatSalary(salary)}</div>
                        <div class="timeline-player-meta">
                          ${p.age ? `<span>Age ${p.age}</span>` : ''}
                          ${p.yearsRemaining ? `<span>${p.yearsRemaining}</span>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderPlayersSection(salaryData) {
  const { categorizedPlayers } = salaryData;
  
  return `
    <div style="margin-top: var(--spacing-2xl);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl); flex-wrap: wrap; gap: var(--spacing-lg);">
        <h2 style="color: var(--color-sens-gold); font-size: var(--font-size-2xl); margin: 0;">
          Player Contracts
        </h2>
        
        <div style="display: flex; gap: var(--spacing-lg); flex-wrap: wrap; align-items: center;">
          <!-- Sort Controls -->
          <div class="modern-control-group">
            <span class="control-label">Sort by:</span>
            <div class="segmented-control">
              <button class="segment-btn ${currentSort === 'salary-desc' ? 'active' : ''}" data-sort="salary-desc">
                <span class="segment-text">Highest</span>
              </button>
              <button class="segment-btn ${currentSort === 'salary-asc' ? 'active' : ''}" data-sort="salary-asc">
                <span class="segment-text">Lowest</span>
              </button>
              <button class="segment-btn ${currentSort === 'years' ? 'active' : ''}" data-sort="years">
                <span class="segment-text">Years Left</span>
              </button>
            </div>
          </div>
          
          <!-- Filter Controls -->
          <div class="modern-control-group">
            <span class="control-label">Show:</span>
            <div class="segmented-control">
              <button class="segment-btn filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
              <button class="segment-btn filter-btn ${currentFilter === 'nhl' ? 'active' : ''}" data-filter="nhl">NHL Only</button>
              <button class="segment-btn filter-btn ${currentFilter === 'expiring' ? 'active' : ''}" data-filter="expiring">Expiring</button>
            </div>
          </div>
        </div>
      </div>
      
      ${renderPlayerSection('Forwards', categorizedPlayers.forwards)}
      ${renderPlayerSection('Defense', categorizedPlayers.defense)}
      ${renderPlayerSection('Goalies', categorizedPlayers.goalies)}
    </div>
  `;
}

function renderPlayerSection(title, players) {
  if (!players || players.length === 0) {
    return '';
  }
  
  // Apply filters
  let filteredPlayers = [...players];
  if (currentFilter === 'nhl') {
    filteredPlayers = filteredPlayers.filter(p => p.status === 'NHL');
  } else if (currentFilter === 'expiring') {
    filteredPlayers = filteredPlayers.filter(p => p._parsedYears !== null && p._parsedYears <= 2);
  }
  
  // Apply sorting
  filteredPlayers.sort((a, b) => {
    const aSalary = a._parsedSalary || 0;
    const bSalary = b._parsedSalary || 0;
    
    switch (currentSort) {
      case 'salary-desc':
        return bSalary - aSalary;
      case 'salary-asc':
        return aSalary - bSalary;
      case 'years':
        const aYears = a._parsedYears || 0;
        const bYears = b._parsedYears || 0;
        return aYears - bYears;
      default:
        return 0;
    }
  });
  
  if (filteredPlayers.length === 0) {
    return '';
  }
  
  return `
    <div style="margin-top: var(--spacing-xl);">
      <h3 style="color: var(--color-sens-gold); margin-bottom: var(--spacing-md); font-size: var(--font-size-xl); display: flex; align-items: center; gap: 0.5rem;">
        ${title} (${filteredPlayers.length})
      </h3>
      
      <div class="player-contracts-grid">
        ${filteredPlayers.map(player => {
          const currentSalary = player.contractYears?.['2025-26'] || 'N/A';
          const salary2026 = player.contractYears?.['2026-27'] || '-';
          const salary2027 = player.contractYears?.['2027-28'] || '-';
          const salary2028 = player.contractYears?.['2028-29'] || '-';
          const salary2029 = player.contractYears?.['2029-30'] || '-';
          
          // Determine contract status badge
          let statusClass = 'active';
          let statusText = player.status || 'NHL';
          if (currentSalary === 'UFA' || currentSalary === 'RFA') {
            statusClass = 'expiring';
            statusText = currentSalary;
          } else if (player.status === 'IR') {
            statusClass = 'injured';
          }
          
          // Check if expiring soon
          const isExpiring = player._parsedYears !== null && player._parsedYears <= 1;
          
          return `
            <div class="player-contract-card compact" data-player-id="${player.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}">
              <div class="player-contract-header">
                <div>
                  <div class="player-contract-name">${player.name}</div>
                  <div class="player-contract-position">
                    ${player.position || player.positionCategory} • Age ${player.age || '?'}
                  </div>
                </div>
                <span class="contract-status-badge ${statusClass}">
                  ${statusText}
                </span>
              </div>
              
              <div class="compact-contract-info">
                <div class="current-year-salary">
                  <div class="salary-label">2025-26</div>
                  <div class="salary-value">${formatSalary(currentSalary)}</div>
                </div>
                
                <div class="contract-meta-compact">
                  ${player.yearsRemaining ? `
                    <span class="${isExpiring ? 'expiring-years' : ''}">${player.yearsRemaining}</span>
                  ` : ''}
                </div>
              </div>
              
              <!-- Hidden data for modal -->
              <div class="modal-data" style="display: none;">
                ${JSON.stringify({
                  name: player.name,
                  position: player.position || player.positionCategory,
                  age: player.age,
                  status: statusText,
                  currentSalary,
                  salary2026,
                  salary2027,
                  salary2028,
                  salary2029,
                  yearsRemaining: player.yearsRemaining,
                  terms: player.terms || 'No trade protection',
                  isExpiring
                }).replace(/"/g, '&quot;')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Modal Functions
function openPlayerModal(data) {
  const modalHtml = `
    <div class="contract-modal-overlay" id="player-modal-overlay">
      <div class="contract-modal">
        <div class="modal-header">
          <div class="modal-player-info">
            <div class="modal-player-name">${data.name}</div>
            <div class="modal-player-meta">${data.position} • Age ${data.age} • ${data.status}</div>
          </div>
          <button class="modal-close-btn" onclick="closePlayerModal()">×</button>
        </div>
        
        <div class="modal-content">
          <div class="modal-section">
            <div class="modal-section-title">Contract Years</div>
            <div class="salary-grid">
              <div class="salary-item current">
                <div class="salary-year">2025-26</div>
                <div class="salary-amount">${formatSalary(data.currentSalary)}</div>
              </div>
              ${data.salary2026 !== '-' ? `
                <div class="salary-item">
                  <div class="salary-year">2026-27</div>
                  <div class="salary-amount">${formatSalary(data.salary2026)}</div>
                </div>
              ` : ''}
              ${data.salary2027 !== '-' ? `
                <div class="salary-item">
                  <div class="salary-year">2027-28</div>
                  <div class="salary-amount">${formatSalary(data.salary2027)}</div>
                </div>
              ` : ''}
              ${data.salary2028 !== '-' ? `
                <div class="salary-item">
                  <div class="salary-year">2028-29</div>
                  <div class="salary-amount">${formatSalary(data.salary2028)}</div>
                </div>
              ` : ''}
              ${data.salary2029 !== '-' ? `
                <div class="salary-item">
                  <div class="salary-year">2029-30</div>
                  <div class="salary-amount">${formatSalary(data.salary2029)}</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="modal-section">
            <div class="modal-section-title">Contract Details</div>
            <div class="contract-details">
              ${data.yearsRemaining ? `
                <div class="detail-row">
                  <div class="detail-label">Time Remaining</div>
                  <div class="detail-value ${data.isExpiring ? 'expiring' : 'highlight'}">${data.yearsRemaining}</div>
                </div>
              ` : ''}
              <div class="detail-row">
                <div class="detail-label">Trade Protection</div>
                <div class="detail-value">${data.terms}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Status</div>
                <div class="detail-value">${data.status}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  // Close on overlay click
  document.getElementById('player-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'player-modal-overlay') {
      closePlayerModal();
    }
  });
  
  // Close on escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closePlayerModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function closePlayerModal() {
  const modal = document.getElementById('player-modal-overlay');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// Make closePlayerModal globally available
window.closePlayerModal = closePlayerModal;
