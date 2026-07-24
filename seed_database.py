import os
import random
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from postgrest.exceptions import APIError

from simulator import create_supabase_client, drift


DEFAULT_ROW_COUNT = 100
BATCH_SIZE = 25


def build_seed_rows(count):
    ph = random.uniform(5.8, 6.2)
    temperature = random.uniform(20.0, 22.5)
    water_level = random.uniform(82.0, 96.0)
    now = datetime.now(timezone.utc)
    faith_email = "faithkemboi21@gmail.com"
    paul_email = "paulkevinkariuki@gmail.com"
    faith_target = int(count * 0.62)
    rows = []

    for index in range(count):
        ph = drift(ph, 5.5, 6.5, 0.05)
        temperature = drift(temperature, 19.0, 24.0, 0.2)
        water_level = max(8.0, water_level - random.uniform(0.05, 0.28))

        if water_level <= 12.0:
            water_level = random.uniform(88.0, 96.0)

        rows.append(
            {
                "ph": round(ph, 2),
                "temperature": round(temperature, 2),
                "water_level": round(water_level, 2),
                "user_email": faith_email if index < faith_target else paul_email,
                "created_at": (now - timedelta(seconds=(count - index) * 5)).isoformat(),
            }
        )

    return rows


def insert_rows(supabase, rows):
    inserted = 0

    for start in range(0, len(rows), BATCH_SIZE):
        batch = rows[start : start + BATCH_SIZE]
        try:
            response = supabase.table("sensor_readings").insert(batch).execute()
        except APIError as error:
            message = str(error)
            if "row-level security" in message or "42501" in message:
                raise SystemExit(
                    "\nSupabase blocked the insert because Row Level Security is still enabled "
                    "on sensor_readings.\n"
                    "Fix:\n"
                    "1. Open Supabase → SQL Editor → New query\n"
                    "2. Paste and run everything in fix_rls.sql\n"
                    "3. Run this command again: python seed_database.py\n"
                ) from error
            raise
        inserted += len(response.data or batch)

    return inserted


def main():
    load_dotenv()
    row_count = int(os.getenv("SEED_ROW_COUNT", DEFAULT_ROW_COUNT))

    if row_count < 61:
        raise SystemExit("SEED_ROW_COUNT must be at least 61 for the project dataset requirement.")

    supabase = create_supabase_client()
    rows = build_seed_rows(row_count)
    inserted = insert_rows(supabase, rows)
    faith_count = sum(1 for row in rows if row["user_email"] == "faithkemboi21@gmail.com")
    paul_count = inserted - faith_count

    print(f"Inserted {inserted} sensor readings into public.sensor_readings.")
    print(f"  Faith: {faith_count} records")
    print(f"  Paul: {paul_count} records")
    print("Open Supabase Table Editor > sensor_readings to confirm the row count.")


if __name__ == "__main__":
    main()
