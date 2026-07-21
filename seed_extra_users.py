"""Seed 25 extra demo users into public.app_users in Supabase."""

from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from postgrest.exceptions import APIError

from simulator import create_supabase_client


EXTRA_USERS = [
    {"email": "amani.wambui@example.com", "name": "Amani Wambui", "status": "active", "day": 4},
    {"email": "brian.otieno@example.com", "name": "Brian Otieno", "status": "active", "day": 5},
    {"email": "carol.njeri@example.com", "name": "Carol Njeri", "status": "active", "day": 6},
    {"email": "daniel.kipchoge@example.com", "name": "Daniel Kipchoge", "status": "inactive", "day": 7},
    {"email": "esther.akinyi@example.com", "name": "Esther Akinyi", "status": "active", "day": 8},
    {"email": "felix.mwangi@example.com", "name": "Felix Mwangi", "status": "active", "day": 9},
    {"email": "grace.chebet@example.com", "name": "Grace Chebet", "status": "active", "day": 10},
    {"email": "hassan.ali@example.com", "name": "Hassan Ali", "status": "inactive", "day": 11},
    {"email": "irene.muthoni@example.com", "name": "Irene Muthoni", "status": "active", "day": 12},
    {"email": "james.kamau@example.com", "name": "James Kamau", "status": "active", "day": 13},
    {"email": "karen.wanjira@example.com", "name": "Karen Wanjira", "status": "active", "day": 14},
    {"email": "leo.barasa@example.com", "name": "Leo Barasa", "status": "inactive", "day": 15},
    {"email": "mary.atieno@example.com", "name": "Mary Atieno", "status": "active", "day": 16},
    {"email": "nathan.kiplagat@example.com", "name": "Nathan Kiplagat", "status": "active", "day": 17},
    {"email": "olive.nyambura@example.com", "name": "Olive Nyambura", "status": "active", "day": 18},
    {"email": "peter.odhiambo@example.com", "name": "Peter Odhiambo", "status": "inactive", "day": 19},
    {"email": "queen.jemutai@example.com", "name": "Queen Jemutai", "status": "active", "day": 20},
    {"email": "ryan.mutua@example.com", "name": "Ryan Mutua", "status": "active", "day": 21},
    {"email": "sarah.wanjiku@example.com", "name": "Sarah Wanjiku", "status": "active", "day": 22},
    {"email": "tom.kiarie@example.com", "name": "Tom Kiarie", "status": "inactive", "day": 23},
    {"email": "uma.cherono@example.com", "name": "Uma Cherono", "status": "active", "day": 24},
    {"email": "victor.omondi@example.com", "name": "Victor Omondi", "status": "active", "day": 25},
    {"email": "winnie.njoki@example.com", "name": "Winnie Njoki", "status": "active", "day": 26},
    {"email": "xavier.korir@example.com", "name": "Xavier Korir", "status": "inactive", "day": 27},
    {"email": "yvonne.awuor@example.com", "name": "Yvonne Awuor", "status": "active", "day": 29},
]


def build_payload():
    now = datetime.now(timezone.utc)
    rows = []

    for user in EXTRA_USERS:
        created = datetime(2026, 6, user["day"], 10, 0, tzinfo=timezone.utc)
        last_seen = (
            now - timedelta(days=3)
            if user["status"] == "inactive"
            else now - timedelta(hours=user["day"] % 12 + 1)
        )
        rows.append(
            {
                "email": user["email"],
                "name": user["name"],
                "role": "user",
                "status": user["status"],
                "last_seen": last_seen.isoformat(),
                "created_at": created.isoformat(),
            }
        )

    return rows


def main():
    load_dotenv()
    supabase = create_supabase_client()
    rows = build_payload()

    try:
        response = supabase.table("app_users").upsert(rows, on_conflict="email").execute()
    except APIError as error:
        message = str(error)
        if "row-level security" in message or "42501" in message:
            raise SystemExit(
                "\nSupabase blocked the insert because RLS is enabled on app_users.\n"
                "Run supabase_schema.sql in the SQL Editor, then try again.\n"
            ) from error
        raise

    inserted = len(response.data or rows)
    print(f"Upserted {inserted} extra users into public.app_users.")
    for row in rows:
        print(f"  - {row['name']} <{row['email']}> ({row['status']})")
    print("Done. Refresh the admin Users panel to see them.")


if __name__ == "__main__":
    main()
