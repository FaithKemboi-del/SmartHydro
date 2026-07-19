(function () {
  const USERS_KEY = "smartHydroAppUsers";
  const ALERTS_KEY = "smartHydroAlertLogs";
  const SETTINGS_KEY = "smartHydroSystemSettings";
  const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

  const elements = {
    dataSource: document.querySelector("#admin-data-source"),
    activeUsersBody: document.querySelector("#active-users-body"),
    inactiveUsersBody: document.querySelector("#inactive-users-body"),
    recordsBody: document.querySelector("#records-body"),
    alertsBody: document.querySelector("#alerts-body"),
    statActive: document.querySelector("#stat-active-users"),
    statInactive: document.querySelector("#stat-inactive-users"),
    statRecords: document.querySelector("#stat-db-records"),
    statAlerts: document.querySelector("#stat-alert-count"),
    settingsMessage: document.querySelector("#settings-message"),
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

  function ensureSeedUsers() {
    const users = readLocal(USERS_KEY, []);
    const adminEmail = auth().ADMIN_EMAIL;

    if (!users.some((user) => user.email === adminEmail)) {
      users.unshift({
        email: adminEmail,
        role: "admin",
        status: "active",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      writeLocal(USERS_KEY, users);
    }

    return users;
  }

  function classifyUsers(users) {
    const now = Date.now();

    return users.map((user) => {
      const lastSeen = new Date(user.last_seen || user.created_at || Date.now()).getTime();
      const recentlySeen = now - lastSeen <= ACTIVE_WINDOW_MS;
      const isActive = user.status === "active" && recentlySeen;

      return {
        ...user,
        displayStatus: isActive ? "active" : "inactive",
      };
    });
  }

  async function loadUsers() {
    const client = supabase();

    if (client) {
      const { data, error } = await client
        .from("app_users")
        .select("email, role, status, last_seen, created_at")
        .order("last_seen", { ascending: false });

      if (!error && Array.isArray(data)) {
        if (!data.length) {
          await auth().trackUserActivity(auth().ADMIN_EMAIL, "admin");
          const retry = await client
            .from("app_users")
            .select("email, role, status, last_seen, created_at")
            .order("last_seen", { ascending: false });
          return { users: classifyUsers(retry.data || []), source: "supabase" };
        }

        return { users: classifyUsers(data), source: "supabase" };
      }
    }

    return { users: classifyUsers(ensureSeedUsers()), source: "local" };
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

    const users = ensureSeedUsers().map((user) =>
      user.email === email
        ? { ...user, status, last_seen: new Date().toISOString() }
        : user,
    );
    writeLocal(USERS_KEY, users);
    return true;
  }

  async function loadRecords() {
    const client = supabase();

    if (client) {
      const { data, error, count } = await client
        .from("sensor_readings")
        .select("created_at, ph, temperature, water_level", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        return { records: data, total: count ?? data.length, source: "supabase" };
      }
    }

    return { records: [], total: 0, source: "local" };
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
    const payload = {
      created_at: new Date().toISOString(),
      severity: alert.severity || "warning",
      title: alert.title,
      message: alert.message,
      source: alert.source || "admin",
    };

    const client = supabase();

    if (client) {
      const { error } = await client.from("alert_logs").insert({
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        source: payload.source,
      });

      if (!error) {
        return;
      }
    }

    const alerts = readLocal(ALERTS_KEY, []);
    alerts.unshift(payload);
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
    const payload = {
      ...settings,
      updated_at: new Date().toISOString(),
    };

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

  function renderUsers(users) {
    const active = users.filter((user) => user.displayStatus === "active");
    const inactive = users.filter((user) => user.displayStatus === "inactive");

    elements.statActive.textContent = String(active.length);
    elements.statInactive.textContent = String(inactive.length);

    elements.activeUsersBody.innerHTML = active.length
      ? active
          .map(
            (user) => `
              <tr>
                <td>${user.email}</td>
                <td>${user.role || "user"}</td>
                <td>${formatDate(user.last_seen)}</td>
                <td>
                  <button class="button button-ghost admin-row-action" type="button" data-action="deactivate" data-email="${user.email}">
                    Mark inactive
                  </button>
                </td>
              </tr>
            `,
          )
          .join("")
      : emptyRow(4, "No active users right now.");

    elements.inactiveUsersBody.innerHTML = inactive.length
      ? inactive
          .map(
            (user) => `
              <tr>
                <td>${user.email}</td>
                <td>${user.role || "user"}</td>
                <td>${formatDate(user.last_seen)}</td>
                <td>
                  <button class="button button-ghost admin-row-action" type="button" data-action="activate" data-email="${user.email}">
                    Mark active
                  </button>
                </td>
              </tr>
            `,
          )
          .join("")
      : emptyRow(4, "No inactive users.");
  }

  function renderRecords(records, total) {
    elements.statRecords.textContent = String(total);

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
      : emptyRow(
          4,
          "No sensor records found. Confirm sensor_readings exists in Supabase and contains data.",
        );
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

  async function refreshAll() {
    const [usersResult, recordsResult, alertsResult, settingsResult] = await Promise.all([
      loadUsers(),
      loadRecords(),
      loadAlerts(),
      loadSettings(),
    ]);

    renderUsers(usersResult.users);
    renderRecords(recordsResult.records, recordsResult.total);
    renderAlerts(alertsResult.alerts);
    renderSettings(settingsResult.settings);

    const sources = [
      usersResult.source,
      recordsResult.source,
      alertsResult.source,
      settingsResult.source,
    ];
    const usingSupabase = sources.includes("supabase");

    elements.dataSource.textContent = usingSupabase
      ? "Connected to Supabase for available admin tables. Run the latest supabase_schema.sql if some sections still use local storage."
      : "Using local admin storage. Run the latest supabase_schema.sql in Supabase to sync users, alerts, and settings to the cloud.";
  }

  document.querySelector("#refresh-users")?.addEventListener("click", () => {
    refreshAll();
  });

  document.querySelector("#refresh-records")?.addEventListener("click", () => {
    refreshAll();
  });

  document.querySelector("#add-sample-alert")?.addEventListener("click", async () => {
    await addAlert({
      severity: "warning",
      title: "Nutrient level check",
      message: "Admin logged a sample alert for nutrient monitoring review.",
    });
    await refreshAll();
  });

  document.querySelector("#save-settings")?.addEventListener("click", async () => {
    const result = await saveSettings(collectSettings());
    elements.settingsMessage.textContent =
      result.source === "supabase"
        ? "Settings saved to Supabase."
        : "Settings saved locally on this browser.";
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action][data-email]");

    if (!button) {
      return;
    }

    const email = button.getAttribute("data-email");
    const action = button.getAttribute("data-action");
    await setUserStatus(email, action === "activate" ? "active" : "inactive");
    await refreshAll();
  });

  refreshAll();
})();
