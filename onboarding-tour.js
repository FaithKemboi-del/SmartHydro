(function () {
  const ONBOARDING_KEY = "smartHydroOnboardingLogins";
  const SESSION_LOGIN_KEY = "smartHydroSessionLoginRecorded";
  const SESSION_TOUR_KEY = "smartHydroTourShownThisSession";
  const MAX_AUTO_TOURS = 3;

  const STEPS = [
    {
      icon: "🌱",
      title: "1. Sensor collection",
      copy: "IoT sensors collect pH, temperature, water level, and EC nutrient data.",
    },
    {
      icon: "📶",
      title: "2. ESP32 transmission",
      copy: "ESP32 sends readings over Wi-Fi to the monitoring interface.",
    },
    {
      icon: "📊",
      title: "3. ML pattern analysis",
      copy: "The machine learning model identifies abnormal sensor relationships.",
    },
    {
      icon: "🔔",
      title: "4. Alerts and guidance",
      copy: "The system generates severity labels and maintenance recommendations.",
    },
  ];

  const FINISH = {
    icon: "✨",
    eyebrow: "You're ready",
    title: "Nice! You have a clue of what the system entails.",
    copy: "You can start exploring the dashboard, run anomaly detection, and check your weekly report.",
    button: "Start exploring",
  };

  const auth = window.SmartHydroAuth;

  const elements = {
    overlay: document.querySelector("#onboarding-overlay"),
    eyebrow: document.querySelector("#onboarding-eyebrow"),
    progress: document.querySelector("#onboarding-progress"),
    icon: document.querySelector("#onboarding-icon"),
    title: document.querySelector("#onboarding-title"),
    copy: document.querySelector("#onboarding-copy"),
    nextButton: document.querySelector("#onboarding-next"),
    skipButton: document.querySelector("#onboarding-skip"),
    replayButton: document.querySelector("#replay-onboarding-tour"),
  };

  if (!elements.overlay) {
    return;
  }

  let currentStep = 0;
  let showingFinish = false;

  function getSignedInEmail() {
    const userSession = auth?.getUserSession?.();
    const adminSession = auth?.getAdminSession?.();

    if (userSession?.email && userSession.email !== auth?.ADMIN_EMAIL) {
      return userSession.email;
    }

    if (adminSession?.email && adminSession.email !== auth?.ADMIN_EMAIL) {
      return adminSession.email;
    }

    return userSession?.email || null;
  }

  function readLoginCounts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function writeLoginCounts(counts) {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(counts));
  }

  function getLoginCount(email) {
    return readLoginCounts()[String(email || "").toLowerCase()] || 0;
  }

  function recordLogin(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return 0;
    }

    if (sessionStorage.getItem(SESSION_LOGIN_KEY) === normalizedEmail) {
      return getLoginCount(normalizedEmail);
    }

    sessionStorage.setItem(SESSION_LOGIN_KEY, normalizedEmail);
    const counts = readLoginCounts();
    const nextCount = (counts[normalizedEmail] || 0) + 1;
    counts[normalizedEmail] = nextCount;
    writeLoginCounts(counts);
    return nextCount;
  }

  function shouldAutoShow(email) {
    if (!email || email === auth?.ADMIN_EMAIL) {
      return false;
    }

    if (sessionStorage.getItem(SESSION_TOUR_KEY) === email) {
      return false;
    }

    return getLoginCount(email) <= MAX_AUTO_TOURS;
  }

  function markTourShown(email) {
    sessionStorage.setItem(SESSION_TOUR_KEY, String(email || "").toLowerCase());
  }

  function renderStep(index) {
    const step = STEPS[index];
    showingFinish = false;

    if (elements.eyebrow) {
      elements.eyebrow.textContent = "How it works";
    }

    if (elements.progress) {
      elements.progress.textContent = `Step ${index + 1} of ${STEPS.length}`;
    }

    if (elements.icon) {
      elements.icon.textContent = step.icon;
    }

    if (elements.title) {
      elements.title.textContent = step.title;
    }

    if (elements.copy) {
      elements.copy.textContent = step.copy;
    }

    if (elements.nextButton) {
      elements.nextButton.textContent = index === STEPS.length - 1 ? "Finish" : "Next";
    }
  }

  function renderFinish() {
    showingFinish = true;

    if (elements.eyebrow) {
      elements.eyebrow.textContent = FINISH.eyebrow;
    }

    if (elements.progress) {
      elements.progress.textContent = "Tour complete";
    }

    if (elements.icon) {
      elements.icon.textContent = FINISH.icon;
    }

    if (elements.title) {
      elements.title.textContent = FINISH.title;
    }

    if (elements.copy) {
      elements.copy.textContent = FINISH.copy;
    }

    if (elements.nextButton) {
      elements.nextButton.textContent = FINISH.button;
    }
  }

  function openTour(startAt = 0, options = {}) {
    const { auto = false } = options;
    currentStep = startAt;
    renderStep(currentStep);
    elements.overlay.hidden = false;
    document.body.classList.add("onboarding-open");
    elements.nextButton?.focus();

    if (auto) {
      const email = getSignedInEmail();
      if (email) {
        markTourShown(email);
      }
    }
  }

  function closeTour() {
    elements.overlay.hidden = true;
    document.body.classList.remove("onboarding-open");
    showingFinish = false;

    const email = getSignedInEmail();
    if (email) {
      markTourShown(email);
    }
  }

  function handleNext() {
    if (showingFinish) {
      closeTour();
      return;
    }

    if (currentStep < STEPS.length - 1) {
      currentStep += 1;
      renderStep(currentStep);
      return;
    }

    renderFinish();
  }

  elements.nextButton?.addEventListener("click", handleNext);
  elements.skipButton?.addEventListener("click", closeTour);
  elements.replayButton?.addEventListener("click", () => openTour(0));

  elements.overlay?.addEventListener("click", (event) => {
    if (event.target === elements.overlay) {
      closeTour();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (elements.overlay.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeTour();
    }
  });

  window.SmartHydroOnboarding = {
    open: openTour,
    close: closeTour,
    getLoginCount,
    recordLogin,
  };

  const email = getSignedInEmail();

  if (!email) {
    return;
  }

  recordLogin(email);

  if (shouldAutoShow(email)) {
    window.setTimeout(() => openTour(0, { auto: true }), 450);
  }
})();
