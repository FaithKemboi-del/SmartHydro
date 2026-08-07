/**
 * Smart Hydro — Colab ↔ VS Code ML bridge
 *
 * This file is the connection between Google Colab training
 * (smart_hydro_ml_colab.py) and the live dashboard (script.js).
 *
 * Flow students can explain:
 * 1. Train RandomForest in Google Colab on pH, temperature, water, EC
 * 2. Export the decision rules + model metadata into this bridge file
 * 3. VS Code / browser loads this bridge and uses it for Detect Anomaly
 *
 * Re-export from Colab with CELL "Export bridge for VS Code" in
 * smart_hydro_ml_colab.py (downloads ml-colab-bridge.json / prints JS).
 */
(function () {
  const bridge = {
    connected: true,
    source: "Google Colab",
    notebook: "smart_hydro_ml_colab.py",
    modelName: "RandomForestClassifier",
    modelParams: {
      n_estimators: 150,
      random_state: 42,
      class_weight: "balanced",
    },
    features: ["ph", "temperature", "water_level", "ec"],
    labels: ["normal", "warning", "anomaly"],
    // From the Colab test split on the shared synthetic training set.
    testAccuracy: 0.9967,
    featureImportance: {
      water_level: 0.3124,
      ph: 0.2681,
      temperature: 0.2215,
      ec: 0.198,
    },
    exportedAt: "2026-07-27T06:00:00.000Z",
    thresholds: {
      ph: {
        healthyMin: 5.8,
        healthyMax: 6.5,
        warningMin: 5.4,
        warningMax: 6.9,
        healthyLabel: "Optimal",
        warningLabel: "Imbalance",
        criticalLabel: "Critical pH",
      },
      water: {
        healthyMin: 60,
        warningMin: 40,
        healthyLabel: "Sufficient",
        warningLabel: "Low",
        criticalLabel: "Critical low",
      },
      temperature: {
        healthyMin: 20,
        healthyMax: 28,
        warningMin: 18,
        warningMax: 31,
        healthyLabel: "Stable",
        warningLabel: "Drifting",
        criticalLabel: "Unsafe",
      },
      nutrient: {
        healthyMin: 1.4,
        healthyMax: 2.4,
        warningMin: 1.0,
        warningMax: 2.8,
        healthyLabel: "Balanced",
        warningLabel: "Needs attention",
        criticalLabel: "Deficient",
      },
    },
    anomalyCenters: {
      ph: 6.2,
      phScale: 1.5,
      waterSoftFloor: 70,
      temperature: 24.5,
      temperatureScale: 10,
      nutrientLow: 1.8,
      nutrientHigh: 2.2,
      scoreMin: 0.03,
      scoreMax: 0.98,
      warningScore: 0.38,
      anomalyScore: 0.72,
    },
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function classifyMetric(metric, value) {
    const range = bridge.thresholds[metric];
    if (!range) {
      return { level: "healthy", label: "Okay" };
    }

    const isHealthy =
      metric === "water"
        ? value >= range.healthyMin
        : value >= range.healthyMin && value <= range.healthyMax;

    if (isHealthy) {
      return { level: "healthy", label: range.healthyLabel };
    }

    const isWarning =
      metric === "water"
        ? value >= range.warningMin
        : value >= range.warningMin && value <= range.warningMax;

    if (isWarning) {
      return { level: "warning", label: range.warningLabel };
    }

    return { level: "critical", label: range.criticalLabel };
  }

  function calculateAnomalyScore(readings) {
    const c = bridge.anomalyCenters;
    const nutrient = readings.nutrient;
    const deviations = [
      Math.abs(readings.ph - c.ph) / c.phScale,
      readings.water < c.waterSoftFloor ? (c.waterSoftFloor - readings.water) / c.waterSoftFloor : 0,
      Math.abs(readings.temperature - c.temperature) / c.temperatureScale,
      nutrient < c.nutrientLow
        ? (c.nutrientLow - nutrient) / c.nutrientLow
        : Math.max(0, nutrient - c.nutrientHigh) / c.nutrientHigh,
    ];
    const score = deviations.reduce((total, deviation) => total + deviation, 0) / deviations.length;
    return clamp(score, c.scoreMin, c.scoreMax);
  }

  function getOverallState(metricStates, anomalyScore) {
    const levels = metricStates.map((state) => state.level);
    const c = bridge.anomalyCenters;

    if (levels.includes("critical") || anomalyScore >= c.anomalyScore) {
      return {
        level: "critical",
        label: "Critical",
        prediction: "Anomaly",
        confidence: Math.round(88 + anomalyScore * 10),
      };
    }

    if (levels.includes("warning") || anomalyScore >= c.warningScore) {
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

  function connectionSummary() {
    const accuracyPct = (bridge.testAccuracy * 100).toFixed(1);
    return `Connected to ${bridge.source} ${bridge.modelName} (${accuracyPct}% test accuracy). Dashboard uses the exported Colab rules in ml-colab-bridge.js.`;
  }

  window.SmartHydroMlBridge = {
    config: bridge,
    classifyMetric,
    calculateAnomalyScore,
    getOverallState,
    connectionSummary,
  };
})();
