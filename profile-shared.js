(function () {
  const auth = window.SmartHydroAuth;

  window.SmartHydroProfileShared = {
    getSignedInEmail() {
      const userSession = auth?.getUserSession?.();
      const adminSession = auth?.getAdminSession?.();

      if (userSession?.email) {
        return userSession.email;
      }

      if (adminSession?.email) {
        return adminSession.email;
      }

      return null;
    },

    requireSignedIn(returnPage) {
      const email = this.getSignedInEmail();

      if (!email) {
        auth?.redirectToSignIn?.(returnPage || "profile.html");
        return null;
      }

      return email;
    },

    loadProfile() {
      const email = this.getSignedInEmail();
      return email ? auth.getUserProfile(email) : null;
    },

    renderSubnav(activePage) {
      const host = document.querySelector("#profile-subnav");

      if (!host) {
        return;
      }

      const links = [
        { href: "profile.html", label: "Overview", id: "overview" },
        { href: "profile-account.html", label: "My profile", id: "account" },
        { href: "profile-plants.html", label: "Active crops", id: "plants" },
      ];

      host.innerHTML = links
        .map(
          (link) =>
            `<a href="${link.href}" class="${link.id === activePage ? "is-active" : ""}">${link.label}</a>`,
        )
        .join("");
    },

    renderRegion(profile, elements) {
      if (elements.region) {
        elements.region.textContent = profile.region || "Kenya";
      }

      if (elements.countyDisplay) {
        elements.countyDisplay.textContent = profile.county
          ? `County: ${profile.county}`
          : "County not set yet";
      }
    },

    renderPlants(plants, container) {
      if (!container) {
        return;
      }

      if (!plants?.length) {
        container.innerHTML = `
          <li class="profile-plant-item profile-plant-empty">
            <div>
              <strong>No plants assigned yet</strong>
              <p>Ask your admin to assign crops to your account.</p>
            </div>
          </li>
        `;
        return;
      }

      container.innerHTML = plants
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
    },

    wireToast(elements) {
      let toastTimer = null;

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

      elements.toastClose?.addEventListener("click", () => {
        if (elements.toast) {
          elements.toast.hidden = true;
        }
      });

      return showToast;
    },
  };
})();
