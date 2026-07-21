(function () {
  const dashboard = window.SmartHydroDashboard;
  const auth = window.SmartHydroAuth;

  const elements = {
    grid: document.querySelector("#weekly-report-grid"),
    status: document.querySelector("#weekly-report-status"),
    intro: document.querySelector("#weekly-report-intro"),
    nextPrediction: document.querySelector("#weekly-next-prediction"),
    nextActions: document.querySelector("#weekly-next-actions"),
    generateButton: document.querySelector("#generate-weekly-report"),
  };

  if (!dashboard || !elements.grid) {
    return;
  }

  let latestReport = null;

  function weekKeyUTC(dateValue) {
    const date = new Date(dateValue);
    const day = date.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().slice(0, 10);
  }

  function formatWeekLabel(weekStart) {
    return `Week of ${new Date(`${weekStart}T00:00:00Z`).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  function getCurrentUserEmail() {
    const adminSession = auth?.getAdminSession?.();
    const userSession = auth?.getUserSession?.();

    if (userSession?.email) {
      return userSession.email;
    }

    if (adminSession?.email && adminSession.email !== auth.ADMIN_EMAIL) {
      return adminSession.email;
    }

    return userSession?.email || adminSession?.email || null;
  }

  function getUserDisplayName(email) {
    return auth?.getUserDisplayName?.(email) || email?.split("@")[0] || "User";
  }

  function predictionClass(level) {
    if (level === "critical") {
      return "prediction-critical";
    }
    if (level === "warning") {
      return "prediction-warning";
    }
    return "";
  }

  function comparePrediction(predictedState, actualState) {
    if (!actualState) {
      return "The following week had limited data, so the result could not be checked.";
    }

    if (predictedState.prediction === actualState.prediction) {
      return `The model was right: the next week stayed ${actualState.prediction.toLowerCase()}.`;
    }

    if (predictedState.level === actualState.level) {
      return `Close match: predicted ${predictedState.prediction}, and the next week was still ${actualState.label.toLowerCase()}.`;
    }

    return `The model predicted ${predictedState.prediction}, but the next week turned out ${actualState.prediction}.`;
  }

  function buildWeekSummaries(rows) {
    const byWeek = new Map();

    for (const row of rows) {
      const key = weekKeyUTC(row.created_at);
      const entry = byWeek.get(key) || {
        ph: { sum: 0, count: 0 },
        temperature: { sum: 0, count: 0 },
        water: { sum: 0, count: 0 },
        readings: 0,
      };

      const ph = Number(row.ph);
      const temperature = Number(row.temperature);
      const water = Number(row.water_level ?? row.water);

      if (Number.isFinite(ph)) {
        entry.ph.sum += ph;
        entry.ph.count += 1;
      }

      if (Number.isFinite(temperature)) {
        entry.temperature.sum += temperature;
        entry.temperature.count += 1;
      }

      if (Number.isFinite(water)) {
        entry.water.sum += water;
        entry.water.count += 1;
      }

      entry.readings += 1;
      byWeek.set(key, entry);
    }

    const weeks = Array.from(byWeek.entries())
      .map(([weekStart, entry]) => {
        const averages = {
          ph: entry.ph.count ? entry.ph.sum / entry.ph.count : null,
          temperature: entry.temperature.count ? entry.temperature.sum / entry.temperature.count : null,
          water: entry.water.count ? entry.water.sum / entry.water.count : null,
        };

        const readings = dashboard.averagesToReadings(averages);
        const actualState = dashboard.weekStateFromReadings(readings);
        const forecast = dashboard.nextDayForecast(readings);

        return {
          weekStart,
          label: formatWeekLabel(weekStart),
          averages,
          readings: entry.readings,
          actualState,
          predictionMade: forecast.state,
          predictionSummary: dashboard.formatPredictionText(forecast),
          recommendations: forecast.recommendations,
        };
      })
      .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

    const reportWeeks = weeks.slice(-2).map((week) => {
      const weekIndex = weeks.findIndex((entry) => entry.weekStart === week.weekStart);
      const nextWeek = weeks[weekIndex + 1] || null;

      return {
        ...week,
        outcome: nextWeek
          ? comparePrediction(week.predictionMade, nextWeek.actualState)
          : "This is your most recent week. Use the next-week outlook below for what to do now.",
      };
    });

    const latestReadings =
      weeks.length > 0
        ? dashboard.averagesToReadings(weeks[weeks.length - 1].averages)
        : dashboard.getCurrentReadings();

    const nextWeekForecast = dashboard.nextDayForecast(latestReadings);

    return {
      weeks: reportWeeks,
      nextWeek: {
        forecast: nextWeekForecast,
        summary: dashboard.formatPredictionText(nextWeekForecast),
        actions: dashboard.formatRecommendationText(nextWeekForecast.recommendations),
      },
    };
  }

  function buildDemoRows() {
    const rows = [];
    const now = Date.now();

    for (let day = 13; day >= 0; day -= 1) {
      const createdAt = new Date(now - day * 24 * 60 * 60 * 1000).toISOString();
      const drift = Math.sin(day / 3) * 0.15;

      rows.push({
        created_at: createdAt,
        ph: 6.2 + drift,
        temperature: 23.5 + drift * 2,
        water_level: 76 - day * 0.4,
      });
    }

    return rows;
  }

  async function fetchUserReadings(email) {
    const client = auth?.getSupabaseClient?.();

    if (!client || !email) {
      return buildDemoRows();
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 21);

    const pageSize = 1000;
    let offset = 0;
    const all = [];

    while (true) {
      const { data, error } = await client
        .from("sensor_readings")
        .select("created_at, ph, temperature, water_level")
        .eq("user_email", email)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(error.message || "Could not load your sensor readings.");
      }

      if (!data?.length) {
        break;
      }

      all.push(...data);
      offset += data.length;

      if (data.length < pageSize) {
        break;
      }
    }

    return all.length ? all : buildDemoRows();
  }

  function renderWeekCard(week, index) {
    const averages = week.averages;

    return `
      <article class="weekly-report-card">
        <span class="eyebrow">Week ${index + 1}</span>
        <h3>${week.label}</h3>
        <p>${week.readings} readings averaged for this week.</p>

        <dl class="weekly-report-metrics">
          <div>
            <dt>Average pH</dt>
            <dd>${averages.ph == null ? "—" : averages.ph.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Average temperature</dt>
            <dd>${averages.temperature == null ? "—" : `${averages.temperature.toFixed(1)}°C`}</dd>
          </div>
          <div>
            <dt>Average water level</dt>
            <dd>${averages.water == null ? "—" : `${averages.water.toFixed(1)}%`}</dd>
          </div>
        </dl>

        <div class="prediction-row">
          <strong>Prediction made</strong>
          <span class="${predictionClass(week.predictionMade.level)}">${week.predictionMade.prediction}</span>
        </div>
        <p>${week.predictionSummary}</p>
        <p class="weekly-report-outcome"><strong>Result:</strong> ${week.outcome}</p>
        <p class="model-note">${dashboard.formatRecommendationText(week.recommendations)}</p>
      </article>
    `;
  }

  function renderReport(report, email, sourceLabel) {
    latestReport = { report, email, sourceLabel };

    if (!report.weeks.length) {
      elements.grid.innerHTML = `
        <article class="weekly-report-card">
          <span class="eyebrow">No data yet</span>
          <h3>Weekly report unavailable</h3>
          <p>There are not enough readings yet to build a two-week report.</p>
        </article>
      `;
      elements.nextPrediction.textContent = "Add more sensor readings, then generate the report again.";
      elements.nextActions.textContent = "Keep monitoring daily so the model can learn your system pattern.";
      return;
    }

    elements.grid.innerHTML = report.weeks.map((week, index) => renderWeekCard(week, index)).join("");
    elements.nextPrediction.textContent = report.nextWeek.summary;
    elements.nextActions.textContent = report.nextWeek.actions;

    if (elements.intro) {
      elements.intro.textContent = `Weekly report for ${getUserDisplayName(email)}. ${sourceLabel}`;
    }
  }

  function writePdfLine(doc, text, y, options = {}) {
    const { size = 11, bold = false, x = 14 } = options;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(String(text), x, y);
    return y + size * 0.45 + 5;
  }

  function downloadWeeklyReportPdf(report, email) {
    const jsPDF = window.jspdf?.jsPDF;

    if (!jsPDF) {
      throw new Error("PDF library did not load. Refresh the page and try again.");
    }

    const doc = new jsPDF();
    let y = 18;

    y = writePdfLine(doc, "Smart Hydro - User Weekly Report", y, { size: 16, bold: true });
    y = writePdfLine(doc, `Generated: ${new Date().toLocaleString()}`, y);
    y = writePdfLine(doc, `User: ${getUserDisplayName(email)}`, y);
    y = writePdfLine(doc, `Email: ${email}`, y);
    y += 4;

    report.weeks.forEach((week, index) => {
      y = writePdfLine(doc, `Week ${index + 1}: ${week.label}`, y, { size: 13, bold: true });
      y = writePdfLine(
        doc,
        `Averages: pH ${week.averages.ph?.toFixed(2) ?? "—"}, temp ${week.averages.temperature?.toFixed(1) ?? "—"}°C, water ${week.averages.water?.toFixed(1) ?? "—"}%`,
        y,
      );
      y = writePdfLine(doc, `Prediction made: ${week.predictionMade.prediction}`, y);
      y = writePdfLine(doc, week.predictionSummary, y);
      y = writePdfLine(doc, `Result: ${week.outcome}`, y);
      y = writePdfLine(doc, dashboard.formatRecommendationText(week.recommendations), y);
      y += 4;

      if (y > 250) {
        doc.addPage();
        y = 18;
      }
    });

    y = writePdfLine(doc, "Next week outlook", y, { size: 13, bold: true });
    y = writePdfLine(doc, report.nextWeek.summary, y);
    y = writePdfLine(doc, report.nextWeek.actions, y);

    const safeEmail = String(email).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const fileName = `weekly-user-report-${safeEmail}.pdf`;
    doc.save(fileName);
    return fileName;
  }

  async function loadWeeklyReport(options = {}) {
    const { downloadPdf = false } = options;
    const email = getCurrentUserEmail();

    if (!email) {
      elements.status.textContent = "Sign in to generate your weekly report.";
      return;
    }

    if (elements.generateButton) {
      elements.generateButton.disabled = true;
      elements.generateButton.textContent = downloadPdf ? "Generating PDF..." : "Loading report...";
    }

    elements.status.textContent = downloadPdf
      ? "Building your weekly PDF report..."
      : "Loading your last two weeks...";

    try {
      const rows = await fetchUserReadings(email);
      const report = buildWeekSummaries(rows);
      const sourceLabel = auth?.hasSupabaseConfig?.()
        ? "Based on your stored sensor readings from the last three weeks."
        : "Showing demo readings until Supabase is configured.";

      renderReport(report, email, sourceLabel);

      if (downloadPdf) {
        const fileName = downloadWeeklyReportPdf(report, email);
        elements.status.textContent = `Weekly report ready. PDF downloaded: ${fileName}`;
      } else {
        elements.status.textContent = "Weekly report updated.";
      }
    } catch (error) {
      elements.status.textContent = `Could not build weekly report: ${String(error?.message || error)}`;
    } finally {
      if (elements.generateButton) {
        elements.generateButton.disabled = false;
        elements.generateButton.textContent = "Generate weekly report";
      }
    }
  }

  elements.generateButton?.addEventListener("click", () => {
    loadWeeklyReport({ downloadPdf: true });
  });

  loadWeeklyReport();
})();
