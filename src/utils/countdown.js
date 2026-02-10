/**
 * Countdown Timer Utility
 * Calculate and format time remaining until a target date
 */

/**
 * Calculate time difference between now and target date
 * @param {Date|string} targetDate - Target date/time
 * @returns {Object} Time components (days, hours, minutes, seconds, total milliseconds)
 */
export function calculateTimeRemaining(targetDate) {
  const target = new Date(targetDate);
  const now = new Date();
  const difference = target.getTime() - now.getTime();
  
  // If target is in the past, return zeros
  if (difference <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    };
  }
  
  const seconds = Math.floor((difference / 1000) % 60);
  const minutes = Math.floor((difference / 1000 / 60) % 60);
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  
  return {
    total: difference,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false
  };
}

/**
 * Format countdown as D:HH:MM:SS
 * @param {Object} timeRemaining - Object from calculateTimeRemaining
 * @returns {string} Formatted countdown string
 */
export function formatCountdown(timeRemaining) {
  if (timeRemaining.isExpired) {
    return '0:00:00:00';
  }
  
  const { days, hours, minutes, seconds } = timeRemaining;
  
  const pad = (num) => String(num).padStart(2, '0');
  
  return `${days}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Get human-readable time remaining message
 * @param {Object} timeRemaining - Object from calculateTimeRemaining
 * @returns {string} Human-readable message
 */
export function getCountdownMessage(timeRemaining) {
  if (timeRemaining.isExpired) {
    return 'Game time!';
  }
  
  const { days, hours, minutes } = timeRemaining;
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  } else {
    return 'Starting soon!';
  }
}

/**
 * Create a countdown timer that updates automatically
 * @param {Date|string} targetDate - Target date/time
 * @param {Function} callback - Function to call on each update
 * @returns {Object} Timer control object with stop() method
 */
export function createCountdownTimer(targetDate, callback) {
  let intervalId = null;
  
  const update = () => {
    const timeRemaining = calculateTimeRemaining(targetDate);
    callback(timeRemaining);
    
    // Stop timer when expired
    if (timeRemaining.isExpired && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  
  // Initial update
  update();
  
  // Update every second
  intervalId = setInterval(update, 1000);
  
  return {
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
}
