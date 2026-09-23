const { RETRY_NOT_TAKEN_MINUTES, RETRY_NO_ANSWER_MINUTES, COLLISION_BUFFER_MINUTES } = require('../config/constants');
const { createCallEvent } = require('../db/queries/callEvents');

const timeStringToMinutes = (hhMm) => {
  const [h, m] = hhMm.split(':').map(Number);
  return h * 60 + m;
};

const hasCollision = (retryDate, scheduleTimesStr) => {
  const retryMinutes = retryDate.getHours() * 60 + retryDate.getMinutes();
  const times = scheduleTimesStr.split(',').map(s => s.trim());

  return times.some(t => {
    const scheduledMins = timeStringToMinutes(t);
    // Collision if within 60 minutes of a later scheduled dose
    return scheduledMins > retryMinutes && (scheduledMins - retryMinutes) <= COLLISION_BUFFER_MINUTES;
  });
};

const processRetries = async (callsNeedingRetry) => {
  for (const call of callsNeedingRetry) {
    const callTime = new Date(call.actual_call_time || call.scheduled_time);
    const delayMinutes = call.outcome === 'not_taken' ? RETRY_NOT_TAKEN_MINUTES : RETRY_NO_ANSWER_MINUTES;
    const retryTime = new Date(callTime.getTime() + delayMinutes * 60 * 1000);

    // Skip retry if colliding within 60 minutes of next scheduled dose
    if (call.schedule_times && hasCollision(retryTime, call.schedule_times)) {
      continue;
    }

    await createCallEvent({
      patient_id: call.patient_id,
      medication_id: call.medication_id,
      scheduled_time: retryTime.toISOString(),
      call_type: 'retry',
      outcome: null,
      attempt_number: call.attempt_number + 1,
      dose_date: call.dose_date
    });
  }
};

module.exports = {
  processRetries,
  hasCollision
};
