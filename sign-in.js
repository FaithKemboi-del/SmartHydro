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

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  setMessage("");

  const formData = new FormData(signInForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    if (adminLoginMode || window.SmartHydroAuth.isAdminOverride(email, password)) {
      if (!window.SmartHydroAuth.isAdminOverride(email, password)) {
        throw new Error("Use the admin email and password to sign in as admin.");
      }

      window.SmartHydroAuth.clearUserSession();
      window.SmartHydroAuth.createAdminSession(email);
      await window.SmartHydroAuth.trackUserActivity(email, "admin");
      window.location.href = window.SmartHydroAuth.adminPanelUrl();
      return;
    }

    if (window.SmartHydroAuth.isUserOverride(email, password)) {
      window.SmartHydroAuth.clearAdminSession();
      window.SmartHydroAuth.createUserSession(window.SmartHydroAuth.FAITH_EMAIL);
      await window.SmartHydroAuth.trackUserActivity(window.SmartHydroAuth.FAITH_EMAIL, "user");
      window.location.href = window.SmartHydroAuth.userDashboardUrl();
      return;
    }

    const supabase = window.SmartHydroAuth.getSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured. Update supabase-config.js with your project URL and anon key.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
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
