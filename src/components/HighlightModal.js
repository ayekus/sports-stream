/**
 * Highlight Modal Component
 * Displays goal highlight video in a fullscreen modal
 */

let currentModal = null;
let currentHighlights = [];
let currentIndex = 0;

/**
 * Open highlight modal
 * @param {Object} highlight - Highlight data
 * @param {number} index - Index in highlights array
 * @param {Array} allHighlights - All highlights for navigation
 */
export function openHighlightModal(highlight, index, allHighlights) {
  currentHighlights = allHighlights;
  currentIndex = index;
  
  // Create modal if it doesn't exist
  if (!currentModal) {
    currentModal = createModal();
    document.body.appendChild(currentModal);
    setupModalHandlers();
  }
  
  // Update modal content
  updateModalContent(highlight);
  
  // Show modal
  currentModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close highlight modal
 */
export function closeHighlightModal() {
  if (currentModal) {
    currentModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Stop video by clearing the iframe src completely
    const iframe = currentModal.querySelector('iframe');
    if (iframe) {
      iframe.src = 'about:blank'; // This stops the video immediately
    }
  }
}

/**
 * Navigate to next highlight
 */
function nextHighlight() {
  if (currentIndex < currentHighlights.length - 1) {
    currentIndex++;
    updateModalContent(currentHighlights[currentIndex]);
  }
}

/**
 * Navigate to previous highlight
 */
function previousHighlight() {
  if (currentIndex > 0) {
    currentIndex--;
    updateModalContent(currentHighlights[currentIndex]);
  }
}

/**
 * Create modal structure
 */
function createModal() {
  const modal = document.createElement('div');
  modal.className = 'highlight-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    
    <button class="modal-nav modal-prev" aria-label="Previous highlight">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </button>
    
    <button class="modal-nav modal-next" aria-label="Next highlight">
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
        <div class="video-container">
          <!-- Video will be inserted here -->
        </div>
        
        <div class="highlight-meta">
          <!-- Metadata will be inserted here -->
        </div>
      </div>
    </div>
  `;
  
  return modal;
}

/**
 * Update modal with highlight content
 */
function updateModalContent(highlight) {
  if (!currentModal) return;
  
  const videoContainer = currentModal.querySelector('.video-container');
  const metaContainer = currentModal.querySelector('.highlight-meta');
  const prevButton = currentModal.querySelector('.modal-prev');
  const nextButton = currentModal.querySelector('.modal-next');
  
  // Update video
  videoContainer.innerHTML = createVideoPlayer(highlight);
  
  // Update metadata
  metaContainer.innerHTML = createMetadata(highlight);
  
  // Update navigation button states
  prevButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === currentHighlights.length - 1;
  
  prevButton.style.opacity = currentIndex === 0 ? '0.3' : '1';
  nextButton.style.opacity = currentIndex === currentHighlights.length - 1 ? '0.3' : '1';
}

/**
 * Create video player
 */
function createVideoPlayer(highlight) {
  // Debug: log what video data we have
  console.log('🎥 Video data:', {
    goalId: highlight.goalId,
    highlightUrl: highlight.videos?.highlightUrl,
    discreteUrl: highlight.videos?.discreteUrl
  });
  
  // Get the highlight clip ID from the sharing URL
  const sharingUrl = highlight.videos?.highlightUrl;
  
  if (!sharingUrl) {
    return `
      <div class="video-error">
        <p>Video not available</p>
        <p style="font-size: 0.875rem; color: #999; margin-top: 0.5rem;">
          No video URL found for this goal
        </p>
      </div>
    `;
  }
  
  // Extract the video ID from the sharing URL
  // Format: https://nhl.com/video/vgk-bos-mcavoy-scores-ppg-against-akira-schmid-6388113862112
  // ID is the number at the end
  const videoIdMatch = sharingUrl.match(/(\d+)$/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  
  console.log('🎥 Extracted video ID:', videoId, 'from URL:', sharingUrl);
  
  if (!videoId) {
    return `
      <div class="video-error">
        <p>Unable to extract video ID</p>
        <a href="${sharingUrl}" target="_blank" rel="noopener noreferrer" class="watch-link">
          Watch on NHL.com
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
        </a>
      </div>
    `;
  }
  
  // Try the embed URL format
  const embedUrl = `https://players.brightcove.net/6415718365001/EXtG1xJ7H_default/index.html?videoId=${videoId}`;
  
  return `
    <div class="video-player">
      <iframe 
        src="${embedUrl}" 
        frameborder="0" 
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
        allowfullscreen
        webkitallowfullscreen
        mozallowfullscreen
        style="width: 100%; height: 100%; display: block;"
      ></iframe>
    </div>
  `;
}

/**
 * Create metadata section
 */
function createMetadata(highlight) {
  const assistsList = highlight.assists.length > 0 
    ? `<div class="assists">
         <span class="label">Assists:</span> 
         ${highlight.assists.map(a => a.name).join(', ')}
       </div>`
    : '';
  
  return `
    <div class="goal-details">
      <div class="goal-header">
        <h3 class="goal-scorer">${highlight.scorer.name}</h3>
        <span class="strength-badge ${highlight.strength}">${highlight.strengthDisplay}</span>
      </div>
      
      <div class="goal-time">
        ${highlight.periodDisplay} - ${highlight.timeInPeriod}
      </div>
      
      <div class="goal-score">
        <span class="team-abbrev">${highlight.team.abbrev}</span>
        <span class="score">${highlight.score.display}</span>
      </div>
      
      ${assistsList}
      
      <div class="goal-stats">
        ${highlight.goalsToDate ? `<span>Goal #${highlight.goalsToDate} this season</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Setup modal event handlers
 */
function setupModalHandlers() {
  if (!currentModal) return;
  
  // Close button
  const closeButton = currentModal.querySelector('.modal-close');
  closeButton.addEventListener('click', closeHighlightModal);
  
  // Backdrop click
  const backdrop = currentModal.querySelector('.modal-backdrop');
  backdrop.addEventListener('click', closeHighlightModal);
  
  // Navigation buttons
  const prevButton = currentModal.querySelector('.modal-prev');
  const nextButton = currentModal.querySelector('.modal-next');
  
  prevButton.addEventListener('click', previousHighlight);
  nextButton.addEventListener('click', nextHighlight);
  
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
      closeHighlightModal();
      break;
    case 'ArrowLeft':
      previousHighlight();
      break;
    case 'ArrowRight':
      nextHighlight();
      break;
  }
}

/**
 * Cleanup modal
 */
export function destroyHighlightModal() {
  if (currentModal) {
    document.removeEventListener('keydown', handleKeyPress);
    currentModal.remove();
    currentModal = null;
  }
  document.body.style.overflow = '';
}
