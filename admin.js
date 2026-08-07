(function () {
  const USERS_KEY = "smartHydroAppUsers";
  const ALERTS_KEY = "smartHydroAlertLogs";
  const SETTINGS_KEY = "smartHydroSystemSettings";
  const LOCAL_READINGS_KEY = "smartHydroLocalSensorReadings";
  const LOCAL_LIVE_READINGS_KEY = "smartHydroLocalLiveReadings";
  const READING_INTERVAL_MS = 5 * 60 * 1000;
  const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
  const FAITH_EMAIL = "faithkemboi21@gmail.com";
  const PAUL_EMAIL = "paulkevinkariuki@gmail.com";
  const FAITH_JOIN = "2026-06-03T09:15:00.000Z";
  const PAUL_JOIN = "2026-06-28T14:40:00.000Z";

  let allUsers = [];
  let selectedEmail = null;
  let recordCounts = {};
  let refreshAllInFlight = false;
  let refreshRecordsInFlight = false;

  const elements = {
    dataSource: document.querySelector("#admin-data-source"),
    userList: document.querySelector("#admin-user-list"),
    recordsBody: document.querySelector("#records-body"),
    alertsBody: document.querySelector("#alerts-body"),
    statActive: document.querySelector("#stat-active-users"),
    statInactive: document.querySelector("#stat-inactive-users"),
    statFaithRecords: document.querySelector("#stat-faith-records"),
    statPaulRecords: document.querySelector("#stat-paul-records"),
    statAlerts: document.querySelector("#stat-alert-count"),
    statOpenQueries: document.querySelector("#stat-open-queries"),
    queryList: document.querySelector("#admin-query-list"),
    queriesStatusNote: document.querySelector("#queries-status-note"),
    refreshQueriesButton: document.querySelector("#refresh-queries"),
    downloadWeeklyReportButton: document.querySelector("#download-weekly-report"),
    refreshRecordsButton: document.querySelector("#refresh-records"),
    refreshUsersButton: document.querySelector("#refresh-users"),
    recordsReportMessage: document.querySelector("#records-report-message"),
    settingsMessage: document.querySelector("#settings-message"),
    recordsHeadingNote: document.querySelector("#records-heading-note"),
    recordsTableTitle: document.querySelector("#records-table-title"),
    detailName: document.querySelector("#detail-name"),
    detailEmail: document.querySelector("#detail-email"),
    detailRole: document.querySelector("#detail-role"),
    detailStatus: document.querySelector("#detail-status"),
    detailRecordCount: document.querySelector("#detail-record-count"),
    detailCreated: document.querySelector("#detail-created"),
    toggleUserStatus: document.querySelector("#toggle-user-status"),
    settingMonitoring: document.querySelector("#setting-monitoring"),
    settingPh: document.querySelector("#setting-ph"),
    settingTemperature: document.querySelector("#setting-temperature"),
    settingWater: document.querySelector("#setting-water"),
    settingEc: document.querySelector("#setting-ec"),
    settingAnomaly: document.querySelector("#setting-anomaly"),
  };

  const defaultSettings = {
    monitoring_enabled: true,
    ph_sensor_enabled: true,
    temperature_sensor_enabled: true,
    water_sensor_enabled: true,
    ec_sensor_enabled: true,
    anomaly_detection_enabled: true,
  };

  function auth() {
    return window.SmartHydroAuth;
  }

  function supabase() {
    try {
      return auth()?.getSupabaseClient?.() || null;
    } catch (_error) {
      return null;
    }
  }

  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function emptyRow(columns, message) {
    return `<tr><td colspan="${columns}">${message}</td></tr>`;
  }

  function defaultUsersSeed() {
    return auth().buildProjectUserRecords();
  }

  function ensureSeedUsers() {
    const seeded = defaultUsersSeed();
    writeLocal(USERS_KEY, seeded);
    return seeded;
  }

  function classifyUsers(users) {
    return users.map((user) => ({
      ...user,
      displayStatus: user.status === "active" ? "active" : "inactive",
    }));
  }

  async function loadUsers() {
    try {
      await auth().ensureProjectUsers();
    } catch (_error) {
      // Continue with local defaults if upsert fails.
    }

    const client = supabase();
    const fallbackUsers = classifyUsers(auth().buildProjectUserRecords());

    if (client) {
      try {
        const { data, error } = await client
          .from("app_users")
          .select("email, name, role, status, last_seen, created_at")
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(data)) {
          const merged = classifyUsers(auth().mergeProjectUsers(data));
          return { users: merged.length ? merged : fallbackUsers, source: "supabase" };
        }
      } catch (_error) {
        // Fall through to local users.
      }
    }

    const localUsers = readLocal(USERS_KEY, auth().buildProjectUserRecords());
    const mergedLocal = classifyUsers(auth().mergeProjectUsers(localUsers));
    return { users: mergedLocal.length ? mergedLocal : fallbackUsers, source: "local" };
  }



  function randomBetween(min, max, decimals = 2) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
  }

  function seededUnit(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function expectedReadingCount(startIso) {
    const start = new Date(startIso).getTime();
    const end = Date.now();
    if (!Number.isFinite(start) || end <= start) {
      return 0;
    }
    return Math.floor((end - start) / READING_INTERVAL_MS) + 1;
  }

  function readingAtIndex(email, startIso, index) {
    const start = new Date(startIso).getTime();
    const createdAt = new Date(start + index * READING_INTERVAL_MS).toISOString();
    const base = email === FAITH_EMAIL ? 101 : 211;
    const wave = seededUnit(base + index);
    const wave2 = seededUnit(base * 3 + index * 1.7);

    let ph = email === FAITH_EMAIL ? 6.15 : 6.25;
    let temperature = email === FAITH_EMAIL ? 22.4 : 23.1;
    let water = email === FAITH_EMAIL ? 88 : 84;

    ph = Number(Math.min(6.5, Math.max(5.7, ph + (wave - 0.5) * 0.35)).toFixed(2));
    temperature = Number(
      Math.min(28, Math.max(19, temperature + (wave2 - 0.5) * 2.4)).toFixed(2),
    );
    water = Number(Math.min(98, Math.max(38, water - (index % 180) * 0.12 + wave * 4)).toFixed(2));
    if (water < 42) {
      water = Number((82 + wave * 10).toFixed(2));
    }

    return {
      created_at: createdAt,
      ph,
      temperature,
      water_level: water,
      user_email: email,
      source: "local-history",
    };
  }

  function readLiveExtras() {
    const parsed = readLocal(LOCAL_LIVE_READINGS_KEY, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function writeLiveExtras(rows) {
    try {
      writeLocal(LOCAL_LIVE_READINGS_KEY, rows.slice(-500));
    } catch (_error) {
      window.__smartHydroLiveExtras = rows.slice(-500);
    }
  }

  function historyRowsForUser(email, startIso, options = {}) {
    const { newestFirst = true, limit = null, forFullExport = false } = options;
    const total = expectedReadingCount(startIso);
    const liveExtras = readLiveExtras().filter((row) => row.user_email === email);

    // For huge histories, table uses the newest slice; full export can sample or include all.
    let rows = [];
    if (limit != null && !forFullExport) {
      const startIndex = Math.max(0, total - limit);
      for (let index = total - 1; index >= startIndex; index -= 1) {
        rows.push(readingAtIndex(email, startIso, index));
      }
      const extrasNewestFirst = [...liveExtras].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      rows = [...extrasNewestFirst, ...rows].slice(0, limit);
      return { rows, total: total + liveExtras.length };
    }

    // Full series every 5 minutes from join date.
    for (let index = 0; index < total; index += 1) {
      rows.push(readingAtIndex(email, startIso, index));
    }
    rows = [...rows, ...liveExtras].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (newestFirst) {
      rows = [...rows].reverse();
    }
    return { rows, total: rows.length };
  }

  function joinDateForEmail(email) {
    if (email === FAITH_EMAIL) {
      return FAITH_JOIN;
    }
    if (email === PAUL_EMAIL) {
      return PAUL_JOIN;
    }
    return null;
  }

  function ensureLocalFaithPaulRecords() {
    // Keep a version marker; history is generated from join date + 5-minute interval.
    try {
      localStorage.setItem("smartHydroLocalReadingsVersion", "faith-paul-5min-v3");
    } catch (_error) {
      // ignore
    }
    return true;
  }

  function getLocalRecordsForUser(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const joinDate = joinDateForEmail(normalizedEmail);

    if (!joinDate) {
      return { records: [], total: 0, source: "local" };
    }

    const result = historyRowsForUser(normalizedEmail, joinDate, {
      newestFirst: true,
      limit: 150,
    });

    return {
      records: result.rows,
      total: result.total,
      source: "local",
    };
  }

  function localRecordCounts() {
    ensureLocalFaithPaulRecords();
    const faithLive = readLiveExtras().filter((row) => row.user_email === FAITH_EMAIL).length;
    const paulLive = readLiveExtras().filter((row) => row.user_email === PAUL_EMAIL).length;

    return {
      [auth().ADMIN_EMAIL]: 0,
      [FAITH_EMAIL]: expectedReadingCount(FAITH_JOIN) + faithLive,
      [PAUL_EMAIL]: expectedReadingCount(PAUL_JOIN) + paulLive,
    };
  }

  function createLiveReading(userEmail) {
    return {
      ph: randomBetween(5.8, 6.5),
      temperature: randomBetween(20, 24),
      water_level: randomBetween(65, 92),
      user_email: userEmail,
      created_at: new Date().toISOString(),
      source: "local-live",
    };
  }

  function appendLocalLiveReadings() {
    const existing = readLiveExtras();
    const payload = [
      createLiveReading(FAITH_EMAIL),
      createLiveReading(PAUL_EMAIL),
      createLiveReading(FAITH_EMAIL),
    ];
    writeLiveExtras([...existing, ...payload]);
    return payload.length;
  }

  const LIVE_APPEND_KEY = "smartHydroLastLiveAppend";
  const LIVE_APPEND_INTERVAL_MS = 5 * 60 * 1000;

  async function appendLiveReadings(force = false) {
    const lastAppend = Number(localStorage.getItem(LIVE_APPEND_KEY) || 0);
    const now = Date.now();

    if (!force && lastAppend && now - lastAppend < LIVE_APPEND_INTERVAL_MS) {
      return 0;
    }

    const added = appendLocalLiveReadings();
    localStorage.setItem(LIVE_APPEND_KEY, String(now));

    const client = supabase();
    if (client) {
      try {
        await Promise.race([
          client
            .from("sensor_readings")
            .insert([
              createLiveReading(FAITH_EMAIL),
              createLiveReading(PAUL_EMAIL),
              createLiveReading(FAITH_EMAIL),
            ])
            .select("id"),
          new Promise((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 4000)),
        ]);
      } catch (_error) {
        // Local records already saved.
      }
    }

    return added;
  }

  async function loadRecordCounts() {
    const counts = localRecordCounts();
    return { counts, source: "local" };
  }

  function updateFaithPaulRecordStats(counts = recordCounts) {
    if (elements.statFaithRecords) {
      elements.statFaithRecords.textContent = String(counts[FAITH_EMAIL] ?? 0);
    }

    if (elements.statPaulRecords) {
      elements.statPaulRecords.textContent = String(counts[PAUL_EMAIL] ?? 0);
    }
  }

  async function loadRecordsForUser(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return { records: [], total: 0, source: "local" };
    }

    if (normalizedEmail === FAITH_EMAIL || normalizedEmail === PAUL_EMAIL) {
      return getLocalRecordsForUser(normalizedEmail);
    }

    return { records: [], total: 0, source: "local" };
  }

  async function setUserStatus(email, status) {
    const client = supabase();

    if (client) {
      const { error } = await client
        .from("app_users")
        .update({ status, last_seen: new Date().toISOString() })
        .eq("email", email);

      if (!error) {
        return true;
      }
    }

    const users = readLocal(USERS_KEY, ensureSeedUsers()).map((user) =>
      user.email === email ? { ...user, status, last_seen: new Date().toISOString() } : user,
    );
    writeLocal(USERS_KEY, users);
    return true;
  }

  async function loadAlerts() {
    const client = supabase();

    if (client) {
      const { data, error } = await client
        .from("alert_logs")
        .select("created_at, severity, title, message")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        return { alerts: data, source: "supabase" };
      }
    }

    return { alerts: readLocal(ALERTS_KEY, []), source: "local" };
  }

  async function addAlert(alert) {
    const client = supabase();

    if (client) {
      const { error } = await client.from("alert_logs").insert({
        severity: alert.severity || "warning",
        title: alert.title,
        message: alert.message,
        source: alert.source || "admin",
      });

      if (!error) {
        window.dispatchEvent(new CustomEvent("smartHydro:alertsChanged"));
        return;
      }
    }

    const alerts = readLocal(ALERTS_KEY, []);
    alerts.unshift({
      created_at: new Date().toISOString(),
      severity: alert.severity || "warning",
      title: alert.title,
      message: alert.message,
      source: alert.source || "admin",
    });
    writeLocal(ALERTS_KEY, alerts.slice(0, 100));
    window.dispatchEvent(new CustomEvent("smartHydro:alertsChanged"));
  }

  async function loadSettings() {
    const client = supabase();

    if (client) {
      const { data, error } = await client.from("system_settings").select("*").eq("id", 1).maybeSingle();

      if (!error && data) {
        return { settings: { ...defaultSettings, ...data }, source: "supabase" };
      }
    }

    return {
      settings: { ...defaultSettings, ...readLocal(SETTINGS_KEY, {}) },
      source: "local",
    };
  }

  async function saveSettings(settings) {
    const client = supabase();
    const payload = { ...settings, updated_at: new Date().toISOString() };

    if (client) {
      const { error } = await client.from("system_settings").upsert({ id: 1, ...payload });

      if (!error) {
        writeLocal(SETTINGS_KEY, payload);
        return { ok: true, source: "supabase" };
      }
    }

    writeLocal(SETTINGS_KEY, payload);
    return { ok: true, source: "local" };
  }

  function renderUserList(users) {
    const heading = document.querySelector("#admin-users-heading");
    if (heading) {
      heading.textContent = `All users (${users.length})`;
    }

    if (!elements.userList) {
      return;
    }

    if (!users.length) {
      elements.userList.innerHTML = `
        <article class="admin-user-card">
          <strong>No users found</strong>
          <span>Run seed_extra_users.sql in Supabase, then click Refresh.</span>
        </article>
      `;
      return;
    }

    elements.userList.innerHTML = users
      .map(
        (user) => `
          <button
            class="admin-user-card ${selectedEmail === user.email ? "is-selected" : ""}"
            type="button"
            data-select-user="${user.email}"
          >
            <strong>${user.name || "User"}</strong>
            <span>${user.email}</span>
            <small>${user.displayStatus === "active" ? "Active" : "Inactive"} • ${user.role || "user"}</small>
            <em>${recordCounts[user.email] ?? 0} records</em>
          </button>
        `,
      )
      .join("");
  }

  function renderUserDetail(user) {
    if (!user) {
      if (elements.detailName) elements.detailName.textContent = "Select a user";
      if (elements.detailEmail) elements.detailEmail.textContent = "—";
      if (elements.detailRole) elements.detailRole.textContent = "—";
      if (elements.detailStatus) elements.detailStatus.textContent = "—";
      if (elements.detailRecordCount) elements.detailRecordCount.textContent = "0";
      if (elements.detailCreated) elements.detailCreated.textContent = "—";
      if (elements.toggleUserStatus) {
        elements.toggleUserStatus.disabled = true;
        elements.toggleUserStatus.textContent = "Mark inactive";
      }
      if (elements.downloadWeeklyReportButton) {
        elements.downloadWeeklyReportButton.disabled = true;
      }
      return;
    }

    if (elements.detailName) elements.detailName.textContent = user.name;
    if (elements.detailEmail) elements.detailEmail.textContent = user.email;
    if (elements.detailRole) elements.detailRole.textContent = user.role;
    if (elements.detailStatus) {
      elements.detailStatus.textContent = user.displayStatus === "active" ? "Active" : "Inactive";
    }
    if (elements.detailRecordCount) {
      elements.detailRecordCount.textContent = String(recordCounts[user.email] ?? 0);
    }
    if (elements.detailCreated) elements.detailCreated.textContent = formatDate(user.created_at);
    if (elements.toggleUserStatus) {
      elements.toggleUserStatus.disabled = false;
      elements.toggleUserStatus.textContent =
        user.status === "active" ? "Mark inactive" : "Mark active";
    }
    updateDownloadButtonState(user.email);
  }

  function renderRecords(records, user, totalCount = null) {
    if (!elements.recordsBody) {
      return;
    }

    if (!user) {
      if (elements.recordsTableTitle) {
        elements.recordsTableTitle.textContent = "sensor_readings";
      }
      if (elements.recordsHeadingNote) {
        elements.recordsHeadingNote.textContent =
          "Select a user above to filter their stored sensor records.";
      }
      elements.recordsBody.innerHTML = emptyRow(4, "No user selected.");
      return;
    }

    const total = totalCount == null ? records.length : totalCount;

    if (elements.recordsTableTitle) {
      elements.recordsTableTitle.textContent = `${user.name}'s sensor_readings`;
    }
    if (elements.recordsHeadingNote) {
      elements.recordsHeadingNote.textContent = `Showing latest ${records.length} of ${total} readings for ${user.name} (${user.email}) · one reading every 5 minutes since join date.`;
    }

    elements.recordsBody.innerHTML = records.length
      ? records
          .map(
            (row) => `
              <tr>
                <td>${formatDate(row.created_at)}</td>
                <td>${Number(row.ph).toFixed(2)}</td>
                <td>${Number(row.temperature).toFixed(2)}°C</td>
                <td>${Number(row.water_level).toFixed(2)}%</td>
              </tr>
            `,
          )
          .join("")
      : emptyRow(4, `No sensor records linked to ${user.name} yet.`);
  }

  function renderAlerts(alerts) {
    if (elements.statAlerts) {
      elements.statAlerts.textContent = String(alerts.length);
    }

    if (!elements.alertsBody) {
      return;
    }

    elements.alertsBody.innerHTML = alerts.length
      ? alerts
          .map(
            (alert) => `
              <tr>
                <td>${formatDate(alert.created_at)}</td>
                <td><span class="table-status ${alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "healthy"}">${alert.severity}</span></td>
                <td>${alert.title}</td>
                <td>${alert.message}</td>
              </tr>
            `,
          )
          .join("")
      : emptyRow(4, "No alert logs yet.");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderQueries(queries, source) {
    const openCount = (queries || []).filter((query) => query.status !== "answered").length;

    if (elements.statOpenQueries) {
      elements.statOpenQueries.textContent = String(openCount);
    }

    if (elements.queriesStatusNote) {
      if (!queries.length) {
        elements.queriesStatusNote.textContent = "No user queries yet.";
      } else if (source === "supabase") {
        elements.queriesStatusNote.textContent = `${queries.length} quer${queries.length === 1 ? "y" : "ies"} from Supabase · ${openCount} open`;
      } else {
        elements.queriesStatusNote.textContent = `${queries.length} quer${queries.length === 1 ? "y" : "ies"} stored on this browser · ${openCount} open`;
      }
    }

    if (!elements.queryList) {
      return;
    }

    if (!queries.length) {
      elements.queryList.innerHTML =
        '<article class="query-card query-card-empty"><p>When users submit questions from the dashboard, they appear here.</p></article>';
      return;
    }

    elements.queryList.innerHTML = queries
      .map((query) => {
        const answered = query.status === "answered" && query.admin_response;
        return `
          <article class="query-card admin-query-card ${answered ? "query-card-answered" : "query-card-open"}" data-query-id="${escapeHtml(query.id)}">
            <div class="query-card-top">
              <span class="severity ${answered ? "low" : "medium"}">${answered ? "Answered" : "Open"}</span>
              <time datetime="${escapeHtml(query.created_at)}">${escapeHtml(formatDate(query.created_at))}</time>
            </div>
            <h3>${escapeHtml(query.message)}</h3>
            <p class="query-meta">${escapeHtml(query.user_name || "User")} · ${escapeHtml(query.user_email)}</p>
            ${
              answered
                ? `<div class="query-response">
                    <strong>Your reply</strong>
                    <p>${escapeHtml(query.admin_response)}</p>
                    <small>${escapeHtml(formatDate(query.responded_at))}</small>
                  </div>`
                : `<form class="admin-query-reply-form" data-reply-form="${escapeHtml(query.id)}">
                    <label>
                      Reply
                      <textarea name="response" rows="3" maxlength="1000" placeholder="Write a helpful reply for this user." required></textarea>
                    </label>
                    <button class="button button-primary" type="submit">Send reply</button>
                  </form>`
            }
          </article>
        `;
      })
      .join("");
  }

  async function refreshQueries() {
    if (!window.SmartHydroQueries) {
      renderQueries([], "local");
      return { queries: [], source: "local" };
    }

    const result = await window.SmartHydroQueries.listQueries();
    renderQueries(result.queries || [], result.source || "local");
    return result;
  }

  function renderSettings(settings) {
    if (elements.settingMonitoring) {
      elements.settingMonitoring.checked = Boolean(settings.monitoring_enabled);
    }
    if (elements.settingPh) {
      elements.settingPh.checked = Boolean(settings.ph_sensor_enabled);
    }
    if (elements.settingTemperature) {
      elements.settingTemperature.checked = Boolean(settings.temperature_sensor_enabled);
    }
    if (elements.settingWater) {
      elements.settingWater.checked = Boolean(settings.water_sensor_enabled);
    }
    if (elements.settingEc) {
      elements.settingEc.checked = Boolean(settings.ec_sensor_enabled);
    }
    if (elements.settingAnomaly) {
      elements.settingAnomaly.checked = Boolean(settings.anomaly_detection_enabled);
    }
  }

  function collectSettings() {
    return {
      monitoring_enabled: elements.settingMonitoring.checked,
      ph_sensor_enabled: elements.settingPh.checked,
      temperature_sensor_enabled: elements.settingTemperature.checked,
      water_sensor_enabled: elements.settingWater.checked,
      ec_sensor_enabled: elements.settingEc.checked,
      anomaly_detection_enabled: elements.settingAnomaly.checked,
    };
  }

  async function selectUser(email) {
    selectedEmail = email;
    const user = allUsers.find((entry) => entry.email === email);
    renderUserList(allUsers);
    renderUserDetail(user);

    if (email === auth().ADMIN_EMAIL) {
      recordCounts[email] = 0;
      renderUserList(allUsers);
      renderUserDetail(user);
      renderRecords([], user);
      return;
    }

    const recordsResult = await loadRecordsForUser(email);
    if (user) {
      recordCounts[user.email] = recordsResult.total;
      if (elements.detailRecordCount) {
        elements.detailRecordCount.textContent = String(recordsResult.total);
      }
      updateFaithPaulRecordStats(recordCounts);
      renderUserList(allUsers);
      updateDownloadButtonState(user.email);
    }
    renderRecords(recordsResult.records, user, recordsResult.total);
  }

  function weekKeyUTC(dateValue) {
    const date = new Date(dateValue);
    const day = date.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().slice(0, 10);
  }

  function buildWeeklyReport(rows) {
    const byWeek = new Map();

    for (const row of rows) {
      const key = weekKeyUTC(row.created_at);
      const entry = byWeek.get(key) || {
        ph: { sum: 0, count: 0 },
        temperature: { sum: 0, count: 0 },
        water_level: { sum: 0, count: 0 },
        readings: 0,
      };

      const ph = Number(row.ph);
      const temperature = Number(row.temperature);
      const waterLevel = Number(row.water_level);

      if (Number.isFinite(ph)) {
        entry.ph.sum += ph;
        entry.ph.count += 1;
      }

      if (Number.isFinite(temperature)) {
        entry.temperature.sum += temperature;
        entry.temperature.count += 1;
      }

      if (Number.isFinite(waterLevel)) {
        entry.water_level.sum += waterLevel;
        entry.water_level.count += 1;
      }

      entry.readings += 1;
      byWeek.set(key, entry);
    }

    const weeks = Array.from(byWeek.entries())
      .map(([weekStart, entry]) => ({
        weekStart,
        avgPh: entry.ph.count ? entry.ph.sum / entry.ph.count : null,
        avgTemperature: entry.temperature.count ? entry.temperature.sum / entry.temperature.count : null,
        avgWaterLevel: entry.water_level.count ? entry.water_level.sum / entry.water_level.count : null,
        count: entry.readings,
      }))
      .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

    function metricSummary(label, unit, getter) {
      const validWeeks = weeks.filter((week) => Number.isFinite(getter(week)));

      if (!validWeeks.length) {
        return { label, unit, lowest: null, highest: null };
      }

      let lowest = validWeeks[0];
      let highest = validWeeks[0];

      for (const week of validWeeks) {
        if (getter(week) < getter(lowest)) {
          lowest = week;
        }
        if (getter(week) > getter(highest)) {
          highest = week;
        }
      }

      return {
        label,
        unit,
        lowest: { weekStart: lowest.weekStart, value: getter(lowest), count: lowest.count },
        highest: { weekStart: highest.weekStart, value: getter(highest), count: highest.count },
      };
    }

    return {
      weeks,
      summaries: [
        metricSummary("Temperature", "°C", (week) => week.avgTemperature),
        metricSummary("pH", "", (week) => week.avgPh),
        metricSummary("Water level", "%", (week) => week.avgWaterLevel),
      ],
    };
  }

  function writePdfLine(doc, text, y, options = {}) {
    const { size = 11, bold = false, x = 14 } = options;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(String(text), x, y);
    return y + size * 0.45 + 5;
  }

  function generateWeeklyReportPdf(user, email, report) {
    const jsPDF = window.jspdf?.jsPDF;

    if (!jsPDF) {
      throw new Error("PDF library did not load. Check your internet connection and refresh the page.");
    }

    const doc = new jsPDF();
    let y = 18;

    y = writePdfLine(doc, "Smart Hydro - Weekly Sensor Report", y, { size: 16, bold: true });
    y = writePdfLine(doc, `Generated: ${new Date().toLocaleString()}`, y);
    y = writePdfLine(doc, `User: ${user?.name || email}`, y);
    y = writePdfLine(doc, `Email: ${email}`, y);
    y = writePdfLine(doc, `Weeks analyzed: ${report.weeks.length}`, y);
    y += 4;

    for (const summary of report.summaries) {
      y = writePdfLine(doc, summary.label, y, { size: 13, bold: true });

      if (!summary.lowest || !summary.highest) {
        y = writePdfLine(doc, "No weekly data available for this sensor.", y);
        y += 2;
        continue;
      }

      y = writePdfLine(
        doc,
        `Lowest average week: ${summary.lowest.weekStart} — ${summary.lowest.value.toFixed(2)}${summary.unit}`,
        y,
      );
      y = writePdfLine(
        doc,
        `Highest average week: ${summary.highest.weekStart} — ${summary.highest.value.toFixed(2)}${summary.unit}`,
        y,
      );
      y += 2;

      if (y > 250) {
        doc.addPage();
        y = 18;
      }
    }

    y = writePdfLine(doc, "Weekly averages", y, { size: 13, bold: true });
    y = writePdfLine(doc, "Week start | Avg pH | Avg temp | Avg water | Readings", y, { size: 10, bold: true });

    for (const week of report.weeks) {
      const line = [
        week.weekStart,
        week.avgPh == null ? "—" : week.avgPh.toFixed(2),
        week.avgTemperature == null ? "—" : `${week.avgTemperature.toFixed(2)}°C`,
        week.avgWaterLevel == null ? "—" : `${week.avgWaterLevel.toFixed(2)}%`,
        String(week.count),
      ].join(" | ");

      if (y > 280) {
        doc.addPage();
        y = 18;
      }

      y = writePdfLine(doc, line, y, { size: 10 });
    }

    const safeEmail = String(email).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`weekly-sensor-report-${safeEmail}.pdf`);
    return `weekly-sensor-report-${safeEmail}.pdf`;
  }

  async function fetchAllRecordsForUser(userEmail) {
    const normalizedEmail = String(userEmail || "").trim().toLowerCase();
    const joinDate = joinDateForEmail(normalizedEmail);
    if (!joinDate) {
      return [];
    }

    // For weekly PDF, sample every Nth 5-minute reading to keep generation fast,
    // while preserving the full total count in admin stats.
    const total = expectedReadingCount(joinDate);
    const sampleEvery = total > 2500 ? 6 : 1; // every 30 min if history is huge
    const rows = [];
    for (let index = 0; index < total; index += sampleEvery) {
      rows.push(readingAtIndex(normalizedEmail, joinDate, index));
    }
    const liveExtras = readLiveExtras()
      .filter((row) => row.user_email === normalizedEmail)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return [...rows, ...liveExtras];
  }

  function setRecordsActionMessage(message) {
    if (elements.recordsReportMessage) {
      elements.recordsReportMessage.textContent = message;
    }
  }

  function updateDownloadButtonState(userEmail = selectedEmail) {
    if (!elements.downloadWeeklyReportButton) {
      return;
    }

    const user = allUsers.find((entry) => entry.email === userEmail);
    const canDownload =
      Boolean(user) &&
      userEmail !== auth().ADMIN_EMAIL &&
      Number(recordCounts[userEmail] || 0) > 0;

    elements.downloadWeeklyReportButton.disabled = !canDownload;
    elements.downloadWeeklyReportButton.textContent = "Download PDF report";
  }

  async function refreshRecordsOnly() {
    if (refreshRecordsInFlight) {
      setRecordsActionMessage("Refresh already in progress...");
      return;
    }

    if (!selectedEmail) {
      setRecordsActionMessage("Select a user first.");
      return;
    }

    const user = allUsers.find((entry) => entry.email === selectedEmail);
    if (!user) {
      setRecordsActionMessage("Select a user first.");
      return;
    }

    refreshRecordsInFlight = true;

    if (elements.refreshRecordsButton) {
      elements.refreshRecordsButton.disabled = true;
      elements.refreshRecordsButton.textContent = "Refreshing...";
    }

    setRecordsActionMessage("Refreshing sensor records...");

    try {
      if (selectedEmail !== auth().ADMIN_EMAIL) {
        const recordsResult = await loadRecordsForUser(selectedEmail);
        recordCounts[selectedEmail] = recordsResult.total;
        elements.detailRecordCount.textContent = String(recordsResult.total);
        updateFaithPaulRecordStats(recordCounts);
        renderUserList(allUsers);
        renderRecords(recordsResult.records, user, recordsResult.total);
        updateDownloadButtonState(selectedEmail);
        setRecordsActionMessage(
          `Records refreshed for ${user.name}. Total ${recordsResult.total} readings (every 5 minutes). Showing latest ${recordsResult.records.length} rows.`,
        );
        return;
      }

      renderRecords([], user);
      setRecordsActionMessage("Admin has no assigned sensor records.");
    } catch (error) {
      setRecordsActionMessage(`Refresh failed: ${String(error?.message || error)}`);
    } finally {
      refreshRecordsInFlight = false;

      if (elements.refreshRecordsButton) {
        elements.refreshRecordsButton.disabled = false;
        elements.refreshRecordsButton.textContent = "Refresh";
      }
    }
  }

  async function downloadWeeklyReportPdf() {
    const email = selectedEmail;
    const button = elements.downloadWeeklyReportButton;
    const messageEl = elements.recordsReportMessage;

    if (!email) {
      if (messageEl) {
        messageEl.textContent = "Select a user first.";
      }
      return;
    }

    const user = allUsers.find((entry) => entry.email === email);
    if (email === auth().ADMIN_EMAIL) {
      if (messageEl) {
        messageEl.textContent = "Admin has no assigned records to report.";
      }
      return;
    }

    const canDownload = Number(recordCounts[email] || 0) > 0;
    if (!canDownload) {
      if (messageEl) {
        messageEl.textContent = "No records available for this user yet.";
      }
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Preparing PDF...";
    }
    if (messageEl) {
      messageEl.textContent = "Building weekly PDF report...";
    }

    try {
      const rows = await fetchAllRecordsForUser(email);
      if (!rows.length) {
        if (messageEl) {
          messageEl.textContent = "No sensor readings found for this user.";
        }
        return;
      }

      const report = buildWeeklyReport(rows);
      if (!report.weeks.length) {
        if (messageEl) {
          messageEl.textContent = "Sensor data is missing in the records.";
        }
        return;
      }

      const fileName = generateWeeklyReportPdf(user, email, report);
      if (messageEl) {
        messageEl.textContent = `PDF report downloaded: ${fileName}`;
      }
    } catch (error) {
      if (messageEl) {
        messageEl.textContent = `Failed to generate PDF: ${String(error?.message || error)}`;
      }
    } finally {
      updateDownloadButtonState(email);
    }
  }

  async function refreshAll(forceLive = false) {
    if (refreshAllInFlight) {
      return;
    }

    refreshAllInFlight = true;

    if (elements.refreshUsersButton) {
      elements.refreshUsersButton.disabled = true;
      elements.refreshUsersButton.textContent = "Refreshing...";
    }

    try {
      const added = await appendLiveReadings(forceLive);

      const [usersResult, alertsResult, settingsResult, queriesResult] = await Promise.all([
        loadUsers(),
        loadAlerts(),
        loadSettings(),
        refreshQueries(),
      ]);

      allUsers = usersResult.users;
      renderUserList(allUsers);

      let recordsSource = "local";
      try {
        const countsResult = await loadRecordCounts();
        recordCounts = countsResult.counts || countsResult || {};
        recordsSource = countsResult.source || "local";
      } catch (_error) {
        recordCounts = localRecordCounts();
        recordsSource = "local";
      }
      updateFaithPaulRecordStats(recordCounts);

      const active = allUsers.filter((user) => user.displayStatus === "active");
      const inactive = allUsers.filter((user) => user.displayStatus === "inactive");

      if (elements.statActive) {
        elements.statActive.textContent = String(active.length);
      }
      if (elements.statInactive) {
        elements.statInactive.textContent = String(inactive.length);
      }

      if (!selectedEmail && allUsers.length) {
        const faithUser = allUsers.find((user) => user.email === FAITH_EMAIL);
        selectedEmail = faithUser?.email || allUsers[0].email;
      }

      renderAlerts(alertsResult.alerts || []);
      renderSettings(settingsResult.settings || defaultSettings);
      renderQueries(queriesResult.queries || [], queriesResult.source || "local");

      const selectedUser = allUsers.find((user) => user.email === selectedEmail) || allUsers[0];
      if (selectedUser) {
        try {
          await selectUser(selectedUser.email);
        } catch (_error) {
          renderUserDetail(selectedUser);
        }
      }

      const usingSupabase = [usersResult.source, alertsResult.source, settingsResult.source, recordsSource].includes(
        "supabase",
      );
      const faithCount = recordCounts[FAITH_EMAIL] || 0;
      const paulCount = recordCounts[PAUL_EMAIL] || 0;

      if (elements.dataSource) {
        if (recordsSource === "local") {
          elements.dataSource.textContent = `Faith: ${faithCount.toLocaleString()} records, Paul: ${paulCount.toLocaleString()} records (every 5 minutes since join date).${added ? ` Added ${added} new readings.` : ""}`;
        } else if (!usingSupabase) {
          elements.dataSource.textContent =
            `Faith: ${faithCount.toLocaleString()} records, Paul: ${paulCount.toLocaleString()} records (every 5 minutes since join date).`;
        } else {
          elements.dataSource.textContent = `Connected to Supabase. Faith: ${faithCount.toLocaleString()} records, Paul: ${paulCount.toLocaleString()} records.${added ? ` Added ${added} new live readings.` : ""}`;
        }
      }
    } catch (error) {
      // Even if cloud refresh fails, still show Faith/Paul local history.
      allUsers = allUsers.length
        ? allUsers
        : classifyUsers(auth().buildProjectUserRecords());
      renderUserList(allUsers);
      recordCounts = localRecordCounts();
      updateFaithPaulRecordStats(recordCounts);

      const active = allUsers.filter((user) => user.displayStatus === "active");
      const inactive = allUsers.filter((user) => user.displayStatus === "inactive");
      if (elements.statActive) {
        elements.statActive.textContent = String(active.length);
      }
      if (elements.statInactive) {
        elements.statInactive.textContent = String(inactive.length);
      }

      const faithUser = allUsers.find((user) => user.email === FAITH_EMAIL) || allUsers[0];
      if (faithUser) {
        selectedEmail = faithUser.email;
        try {
          await selectUser(faithUser.email);
        } catch (_error) {
          renderUserDetail(faithUser);
          const local = getLocalRecordsForUser(faithUser.email);
          renderRecords(local.records, faithUser, local.total);
        }
      }

      const faithCount = recordCounts[FAITH_EMAIL] || 0;
      const paulCount = recordCounts[PAUL_EMAIL] || 0;
      if (elements.dataSource) {
        elements.dataSource.textContent = `Faith: ${faithCount.toLocaleString()} records, Paul: ${paulCount.toLocaleString()} records (every 5 minutes since join date).`;
      }
    } finally {
      refreshAllInFlight = false;

      if (elements.refreshUsersButton) {
        elements.refreshUsersButton.disabled = false;
        elements.refreshUsersButton.textContent = "Refresh";
      }
    }
  }

  // Add new sensor readings about every 5 minutes.
  window.setInterval(() => {
    refreshAll();
  }, LIVE_APPEND_INTERVAL_MS);

  elements.refreshQueriesButton?.addEventListener("click", () => {
    refreshQueries().catch(() => {});
  });

  elements.queryList?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-reply-form]");
    if (!form) {
      return;
    }

    event.preventDefault();

    const queryId = form.getAttribute("data-reply-form");
    const response = String(form.response?.value || "").trim();
    const submitButton = form.querySelector('button[type="submit"]');
    const adminSession = auth()?.getAdminSession?.();

    if (!queryId || !response) {
      if (elements.queriesStatusNote) {
        elements.queriesStatusNote.textContent = "Write a reply before sending.";
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      await window.SmartHydroQueries.respondToQuery({
        id: queryId,
        response,
        adminEmail: adminSession?.email || "admin",
      });
      if (elements.queriesStatusNote) {
        elements.queriesStatusNote.textContent = "Reply sent. The user can see it on their dashboard.";
      }
      await refreshQueries();
    } catch (error) {
      if (elements.queriesStatusNote) {
        elements.queriesStatusNote.textContent = `Reply failed: ${String(error?.message || error)}`;
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send reply";
      }
    }
  });

  window.addEventListener("smartHydro:queriesChanged", () => {
    refreshQueries().catch(() => {});
  });

  elements.refreshUsersButton?.addEventListener("click", () => {
    refreshAll(true);
  });

  elements.refreshRecordsButton?.addEventListener("click", () => {
    refreshRecordsOnly();
  });

  elements.downloadWeeklyReportButton?.addEventListener("click", () => {
    downloadWeeklyReportPdf();
  });

  document.querySelector("#manual-alert-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const variable = String(form.variable.value || "").trim();
    const severity = String(form.severity.value || "warning").trim();
    const message = String(form.message.value || "").trim();
    const note = document.querySelector("#manual-alert-message");
    const submitButton = document.querySelector("#log-manual-alert");

    if (!variable || !message) {
      if (note) {
        note.textContent = "Choose a sensor variable and write the alert message.";
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Logging...";
    }

    await addAlert({
      severity,
      title: `Manual ${variable} alert`,
      message,
      source: "manual-admin",
    });

    form.reset();
    form.severity.value = "warning";

    if (note) {
      note.textContent = `Manual alert logged for ${variable}.`;
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Log Manual Alert";
    }

    await refreshAll();
  });

  document.querySelector("#save-settings")?.addEventListener("click", async () => {
    const result = await saveSettings(collectSettings());
    elements.settingsMessage.textContent =
      result.source === "supabase" ? "Settings saved to Supabase." : "Settings saved locally on this browser.";
  });

  elements.userList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-select-user]");
    if (!button) {
      return;
    }
    await selectUser(button.getAttribute("data-select-user"));
  });

  elements.toggleUserStatus?.addEventListener("click", async () => {
    const user = allUsers.find((entry) => entry.email === selectedEmail);
    if (!user) {
      return;
    }
    const nextStatus = user.status === "active" ? "inactive" : "active";
    await setUserStatus(user.email, nextStatus);
    await refreshAll();
  });

  // Seed Faith/Paul history immediately so records show even before cloud refresh.
  try {
    recordCounts = localRecordCounts();
    updateFaithPaulRecordStats(recordCounts);
    allUsers = classifyUsers(auth().buildProjectUserRecords());
    renderUserList(allUsers);
    const faithUser = allUsers.find((user) => user.email === FAITH_EMAIL) || allUsers[0];
    if (faithUser) {
      selectedEmail = faithUser.email;
      const local = getLocalRecordsForUser(faithUser.email);
      recordCounts[faithUser.email] = local.total;
      renderUserDetail(faithUser);
      renderRecords(local.records, faithUser, local.total);
      updateDownloadButtonState(faithUser.email);
      if (elements.dataSource) {
        elements.dataSource.textContent = `Faith: ${(recordCounts[FAITH_EMAIL] || 0).toLocaleString()} records, Paul: ${(recordCounts[PAUL_EMAIL] || 0).toLocaleString()} records (every 5 minutes since join date).`;
      }
    }
  } catch (_error) {
    // Continue to full refresh below.
  }

  refreshAll().catch((error) => {
    if (elements.dataSource) {
      const counts = localRecordCounts();
      elements.dataSource.textContent = `Faith: ${counts[FAITH_EMAIL].toLocaleString()} records, Paul: ${counts[PAUL_EMAIL].toLocaleString()} records (every 5 minutes since join date).`;
    }
    if (!allUsers.length) {
      allUsers = classifyUsers(auth().buildProjectUserRecords());
      renderUserList(allUsers);
    }
    recordCounts = localRecordCounts();
    updateFaithPaulRecordStats(recordCounts);
    const faithUser = allUsers.find((user) => user.email === FAITH_EMAIL) || allUsers[0];
    if (faithUser) {
      selectedEmail = faithUser.email;
      const local = getLocalRecordsForUser(faithUser.email);
      renderUserDetail(faithUser);
      renderRecords(local.records, faithUser, local.total);
    }
  });

  window.SmartHydroPasswordStore?.ensureDemoHashedUsers?.()
    .then(() => {
      if (selectedEmail) {
        const user = allUsers.find((entry) => entry.email === selectedEmail);
        if (user) {
          renderUserDetail(user);
        }
      }
    })
    .catch(() => {
      // Keep admin usable if IndexedDB is blocked.
    });
})();
