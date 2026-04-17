import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔑 CONFIGS
const firebaseConfig = {
    apiKey: "AIzaSyB15NotJNKVvgJfyYJMc4HQ9hoVpRJlo4w",
    authDomain: "mergeconflictwinz.firebaseapp.com",
    projectId: "mergeconflictwinz",
    storageBucket: "mergeconflictwinz.firebasestorage.app",
    messagingSenderId: "416094858698",
    appId: "1:416094858698:web:0c4e6f06c463a9a8a17333",
    measurementId: "G-4W53PS9H68"
};

const GEMINI_API_KEY = "AIzaSyDY1G941AdrsvLN4HtpxShlAObdSTGETo4";

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
let focusDuration = 25 * 60;
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

// 🔐 AUTH & GMAIL
window.loginUser = () => signInWithPopup(auth, new GoogleAuthProvider());

window.loginGmail = () => {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: "632430619508-0mmfo7ueppf1tg73o4d1obtorhgiiia2.apps.googleusercontent.com",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    callback: (res) => { 
      gmailToken = res.access_token; 
      alert("Gmail Synced! AI Auto-sync activated 🚀"); 
      
      // 1. Run the AI Sync immediately
      syncAll(); 
      
      // 2. Set an interval to auto-run it every 60 seconds (60000 milliseconds)
      setInterval(syncAll, 60000); 
    }
  });
  client.requestAccessToken();
};

// 📧 SYNC GMAIL + AI (FIXED)
window.syncAll = async () => {
  if (!gmailToken || !currentUser) {
    alert("Please connect both Login and Gmail first!");
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
      const d = await detail.json(); // <--- This was the missing 'd'
      
      // The AI Brain working:
      if (d.snippet) {
        const ai = await getSmartTriage(d.snippet);
        
        // 🔥 Using setDoc with merge: true prevents duplicates!
        // It uses the actual Gmail ID (m.id)
        await setDoc(msgRef, {
          text: ai.summary,
          priority: ai.priority,
          timestamp: Date.now() // You might want to use d.internalDate here if you want accurate email times
        }, { merge: true }); 
      }
    }
    
    document.getElementById("briefContent").innerText = "Inbox synced! Focus OS is protecting your time.";
    
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
    lists.forEach(id => document.getElementById(id).innerHTML = "");

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
  });
}

// 🧘 FOCUS MODES
window.startFocus = () => {
  mode = "focus";
  document.body.classList.add("focus-mode-bg");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("focusScreen").classList.remove("hidden");
  listen();
  startTimer(focusDuration);
};

window.endFocus = () => {
  if (timerInterval) clearInterval(timerInterval);
  mode = "normal";
  document.body.classList.remove("focus-mode-bg");
  document.getElementById("focusScreen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  listen();
};

function startTimer(duration) {
  // 🛑 Kill any existing timer first!
  if (timerInterval) clearInterval(timerInterval); 

  let timer = duration;
  const display = document.getElementById("timer");
  
  timerInterval = setInterval(() => {
    let mins = Math.floor(timer / 60);
    let secs = timer % 60;
    display.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    
    if (--timer < 0) { 
      clearInterval(timerInterval); 
      alert("Focus Over!"); 
      endFocus(); 
    }
  }, 1000);
}

onAuthStateChanged(auth, (user) => { if(user) { currentUser = user; listen(); } });

// ⚙️ SETTINGS LOGIC
window.goToSettings = () => {
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("settingsScreen").classList.remove("hidden");
};

window.goToDashboard = () => {
  document.getElementById("settingsScreen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
};

window.saveSettings = () => {
  const mins = document.getElementById("focusTimeInput").value;
  
  if (mins && mins > 0) {
    focusDuration = mins * 60; // Convert minutes to seconds
    alert(`✅ Focus time updated to ${mins} minutes!`);
    goToDashboard();
  } else {
    alert("Please enter a valid number of minutes.");
  }
};

// 🚪 LOGOUT LOGIC
window.logoutUser = async () => {
  try {
    // 1. Sign out of Firebase
    await signOut(auth);
    
    // 2. Clear all local variables
    currentUser = null;
    gmailToken = null;
    
    // 3. Stop any background timers or database listeners
    if (timerInterval) clearInterval(timerInterval);
    if (unsubscribe) unsubscribe();
    
    // 4. Reset the UI text and lists
    document.getElementById("briefContent").innerText = "Connect your accounts to generate your focus plan...";
    const lists = ["messages", "allowed", "queue", "blocked"];
    lists.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    // 5. Ensure they are sent back to the main dashboard view
    document.body.classList.remove("focus-mode-bg");
    document.getElementById("focusScreen").classList.add("hidden");
    document.getElementById("settingsScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    
    alert("Logged out successfully! Catch some sleep soon. 🚀");
    
  } catch (error) {
    console.error("🚨 Logout Error:", error);
    alert("Something went wrong logging out.");
  }
};