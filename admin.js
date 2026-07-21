(function () {
  const USERS_KEY = "smartHydroAppUsers";
  const ALERTS_KEY = "smartHydroAlertLogs";
  const SETTINGS_KEY = "smartHydroSystemSettings";
  const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

  let allUsers = [];
  let selectedEmail = null;
  let recordCounts = {};
  let redistributionInFlight = false;

  const elements = {
    dataSource: document.querySelector("#admin-data-source"),
    userList: document.querySelector("#admin-user-list"),
    recordsBody: document.querySelector("#records-body"),
    alertsBody: document.querySelector("#alerts-body"),
    statActive: document.querySelector("#stat-active-users"),
    statInactive: document.querySelector("#stat-inactive-users"),
    statRecords: document.querySelector("#stat-db-records"),
    statAlerts: document.querySelector("#stat-alert-count"),
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
    return auth()?.getSupabaseClient?.() || null;
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
    return auth().DEFAULT_USERS.map((user) => ({
      ...user,
      last_seen: user.status === "inactive" ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
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
    await auth().ensureProjectUsers();

    const client = supabase();

    if (client) {
      const { data, error } = await client
        .from("app_users")
        .select("email, name, role, status, last_seen, created_at")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        return { users: classifyUsers(auth().mergeProjectUsers(data)), source: "supabase" };
      }
    }

    const localUsers = readLocal(USERS_KEY, auth().buildProjectUserRecords());
    return { users: classifyUsers(auth().mergeProjectUsers(localUsers)), source: "local" };
  }



  async function redistributeAllReadingsUnevenly() {
    const client = supabase();

    if (!client) {
      return false;
    }

    const faithEmail = "faithkemboi21@gmail.com";
    const paulEmail = "paulkevinkariuki@gmail.com";
    const pageSize = 1000;
    let start = 0;
    const ids = [];

    while (true) {
      const { data, error } = await client
        .from("sensor_readings")
        .select("id")
        .order("created_at", { ascending: true })
        .range(start, start + pageSize - 1);

      if (error || !data?.length) {
        break;
      }

      ids.push(...data.map((row) => row.id));

      if (data.length < pageSize) {
        break;
      }

      start += pageSize;
    }

    if (!ids.length) {
      return false;
    }

    const faithTarget = Math.floor(ids.length * 0.62);
    const faithIds = ids.slice(0, faithTarget);
    const paulIds = ids.slice(faithTarget);

    for (let index = 0; index < faithIds.length; index += 100) {
      const chunk = faithIds.slice(index, index + 100);
      await client.from("sensor_readings").update({ user_email: faithEmail }).in("id", chunk);
    }

    for (let index = 0; index < paulIds.length; index += 100) {
      const chunk = paulIds.slice(index, index + 100);
      await client.from("sensor_readings").update({ user_email: paulEmail }).in("id", chunk);
    }

    return true;
  }

  function randomBetween(min, max, decimals = 2) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
  }

  function createLiveReading(userEmail) {
    return {
      ph: randomBetween(5.8, 6.5),
      temperature: randomBetween(20, 24),
      water_level: randomBetween(65, 92),
      user_email: userEmail,
      created_at: new Date().toISOString(),
    };
  }

  const LIVE_APPEND_KEY = "smartHydroLastLiveAppend";
  const LIVE_APPEND_INTERVAL_MS = 5 * 60 * 1000;

  async function appendLiveReadings(force = false) {
    const client = supabase();

    if (!client) {
      return 0;
    }

    const lastAppend = Number(localStorage.getItem(LIVE_APPEND_KEY) || 0);
    const now = Date.now();

    if (!force && lastAppend && now - lastAppend < LIVE_APPEND_INTERVAL_MS) {
      return 0;
    }

    const faithEmail = "faithkemboi21@gmail.com";
    const paulEmail = "paulkevinkariuki@gmail.com";
    const payload = [
      createLiveReading(faithEmail),
      createLiveReading(paulEmail),
      createLiveReading(faithEmail),
    ];

    const { data, error } = await client.from("sensor_readings").insert(payload).select("id");

    if (error) {
      console.warn("Could not append live sensor readings:", error.message || error);
      return 0;
    }

    localStorage.setItem(LIVE_APPEND_KEY, String(now));
    return data?.length || payload.length;
  }

  async function loadRecordCounts() {
    const emails = auth().DEFAULT_USERS.map((user) => user.email);
    const adminEmail = auth().ADMIN_EMAIL;
    const client = supabase();
    const counts = {};

    emails.forEach((email) => {
      counts[email] = 0;
    });

    if (!client) {
      return counts;
    }

    const { count: unassignedCount } = await client
      .from("sensor_readings")
      .select("id", { count: "exact", head: true })
      .is("user_email", null);

    if ((unassignedCount || 0) > 0 && !redistributionInFlight) {
      redistributionInFlight = true;
      redistributeAllReadingsUnevenly()
        .then((redistributed) => {
          if (redistributed) {
            refreshAll();
          }
        })
        .catch(() => {
          // Assignment can be retried on the next refresh.
        })
        .finally(() => {
          redistributionInFlight = false;
        });
    }

    await Promise.all(
      emails.map(async (email) => {
        if (email === adminEmail) {
          counts[email] = 0;
          return;
        }

        const { count, error } = await client
          .from("sensor_readings")
          .select("id", { count: "exact", head: true })
          .eq("user_email", email);

        counts[email] = error ? 0 : count || 0;
      }),
    );

    return counts;
  }

  function assignedRecordsTotal(counts) {
    const adminEmail = auth().ADMIN_EMAIL;
    return Object.entries(counts).reduce((sum, [email, value]) => {
      if (email === adminEmail) {
        return sum;
      }
      return sum + Number(value || 0);
    }, 0);
  }

  async function loadRecordsForUser(email) {
    const client = supabase();

    if (!client || !email) {
      return { records: [], total: recordCounts[email] || 0 };
    }

    const { data, error, count } = await client
      .from("sensor_readings")
      .select("created_at, ph, temperature, water_level, user_email", { count: "exact" })
      .eq("user_email", email)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { records: [], total: recordCounts[email] || 0 };
    }

    return {
      records: data || [],
      total: count ?? recordCounts[email] ?? data?.length ?? 0,
    };
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
    elements.userList.innerHTML = users
      .map(
        (user) => `
          <button
            class="admin-user-card ${selectedEmail === user.email ? "is-selected" : ""}"
            type="button"
            data-select-user="${user.email}"
          >
            <strong>${user.name}</strong>
            <span>${user.email}</span>
            <small>${user.displayStatus === "active" ? "Active" : "Inactive"} • ${user.role}</small>
            <em>${recordCounts[user.email] ?? 0} records</em>
          </button>
        `,
      )
      .join("");
  }

  function renderUserDetail(user) {
    if (!user) {
      elements.detailName.textContent = "Select a user";
      elements.detailEmail.textContent = "—";
      elements.detailRole.textContent = "—";
      elements.detailStatus.textContent = "—";
        elements.detailRecordCount.textContent = "0";
      elements.detailCreated.textContent = "—";
      elements.toggleUserStatus.disabled = true;
      elements.toggleUserStatus.textContent = "Mark inactive";
      return;
    }

    elements.detailName.textContent = user.name;
    elements.detailEmail.textContent = user.email;
    elements.detailRole.textContent = user.role;
    elements.detailStatus.textContent = user.displayStatus === "active" ? "Active" : "Inactive";
    elements.detailRecordCount.textContent = String(recordCounts[user.email] ?? 0);
    elements.detailCreated.textContent = formatDate(user.created_at);
    elements.toggleUserStatus.disabled = false;
    elements.toggleUserStatus.textContent =
      user.status === "active" ? "Mark inactive" : "Mark active";
  }

  function renderRecords(records, user) {
    if (!user) {
      elements.recordsTableTitle.textContent = "sensor_readings";
      elements.recordsHeadingNote.textContent = "Select a user above to filter their stored sensor records.";
      elements.recordsBody.innerHTML = emptyRow(4, "No user selected.");
      return;
    }

    elements.recordsTableTitle.textContent = `${user.name}'s sensor_readings`;
    elements.recordsHeadingNote.textContent = `Showing records linked to ${user.name} (${user.email}).`;

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
      : emptyRow(4, `No sensor records linked to ${user.name} yet. Run seed_users.py to assign records.`);
  }

  function renderAlerts(alerts) {
    elements.statAlerts.textContent = String(alerts.length);

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

  function renderSettings(settings) {
    elements.settingMonitoring.checked = Boolean(settings.monitoring_enabled);
    elements.settingPh.checked = Boolean(settings.ph_sensor_enabled);
    elements.settingTemperature.checked = Boolean(settings.temperature_sensor_enabled);
    elements.settingWater.checked = Boolean(settings.water_sensor_enabled);
    elements.settingEc.checked = Boolean(settings.ec_sensor_enabled);
    elements.settingAnomaly.checked = Boolean(settings.anomaly_detection_enabled);
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
      elements.detailRecordCount.textContent = String(recordsResult.total);
      elements.statRecords.textContent = String(assignedRecordsTotal(recordCounts));
      renderUserList(allUsers);
    }
    renderRecords(recordsResult.records, user);
  }

  async function refreshAll() {
    const added = await appendLiveReadings();

    const [usersResult, alertsResult, settingsResult] = await Promise.all([
      loadUsers(),
      loadAlerts(),
      loadSettings(),
    ]);

    allUsers = usersResult.users;
    recordCounts = await loadRecordCounts();
    const totalRecords = assignedRecordsTotal(recordCounts);

    const active = allUsers.filter((user) => user.displayStatus === "active");
    const inactive = allUsers.filter((user) => user.displayStatus === "inactive");

    elements.statActive.textContent = String(active.length);
    elements.statInactive.textContent = String(inactive.length);
    elements.statRecords.textContent = String(totalRecords);

    if (!selectedEmail && allUsers.length) {
      selectedEmail = allUsers[0].email;
    }

    renderUserList(allUsers);
    renderAlerts(alertsResult.alerts);
    renderSettings(settingsResult.settings);

    const selectedUser = allUsers.find((user) => user.email === selectedEmail) || allUsers[0];
    if (selectedUser) {
      await selectUser(selectedUser.email);
    }

    const usingSupabase = [usersResult.source, alertsResult.source, settingsResult.source].includes("supabase");
    elements.dataSource.textContent = usingSupabase
      ? `Connected to Supabase. ${added ? `Added ${added} new live readings (every 5 minutes). ` : ""}Total shown is Faith + Paul only (Admin stays at 0).`
      : "Using local admin storage. Configure Supabase to enable live increasing records.";
  }

  // Add new sensor readings about every 5 minutes.
  window.setInterval(() => {
    refreshAll();
  }, LIVE_APPEND_INTERVAL_MS);

  document.querySelector("#refresh-users")?.addEventListener("click", refreshAll);
  document.querySelector("#refresh-records")?.addEventListener("click", refreshAll);

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

  refreshAll();
})();
