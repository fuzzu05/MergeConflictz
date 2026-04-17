import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

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

// DOM
const msgList = document.getElementById("messages");
const queueList = document.getElementById("queue");
const blockedList = document.getElementById("blocked");

let focusMode = false;
let accessToken = null;

// 🔥 GOOGLE LOGIN (CORRECT WAY)
function login() {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: "632430619508-0mmfo7ueppf1tg73o4d1obtorhgiiia2.apps.googleusercontent.com",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    callback: (response) => {
      accessToken = response.access_token;
      alert("Login successful ✅");

      // hide login button
      document.getElementById("login-btn").style.display = "none";
      console.log("TOKEN:", accessToken);
    },
  });

  client.requestAccessToken();
}

window.login = login;

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

// 📧 FETCH REAL EMAILS
window.fetchEmails = async function () {
  if (!accessToken) {
    alert("Login first!");
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

    const text = d.snippet;
    const priority = classify(text);

    await addDoc(collection(db, "messages"), {
      text,
      priority,
      source: "gmail",
      timestamp: Date.now()
    });
  }
};

// 🔥 REAL-TIME UI
onSnapshot(collection(db, "messages"), (snapshot) => {
  msgList.innerHTML = "";
  queueList.innerHTML = "";
  blockedList.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = `${data.text} (${data.priority})`;

    if (focusMode) {
      if (data.priority === "urgent") {
        msgList.appendChild(li);
      } else if (data.priority === "important") {
        queueList.appendChild(li);
      } else {
        blockedList.appendChild(li);
      }
    } else {
      msgList.appendChild(li);
    }
  });
});

// 🚀 FOCUS MODE
window.startFocus = function () {
  focusMode = true;
  alert("Focus Mode ON 🚀");
  startTimer();
};

// ⏱️ TIMER
function startTimer() {
  let time = 60;

  const interval = setInterval(() => {
    time--;

    if (time <= 0) {
      clearInterval(interval);
      alert("Focus session complete!");
      focusMode = false;
    }
  }, 1000);
}