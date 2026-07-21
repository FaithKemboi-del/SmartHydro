const signInForm = document.querySelector("#sign-in-form");
const authMessage = document.querySelector("#auth-message");
const submitButton = document.querySelector("#sign-in-submit");
const adminLoginToggle = document.querySelector("#admin-login-toggle");
const signInEyebrow = document.querySelector("#sign-in-eyebrow");
const signInTitle = document.querySelector("#sign-in-title");
const signInDescription = document.querySelector("#sign-in-description");

let adminLoginMode = false;

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

function matchesFaithOverride(email, password) {
  const auth = window.SmartHydroAuth;

  if (auth?.isUserOverride) {
    return auth.isUserOverride(email, password);
  }

  return (
    String(email || "").trim().toLowerCase() === "faithkemboi21@gmail.com" &&
    String(password || "").trim() === "chep2005.."
  );
}

function loginFaithOverride(email) {
  const auth = window.SmartHydroAuth;

  if (auth?.completeUserOverrideLogin) {
    return auth.completeUserOverrideLogin(email);
  }

  auth.clearAdminSession();
  auth.createUserSession("faithkemboi21@gmail.com");
  return "faithkemboi21@gmail.com";
}

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  setMessage("");

  const formData = new FormData(signInForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
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

    if (matchesFaithOverride(email, password)) {
      const signedInEmail = loginFaithOverride(email);
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

    const supabase = auth.getSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured. Update supabase-config.js with your project URL and anon key.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (matchesFaithOverride(email, password)) {
        const signedInEmail = loginFaithOverride(email);
        await auth.trackUserActivity(signedInEmail, "user");
        window.location.href = auth.userDashboardUrl();
        return;
      }
      throw error;
    }

    const signedInEmail = data.user?.email || email;
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
    setMessage(window.SmartHydroAuth.formatAuthError(error), "error");
  } finally {
    setLoading(false);
  }
});
