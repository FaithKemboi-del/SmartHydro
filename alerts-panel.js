(function () {
  const ALERTS_KEY = "smartHydroAlertLogs";

  const DEMO_ALERTS = [
    {
      created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      severity: "warning",
      title: "Low water level warning",
      message: "Refill reservoir before level drops below 50%.",
      source: "demo",
    },
    {
      created_at: new Date(Date.now() - 96 * 60 * 1000).toISOString(),
      severity: "warning",
      title: "pH imbalance detected",
      message: "Add pH buffer and verify calibration reading.",
      source: "demo",
    },
    {
      created_at: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
      severity: "critical",
      title: "Nutrient deficiency detected",
      message: "Add nutrients and re-check EC trend after circulation.",
      source: "demo",
    },
  ];

  const elements = {
    section: document.querySelector("#alerts"),
    grid: document.querySelector("#alerts-grid"),
    note: document.querySelector("#alerts-section-note"),
    navLink: document.querySelector("#nav-alerts-link"),
    navBadge: document.querySelector("#nav-alert-badge"),
  };

  if (!elements.grid) {
    return;
  }

  let beepInterval = null;
  let audioContext = null;

  function readLocalAlerts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  async function fetchAlerts() {
    const client = window.SmartHydroAuth?.getSupabaseClient?.();

    if (client) {
      try {
        const { data, error } = await client
          .from("alert_logs")
          .select("created_at, severity, title, message, source")
          .order("created_at", { ascending: false })
          .limit(12);

        if (!error && data?.length) {
          return data;
        }
      } catch (_error) {
        // Fall back to local alerts.
      }
    }

    const localAlerts = readLocalAlerts();
    return localAlerts.length ? localAlerts : DEMO_ALERTS;
  }

  function severityLabel(severity) {
    if (severity === "critical") {
      return "High";
    }

    if (severity === "warning") {
      return "Medium";
    }

    return "Low";
  }

  function severityClass(severity) {
    if (severity === "critical") {
      return "high";
    }

    if (severity === "warning") {
      return "medium";
    }

    return "low";
  }

  function formatAlertTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function renderAlertCard(alert) {
    const severity = alert.severity || "warning";

    return `
      <article class="alert-card ${severityClass(severity)} alert-card-active">
        <div>
          <span class="severity ${severityClass(severity)}">${severityLabel(severity)}</span>
          <h3>${alert.title || "System alert"}</h3>
        </div>
        <p>Timestamp: ${formatAlertTime(alert.created_at)}</p>
        <p>Suggested action: ${alert.message || "Review sensor readings and apply maintenance steps."}</p>
      </article>
    `;
  }

  function renderEmptyState() {
    elements.grid.innerHTML = `
      <article class="alert-card alert-card-empty">
        <div>
          <span class="severity">Clear</span>
          <h3>No active alerts</h3>
        </div>
        <p>Your system looks stable. New warnings will appear here and on the bell icon.</p>
      </article>
    `;
  }

  function playAttentionBeep() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return;
    }

    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.0001;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();

      gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (_error) {
      // Ignore audio failures and keep visual alerts.
    }
  }

  function startAttentionBeep() {
    if (beepInterval || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    playAttentionBeep();
    beepInterval = window.setInterval(playAttentionBeep, 3200);
  }

  function stopAttentionBeep() {
    if (beepInterval) {
      window.clearInterval(beepInterval);
      beepInterval = null;
    }
  }

  function updateNavAttention(count) {
    const hasAlerts = count > 0;

    elements.section?.classList.toggle("has-active-alerts", hasAlerts);
    elements.note?.toggleAttribute("hidden", !hasAlerts);
    elements.navLink?.classList.toggle("is-attention", hasAlerts);
    elements.navLink?.setAttribute("aria-label", hasAlerts ? `Alerts (${count}) need attention` : "Alerts");

    if (elements.navBadge) {
      elements.navBadge.hidden = !hasAlerts;
      elements.navBadge.textContent = String(count);
    }

    if (hasAlerts) {
      startAttentionBeep();
    } else {
      stopAttentionBeep();
    }
  }

  function renderAlerts(alerts) {
    if (!alerts.length) {
      renderEmptyState();
      updateNavAttention(0);
      return;
    }

    elements.grid.innerHTML = alerts.map(renderAlertCard).join("");
    updateNavAttention(alerts.length);
  }

  async function refreshAlerts() {
    const alerts = await fetchAlerts();
    renderAlerts(alerts);
  }

  window.SmartHydroAlerts = {
    refresh: refreshAlerts,
    getCount: async () => (await fetchAlerts()).length,
  };

  window.addEventListener("smartHydro:alertsChanged", refreshAlerts);
  window.addEventListener("storage", (event) => {
    if (event.key === ALERTS_KEY) {
      refreshAlerts();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAttentionBeep();
      return;
    }

    refreshAlerts();
  });

  refreshAlerts();
})();
