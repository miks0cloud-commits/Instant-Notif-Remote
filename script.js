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
let swRegistration = null;
const connectedVisitors = [];

// ------------------------------------------------------------------
// AUDIO FILE SETUP
// Make sure "alarm.mp3" exists in your main GitHub directory
// ------------------------------------------------------------------
const alarmAudio = new Audio("alarm.mp3");
alarmAudio.loop = true;

// Determine role based on URL parameter (?role=host)
const urlParams = new URLSearchParams(window.location.search);
const isHost = urlParams.get("role") === "host";

// ------------------------------------------------------------------
// SERVICE WORKER REGISTRATION (REQUIRED FOR ANDROID NOTIFICATION BAR)
// ------------------------------------------------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then((reg) => {
      swRegistration = reg;
      console.log("Service Worker active for Android Notification Bar alerts.");
    })
    .catch((err) => {
      console.error("Service Worker registration failed:", err);
    });
}

// Initialize Application Mode
if (isHost) {
  setupHost();
} else {
  setupVisitor();
}

// ------------------------------------------------------------------
// SYSTEM NOTIFICATION DISPATCHER
// ------------------------------------------------------------------
function sendNotificationBarAlert() {
  // Method 1: Send via Service Worker (Displays in Android Top Status Bar & Shade)
  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({ type: "TRIGGER_NOTIFICATION" });
  } 
  // Method 2: Standard Notification Fallback
  else if ("Notification" in window && Notification.permission === "granted") {
    new Notification("🚨 ALARM TRIGGERED", {
      body: "The host has initiated a remote alarm!",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true
    });
  }
}

// Prevent Android screen from sleeping while on the site
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
    // Broadcast signal to all connected visitors
    connectedVisitors.forEach((conn) => {
      if (conn.open) {
        conn.send({ action: "ALARM_TRIGGER" });
      }
    });

    // Fire sound & notification on host device
    startAlarmSound();
    sendNotificationBarAlert();
  });
}

// ------------------------------------------------------------------
// VISITOR CONTROLLER
// ------------------------------------------------------------------
function setupVisitor() {
  statusEl.textContent = "Visitor mode. Tap button below to activate permissions.";
  visitorControls.style.display = "block";

  readyBtn.addEventListener("click", async () => {
    // 1. Prepare audio player for Android auto-play restriction
    alarmAudio.load();

    // 2. Request Notification Permission explicitly on button click
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Notification permission was denied. Android status bar alerts will not show.");
        }
      } else if (Notification.permission === "denied") {
        alert("Notifications are currently BLOCKED on Android.\n\nTo fix:\n1. Tap the lock/tune icon on the left of the URL address bar.\n2. Tap Permissions/Site Settings.\n3. Change Notifications to ALLOW.");
      }
    } else {
      alert("This browser does not support Web Notifications.");
    }

    // 3. Request Screen Wake Lock
    requestWakeLock();

    // 4. Update UI and connect to host
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
          sendNotificationBarAlert();
        }
      });

      conn.on("close", () => {
        statusEl.textContent = "Disconnected from Host.";
      });
    });
  });
}

// ------------------------------------------------------------------
// AUDIO FILE PLAYER
// ------------------------------------------------------------------
function startAlarmSound() {
  if (isAudioActive) return;

  alarmAudio.currentTime = 0; // Play from beginning
  
  alarmAudio.play()
    .then(() => {
      isAudioActive = true;
      stopBtn.style.display = "block";
    })
    .catch((err) => {
      console.error("Audio playback failed:", err);
    });
}

stopBtn.addEventListener("click", () => {
  alarmAudio.pause();
  alarmAudio.currentTime = 0;
  isAudioActive = false;
  stopBtn.style.display = "none";
});
