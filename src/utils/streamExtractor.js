/**
 * Stream URL Extractor
 * Extracts direct stream URLs from embed pages to bypass redirects and ads
 */

// CORS proxies to use (try in order if one fails)
const CORS_PROXIES = [
  { url: 'https://api.allorigins.win/raw?url=', responseType: 'text' },
  { url: 'https://corsproxy.io/?', responseType: 'text' },
  { url: '', responseType: 'direct' } // Direct attempt (may fail due to CORS)
];

/**
 * Extract direct stream URL from an embed page
 * @param {string} embedUrl - The embed page URL
 * @returns {Promise<Object>} { success: boolean, streamUrl: string|null, method: string }
 */
export async function extractStreamUrl(embedUrl) {
  console.log('🔍 Attempting to extract stream URL from:', embedUrl);
  
  // First, check if the URL itself might be a direct stream
  if (embedUrl.includes('.m3u8') || embedUrl.includes('.mp4') || embedUrl.includes('.webm')) {
    console.log('✅ URL appears to be a direct stream');
    return{ success: true, streamUrl: embedUrl, method: 'direct' };
  }
  
  // Try each CORS proxy
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyConfig = CORS_PROXIES[i];
    
    try {
      console.log(`📡 Trying extraction method ${i + 1}/${CORS_PROXIES.length}...`);
      
      const result = await extractWithProxy(embedUrl, proxyConfig);
      
      if (result.success) {
        console.log('✅ Successfully extracted stream URL:', result.streamUrl);
        return result;
      }
      
    } catch (error) {
      console.warn(`⚠️ Extraction method ${i + 1} failed:`, error.message);
      // Continue to next method
    }
  }
  
  console.log('❌ All extraction methods failed, will use iframe fallback');
  return { success: false, streamUrl: null, method: 'fallback' };
}

/**
 * Extract stream URL using a specific CORS proxy
 * @param {string} embedUrl - The embed page URL
 * @param {Object} proxyConfig - The CORS proxy configuration
 * @returns {Promise<Object>} Extraction result
 */
async function extractWithProxy(embedUrl, proxyConfig) {
  // Fetch the embed page HTML through the proxy
  const proxiedUrl = proxyConfig.responseType === 'direct' 
    ? embedUrl 
    : proxyConfig.url + encodeURIComponent(embedUrl);
  
  const response = await fetch(proxiedUrl, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    signal: AbortSignal.timeout(10000) // 10 second timeout
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const html = await response.text();
  
  // Try to extract stream URL from the HTML
  const streamUrl = parseStreamUrl(html);
  
  if (streamUrl) {
    return { 
      success: true, 
      streamUrl, 
      method: 'extracted',
      proxy: proxyConfig.url || 'direct'
    };
  }
  
  throw new Error('No stream URL found in HTML');
}

/**
 * Parse HTML to find stream URLs
 * @param {string} html - HTML content
 * @returns {string|null} Stream URL or null
 */
function parseStreamUrl(html) {
  // Patterns to match common stream URL formats
  const patterns = [
    // HLS streams (.m3u8)
    /["']([^"']*\.m3u8[^"']*)["']/i,
    /source[:\s]*["']([^"']*\.m3u8[^"']*)["']/i,
    /file[:\s]*["']([^"']*\.m3u8[^"']*)["']/i,
    /hls[:\s]*["']([^"']*\.m3u8[^"']*)["']/i,
    
    // Direct video files
    /["']([^"']*\.mp4[^"']*)["']/i,
    /["']([^"']*\.webm[^"']*)["']/i,
    
    // Common stream variables
    /streamUrl[:\s]*["']([^"']*)["']/i,
    /videoUrl[:\s]*["']([^"']*)["']/i,
    /playUrl[:\s]*["']([^"']*)["']/i,
    
    // URL patterns without quotes
    /https?:\/\/[^\s"'<>]*\.m3u8[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]*\/stream[^\s"'<>]*/gi,
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = html.match(pattern);
    
    if (match) {
      // Get the captured group or full match
      let url = match[1] || match[0];
      
      // Clean up the URL
      url = url.trim();
      
      // Remove common prefixes/suffixes
      url = url.replace(/^["']|["']$/g, '');
      
      // Validate it looks like a URL
      if (url.startsWith('http') || url.startsWith('//')) {
        // Convert protocol-relative URLs
        if (url.startsWith('//')) {
          url = 'https:' + url;
        }
        
        // Validate it's not an ad or tracking URL
        if (!isAdUrl(url)) {
          return url;
        }
      }
    }
  }
  
  return null;
}

/**
 * Check if URL is likely an ad or tracking URL
 * @param {string} url - URL to check
 * @returns {boolean} True if likely an ad URL
 */
function isAdUrl(url) {
  const adDomains = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'adserver',
    'ads.',
    'analytics',
    'tracker',
    'pixel',
    'beacon'
  ];
  
  return adDomains.some(domain => url.includes(domain));
}

/**
 * Check if a stream URL is valid and accessible
 * @param {string} streamUrl - Stream URL to validate
 * @returns {Promise<boolean>} True if valid
 */
export async function validateStreamUrl(streamUrl) {
  if (!streamUrl) return false;
  
  try {
    // Try a HEAD request to check if the resource exists
    const response = await fetch(streamUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok;
  } catch (error) {
    // If HEAD fails, try GET with a short timeout
    try {
      const response = await fetch(streamUrl, {
        signal: AbortSignal.timeout(3000)
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}
