const signInForm = document.querySelector("#sign-in-form");
const authMessage = document.querySelector("#auth-message");
const submitButton = document.querySelector("#sign-in-submit");
const adminLoginToggle = document.querySelector("#admin-login-toggle");
const signInEyebrow = document.querySelector("#sign-in-eyebrow");
const signInTitle = document.querySelector("#sign-in-title");
const signInDescription = document.querySelector("#sign-in-description");

let adminLoginMode = false;

const LOCAL_USER_LOGINS = {
  "faithkemboi21@gmail.com": ["chep2005.."],
  "awuor053@gmail.com": ["lavender2026", "Lavender2026", "lavender 2026"],
  "paulkevinkariuki@gmail.com": ["chep2005.."],
};

function setMessage(message, type = "info") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Signing in..." : adminLoginMode ? "Sign In as Admin" : "Sign In";
}

function updateLoginModeUI() {
  if (adminLoginMode) {
    signInEyebrow.textContent = "Admin access";
    signInTitle.textContent = "Sign in as admin";
    signInDescription.textContent =
      "Use the admin account to open the system administration panel and manage users, records, and settings.";
    adminLoginToggle.textContent = "Back to user sign in";
    adminLoginToggle.classList.add("is-active");
    submitButton.textContent = "Sign In as Admin";
    return;
  }

  signInEyebrow.textContent = "User access";
  signInTitle.textContent = "Sign in";
  signInDescription.textContent =
    "Sign in to open the hydroponics monitoring dashboard and review live sensor data.";
  adminLoginToggle.textContent = "Login as admin";
  adminLoginToggle.classList.remove("is-active");
  submitButton.textContent = "Sign In";
}

adminLoginToggle?.addEventListener("click", () => {
  adminLoginMode = !adminLoginMode;
  setMessage("");
  updateLoginModeUI();
});

updateLoginModeUI();

window.SmartHydroPasswordStore?.ensureDemoHashedUsers?.().catch(() => {
  // IndexedDB may be unavailable in private browsing; sign-in still works.
});

function normalizeLoginEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeLoginPassword(password) {
  return String(password || "").trim();
}

function passwordsMatch(expectedList, password) {
  const attempt = normalizeLoginPassword(password);
  const attemptLower = attempt.toLowerCase();
  return (expectedList || []).some((expected) => {
    const value = String(expected || "").trim();
    return value === attempt || value.toLowerCase() === attemptLower;
  });
}

function matchesUserOverride(email, password) {
  const auth = window.SmartHydroAuth;
  const normalizedEmail = normalizeLoginEmail(email);
  const normalizedPassword = normalizeLoginPassword(password);

  if (auth?.isUserOverride?.(normalizedEmail, normalizedPassword)) {
    return true;
  }

  // Direct local fallback so Awuor/Faith still work if an old auth.js is cached.
  if (passwordsMatch(LOCAL_USER_LOGINS[normalizedEmail], normalizedPassword)) {
    return true;
  }

  // Also accept auth map if present.
  const overrideMap = auth?.USER_LOGIN_OVERRIDES || {};
  const expected = overrideMap[normalizedEmail];
  if (expected && passwordsMatch([expected], normalizedPassword)) {
    return true;
  }

  return false;
}

function loginUserOverride(email) {
  const auth = window.SmartHydroAuth;
  const normalizedEmail = normalizeLoginEmail(email);

  if (auth?.completeUserOverrideLogin) {
    return auth.completeUserOverrideLogin(normalizedEmail);
  }

  auth.clearAdminSession();
  auth.createUserSession(normalizedEmail);
  return normalizedEmail;
}

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  setMessage("");

  const formData = new FormData(signInForm);
  const email = normalizeLoginEmail(formData.get("email"));
  const password = normalizeLoginPassword(formData.get("password"));
  const auth = window.SmartHydroAuth;

  try {
    if (adminLoginMode) {
      if (!auth.isAdminOverride(email, password)) {
        throw new Error("Use the admin email and password to sign in as admin.");
      }

      auth.clearUserSession();
      auth.createAdminSession(auth.ADMIN_EMAIL);
      await auth.trackUserActivity(auth.ADMIN_EMAIL, "admin");
      window.location.href = auth.adminPanelUrl();
      return;
    }

    // Local project users (Faith, Awuor, Paul) — do not depend on Supabase Auth.
    if (matchesUserOverride(email, password)) {
      const signedInEmail = loginUserOverride(email);
      await auth.trackUserActivity(signedInEmail, "user");
      await window.SmartHydroPasswordStore?.ensureDemoHashedUsers?.();
      window.location.href = auth.userDashboardUrl();
      return;
    }

    if (auth.isAdminOverride(email, password)) {
      auth.clearUserSession();
      auth.createAdminSession(auth.ADMIN_EMAIL);
      await auth.trackUserActivity(auth.ADMIN_EMAIL, "admin");
      await window.SmartHydroPasswordStore?.ensureDemoHashedUsers?.();
      window.location.href = auth.adminPanelUrl();
      return;
    }

    let supabase = null;
    try {
      supabase = auth.getSupabaseClient();
    } catch (_error) {
      supabase = null;
    }

    if (!supabase) {
      throw new Error(
        "Use awuor053@gmail.com / lavender2026, faithkemboi21@gmail.com / chep2005.., or configure Supabase.",
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (matchesUserOverride(email, password)) {
        const signedInEmail = loginUserOverride(email);
        await auth.trackUserActivity(signedInEmail, "user");
        window.location.href = auth.userDashboardUrl();
        return;
      }
      throw error;
    }

    const signedInEmail = normalizeLoginEmail(data.user?.email || email);
    await window.SmartHydroAuth.trackUserActivity(signedInEmail, "user");

    if (signedInEmail === window.SmartHydroAuth.ADMIN_EMAIL) {
      window.SmartHydroAuth.clearUserSession();
      window.SmartHydroAuth.createAdminSession(signedInEmail);
      window.location.href = window.SmartHydroAuth.adminPanelUrl();
      return;
    }

    window.SmartHydroAuth.clearAdminSession();
    window.SmartHydroAuth.createUserSession(signedInEmail);
    window.location.href = window.SmartHydroAuth.userDashboardUrl();
  } catch (error) {
    const message = window.SmartHydroAuth.formatAuthError(error);
    if (/invalid/i.test(message)) {
      setMessage(
        "Invalid login. For Awuor use awuor053@gmail.com and password lavender2026 (user sign in, not admin).",
        "error",
      );
    } else {
      setMessage(message, "error");
    }
  } finally {
    setLoading(false);
  }
});
