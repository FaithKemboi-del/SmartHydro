(function () {
  const ADMIN_EMAIL = "fchepkosgei21@gmail.com";
  const ADMIN_PASSWORD = "Hydrouser2026..";
  const ADMIN_SESSION_KEY = "smartHydroAdminSession";
  const AUTH_RETURN_KEY = "smartHydroReturnTo";

  function getSupabaseConfig() {
    return window.SMART_HYDRO_SUPABASE || {};
  }

  function hasSupabaseConfig() {
    const config = getSupabaseConfig();
    return (
      typeof config.url === "string" &&
      typeof config.anonKey === "string" &&
      config.url.startsWith("https://") &&
      !config.url.includes("your-project-ref") &&
      config.anonKey.length > 20 &&
      !config.anonKey.includes("your-supabase")
    );
  }

  function getSupabaseClient() {
    if (!hasSupabaseConfig()) {
      return null;
    }

    if (!window.smartHydroSupabaseClient) {
      window.smartHydroSupabaseClient = window.supabase.createClient(
        getSupabaseConfig().url,
        getSupabaseConfig().anonKey,
      );
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
    signOut,
    dashboardUrl,
    signInUrl,
    redirectToDashboard,
    redirectToSignIn,
    consumeReturnTo,
    isAdminOverride,
  };
})();
