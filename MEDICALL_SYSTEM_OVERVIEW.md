# MediCall — Voice-Call Medication Adherence Platform

> **A human-centered healthcare platform delivering automated voice reminders, native Ghanaian language intelligence (Khaya AI), and autonomous clinical agent triage to ensure vulnerable and disabled patients never miss life-saving medication.**

---

## 1. Executive Summary

### The Problem
In Ghana and across Sub-Saharan Africa, millions of patients living with chronic conditions (such as hypertension and diabetes) or acute illnesses (such as malaria and bacterial infections) struggle to complete their prescribed medication regimens. 

Key real-world barriers include:
1. **Language & Literacy Barriers**: Many patients cannot read English prescription labels printed on drug packaging.
2. **Device Constraints**: The vast majority of vulnerable patients use basic feature phones ("yam phones"), meaning smartphone apps, WhatsApp bots, and web portals are completely inaccessible to them.
3. **Disability & Impairment**: Blind patients cannot read packaging, speech-impaired patients cannot communicate with speech recognition bots, and the elderly frequently forget complex schedules.
4. **Cost, Side Effects & Geographic Isolation**: Patients in rural areas often stop taking medications because of unexpected side effects, running out of money, or distance from the clinic, leaving healthcare workers with zero visibility until the patient relapses in the hospital.

### The MediCall Solution
**MediCall** bridges this gap through **automated, interactive voice phone calls** placed directly to any standard mobile phone in Ghana:
- **Speaks the patient's language via Khaya AI**: Delivers verified medical audio instructions in **Twi** (or English).
- **Simple keypad interaction**: The patient simply presses **1** if they took their medicine or **2** if they didn't (no speech or reading required).
- **Autonomous AI Agent reasoning**: If a patient misses a dose, an AI diagnostic agent evaluates the patient's medical history, initiates diagnostic calls, and uncovers root causes (*cost, side effects, forgetting*).
- **Proactive clinical escalations**: Automatically notifies pharmacists and community health workers when a patient needs urgent clinical attention or caregiver intervention.

```
┌─────────────────────────┐       ┌──────────────────────────────┐       ┌─────────────────────────┐
│ Patient Enrolled        │ ───▶ │ Automated Voice Call (IVR)   │ ───▶ │ AI Agent & Clinician    │
│ • Clinic or Pharmacy    │       │ • Twi Audio via Khaya AI     │       │ • Autonomous Reasoning  │
│ • Yam / Feature Phone   │       │ • Simple Keypress (1 or 2)   │       │ • Urgent Escalations    │
└─────────────────────────┘       └──────────────────────────────┘       └─────────────────────────┘
```

---

## 2. Universal Design: Built for the Disabled, Illiterate & Rural Communities

MediCall is intentionally architected from the ground up for patients that mainstream healthcare software leaves behind:

```
                  ┌────────────────────────────────────────────────────────┐
                  │          UNIVERSAL INCLUSIVE DESIGN IN MEDICALL        │
                  └────────────────────────────────────────────────────────┘
                                              │
         ┌───────────────────┬────────────────┴───────────────────┬───────────────────┐
         ▼                   ▼                                    ▼                   ▼
   🦯 Visually Impaired   🔇 Speech Impaired                 📖 Illiterate /      🌾 Rural & Low
       & Blind              & Mute                               Non-English         Connectivity
   ────────────────────  ──────────────────                  ──────────────────   ──────────────────
   • 100% Spoken voice   • No talking needed                 • Spoken Twi audio   • 2G GSM cellular
     prompts in Twi        at all                              via Khaya AI       • Works on basic
   • Physical keypad     • Single touch on keypad            • No reading or        "yam" button phones
     tactile '5' bump      '1' (Yes) or '2' (No)               text decoding      • Multi-day battery
     locates buttons     • Reliable DTMF signal              • Warm human voice   • Caregiver proxy
```

### 1. 🦯 Visually Impaired & Blind Patients
* **No screens or reading**: Patients never need to decipher small pill bottles, package inserts, or SMS text messages.
* **Pure Audio Experience**: When their phone rings, answering the call immediately plays clear, natural spoken instructions in their native mother tongue (Twi or English).
* **Tactile Keypad Navigation**: Traditional feature phones ("yam phones") feature an international standard raised tactile bump on the number **5** key. Visually impaired individuals use this tactile anchor to instantly press **1** (top-left) to confirm or **2** (top-middle) to report an issue, without needing any vision.

### 2. 🔇 Speech-Impaired Patients
* **Zero Voice Recognition Required**: Conversational voice bots fail speech-impaired patients or those with severe accents, stutters, or vocal cord damage.
* **Dual-Tone Keypress Interaction (DTMF)**: MediCall requires **zero vocalization**. The patient communicates their medication status with a single tactile touch of the phone's physical keypad. The telecom network transmits the exact electronic tone directly to our server with 100% accuracy.

### 3. 📖 Illiterate & Non-English Speaking Populations
* **Bypassing the Written Word**: In Ghana, millions of adults are orally fluent in Akan/Twi or other local languages but cannot read or write English text. Standard SMS reminder programs fail because patients cannot read the incoming texts.
* **Mother-Tongue Clinical Audio Powered by Khaya AI**: MediCall delivers warm, conversational, culturally respectful Twi voice instructions. Patients hear clinical guidance articulated the exact same way their family doctor or pharmacist would speak to them in person.

### 4. 👴 Elderly Patients & Mild Cognitive Decline
* **Scheduled Routine**: The phone rings at the exact designated time every day (e.g., 8:00 AM after breakfast), acting as an external, automated biological clock.
* **Caregiver Notification Fallback**: When an elderly patient misses doses repeatedly, the AI Agent automatically sends an SMS alert to their designated family caregiver (*e.g., "Madam Akosua has missed her blood pressure medicine today, please check on her"*), creating an unbroken circle of care.

### 5. 🌾 Rural Communities & Extreme Infrastructure Constraints
* **Works on 2G / GSM Telecom**: Rural villages in Ghana frequently lack 3G, 4G, 5G, or fiber internet. MediCall operates entirely over standard cellular voice channels. If a phone can make a regular phone call, MediCall works.
* **No Data Bundles or Airtime Needed**: The patient does not pay for the call. MediCall's backend initiates the outbound call; answering the phone is 100% free for the patient.
* **Yam-Phone ("Feature Phone") Optimized**: Basic Nokia-style button phones cost less than $12, survive heavy dust, and have battery lives lasting 5 to 7 days on a single charge—vital in areas experiencing intermittent electricity or power outages ("dumsor").

---

## 3. Simplified Patient Journey Flow

From pharmacy enrollment to automated daily check-in calls and clinician action:

![MediCall Simplified Patient Journey Flow](./docs/diagrams/diagram_1_patient_flow.svg)

---

## 4. Interactive Voice Call Sequence

How the telecom network, MediCall backend, and clinician portal interact during a live phone call:

![MediCall Interactive Voice Call Sequence](./docs/diagrams/diagram_2_call_sequence.svg)

---

## 5. Spotlights: The MediCall AI Agent & Khaya AI

Combining autonomous clinical context reasoning with native Ghanaian language intelligence:

![MediCall AI Agent & Khaya AI Loop](./docs/diagrams/diagram_3_ai_agent_triage.svg)

---

## 6. System Architecture & The Tech Stack

Modular, lightweight architecture designed for clinical glanceability and telecom reliability:

![MediCall System Architecture](./docs/diagrams/diagram_4_architecture.svg)

### Deep-Dive: Technology Choices & Strategic Justification

| Technology | Role | Why We Chose It (The "Why") |
|---|---|---|
| **Africa's Talking** | Telecom & IVR Gateway | Unlike Western providers (Twilio, Vonage) that experience carrier drop rates or high costs in Ghana, Africa's Talking has **direct carrier interconnections with MTN Ghana, Telecel, and AT**, with native support for DTMF keypad capture over 2G voice channels. |
| **Khaya AI** | Ghanaian Indigenous NLP | Mainstream AI models (OpenAI, Google) mispronounce or mistranslate Akan/Twi medical instructions. Khaya AI is natively trained on Ghanaian languages and cultural speech patterns. |
| **MediCall AI Agent (Groq Llama 3)** | Autonomous Clinical Triage | Groq's Language Processing Units (LPUs) provide near-instantaneous inference (<500ms). The agent can assemble patient context and execute clinical tools (*trigger diagnostic call, alert caregiver, create escalation*) without introducing lag on phone calls. |
| **Node.js & Express** | Core Backend Engine | **Asynchronous Non-Blocking I/O**: Handles hundreds of simultaneous outbound reminder calls at 8:00 AM and concurrent telecom webhook callbacks without thread starvation. |
| **Next.js 16 & React 19** | Clinician Web Portal | Delivers sub-second transitions between patient charts and active alerts without full page reloads, responsive across both desktop monitors and nurses' hospital ward tablets. |
| **SQLite** | Embedded Database | **Zero-latency & zero-configuration**: Runs directly within the backend process for sub-millisecond queries; enables "clinic-in-a-box" deployments in rural health centers without needing a heavy database server. |
| **Outfit Typography** | Strict Design System | Enforces high-contrast clinical readability, warmth, and immediate glanceability (e.g., Vibrant Green for ≥ 80% adherence; Solid Dark Orange for < 80% attention). |

---

## 7. Key Components We Have Built

### 1. Daily Clinical Dashboard (`/dashboard`)
Designed specifically for busy healthcare workers to answer four vital questions in under 5 seconds:
* **How are my patients doing?** Immediate overall adherence rate (e.g. `87%`), trending comparisons, and weekly dose bar charts.
* **What calls happened today?** Live counter of today's reminder calls, broken down into confirmed doses, pending retries, and missed calls.
* **Who needs attention?** Prominently highlights open alerts and patients whose adherence rate has dropped below clinical targets (< 80%).
* **What should I do next?** One-click triage list showing patients waiting for intervention.

### 2. Patient Profile & Adherence Center (`/patients/[id]`)
Each patient has a dedicated, uncluttered medical profile:
* **Adherence Hero Indicator**: 
  * Displays **Vibrant Green** when adherence is healthy (≥ 80%).
  * Transitions to **Solid Dark Orange** with clear *"Needs attention"* cues when adherence drops below 80%.
* **Active Regimens**: Displays active medications with daily reminder times, duration countdown, and language badges.
* **Custom Audio Waveform Player**: Allows clinicians to preview the exact audio the patient hears on their phone, including waveform animations, spoken scripts, and language tags.
* **Call Timeline**: Chronological log of every automated call placed to the patient, showing timestamps, call types (*reminder, retry, diagnostic*), outcomes (*confirmed, not taken, no answer*), and diagnostic feedback.
* **Instant Action Modals**: Clinicians can trigger on-demand live calls (*Reminder Call* or *Diagnostic Call*) straight to the patient's phone.

### 3. Safe Medical Prescription Engine (Two Strict Modes)
To guarantee patient safety and avoid dangerous automated translation errors, MediCall enforces two verified modes:
1. **Verified Template Mode (`instruction_source = template`)**:
   * Pharmacists select standard medical dosage, frequency, and timing templates.
   * Uses human-verified, pre-recorded Twi voice templates reviewed by clinical linguists via Khaya AI. 
   * **Never relies on raw machine translation for drug dosages.**
2. **Recorded Mode (`instruction_source = recorded`)**:
   * For unique or complex instructions, the pharmacist records or uploads their own voice note in the patient's dialect.
   * Stored securely and scheduled for automated phone delivery.

### 4. Smart Escalation & Alert Management (`/alerts`)
Instead of letting missed doses go unnoticed, the system categorizes patient barriers into human-readable alerts:
* **Cost Barrier** *(e.g. Patient ran out of money to buy medication refills)*
* **Severe Side Effects** *(e.g. Nausea, dizziness, allergy concerns)*
* **Repeated Forgetting** *(e.g. Cognitive impairment, schedule conflict)*
* **Multiple Missed Doses** *(e.g. Unreachable for multiple consecutive days)*
* **Help Requested** *(e.g. Patient requested a phone call back)*

**Resolution Workflow**: Clinicians can review the escalation, contact the patient or caregiver, enter clinical resolution notes, and resolve the alert with a full audit log.

---

## 8. Real-World Personas: How MediCall Is Used

### 1. Kofi — The Community Pharmacist in Kumasi
* **Goal**: Wants to ensure patients actually finish their full 7-day antibiotic course or stay compliant with blood pressure pills.
* **In MediCall**: Enrolls patient in 30 seconds with just their name, Ghanaian phone number, and preferred language (Twi). Chooses a verified Twi instruction template powered by Khaya AI. MediCall handles the calls automatically every day at 8:00 AM and 8:00 PM.

### 2. Akosua — The 62-Year-Old Hypertensive Patient
* **Profile**: Lives in a rural district, has visual impairment (cataracts), cannot read English, uses a basic Nokia feature phone.
* **Experience**: Her phone rings at 8:00 AM every morning. She answers and hears a gentle voice in Twi: *"Akosua, it is time for your blood pressure tablet. If you have swallowed it, press 1. If not, press 2."* She feels the raised bump on the '5' key, reaches up to press 1. The phone says *"Medaase, dose confirmed"*. Done.

### 3. Ama — The Health Worker on Duty
* **Goal**: Catch dropouts before they land in emergency care.
* **In MediCall**: Checks `/alerts` in the morning. Notices an alert: *"Akosua reported Side Effects (Dizziness)"* created by the MediCall AI Agent. Ama calls Akosua's doctor to adjust the dosage, calls Akosua to reassure her, and marks the alert resolved.

---

## 9. Safety, Reliability & Quality Principles

| Principle | Implementation |
|---|---|
| **No Dangerous Translations** | Dose instructions are never translated via raw automated AI; only pre-verified clinical templates or direct pharmacist recordings are played. |
| **Offline & Yam-Phone Support** | Patients require no mobile data, no internet access, and no smartphone. Any cellular 2G/3G network in Ghana works. |
| **Indigenous Language Respect** | Khaya AI ensures proper Akan/Twi grammar, medical phrasing, and respectful tone for local patients. |
| **Agentic Clinical Triage** | Autonomous agent analyzes root causes (*cost, side effects, forgetting*) instead of sending generic notifications. |
| **Universal Accessibility** | Built for blind, speech-impaired, illiterate, and elderly populations through spoken audio and tactile keypresses. |
| **Full Audit Trail** | Every ring, retry, keypress, and clinician resolution note is timestamped in the database. |
| **Clean Separation of Concerns** | The frontend presentation layer is fully decoupled from the telecommunications and database layers, allowing future scaling to regional hospital record systems. |

---

*MediCall — Transforming medication adherence from an invisible blind spot into a connected, compassionate healthcare routine.*
