import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔑 CONFIGS
const firebaseConfig = {
  //Your firebase project web app config!
};

const GEMINI_API_KEY = "Your gemini api key";

// INITIALIZE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

let currentUser = null;
let gmailToken = null;
let mode = "normal";
let unsubscribe = null;
let statsUnsubscribe = null;
let focusDuration = 25 * 60;
let currentTimerSeconds = 0;
let timerInterval = null;

// 🧠 AI SMART TRIAGE
async function getSmartTriage(text) {
  try {
    const prompt = `Analyze this message: "${text}". 
    1. Summarize it in exactly 1 sentence.
    2. Priority: "urgent" (urgent requests/bosses), "important" (work updates), or "low" (ads/generic).
    Return JSON only: {"summary": "...", "priority": "..."}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text().replace(/```json|```/g, ""));
  } catch (e) {
    return { summary: text.substring(0, 50), priority: "low" };
  }
}

// 🔔 TOAST NOTIFICATIONS
window.showToast = (msg) => {
  const toast = document.getElementById("toastNotification");
  const msgEl = document.getElementById("toastMessage");
  if (!toast || !msgEl) return;
  
  msgEl.innerText = msg;
  toast.classList.add("show");
  
  if (window.toastTimer) clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
};

// 🔐 AUTH & GMAIL
window.loginUser = () => signInWithPopup(auth, new GoogleAuthProvider());

window.loginGmail = () => {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: "your client id of gmail api",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    callback: (res) => {
      gmailToken = res.access_token;
      showToast("Gmail Synced! AI Auto-sync activated 🚀");
      syncAll();
      setInterval(syncAll, 60000);
    }
  });
  client.requestAccessToken();
};

// 📧 SYNC GMAIL + AI
window.syncAll = async () => {
  if (!gmailToken || !currentUser) {
    showToast("Please connect both Login and Gmail first!");
    return;
  }

  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5", {
      headers: { Authorization: `Bearer ${gmailToken}` }
    });
    const data = await res.json();

    if (!data.messages) {
      document.getElementById("briefContent").innerText = "Inbox clear! No new messages.";
      return;
    }

    document.getElementById("briefContent").innerText = "AI is watching your inbox... 👀";

    for (let m of data.messages) {
      const msgRef = doc(db, "users", currentUser.uid, "messages", m.id);

      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
        headers: { Authorization: `Bearer ${gmailToken}` }
      });
      const d = await detail.json();

      if (d.snippet) {
        const ai = await getSmartTriage(d.snippet);

        await setDoc(msgRef, {
          text: ai.summary,
          priority: ai.priority,
          timestamp: Date.now()
        }, { merge: true });
      }
    }

    document.getElementById("briefContent").innerText = "Inbox synced! FocusFlow is protecting your time.";
  } catch (error) {
    console.error("🚨 Background Sync Error (Safe to ignore):", error);
    document.getElementById("briefContent").innerText = "Error syncing messages. Check console.";
  }
};

// 🔄 REALTIME UI
function listen() {
  if (unsubscribe) unsubscribe();
  const q = query(collection(db, "users", currentUser.uid, "messages"), orderBy("timestamp", "desc"));

  unsubscribe = onSnapshot(q, (snap) => {
    const lists = ["messages", "allowed", "queue", "blocked"];
    lists.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    snap.forEach(doc => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = data.text;

      if (mode === "normal") {
        document.getElementById("messages").appendChild(li);
      } else {
        if (data.priority === "urgent") document.getElementById("allowed").appendChild(li);
        else if (data.priority === "important") document.getElementById("queue").appendChild(li);
        else document.getElementById("blocked").appendChild(li);
      }
    });

    if (mode === "normal" && snap.empty) {
      document.getElementById("messages").innerHTML = `<li class="empty-state text-muted">Inbox clear! No new messages.</li>`;
    }
  });
}

function listenToStats() {
  if (statsUnsubscribe) statsUnsubscribe();

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const q = query(
    collection(db, "users", currentUser.uid, "stats"),
    where("timestamp", ">=", sevenDaysAgo)
  );

  statsUnsubscribe = onSnapshot(q, (snap) => {
    let totalMinutes = 0;
    let totalBlocked = 0;

    snap.forEach(doc => {
      const data = doc.data();
      totalMinutes += data.durationMinutes || 0;
      totalBlocked += data.notificationsBlocked || 0;
    });

    const hours = (totalMinutes / 60).toFixed(1);

    const weeklyHoursEl = document.getElementById("weeklyHours");
    if (weeklyHoursEl) weeklyHoursEl.innerHTML = `${hours} <span>hrs</span>`;

    const totalBlockedEl = document.getElementById("totalBlocked");
    if (totalBlockedEl) totalBlockedEl.innerText = totalBlocked;
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;

    // UI Updates
    document.getElementById("loginBtn").classList.add("hidden");
    document.getElementById("logoutBtn").classList.remove("hidden");
    const badge = document.getElementById("userBadge");
    if (badge) badge.classList.remove("hidden");

    listen();
    listenToStats();
  }
});

// 🧘 NAVIGATION & MODES
function setActiveNav(navId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(navId);
  if (activeEl) activeEl.classList.add('active');
}

function hideAllPages() {
  document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
}

window.goToDashboard = () => {
  hideAllPages();
  document.getElementById("dashboard").classList.remove("hidden");
  setActiveNav("nav-dashboard");
};

window.goToPlanner = () => {
  hideAllPages();
  document.getElementById("plannerScreen").classList.remove("hidden");
  setActiveNav("nav-planner");
};

window.goToSettings = () => {
  hideAllPages();
  document.getElementById("settingsScreen").classList.remove("hidden");
  setActiveNav("nav-settings");
};

window.startFocus = () => {
  mode = "focus";
  document.body.classList.add("focus-mode-bg");
  hideAllPages();
  document.getElementById("focusScreen").classList.remove("hidden");
  setActiveNav("nav-focus");
  listen();
  currentTimerSeconds = focusDuration;
  startTimer();
};

window.startHardBlock = () => {
  mode = "hardblock";
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(e => console.log("Fullscreen blocked"));
  }
  document.getElementById("endSessionBtn").classList.add("hidden");

  document.body.classList.add("focus-mode-bg", "hard-block-active");
  hideAllPages();
  document.getElementById("focusScreen").classList.remove("hidden");

  const indicator = document.querySelector(".recording-indicator span");
  if (indicator) indicator.innerText = "SYSTEM LOCKED";

  listen();
  currentTimerSeconds = focusDuration;
  startTimer();
};

// --- PUNISHMENT LOGIC ---
let audioCtx = null;
let sirenInterval = null;

function playSiren() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sirenInterval) return; // Already playing

  sirenInterval = setInterval(() => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.25);
    osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Loud enough to be annoying

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }, 500);
}

function stopSiren() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
}

document.addEventListener("fullscreenchange", () => {
  if (mode === "hardblock" && !document.fullscreenElement) {
    // Escaped! Trigger punishment!
    const overlay = document.getElementById("punishmentOverlay");
    if (overlay) overlay.classList.remove("hidden");
    playSiren();
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
});

window.resumeHardBlock = () => {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
  const overlay = document.getElementById("punishmentOverlay");
  if (overlay) overlay.classList.add("hidden");
  stopSiren();
  startTimer();
};
// ------------------------

window.endFocus = async () => {
  if (timerInterval) clearInterval(timerInterval);

  if (currentUser && mode !== "normal") {
    const sessionRef = doc(collection(db, "users", currentUser.uid, "stats"));
    const durationReached = focusDuration - currentTimerSeconds;
    const blockedCount = document.getElementById("blocked").children.length;
    const queuedCount = document.getElementById("queue").children.length;

    await setDoc(sessionRef, {
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      durationMinutes: Math.floor(durationReached / 60),
      notificationsBlocked: blockedCount + queuedCount,
      mode: mode
    });
  }

  if (document.fullscreenElement) document.exitFullscreen();

  // Clear any punishment if it was active
  const overlay = document.getElementById("punishmentOverlay");
  if (overlay) overlay.classList.add("hidden");
  stopSiren();

  mode = "normal";
  document.body.classList.remove("focus-mode-bg", "hard-block-active");

  const indicator = document.querySelector(".recording-indicator span");
  if (indicator) indicator.innerText = "Deep Work Session Active";

  goToDashboard();
  listen();
};

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const display = document.getElementById("timer");

  // Initial display update before the first interval tick
  let mins = Math.floor(currentTimerSeconds / 60);
  let secs = currentTimerSeconds % 60;
  display.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  timerInterval = setInterval(() => {
    currentTimerSeconds--;
    let mins = Math.floor(currentTimerSeconds / 60);
    let secs = currentTimerSeconds % 60;
    display.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    if (currentTimerSeconds <= 0) {
      clearInterval(timerInterval);
      document.getElementById("endSessionBtn").classList.remove("hidden");
      showToast("Session Complete! System Unlocked. 🔓");
      window.endFocus();
    }
  }, 1000);
}

// ⚙️ SETTINGS LOGIC
window.saveSettings = () => {
  const mins = document.getElementById("focusTimeInput").value;

  if (mins && mins > 0) {
    focusDuration = mins * 60; // Convert minutes to seconds
    showToast(`✅ Focus time updated to ${mins} minutes!`);
    goToDashboard();
  } else {
    showToast("Please enter a valid number of minutes.");
  }
};

// 🛠️ PERMITTED WORKSPACE (ALLOWLIST)
let allowedApps = ["VS Code", "Notion", "Figma"]; // Default startup tools

window.addApp = () => {
  const val = document.getElementById("newAppInput").value.trim();
  if (val && !allowedApps.includes(val)) {
    allowedApps.push(val);
    document.getElementById("newAppInput").value = "";
    renderApps();
  }
};

window.removeApp = (app) => {
  allowedApps = allowedApps.filter(a => a !== app);
  renderApps();
};

function renderApps() {
  const settingsList = document.getElementById("settingsAllowlist");
  const focusList = document.getElementById("focusAllowlist");

  if (settingsList) {
    settingsList.innerHTML = allowedApps.map(a =>
      `<span class="app-tag">${a} <button onclick="removeApp('${a}')">&times;</button></span>`
    ).join('');
  }

  if (focusList) {
    focusList.innerHTML = allowedApps.map(a =>
      `<span class="app-tag glow">⚡ ${a}</span>`
    ).join('');
  }
}

// Load default allowlist
renderApps();

// 🚪 LOGOUT LOGIC
window.logoutUser = async () => {
  try {
    await signOut(auth);

    currentUser = null;
    gmailToken = null;

    if (timerInterval) clearInterval(timerInterval);
    if (unsubscribe) unsubscribe();
    if (statsUnsubscribe) statsUnsubscribe();

    const weeklyHoursEl = document.getElementById("weeklyHours");
    if (weeklyHoursEl) weeklyHoursEl.innerHTML = `0.0 <span>hrs</span>`;

    const totalBlockedEl = document.getElementById("totalBlocked");
    if (totalBlockedEl) totalBlockedEl.innerText = "0";

    document.getElementById("briefContent").innerText = "Connect your accounts to generate your focus plan...";
    const lists = ["messages", "allowed", "queue", "blocked"];
    lists.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    document.getElementById("loginBtn").classList.remove("hidden");
    document.getElementById("logoutBtn").classList.add("hidden");
    const badge = document.getElementById("userBadge");
    if (badge) badge.classList.add("hidden");

    document.body.classList.remove("focus-mode-bg", "hard-block-active");
    goToDashboard();

    showToast("Logged out successfully! Catch some sleep soon. 🚀");

  } catch (error) {
    console.error("🚨 Logout Error:", error);
    showToast("Something went wrong logging out.");
  }
};

// ==========================================
// 🧠 NEURAL SPRINT PLANNER
// ==========================================
window.generatePlan = async () => {
  const name = document.getElementById("taskName").value;
  const time = document.getElementById("taskTime").value;
  const overview = document.getElementById("taskOverview").value;

  if (!name || !time) return showToast("Task name and time are required!");

  const btn = document.getElementById("generatePlanBtn");
  btn.innerText = "Processing Neural Plan... ⚙️";

  try {
    const prompt = `Act as an expert project manager. I need to complete this task: "${name}". 
    I have ${time} available. Overview: "${overview}".
    
    Break this down into an actionable sprint. Return ONLY a valid JSON object in this exact format:
    {
      "title": "A catchy title for this sprint",
      "overview": "A 2-sentence motivational overview",
      "requirements": ["Tool 1", "Skill/Resource 2", "Asset 3"],
      "schedule": [
        {"time": "0:00 - 0:30", "step": "Do this first..."},
        {"time": "0:30 - 1:00", "step": "Then do this..."}
      ]
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const cleanJson = response.text().replace(/```json|```/g, "").trim();
    const plan = JSON.parse(cleanJson);

    document.getElementById("planOutput").classList.remove("hidden");
    document.getElementById("planTitle").innerText = plan.title;
    document.getElementById("planDetails").innerText = plan.overview;

    document.getElementById("planReqs").innerHTML = plan.requirements
      .map(req => `<li>${req}</li>`)
      .join("");

    document.getElementById("planSchedule").innerHTML = plan.schedule
      .map(s => `<li><b>${s.time}</b> ${s.step}</li>`)
      .join("");

    btn.innerText = "Regenerate Plan";

  } catch (error) {
    console.error("Planner Error:", error);
    showToast("Failed to generate plan. Ensure API key is valid.");
    btn.innerText = "Generate Execution Plan";
  }
};
