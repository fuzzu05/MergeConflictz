const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccount.json"))
});

const db = admin.firestore();
// 🔥 Slack endpoint
app.post("/slack/events", (req, res) => {
  const body = req.body;

  // verification challenge
  if (body.type === "url_verification") {
    return res.send({ challenge: body.challenge });
  }

  // actual message event
  if (body.event && body.event.text) {
    console.log("Slack message:", body.event.text);

    // 👉 here you send to Firebase
    // (you can call your frontend API or directly use firebase admin)

  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("Server running on 3000"));