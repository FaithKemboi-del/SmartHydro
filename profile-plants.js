(function () {
  const shared = window.SmartHydroProfileShared;
  const auth = window.SmartHydroAuth;

  if (!shared || !auth) {
    return;
  }

  shared.renderSubnav("plants");

  const plantsList = document.querySelector("#profile-plants-list");
  const email = shared.requireSignedIn("profile-plants.html");

  if (!email) {
    return;
  }

  const profile = auth.getUserProfile(email);
  shared.renderPlants(profile.plants, plantsList);
})();
