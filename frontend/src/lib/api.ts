/**
 * MediCall Backend API Client
 *
 * Connects directly to the Express + SQLite backend at http://localhost:3000.
 * Supports retries with exponential backoff and structured error reporting.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' ? '/api/backend' : 'http://127.0.0.1:3000');

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
    throw err;
  }
}

// 1. Health Check
export async function checkBackendHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetchWithRetry(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed with HTTP ${res.status}`);
  return res.json();
}

// 2. Patients API
export async function fetchPatients() {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients`);
  if (!res.ok) throw new Error(`Failed to load patients (HTTP ${res.status})`);
  const data = await res.json();
  return data.patients || [];
}

export async function fetchPatientDetail(id: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to load patient #${id} (HTTP ${res.status})`);
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
    throw new Error(errData.error || `Failed to enroll patient (HTTP ${res.status})`);
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
    throw new Error(errData.error || `Failed to update patient #${id} (HTTP ${res.status})`);
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
    throw new Error(errData.error || `Failed to delete patient #${id} (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data;
}

// 3. Medications API
export async function fetchPatientMedications(patientId: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/medications`);
  if (!res.ok) throw new Error(`Failed to load medications for patient #${patientId}`);
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
    throw new Error(errData.error || `Failed to prescribe medication (HTTP ${res.status})`);
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
    throw new Error(errData.error || `Failed to update medication (HTTP ${res.status})`);
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
    throw new Error(errData.error || `Failed to delete medication (HTTP ${res.status})`);
  }
  return res.json();
}

// 4. Logs API
export async function fetchPatientLogs(patientId: number) {
  const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/logs`);
  if (!res.ok) throw new Error(`Failed to load logs for patient #${patientId}`);
  const data = await res.json();
  return data.logs || [];
}

// 5. Instruction Templates API
export async function fetchInstructionTemplates(category?: string) {
  const url = category
    ? `${API_BASE_URL}/instruction-templates?category=${category}`
    : `${API_BASE_URL}/instruction-templates`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error('Failed to load instruction templates');
  const data = await res.json();
  return data.templates || [];
}

// 6. Escalation Alerts API
export async function fetchAlerts() {
  const res = await fetchWithRetry(`${API_BASE_URL}/alerts`);
  if (!res.ok) throw new Error('Failed to load alerts');
  const data = await res.json();
  return data.alerts || [];
}

export async function resolveAlertApi(alertId: number, resolvedBy: string) {
  const res = await fetchWithRetry(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolved_by: resolvedBy }),
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  const data = await res.json();
  return data.escalation;
}

// 7. Today's Calls API
export async function fetchTodayCalls() {
  const res = await fetchWithRetry(`${API_BASE_URL}/calls/today`);
  if (!res.ok) throw new Error('Failed to load today calls');
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
    throw new Error(errData.error || `Failed to trigger call (HTTP ${res.status})`);
  }
  return res.json();
}
