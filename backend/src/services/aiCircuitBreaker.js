/**
 * MediCall AI Services Circuit Breaker & Quota Protection Guard
 * 
 * Automatically protects external AI APIs (Groq, Khaya AI, TTS Lab, Cloudinary)
 * from runaway background cron loops, credit exhaustion, and duplicate calls.
 */

let breakerState = {
  tripped: false,
  reason: '',
  trippedAt: null,
  resumeAt: 0
};

// Tracks medication IDs pre-generated today to guarantee max 1 AI run per med per day
// Key format: `${medicationId}_${YYYY-MM-DD}`
const dailyPreGenAttemptCache = new Set();

/**
 * Trips the circuit breaker and pauses background AI operations for a specified duration.
 * @param {string} reason - Human-readable reason (e.g. 'Khaya TTS 403 quota exceeded')
 * @param {number} pauseMs - Duration to pause in ms (default: 4 hours)
 */
function tripAiCircuitBreaker(reason, pauseMs = 4 * 60 * 60 * 1000) {
  breakerState = {
    tripped: true,
    reason: String(reason),
    trippedAt: new Date().toISOString(),
    resumeAt: Date.now() + pauseMs
  };
  console.warn(`🛑 [AI CIRCUIT BREAKER TRIPPED]: ${reason}. Pausing automated AI pipeline until ${new Date(breakerState.resumeAt).toLocaleTimeString()}.`);
}

/**
 * Checks whether AI operations are currently permitted.
 * Automatically clears the breaker if the pause duration has elapsed.
 */
function checkAiCircuitBreaker() {
  if (breakerState.tripped) {
    if (Date.now() >= breakerState.resumeAt) {
      console.log(`🟢 [AI CIRCUIT BREAKER RESET]: Cooldown window expired. Resuming AI operations.`);
      breakerState.tripped = false;
      breakerState.reason = '';
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: breakerState.reason,
      trippedAt: breakerState.trippedAt,
      resumeAt: breakerState.resumeAt,
      minutesRemaining: Math.ceil((breakerState.resumeAt - Date.now()) / (60 * 1000))
    };
  }
  return { allowed: true };
}

/**
 * Manually resets the circuit breaker.
 */
function resetAiCircuitBreaker() {
  breakerState = {
    tripped: false,
    reason: '',
    trippedAt: null,
    resumeAt: 0
  };
  console.log(`🟢 [AI CIRCUIT BREAKER]: Manually reset. AI operations are active.`);
}

/**
 * Checks if a medication has already had AI audio pre-generation attempted today.
 */
function hasAttemptedPreGenToday(medicationId, dateStr = new Date().toISOString().split('T')[0]) {
  return dailyPreGenAttemptCache.has(`${medicationId}_${dateStr}`);
}

/**
 * Marks a medication as attempted for today.
 */
function markPreGenAttemptedToday(medicationId, dateStr = new Date().toISOString().split('T')[0]) {
  dailyPreGenAttemptCache.add(`${medicationId}_${dateStr}`);
}

/**
 * Returns current status object.
 */
function getAiCircuitBreakerStatus() {
  const check = checkAiCircuitBreaker();
  return {
    ...breakerState,
    ...check,
    attemptedMedicationsTodayCount: dailyPreGenAttemptCache.size
  };
}

module.exports = {
  tripAiCircuitBreaker,
  checkAiCircuitBreaker,
  resetAiCircuitBreaker,
  hasAttemptedPreGenToday,
  markPreGenAttemptedToday,
  getAiCircuitBreakerStatus
};
