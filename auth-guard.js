(async function () {
  const auth = window.SmartHydroAuth;
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  function finishGuard() {
    document.documentElement.classList.remove("auth-pending");
  }

  function wireSignOut() {
    const signOutButton = document.querySelector("#sign-out-button");

    if (!signOutButton) {
      return;
    }

    signOutButton.addEventListener("click", async () => {
      await auth.signOut();
      window.location.href = auth.signInUrl();
    });
  }

  const adminSession = auth.getAdminSession();

  if (!adminSession) {
    auth.redirectToSignIn(currentPage);
    return;
  }

  if (currentPage === "dashboard.html") {
    window.location.replace("index.html");
    return;
  }

  wireSignOut();
  finishGuard();
})();
