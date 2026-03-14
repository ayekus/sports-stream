/**
 * Match Detail Page
 * Shows stream player and match information
 */

import { getStreamUrls, getHockeyMatches, getTeamBadgeUrl } from '../services/streamedApi.js';
import { createVideoPlayer } from '../components/VideoPlayer.js';
import { extractStreamUrl } from '../utils/streamExtractor.js';
import { destroyHighlightModal } from '../components/HighlightModal.js';
import { setupRedirectBlocking } from '../utils/security.js';
import { fetchAndRenderHighlights, resetHighlights } from '../utils/matchHighlights.js';
import { logger } from '../utils/logger.js';

let currentPlayer = null;
let currentMatch = null;
let currentSources = [];
let feedCounts = {}; // Store feed counts for each source
let securityCleanup = null;

// Cache Intl.DateTimeFormat instance for performance optimization
const matchDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
});

/**
 * Cleanup function to destroy player and reset state
 * Called when navigating away from match page
 */
export function cleanupMatchPage() {
  logger.log('🧹 Cleaning up match page...');
  
  if (currentPlayer) {
    try {
      currentPlayer.destroy();
      logger.log('✅ Player destroyed');
    } catch (error) {
      console.error('Error destroying player:', error);
    }
    currentPlayer = null;
  }
  
  // Cleanup security listeners
  if (securityCleanup) {
    securityCleanup();
    securityCleanup = null;
  }
  
  // Cleanup highlight modal
  destroyHighlightModal();
  
  // Clear state
  currentMatch = null;
  currentSources = [];
  feedCounts = {};
  resetHighlights();
  
  // Clear cached streams
  if (window.currentProviderStreams) {
    window.currentProviderStreams = {};
  }
}

export async function renderMatchPage(params) {
  const app = document.getElementById('app-content');
  const matchId = params.id;
  
  // Cleanup any existing player before loading new match
  cleanupMatchPage();
  
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
    // Clear cache to ensure fresh data with latest scores
    const { cache } = await import('../utils/cache.js');

    // PERF: Instead of clearing the entire cache (which wipes expensive static assets like team info),
    // we only invalidate dynamic match data. This preserves long-lived cache items.

    // 1. Clear ONLY the enriched matches cache to force re-fetching latest stream data
    //    and re-matching with NHL scores.
    cache.remove('streamed_hockey_today_v2_enriched');

    // 2. Clear individual stream details to ensure fresh links
    cache.clear('streamed_stream_');

    // 3. DO NOT clear nhl_scores_.
    //    The getHockeyMatches() call below will automatically fetch fresh scores if the cache
    //    is expired (2 min TTL). If it's still valid, we should use it to avoid redundant API calls.
    // cache.clear('nhl_scores_');

    logger.log('🔄 Dynamic match cache cleared (streams), fetching fresh match data...');
    
    // Get match data from today's matches with fresh NHL enrichment
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

    // Pre-fetch feed counts for all sources in parallel
    fetchFeedCounts();

    // Load first stream
    await loadStream(0);
    
    // Setup global redirect blocking
    securityCleanup = setupRedirectBlocking();
    
    // Fetch and render highlights if game has started
    if (match.status === 'live' || match.status === 'finished') {
      const highlightsContainer = document.getElementById('highlights-container');
      fetchAndRenderHighlights(match, highlightsContainer);
    }
    
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
 * Fetch feed counts for all sources in parallel
 * Updates the UI as each count becomes available
 */
async function fetchFeedCounts() {
  logger.log('📊 Fetching feed counts for all providers...');
  
  // Fetch all feed counts in parallel
  const promises = currentSources.map(async (source, index) => {
    try {
      const streamData = await getStreamUrls(source.source, source.id);
      const streams = streamData.streams || streamData.allStreams || [];
      const count = streams.length;
      
      // Store the count
      feedCounts[index] = count;
      
      // Store streams for quick access later
      if (!window.currentProviderStreams) {
        window.currentProviderStreams = {};
      }
      window.currentProviderStreams[index] = streams;
      
      logger.log(`✅ ${source.source}: ${count} feed(s)`);
      
      // Update UI to show the count
      updateSourceButtonCount(index, count);
      
      return { index, count };
    } catch (error) {
      console.error(`❌ Error fetching feeds for ${source.source}:`, error);
      feedCounts[index] = 0;
      updateSourceButtonCount(index, 0);
      return { index, count: 0 };
    }
  });
  
  // Wait for all to complete
  await Promise.all(promises);
  logger.log('✅ All feed counts loaded');
}

/**
 * Update a single source button to show feed count
 * This updates the badge that was already rendered in the HTML
 * Also hides the button if there are 0 feeds
 */
function updateSourceButtonCount(sourceIndex, count) {
  const button = document.querySelector(`[data-source-idx="${sourceIndex}"]`);
  if (!button) return;
  
  const countBadge = button.querySelector('.feed-count-badge');
  if (countBadge) {
    countBadge.textContent = `${count} feed${count !== 1 ? 's' : ''}`;
  }
  
  // Hide button if there are 0 feeds
  if (count === 0) {
    button.style.display = 'none';
    logger.log(`🚫 Hiding ${currentSources[sourceIndex]?.source} (0 feeds)`);
  } else {
    button.style.display = ''; // Show button if it was previously hidden
  }
}
function renderMatchUI(match) {
  const app = document.getElementById('app-content');
  
  // Check if this is a Sens game
  const isSensGame = match.title && (
    match.title.toLowerCase().includes('ottawa') ||
    match.title.toLowerCase().includes('senators') ||
    match.title.toLowerCase().includes('sens')
  );
  
  // Apply Sens theme if it's a Sens game
  if (isSensGame) {
    document.body.classList.add('sens-mode');
  } else {
    document.body.classList.remove('sens-mode');
  }
  
  app.innerHTML = `
    <div class="page match-page ${isSensGame ? 'sens-game' : ''}">
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
                  <span class="source-provider">${source.source}</span>
                  <span class="feed-count-badge">...</span>
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
            <dd>${matchDateTimeFormatter.format(new Date(match.time))}</dd>
            
            <dt>Available Streams</dt>
            <dd>${currentSources.length} source${currentSources.length !== 1 ? 's' : ''}</dd>
            
            <dt>Status</dt>
            <dd><span class="badge ${getStatusClass(match)}">${getStatusText(match)}</span></dd>
          </dl>
        </div>
        
        <!-- Highlights Section (will be populated if goals are available) -->
        <div id="highlights-container"></div>
      </div>
    </div>
  `;
}

async function loadStream(sourceIndex) {
  if (sourceIndex < 0 || sourceIndex >= currentSources.length) {
    console.error('Invalid source index');
    return;
  }
  
  // Update active button immediately when clicked, before loading
  updateActiveSource(sourceIndex);
  
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
        <p>Extracting stream URLs...</p>
      `;
    }
    if (container) container.style.display = 'none';
    
    // Check if we already have the streams from pre-fetch
    let streams = window.currentProviderStreams?.[sourceIndex];
    
    if (!streams) {
      // If not pre-fetched, fetch now
      logger.log(`📺 Fetching streams for ${source.source}...`);
      const streamData = await getStreamUrls(source.source, source.id);
      streams = streamData.streams || streamData.allStreams || [];
      
      // Store for future use
      if (!window.currentProviderStreams) {
        window.currentProviderStreams = {};
      }
      window.currentProviderStreams[sourceIndex] = streams;
      
      // Update feed count badge
      feedCounts[sourceIndex] = streams.length;
      updateSourceButtonCount(sourceIndex, streams.length);
    } else {
      logger.log(`✅ Using cached streams for ${source.source}`);
    }
    
    if (!streams || streams.length === 0) {
      throw new Error('No streams available for this source');
    }
    
    logger.log(`📺 Found ${streams.length} stream(s) for ${source.source}`);
    
    // Update stream options UI to show all available streams for this provider
    updateStreamOptions(sourceIndex, streams);
    
    // Load the first stream by default (or HD stream if available)
    const hdStream = streams.find(s => s.hd);
    const defaultStream = hdStream || streams[0];
    
    await playStream(defaultStream, container, loading);
    
  } catch (error) {
    console.error('Error loading stream:', error);
    
    // Update stream options UI to show the correct provider name even when failed
    updateStreamOptions(sourceIndex, []);
    
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

async function playStream(stream, container, loading) {
  const embedUrl = stream.embedUrl || stream.streamUrl || stream.url;
  
  if (!embedUrl) {
    throw new Error('No embed URL available');
  }
  
  logger.log('📺 Playing stream:', stream.language || `Stream ${stream.streamNo}`, embedUrl);
  
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
    logger.log('✅ Using extracted stream URL');
    currentPlayer.init(extractionResult.streamUrl, 'auto');
  } else {
    logger.log('⚠️ Extraction failed, using iframe embed');
    currentPlayer.init(embedUrl, 'iframe');
  }
}

function updateStreamOptions(sourceIndex, streams) {
  const streamInfoDiv = document.querySelector('.stream-sources');
  if (!streamInfoDiv) return;
  
  const source = currentSources[sourceIndex];
  
  // Build the stream options HTML
  let streamOptionsHtml = '<h3>Stream Information</h3>';
  
  // Show provider buttons
  if (currentSources.length > 1) {
    streamOptionsHtml += `
      <div class="sources-list" id="sources-list">
        ${currentSources.map((src, idx) => {
          // Get feed count for this source (if available)
          const count = feedCounts[idx];
          const countText = count !== undefined 
            ? `<span class="feed-count-badge">${count} feed${count !== 1 ? 's' : ''}</span>`
            : '<span class="feed-count-badge">...</span>';
          
          // Hide button if it has 0 feeds
          const hideStyle = count === 0 ? 'style="display: none;"' : '';
          
          return `
            <button 
              class="source-button ${idx === sourceIndex ? 'active' : ''}" 
              data-source-idx="${idx}"
              onclick="window.switchStream(${idx})"
              ${hideStyle}
            >
              <span class="source-provider">${src.source}</span>
              ${countText}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }
  
  // Show individual streams for the selected provider
  if (streams && streams.length > 1) {
    streamOptionsHtml += `
      <div class="mt-lg">
        <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--text-secondary);">
          Available Feeds for ${source.source}:
        </h4>
        <div class="stream-feeds-list">
          ${streams.map((stream, idx) => `
            <button 
              class="feed-button ${idx === 0 ? 'active' : ''}" 
              data-feed-idx="${idx}"
              onclick="window.switchFeed(${sourceIndex}, ${idx})"
            >
              <span class="feed-label">${stream.language || `Stream ${stream.streamNo}`}</span>
              ${stream.hd ? '<span class="hd-badge">HD</span>' : ''}
              ${stream.viewers ? `<span class="viewers-count">👁️ ${stream.viewers}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } else if (streams && streams.length === 1) {
    // Single stream - just show info
    const stream = streams[0];
    streamOptionsHtml += `
      <p class="text-secondary mt-md">
        Source: ${source.source} 
        ${stream.language ? `(${stream.language})` : ''}
        ${stream.hd ? ' • HD' : ''}
        ${stream.viewers ? ` • ${stream.viewers} viewers` : ''}
      </p>
    `;
  } else {
    // No streams available - show error message
    streamOptionsHtml += `
      <p class="text-secondary mt-md" style="color: var(--color-error);">
        ⚠️ No feeds available for ${source.source}
      </p>
    `;
  }
  
  streamInfoDiv.innerHTML = streamOptionsHtml;
}

// Function to switch between feeds within the same provider
window.switchFeed = async function(sourceIndex, feedIndex) {
  const streams = window.currentProviderStreams?.[sourceIndex];
  
  if (!streams || feedIndex < 0 || feedIndex >= streams.length) {
    console.error('Invalid feed index');
    return;
  }
  
  const stream = streams[feedIndex];
  const container = document.getElementById('video-player-container');
  const loading = document.getElementById('stream-loading');
  
  // Update active feed button
  const feedButtons = document.querySelectorAll('.feed-button');
  feedButtons.forEach((btn, idx) => {
    if (idx === feedIndex) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Play the selected stream
  await playStream(stream, container, loading);
};

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
