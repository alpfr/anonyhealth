# AnonyHealth: User Navigation Guide

This document outlines how an end-user navigates the AnonyHealth portal to check symptoms, match with a provider, and securely manage their privacy settings.

---

## 🔒 1. Accessing the Platform

AnonyHealth is designed as a gated prototype. Upon loading the application (`http://localhost:5173` or your live URL), you will be greeted by the **Login Screen**.

1. **Prototype Access:** Enter the prototype password (e.g., `ops123`) if prompted to unlock the environment.
2. **Account Registration:** 
   - New users click **"Create an Account"**. You will be asked for an email layout and password.
   - For telehealth compliance (e.g., Maryland), you may be prompted to verify your Identity (Name, DOB, Address). *Note: This PII is isolated from your active symptom triage logic.*
3. **Sign In:** Existing users enter their Email and Password.

---

## 📱 2. Core Navigation Loop (Mobile & Embedded View)

Regardless of whether you are viewing the app on a full Desktop or a Mobile Phone, the core active window utilizes a persistent **Bottom Navigation Bar** with five key sections:

### 🏠 Dash (Dashboard)
The central hub for the patient. 
- **Confidential Activity:** Quickly type a symptom into the search bar (e.g., "I have a sore throat") and press Enter to instantly jump to the AI Chat.
- **Triage Results:** Displays your most recent symptom triage, highlighted by an urgency color code (Green, Yellow, Red).
- **Appointments:** A quick view of your next scheduled telehealth or in-person session, complete with the Provider's name and join time.

### 🔍 Find (Provider Directory)
The searchable provider list mapped to your health system.
- **Search Bar:** Type names, specialties, or keywords.
- **Filters:** Use the interactive chips at the top to filter by `Specialty`, `Mode` (e.g., Telehealth), `Language`, and `Insurance`.
- **Provider Cards:** Tap on any provider card to view their full bio, expertise, and a button to "**Start Confidentially**" (which routes you to the AI chat to pre-screen before finalizing the booking).

### 🤖 Chat (AI Symptom Triage)
The secure, encrypted AI symptom checker.
- **Interacting:** Type your symptoms naturally into the chat box. The AI (powered by Anthropic Claude) will assess your condition.
- **Severity Score:** Behind the scenes, the AI generates a clinical severity score (1-10) and logs it safely into your personal health matrix.
- **Booking:** Once the AI finishes assessing your symptoms, a prominent "**BOOK APPOINTMENT**" button appears, allowing you to hand off your anonymized summary to the selected provider.

### 👤 Register / Profile
Manage your formal telehealth identities.
- Here you can update the legal name, DOB, and physical address required for regulatory compliance during a finalized telehealth visit.

### ⚙️ Settings
Control your privacy and app experience.
- **Theme Toggle:** Switch the entire application between **Dark Mode** and **Light Mode**.
- **Data Privacy:** Toggle settings for anonymizing your activity or managing notifications.
- **Sign Out:** Securely destroy your active session token.

---

## 🕒 3. Viewing Your Health Triage History

If you want to look at previous symptom checks and their assigned urgency:
1. Navigate to the **Dash** tab.
2. Under the "Confidential Activity" search bar, click on the **HISTORY** link.
3. This opens a chronological timeline of your previous AI chats. Each entry is color-coded based on severity:
   - 🔴 **Red (Urgent):** Needs immediate attention.
   - 🟡 **Yellow (Monitored):** Needs a scheduled follow-up.
   - 🟢 **Green (Minor):** Self-care recommended.
