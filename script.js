/*************************************************
 🔥 FIREBASE INITIALIZATION
*************************************************/
var firebaseConfig = {
  apiKey: "AIzaSyDVRpGXXCBxLrWrI0jKbHBQLVUQ3AcOrQ4",
  databaseURL: "https://hydroponics-7417e-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

/*************************************************
 📊 CHART SETUP (Chart.js)
*************************************************/
let labels = [];
let tempData = [];
let phData = [];
let tdsData = [];

function createChart(canvasId, label, data, color) {
  return new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { display: true } }
    }
  });
}

const tempChart = createChart("tempChart", "Temperature (°C)", tempData, "#00c6ff");
const phChart   = createChart("phChart", "pH", phData, "#2ecc71");
const tdsChart  = createChart("tdsChart", "TDS (ppm)", tdsData, "#f39c12");

/*************************************************
 🔁 LIVE SENSOR DATA
*************************************************/
db.ref("/sensor").on("value", snapshot => {
  if (!snapshot.exists()) return;

  const d = snapshot.val();
  const time = new Date().toLocaleTimeString();

  document.getElementById("temp").innerText =
    typeof d.temperature === "number" ? d.temperature.toFixed(2) : "--";

  document.getElementById("hum").innerText =
    typeof d.humidity === "number" ? d.humidity.toFixed(2) : "--";

  document.getElementById("ph").innerText =
    typeof d.ph === "number" ? d.ph.toFixed(2) : "--";

  document.getElementById("tds").innerText =
    typeof d.tds === "number" ? d.tds.toFixed(0) : "--";

  document.getElementById("light").innerText =
    typeof d.light === "number" ? d.light : "--";

  if (
    typeof d.temperature === "number" &&
    typeof d.ph === "number" &&
    typeof d.tds === "number"
  ) {
    if (labels.length >= 10) {
      labels.shift();
      tempData.shift();
      phData.shift();
      tdsData.shift();
    }

    labels.push(time);
    tempData.push(d.temperature);
    phData.push(d.ph);
    tdsData.push(d.tds);

    tempChart.update();
    phChart.update();
    tdsChart.update();
  }
});

/*************************************************
 🔘 MODE CONTROL (AUTO / MANUAL)
*************************************************/
function setMode() {
  const mode = document.getElementById("mode").value;
  db.ref("/mode").set(mode);
}

// MODE LISTENER
db.ref("/mode").on("value", snapshot => {
  const mode = snapshot.val() || "--";
  document.getElementById("currentMode").innerText = mode;

  const manualCard = document.getElementById("manualControlCard");

  if (mode === "AUTO") {
    manualCard.classList.add("disabled");

    // 🔥 FORCE ALL MANUAL RELAYS OFF IN FIREBASE
    db.ref("/control").set({
      pump: false,
      light: false,
      oxygen: false,
      nutrientA: false,
      nutrientB: false
    });
  } else {
    manualCard.classList.remove("disabled");
  }
});

/*************************************************
 ⚡ MANUAL RELAY CONTROL (LOCKED IN AUTO)
*************************************************/
function toggleRelay(relay) {
  db.ref("/mode").once("value").then(modeSnap => {
    if (modeSnap.val() === "AUTO") return; // 🔒 LOCK

    const ref = db.ref("/control/" + relay);
    ref.once("value").then(snapshot => {
      ref.set(!snapshot.val());
    });
  });
}

/*************************************************
 🔁 RELAY STATUS INDICATORS
*************************************************/
function bindRelayStatus(relay) {
  db.ref("/control/" + relay).on("value", snapshot => {
    const state = snapshot.val();

    const statusEl = document.getElementById("status-" + relay);
    const btnEl = document.getElementById("btn-" + relay);
    if (!statusEl || !btnEl) return;

    if (state === true) {
      statusEl.innerText = "ON";
      statusEl.className = "status on";
      btnEl.style.background = "linear-gradient(135deg,#2ecc71,#27ae60)";
    } else {
      statusEl.innerText = "OFF";
      statusEl.className = "status off";
      btnEl.style.background = "";
    }
  });
}

["pump", "light", "oxygen", "nutrientA", "nutrientB"]
  .forEach(bindRelayStatus);

/*************************************************
 🔔 SYSTEM ALERTS
*************************************************/
db.ref("/alert/message").on("value", snapshot => {
  const alertBox = document.getElementById("alert");
  const msg = snapshot.val() || "NORMAL";

  alertBox.innerText = "System Status: " + msg;
  alertBox.classList.toggle("danger", msg !== "NORMAL");
});
