/**
 * Match Detail Page
 * Shows stream player and match information
 */

import { getStreamUrls, getHockeyMatches, getTeamBadgeUrl } from '../services/streamedApi.js';
import { createVideoPlayer } from '../components/VideoPlayer.js';
import { extractStreamUrl } from '../utils/streamExtractor.js';

let currentPlayer = null;
let currentMatch = null;
let currentSources = [];

export async function renderMatchPage(params) {
  const app = document.getElementById('app-content');
  const matchId = params.id;
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="loading-container">
          <div class="loading"></div>
          <p class="loading-text">Loading stream...</p>
        </div>
      </div>
    </div>
  `;
  
  try {
    // Get match data from today's matches
    const matches = await getHockeyMatches('today');
    const match = matches.find(m => m.id === matchId);
    
    if (!match) {
      app.innerHTML = `
        <div class="page">
          <div class="container">
            <div class="empty-state">
              <div class="empty-state-icon">❌</div>
              <h2 class="empty-state-title">Match Not Found</h2>
              <p>The requested match could not be found.</p>
              <button onclick="window.history.back()" class="mt-lg">Go Back</button>
            </div>
          </div>
        </div>
      `;
      return;
    }
    
    currentMatch = match;
    currentSources = match.sources || [];
    
    if (currentSources.length === 0) {
      app.innerHTML = `
        <div class="page">
          <div class="container">
            <h1 class="page-title">${match.title}</h1>
            <div class="error-message mt-lg">
              <p>⚠️ No streams available for this match.</p>
            </div>
            <button onclick="window.history.back()" class="mt-lg">Go Back</button>
          </div>
        </div>
      `;
      return;
    }
    
    // Render match page
    renderMatchUI(match);

    // Load first stream
    await loadStream(0);
    
    // Setup global redirect blocking
    setupRedirectBlocking();
    
  } catch (error) {
    console.error('Error loading match:', error);
    app.innerHTML = `
      <div class="page">
        <div class="container">
          <div class="error-message">
            <p>⚠️ Failed to load stream. Please try again.</p>
          </div>
          <button onclick="window.history.back()" class="mt-lg">Go Back</button>
        </div>
      </div>
    `;
  }
}

/**
 * Setup global redirect blocking
 * Prevents the page from being navigated away by ads
 */
function setupRedirectBlocking() {
  console.log('🛡️ Setting up redirect blocking...');
  
  // 1. Block window.open (pop-ups)
  window.open = function(...args) {
    console.log('🛡️ Blocked window.open:', args[0]);
    return null;
  };
  
  // 2. Block external links (but allow internal navigation)
  document.addEventListener('click', (e) => {
    let target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'A' && target.href) {
        // Allow internal navigation links (with data-link attribute)
        if (target.hasAttribute('data-link')) {
          return; // Let the router handle it
        }
        // Block external links
        if (!target.href.startsWith(window.location.origin)) {
          console.log('🛡️ Blocked external link:', target.href);
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
      target = target.parentElement;
    }
  }, true);
  
  console.log('✅ Redirect blocking enabled');
}

function renderMatchUI(match) {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page match-page">
      <div class="container">
        <button class="back-button mb-lg" onclick="window.history.back()">
          ← Back to Matches
        </button>
        
        <h1 class="page-title">${match.title}</h1>
        <p class="text-secondary mb-lg">${match.league || 'Hockey'}</p>
        
        <div class="alert alert-info mb-lg" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 1rem;">
          <div style="display: flex; align-items: start; gap: 0.75rem;">
            <div style="font-size: 1.25rem;">ℹ️</div>
            <div>
              <strong style="display: block; margin-bottom: 0.25rem;">Stream Loading Notice</strong>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">Due to free streaming sources, you may need to click 2-3 times to bypass redirects and load the stream. This is a limitation of the embed provider.</p>
            </div>
            </div>
        </div>
        
        <div class="player-wrapper">
          <div id="video-player-container" class="video-container"></div>
          <div id="stream-loading" class="stream-loading">
            <div class="loading"></div>
            <p>Loading stream...</p>
          </div>
        </div>
        
        <div class="stream-sources mt-lg">
          <h3>Stream Information</h3>
          ${currentSources.length > 1 ? `
            <div class="sources-list" id="sources-list">
              ${currentSources.map((source, idx) => `
                <button 
                  class="source-button ${idx === 0 ? 'active' : ''}" 
                  data-source-idx="${idx}"
                  onclick="window.switchStream(${idx})"
                >
                  Stream ${idx + 1}
                  <span class="source-provider">${source.source}</span>
                </button>
              `).join('')}
            </div>
          ` : `
            <p class="text-secondary">Source: ${currentSources[0]?.source || 'Unknown'} (${currentSources[0]?.id || 'N/A'})</p>
          `}
        </div>
        
        <div class="match-details mt-xl card">
          <h3>Match Details</h3>
          <dl class="details-list">
            <dt>League</dt>
            <dd>${match.league || 'Unknown'}</dd>
            
            <dt>Match Time</dt>
            <dd>${new Date(match.time).toLocaleString()}</dd>
            
            <dt>Available Streams</dt>
            <dd>${currentSources.length} source${currentSources.length !== 1 ? 's' : ''}</dd>
            
            <dt>Status</dt>
            <dd><span class="badge ${getStatusClass(match)}">${getStatusText(match)}</span></dd>
          </dl>
        </div>
      </div>
    </div>
  `;
}

async function loadStream(sourceIndex) {
  if (sourceIndex < 0 || sourceIndex >= currentSources.length) {
    console.error('Invalid source index');
    return;
  }
  
  const source = currentSources[sourceIndex];
  const container = document.getElementById('video-player-container');
  const loading = document.getElementById('stream-loading');
  
  if (!container) return;
  
  try {
    // Show loading
    if (loading) {
      loading.style.display = 'flex';
      loading.innerHTML = `
        <div class="loading"></div>
        <p>Extracting stream URL...</p>
      `;
    }
    if (container) container.style.display = 'none';
    
    // Get stream URLs from API
    const streamData = await getStreamUrls(source.source, source.id);
    const embedUrl = streamData.embedUrl || streamData.streamUrl || streamData.url;
    
    if (!embedUrl) {
      throw new Error('No embed URL available');
    }
    
    console.log('📺 Embed URL:', embedUrl);
    
    // Try to extract direct stream URL
    if (loading) {
      loading.innerHTML = `
        <div class="loading"></div>
        <p>Extracting direct stream URL...</p>
      `;
    }
    
    const extractionResult = await extractStreamUrl(embedUrl);
    
    // Hide loading
    if (loading) loading.style.display = 'none';
    if (container) container.style.display = 'block';
    
    // Initialize player
    if (currentPlayer) {
      currentPlayer.destroy();
    }
    
    currentPlayer = createVideoPlayer(container);
    
    // Use extracted URL if successful, otherwise fall back to iframe
    if (extractionResult.success && extractionResult.streamUrl) {
      console.log('✅ Using extracted stream URL');
      currentPlayer.init(extractionResult.streamUrl, 'auto');
    } else {
      console.log('⚠️ Extraction failed, using iframe embed');
      currentPlayer.init(embedUrl, 'iframe');
    }
    
    // Update active button
    updateActiveSource(sourceIndex);
    
  } catch (error) {
    console.error('Error loading stream:', error);
    
    if (loading) loading.style.display = 'none';
    if (container) {
      container.style.display = 'block';
      container.innerHTML = `
        <div class="player-error">
          <div class="error-content">
            <p>⚠️ Unable to load stream</p>
            <p class="text-secondary mt-sm">This stream source may be unavailable. ${currentSources.length > 1 ? 'Try another stream.' : ''}</p>
            ${currentSources.length > 1 && sourceIndex < currentSources.length - 1 ? `
              <button class="mt-md" onclick="window.switchStream(${sourceIndex + 1})">Try Next Stream</button>
            ` : ''}
          </div>
        </div>
      `;
    }
  }
}

function updateActiveSource(activeIndex) {
  const buttons = document.querySelectorAll('.source-button');
  buttons.forEach((btn, idx) => {
    if (idx === activeIndex) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function getStatusClass(match) {
  const now = new Date();
  const matchDate = new Date(match.time);
  const endTime = new Date(matchDate.getTime() + 3 * 60 * 60 * 1000);
  
  if (now >= matchDate && now <= endTime) return 'live';
  if (now < matchDate) return 'upcoming';
  return 'finished';
}

function getStatusText(match) {
  const status = getStatusClass(match);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Expose stream switching to window for onclick handlers
window.switchStream = loadStream;
