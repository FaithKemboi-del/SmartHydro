(function () {
  const ADMIN_EMAIL = "fyugalbox21@gmail.com";
  const ADMIN_PASSWORD = "chep2005..";
  const ADMIN_SESSION_KEY = "smartHydroAdminSession";
  const USER_SESSION_KEY = "smartHydroUserSession";
  const AUTH_RETURN_KEY = "smartHydroReturnTo";

  const DEFAULT_USERS = [
    {
      email: "fyugalbox21@gmail.com",
      name: "Admin",
      role: "admin",
      status: "active",
      created_at: "2026-06-01T08:00:00.000Z",
      last_seen: null,
    },
    {
      email: "faithkemboi21@gmail.com",
      name: "Faith",
      role: "user",
      status: "active",
      created_at: "2026-06-03T09:15:00.000Z",
      last_seen: null,
    },
    {
      email: "paulkevinkariuki@gmail.com",
      name: "Paul",
      role: "user",
      status: "inactive",
      created_at: "2026-06-28T14:40:00.000Z",
      last_seen: null,
    },
  ];

  function normalizeSupabaseUrl(rawUrl) {
    let url = String(rawUrl || "").trim().replace(/\/+$/, "");

    if (!url) {
      return "";
    }

    if (url.includes("app.supabase.com") || url.includes("/project/")) {
      throw new Error(
        "Use the Project URL from Supabase Project Settings > API, not the Supabase dashboard URL.",
      );
    }

    if (url.endsWith("/rest/v1")) {
      url = url.slice(0, -"/rest/v1".length);
    }

    if (url.endsWith("/auth/v1")) {
      url = url.slice(0, -"/auth/v1".length);
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch (_error) {
      throw new Error(
        "Supabase URL must look like https://your-project-ref.supabase.co with no extra path.",
      );
    }

    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
      throw new Error(
        "Supabase URL must look like https://your-project-ref.supabase.co with no extra path.",
      );
    }

    return `${parsed.protocol}//${parsed.hostname}`;
  }

  function normalizeSupabaseKey(rawKey) {
    return String(rawKey || "")
      .trim()
      .replace(/^Bearer\s+/i, "");
  }

  function formatAuthError(error) {
    const message = String(error?.message || error || "").trim();

    if (
      message.includes("Invalid path specified in request URL") ||
      message.includes("PGRST125")
    ) {
      return (
        "Supabase URL is wrong in supabase-config.js. Use only your Project URL, " +
        "for example https://your-project-ref.supabase.co, with no /rest/v1 and no dashboard link."
      );
    }

    return message || "Unable to complete the request. Try again.";
  }

  function getSupabaseConfig() {
    return window.SMART_HYDRO_SUPABASE || {};
  }

  function hasSupabaseConfig() {
    try {
      const config = getSupabaseConfig();
      const url = normalizeSupabaseUrl(config.url);
      const anonKey = normalizeSupabaseKey(config.anonKey);

      return (
        url.startsWith("https://") &&
        !url.includes("your-project-ref") &&
        anonKey.length > 20 &&
        !anonKey.includes("your-supabase")
      );
    } catch (_error) {
      return false;
    }
  }

  function getSupabaseClient() {
    if (!hasSupabaseConfig()) {
      return null;
    }

    const config = getSupabaseConfig();
    const url = normalizeSupabaseUrl(config.url);
    const anonKey = normalizeSupabaseKey(config.anonKey);

    if (!window.smartHydroSupabaseClient) {
      window.smartHydroSupabaseClient = window.supabase.createClient(url, anonKey);
    }

    return window.smartHydroSupabaseClient;
  }

  function createAdminSession(email) {
    const tokenId =
      window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const session = {
      role: "admin",
      email,
      token: `admin-${Date.now()}-${tokenId}`,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getAdminSession() {
    const rawSession = localStorage.getItem(ADMIN_SESSION_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      const session = JSON.parse(rawSession);
      return session && session.role === "admin" ? session : null;
    } catch (_error) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
  }

  function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }

  function createUserSession(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const profile = getDefaultUser(normalizedEmail);
    const session = {
      role: profile?.role === "admin" ? "admin" : "user",
      email: normalizedEmail,
      name: profile?.name || getUserDisplayName(normalizedEmail),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getUserSession() {
    const rawSession = localStorage.getItem(USER_SESSION_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      const session = JSON.parse(rawSession);
      return session && session.email ? session : null;
    } catch (_error) {
      localStorage.removeItem(USER_SESSION_KEY);
      return null;
    }
  }

  function clearUserSession() {
    localStorage.removeItem(USER_SESSION_KEY);
  }

  function userDashboardUrl() {
    return "index.html";
  }

  async function getSupabaseSession() {
    const client = getSupabaseClient();

    if (!client) {
      return null;
    }

    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function signOut() {
    clearAdminSession();
    clearUserSession();

    const client = getSupabaseClient();

    if (client) {
      await client.auth.signOut();
    }
  }

  function dashboardUrl() {
    return "dashboard.html";
  }

  function signInUrl() {
    return "sign-in.html";
  }

  function redirectToDashboard() {
    window.location.href = dashboardUrl();
  }

  function redirectToSignIn(returnTo) {
    if (returnTo) {
      localStorage.setItem(AUTH_RETURN_KEY, returnTo);
    }

    window.location.href = signInUrl();
  }

  function consumeReturnTo() {
    const returnTo = localStorage.getItem(AUTH_RETURN_KEY);
    localStorage.removeItem(AUTH_RETURN_KEY);
    return returnTo || adminPanelUrl();
  }

  function getDefaultUser(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    return DEFAULT_USERS.find((user) => user.email === normalizedEmail) || null;
  }

  function getUserDisplayName(email) {
    return getDefaultUser(email)?.name || String(email || "").split("@")[0] || "User";
  }

  function isAdminOverride(email, password) {
    return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  }

  function adminPanelUrl() {
    return "admin.html";
  }

  function buildProjectUserRecords() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const inactiveSeen = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const activeSeen = new Date().toISOString();

    return DEFAULT_USERS.map((user) => ({
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      last_seen: user.status === "inactive" ? inactiveSeen : activeSeen,
      created_at: weekAgo,
    }));
  }

  function mergeProjectUsers(fetchedUsers) {
    const map = new Map(
      (fetchedUsers || []).map((user) => [String(user.email || "").toLowerCase(), user]),
    );

    return buildProjectUserRecords().map((user) => {
      const existing = map.get(user.email);

      if (!existing) {
        return user;
      }

      return {
        email: user.email,
        name: existing.name || user.name,
        role: existing.role || user.role,
        status: existing.status || user.status,
        last_seen: existing.last_seen || user.last_seen,
        created_at: existing.created_at || user.created_at,
      };
    });
  }

  async function ensureProjectUsers() {
    const users = buildProjectUserRecords();
    localStorage.setItem("smartHydroAppUsers", JSON.stringify(users));

    const client = getSupabaseClient();

    if (!client) {
      return users;
    }

    try {
      await client.from("app_users").upsert(users, { onConflict: "email" });
    } catch (_error) {
      // Table may not exist until schema is updated.
    }

    return users;
  }

  async function trackUserActivity(email, role = "user") {
    if (!email) {
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const resolvedRole = normalizedEmail === ADMIN_EMAIL ? "admin" : role;
    const profile = getDefaultUser(normalizedEmail);
    const now = new Date().toISOString();
    const localKey = "smartHydroAppUsers";

    try {
      const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
      const next = Array.isArray(existing) ? existing : [];
      const index = next.findIndex((user) => user.email === normalizedEmail);

      if (index >= 0) {
        next[index] = {
          ...next[index],
          name: profile?.name || next[index].name || getUserDisplayName(normalizedEmail),
          role: resolvedRole,
          status: next[index].status || profile?.status || "active",
          last_seen: now,
        };
      } else {
        next.unshift({
          email: normalizedEmail,
          name: profile?.name || getUserDisplayName(normalizedEmail),
          role: resolvedRole,
          status: profile?.status || "active",
          last_seen: now,
          created_at: now,
        });
      }

      localStorage.setItem(localKey, JSON.stringify(next));
    } catch (_error) {
      // Ignore local storage failures and continue with Supabase when available.
    }

    const client = getSupabaseClient();

    if (!client) {
      return;
    }

    try {
      await client.from("app_users").upsert(
        {
          email: normalizedEmail,
          name: profile?.name || getUserDisplayName(normalizedEmail),
          role: resolvedRole,
          status: profile?.status || "active",
          last_seen: now,
        },
        { onConflict: "email" },
      );
    } catch (_error) {
      // Table may not exist until supabase_schema.sql is updated.
    }
  }

  window.SmartHydroAuth = {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    DEFAULT_USERS,
    ADMIN_SESSION_KEY,
    USER_SESSION_KEY,
    AUTH_RETURN_KEY,
    createAdminSession,
    getAdminSession,
    clearAdminSession,
    createUserSession,
    getUserSession,
    clearUserSession,
    getSupabaseClient,
    getSupabaseSession,
    hasSupabaseConfig,
    formatAuthError,
    normalizeSupabaseUrl,
    signOut,
    dashboardUrl,
    userDashboardUrl,
    signInUrl,
    adminPanelUrl,
    redirectToDashboard,
    redirectToSignIn,
    consumeReturnTo,
    isAdminOverride,
    getDefaultUser,
    getUserDisplayName,
    mergeProjectUsers,
    ensureProjectUsers,
    buildProjectUserRecords,
    trackUserActivity,
  };
})();
