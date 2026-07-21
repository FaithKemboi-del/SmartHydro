(function () {
  const auth = window.SmartHydroAuth;

  const elements = {
    region: document.querySelector("#profile-region"),
    plantsList: document.querySelector("#profile-plants-list"),
    form: document.querySelector("#profile-form"),
    nameInput: document.querySelector("#profile-name"),
    countyInput: document.querySelector("#profile-county"),
    email: document.querySelector("#profile-email"),
    submitButton: document.querySelector("#profile-submit"),
    toast: document.querySelector("#profile-toast"),
    toastMessage: document.querySelector("#profile-toast-message"),
    toastClose: document.querySelector("#profile-toast-close"),
  };

  if (!auth || !elements.form) {
    return;
  }

  let toastTimer = null;

  function getSignedInEmail() {
    const userSession = auth.getUserSession();
    const adminSession = auth.getAdminSession();

    if (userSession?.email) {
      return userSession.email;
    }

    if (adminSession?.email) {
      return adminSession.email;
    }

    return null;
  }

  function showToast(message) {
    if (!elements.toast || !elements.toastMessage) {
      return;
    }

    elements.toastMessage.textContent = message;
    elements.toast.hidden = false;

    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 3200);
  }

  function renderPlants(plants) {
    if (!elements.plantsList) {
      return;
    }

    if (!plants?.length) {
      elements.plantsList.innerHTML = `
        <li class="profile-plant-item profile-plant-empty">
          <div>
            <strong>No plants assigned yet</strong>
            <p>Ask your admin to assign crops to your account.</p>
          </div>
        </li>
      `;
      return;
    }

    elements.plantsList.innerHTML = plants
      .map(
        (plant) => `
          <li class="profile-plant-item">
            <div class="profile-plant-thumb" aria-hidden="true">🌱</div>
            <div class="profile-plant-copy">
              <span class="profile-plant-group">${plant.group || "Plants"}</span>
              <strong>${plant.name}</strong>
              <p>Monitored in your hydroponic setup</p>
            </div>
            <span class="profile-plant-status" aria-label="Active monitoring">Active</span>
          </li>
        `,
      )
      .join("");
  }

  function renderProfile(profile) {
    if (elements.region) {
      elements.region.textContent = profile.region || "Kenya";
    }

    if (elements.nameInput) {
      elements.nameInput.value = profile.fullName || "";
    }

    if (elements.countyInput) {
      elements.countyInput.value = profile.county || "";
    }

    if (elements.email) {
      elements.email.textContent = profile.email;
    }

    renderPlants(profile.plants);
  }

  function loadProfile() {
    const email = getSignedInEmail();

    if (!email) {
      auth.redirectToSignIn("profile.html");
      return;
    }

    renderProfile(auth.getUserProfile(email));
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = getSignedInEmail();

    if (!email) {
      auth.redirectToSignIn("profile.html");
      return;
    }

    const fullName = elements.nameInput?.value.trim() || "";
    const county = elements.countyInput?.value.trim() || "";

    if (!fullName) {
      showToast("Please enter your full name.");
      return;
    }

    if (elements.submitButton) {
      elements.submitButton.disabled = true;
      elements.submitButton.textContent = "Saving...";
    }

    const updated = auth.saveUserProfile(email, { fullName, county });
    renderProfile(updated);
    showToast("Profile updated successfully");

    if (elements.submitButton) {
      elements.submitButton.disabled = false;
      elements.submitButton.textContent = "Update profile";
    }
  });

  elements.toastClose?.addEventListener("click", () => {
    if (elements.toast) {
      elements.toast.hidden = true;
    }
  });

  loadProfile();
})();
