const form = document.querySelector("#analysis-form");
const simulateConditionButton = document.querySelector("#simulate-condition");
const mlAnalyzeButton = document.querySelector("#ml-analyze");
const mlAnalysisCard = document.querySelector("#ml-analysis-card");
const simulationInputs = {
  ph: document.querySelector("#input-ph"),
  water: document.querySelector("#input-water"),
  temperature: document.querySelector("#input-temperature"),
  nutrient: document.querySelector("#input-nutrient"),
};

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
  anomalyScore: document.querySelector("#anomaly-score"),
  analysisTitle: document.querySelector("#analysis-title"),
  analysisText: document.querySelector("#analysis-text"),
  recommendations: document.querySelector("#recommendations"),
  analysisWarning: document.querySelector("#analysis-warning"),
  simulatedValues: document.querySelector("#simulated-values"),
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max, decimals = 1) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function choose(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function optimalReading() {
  return {
    ph: randomBetween(5.8, 6.5),
    water: randomBetween(65, 90, 0),
    temperature: randomBetween(21, 27),
    nutrient: randomBetween(1.4, 2.3),
  };
}

function warningValue(metric) {
  const warningRanges = {
    ph: [
      [5.2, 5.7],
      [6.6, 7.1],
    ],
    water: [
      [35, 59, 0],
      [91, 98, 0],
    ],
    temperature: [
      [16, 19.5],
      [28.5, 32],
    ],
    nutrient: [
      [0.7, 1.3],
      [2.5, 3.0],
    ],
  };
  const range = choose(warningRanges[metric]);
  return randomBetween(range[0], range[1], range[2] ?? 1);
}

function simulatedReading() {
  const readings = optimalReading();

  if (Math.random() < 0.58) {
    return readings;
  }

  const metrics = ["ph", "water", "temperature", "nutrient"].sort(() => Math.random() - 0.5);
  const warningCount = Math.random() < 0.7 ? 1 : 2;

  metrics.slice(0, warningCount).forEach((metric) => {
    readings[metric] = warningValue(metric);
  });

  return readings;
}

function hasSimulationInput() {
  return Object.values(simulationInputs).some((input) => input.value.trim() !== "");
}

function inputValue(input, fallback) {
  if (input.value.trim() === "") {
    return fallback;
  }

  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function readingFromInputs() {
  const fallback = simulatedReading();

  if (!hasSimulationInput()) {
    Object.entries(fallback).forEach(([metric, value]) => {
      simulationInputs[metric].value = metric === "water" ? Math.round(value) : value.toFixed(1);
    });
    return fallback;
  }

  return {
    ph: inputValue(simulationInputs.ph, fallback.ph),
    water: inputValue(simulationInputs.water, fallback.water),
    temperature: inputValue(simulationInputs.temperature, fallback.temperature),
    nutrient: inputValue(simulationInputs.nutrient, fallback.nutrient),
  };
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
    recommendations.push("Add nutrient solution and verify EC again after circulation.");
  } else if (readings.nutrient > 2.4) {
    recommendations.push("Reduce nutrient strength by diluting the solution with clean water.");
  } else {
    recommendations.push("Maintain nutrient circulation and continue observing EC fluctuation.");
  }

  if (readings.ph < 5.8) {
    recommendations.push("Add pH Up solution to move pH toward the 5.8 to 6.5 range.");
  } else if (readings.ph > 6.5) {
    recommendations.push("Add pH Down solution to move pH toward the 5.8 to 6.5 range.");
  } else {
    recommendations.push("Keep pH level stable through regular calibration and buffer checks.");
  }

  if (readings.water < 60) {
    recommendations.push("Add water by refilling the reservoir and checking pump flow.");
  } else if (readings.water > 90) {
    recommendations.push("Reduce water level or inspect drainage to avoid overfilling.");
  } else {
    recommendations.push("Maintain reservoir level and inspect tubing for consistent flow.");
  }

  if (readings.temperature > 28) {
    recommendations.push("Move plants to shade or improve ventilation to lower temperature.");
  } else if (readings.temperature < 20) {
    recommendations.push("Move plants to light or a warmer area to raise temperature.");
  }

  if (state.level !== "healthy") {
    recommendations.push("Record this event for model validation and inspect plants for visible stress.");
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

  elements.anomalyScore.textContent = roundedScore;

  elements.analysisTitle.textContent =
    overallState.level === "healthy"
      ? "Stable growing condition"
      : overallState.level === "warning"
        ? "Warning condition detected"
        : "Critical anomaly detected";
  elements.analysisText.textContent =
    overallState.level === "healthy"
      ? "Current sample indicates healthy hydroponic conditions. Continue monitoring sensor drift and refill solution before water drops below 50%."
      : "The AI interpretation indicates abnormal or drifting sensor behavior. The system recommends corrective maintenance and closer monitoring of the next readings.";

  elements.recommendations.innerHTML = recommendationItems(readings, overallState)
    .map((item) => `<li>${item}</li>`)
    .join("");

  elements.analysisWarning.classList.toggle("is-hidden", overallState.level === "healthy");
  elements.analysisWarning.textContent =
    overallState.level === "critical"
      ? "High severity warning: anomaly detected. Inspect reservoir, pH, and nutrient solution immediately."
      : "Warning: anomaly risk detected. Correct the highlighted parameter and monitor the next sample.";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  simulateConditionButton.click();
});

simulateConditionButton.addEventListener("click", () => {
  const readings = readingFromInputs();
  elements.simulatedValues.textContent = readingSummary(readings);
  mlAnalysisCard.classList.remove("is-rotated");
  updateDashboard(readings);
});

mlAnalyzeButton.addEventListener("click", () => {
  const forecast = nextDayForecast(currentReadings);
  elements.nextDayPrediction.textContent = `Based on the past few days and records coming in, I predict tomorrow's values will be water ${Math.round(
    forecast.predicted.water,
  )}%, pH ${forecast.predicted.ph.toFixed(1)}, EC ${forecast.predicted.nutrient.toFixed(1)}, and temperature ${forecast.predicted.temperature.toFixed(
    1,
  )}°C. The predicted condition is ${forecast.state.prediction.toLowerCase()}.`;
  elements.nextDayRemedy.textContent = `I recommend before tomorrow: ${forecast.recommendations.join(" ")}`;
  mlAnalysisCard.classList.add("is-rotated");
});
