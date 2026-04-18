# 🧠 FocusFlow: The Cognitive Offloader

> **Elevating Deep Work for Students & Professionals.** 
> Built for SummerHacks Hackathon '26 (MergeConflictWinz).

![FocusFlow UI Concept](https://img.shields.io/badge/Status-Active-success) ![Tech Stack](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Firebase-blue) ![AI Integration](https://img.shields.io/badge/AI-Groq%20Llama%203-purple)

---

## 🚨 The Problem

Modern students and professionals are suffering from an epidemic of **Digital Overload and Context Switching**:

1. **Inbox Anxiety:** People struggle to focus because they fear missing an urgent message. Consequently, they constantly check their emails, breaking their state of "Deep Work."
2. **Planning Paralysis:** When faced with a massive assignment or project, breaking it down into actionable steps requires immense cognitive energy, leading directly to procrastination.
3. **Ineffective Focus Tools:** Traditional Pomodoro timers are passive. They don't actively stop you from getting distracted, and they don't integrate seamlessly with the tools you actually use.

---

## 🎯 Our Solution

We didn't want to build just another Pomodoro timer. We built an **OS-level productivity environment** within the browser that actively shields the user from digital noise while doing the heavy lifting for them.

FocusFlow acts as a strict contract between you and your work. It manages your schedule, filters your distractions, and punishes your bad habits so you can use 100% of your brainpower on the actual work.

---

## 👥 Target Audience

### Primary Audience (Ages 13–40)
* **Who they are:** High school/college students, young professionals, developers, and remote workers.
* **Why them?** This demographic suffers the most from digital burnout, context switching, and notification fatigue caused by modern apps. They are actively seeking tools to enforce discipline and are eager early-adopters of AI technology to optimize their workflow and combat procrastination.

### Secondary Audience (Remaining Users / Ages 40+)
* **Who they are:** Experienced professionals, managers, and casual internet users.
* **Why them?** While they may not need an aggressive "Hard Block" to stay off TikTok, they deal with massive volumes of corporate emails and complex project scopes. They benefit immensely from the AI Email Triage and Neural Sprint Planner to save hours of administrative time.

---

## ✨ Core Features

### 1. AI Smart Email Triage (Solving Inbox Anxiety)
Instead of blocking *everything*, we integrated the **Gmail API** with the **Groq Llama-3 AI**. While the user is working:
- FocusFlow silently fetches incoming emails in the background. 
- Llama-3 reads the email, condenses it into a 1-sentence summary, and routes it into "Urgent", "Important", or "Low Priority" columns. 
- You can work peacefully knowing the AI will catch anything truly critical.

### 2. The "Hard Block" Enforcer & AI Warden
When a user enters **Hard Block** mode, we force the browser into Fullscreen. 
- **The Punishment System:** If the user loses discipline and tries to escape (hits `ESC`), we use the Web Audio API to trigger a blaring siren and flash a red "Focus Breach" screen. 
- **The AI Warden (Emergency Exit):** If there is a legitimate emergency, the user can click "Emergency AI Exit" and plead their case to the AI. If the AI deems the excuse valid (e.g., "Fire alarm"), it ends the session. If it deems the excuse weak (e.g., "I'm bored"), it blasts the siren and forces them to stay locked in!

### 3. Neural Sprint Planner (Solving Planning Paralysis)
To combat procrastination, we built an AI workflow generator powered by Groq's lightning-fast hardware. 
- The user inputs a vague task and how much time they have. 
- We prompt Llama-3 to instantly generate a structured timeline.
- **Dynamic Lock-In:** The AI automatically detects if the task requires the internet. If it can be done offline (like reading a textbook), it automatically recommends and arms the **Hard Block** mode. If it requires apps, it recommends **Deep Work**.

### 4. Frictionless, Premium UI/UX
We completely re-architected standard HTML/CSS to feel like a native desktop application. 
- **Sidebar Navigation:** Seamless view toggling eliminates vertical scrolling.
- **Glassmorphism Design:** Deep space dark mode, translucent blur effects, and custom toast notifications create a premium, state-of-the-art workspace.

---

## 💻 Technology Stack

* **Frontend:** Vanilla HTML5, CSS3 (Glassmorphism UI), JavaScript (ES6 Modules)
* **Backend / Database:** Firebase Firestore (Real-time data syncing), Firebase Authentication (Google OAuth)
* **APIs:** 
  * **Groq API (Llama 3.1):** Powers the smart email triage, Neural Planner, and AI Warden.
  * **Gmail API:** For background inbox fetching.
* **Native Web APIs:** Web Audio API (for the siren), Fullscreen API.

---

## 🚀 How to Run Locally

1. **Clone the Repository:**
   ```bash
   git clone <repository-url>
   cd MergeConflictz/frontend
   ```

2. **Serve the Application:**
   Because of modern browser CORS policies, you must serve the files via a local web server (e.g., VS Code Live Server).

3. **Open the App:**
   Navigate to `http://127.0.0.1:5500` (or your active Live Server port) in your web browser.

4. **Connect Accounts:**
   - Click **Connect Google Login** to authenticate with Firebase.
   - Click **Sync Workspace** to grant read access to your inbox.

---

## 🔮 Future Roadmap (Monetization Strategy)

To monetize FocusFlow for "Power Users", we plan to introduce **FocusFlow Pro** ($5/month):
- **Multi-Workspace Integration:** Connect Slack, Microsoft Teams, and Discord for full AI cross-platform triage.
- **The "Nuclear" Block (Desktop App):** Wrap the web app in Electron to give it OS-level permissions to detect and force-kill distracting applications (like Steam or Spotify).
- **Deep Analytics:** GitHub-style "Focus Heatmaps" and advanced data exporting. 

---
*Created with ❤️ for Hackathon '26*
