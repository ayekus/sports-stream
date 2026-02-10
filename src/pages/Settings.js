/**
 * Settings Page
 * User preferences and configuration
 */

export async function renderSettingsPage() {
  const app = document.getElementById('app-content');
  
  app.innerHTML = `
    <div class="page">
      <div class="container">
        
        <div class="settings-content">
          <section class="card mb-lg">
            <h3>Cache Management</h3>
            <p class="text-secondary mb-md">Manage cached data to improve performance</p>
            
            <div class="cache-stats mb-md">
              <p><strong>Cache Size:</strong> <span id="cache-size">Calculating...</span></p>
              <p><strong>Cached Items:</strong> <span id="cache-count">0</span></p>
            </div>
            
            <button id="clear-cache">Clear All Cache</button>
          </section>
          
          <section class="card">
            <h3>About</h3>
            <p class="text-secondary">StreamPuck - Ad-free hockey streaming platform</p>
            <p class="text-muted mt-md">Version 1.0.0</p>
            <p class="text-muted">Built with ❤️ for sens fans</p>
            
            <div class="mt-lg">
              <h4>Data Sources</h4>
              <ul class="data-sources">
                <li>🎥 Streamed.pk - Live stream links & schedules</li>
                <li>🏒 NHL API - Real-time standings & statistics</li>
                <li>🎨 TheSportsDB - Team information & images</li>
              </ul>
            </div>
            
            <div class="mt-lg">
              <p class="text-muted">
                <strong>Legal Notice:</strong> This application aggregates publicly available stream links. 
                Users are responsible for ensuring compliance with local laws and regulations.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  setupSettingsHandlers();
  updateCacheStats();
}

function setupSettingsHandlers() {
  const clearButton = document.getElementById('clear-cache');
  
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all cached data?')) {
        import('../utils/cache.js').then(({ cache }) => {
          cache.clear();
          updateCacheStats();
          alert('✅ Cache cleared successfully!');
        });
      }
    });
  }
}

function updateCacheStats() {
  import('../utils/cache.js').then(({ cache }) => {
    const sizeElement = document.getElementById('cache-size');
    const countElement = document.getElementById('cache-count');
    
    if (sizeElement) {
      const size = cache.getCacheSize();
      const sizeKB = (size / 1024).toFixed(2);
      sizeElement.textContent = `${sizeKB} KB`;
    }
    
    if (countElement) {
      const count = cache.keys().length;
      countElement.textContent = count;
    }
  });
}
