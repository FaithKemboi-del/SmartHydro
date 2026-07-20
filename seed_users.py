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
    emails = [user["email"] for user in DEFAULT_USERS]
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

    for index, row in enumerate(rows):
        owner = emails[index % len(emails)]
        supabase.table("sensor_readings").update({"user_email": owner}).eq("id", row["id"]).execute()

    print(f"Assigned {len(rows)} sensor readings across {len(emails)} users.")

    total = len(rows)
    base = total // len(emails)
    remainder = total % len(emails)

    for index, user in enumerate(DEFAULT_USERS):
        assigned = base + (1 if index < remainder else 0)
        print(f"  {user['name']}: {assigned} records")


def main():
    load_dotenv()
    supabase = create_supabase_client()
    upsert_users(supabase)
    assign_readings_to_users(supabase)
    print("User seeding complete.")


if __name__ == "__main__":
    main()
