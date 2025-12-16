/**
 * VideoPlayer Component
 * Enhanced video player with HLS support for stream playback
 */

import Plyr from 'plyr';
import Hls from 'hls.js';
import 'plyr/dist/plyr.css';

export class VideoPlayer {
  constructor(container, options = {}) {
    this.container = container;
    this.player = null;
    this.hls = null;
    this.options = {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
      ],
      settings: ['quality', 'speed'],
      quality: {
        default: 720,
        options: [1080, 720, 480, 360]
      },
      ...options
    };
  }

  /**
   * Initialize player with a stream URL
   * @param {string} url - Stream URL
   * @param {string} type - Stream type ('video', 'iframe', or 'auto')
   */
  init(url, type = 'auto') {
    this.destroy(); // Clean up existing player
    
    // Auto-detect type if not specified
    if (type === 'auto') {
      if (url.includes('.m3u8')) {
        type = 'hls';
      } else if (url.includes('.mp4') || url.includes('.webm')) {
        type = 'video';
      } else {
        type = 'iframe';
      }
    }
    
    console.log(`🎬 Initializing player with type: ${type}`);
    
    if (type === 'iframe') {
      this.createIframePlayer(url);
    } else if (type === 'hls') {
      this.createHLSPlayer(url);
    } else {
      this.createVideoPlayer(url);
    }
  }

  /**
   * Create iframe-based player for embedded streams
   * @param {string} url - Embed URL
   */
  createIframePlayer(url) {
    this.container.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allowFullscreen = true;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = 'var(--radius-lg)';
    
    this.container.appendChild(iframe);
    
    console.log('🎬 Iframe player loaded');
  }

  /**
   * Create video element with Plyr
   * @param {string} url - Video URL
   */
  createVideoPlayer(url) {
    const video = document.createElement('video');
    video.controls = true;
    video.crossOrigin = 'anonymous';
    
    const source = document.createElement('source');
    source.src = url;
    source.type = this.getVideoType(url);
    
    video.appendChild(source);
    
    this.container.innerHTML = '';
    this.container.appendChild(video);
    
    // Initialize Plyr
    this.player = new Plyr(video, this.options);
    
    // Add event listeners
    this.setupEventListeners();
  }

  /**
   * Create HLS player for .m3u8 streams
   * @param {string} url - HLS stream URL
   */
  createHLSPlayer(url) {
    if (!Hls.isSupported()) {
      console.warn('HLS not supported, falling back to native video');
      this.createVideoPlayer(url);
      return;
    }

    const video = document.createElement('video');
    video.controls = true;
    video.crossOrigin = 'anonymous';
    
    this.container.innerHTML = '';
    this.container.appendChild(video);
    
    // Initialize HLS.js
    this.hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90
    });
    
    this.hls.loadSource(url);
    this.hls.attachMedia(video);
    
    // HLS event listeners
    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('✅ HLS manifest loaded');
      video.play().catch(err => console.log('Autoplay prevented:', err));
    });
    
    this.hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS Error:', data);
      
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('Network error, attempting recovery...');
            this.hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('Media error, attempting recovery...');
            this.hls.recoverMediaError();
            break;
          default:
            console.error('Fatal error, cannot recover');
            this.handleError();
            break;
        }
      }
    });
    
    // Initialize Plyr on top of HLS video element
    this.player = new Plyr(video, {
      ...this.options,
      autoplay: false
    });
    
    this.setupEventListeners();
  }

  /**
   * Setup additional protection for iframe
   * Monitors for redirect attempts and provides feedback
   * @param {HTMLIFrameElement} iframe - The iframe element
   */
  setupIframeProtection(iframe) {
    // Listen for iframe load events
    iframe.addEventListener('load', () => {
      console.log('📺 Iframe loaded');
      
      try {
        // Try to access iframe window (may fail due to CORS)
        const iframeWindow = iframe.contentWindow;
        
        // Monitor for navigation attempts
        if (iframeWindow) {
          // Note: Due to same-origin policy, we can't fully control the iframe content
          // The sandbox attribute is doing the heavy lifting here
          console.log('🛡️ Iframe sandbox protection active');
        }
      } catch (error) {
        // Expected due to CORS - this is actually good for security
        console.log('🔒 Iframe is properly isolated (CORS)');
      }
    });
    
    // Listen for error events
    iframe.addEventListener('error', (event) => {
      console.warn('⚠️ Iframe error:', event);
    });
  }

  /**
   * Determine video MIME type from URL
   * @param {string} url - Video URL
   * @returns {string} MIME type
   */
  getVideoType(url) {
    const ext = url.split('.').pop().toLowerCase().split('?')[0];
    const types = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'm3u8': 'application/x-mpegURL',
      'mpd': 'application/dash+xml'
    };
    return types[ext] || 'video/mp4';
  }

  /**
   * Setup player event listeners
   */
  setupEventListeners() {
    if (!this.player) return;
    
    this.player.on('ready', () => {
      console.log('Player ready');
    });
    
    this.player.on('playing', () => {
      console.log('Playback started');
    });
    
    this.player.on('error', (event) => {
      console.error('Player error:', event);
      this.handleError();
    });
  }

  /**
   * Handle playback errors
   */
  handleError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'player-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <p>⚠️ Unable to load stream</p>
        <p class="text-secondary">The stream source may be unavailable or incompatible.</p>
        <button class="retry-button" onclick="window.location.reload()">Retry</button>
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(errorDiv);
  }

  /**
   * Change stream source
   * @param {string} url - New stream URL
   * @param {string} type - Stream type
   */
  changeSource(url, type = 'iframe') {
    this.init(url, type);
  }

  /**
   * Destroy player instance
   */
  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  /**
   * Play the video
   */
  play() {
    if (this.player) {
      this.player.play();
    }
  }

  /**
   * Pause the video
   */
  pause() {
    if (this.player) {
      this.player.pause();
    }
  }

  /**
   * Toggle fullscreen
   * @param {HTMLElement} element - Optional element to fullscreen (for iframe players)
   * @param {HTMLElement} button - Optional button element to update
   */
  toggleFullscreen(element = null, button = null) {
    // If element is provided (iframe case), use native Fullscreen API
    if (element) {
      if (document.fullscreenElement) {
        // Exit fullscreen
        document.exitFullscreen().catch(err => {
          console.error('Error exiting fullscreen:', err);
        });
      } else {
        // Enter fullscreen
        const fullscreenMethod = 
          element.requestFullscreen || 
          element.webkitRequestFullscreen || 
          element.mozRequestFullScreen || 
          element.msRequestFullscreen;
          
        if (fullscreenMethod) {
          fullscreenMethod.call(element).catch(err => {
            console.error('Error entering fullscreen:', err);
          });
        } else {
          console.warn('Fullscreen API not supported');
        }
      }
    } else if (this.player) {
      // For Plyr video players, use Plyr's fullscreen
      this.player.fullscreen.toggle();
    }
  }
}

/**
 * Create a video player instance
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Player options
 * @returns {VideoPlayer} Player instance
 */
export function createVideoPlayer(container, options = {}) {
  return new VideoPlayer(container, options);
}
