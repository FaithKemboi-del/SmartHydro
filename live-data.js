(function () {
  const auth = window.SmartHydroAuth;
  const dashboard = window.SmartHydroDashboard;

  if (!auth || !dashboard || !auth.hasSupabaseConfig()) {
    return;
  }

  const supabase = auth.getSupabaseClient();

  async function loadLatestReading() {
    if (window.SmartHydroLiveMonitoringActive) {
      return;
    }

    const { data, error } = await supabase
      .from("sensor_readings")
      .select("ph, temperature, water_level, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return;
    }

    const current = dashboard.getCurrentReadings();
    const readings = {
      ph: Number(data.ph),
      temperature: Number(data.temperature),
      water: Number(data.water_level),
      nutrient: current.nutrient,
    };

    dashboard.updateDashboard(readings);

    const simulatedValues = document.querySelector("#simulated-values");

    if (simulatedValues) {
      simulatedValues.textContent = `${dashboard.readingSummary(readings)} • Supabase ${new Date(
        data.created_at,
      ).toLocaleTimeString()}`;
    }
  }

  loadLatestReading();
  window.setInterval(loadLatestReading, 5000);
})();
