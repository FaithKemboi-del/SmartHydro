# SmartHydro

Protected static dashboard for the university engineering project:

**Smart Hydroponics Monitoring and Anomaly Detection System**

The app includes:

- Real-time hydroponic plant status monitoring
- Sensor readings for pH, temperature, water level, and nutrient concentration
- Machine learning anomaly score and next-day prediction simulation
- Interactive sensor input simulation with recommendations
- Alerts, time-series readings, and system workflow
- Supabase Auth sign-in/sign-up pages
- Protected dashboard access with a hardcoded admin override
- Python ESP32-style sensor simulator that writes to Supabase

## Run locally

Serve the folder with any static file server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000/sign-in.html
```

## Admin override

The dashboard can be accessed immediately from the sign-in page with:

```text
Email: fchepkosgei21@gmail.com
Password: Hydrouser2026..
```

This stores an admin session in LocalStorage and redirects to `dashboard.html`, which then opens
the protected dashboard at `index.html`.

## Supabase SQL

Run the complete script in `supabase_schema.sql` inside the Supabase SQL Editor.

## Frontend Supabase Auth configuration

Update `supabase-config.js` with your Supabase project URL and anon key:

```js
window.SMART_HYDRO_SUPABASE = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-supabase-anon-key",
};
```

The hardcoded admin override works even before Supabase Auth is configured.

## Sensor simulator

Create/update `.env` with your Supabase credentials:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key
```

Install the Python dependencies:

```bash
python3 -m pip install supabase python-dotenv
```

Run the ESP32-style simulator:

```bash
python3 simulator.py
```

The simulator inserts a new row into `sensor_readings` every 5 seconds. If Supabase is configured
in `supabase-config.js`, the protected dashboard polls the latest reading automatically.
