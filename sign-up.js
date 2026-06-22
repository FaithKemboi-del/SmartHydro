const signUpForm = document.querySelector("#sign-up-form");
const authMessage = document.querySelector("#auth-message");
const submitButton = document.querySelector("#sign-up-submit");

function setMessage(message, type = "info") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Creating account..." : "Create Account";
}

signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  setMessage("");

  const formData = new FormData(signUpForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm-password") || "");

  try {
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const supabase = window.SmartHydroAuth.getSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured. Update supabase-config.js with your project URL and anon key.");
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    setMessage("Account created. Check your email if confirmation is enabled, then sign in.", "success");
    signUpForm.reset();
  } catch (error) {
    setMessage(error.message || "Unable to create account. Try again.", "error");
  } finally {
    setLoading(false);
  }
});
