2. AGENTS.md

Put this file at the root of the Next.js project.

# AGENTS.md

## MediCall Frontend — Agent Instructions

MediCall is a voice-call medication adherence platform designed for Ghanaian healthcare workers and pharmacists.

This repository contains the frontend application.

The backend already exists separately and uses Express + SQLite.

Backend:

- Base URL: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-docs`

---

# 1. Product Principles

MediCall is an MVP.

Prioritize:

1. Simplicity
2. Clarity
3. Accessibility
4. Medication adherence
5. Voice interaction
6. Patient support
7. Visual consistency

Do not turn MediCall into a generic hospital-management platform.

The primary dashboard should answer:

- How are my patients doing?
- What calls happened today?
- Who needs attention?
- What should I do next?

---

# 2. Design Philosophy

The visual language is inspired by a premium modern SaaS/fintech aesthetic.

Reference characteristics:

- Large editorial typography
- Generous whitespace
- Warm off-white backgrounds
- White surfaces
- Thin borders
- Rounded cards
- Soft pastel accents
- Minimal shadows
- Compact badges
- Small icon containers
- Asymmetric compositions
- Subtle decorative line work
- Restrained data visualization

Do not copy external branding.

MediCall should remain visually distinct.

The interface should feel:

- Calm
- Human
- Clinical
- Premium
- Modern
- Trustworthy
- Approachable

---

# 3. Typography

## STRICT RULE

Use **Outfit exclusively**.

Outfit is the only application typeface.

Do NOT use:

- IBM Plex Sans
- IBM Plex Mono
- Inter
- Roboto
- Arial
- Helvetica
- system-ui as the primary typeface

Every piece of visible interface text should use Outfit.

This includes:

- Headings
- Body
- Buttons
- Tables
- Labels
- Forms
- Badges
- Numbers
- Navigation
- Modals
- Audio controls

Use font weight to create hierarchy.

Recommended:

- 400 — body
- 500 — labels
- 600 — headings
- 700 — major numbers/headlines

Avoid excessive use of 700.

---

# 4. Color System

Use a restrained healthcare-oriented palette.

## Base

````text
Background:
warm off-white

Surface:
white

Primary text:
near-black

Secondary text:
muted neutral gray

Border:
very light neutral
Accent Families
MediCall Green

Primary positive/action color.

Use for:

Confirmed
Adherence
Active states
Primary actions
Lavender

Use for:

Informational sections
Secondary UI
Decorative surfaces
Warm Yellow

Use for:

Attention
Reminder states
Mild warnings
Soft Coral / Orange

Use for:

Alerts
Not taken
No answer
Escalation states
Blue

Use sparingly for:

Voice/audio
Informational states
Secondary interaction

Do not make every component colorful.

Most of the interface should remain neutral.

5. Status Colors
Confirmed

Meaning:
Patient confirmed dose.

Visual treatment:

Soft green background
Green text/icon
Not Taken

Meaning:
Patient pressed 2 / reported not taking medication.

Visual treatment:

Soft orange background
Orange text/icon
No Answer

Meaning:
Patient did not answer the call.

Visual treatment:

Soft coral background
Coral/red text/icon
Answered — No Keypress

Meaning:
Patient answered but did not respond.

Visual treatment:

Soft gray background
Gray text/icon
Attention

Use:

Soft yellow/orange background
Darker warning text

Never use bright saturated colors unless absolutely necessary.

6. Spacing

Use generous spacing.

Preferred rhythm:

4px
8px
12px
16px
20px
24px
32px
40px
48px
64px

Prefer consistent spacing over arbitrary values.

Major sections should have generous separation.

Do not create dense enterprise-dashboard layouts.

7. Border Radius

Use rounded interfaces.

Recommended:

Small controls:
8px

Inputs:
10–12px

Cards:
16–20px

Large feature cards:
20–24px

Pills:
9999px

Do not make every component excessively rounded.

8. Borders & Shadows

Prefer borders over heavy shadows.

Cards should generally use:

1px subtle border

Use shadows only for:

Modal
Drawer
Dropdown
Floating elements

Avoid large dark shadows.

9. Icons

Use Lucide React for interface icons if available.

Icons should be:

Simple
Consistent
Thin/medium stroke
Visually quiet

Do not use emoji as UI icons.

Examples:

Patients:
Users

Medication:
Pill

Calls:
Phone

Alerts:
TriangleAlert

Audio:
Play
Pause
Mic
Volume2

Settings:
Settings

10. Layout

The main application shell uses:

Sidebar
+
Main Content

Desktop:

┌──────────────┬───────────────────────────────┐
│              │                               │
│   Sidebar    │        Main Content           │
│              │                               │
│              │                               │
└──────────────┴───────────────────────────────┘

Sidebar should be compact.

Do not create a massive navigation panel.

11. Navigation

Primary navigation:

Overview
Patients
Alerts

Secondary:

Settings

Do not add navigation items without a product requirement.

Active navigation state should use:

subtle background
stronger text
icon
rounded shape
12. Dashboard

Route:

/dashboard

The dashboard is the primary product screen.

Required sections:

Page header
Four summary metrics
Medication adherence
Today's calls
Needs attention
Recent patients

Do not add unnecessary dashboard sections.

13. Dashboard Metrics

Only four primary metrics:

Patients
Adherence
Calls Today
Open Alerts

Metrics must remain visually restrained.

Do not create:

10+ KPI cards
giant statistics
unnecessary trend charts
financial-style analytics
14. Adherence Visualization

Keep adherence visualization simple.

Use:

seven-day bar chart
OR
seven-day line chart

Do not create complex analytics.

The main number should remain obvious:

87%
Overall adherence
15. Audio Player

Audio is an important MediCall component.

Never use browser-default audio controls as the primary design.

Create a reusable:

AudioPlayer

It should contain:

Play/pause button
Waveform
Duration
Language badge
Medication name

Example:

Twi
Amoxicillin 500mg

[ ▶ ]

▂ ▃ ▅ ▇ ▅ ▃ ▂

0:18

The audio component must be reusable across medication-related screens.

16. Patient Management

Route:

/patients

Patient fields:

id
name
phone_number
preferred_language
caregiver_phone
enrolled_at

Patient list should be clean and scannable.

Desktop:

Table.

Mobile:

Cards.

17. Enrollment

Enrollment modal fields:

name
phone_number
preferred_language
caregiver_phone

Backend endpoint for later integration:

POST /patients

Do not hardcode backend requests inside UI components.

Use a service/data layer when backend integration is introduced.

18. Patient Detail

Route:

/patients/[id]

Display:

Patient identity
Phone
Language
Adherence
Current medications
Audio
Call timeline

Keep the page focused.

Do not create unnecessary medical records.

19. Medication Prescription

A medication can ONLY use one of two instruction modes.

Template Mode
instruction_source = template

Fields:

drug_name
dosage_template_id
frequency_template_id
timing_template_id
schedule_times
duration_days
is_chronic

Templates will eventually come from:

```text
GET /instruction-templates

Never machine-translate English medication instructions into Twi.

The UI must communicate that these are verified templates.

Recorded Mode
instruction_source = recorded

Fields include:

drug_name
audio
schedule_times
duration_days
is_chronic

The pharmacist records or uploads their own Twi instruction.

20. Call Timeline

Call events contain:

scheduled_time
actual_call_time
call_type
outcome

Call types:

reminder
retry
relisten
diagnostic

Outcomes:

confirmed
not_taken
no_answer
answered_no_keypress

Diagnostic reasons:

cost
side_effects
forgot
other

Use a timeline rather than a complex analytics interface.

21. Alerts

Route:

/alerts

Backend endpoint:

GET /alerts

Alert types:

pharmacist_cost
health_worker_side_effect
repeated_forgetting
patient_requested_help
same_day_multiple_misses

Human-readable labels:

Cost barrier
Side effects
Repeated forgetting
Help requested
Multiple missed doses

Resolve action:

POST /alerts/:id/resolve

Payload:

{
  "resolved_by": "Pharmacist Name"
}
22. Data Architecture

During UI development, use mock data.

Recommended:

src/
  lib/
    mock-data.ts

Keep mock data separate from components.

Do not scatter mock objects throughout JSX.

Structure mock data to resemble the eventual API responses.

This makes API integration easier later.

23. Suggested Component Structure
src/
  app/
    dashboard/
    patients/
      [id]/
    alerts/

  components/
    layout/
      Sidebar.tsx
      MobileNav.tsx
      PageHeader.tsx

    dashboard/
      MetricCard.tsx
      AdherenceCard.tsx
      CallsCard.tsx
      AlertPreview.tsx
      RecentPatients.tsx

    patients/
      PatientTable.tsx
      PatientCard.tsx
      EnrollPatientModal.tsx
      MedicationCard.tsx
      MedicationForm.tsx
      AudioPlayer.tsx
      CallTimeline.tsx

    alerts/
      AlertTable.tsx
      AlertCard.tsx
      AlertBadge.tsx

    ui/
      Button.tsx
      Badge.tsx
      Avatar.tsx
      Modal.tsx
      Drawer.tsx
      Input.tsx
      Select.tsx
      Toggle.tsx

  lib/
    mock-data.ts
    utils.ts

Adapt this to the existing project structure rather than blindly restructuring an existing application.

24. Component Rules

Prefer small reusable components.

Avoid:

Dashboard.tsx

containing the entire dashboard.

Instead compose:

Dashboard
├── PageHeader
├── Metrics
│   └── MetricCard
├── AdherenceCard
├── CallsCard
├── AlertPreview
└── RecentPatients
25. Forms

Forms should:

have clear labels
have visible validation states
have clear focus states
use appropriate input types
avoid unnecessary fields
group related fields logically

Do not create complicated multi-step forms for the MVP.

26. Responsive Design

Desktop:

Sidebar
Two-column content
Tables

Tablet:

Reduced spacing
Flexible cards
Two-column where appropriate

Mobile:

Mobile navigation
2×2 metric grid
Single-column cards
Patient cards instead of tables
Full-width audio components

Never allow horizontal page overflow.

27. Accessibility

All UI must be accessible.

Requirements:

Semantic HTML
Proper labels
Keyboard navigation
Focus states
Accessible buttons
Accessible form controls
Reasonable color contrast

Do not communicate status through color alone.

For example:

✓ Confirmed

rather than only showing a green dot.

28. Animation

Keep animation subtle.

Allowed:

opacity transitions
drawer slide
modal transitions
button hover
card hover
audio waveform movement

Avoid:

excessive parallax
bouncing cards
dramatic page transitions
distracting animations
29. Dependencies

Prefer existing dependencies.

Recommended:

Next.js
TypeScript
Tailwind CSS
Lucide React
shadcn/ui where appropriate

Do not add dependencies without a reason.

Avoid large libraries for simple functionality.

30. Backend Integration Rules

Backend integration will happen after the UI is established.

When integration begins:

Backend base:

http://localhost:3000

Swagger:

http://localhost:3000/api-docs

Do not invent endpoint contracts.

Inspect Swagger before implementing API calls.

Never assume response shapes.

Keep API calls outside presentational components.

Recommended future structure:

src/
  lib/
    api/
      patients.ts
      medications.ts
      calls.ts
      alerts.ts
      instruction-templates.ts
31. UI vs Backend Boundary

The following belong to the frontend:

Layout
Styling
Components
Forms
Validation UI
Loading states
Empty states
Error states
Modal behavior
Drawer behavior
Audio player UI
Responsive behavior
Local interaction states

The following belong to backend integration:

API requests
Database operations
Patient persistence
Medication persistence
Alert persistence
Real call history
Real audio URLs
Template retrieval
Alert resolution

Do not mix these concerns.

32. MVP Scope Guard

Before adding a feature, ask:

Does this directly help a pharmacist understand adherence, manage patients, prescribe medication, review calls, or handle an escalation?

If not, do not add it to the MVP without a clear requirement.

Avoid:

Billing
Inventory
Appointments
Hospital administration
Complex reports
Advanced analytics
AI chat
Scheduling systems beyond medication reminders
Unrequested patient portals
33. Visual QA Checklist

Before completing UI work, verify:

[ ] Outfit is used everywhere.

[ ] No IBM Plex Sans.

[ ] No IBM Plex Mono.

[ ] No Inter.

[ ] Dashboard is visually lightweight.

[ ] Only four main metrics exist.

[ ] Adherence is immediately visible.

[ ] Alerts are easy to find.

[ ] Patient navigation is obvious.

[ ] Audio player looks custom-designed.

[ ] Status badges are consistent.

[ ] Patient detail is understandable.

[ ] Prescription has exactly two modes.

[ ] Template mode clearly indicates verified templates.

[ ] Recorded mode clearly indicates pharmacist-recorded audio.

[ ] Mobile layout works.

[ ] Empty states exist.

[ ] Loading states exist.

[ ] Error states exist.

[ ] No horizontal overflow.

[ ] Components are reusable.

[ ] Mock data is centralized.

[ ] No backend calls are hidden inside UI components.

34. Final Product Principle

MediCall should not feel like software built around databases.

It should feel like a healthcare worker's simple daily workspace.

The hierarchy should be:

PATIENTS
↓
ADHERENCE
↓
CALLS
↓
ALERTS
↓
ACTION

Keep the interface quiet enough that important information stands out.

When in doubt, simplify.


### Recommended MVP structure

I would keep the first release to just **four routes**:

| Route | Purpose |
|---|---|
| `/dashboard` | Daily overview |
| `/patients` | Patient management + enrollment |
| `/patients/[id]` | Medication + adherence + call history + prescription |
| `/alerts` | Unresolved escalations |

That keeps the MVP coherent while still covering essentially everything in your backend brief. The **medication prescription UI belongs inside Patient Detail** initially rather than becoming another top-level section.

And importantly, the frontend should be **API-ready without being API-dependent**: build the complete interface with centralized mock data now, then swap those data sources for the Express endpoints once the UI has been approved.
````

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
