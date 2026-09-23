# MediCall AI Agent

## 📖 The Story: How MediCall Helps Grandma Adwoa

**Grandma Adwoa**. She lives in a rural town in Ghana and takes blood pressure medicine twice every day—once in the morning and once in the evening.

Grandma doesn't have a smartphone, and she doesn't read or write English fluently. But she has a simple keypad phone.

Here is what happens when MediCall cares for her:

1. **The Morning Call in Her Mother Tongue (Twi)**:
   Every morning at 8:00 AM, Grandma's phone rings. When she picks up, a warm, familiar voice speaks to her in Twi:

   - **The Simple Menu on the Call**:
     > _"Hello Grandma Adwoa, remember to take your Paracetamol now. Press 1 to confirm you are taking it now, Press 2 for side effects, Press 3 for cost issues, or Press 4 for an earlier reminder."_

2. **What Happens Based on Her Keypress**:
   - **Presses 1 (Taking Dose Now)**: Confirmed! Her adherence record updates.
   - If Grandma is busy at the local market and misses her dose, MediCall calls back and gently asks why. If she presses `3` ("I forgot"), MediCall doesn't just hang up:
     - **MediCall learns and adapts**: Starting tomorrow, MediCall calls her at **7:50 AM** (10 minutes before) as a gentle heads-up, and again at **8:00 AM**.

3. **If She Has Bad Side Effects or Runs Out of Money**:
   If Grandma presses `2` ("This pill makes me dizzy") or `1` ("I cannot afford the refill this month"):
   - MediCall comforts Grandma on the call.
   - **Instant Clinician SMS**: In low-resource clinics, nurses and pharmacists don't sit in front of computer dashboards. MediCall instantly sends an SMS directly to the local community nurse and pharmacist:
     > _"URGENT ALERT: Patient Adwoa Mensah reported severe dizziness with her medication. Please check in with her."_
   - The clinic health worker immediately knows to visit or call Grandma to adjust her prescription.

---

## 🛠️ Technical Overview & ReAct Loop

Behind the scenes, the MediCall Agent uses a **ReAct (Reason + Act)** loop powered by Groq:

```
    [ Patient Voice Call / DTMF Keypress ]
                     │
                     ▼
       [ 1. Pre-loaded Patient Context ]
     (Name, Drug, Schedule, Missed Doses,
      Barriers extracted directly from SQLite)
                     │
                     ▼
          [ 2. Groq LLM Decision ]
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
  [ Tool Calls Needed? ]   [ Voice Response ]
          │                     │
          ▼                     ▼
  [ Execute Tool ]         [ Save History ]
  - escalate_case (SMS Alert)   │
  - editCronReminder (10m pre)  ▼
  - notifybySMS           [ Khaya Twi TTS ]
```

---

## 🧰 Agent Tools

### 1. `escalate_case`

- **What it does**: Logs an escalation record into the database AND immediately fires an SMS alert to the clinician/pharmacist.
- **Why SMS first**: Clinicians in rural health posts are mobile and need real-time alerts on their phones without refreshing a web dashboard.

### 2. `editCronReminder`

- **What it does**: Dynamically adjusts a medication's `schedule_times` in SQLite.
- **Adaptive Scheduling**: When a patient reports `forgot`, it calculates and adds a 10-minute early call (e.g. `08:00, 20:00` $\rightarrow$ `07:50, 08:00, 19:50, 20:00`).

### 3. `notifybySMS`

- **What it does**: Dispatches direct SMS reminders to the patient or caregiver when voice calls are inconvenient or when companion texts are requested.

---

## 🛡️ Deterministic Fallback Engine

If the Groq API key is missing or an external network failure occurs:

- The system gracefully defaults to `decisionEngine.js`.
- Africa's Talking voice calls always receive valid XML so the call is never dropped.
