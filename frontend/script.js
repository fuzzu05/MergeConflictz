import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB15NotJNKVvgJfyYJMc4HQ9hoVpRJlo4w",
    authDomain: "mergeconflictwinz.firebaseapp.com",
    projectId: "mergeconflictwinz",
    storageBucket: "mergeconflictwinz.firebasestorage.app",
    messagingSenderId: "416094858698",
    appId: "1:416094858698:web:0c4e6f06c463a9a8a17333",
    measurementId: "G-4W53PS9H68"
};

// Initialize Firebase // 🔹 INIT
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM
const msgList = document.getElementById("messages");
const allowedList = document.getElementById("allowed");
const queueList = document.getElementById("queue");
const blockedList = document.getElementById("blocked");

let currentUser = null;
let accessToken = null;
let mode = "normal"; // normal | focus | block
let focusTime = 25*60;

// 🔐 LOGIN
window.loginUser = async function () {
  const res = await signInWithPopup(auth, provider);
  currentUser = res.user;
};

window.logoutUser = () => signOut(auth);

// 🔄 AUTH STATE
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    document.getElementById("loginBtn").style.display = "none";
    listenToMessages();
    login();
  }
});

// 🧠 CLASSIFIER
function classify(text) {
  text = text.toLowerCase();

  if (text.includes("urgent") || text.includes("asap") || text.includes("deadline")) {
    return "urgent";
  } else if (text.includes("meeting") || text.includes("project")) {
    return "important";
  } else {
    return "low";
  }
}

function login() {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: "632430619508-0mmfo7ueppf1tg73o4d1obtorhgiiia2.apps.googleusercontent.com",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    callback: (response) => {
      accessToken = response.access_token;
      alert("Login successful ✅");

      // hide login button
      document.getElementById("loginBtn").style.display = "none";
      console.log("TOKEN:", accessToken);
    },
  });

  client.requestAccessToken();
}

window.login = login;

// 📧 FETCH REAL EMAILS
window.fetchEmails = async function () {
  if (!currentUser) {
  alert("Login first!");
  return;
}

if (!accessToken) {
  alert("Connect Gmail first!");
  return;
}
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();
    console.log("MESSAGES:", data);

    if (!data.messages) {
      alert("No messages found");
      return;
    }

    for (let msg of data.messages) {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const d = await detail.json();

      const text = d.snippet || "No content";
      const priority = classify(text);

      await addDoc(collection(db, "users", currentUser.uid, "messages"), {
        text,
        priority,
        source: "gmail",
        timestamp: Date.now()
      });
    }
};

// 🔥 REALTIME LISTENER (USER-SPECIFIC)
function listenToMessages() {
  const ref = collection(db, "users", currentUser.uid, "messages");

  onSnapshot(ref, (snapshot) => {
    msgList.innerHTML = "";
    allowedList.innerHTML = "";
    queueList.innerHTML = "";
    blockedList.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = data.text;

      if (mode === "normal") {
        msgList.appendChild(li);
      }

      if (mode === "focus") {
        if (data.priority === "urgent") {
          allowedList.appendChild(li);
          notify(data.text);
        } else if (data.priority === "important") {
          queueList.appendChild(li);
        } else {
          blockedList.appendChild(li);
        }
      }

      if (mode === "block") {
        blockedList.appendChild(li);
      }
    });
  });
}

// 🔔 NOTIFICATION
function notify(text) {
  console.log("🚨", text);
}

// 🧘 START FOCUS
window.startFocus = () => {
  mode = "focus";

  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("focusScreen").classList.remove("hidden");

  startTimer();
};

// 🚫 HARD BLOCK
window.startBlock = function () {
  mode = "block";
  alert("Hard Block 🚫");
  startTimer();
};

// 🛑 END FOCUS
window.endFocus = () => {
  mode = "normal";

  document.getElementById("focusScreen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
};

// ⏱️ TIMER
function startTimer() {
  let time = focusTime;

  const interval = setInterval(() => {
    time--;

    document.getElementById("timer").textContent =
      "Time: " + Math.floor(time / 60) + ":" + (time % 60);
    
    if (time <= 0) {
      clearInterval(interval);
      alert("Focus session complete!");
      endFocus();
    }
  }, 1000);
}

// ⚙️ SETTINGS
window.saveSettings = function () {
  const mins = document.getElementById("focusTimeInput").value;
  focusTime = mins * 60;
  alert("Saved!");
};