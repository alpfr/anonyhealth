# AnonyHealth: Technical Design Document

This document outlines the user interface, experience goals, and functional styling strategy of the AnonyHealth application. 

**Core Design Philosophy:** Privacy through structure. The app aims to immediately establish trust by displaying clear, clinical boundaries and anonymous pathways for care directly beside the telehealth triage framework.

## 1. UI Layout Strategy
The application breaks the mold of standard full-width web apps by utilizing a modern **Split-View Architecture**.

- **Desktop (Split View):** The left pane presents an interactive phone emulator, providing a mobile-first user experience. The right pane displays the active module (Dashboard, Directory, AI Chat, History). This split reinforces that it acts as an embedded telehealth application without forcing mobile CSS limits on desktop displays.
- **Mobile Mode:** Purely fluid responsive behavior using CSS Flexbox.

## 2. Typographical Hierarchy

Typography uses two highly legible Google Web Fonts, designed specifically for screen optimization and a modern clinical feel.

- **Primary Headings & Titles (`Instrument Serif`):** Emulating high-end editorial and formal medical documentation, providing authority to the copilot results.
- **Body Content & UI Elements (`Outfit`):** A geometric sans-serif that ensures rapid readability of dense symptom data, chat messages, and patient history logs.

## 3. Thematic Design (CSS Variables & Mode)

A consistent application of Light & Dark modes is critical for patients entering the portal during late-night emergencies or discrete conditions. The CSS relies heavily on native variables in `index.css`:

```css
:root {
  color-scheme: light dark;
  background-color: #242424; /* Base dark */
}
@media (prefers-color-scheme: light) {
  :root {
    background-color: #ffffff;
  }
}
```

## 4. Feature Flow Implementation

### Symptom Triage (AI Chat)
- Real-time streaming interface mimicking modern messaging architectures (iApps).
- Displays clear "Encrypted Session" badges.
- Automatically captures the AI's generated JSON schema representing symptom "Severity" to assign triage colors instantly without needing a full reload.

### Health History Matrix
A timeline view rendering triage scores through a severity color map that instantly communicates urgency to providers handling the hand-off.
- **Red:** Urgent, emergency intervention recommended.
- **Yellow:** Monitored, scheduled follow-up.
- **Green:** Minor, active self-care.

### Provider Match (Directory)
Filterable chips (e.g. Telehealth Only, Accepting New Patients) designed as highly clickable, interactive pills. Search leverages simple fuzzy-matching on provider bio text.
