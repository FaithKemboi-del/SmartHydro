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
    window.location.replace(auth.adminPanelUrl());
    return;
  }

  if (currentPage === "admin.html" && adminSession.email !== auth.ADMIN_EMAIL) {
    auth.redirectToSignIn(currentPage);
    return;
  }

  if (currentPage === "index.html" && adminSession.email !== auth.ADMIN_EMAIL) {
    auth.redirectToSignIn(currentPage);
    return;
  }

  await auth.trackUserActivity(adminSession.email, "admin");

  wireSignOut();
  finishGuard();
})();
