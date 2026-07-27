(function () {
  const ALERTS_KEY = "smartHydroAlertLogs";
  const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000;

  const now = Date.now();

  const DEMO_ALERTS = [
    {
      created_at: new Date(now - 35 * 60 * 1000).toISOString(),
      severity: "warning",
      title: "Low water level warning",
      message: "Refill reservoir before level drops below 50%.",
      source: "demo",
      status: "open",
    },
    {
      created_at: new Date(now - 90 * 60 * 1000).toISOString(),
      severity: "warning",
      title: "pH imbalance detected",
      message: "Add pH buffer and verify calibration reading.",
      source: "demo",
      status: "open",
    },
    {
      created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      severity: "critical",
      title: "Nutrient deficiency detected",
      message: "Add nutrients and re-check EC trend after circulation.",
      source: "demo",
      status: "open",
    },
    {
      created_at: new Date("2026-07-20T09:15:00").toISOString(),
      severity: "warning",
      title: "Temperature drift warning",
      message: "Checked fans and shade cover; temperature returned to range.",
      source: "demo",
      status: "closed",
      closed_at: new Date("2026-07-20T11:40:00").toISOString(),
      resolution: "Shade adjusted and airflow increased.",
    },
    {
      created_at: new Date("2026-07-20T14:05:00").toISOString(),
      severity: "warning",
      title: "EC rising above target",
      message: "Diluted nutrient mix and rechecked EC after 20 minutes.",
      source: "demo",
      status: "closed",
      closed_at: new Date("2026-07-20T15:20:00").toISOString(),
      resolution: "Nutrient solution diluted; EC back in balance.",
    },
    {
      created_at: new Date("2026-07-20T18:30:00").toISOString(),
      severity: "critical",
      title: "Water level critical low",
      message: "Reservoir refilled and float sensor cleaned.",
      source: "demo",
      status: "closed",
      closed_at: new Date("2026-07-20T19:10:00").toISOString(),
      resolution: "Reservoir refilled; monitoring resumed.",
    },
  ];

  const elements = {
    section: document.querySelector("#alerts"),
    recentGrid: document.querySelector("#alerts-grid-recent"),
    closedGrid: document.querySelector("#alerts-grid-closed"),
    note: document.querySelector("#alerts-section-note"),
    navLink: document.querySelector("#nav-alerts-link"),
    navBadge: document.querySelector("#nav-alert-badge"),
  };

  if (!elements.recentGrid || !elements.closedGrid) {
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
    let remoteAlerts = [];

    if (client) {
      try {
        const { data, error } = await client
          .from("alert_logs")
          .select("created_at, severity, title, message, source")
          .order("created_at", { ascending: false })
          .limit(24);

        if (!error && data?.length) {
          remoteAlerts = data;
        }
      } catch (_error) {
        // Fall back to local alerts.
      }
    }

    const localAlerts = readLocalAlerts();
    const baseAlerts = remoteAlerts.length
      ? remoteAlerts
      : localAlerts.length
        ? localAlerts
        : DEMO_ALERTS;

    const { recent } = splitAlerts(baseAlerts);

    // If stored/remote alerts are all older (e.g. from July 20), keep those as
    // closed and surface the recent demo warnings as the active set.
    if (!recent.length && baseAlerts !== DEMO_ALERTS) {
      const recentDemos = DEMO_ALERTS.filter((alert) => !isClosed(alert));
      return [...recentDemos, ...baseAlerts];
    }

    return baseAlerts;
  }

  function isRecent(alert) {
    const created = new Date(alert.created_at).getTime();
    if (Number.isNaN(created)) {
      return true;
    }
    return now - created <= RECENT_WINDOW_MS;
  }

  function isClosed(alert) {
    if (alert.status === "closed" || alert.status === "resolved") {
      return true;
    }
    if (alert.status === "open") {
      return false;
    }
    return !isRecent(alert);
  }

  function splitAlerts(alerts) {
    const recent = [];
    const closed = [];

    for (const alert of alerts) {
      if (isClosed(alert)) {
        closed.push(alert);
      } else {
        recent.push(alert);
      }
    }

    recent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    closed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { recent, closed };
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

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderActiveCard(alert) {
    const severity = alert.severity || "warning";

    return `
      <article class="alert-card ${severityClass(severity)} alert-card-active">
        <div>
          <span class="severity ${severityClass(severity)}">${severityLabel(severity)}</span>
          <h3>${escapeHtml(alert.title || "System alert")}</h3>
        </div>
        <p>Timestamp: ${escapeHtml(formatAlertTime(alert.created_at))}</p>
        <p>Suggested action: ${escapeHtml(alert.message || "Review sensor readings and apply maintenance steps.")}</p>
      </article>
    `;
  }

  function renderClosedCard(alert) {
    const resolution =
      alert.resolution ||
      alert.message ||
      "Corrective action was taken and this warning was closed.";

    return `
      <article class="alert-card alert-card-closed">
        <div>
          <span class="severity low">Closed</span>
          <h3>${escapeHtml(alert.title || "System alert")}</h3>
        </div>
        <p>Opened: ${escapeHtml(formatAlertTime(alert.created_at))}</p>
        <p>Action taken: ${escapeHtml(resolution)}</p>
        ${
          alert.closed_at
            ? `<p>Closed: ${escapeHtml(formatAlertTime(alert.closed_at))}</p>`
            : ""
        }
      </article>
    `;
  }

  function renderEmptyRecent() {
    elements.recentGrid.innerHTML = `
      <article class="alert-card alert-card-empty">
        <div>
          <span class="severity">Clear</span>
          <h3>No recent warnings</h3>
        </div>
        <p>Your system looks stable. New warnings will appear here and on the bell icon.</p>
      </article>
    `;
  }

  function renderEmptyClosed() {
    elements.closedGrid.innerHTML = `
      <article class="alert-card alert-card-empty">
        <div>
          <span class="severity">Clear</span>
          <h3>No closed warnings yet</h3>
        </div>
        <p>Resolved warnings will show here once an action has been taken.</p>
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
    const { recent, closed } = splitAlerts(alerts);

    if (recent.length) {
      elements.recentGrid.innerHTML = recent.map(renderActiveCard).join("");
    } else {
      renderEmptyRecent();
    }

    if (closed.length) {
      elements.closedGrid.innerHTML = closed.map(renderClosedCard).join("");
    } else {
      renderEmptyClosed();
    }

    updateNavAttention(recent.length);
  }

  async function refreshAlerts() {
    const alerts = await fetchAlerts();
    renderAlerts(alerts);
  }

  window.SmartHydroAlerts = {
    refresh: refreshAlerts,
    getCount: async () => {
      const { recent } = splitAlerts(await fetchAlerts());
      return recent.length;
    },
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
