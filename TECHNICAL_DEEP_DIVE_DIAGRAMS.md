# MediCall Technical Deep-Dive: Engineering Diagrams & Specifications

This document contains the detailed technical blueprints, full-sequence execution flows, and architectural specifications for the MediCall platform.

---

## 1. Detailed Multi-Service Sequence Diagram

This diagram details every step across all internal microservices and external gateways, including:
- Cron schedule matching
- Groq prompt personalization
- Khaya AI machine translation
- HCI Lab TTS synthesis and audio chunking
- Cloudinary permanent caching
- Africa's Talking XML webhook handshake
- DTMF keypress capture and real-time adherence recalculation

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient Phone
    participant AT as Africa's Talking (IVR)
    participant Backend as MediCall Express API
    participant DB as Neon PostgreSQL / SQLite
    participant Groq as Groq LLM (Clinical Agent)
    participant Khaya as Khaya AI (NLP Translation)
    participant HCILab as HCI Lab (TTS / ASR)
    participant Cloud as Cloudinary CDN
    actor Pharmacist as Pharmacist Dashboard

    Note over Backend,DB: Background Cron checks scheduled doses every minute
    Backend->>DB: Query active medications due at current time
    DB-->>Backend: Return Patient & Regimen (e.g., Amoxicillin 500mg, Asante Twi)

    alt Pre-generated or Cached Audio Not Found
        Backend->>Groq: Generate personalized English reminder prompt
        Groq-->>Backend: "Hello Victoria, friendly reminder to take Amoxicillin 500mg..."
        Backend->>Khaya: Translate English to Asante Twi (en-tw)
        Khaya-->>Backend: "Meda wo akye Victoria, MediCall nkaebɔ sɛ fa Amoxicillin..."
        Backend->>HCILab: Synthesize Twi Speech (Model: 'ss', Speaker: 'PT', Tempo: 0.88)
        HCILab-->>Backend: Return synthesized audio stream (MP3/WAV)
        Backend->>Cloud: Upload audio file permanently
        Cloud-->>Backend: Hosted URL (https://res.cloudinary.com/...)
        Backend->>DB: Save reminder_audio_url in medications table
    else Audio already cached or Template Mode
        Backend->>DB: Fetch existing verified audio URL
        DB-->>Backend: Cloudinary CDN Audio URL
    end

    Backend->>DB: Create Call Event (status: pending, dose_date: today)
    Backend->>AT: Dispatch Outbound Call (CallFrom: +233308048104, CallTo: Patient)
    AT->>Patient: Outbound Voice Call Rings

    Patient-->>AT: Answers Call
    AT->>Backend: POST /voice/reminder (Webhook with sessionId)
    Backend-->>AT: XML Response (<GetDigits timeout="10"><Play url="CDN_URL"/></GetDigits>)
    AT->>Patient: Plays Asante Twi Reminder Audio

    Patient->>AT: Presses '1' (Dose Confirmed)
    AT->>Backend: POST /voice/reminder/confirm (dtmfDigits="1", callEventId)
    Backend->>DB: UPDATE call_events SET outcome='confirmed', actual_call_time=NOW()
    Backend->>DB: Recalculate 7-day adherence rate
    Backend-->>AT: XML Response (<Play url="twi_encouragement_1.mp3"/><Hangup/>)
    AT->>Patient: "Medaase pa ara! Kɔ so bɔ mmɔden..." (Call terminates)

    Note over Pharmacist,Backend: Pharmacist Dashboard polling / refetching live updates
    Backend-->>Pharmacist: WebSocket / REST poll update (CallsCard: Confirmed, Adherence: +1)
```

---

## 2. Comprehensive 5-Tier System Architecture Blueprint

```mermaid
graph TB
    subgraph Client_Layer ["1. Presentation Layer (Frontend)"]
        UI["Next.js 15 Web Application<br/>(TypeScript, Tailwind CSS, Outfit Typography)"]
        Dash["/dashboard<br/>Daily Adherence & Live Queue"]
        Patients["/patients & /patients/:id<br/>Enrollment & Prescription UI"]
        Alerts["/alerts<br/>Clinical Escalation Queue"]
        Settings["/settings<br/>Engine Controls & Circuit Breakers"]
        UI --> Dash
        UI --> Patients
        UI --> Alerts
        UI --> Settings
    end

    subgraph API_Gateway ["2. Application & API Layer (Backend)"]
        Express["Express.js REST API Server<br/>(Node.js on Render)"]
        Cron["Cron Scheduler<br/>(1-min cycle, Retry Engine, Circuit Breaker)"]
        Decision["Decision Engine & Circuit Breaker<br/>(Rate limiter & Quota shield)"]
        VoiceRoutes["Voice Webhook Handlers<br/>(/voice/reminder, /voice/confirm, /voice/simulate)"]
        AudioService["Audio Pipeline Service<br/>(Chunking, FFmpeg tempo adjust: 0.88x)"]
        
        Express --- Cron
        Express --- Decision
        Express --- VoiceRoutes
        Express --- AudioService
    end

    subgraph Storage_Layer ["3. Database & Storage Layer"]
        Postgres[("Neon Serverless PostgreSQL<br/>(Primary Production Database)")]
        SQLite[("Embedded SQLite + WAL<br/>(Zero-Config Offline Fallback)")]
        Cloudinary[("Cloudinary CDN Storage<br/>(Templates, Voice Notes & Synthesized MP3s)")]
    end

    subgraph Telephony_Layer ["4. Telephony & Cellular Gateway"]
        AT_Voice["Africa's Talking Voice Gateway<br/>(E.164 Caller ID: +233308048104)"]
        AT_SMS["Africa's Talking SMS Gateway<br/>(Optional companion SMS alerts)"]
        Telecom["Ghana Telcos (MTN, Telecel, AT)"]
        PatientDevice["Patient Mobile Phones<br/>(Basic feature phones & Smartphones)"]
    end

    subgraph AI_NLP_Layer ["5. Specialized AI & Speech Services"]
        Groq["Groq LLM<br/>(openai/gpt-oss-120b)<br/>Context-Aware Agent Reasoning"]
        Khaya["Khaya AI (Ghana NLP v2)<br/>English ↔ Asante Twi Machine Translation"]
        HCILab_TTS["HCI Lab TTS Engine<br/>Model 'ss' (Speaker: 'PT')<br/>Natural Asante Twi Speech Synthesis"]
        HCILab_ASR["HCI Lab ASR Engine<br/>Asante Twi Speech Recognition"]
    end

    %% Flows
    UI <==>|"REST API / JSON (CORS)"| Express
    Express <==>|"pg Pool (SQL)"| Postgres
    Express -.->|"Offline Fallback Sync"| SQLite
    AudioService ==>|"Upload MP3 / WAV"| Cloudinary

    Cron ==>|"Pre-generate context"| Groq
    Groq ==>|"English text"| Khaya
    Khaya ==>|"Asante Twi text"| HCILab_TTS
    HCILab_TTS ==>|"Audio stream"| AudioService

    VoiceRoutes <==>|"Africa's Talking XML / Webhooks"| AT_Voice
    Express ==>|"Send SMS alerts"| AT_SMS
    AT_Voice <==>|"Cellular Voice Trunk"| Telecom
    AT_SMS ==>|"GSM SMS"| Telecom
    Telecom <==>|"GSM / 2G / 3G / 4G"| PatientDevice
    PatientDevice -.->|"Voice Responses (Audio)"| HCILab_ASR
    HCILab_ASR -.->|"Transcribed Text"| Decision
    Cloudinary -.->|"Stream Audio over CDN"| AT_Voice
```

---

## 3. Component Responsibility Matrix

| Component | Technology | Primary Role |
|---|---|---|
| **Frontend UI** | Next.js 15, TypeScript, Tailwind | Pharmacist workspace: enrollment, medication prescription, adherence tracking, alert resolution. |
| **API Backend** | Node.js, Express | Business logic, cron schedule evaluation, Africa's Talking IVR XML generation, circuit breaking. |
| **Database** | Neon PostgreSQL (primary) + SQLite (fallback) | Storage of patient records, active medication regimens, call event audit trail, escalation logs. |
| **Telephony Gateway** | Africa's Talking Voice API | Placing outbound voice calls from `+233308048104`, DTMF keypress parsing, call state webhooks. |
| **CDN Media Storage** | Cloudinary | Permanent storage and ultra-low latency streaming of pre-recorded and synthesized MP3 audio. |
| **Clinical Agent Reasoning** | Groq (`openai/gpt-oss-120b`) | Formulating empathetic reminder prompts and diagnosing medication adherence barriers. |
| **Translation Engine** | Khaya AI (Ghana NLP) | High-accuracy English $\leftrightarrow$ Asante Twi translation. |
| **TTS Speech Synthesis** | HCI Lab (Lab Subscription Platform) | Synthesizing Asante Twi neural speech with speaker `PT`, audio chunking, and speed tempo control (0.88x). |
| **ASR Voice Recognition** | HCI Lab ASR Platform | Transcribing spoken patient voice notes in Asante Twi into text for clinical evaluation. |
