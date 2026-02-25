import { getGameHighlights } from '../services/nhlHighlightsApi.js';
import { createHighlightsSection, setupHighlightHandlers, createHighlightsLoadingSkeleton } from '../components/HighlightsSection.js';
import { openHighlightModal } from '../components/HighlightModal.js';
import { toAPIDate } from '../utils/date.js';
import { logger } from './logger.js';

let currentHighlights = [];

/**
 * Fetch and render goal highlights for the match
 * @param {Object} match - The match object
 * @param {HTMLElement} container - The container to render highlights into
 */
export async function fetchAndRenderHighlights(match, container) {
  if (!container) return;
  
  // Show loading skeleton
  container.innerHTML = createHighlightsLoadingSkeleton();
  
  try {
    // Get game date in YYYY-MM-DD format (use local date, not UTC)
    const dateStr = toAPIDate(new Date(match.time));
    
    // Extract NHL game ID if available
    const gameId = match.nhlGameId;
    
    if (!gameId) {
      logger.log('ℹ️ No NHL game ID for this match - may not be an NHL game or enrichment failed');
      container.innerHTML = ''; // Clear loading skeleton
      return;
    }
    
    logger.log(`🎯 Fetching highlights for NHL game ${gameId}...`);
    
    // Fetch highlights
    const highlights = await getGameHighlights(gameId, dateStr);
    currentHighlights = highlights;
    
    if (highlights.length === 0) {
      logger.log('No highlights available for this game');
      container.innerHTML = ''; // Clear loading skeleton
      return;
    }
    
    // Render highlights section
    container.innerHTML = createHighlightsSection(highlights, handleHighlightClick);
    
    // Setup click handlers
    setupHighlightHandlers(highlights, handleHighlightClick);
    
    logger.log(`✅ Rendered ${highlights.length} goal highlights`);
    
  } catch (error) {
    logger.error('Error fetching highlights:', error);
    container.innerHTML = ''; // Clear loading skeleton on error
  }
}

/**
 * Handle highlight card click
 */
function handleHighlightClick(highlight, index) {
  openHighlightModal(highlight, index, currentHighlights);
}

/**
 * Resets local highlights state
 */
export function resetHighlights() {
  currentHighlights = [];
}
