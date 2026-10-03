/**
 * MediCall Backend API Client
 *
 * Connects directly to the Express + SQLite backend at http://localhost:3000.
 * Supports retries with exponential backoff and friendly offline status reporting.
 */

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes('localhost')
        ? process.env.NEXT_PUBLIC_BACKEND_URL
        : '/api/backend')
    : (process.env.BACKEND_URL || 'http://127.0.0.1:3000');

export function formatApiError(err: unknown, fallbackMessage = 'Action could not be completed'): string {
  if (!err) return fallbackMessage;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('offline') ||
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('http') ||
    lower.includes('econnrefused') ||
    lower.includes('failed to load')
  ) {
    return "You're offline";
  }
  return msg;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
  backoff = 600
): Promise<Response> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    return res;
  } catch (err: unknown) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
    }
    throw new Error('Offline — unable to reach backend server.');
  }
}

// 1. Health Check
export async function checkBackendHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetchWithRetry(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error('Offline — health check failed.');
  return res.json();
}

// 2. Patients API
export async function fetchPatients() {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients`);
  if (!res.ok) throw new Error('Offline — unable to load patients.');
  const data = await res.json();
  return data.patients || [];
}

export async function fetchPatientDetail(id: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Offline — unable to load patient details.');
  }
  const data = await res.json();
  return data.patient;
}

export async function createPatient(payload: {
  name: string;
  phone_number: string;
  preferred_language: 'twi' | 'english';
  caregiver_phone?: string | null;
}) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status >= 500) throw new Error('Offline — backend service unavailable.');
    throw new Error(errData.error || 'Could not enroll patient.');
  }
  const data = await res.json();
  return data.patient;
}

export async function updatePatientApi(
  id: number,
  payload: {
    name?: string;
    phone_number?: string;
    preferred_language?: 'twi' | 'english';
    caregiver_phone?: string | null;
  }
) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status >= 500) throw new Error('Offline — backend service unavailable.');
    throw new Error(errData.error || 'Could not update patient.');
  }
  const data = await res.json();
  return data.patient;
}

export async function deletePatientApi(id: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status >= 500) throw new Error('Offline — backend service unavailable.');
    throw new Error(errData.error || 'Could not delete patient.');
  }
  const data = await res.json();
  return data;
}

// 3. Medications API
export async function fetchPatientMedications(patientId: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/medications`);
  if (!res.ok) throw new Error('Offline — unable to load medications.');
  const data = await res.json();
  return data.medications || [];
}

export async function createMedication(
  patientId: number,
  payload: {
    drug_name: string;
    instruction_source: 'template' | 'recorded';
    dosage_template_id?: number | null;
    frequency_template_id?: number | null;
    timing_template_id?: number | null;
    schedule_times: string;
    duration_days: number;
    is_chronic?: boolean;
    audioFile?: File | null;
    language?: 'twi' | 'english';
  }
) {
  let body: BodyInit;
  let headers: HeadersInit = {};

  if (payload.audioFile) {
    const formData = new FormData();
    formData.append('drug_name', payload.drug_name);
    formData.append('instruction_source', payload.instruction_source);
    formData.append('schedule_times', payload.schedule_times);
    formData.append('duration_days', String(payload.duration_days));
    formData.append('is_chronic', String(payload.is_chronic ? 1 : 0));
    if (payload.language) formData.append('language', payload.language);
    formData.append('audio', payload.audioFile);
    body = formData;
  } else {
    body = JSON.stringify({
      drug_name: payload.drug_name,
      instruction_source: payload.instruction_source,
      dosage_template_id: payload.dosage_template_id || null,
      frequency_template_id: payload.frequency_template_id || null,
      timing_template_id: payload.timing_template_id || null,
      schedule_times: payload.schedule_times,
      duration_days: payload.duration_days,
      is_chronic: payload.is_chronic ? 1 : 0,
      language: payload.language || 'twi',
    });
    headers = { 'Content-Type': 'application/json' };
  }

  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/medications`, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status >= 500) throw new Error('Offline — backend service unavailable.');
    throw new Error(errData.error || 'Could not prescribe medication.');
  }
  const data = await res.json();
  return data.medication;
}

export async function updateMedicationApi(
  patientId: number,
  medId: number,
  payload: {
    drug_name?: string;
    schedule_times?: string;
    duration_days?: number;
    is_chronic?: boolean;
  }
) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/medications/${medId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status >= 500) throw new Error('Offline — backend service unavailable.');
    throw new Error(errData.error || 'Could not update medication.');
  }
  const data = await res.json();
  return data.medication;
}

export async function deleteMedicationApi(patientId: number, medId: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/medications/${medId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status >= 500) throw new Error('Offline — backend service unavailable.');
    throw new Error(errData.error || 'Could not delete medication.');
  }
  return res.json();
}

// 4. Logs API
export async function fetchPatientLogs(patientId: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/logs`);
  if (!res.ok) throw new Error('Offline — unable to load call history.');
  const data = await res.json();
  return data.logs || [];
}

// 5. Instruction Templates API
export async function fetchInstructionTemplates(category?: string) {
  const url = category
    ? `${API_BASE_URL}/instruction-templates?category=${category}`
    : `${API_BASE_URL}/instruction-templates`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error('Offline — unable to load templates.');
  const data = await res.json();
  return data.templates || [];
}

// 6. Escalation Alerts API
export async function fetchAlerts() {
  const res = await fetchWithRetry(`${API_BASE_URL}/alerts`);
  if (!res.ok) throw new Error('Offline — unable to load alerts.');
  const data = await res.json();
  return data.alerts || [];
}

export async function resolveAlertApi(alertId: number, resolvedBy: string) {
  const res = await fetchWithRetry(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolved_by: resolvedBy }),
  });
  if (!res.ok) {
    if (res.status >= 500) throw new Error('Offline — backend service unavailable.');
    throw new Error('Offline — could not resolve alert.');
  }
  const data = await res.json();
  return data.escalation;
}

// 7. Today's Calls API
export async function fetchTodayCalls() {
  const res = await fetchWithRetry(`${API_BASE_URL}/calls/today`);
  if (!res.ok) throw new Error('Offline — unable to load calls.');
  const data = await res.json();
  return data.calls || [];
}

// 8. Trigger Instant Demo Call
export async function triggerCallApi(payload: {
  patient_id?: number;
  phone_number?: string;
  call_type?: 'reminder' | 'diagnostic';
}) {
  const res = await fetchWithRetry(`${API_BASE_URL}/calls/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status >= 500) throw new Error('Offline — voice gateway is temporarily offline.');
    throw new Error(errData.error || 'Offline — unable to dispatch call.');
  }
  return res.json();
}

// 9. TTS Engine Provider Settings API
export async function fetchTtsProviderApi() {
  const res = await fetchWithRetry(`${API_BASE_URL}/settings/tts-provider`);
  if (!res.ok) throw new Error('Offline — unable to load TTS settings.');
  return res.json();
}

export async function updateTtsProviderApi(provider: 'lab' | 'khaya') {
  const res = await fetchWithRetry(`${API_BASE_URL}/settings/tts-provider`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to switch TTS provider.');
  }
  return res.json();
}

export async function testTtsProviderApi(provider: 'lab' | 'khaya', text?: string) {
  const res = await fetchWithRetry(`${API_BASE_URL}/settings/tts-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, text }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to test TTS provider.');
  }
  return res.json();
}

export interface SystemHealthData {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  latencyMs: number;
  services: {
    database: {
      status: string;
      type: string;
      latencyMs: number | null;
      counts: {
        patients: number;
        openAlerts: number;
        callsToday: number;
      };
    };
    cloudinary: {
      status: string;
      cloudName: string;
      preUploadedAssetsCount: number;
      cdnDomain: string;
    };
    ttsEngine: {
      status: string;
      activeProvider: string;
      availableProviders: string[];
    };
    telephony: {
      status: string;
      provider: string;
      voiceNumber: string;
    };
    aiAgent: {
      enabled: boolean;
      provider: string;
      model: string;
    };
  };
}

export async function fetchSystemDiagnostics(): Promise<SystemHealthData> {
  const res = await fetchWithRetry(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error('Failed to retrieve system diagnostics.');
  return res.json();
}

export async function simulateVoiceWebhookApi(payload: {
  scenario: string;
  patient_id?: number;
  call_event_id?: number;
  dtmf_digits?: string;
}) {
  const res = await fetchWithRetry(`${API_BASE_URL}/voice/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Simulation failed.');
  return res.json();
}

