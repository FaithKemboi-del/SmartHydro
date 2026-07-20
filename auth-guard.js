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
  const userSession = auth.getUserSession();
  const isAdmin = adminSession?.email === auth.ADMIN_EMAIL;

  if (!adminSession && !userSession) {
    auth.redirectToSignIn(currentPage);
    return;
  }

  if (currentPage === "dashboard.html") {
    window.location.replace(isAdmin ? auth.adminPanelUrl() : auth.userDashboardUrl());
    return;
  }

  if (currentPage === "admin.html" && !isAdmin) {
    window.location.replace(auth.userDashboardUrl());
    return;
  }

  if (isAdmin) {
    await auth.trackUserActivity(adminSession.email, "admin");
  } else if (userSession?.email) {
    await auth.trackUserActivity(userSession.email, "user");
  }

  const adminNavLink = document.querySelector('a[href="admin.html"]');
  if (adminNavLink && !isAdmin) {
    adminNavLink.style.display = "none";
  }

  wireSignOut();
  finishGuard();
})();
