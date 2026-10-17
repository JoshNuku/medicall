# MediCall Presentation Diagrams (Slide-Ready)

These diagrams are minimal, clear, and horizontal, designed to fit cleanly on standard 16:9 PowerPoint presentation slides without emojis or visual clutter.

---

## Slide 1: User Flowchart

```mermaid
flowchart LR
    classDef blue fill:#EBF3FE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A;
    classDef yellow fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef green fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef red fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#991B1B;

    subgraph S1 ["1. Prescription"]
        A["Pharmacist Enrolls Patient<br/>& Sets Schedule"]:::blue
    end

    subgraph S2 ["2. Call Outreach"]
        B["MediCall Dials Patient<br/>Plays Asante Twi Audio"]:::yellow
    end

    subgraph S3 ["3. Patient Keypad"]
        C{"Keypress"}:::yellow
        D["Key 1: Confirmed"]:::green
        E["Key 2/3/0: Issue / Help"]:::red
    end

    subgraph S4 ["4. Live Outcome"]
        F["Adherence Logged (+1)<br/>Goal: 85% Target"]:::green
        G["Escalation Flagged<br/>for Pharmacist"]:::red
    end

    A --> B --> C
    C -->|Taken| D --> F
    C -->|Barrier| E --> G
```

### Presentation Talking Points
* **Prescription:** Pharmacist registers patient details, medication regimen, and language preference (Asante Twi / English).
* **Automated Voice Check:** The system calls automatically at the patient's exact scheduled time.
* **Accessible Keypad:** Patients do not need literacy skills; they listen in Asante Twi and press 1 to confirm.
* **Closed-Loop Action:** Confirmations update adherence statistics; reported side effects or cost issues alert the pharmacist for follow-up.

---

## Slide 2: Sequence Diagram (Call Lifecycle)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Pharmacist
    participant Server as MediCall API
    participant AI as AI Engine (Khaya + HCI Lab)
    participant Telco as Africa's Talking
    actor Patient as Patient Phone

    Staff->>Server: Scheduled dose time reached
    Server->>AI: Translate to Twi (Khaya) & Synthesize Voice (HCI Lab)
    AI-->>Server: Return Asante Twi Audio URL
    Server->>Telco: Dial patient's phone
    Telco->>Patient: Call rings & plays Asante Twi reminder
    Patient->>Telco: Patient presses '1' (Dose confirmed)
    Telco->>Server: Webhook response (Dose Confirmed)
    Server-->>Staff: Live Dashboard updates (+1 confirmed, 85% goal)
```

### Presentation Talking Points
* **Zero Latency:** Pre-generated audio and cached templates allow immediate phone playback.
* **Localization Pipeline:** Khaya AI translates English clinical guidance to natural Asante Twi, and HCI Lab synthesizes native-sounding speech.
* **Instant Feedback:** DTMF keypress 1 is instantly captured by Africa's Talking and reflected on the clinic dashboard.

---

## Slide 3: System Architecture

```mermaid
graph LR
    classDef client fill:#EBF3FE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A;
    classDef backend fill:#F3E8FF,stroke:#9333EA,stroke-width:2px,color:#581C87;
    classDef ai fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef telco fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;

    subgraph UI ["1. Frontend"]
        Dash["Next.js Web Dashboard<br/>(TypeScript & Tailwind)"]:::client
    end

    subgraph Core ["2. Core Backend & DB"]
        API["Node.js Express API<br/>• Cron Adherence Engine<br/>• Neon Postgres / SQLite"]:::backend
    end

    subgraph AI_Layer ["3. AI & Speech Engine"]
        Groq["Groq LLM<br/>(Clinical Agent)"]:::ai
        Khaya["Khaya AI<br/>(En ↔ Twi Translation)"]:::ai
        HCILab["HCI Lab Engine<br/>• TTS (Twi Voice)<br/>• ASR (Speech Recognition)"]:::ai

        Groq --> Khaya --> HCILab
    end

    subgraph Telco_Layer ["4. Telephony & Patient"]
        AT["Africa's Talking IVR<br/>+ Cloudinary Audio CDN"]:::telco
        Phone["Patient Phone<br/>(Any Feature Phone / Mobile)"]:::telco

        AT <--> Phone
    end

    Dash <==> Core
    Core <==> AI_Layer
    Core <==> Telco_Layer
```

### Presentation Talking Points
* **Layer 1 (Frontend):** Modern web dashboard built in Next.js for Ghanaian pharmacists.
* **Layer 2 (Core Backend):** Express server and Neon PostgreSQL orchestrating adherence tracking, retries, and offline SQLite resilience.
* **Layer 3 (AI & Speech):** Groq personalizes the clinical context, Khaya AI handles English-to-Twi translation, and HCI Lab powers both Asante Twi Text-to-Speech (TTS) and voice recognition (ASR).
* **Layer 4 (Telephony):** Africa's Talking connects directly over standard cellular voice networks (MTN, Telecel, AT) to reach any basic phone without internet.
