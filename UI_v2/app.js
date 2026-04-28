const titleByView = {
  home: "Good Morning",
  composer: "Sound Composer",
  silence: "Silent Frequencies",
  stats: "Your Listening Stats",
  settings: "Settings",
};

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const title = document.getElementById("view-title");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const nextView = item.dataset.view;

    navItems.forEach((button) =>
      button.classList.toggle("is-active", button === item),
    );

    views.forEach((view) =>
      view.classList.toggle("is-active", view.dataset.view === nextView),
    );

    title.textContent = titleByView[nextView] ?? "Serene";
  });
});

// ── Bottom Player & Now Playing Rail ──────────────────────────────

let isPlaying = true;
let progressSec = 0;
let progressInterval = null;

function togglePlay() {
  isPlaying = !isPlaying;

  const bpIcon = document.getElementById("bpPlayIcon");
  const npBtn = document.getElementById("npPauseBtn");
  const eqMini = document.getElementById("eqMini");

  if (isPlaying) {
    bpIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    npBtn.textContent = "Pause";
    eqMini.classList.add("is-playing");
    startProgress();
  } else {
    bpIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    npBtn.textContent = "Play";
    eqMini.classList.remove("is-playing");
    stopProgress();
  }
}

function startProgress() {
  stopProgress();
  progressInterval = setInterval(() => {
    progressSec++;
    const m = Math.floor(progressSec / 60);
    const s = progressSec % 60;
    document.getElementById("bpTime").textContent =
      m + ":" + (s < 10 ? "0" : "") + s;
    const pct = Math.min(100, (progressSec / 3600) * 100);
    document.getElementById("bpFill").style.width = pct + "%";
  }, 1000);
}

function stopProgress() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function seekBar(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  progressSec = Math.floor(pct * 3600);
  document.getElementById("bpFill").style.width = (pct * 100).toFixed(1) + "%";
}

function setTimer(mins, btn) {
  document.querySelectorAll(".timer-options button").forEach((b) =>
    b.classList.remove("is-active"),
  );
  btn.classList.add("is-active");
  document.getElementById("npTimerLabel").textContent = mins + " min";
}

// ── Now Playing rail tabs ──────────────────────────────────────────
document.querySelectorAll(".np-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".np-tab").forEach((t) =>
      t.classList.remove("is-active"),
    );
    tab.classList.add("is-active");
  });
});

// Start in playing state by default
startProgress();
document.getElementById("eqMini").classList.add("is-playing");
