(function () {
  const shared = window.SmartHydroProfileShared;
  const auth = window.SmartHydroAuth;

  if (!shared || !auth) {
    return;
  }

  shared.renderSubnav("overview");

  const elements = {
    region: document.querySelector("#profile-region"),
    countyDisplay: document.querySelector("#profile-county-display"),
  };

  const email = shared.requireSignedIn("profile.html");

  if (!email) {
    return;
  }

  const profile = auth.getUserProfile(email);
  shared.renderRegion(profile, elements);
})();
