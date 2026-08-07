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
http://localhost:8000/welcome.html
```

Click **Get started** to open sign-in.

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

- Admin — `fyugalbox21@gmail.com` / `chep2005..` (use **Login as admin**)
- Faith — `faithkemboi21@gmail.com` / `chep2005..` (user dashboard)
- Paul — `paulkevinkariuki@gmail.com` (Supabase sign-up password)

Admin login now opens the admin panel directly at `admin.html`.

### If `admin.html` will not open

1. Start the server from the project folder:

```bash
python -m http.server 8000
```

2. Sign in first at `http://localhost:8000/sign-in.html`.
3. Click **Login as admin** at the bottom, then sign in with the admin email and password above.
4. Open `http://localhost:8000/admin.html`.

`admin.html` is admin-only. If you are signed in as Faith or Paul, the page redirects to the user dashboard instead of showing the admin panel.

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

### Seed sensor readings for Faith and Paul (from join date, every 5 minutes)

First disable RLS if needed:

```bash
# Run fix_rls.sql in the Supabase SQL Editor
```

Then seed:

```bash
python seed_database.py
```

This clears Faith/Paul's old readings and inserts one reading every **5 minutes** from each
user's join date until now (thousands of rows — not just 100):

- Faith — from `2026-06-03`
- Paul — from `2026-06-28`

Or paste and run `seed_faith_paul_records.sql` in the Supabase SQL Editor.

Optional:

```bash
set SEED_INTERVAL_MINUTES=5
set SEED_REPLACE=1
python seed_database.py
```

On macOS/Linux use `export SEED_INTERVAL_MINUTES=5` instead of `set`.

You can confirm the count in Supabase: **Table Editor** > `sensor_readings`.
Filter by `user_email` for Faith or Paul.
