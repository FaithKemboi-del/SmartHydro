import os

from dotenv import load_dotenv
from postgrest.exceptions import APIError

from simulator import create_supabase_client


DEFAULT_USERS = [
    {
        "email": "fyugalbox21@gmail.com",
        "name": "Admin",
        "role": "admin",
        "status": "active",
    },
    {
        "email": "faithkemboi21@gmail.com",
        "name": "Faith",
        "role": "user",
        "status": "active",
    },
    {
        "email": "paulkevinkariuki@gmail.com",
        "name": "Paul",
        "role": "user",
        "status": "inactive",
    },
]


def upsert_users(supabase):
    for user in DEFAULT_USERS:
        try:
            supabase.from_("app_users").upsert(user, on_conflict="email").execute()
            print(f"Upserted user: {user['name']} ({user['email']})")
        except APIError as error:
            message = str(error)
            if "row-level security" in message or "42501" in message:
                raise SystemExit(
                    "\nSupabase blocked the insert because Row Level Security is still enabled on app_users.\n"
                    "Fix it in Supabase SQL Editor by running the RLS fix SQL from supabase_schema.sql,\n"
                    "or use your service_role key in .env as SUPABASE_KEY for seed_users.py.\n"
                ) from error
            raise


def assign_readings_to_users(supabase):
    rows = []
    page_size = 1000
    start = 0

    while True:
        response = (
            supabase.table("sensor_readings")
            .select("id")
            .order("created_at", desc=False)
            .range(start, start + page_size - 1)
            .execute()
        )
        batch = response.data or []

        if not batch:
            break

        rows.extend(batch)

        if len(batch) < page_size:
            break

        start += page_size

    if not rows:
        print("No sensor readings found to assign.")
        return

    admin_email = "fyugalbox21@gmail.com"
    faith_email = "faithkemboi21@gmail.com"
    paul_email = "paulkevinkariuki@gmail.com"

    total = len(rows)
    faith_target = min(340, total)
    paul_target = min(260, max(0, total - faith_target))
    unassigned = max(0, total - faith_target - paul_target)

    for index, row in enumerate(rows):
        if index < faith_target:
            owner = faith_email
        elif index < faith_target + paul_target:
            owner = paul_email
        else:
            owner = None

        supabase.table("sensor_readings").update({"user_email": owner}).eq("id", row["id"]).execute()

    print(f"Processed {total} sensor readings.")
    print("  Admin: 0 records")
    print(f"  Faith: {faith_target} records")
    print(f"  Paul: {paul_target} records")
    print(f"  Unassigned: {unassigned} records")


def main():
    load_dotenv()
    supabase = create_supabase_client()
    upsert_users(supabase)
    assign_readings_to_users(supabase)
    print("User seeding complete.")


if __name__ == "__main__":
    main()
