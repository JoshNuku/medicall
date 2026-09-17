# MediCall Backend

MediCall is a voice-call medication adherence system designed for Ghana, supporting English and Twi instruction templates and pre-recorded voice audio with Africa's Talking.

## Prerequisites

- Node.js (v20+)
- npm

## Getting Started

1. **Clone & install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and fill in your Africa's Talking credentials:
   ```bash
   cp .env.example .env
   ```
   Key variables:
   - `PORT`: Server port (default: `3000`)
   - `BASE_URL`: Publicly accessible URL (e.g. ngrok tunnel during sandbox testing)
   - `AT_API_KEY`: Africa's Talking API key
   - `AT_USERNAME`: Africa's Talking username (`sandbox` or production)
   - `AT_VOICE_PHONE_NUMBER`: Africa's Talking virtual voice number

3. **Initialize database and seed templates:**
   ```bash
   npm run init-db
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Interactive Documentation (Swagger UI)

With the server running, visit:
- **API Docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

## Africa's Talking Sandbox Voice Testing

1. Start ngrok on port 3000:
   ```bash
   ngrok http 3000
   ```
2. Update `BASE_URL` in `.env` with your ngrok HTTPS URL.
3. Configure your Africa's Talking Voice number callback URL to:
   `https://<YOUR_NGROK_DOMAIN>/voice/reminder`
4. Use the Africa's Talking Voice Sandbox or dial your test number to receive the reminder call. Keypress options:
   - `1`: Confirm dose taken
   - `2`: Dose not taken (Classic) / Side Effects (AI Mode)
   - `3`: Cost Barrier (AI Mode)
   - `4`: Forgot / Early Reminder Request (AI Mode)
   - `9`: Replay medication instruction
   - `0`: Request healthcare worker assistance

---

## 🧠 Autonomous AI Triage Architecture

MediCall uses a hybrid telephony-agent architecture designed specifically for low-latency phone interactions:

```
[Inbound/Outbound Phone Call]
           │
           ├─► 1. Instant Phone Acknowledgment (Fast & Neutral):
           │      "Thank you. Your response has been noted."
           │
           └─► 2. Asynchronous Healthcare AI Triage Agent (Groq LLM):
                  Passes full clinical context to Agent:
                  - Medication Class (Chronic e.g. Metformin vs Acute e.g. Paracetamol)
                  - Adherence history & missed doses pattern over past weeks
                  - Caregiver contact & preferred language (Twi / English)
                  - Reported Keypress / Barrier
                  │
                  ▼
                  Agent analyzes & autonomously calls tools:
                  ├─► `escalate_case` (with custom AI clinical triage summary)
                  ├─► `notifybySMS` (coordinates between caregiver, doctor, pharmacist)
                  └─► `editCronReminder` (intelligently shifts schedule windows)
```

### Why an LLM Agent vs Hardcoded Rules?
1. **Clinical Risk Stratification**: A simple `if/else` rule blindly spams the pharmacist for every single missed dose. The AI Agent assesses medication criticality: a missed dose of a critical chronic antihypertensive triggers emergency clinical escalation, while a missed routine vitamin alerts the family caregiver first.
2. **Autonomous Multi-Party Coordination**: The Agent autonomously selects the right recipient for interventions (Caregiver vs Pharmacist vs Community Health Worker) with tailored symptom and barrier summaries.
3. **Adaptive Adherence Memory**: The Agent maintains long-term conversational memory across weeks, enabling empathetic, personalized reminders that adapt to patient lifestyle changes.

