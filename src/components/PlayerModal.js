/**
 * Player Modal Component
 * Displays player information in a modal overlay
 */

let currentModal = null;
let currentPlayers = [];
let currentIndex = 0;

/**
 * Open player modal
 * @param {Object} player - Player data
 * @param {number} index - Index in players array
 * @param {Array} allPlayers - All players for navigation
 */
export function openPlayerModal(player, index, allPlayers) {
  currentPlayers = allPlayers;
  currentIndex = index;
  
  // Create modal if it doesn't exist
  if (!currentModal) {
    currentModal = createModal();
    document.body.appendChild(currentModal);
    setupModalHandlers();
  }
  
  // Update modal content
  updateModalContent(player);
  
  // Show modal
  currentModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close player modal
 */
export function closePlayerModal() {
  if (currentModal) {
    currentModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Navigate to next player
 */
function nextPlayer() {
  if (currentIndex < currentPlayers.length - 1) {
    currentIndex++;
    updateModalContent(currentPlayers[currentIndex]);
  }
}

/**
 * Navigate to previous player
 */
function previousPlayer() {
  if (currentIndex > 0) {
    currentIndex--;
    updateModalContent(currentPlayers[currentIndex]);
  }
}

/**
 * Create modal structure
 */
function createModal() {
  const modal = document.createElement('div');
  modal.className = 'player-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    
    <button class="modal-nav modal-prev" aria-label="Previous player">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </button>
    
    <button class="modal-nav modal-next" aria-label="Next player">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    </button>
    
    <div class="modal-content">
      <button class="modal-close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      <div class="modal-body">
        <div class="player-header">
          <!-- Player header will be inserted here -->
        </div>
        
        <div class="player-details">
          <!-- Player details will be inserted here -->
        </div>
      </div>
    </div>
  `;
  
  return modal;
}

/**
 * Update modal with player content
 */
function updateModalContent(player) {
  if (!currentModal) return;
  
  const headerContainer = currentModal.querySelector('.player-header');
  const detailsContainer = currentModal.querySelector('.player-details');
  const prevButton = currentModal.querySelector('.modal-prev');
  const nextButton = currentModal.querySelector('.modal-next');
  
  // Update header
  headerContainer.innerHTML = createPlayerHeader(player);
  
  // Update details
  detailsContainer.innerHTML = createPlayerDetails(player);
  
  // Update navigation button states
  prevButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === currentPlayers.length - 1;
  
  prevButton.style.opacity = currentIndex === 0 ? '0.3' : '1';
  nextButton.style.opacity = currentIndex === currentPlayers.length - 1 ? '0.3' : '1';
}

/**
 * Create player header section
 */
function createPlayerHeader(player) {
  const hasInjury = player.injuries && player.injuries.length > 0;
  const injuryInfo = hasInjury ? player.injuries[0] : null;
  
  return `
    <div class="player-modal-header">
      ${player.headshot?.href ? 
        `<img src="${player.headshot.href}" alt="${player.displayName}" class="player-modal-img" loading="lazy" />` :
        `<div class="player-modal-avatar">${player.jersey || '?'}</div>`
      }
      <div class="player-modal-info">
        <h2 class="player-modal-name">${player.displayName || player.fullName}</h2>
        <div class="player-modal-subtitle">
          <span class="player-modal-position">${player.position?.displayName || 'Position Unknown'}</span>
          ${player.jersey ? ` • <span class="player-modal-number">#${player.jersey}</span>` : ''}
        </div>
        ${hasInjury ? `
          <div class="player-modal-injury">
            <span class="injury-icon">🏥</span>
            <span class="injury-text">${injuryInfo.status}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Create player details section
 */
function createPlayerDetails(player) {
  const birthPlace = player.birthPlace 
    ? `${player.birthPlace.city ? player.birthPlace.city + ', ' : ''}${player.birthPlace.country || ''}` 
    : 'Unknown';
  
  const age = player.age || 'N/A';
  const height = player.displayHeight || 'N/A';
  const weight = player.displayWeight || 'N/A';
  const shoots = player.hand?.displayValue || 'N/A';
  const experience = player.experience?.years ? `${player.experience.years} years` : 'Rookie';
  const debutYear = player.debutYear || 'N/A';
  
  // Get ESPN player page link
  const playerPageLink = player.links?.find(link => link.rel.includes('playercard'))?.href || null;
  
  return `
    <div class="player-info-grid">
      <div class="player-info-card">
        <div class="info-label">Age</div>
        <div class="info-value">${age}</div>
      </div>
      
      <div class="player-info-card">
        <div class="info-label">Height</div>
        <div class="info-value">${height}</div>
      </div>
      
      <div class="player-info-card">
        <div class="info-label">Weight</div>
        <div class="info-value">${weight}</div>
      </div>
      
      <div class="player-info-card">
        <div class="info-label">Shoots</div>
        <div class="info-value">${shoots}</div>
      </div>
      
      <div class="player-info-card">
        <div class="info-label">Experience</div>
        <div class="info-value">${experience}</div>
      </div>
      
      <div class="player-info-card">
        <div class="info-label">NHL Debut</div>
        <div class="info-value">${debutYear}</div>
      </div>
    </div>
    
    <div class="player-birthplace">
      <div class="birthplace-label">Birthplace</div>
      <div class="birthplace-value">${birthPlace}</div>
    </div>
    
    ${playerPageLink ? `
      <div class="player-links">
        <a href="${playerPageLink}" target="_blank" rel="noopener noreferrer" class="espn-link">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
          View Full Stats on ESPN
        </a>
      </div>
    ` : ''}
  `;
}

/**
 * Setup modal event handlers
 */
function setupModalHandlers() {
  if (!currentModal) return;
  
  // Close button
  const closeButton = currentModal.querySelector('.modal-close');
  closeButton.addEventListener('click', closePlayerModal);
  
  // Backdrop click
  const backdrop = currentModal.querySelector('.modal-backdrop');
  backdrop.addEventListener('click', closePlayerModal);
  
  // Navigation buttons
  const prevButton = currentModal.querySelector('.modal-prev');
  const nextButton = currentModal.querySelector('.modal-next');
  
  prevButton.addEventListener('click', previousPlayer);
  nextButton.addEventListener('click', nextPlayer);
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyPress);
}

/**
 * Handle keyboard events
 */
function handleKeyPress(e) {
  if (!currentModal || !currentModal.classList.contains('active')) return;
  
  switch(e.key) {
    case 'Escape':
      closePlayerModal();
      break;
    case 'ArrowLeft':
      previousPlayer();
      break;
    case 'ArrowRight':
      nextPlayer();
      break;
  }
}

/**
 * Cleanup modal
 */
export function destroyPlayerModal() {
  if (currentModal) {
    document.removeEventListener('keydown', handleKeyPress);
    currentModal.remove();
    currentModal = null;
  }
  document.body.style.overflow = '';
}
