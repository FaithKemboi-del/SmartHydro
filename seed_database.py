"""
Seed Faith and Paul sensor readings from each account's join date,
one reading every 5 minutes up to now.

Faith joined: 2026-06-03
Paul joined:  2026-06-28

This creates thousands of rows (not just 100), matching the project's
5-minute monitoring interval.
"""

import os
import random
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from postgrest.exceptions import APIError

from simulator import create_supabase_client, drift


BATCH_SIZE = 200
INTERVAL_MINUTES = int(os.getenv("SEED_INTERVAL_MINUTES", "5"))

USERS = [
    {
        "email": "faithkemboi21@gmail.com",
        "name": "Faith",
        "joined_at": datetime(2026, 6, 3, 9, 15, tzinfo=timezone.utc),
    },
    {
        "email": "paulkevinkariuki@gmail.com",
        "name": "Paul",
        "joined_at": datetime(2026, 6, 28, 14, 40, tzinfo=timezone.utc),
    },
]


def build_rows_for_user(email, joined_at, end_at, interval_minutes):
    ph = random.uniform(5.8, 6.2)
    temperature = random.uniform(20.0, 22.5)
    water_level = random.uniform(82.0, 96.0)
    rows = []
    stamp = joined_at

    while stamp <= end_at:
        ph = drift(ph, 5.5, 6.5, 0.05)
        temperature = drift(temperature, 19.0, 24.0, 0.2)
        water_level = max(8.0, water_level - random.uniform(0.02, 0.12))

        if water_level <= 12.0:
            water_level = random.uniform(88.0, 96.0)

        rows.append(
            {
                "ph": round(ph, 2),
                "temperature": round(temperature, 2),
                "water_level": round(water_level, 2),
                "user_email": email,
                "created_at": stamp.isoformat(),
            }
        )
        stamp += timedelta(minutes=interval_minutes)

    return rows


def clear_user_readings(supabase, email):
    def action():
        return supabase.table("sensor_readings").delete().eq("user_email", email).execute()

    try:
        action()
    except APIError as error:
        message = str(error)
        if "row-level security" in message or "42501" in message:
            raise SystemExit(
                "\nSupabase blocked deletes because RLS is still enabled on sensor_readings.\n"
                "Run fix_rls.sql in the Supabase SQL Editor, then try again.\n"
            ) from error
        raise


def insert_rows(supabase, rows):
    inserted = 0
    total = len(rows)

    for start in range(0, total, BATCH_SIZE):
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
        print(f"  Inserted {inserted}/{total}...")

    return inserted


def main():
    load_dotenv()
    interval_minutes = INTERVAL_MINUTES
    end_at = datetime.now(timezone.utc)
    replace_existing = os.getenv("SEED_REPLACE", "1") != "0"

    supabase = create_supabase_client()
    all_rows = []

    print(
        f"Building readings every {interval_minutes} minutes "
        f"from each user's join date through {end_at.isoformat()}."
    )

    for user in USERS:
        if replace_existing:
            print(f"Clearing old readings for {user['name']}...")
            clear_user_readings(supabase, user["email"])

        user_rows = build_rows_for_user(
            user["email"],
            user["joined_at"],
            end_at,
            interval_minutes,
        )
        print(
            f"{user['name']}: {len(user_rows)} readings "
            f"from {user['joined_at'].date()} (every {interval_minutes} min)"
        )
        all_rows.extend(user_rows)

    print(f"Inserting {len(all_rows)} total readings...")
    inserted = insert_rows(supabase, all_rows)

    faith_count = sum(1 for row in all_rows if row["user_email"] == USERS[0]["email"])
    paul_count = inserted - faith_count

    print(f"Done. Inserted {inserted} sensor readings.")
    print(f"  Faith: {faith_count} records")
    print(f"  Paul: {paul_count} records")
    print("Refresh the admin panel to see the updated Faith / Paul record counts.")


if __name__ == "__main__":
    main()
