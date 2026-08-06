// Change this key to any unique string for your specific application
const ROOM_ID = "my-unique-alarm-host-room-9982";

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

// Check if user specified role via URL: e.g., site.github.io/?role=host
const urlParams = new URLSearchParams(window.location.search);
const isHost = urlParams.get("role") === "host";

if (isHost) {
  setupHost();
} else {
  setupVisitor();
}

// ------------------------------------------------------------------
// HOST LOGIC
// ------------------------------------------------------------------
function setupHost() {
  statusEl.textContent = "Initializing Host Node...";
  hostControls.style.display = "block";

  // Create peer with the fixed Room ID
  const peer = new Peer(ROOM_ID);

  peer.on("open", () => {
    statusEl.textContent = "Host Active! Share page URL with visitors.";
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
      statusEl.textContent = "Error: Another host session is already active.";
    } else {
      statusEl.textContent = "Peer Error: " + err.type;
    }
  });

  triggerBtn.addEventListener("click", () => {
    // Broadcast trigger signal to all connected visitors
    connectedVisitors.forEach((conn) => {
      if (conn.open) {
        conn.send({ action: "ALARM_TRIGGER" });
      }
    });
    // Sound local alarm for host as well
    startAlarmSound();
  });
}

// ------------------------------------------------------------------
// VISITOR LOGIC
// ------------------------------------------------------------------
function setupVisitor() {
  statusEl.textContent = "Visitor mode. Action required.";
  visitorControls.style.display = "block";

  readyBtn.addEventListener("click", () => {
    // Initialize Web Audio on explicit user tap
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();

    readyBtn.style.display = "none";
    statusEl.textContent = "Connecting to Host...";

    // Connect to host peer
    const peer = new Peer();
    peer.on("open", () => {
      const conn = peer.connect(ROOM_ID);

      conn.on("open", () => {
        statusEl.textContent = "Connected! Ready for host signals.";
      });

      conn.on("data", (data) => {
        if (data.action === "ALARM_TRIGGER") {
          startAlarmSound();
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

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Pitch

  // Modulate volume continuously (pulsing siren effect)
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