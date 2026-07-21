(function () {
  const shared = window.SmartHydroProfileShared;
  const auth = window.SmartHydroAuth;

  const elements = {
    region: document.querySelector("#profile-region"),
    regionInput: document.querySelector("#profile-region-input"),
    countyDisplay: document.querySelector("#profile-county-display"),
    form: document.querySelector("#profile-form"),
    nameInput: document.querySelector("#profile-name"),
    countyInput: document.querySelector("#profile-county"),
    email: document.querySelector("#profile-email"),
    submitButton: document.querySelector("#profile-submit"),
    toast: document.querySelector("#profile-toast"),
    toastMessage: document.querySelector("#profile-toast-message"),
    toastClose: document.querySelector("#profile-toast-close"),
  };

  if (!shared || !auth || !elements.form) {
    return;
  }

  shared.renderSubnav("account");
  const showToast = shared.wireToast(elements);

  function renderForm(profile) {
    shared.renderRegion(profile, elements);

    if (elements.nameInput) {
      elements.nameInput.value = profile.fullName || "";
    }

    if (elements.countyInput) {
      elements.countyInput.value = profile.county || "";
    }

    if (elements.regionInput) {
      elements.regionInput.value = profile.region || "";
      elements.regionInput.dataset.manual = profile.region ? "true" : "false";
    }

    if (elements.email) {
      elements.email.textContent = profile.email;
    }
  }

  const email = shared.requireSignedIn("profile-account.html");

  if (!email) {
    return;
  }

  renderForm(auth.getUserProfile(email));

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = elements.nameInput?.value.trim() || "";
    const county = elements.countyInput?.value.trim() || "";
    const region = elements.regionInput?.value.trim() || "";

    if (!fullName) {
      showToast("Please enter your full name.");
      return;
    }

    if (elements.submitButton) {
      elements.submitButton.disabled = true;
      elements.submitButton.textContent = "Saving...";
    }

    const updated = auth.saveUserProfile(email, { fullName, county, region });
    renderForm(updated);
    showToast("Profile updated successfully");

    if (elements.submitButton) {
      elements.submitButton.disabled = false;
      elements.submitButton.textContent = "Update profile";
    }
  });

  elements.countyInput?.addEventListener("input", () => {
    if (!elements.regionInput || elements.regionInput.dataset.manual === "true") {
      return;
    }

    elements.regionInput.value = auth.buildRegionFromCounty?.(elements.countyInput.value.trim()) || "";
  });

  elements.regionInput?.addEventListener("input", () => {
    if (elements.regionInput) {
      elements.regionInput.dataset.manual = elements.regionInput.value.trim() ? "true" : "false";
    }
  });
})();
