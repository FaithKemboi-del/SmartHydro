(function () {
  const trendBars = [
    { id: "trend-bar-ph", final: 54 },
    { id: "trend-bar-temp", final: 68 },
    { id: "trend-bar-water", final: 78 },
    { id: "trend-bar-ec", final: 64 },
    { id: "trend-bar-ec-drop", final: 45 },
  ];

  const samplesBody = document.querySelector("#sensor-samples-body");
  const miniChart = document.querySelector(".mini-chart");
  const readingsPanel = document.querySelector("#readings-trends-panel");
  let activePulseInterval = null;
  let isIntensePulse = false;

  function randomHeight(center, spread) {
    return Math.round(center + (Math.random() * spread * 2 - spread));
  }

  function setBarHeight(bar, height) {
    bar.style.setProperty("--height", `${clamp(height, 28, 92)}%`);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getBars() {
    return trendBars
      .map((bar) => ({
        element: document.getElementById(bar.id),
        final: bar.final,
      }))
      .filter((bar) => bar.element);
  }

  function stabilizeChart() {
    const bars = getBars();

    bars.forEach((bar) => {
      setBarHeight(bar.element, bar.final);
      bar.element.classList.remove("is-live");
      bar.element.classList.add("is-stable");
    });

    miniChart?.classList.remove("is-live");
    miniChart?.classList.add("is-stable");
  }

  function formatSampleHour(date) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function sampleRows() {
    const now = new Date();
    const rows = [
      { ph: 6.2, temp: 23.4, water: 76, ec: 1.8, status: "Normal", level: "healthy" },
      { ph: 6.1, temp: 23.8, water: 74, ec: 1.7, status: "Normal", level: "healthy" },
      { ph: 6.0, temp: 24.2, water: 72, ec: 1.6, status: "Watch", level: "warning" },
      { ph: 6.1, temp: 24.0, water: 75, ec: 1.7, status: "Normal", level: "healthy" },
      { ph: 6.3, temp: 23.6, water: 77, ec: 1.8, status: "Normal", level: "healthy" },
    ];

    return rows.map((row, index) => {
      const sampleTime = new Date(now);
      sampleTime.setMinutes(0, 0, 0);
      sampleTime.setHours(now.getHours() - index);

      return {
        time: formatSampleHour(sampleTime),
        ...row,
      };
    });
  }

  function renderSensorSamples() {
    if (!samplesBody) {
      return;
    }

    samplesBody.innerHTML = sampleRows()
      .map(
        (row) => `
          <tr>
            <td>${row.time}</td>
            <td>${row.ph.toFixed(1)}</td>
            <td>${row.temp.toFixed(1)}°C</td>
            <td>${row.water}%</td>
            <td>${row.ec.toFixed(1)}</td>
            <td><span class="table-status ${row.level}">${row.status}</span></td>
          </tr>
        `,
      )
      .join("");
  }

  function isAnimating() {
    return activePulseInterval !== null;
  }

  function runChartPulse(options = {}) {
    const {
      durationMs = 5000,
      tickMs = 500,
      intense = false,
      onComplete,
    } = options;

    if (isIntensePulse && !intense) {
      return;
    }

    const bars = getBars();

    if (!bars.length) {
      onComplete?.();
      return;
    }

    if (activePulseInterval) {
      window.clearInterval(activePulseInterval);
      activePulseInterval = null;
    }

    isIntensePulse = intense;

    miniChart?.classList.remove("is-stable");
    miniChart?.classList.add("is-live");
    readingsPanel?.classList.add("is-animating");
    bars.forEach((bar) => {
      bar.element.classList.remove("is-stable");
      bar.element.classList.add("is-live");
    });

    let tick = 0;
    const totalTicks = Math.max(1, Math.ceil(durationMs / tickMs));

    activePulseInterval = window.setInterval(() => {
      tick += 1;

      if (tick >= totalTicks) {
        window.clearInterval(activePulseInterval);
        activePulseInterval = null;
        isIntensePulse = false;
        stabilizeChart();
        readingsPanel?.classList.remove("is-animating");
        onComplete?.();
        return;
      }

      const progress = tick / totalTicks;
      const settling = intense ? Math.max(0.35, 1 - progress * 0.65) : 1 - progress;
      const spread = (intense ? 18 : 14) * settling + 4;

      bars.forEach((bar) => {
        setBarHeight(bar.element, randomHeight(bar.final, spread));
      });
    }, tickMs);
  }

  renderSensorSamples();
  stabilizeChart();

  readingsPanel?.addEventListener("mouseenter", () => {
    if (isAnimating() || isIntensePulse) {
      return;
    }

    renderSensorSamples();
    runChartPulse({ durationMs: 10000, tickMs: 500 });
  });

  window.SmartHydroTrends = {
    runChartPulse,
    renderSensorSamples,
  };
})();
