/**
 * Local Storage Cache Manager
 * Provides caching with TTL and size management
 */

const CACHE_PREFIX = 'sports_stream_';
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB

class CacheManager {
  /**
   * Get cached value if not expired
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum age in milliseconds (optional)
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key, maxAge = null) {
    try {
      const cacheKey = CACHE_PREFIX + key;
      const item = localStorage.getItem(cacheKey);
      
      if (!item) return null;
      
      const { value, timestamp, ttl } = JSON.parse(item);
      const age = Date.now() - timestamp;
      
      // Check if expired based on TTL or maxAge
      const effectiveTTL = maxAge !== null ? maxAge : ttl;
      if (effectiveTTL && age > effectiveTTL) {
        this.remove(key);
        return null;
      }
      
      return value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache value with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    try {
      const cacheKey = CACHE_PREFIX + key;
      const item = {
        value,
        timestamp: Date.now(),
        ttl
      };
      
      const serialized = JSON.stringify(item);
      
      // Check cache size before storing
      if (this.getCacheSize() + serialized.length > MAX_CACHE_SIZE) {
        this.evictOldest();
      }
      
      localStorage.setItem(cacheKey, serialized);
    } catch (error) {
      console.error('Cache set error:', error);
      
      // If quota exceeded, clear cache and retry
      if (error.name === 'QuotaExceededError') {
        this.clear();
        try {
          localStorage.setItem(cacheKey, JSON.stringify(item));
        } catch (retryError) {
          console.error('Cache retry failed:', retryError);
        }
      }
    }
  }

  /**
   * Remove specific cache entry
   * @param {string} key - Cache key to remove
   */
  remove(key) {
    const cacheKey = CACHE_PREFIX + key;
    localStorage.removeItem(cacheKey);
  }

  /**
   * Clear all cache entries matching pattern
   * @param {string} pattern - Pattern to match (optional)
   */
  clear(pattern = null) {
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        if (!pattern || key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Get total cache size in bytes
   * @returns {number} Total size in bytes
   */
  getCacheSize() {
    let size = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        size += localStorage.getItem(key).length;
      }
    });
    
    return size;
  }

  /**
   * Evict oldest cache entries (LRU)
   */
  evictOldest() {
    const keys = Object.keys(localStorage);
    const cacheEntries = [];
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          cacheEntries.push({ key, timestamp: item.timestamp });
        } catch (error) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
    
    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest 25% of entries
    const toRemove = Math.ceil(cacheEntries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(cacheEntries[i].key);
    }
  }

  /**
   * Get all cache keys
   * @returns {string[]} Array of cache keys (without prefix)
   */
  keys() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => key.replace(CACHE_PREFIX, ''));
  }
}

// Export singleton instance
export const cache = new CacheManager();
