(function () {
  const ADMIN_EMAIL = "fyugalbox21@gmail.com";
  const ADMIN_PASSWORD = "chep2005..";
  const FAITH_EMAIL = "faithkemboi21@gmail.com";
  const USER_OVERRIDE_PASSWORD = "chep2005..";
  const ADMIN_SESSION_KEY = "smartHydroAdminSession";
  const USER_SESSION_KEY = "smartHydroUserSession";
  const AUTH_RETURN_KEY = "smartHydroReturnTo";
  const USER_PROFILES_KEY = "smartHydroUserProfiles";

  const DEFAULT_PROFILES = {
    "faithkemboi21@gmail.com": {
      fullName: "Faith",
      county: "Uasin Gishu County",
      region: "Eldoret, Uasin Gishu County, Kenya",
      plants: [{ group: "Plants", name: "Herbs" }],
    },
    "paulkevinkariuki@gmail.com": {
      fullName: "Paul",
      county: "Nairobi County",
      region: "Nairobi, Kenya",
      plants: [{ group: "Plants", name: "Lettuce" }],
    },
    "fyugalbox21@gmail.com": {
      fullName: "Admin",
      county: "Uasin Gishu County",
      region: "Eldoret, Uasin Gishu County, Kenya",
      plants: [{ group: "Plants", name: "System overview" }],
    },
  };

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

  const EXTRA_DEMO_USERS = [
    { email: "amani.wambui@example.com", name: "Amani Wambui", role: "user", status: "active", created_at: "2026-06-04T10:00:00.000Z" },
    { email: "brian.otieno@example.com", name: "Brian Otieno", role: "user", status: "active", created_at: "2026-06-05T11:20:00.000Z" },
    { email: "carol.njeri@example.com", name: "Carol Njeri", role: "user", status: "active", created_at: "2026-06-06T09:40:00.000Z" },
    { email: "daniel.kipchoge@example.com", name: "Daniel Kipchoge", role: "user", status: "inactive", created_at: "2026-06-07T14:15:00.000Z" },
    { email: "esther.akinyi@example.com", name: "Esther Akinyi", role: "user", status: "active", created_at: "2026-06-08T08:30:00.000Z" },
    { email: "felix.mwangi@example.com", name: "Felix Mwangi", role: "user", status: "active", created_at: "2026-06-09T16:05:00.000Z" },
    { email: "grace.chebet@example.com", name: "Grace Chebet", role: "user", status: "active", created_at: "2026-06-10T12:45:00.000Z" },
    { email: "hassan.ali@example.com", name: "Hassan Ali", role: "user", status: "inactive", created_at: "2026-06-11T07:55:00.000Z" },
    { email: "irene.muthoni@example.com", name: "Irene Muthoni", role: "user", status: "active", created_at: "2026-06-12T13:10:00.000Z" },
    { email: "james.kamau@example.com", name: "James Kamau", role: "user", status: "active", created_at: "2026-06-13T15:25:00.000Z" },
    { email: "karen.wanjira@example.com", name: "Karen Wanjira", role: "user", status: "active", created_at: "2026-06-14T10:50:00.000Z" },
    { email: "leo.barasa@example.com", name: "Leo Barasa", role: "user", status: "inactive", created_at: "2026-06-15T09:05:00.000Z" },
    { email: "mary.atieno@example.com", name: "Mary Atieno", role: "user", status: "active", created_at: "2026-06-16T11:35:00.000Z" },
    { email: "nathan.kiplagat@example.com", name: "Nathan Kiplagat", role: "user", status: "active", created_at: "2026-06-17T14:00:00.000Z" },
    { email: "olive.nyambura@example.com", name: "Olive Nyambura", role: "user", status: "active", created_at: "2026-06-18T08:20:00.000Z" },
    { email: "peter.odhiambo@example.com", name: "Peter Odhiambo", role: "user", status: "inactive", created_at: "2026-06-19T17:40:00.000Z" },
    { email: "queen.jemutai@example.com", name: "Queen Jemutai", role: "user", status: "active", created_at: "2026-06-20T12:15:00.000Z" },
    { email: "ryan.mutua@example.com", name: "Ryan Mutua", role: "user", status: "active", created_at: "2026-06-21T09:55:00.000Z" },
    { email: "sarah.wanjiku@example.com", name: "Sarah Wanjiku", role: "user", status: "active", created_at: "2026-06-22T16:30:00.000Z" },
    { email: "tom.kiarie@example.com", name: "Tom Kiarie", role: "user", status: "inactive", created_at: "2026-06-23T11:10:00.000Z" },
    { email: "uma.cherono@example.com", name: "Uma Cherono", role: "user", status: "active", created_at: "2026-06-24T13:45:00.000Z" },
    { email: "victor.omondi@example.com", name: "Victor Omondi", role: "user", status: "active", created_at: "2026-06-25T08:05:00.000Z" },
    { email: "winnie.njoki@example.com", name: "Winnie Njoki", role: "user", status: "active", created_at: "2026-06-26T15:50:00.000Z" },
    { email: "xavier.korir@example.com", name: "Xavier Korir", role: "user", status: "inactive", created_at: "2026-06-27T10:25:00.000Z" },
    { email: "yvonne.awuor@example.com", name: "Yvonne Awuor", role: "user", status: "active", created_at: "2026-06-29T14:35:00.000Z" },
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
    const userProfile = getUserProfile(normalizedEmail);
    const session = {
      role: profile?.role === "admin" ? "admin" : "user",
      email: normalizedEmail,
      name: userProfile.fullName || profile?.name || getUserDisplayName(normalizedEmail),
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

  function profileUrl() {
    return "profile.html";
  }

  function profileAccountUrl() {
    return "profile-account.html";
  }

  function profilePlantsUrl() {
    return "profile-plants.html";
  }

  function readStoredProfiles() {
    try {
      const raw = localStorage.getItem(USER_PROFILES_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function writeStoredProfiles(profiles) {
    localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
  }

  function buildRegionFromCounty(county) {
    const cleaned = String(county || "").trim();

    if (!cleaned) {
      return "";
    }

    const city = cleaned.replace(/\s+county$/i, "").trim();
    return `${city}, ${cleaned}, Kenya`;
  }

  function getUserProfile(email) {
    const normalizedEmail = normalizeAuthEmail(email);
    const defaults = DEFAULT_PROFILES[normalizedEmail] || {
      fullName: getUserDisplayName(normalizedEmail),
      county: "",
      region: "Kenya",
      plants: [],
    };
    const stored = readStoredProfiles()[normalizedEmail];

    if (!stored) {
      return {
        email: normalizedEmail,
        fullName: defaults.fullName,
        county: defaults.county || "",
        region: defaults.region,
        plants: defaults.plants || [],
      };
    }

    return {
      email: normalizedEmail,
      fullName: stored.fullName ?? defaults.fullName,
      county: stored.county ?? defaults.county ?? "",
      region: stored.region ?? defaults.region,
      plants: stored.plants?.length ? stored.plants : defaults.plants || [],
    };
  }

  function saveUserProfile(email, updates) {
    const normalizedEmail = normalizeAuthEmail(email);
    const current = getUserProfile(normalizedEmail);
    const county = String(updates.county ?? current.county).trim();
    const hasRegionUpdate = Object.prototype.hasOwnProperty.call(updates, "region");
    const regionValue = hasRegionUpdate ? String(updates.region ?? "").trim() : null;
    const region = hasRegionUpdate
      ? regionValue || (county ? buildRegionFromCounty(county) : current.region)
      : county
        ? buildRegionFromCounty(county)
        : current.region;

    const nextProfile = {
      fullName: String(updates.fullName ?? current.fullName).trim() || current.fullName,
      county,
      region,
      plants: Array.isArray(updates.plants) ? updates.plants : current.plants,
    };

    const allProfiles = readStoredProfiles();
    allProfiles[normalizedEmail] = nextProfile;
    writeStoredProfiles(allProfiles);

    const userSession = getUserSession();
    if (userSession?.email === normalizedEmail) {
      createUserSession(normalizedEmail);
    }

    return {
      email: normalizedEmail,
      ...nextProfile,
    };
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

  function normalizeAuthEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeAuthPassword(password) {
    return String(password || "").trim();
  }

  function isAdminOverride(email, password) {
    return (
      normalizeAuthEmail(email) === normalizeAuthEmail(ADMIN_EMAIL) &&
      normalizeAuthPassword(password) === ADMIN_PASSWORD
    );
  }

  function isUserOverride(email, password) {
    return (
      normalizeAuthEmail(email) === FAITH_EMAIL &&
      normalizeAuthPassword(password) === USER_OVERRIDE_PASSWORD
    );
  }

  function completeUserOverrideLogin(email) {
    const normalizedEmail = normalizeAuthEmail(email);
    clearAdminSession();
    createUserSession(normalizedEmail);
    return normalizedEmail;
  }

  function adminPanelUrl() {
    return "admin.html";
  }

  function buildProjectUserRecords() {
    const activeSeen = new Date().toISOString();
    const inactiveSeen = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const allUsers = [...DEFAULT_USERS, ...EXTRA_DEMO_USERS];

    return allUsers.map((user) => ({
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      last_seen: user.status === "inactive" ? inactiveSeen : activeSeen,
      created_at: user.created_at,
    }));
  }

  function mergeProjectUsers(fetchedUsers) {
    const map = new Map(
      (fetchedUsers || []).map((user) => [String(user.email || "").toLowerCase(), user]),
    );

    const projectEmails = new Set(
      [...DEFAULT_USERS, ...EXTRA_DEMO_USERS].map((user) => user.email.toLowerCase()),
    );

    const mergedDefaults = buildProjectUserRecords().map((user) => {
      const existing = map.get(user.email.toLowerCase());

      if (!existing) {
        return user;
      }

      return {
        email: user.email,
        name: existing.name || user.name,
        role: existing.role || user.role,
        status: existing.status || user.status,
        last_seen: existing.last_seen || user.last_seen,
        created_at: user.created_at,
      };
    });

    const extrasFromDb = (fetchedUsers || [])
      .filter((user) => {
        const email = String(user.email || "").toLowerCase();
        return email && !projectEmails.has(email);
      })
      .map((user) => ({
        email: String(user.email).toLowerCase(),
        name: user.name || String(user.email).split("@")[0],
        role: user.role || "user",
        status: user.status || "active",
        last_seen: user.last_seen || null,
        created_at: user.created_at || new Date().toISOString(),
      }));

    return [...mergedDefaults, ...extrasFromDb];
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
    FAITH_EMAIL,
    USER_OVERRIDE_PASSWORD,
    DEFAULT_USERS,
    EXTRA_DEMO_USERS,
    ADMIN_SESSION_KEY,
    USER_SESSION_KEY,
    AUTH_RETURN_KEY,
    USER_PROFILES_KEY,
    DEFAULT_PROFILES,
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
    profileUrl,
    profileAccountUrl,
    profilePlantsUrl,
    buildRegionFromCounty,
    getUserProfile,
    saveUserProfile,
    signInUrl,
    adminPanelUrl,
    redirectToDashboard,
    redirectToSignIn,
    consumeReturnTo,
    isAdminOverride,
    isUserOverride,
    completeUserOverrideLogin,
    getDefaultUser,
    getUserDisplayName,
    mergeProjectUsers,
    ensureProjectUsers,
    buildProjectUserRecords,
    trackUserActivity,
  };
})();
