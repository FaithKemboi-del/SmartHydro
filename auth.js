(function () {
  const ADMIN_EMAIL = "fyugalbox21@gmail.com";
  const ADMIN_PASSWORD = "chep2005..";
  const ADMIN_SESSION_KEY = "smartHydroAdminSession";
  const AUTH_RETURN_KEY = "smartHydroReturnTo";

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
    return returnTo || dashboardUrl();
  }

  function isAdminOverride(email, password) {
    return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  }

  function adminPanelUrl() {
    return "admin.html";
  }

  async function trackUserActivity(email, role = "user") {
    if (!email) {
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const resolvedRole = normalizedEmail === ADMIN_EMAIL ? "admin" : role;
    const now = new Date().toISOString();
    const localKey = "smartHydroAppUsers";

    try {
      const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
      const next = Array.isArray(existing) ? existing : [];
      const index = next.findIndex((user) => user.email === normalizedEmail);

      if (index >= 0) {
        next[index] = {
          ...next[index],
          role: resolvedRole,
          status: next[index].status || "active",
          last_seen: now,
        };
      } else {
        next.unshift({
          email: normalizedEmail,
          role: resolvedRole,
          status: "active",
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
          role: resolvedRole,
          status: "active",
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
    ADMIN_SESSION_KEY,
    AUTH_RETURN_KEY,
    createAdminSession,
    getAdminSession,
    clearAdminSession,
    getSupabaseClient,
    getSupabaseSession,
    hasSupabaseConfig,
    formatAuthError,
    normalizeSupabaseUrl,
    signOut,
    dashboardUrl,
    signInUrl,
    adminPanelUrl,
    redirectToDashboard,
    redirectToSignIn,
    consumeReturnTo,
    isAdminOverride,
    trackUserActivity,
  };
})();
