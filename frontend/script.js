import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// 🔹 DOM ELEMENTS
const msgList = document.getElementById("messages");
const queueList = document.getElementById("queue");
const blockedList = document.getElementById("blocked");

// 🔥 ADD DUMMY DATA (RUN ONCE ONLY)
async function addDummy() {
  await addDoc(collection(db, "messages"), {
    text: "Boss: Deadline today",
    priority: "urgent"
  });

  await addDoc(collection(db, "messages"), {
    text: "Friend: meme 😂",
    priority: "low"
  });

  await addDoc(collection(db, "messages"), {
    text: "Team meeting at 6",
    priority: "important"
  });
}

// 👉 RUN ONCE then COMMENT IT
// addDummy();
// // addDummy(); ← comment this after first run

// 🔹 LOAD ALL MESSAGES
async function loadMessages() {
  const snapshot = await getDocs(collection(db, "messages"));

  msgList.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = `${data.text} (${data.priority})`;
    msgList.appendChild(li);
  });
}

loadMessages();

// 🔥 FOCUS MODE
let focusMode = false;

async function startFocus() {
  focusMode = true;

  const snapshot = await getDocs(collection(db, "messages"));

  msgList.innerHTML = "";
  queueList.innerHTML = "";
  blockedList.innerHTML = "";

  let allowed = 0;
  let queued = 0;
  let blocked = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = data.text;

    if (data.priority === "urgent") {
      msgList.appendChild(li);
      allowed++;
    } else if (data.priority === "important") {
      queueList.appendChild(li);
      queued++;
    } else {
      blockedList.appendChild(li);
      blocked++;
    }
  });

  startTimer(allowed, queued, blocked);
}

// ⏱️ TIMER
function startTimer(allowed, queued, blocked) {
  let time = 1; // 25 min

  const interval = setInterval(() => {
    time--;

    console.log("Time left:", time);

    if (time <= 0) {
      clearInterval(interval);

      alert(`
Focus Complete!
Allowed: ${allowed}
Queued: ${queued}
Blocked: ${blocked}
      `);
    }
  }, 1000);
}

// 🔹 MAKE BUTTON WORK
window.startFocus = startFocus;
