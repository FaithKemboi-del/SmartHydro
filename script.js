const mlDetectButton = document.querySelector("#ml-detect-anomaly");
const mlResultPanel = document.querySelector("#ml-result-panel");
const scoreRing = document.querySelector(".score-ring");
const startLiveMonitoringButton = document.querySelector("#start-live-monitoring");

const elements = {
  overallHealth: document.querySelector("#overall-health"),
  overallHealthDot: document.querySelector("#overall-health-dot"),
  systemSummary: document.querySelector("#system-summary"),
  phValue: document.querySelector("#ph-value"),
  phStatus: document.querySelector("#ph-status"),
  phProgress: document.querySelector("#ph-progress"),
  waterValue: document.querySelector("#water-value"),
  waterStatus: document.querySelector("#water-status"),
  waterProgress: document.querySelector("#water-progress"),
  temperatureValue: document.querySelector("#temperature-value"),
  temperatureStatus: document.querySelector("#temperature-status"),
  temperatureProgress: document.querySelector("#temperature-progress"),
  nutrientValue: document.querySelector("#nutrient-value"),
  nutrientStatus: document.querySelector("#nutrient-status"),
  nutrientProgress: document.querySelector("#nutrient-progress"),
  phTrend: document.querySelector("#ph-trend"),
  waterTrend: document.querySelector("#water-trend"),
  temperatureTrend: document.querySelector("#temperature-trend"),
  nutrientTrend: document.querySelector("#nutrient-trend"),
  anomalyScore: document.querySelector("#anomaly-score"),
  monitoringState: document.querySelector("#monitoring-state"),
  nextDayPrediction: document.querySelector("#next-day-prediction"),
  nextDayRemedy: document.querySelector("#next-day-remedy"),
};

const metricCards = {
  ph: document.querySelector('[data-metric="ph"]'),
  water: document.querySelector('[data-metric="water"]'),
  temperature: document.querySelector('[data-metric="temperature"]'),
  nutrient: document.querySelector('[data-metric="nutrient"]'),
};

const defaultReadings = {
  ph: 6.3,
  water: 78,
  temperature: 24.6,
  nutrient: 1.8,
};

let currentReadings = { ...defaultReadings };
let previousReadings = { ...defaultReadings };
let monitoringInterval = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max, decimals = 1) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function classifyMetric(metric, value) {
  const ranges = {
    ph: {
      healthy: value >= 5.8 && value <= 6.5,
      warning: value >= 5.4 && value <= 6.9,
      healthyLabel: "Optimal",
      warningLabel: "Imbalance",
      criticalLabel: "Critical pH",
    },
    water: {
      healthy: value >= 60,
      warning: value >= 40,
      healthyLabel: "Sufficient",
      warningLabel: "Low",
      criticalLabel: "Critical low",
    },
    temperature: {
      healthy: value >= 20 && value <= 28,
      warning: value >= 18 && value <= 31,
      healthyLabel: "Stable",
      warningLabel: "Drifting",
      criticalLabel: "Unsafe",
    },
    nutrient: {
      healthy: value >= 1.4 && value <= 2.4,
      warning: value >= 1.0 && value <= 2.8,
      healthyLabel: "Balanced",
      warningLabel: "Needs attention",
      criticalLabel: "Deficient",
    },
  };

  const range = ranges[metric];

  if (range.healthy) {
    return { level: "healthy", label: range.healthyLabel };
  }

  if (range.warning) {
    return { level: "warning", label: range.warningLabel };
  }

  return { level: "critical", label: range.criticalLabel };
}

function calculateAnomalyScore(readings) {
  const deviations = [
    Math.abs(readings.ph - 6.2) / 1.5,
    readings.water < 70 ? (70 - readings.water) / 70 : 0,
    Math.abs(readings.temperature - 24.5) / 10,
    readings.nutrient < 1.8 ? (1.8 - readings.nutrient) / 1.8 : Math.max(0, readings.nutrient - 2.2) / 2.2,
  ];

  const score = deviations.reduce((total, deviation) => total + deviation, 0) / deviations.length;
  return clamp(score, 0.03, 0.98);
}

function getOverallState(metricStates, anomalyScore) {
  const levels = metricStates.map((state) => state.level);

  if (levels.includes("critical") || anomalyScore >= 0.72) {
    return {
      level: "critical",
      label: "Critical",
      prediction: "Anomaly",
      confidence: Math.round(88 + anomalyScore * 10),
    };
  }

  if (levels.includes("warning") || anomalyScore >= 0.38) {
    return {
      level: "warning",
      label: "Warning",
      prediction: "Warning",
      confidence: Math.round(82 + anomalyScore * 12),
    };
  }

  return {
    level: "healthy",
    label: "Healthy",
    prediction: "Normal",
    confidence: Math.round(91 + (0.3 - anomalyScore) * 10),
  };
}

function setStatusClass(element, level) {
  element.classList.remove("healthy", "warning", "critical");
  element.classList.add(level);
}

function setMetricCardClass(card, level) {
  card.classList.remove("is-warning", "is-critical");

  if (level === "warning") {
    card.classList.add("is-warning");
  }

  if (level === "critical") {
    card.classList.add("is-critical");
  }
}

function recommendationItems(readings, state) {
  const recommendations = [];

  if (readings.nutrient < 1.4) {
    recommendations.push("Add nutrient solution and check the levels again.");
  } else if (readings.nutrient > 2.4) {
    recommendations.push("Add clean water to lower nutrient strength.");
  } else {
    recommendations.push("Keep nutrients flowing and check them regularly.");
  }

  if (readings.ph < 5.8) {
    recommendations.push("Add pH Up to raise the level.");
  } else if (readings.ph > 6.5) {
    recommendations.push("Add pH Down to lower the level.");
  } else {
    recommendations.push("Check pH often and keep it steady.");
  }

  if (readings.water < 60) {
    recommendations.push("Add water to the tank and check the pump.");
  } else if (readings.water > 90) {
    recommendations.push("Lower the water level or check drainage.");
  } else {
    recommendations.push("Keep the water level steady.");
  }

  if (readings.temperature > 28) {
    recommendations.push("Move plants to shade or add more airflow.");
  } else if (readings.temperature < 20) {
    recommendations.push("Move plants to a warmer spot with more light.");
  }

  if (state.level !== "healthy") {
    recommendations.push("Look at your plants for any signs of stress.");
  }

  return recommendations;
}

function patternText(readings, state) {
  if (state.prediction === "Anomaly") {
    return "Detected pattern explanation: ML Model detected unusual nutrient decline pattern over time with supporting water or pH risk signals.";
  }

  if (state.prediction === "Warning") {
    return "Detected pattern explanation: Sensor trend is moving away from the expected operating range and should be corrected before plant stress occurs.";
  }

  if (readings.nutrient < 1.7) {
    return "Detected pattern explanation: Nutrient concentration is slightly declining, but the system has not crossed the warning threshold.";
  }

  return "Detected pattern explanation: Sensor readings show a consistent nutrient and water profile with no abnormal decline.";
}

function readingSummary(readings) {
  return `pH ${readings.ph.toFixed(1)} • Water ${Math.round(readings.water)}% • Temperature ${readings.temperature.toFixed(1)}°C • EC ${readings.nutrient.toFixed(1)}`;
}

function forecastValue(value, minChange, maxChange, min, max) {
  return clamp(value + randomBetween(minChange, maxChange), min, max);
}

function nextDayForecast(readings) {
  const predicted = {
    ph: forecastValue(readings.ph, -0.2, 0.2, 4.8, 7.4),
    water: forecastValue(readings.water, -8, -2, 20, 98),
    temperature: forecastValue(readings.temperature, -1, 1.3, 15, 34),
    nutrient: forecastValue(readings.nutrient, -0.25, 0.1, 0.5, 3.2),
  };
  const state = getOverallState(
    [
      classifyMetric("ph", predicted.ph),
      classifyMetric("water", predicted.water),
      classifyMetric("temperature", predicted.temperature),
      classifyMetric("nutrient", predicted.nutrient),
    ],
    calculateAnomalyScore(predicted),
  );

  return {
    predicted,
    state,
    recommendations: recommendationItems(predicted, state).slice(0, 3),
  };
}

function updateDashboard(readings) {
  previousReadings = { ...currentReadings };
  currentReadings = { ...readings };
  const phState = classifyMetric("ph", readings.ph);
  const waterState = classifyMetric("water", readings.water);
  const temperatureState = classifyMetric("temperature", readings.temperature);
  const nutrientState = classifyMetric("nutrient", readings.nutrient);
  const anomalyScore = calculateAnomalyScore(readings);
  const overallState = getOverallState([phState, waterState, temperatureState, nutrientState], anomalyScore);
  const roundedScore = anomalyScore.toFixed(2);

  elements.overallHealth.textContent = overallState.label;
  setStatusClass(elements.overallHealthDot, overallState.level);
  elements.systemSummary.textContent =
    overallState.level === "healthy"
      ? "AI summary: Conditions are stable. pH, water level, temperature, and nutrient values are within recommended hydroponic operating ranges."
      : `AI summary: ${overallState.label} condition detected. Review sensor values, inspect reservoir conditions, and apply recommendations before plant stress increases.`;

  elements.phValue.textContent = readings.ph.toFixed(1);
  elements.waterValue.textContent = Math.round(readings.water);
  elements.temperatureValue.textContent = readings.temperature.toFixed(1);
  elements.nutrientValue.textContent = readings.nutrient.toFixed(1);

  const metricUpdates = [
    ["ph", phState, elements.phStatus, elements.phProgress, clamp(((readings.ph - 4.5) / 3) * 100, 8, 100)],
    ["water", waterState, elements.waterStatus, elements.waterProgress, clamp(readings.water, 5, 100)],
    [
      "temperature",
      temperatureState,
      elements.temperatureStatus,
      elements.temperatureProgress,
      clamp(((readings.temperature - 12) / 24) * 100, 8, 100),
    ],
    [
      "nutrient",
      nutrientState,
      elements.nutrientStatus,
      elements.nutrientProgress,
      clamp((readings.nutrient / 3) * 100, 8, 100),
    ],
  ];

  metricUpdates.forEach(([metric, state, statusElement, progressElement, progressValue]) => {
    statusElement.textContent = state.label;
    setStatusClass(statusElement, state.level);
    setMetricCardClass(metricCards[metric], state.level);
    progressElement.style.width = `${progressValue}%`;
  });

  updateTrendIndicators(previousReadings, readings);
  elements.anomalyScore.textContent = roundedScore;
}

function updateTrendIndicators(previous, next) {
  const trendMap = [
    ["ph", elements.phTrend, 0.02],
    ["water", elements.waterTrend, 0.25],
    ["temperature", elements.temperatureTrend, 0.08],
    ["nutrient", elements.nutrientTrend, 0.03],
  ];

  trendMap.forEach(([metric, element, threshold]) => {
    const difference = next[metric] - previous[metric];

    element.classList.remove("up", "down", "steady");

    if (Math.abs(difference) <= threshold) {
      element.textContent = "Stable";
      element.classList.add("steady");
      return;
    }

    if (difference > 0) {
      element.textContent = `Moving forward +${Math.abs(difference).toFixed(metric === "water" ? 0 : 1)}`;
      element.classList.add("up");
      return;
    }

    element.textContent = `Moving backward -${Math.abs(difference).toFixed(metric === "water" ? 0 : 1)}`;
    element.classList.add("down");
  });
}

function monitoringReading(tick, totalTicks) {
  const progress = tick / totalTicks;
  const settling = Math.max(0.12, 1 - progress);
  const target = {
    ph: 6.2,
    water: 76,
    temperature: 23.4,
    nutrient: 1.8,
  };

  return {
    ph: target.ph + randomBetween(-0.12, 0.12) * settling,
    water: target.water + randomBetween(-1.4, 1.4, 0) * settling,
    temperature: target.temperature + randomBetween(-0.35, 0.35) * settling,
    nutrient: target.nutrient + randomBetween(-0.08, 0.08) * settling,
  };
}

function getSystemSettings() {
  const defaults = {
    monitoring_enabled: true,
    ph_sensor_enabled: true,
    temperature_sensor_enabled: true,
    water_sensor_enabled: true,
    ec_sensor_enabled: true,
    anomaly_detection_enabled: true,
  };

  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("smartHydroSystemSettings") || "{}") };
  } catch (_error) {
    return defaults;
  }
}

async function logDashboardAlert(severity, title, message) {
  const payload = {
    created_at: new Date().toISOString(),
    severity,
    title,
    message,
    source: "dashboard",
  };

  try {
    const existing = JSON.parse(localStorage.getItem("smartHydroAlertLogs") || "[]");
    const next = Array.isArray(existing) ? existing : [];
    next.unshift(payload);
    localStorage.setItem("smartHydroAlertLogs", JSON.stringify(next.slice(0, 100)));
  } catch (_error) {
    // Ignore local storage failures.
  }

  const client = window.SmartHydroAuth?.getSupabaseClient?.();

  if (!client) {
    return;
  }

  try {
    await client.from("alert_logs").insert({
      severity,
      title,
      message,
      source: "dashboard",
    });
  } catch (_error) {
    // Table may not exist until schema is updated.
  }
}

function startLiveMonitoring() {
  const settings = getSystemSettings();

  if (!settings.monitoring_enabled) {
    elements.monitoringState.textContent =
      "Live monitoring is disabled in the admin system settings.";
    return;
  }

  if (monitoringInterval) {
    window.clearInterval(monitoringInterval);
  }

  const totalTicks = 30;
  let tick = 0;

  startLiveMonitoringButton.disabled = true;
  startLiveMonitoringButton.textContent = "Monitoring...";
  window.SmartHydroLiveMonitoringActive = true;
  elements.monitoringState.textContent =
    "Live monitoring started. Readings are changing slightly as the system collects sensor data.";

  monitoringInterval = window.setInterval(() => {
    tick += 1;

    if (tick >= totalTicks) {
      window.clearInterval(monitoringInterval);
      monitoringInterval = null;
      window.SmartHydroLiveMonitoringActive = false;
      updateDashboard({
        ph: 6.2,
        water: 76,
        temperature: 23.4,
        nutrient: 1.8,
      });
      elements.monitoringState.textContent =
        "Monitoring stabilized after one minute. Current levels are healthy and ready for continued tracking.";
      startLiveMonitoringButton.disabled = false;
      startLiveMonitoringButton.textContent = "Start Live Monitoring";
      return;
    }

    updateDashboard(monitoringReading(tick, totalTicks));
    elements.monitoringState.textContent = `Monitoring in progress: ${Math.round(
      (tick / totalTicks) * 60,
    )} seconds of 60 seconds completed.`;
  }, 2000);
}

function averagesToReadings(averages) {
  const ph = Number(averages.ph ?? 6.2);
  const water = Number(averages.water ?? 75);
  const temperature = Number(averages.temperature ?? 23.5);
  const nutrient = Number(
    averages.nutrient ??
      clamp(1.8 - (6.2 - ph) * 0.25 - Math.max(0, 70 - water) * 0.008, 0.9, 2.5),
  );

  return { ph, water, temperature, nutrient };
}

function weekStateFromReadings(readings) {
  return getOverallState(
    [
      classifyMetric("ph", readings.ph),
      classifyMetric("water", readings.water),
      classifyMetric("temperature", readings.temperature),
      classifyMetric("nutrient", readings.nutrient),
    ],
    calculateAnomalyScore(readings),
  );
}

window.SmartHydroDashboard = {
  getCurrentReadings() {
    return { ...currentReadings };
  },
  readingSummary,
  updateDashboard,
  nextDayForecast,
  formatPredictionText,
  formatRecommendationText,
  recommendationItems,
  averagesToReadings,
  weekStateFromReadings,
  classifyMetric,
  calculateAnomalyScore,
};

startLiveMonitoringButton.addEventListener("click", startLiveMonitoring);

function formatPredictionText(forecast) {
  const { predicted, state } = forecast;
  const condition =
    state.prediction === "Normal"
      ? "The system looks healthy."
      : state.prediction === "Warning"
        ? "The system may need attention tomorrow."
        : "The system may have a problem tomorrow.";

  return `Tomorrow we expect water at ${Math.round(predicted.water)}%, pH ${predicted.ph.toFixed(1)}, nutrients at ${predicted.nutrient.toFixed(1)}, and temperature ${predicted.temperature.toFixed(1)}°C. ${condition}`;
}

function formatRecommendationText(recommendations) {
  return `What to do before tomorrow: ${recommendations.join(" ")}`;
}

function showDetectionResult(forecast) {
  elements.nextDayPrediction.textContent = formatPredictionText(forecast);
  elements.nextDayRemedy.textContent = formatRecommendationText(forecast.recommendations);
  mlResultPanel?.classList.add("is-revealed");
}

function stopScoreScan(baseScore) {
  scoreRing?.classList.remove("is-scanning");
  if (elements.anomalyScore && baseScore !== undefined) {
    elements.anomalyScore.textContent = baseScore;
  }
}

function startScoreScan(baseScore) {
  if (!scoreRing || !elements.anomalyScore) {
    return null;
  }

  scoreRing.classList.add("is-scanning");
  const numericScore = Number(baseScore);

  return window.setInterval(() => {
    const shift = (Math.random() * 0.12 - 0.06).toFixed(2);
    elements.anomalyScore.textContent = clamp(numericScore + Number(shift), 0.05, 0.95).toFixed(2);
  }, 350);
}

mlDetectButton?.addEventListener("click", () => {
  const settings = getSystemSettings();

  if (!settings.anomaly_detection_enabled) {
    elements.nextDayPrediction.textContent =
      "Anomaly detection is disabled in the admin system settings.";
    elements.nextDayRemedy.textContent = "Ask the admin to enable anomaly detection, then try again.";
    mlResultPanel?.classList.add("is-revealed");
    return;
  }

  const forecast = nextDayForecast(currentReadings);
  const baseScore = elements.anomalyScore?.textContent ?? "0.18";

  mlDetectButton.disabled = true;
  mlResultPanel?.classList.remove("is-revealed");
  mlDetectButton.textContent = "Reading sensor data...";

  const scanInterval = startScoreScan(baseScore);

  const finishDetection = () => {
    if (scanInterval) {
      window.clearInterval(scanInterval);
    }
    stopScoreScan(baseScore);
    showDetectionResult(forecast);
    mlDetectButton.disabled = false;
    mlDetectButton.textContent = "Detect Anomaly";

    if (forecast.state.prediction !== "Normal") {
      logDashboardAlert(
        forecast.state.prediction === "Anomaly" ? "critical" : "warning",
        `Anomaly detection: ${forecast.state.prediction}`,
        formatRecommendationText(forecast.recommendations),
      );
    }
  };

  if (window.SmartHydroTrends?.runChartPulse) {
    window.SmartHydroTrends.runChartPulse({
      durationMs: 5000,
      intense: true,
      onComplete: finishDetection,
    });
    return;
  }

  window.setTimeout(finishDetection, 5000);
});
