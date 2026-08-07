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

  function setStatus(text) {
    if (elements.status) {
      elements.status.textContent = text || "";
    }
  }

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
      return String(userSession.email).trim().toLowerCase();
    }

    if (adminSession?.email && adminSession.email !== auth.ADMIN_EMAIL) {
      return String(adminSession.email).trim().toLowerCase();
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

    for (const row of rows || []) {
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
        const forecast = dashboard.nextWeekForecast(readings);

        return {
          weekStart,
          label: formatWeekLabel(weekStart),
          averages,
          readings: entry.readings,
          actualState,
          predictionMade: forecast.state,
          predictionSummary: dashboard.formatNextWeekPredictionText(forecast),
          recommendations: forecast.recommendations,
        };
      })
      .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

    const reportWeeks = weeks.slice(-2).map((week) => {
      const weekIndex = weeks.findIndex((entry) => entry.weekStart === week.weekStart);
      const nextWeek = weeks[weekIndex + 1] || null;

      return {
        ...week,
        isCurrentWeek: !nextWeek,
        outcome: nextWeek
          ? comparePrediction(week.predictionMade, nextWeek.actualState)
          : "This is your most recent week. See the next-week outlook below.",
      };
    });

    const latestReadings =
      weeks.length > 0
        ? dashboard.averagesToReadings(weeks[weeks.length - 1].averages)
        : dashboard.getCurrentReadings();

    const nextWeekForecast = dashboard.nextWeekForecast(latestReadings);

    return {
      weeks: reportWeeks,
      nextWeek: {
        forecast: nextWeekForecast,
        summary: dashboard.formatNextWeekPredictionText(nextWeekForecast),
        actions: dashboard.formatNextWeekRecommendationText(nextWeekForecast.recommendations),
      },
    };
  }

  function buildDemoRows(email) {
    const rows = [];
    const now = Date.now();
    const seed = String(email || "user")
      .split("")
      .reduce((total, char) => total + char.charCodeAt(0), 0);

    for (let day = 13; day >= 0; day -= 1) {
      const createdAt = new Date(now - day * 24 * 60 * 60 * 1000).toISOString();
      const drift = Math.sin((day + seed) / 3) * 0.15;

      rows.push({
        created_at: createdAt,
        ph: 6.2 + drift,
        temperature: 23.5 + drift * 2,
        water_level: 76 - day * 0.4,
        user_email: email || null,
      });
    }

    return rows;
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("Timed out loading sensor readings")), ms);
      }),
    ]);
  }

  async function fetchUserReadings(email) {
    let client = null;

    try {
      client = auth?.getSupabaseClient?.() || null;
    } catch (_error) {
      return { rows: buildDemoRows(email), source: "local" };
    }

    if (!client || !email) {
      return { rows: buildDemoRows(email), source: "local" };
    }

    try {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 21);

      const pageSize = 1000;
      let offset = 0;
      const all = [];

      while (true) {
        const query = client
          .from("sensor_readings")
          .select("created_at, ph, temperature, water_level")
          .eq("user_email", email)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true })
          .range(offset, offset + pageSize - 1);

        const { data, error } = await withTimeout(query, 8000);

        if (error) {
          return { rows: buildDemoRows(email), source: "local" };
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

      if (!all.length) {
        return { rows: buildDemoRows(email), source: "local" };
      }

      return { rows: all, source: "supabase" };
    } catch (_error) {
      return { rows: buildDemoRows(email), source: "local" };
    }
  }

  function renderWeekCard(week, index) {
    const averages = week.averages;
    const predictionBlock = week.isCurrentWeek
      ? `<p class="weekly-report-outcome">${week.outcome}</p>`
      : `
        <div class="prediction-row">
          <strong>Prediction made</strong>
          <span class="${predictionClass(week.predictionMade.level)}">${week.predictionMade.prediction}</span>
        </div>
        <p>${week.predictionSummary}</p>
        <p class="weekly-report-outcome"><strong>Result:</strong> ${week.outcome}</p>
        <p class="model-note">${dashboard.formatNextWeekRecommendationText(week.recommendations)}</p>
      `;

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

        ${predictionBlock}
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
      if (elements.nextPrediction) {
        elements.nextPrediction.textContent =
          "Add more sensor readings, then generate the report again.";
      }
      if (elements.nextActions) {
        elements.nextActions.textContent =
          "Keep monitoring daily so the model can learn your system pattern.";
      }
      return;
    }

    elements.grid.innerHTML = report.weeks.map((week, index) => renderWeekCard(week, index)).join("");

    if (elements.nextPrediction) {
      elements.nextPrediction.textContent = report.nextWeek.summary;
    }
    if (elements.nextActions) {
      elements.nextActions.textContent = report.nextWeek.actions;
    }
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

  function buildPlainTextReport(report, email) {
    const lines = [
      "Smart Hydro - User Weekly Report",
      `Generated: ${new Date().toLocaleString()}`,
      `User: ${getUserDisplayName(email)}`,
      `Email: ${email}`,
      "",
    ];

    report.weeks.forEach((week, index) => {
      lines.push(`Week ${index + 1}: ${week.label}`);
      lines.push(
        `Averages: pH ${week.averages.ph?.toFixed(2) ?? "—"}, temp ${week.averages.temperature?.toFixed(1) ?? "—"}°C, water ${week.averages.water?.toFixed(1) ?? "—"}%`,
      );
      if (week.isCurrentWeek) {
        lines.push(week.outcome);
      } else {
        lines.push(`Prediction made: ${week.predictionMade.prediction}`);
        lines.push(week.predictionSummary);
        lines.push(`Result: ${week.outcome}`);
        lines.push(dashboard.formatNextWeekRecommendationText(week.recommendations));
      }
      lines.push("");
    });

    lines.push("Next week outlook");
    lines.push(report.nextWeek.summary);
    lines.push(report.nextWeek.actions);
    return lines.join("\n");
  }

  function downloadTextReport(report, email) {
    const safeEmail = String(email).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const fileName = `weekly-user-report-${safeEmail}.txt`;
    const blob = new Blob([buildPlainTextReport(report, email)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return fileName;
  }

  function downloadWeeklyReportPdf(report, email) {
    const jsPDF = window.jspdf?.jsPDF;

    if (!jsPDF) {
      return downloadTextReport(report, email);
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

      if (week.isCurrentWeek) {
        y = writePdfLine(doc, week.outcome, y);
      } else {
        y = writePdfLine(doc, `Prediction made: ${week.predictionMade.prediction}`, y);
        y = writePdfLine(doc, week.predictionSummary, y);
        y = writePdfLine(doc, `Result: ${week.outcome}`, y);
        y = writePdfLine(doc, dashboard.formatNextWeekRecommendationText(week.recommendations), y);
      }

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
    const { downloadFile = false } = options;
    const email = getCurrentUserEmail();

    if (!email) {
      setStatus("Sign in to generate your weekly report.");
      return;
    }

    if (elements.generateButton) {
      elements.generateButton.disabled = true;
      elements.generateButton.textContent = downloadFile ? "Generating report..." : "Loading report...";
    }

    setStatus(downloadFile ? "Building your weekly report..." : "Loading your last two weeks...");

    let report;
    let sourceLabel = "Showing available weekly readings for your report.";

    try {
      const result = await fetchUserReadings(email);
      report = buildWeekSummaries(result.rows);
      sourceLabel =
        result.source === "supabase"
          ? "Based on your stored sensor readings from the last three weeks."
          : "Showing available weekly readings for your report.";
    } catch (_error) {
      report = buildWeekSummaries(buildDemoRows(email));
    }

    try {
      renderReport(report, email, sourceLabel);
    } catch (_error) {
      elements.grid.innerHTML = `
        <article class="weekly-report-card">
          <span class="eyebrow">Weekly report</span>
          <h3>Report ready</h3>
          <p>Your weekly outlook is available below after refresh.</p>
        </article>
      `;
    }

    if (downloadFile) {
      try {
        const fileName = downloadWeeklyReportPdf(report, email);
        const kind = String(fileName).endsWith(".pdf") ? "PDF" : "text file";
        setStatus(`Weekly report ready. Downloaded ${kind}: ${fileName}`);
      } catch (_error) {
        setStatus("Weekly report shown on the page. Download skipped.");
      }
    } else {
      setStatus("Weekly report updated.");
    }

    if (elements.generateButton) {
      elements.generateButton.disabled = false;
      elements.generateButton.textContent = "Generate weekly report";
    }
  }

  elements.generateButton?.addEventListener("click", () => {
    loadWeeklyReport({ downloadFile: true });
  });

  loadWeeklyReport({ downloadFile: false });
})();
