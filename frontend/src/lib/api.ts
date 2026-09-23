/**
 * MediCall Backend API Client
 *
 * Connects directly to the Express + SQLite backend at http://localhost:3000.
 * Supports retries with timeout and resilient offline handling.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' ? '/api/backend' : 'http://127.0.0.1:3000');

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 1,
  backoff = 400
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);
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
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/status-check`, {}, 0);
    if (!res.ok) return { status: 'offline', timestamp: new Date().toISOString() };
    return await res.json();
  } catch {
    return { status: 'offline', timestamp: new Date().toISOString() };
  }
}

// 2. Patients API
export async function fetchPatients() {
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/patients`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.patients || [];
  } catch (err: any) {
    console.warn('[API Notice]: Could not reach /patients, switching to local preview mode.');
    return null;
  }
}

export async function fetchPatientDetail(id: number) {
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.patient || null;
  } catch {
    return null;
  }
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
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/medications`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.medications || [];
  } catch {
    return null;
  }
}

export async function createMedication(
  patientId: number,
  payload: {
    drug_name: string;
    instruction_source: 'template' | 'recorded';
    dosage_template_id?: number | null;
    frequency_template_id?: number | null;
    timing_template_id?: number | null;
    dosage_label?: string;
    frequency_label?: string;
    timing_label?: string;
    assembled_twi?: string;
    schedule_times: string;
    duration_days: number;
    is_chronic?: boolean;
    audioFile?: File | null;
    language?: 'twi' | 'english';
  }
) {
  let body: any;
  let headers: Record<string, string> = {};

  if (payload.instruction_source === 'recorded' && payload.audioFile) {
    const formData = new FormData();
    formData.append('drug_name', payload.drug_name);
    formData.append('instruction_source', payload.instruction_source);
    formData.append('schedule_times', payload.schedule_times);
    formData.append('duration_days', String(payload.duration_days));
    formData.append('is_chronic', String(Boolean(payload.is_chronic)));
    if (payload.language) formData.append('language', payload.language);
    formData.append('audio', payload.audioFile);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(payload);
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
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}/logs`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.logs || [];
  } catch {
    return null;
  }
}

// 5. Instruction Templates API
export async function fetchInstructionTemplates(category?: string) {
  try {
    const url = category
      ? `${API_BASE_URL}/instruction-templates?category=${category}`
      : `${API_BASE_URL}/instruction-templates`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.templates || [];
  } catch {
    return null;
  }
}

// 6. Escalation Alerts API
export async function fetchAlerts() {
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/alerts`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.alerts || [];
  } catch {
    return null;
  }
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

// 7. Calls API
export async function fetchTodayCalls() {
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/calls/today`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.calls || [];
  } catch {
    return null;
  }
}

export async function fetchAllCalls() {
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/calls`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.calls || [];
  } catch {
    return null;
  }
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
