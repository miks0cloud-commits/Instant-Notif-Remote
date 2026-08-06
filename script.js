// Unique channel identifier for your room
const ROOM_ID = "github-remote-alarm-channel-7711";

const statusEl = document.getElementById("status");
const hostControls = document.getElementById("hostControls");
const visitorControls = document.getElementById("visitorControls");
const visitorCountEl = document.getElementById("visitorCount");
const triggerBtn = document.getElementById("triggerBtn");
const readyBtn = document.getElementById("readyBtn");
const stopBtn = document.getElementById("stopBtn");

let isAudioActive = false;
const connectedVisitors = [];

const alarmAudio = new Audio("alarm.mp3");
alarmAudio.loop = true;

const urlParams = new URLSearchParams(window.location.search);
const isHost = urlParams.get("role") === "host";

if (isHost) {
  setupHost();
} else {
  setupVisitor();
}

function sendSystemPopUp() {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("🚨 ALARM TRIGGERED", {
      body: "The host has initiated a remote alarm pop-up!",
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200]
    });
  }
}

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      await navigator.wakeLock.request("screen");
    }
  } catch (err) {
    console.error("Wake Lock error:", err);
  }
}

function setupHost() {
  statusEl.textContent = "Initializing Host Mode...";
  hostControls.style.display = "block";

  const peer = new Peer(ROOM_ID);

  peer.on("open", () => {
    statusEl.textContent = "Host Active! Share your visitor URL with others.";
  });

  peer.on("connection", (conn) => {
    connectedVisitors.push(conn);
    visitorCountEl.textContent = connectedVisitors.length;

    conn.on("close", () => {
      const index = connectedVisitors.indexOf(conn);
      if (index > -1) connectedVisitors.splice(index, 1);
      visitorCountEl.textContent = connectedVisitors.length;
    });
  });

  triggerBtn.addEventListener("click", () => {
    connectedVisitors.forEach((conn) => {
      if (conn.open) {
        conn.send({ action: "ALARM_TRIGGER" });
      }
    });

    startAlarmSound();
    sendSystemPopUp();
  });
}

function setupVisitor() {
  statusEl.textContent = "Visitor mode. Tap button to activate.";
  visitorControls.style.display = "block";

  readyBtn.addEventListener("click", async () => {
    alarmAudio.load();
    requestWakeLock();

    // DIAGNOSTIC CHECK FOR ANDROID
    if (!("Notification" in window)) {
      alert("This browser does not support Web Notifications.");
    } else if (Notification.permission === "denied") {
      alert("Android blocked notifications for this site! Tap the lock icon in the address bar to switch Notifications to ALLOW.");
    } else if (Notification.permission === "default") {
      // Direct sync request for Android Chrome
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permission was not granted.");
      }
    } else if (Notification.permission === "granted") {
      alert("Notifications are ALREADY allowed!");
    }

    readyBtn.style.display = "none";
    statusEl.textContent = "Connecting to Host...";

    const peer = new Peer();

    peer.on("open", () => {
      const conn = peer.connect(ROOM_ID);

      conn.on("open", () => {
        statusEl.textContent = "Connected! Ready for host alarms.";
      });

      conn.on("data", (data) => {
        if (data.action === "ALARM_TRIGGER") {
          startAlarmSound();
          sendSystemPopUp();
        }
      });

      conn.on("close", () => {
        statusEl.textContent = "Disconnected from Host.";
      });
    });
  });
}

function startAlarmSound() {
  if (isAudioActive) return;

  alarmAudio.currentTime = 0;
  
  alarmAudio.play()
    .then(() => {
      isAudioActive = true;
      stopBtn.style.display = "block";
    })
    .catch((err) => {
      console.error("Audio error:", err);
    });
}

stopBtn.addEventListener("click", () => {
  alarmAudio.pause();
  alarmAudio.currentTime = 0;
  isAudioActive = false;
  stopBtn.style.display = "none";
});
