// Unique channel identifier for your room
const ROOM_ID = "github-remote-alarm-channel-7711";

const statusEl = document.getElementById("status");
const hostControls = document.getElementById("hostControls");
const visitorControls = document.getElementById("visitorControls");
const visitorCountEl = document.getElementById("visitorCount");
const triggerBtn = document.getElementById("triggerBtn");
const readyBtn = document.getElementById("readyBtn");
const stopBtn = document.getElementById("stopBtn");

let audioCtx = null;
let oscillator = null;
let isAudioActive = false;
const connectedVisitors = [];

// Determine role based on URL parameter (?role=host)
const urlParams = new URLSearchParams(window.location.search);
const isHost = urlParams.get("role") === "host";

if (isHost) {
  setupHost();
} else {
  setupVisitor();
}

// ------------------------------------------------------------------
// PERMISSIONS & POP-UP NOTIFICATIONS
// ------------------------------------------------------------------
async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("System notification permissions granted.");
    }
  }
}

function sendSystemPopUp() {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("🚨 ALARM TRIGGERED", {
      body: "The host has initiated a remote alarm pop-up!",
      requireInteraction: true, // Holds pop-up on screen until dismissed
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
    console.error("Wake Lock request failed:", err);
  }
}

// ------------------------------------------------------------------
// HOST CONTROLLER
// ------------------------------------------------------------------
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

  peer.on("error", (err) => {
    if (err.type === "unavailable-id") {
      statusEl.textContent = "Error: A host session is already active in another window.";
    } else {
      statusEl.textContent = "Peer Error: " + err.type;
    }
  });

  triggerBtn.addEventListener("click", () => {
    // Broadcast signal to all connected visitor devices
    connectedVisitors.forEach((conn) => {
      if (conn.open) {
        conn.send({ action: "ALARM_TRIGGER" });
      }
    });

    // Run local alert on host device as well
    startAlarmSound();
    sendSystemPopUp();
  });
}

// ------------------------------------------------------------------
// VISITOR LISTENER
// ------------------------------------------------------------------
function setupVisitor() {
  statusEl.textContent = "Visitor mode. Permission setup required.";
  visitorControls.style.display = "block";

  readyBtn.addEventListener("click", async () => {
    // 1. Activate Web Audio Context
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();

    // 2. Request System Pop-Up Notification & Wake Lock
    await requestNotificationPermission();
    requestWakeLock();

    readyBtn.style.display = "none";
    statusEl.textContent = "Connecting to Host...";

    // 3. Peer Connection Setup
    const peer = new Peer();

    peer.on("open", () => {
      const conn = peer.connect(ROOM_ID);

      conn.on("open", () => {
        statusEl.textContent = "Connected! Ready to receive host pop-ups.";
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

// ------------------------------------------------------------------
// AUDIO GENERATOR
// ------------------------------------------------------------------
function startAlarmSound() {
  if (isAudioActive) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Sawtooth wave for loud, distinct alarm tone
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Pitch (A5 tone)

  gainNode.gain.setValueAtTime(1, audioCtx.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  isAudioActive = true;
  stopBtn.style.display = "block";
}

stopBtn.addEventListener("click", () => {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    isAudioActive = false;
    stopBtn.style.display = "none";
  }
});
