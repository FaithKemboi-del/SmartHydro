const signInForm = document.querySelector("#sign-in-form");
const authMessage = document.querySelector("#auth-message");
const submitButton = document.querySelector("#sign-in-submit");

function setMessage(message, type = "info") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Signing in..." : "Sign In";
}

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  setMessage("");

  const formData = new FormData(signInForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    if (window.SmartHydroAuth.isAdminOverride(email, password)) {
      window.SmartHydroAuth.createAdminSession(email);
      await window.SmartHydroAuth.trackUserActivity(email, "admin");
      window.location.href = window.SmartHydroAuth.consumeReturnTo();
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

    await window.SmartHydroAuth.trackUserActivity(data.user?.email || email, "user");

    if (data.user?.email === window.SmartHydroAuth.ADMIN_EMAIL) {
      window.SmartHydroAuth.createAdminSession(data.user.email);
      window.location.href = window.SmartHydroAuth.consumeReturnTo();
      return;
    }

    setMessage(
      "Sign-in succeeded. Your account is recorded for admin review. Full monitoring access remains restricted to the admin account.",
      "warning",
    );
  } catch (error) {
    setMessage(window.SmartHydroAuth.formatAuthError(error), "error");
  } finally {
    setLoading(false);
  }
});
