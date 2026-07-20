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
Email: fyugalbox21@gmail.com
Password: chep2005..
```

This stores an admin session in LocalStorage and redirects to `dashboard.html`, which then opens
the protected dashboard at `index.html`.

## Admin panel

After signing in as the admin user, open:

```text
http://localhost:8000/admin.html
```

Or use the **Admin Panel** link in the monitoring dashboard navigation.

The admin panel includes:

- Active and inactive user management
- Full sensor database records view
- Alert history logs
- System settings to enable/disable monitoring and sensors

Run the latest `supabase_schema.sql` in the Supabase SQL Editor so `app_users`, `alert_logs`, and `system_settings` tables exist.

Seed the three project users and assign sensor records to each user:

```bash
python3 seed_users.py
```

Default users:

- Admin — `fyugalbox21@gmail.com`
- Faith — `faithkemboi21@gmail.com`
- Paul — `paulkevinkariuki@gmail.com`

Admin login now opens the admin panel directly at `admin.html`.

## Supabase SQL

Run the complete script in `supabase_schema.sql` inside the Supabase SQL Editor.

## Frontend Supabase Auth configuration

Copy the example file and add your Supabase project URL and anon key:

```bash
copy supabase-config.example.js supabase-config.js
```

On macOS/Linux:

```bash
cp supabase-config.example.js supabase-config.js
```

Then edit `supabase-config.js`:

```js
window.SMART_HYDRO_SUPABASE = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-supabase-anon-key",
};
```

`supabase-config.js` is ignored by git so your keys stay on your machine and pulls do not overwrite them.

The hardcoded admin override works even before Supabase Auth is configured.

## Sensor simulator

Create/update `.env` with your Supabase credentials:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key
```

`SUPABASE_URL` must be only the Project URL from Supabase Project Settings > API. Do not paste
the dashboard URL and do not include `/rest/v1`.

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

### Seed 60+ database readings (for ML / professor review)

The dashboard does not create database rows by itself. To load more than 60 inputs quickly, run:

```bash
python3 seed_database.py
```

This inserts 100 historical sensor rows by default (one every 5 seconds going backward in time).
To choose a different count:

```bash
set SEED_ROW_COUNT=120
python seed_database.py
```

On macOS/Linux, use `export SEED_ROW_COUNT=120` instead of `set`.

You can confirm the count in Supabase: **Table Editor** > `sensor_readings`.
