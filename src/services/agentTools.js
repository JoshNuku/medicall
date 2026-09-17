const { createEscalation } = require('../db/queries/escalations');
const { getMedicationById, updateMedicationSchedule } = require('../db/queries/medications');
const { getPatientById } = require('../db/queries/patients');
const { sendSms } = require('./africasTalkingService');

/**
 * Calculates adaptive pre-reminder times (e.g. 10 mins before each scheduled dose).
 */
const calculateEarlyReminderTimes = (scheduleTimes, minutesBefore = 10) => {
  const times = scheduleTimes.split(',').map(t => t.trim());
  const allTimes = new Set(times);

  for (const timeStr of times) {
    const [h, m] = timeStr.split(':').map(Number);
    let totalMinutes = h * 60 + m - minutesBefore;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const earlyH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const earlyM = String(totalMinutes % 60).padStart(2, '0');
    allTimes.add(`${earlyH}:${earlyM}`);
  }

  return [...allTimes].sort().join(', ');
};

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'do_nothing',
      description: 'Invoked when the patient confirms taking their medication on time. No clinical escalation or schedule adjustment is needed.',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'integer' },
          reason: { type: 'string', description: 'Reason why no action is needed, e.g. "Dose confirmed taken on schedule"' }
        },
        required: ['patient_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'escalate_case',
      description: 'Logs an alert and instantly dispatches an SMS to the clinician/pharmacist for side effects, cost issues, or critical health barriers.',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'integer' },
          escalation_type: {
            type: 'string',
            enum: ['pharmacist_cost', 'health_worker_side_effect', 'general_attention', 'repeated_forgetting', 'patient_requested_help']
          },
          details: { type: 'string', description: 'Brief summary of the issue for the clinician' }
        },
        required: ['patient_id', 'escalation_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_sms',
      description: 'Sends an SMS reminder, patient follow-up, or alert to a patient, caregiver, or pharmacist/clinician.',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'integer' },
          recipient: { type: 'string', enum: ['patient', 'caregiver', 'pharmacist', 'clinician', 'doctor', 'health_worker'] },
          message: { type: 'string', description: 'The SMS message text to deliver' }
        },
        required: ['patient_id', 'recipient', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'notifybySMS',
      description: 'Sends an SMS alert or reminder to the patient, caregiver, or clinician.',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'integer' },
          recipient: { type: 'string', enum: ['patient', 'caregiver', 'pharmacist', 'clinician', 'doctor', 'health_worker'] },
          message: { type: 'string' }
        },
        required: ['patient_id', 'recipient', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'editCronReminder',
      description: 'Adapts the medication schedule with 10-minute pre-reminder calls when a patient forgets.',
      parameters: {
        type: 'object',
        properties: {
          medication_id: { type: 'integer' },
          mode: { type: 'string', enum: ['add_10min_pre_reminder', 'custom_schedule'] },
          custom_times: { type: 'string', description: 'Optional comma-separated HH:MM times if mode is custom' }
        },
        required: ['medication_id', 'mode']
      }
    }
  }
];

const executeTool = async (name, args) => {
  console.log(`\n======================================================`);
  console.log(`🔧 [AGENT TOOL EXECUTED] -> Tool: "${name}"`);
  console.log(`   Arguments:`, JSON.stringify(args, null, 2));

  if (name === 'do_nothing') {
    const patientId = Number(args.patient_id);
    const patient = getPatientById(patientId);
    console.log(`   Result: 🟢 Patient ${patient ? patient.name : patientId} confirmed dose taken. No clinical intervention needed.`);
    console.log(`======================================================\n`);
    return { status: 'success', action: 'none', message: 'Dose taken on schedule. Adherence recorded.' };
  }

  if (name === 'escalate_case') {
    const patientId = Number(args.patient_id);
    const patient = getPatientById(patientId);
    if (!patient) return { error: `Patient ID ${patientId} not found in database` };

    const esc = createEscalation({ patient_id: patientId, escalation_type: args.escalation_type });
    const pharmacistPhone = process.env.PHARMACIST_PHONE || '+233272806050';
    const readableIssue = (args.escalation_type || '').replace(/_/g, ' ').toUpperCase();
    const alertMessage = `🚨 [MediCall Pharmacist Alert]\nPatient: ${patient.name} (${patient.phone_number})\nIssue: ${readableIssue}\nDetails: ${args.details || 'Patient reported barrier during reminder call.'}`;

    console.log(`   Result: 🚨 Escalation #${esc.id} created (${args.escalation_type}).`);
    console.log(`   Dispatching SMS Alert to Pharmacist (${pharmacistPhone}):\n   "${alertMessage.replace(/\n/g, ' ')}"`);

    const smsResult = await sendSms(pharmacistPhone, alertMessage);
    console.log(`   Pharmacist SMS Delivery Status:`, smsResult.status);
    console.log(`======================================================\n`);
    return { status: 'escalated_and_sms_sent', escalation_id: esc.id, pharmacist_phone: pharmacistPhone, sms_status: smsResult.status };
  }

  if (name === 'send_sms' || name === 'notifybySMS') {
    const patientId = Number(args.patient_id);
    const patient = getPatientById(patientId);
    if (!patient) return { error: `Patient ID ${patientId} not found in database` };

    let targetPhone = patient.phone_number;
    if (args.recipient === 'caregiver' && patient.caregiver_phone) {
      targetPhone = patient.caregiver_phone;
    } else if (['pharmacist', 'clinician', 'doctor', 'health_worker'].includes(args.recipient)) {
      targetPhone = process.env.PHARMACIST_PHONE || patient.phone_number;
    }

    console.log(`   Result: 📩 Dispatching SMS to [${args.recipient || 'patient'}] (${targetPhone}): "${args.message}"`);
    const smsResult = await sendSms(targetPhone, args.message);
    console.log(`   Africa's Talking SMS Status:`, smsResult.status);
    console.log(`======================================================\n`);
    return { status: smsResult.status, recipient: args.recipient, phone: targetPhone, details: smsResult.data };
  }

  if (name === 'editCronReminder') {
    const medicationId = Number(args.medication_id);
    const med = getMedicationById(medicationId);
    if (!med) return { error: 'Medication not found' };
    const newSchedule = args.mode === 'add_10min_pre_reminder'
      ? calculateEarlyReminderTimes(med.schedule_times, 10)
      : (args.custom_times || med.schedule_times);

    const updated = updateMedicationSchedule(medicationId, newSchedule);
    console.log(`   Result: ⏰ Schedule adapted from "${med.schedule_times}" to "${updated.schedule_times}"`);
    console.log(`======================================================\n`);
    return { status: 'schedule_adapted', medication_id: medicationId, schedule: updated.schedule_times };
  }

  console.log(`======================================================\n`);
  return { error: `Unknown tool: ${name}` };
};

module.exports = { calculateEarlyReminderTimes, toolDefinitions, executeTool };
