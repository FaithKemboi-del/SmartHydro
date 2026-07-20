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
        supabase.from_("app_users").upsert(user, on_conflict="email").execute()
        print(f"Upserted user: {user['name']} ({user['email']})")


def assign_readings_to_users(supabase):
    emails = [user["email"] for user in DEFAULT_USERS]
    response = (
        supabase.table("sensor_readings")
        .select("id")
        .order("created_at", desc=False)
        .execute()
    )
    rows = response.data or []

    if not rows:
        print("No sensor readings found to assign.")
        return

    for index, row in enumerate(rows):
        owner = emails[index % len(emails)]
        supabase.table("sensor_readings").update({"user_email": owner}).eq("id", row["id"]).execute()

    print(f"Assigned {len(rows)} sensor readings across {len(emails)} users.")


def main():
    load_dotenv()
    supabase = create_supabase_client()
    upsert_users(supabase)
    assign_readings_to_users(supabase)
    print("User seeding complete.")


if __name__ == "__main__":
    main()
