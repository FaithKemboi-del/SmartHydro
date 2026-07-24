import time

from dotenv import load_dotenv
from postgrest.exceptions import APIError

from simulator import create_supabase_client


from seed_extra_users import build_payload as build_extra_users


DEFAULT_USERS = [
    {
        "email": "fyugalbox21@gmail.com",
        "name": "Admin",
        "role": "admin",
        "status": "active",
        "created_at": "2026-06-01T08:00:00+00:00",
    },
    {
        "email": "faithkemboi21@gmail.com",
        "name": "Faith",
        "role": "user",
        "status": "active",
        "created_at": "2026-06-03T09:15:00+00:00",
    },
    {
        "email": "paulkevinkariuki@gmail.com",
        "name": "Paul",
        "role": "user",
        "status": "inactive",
        "created_at": "2026-06-28T14:40:00+00:00",
    },
]

ADMIN_EMAIL = "fyugalbox21@gmail.com"
FAITH_EMAIL = "faithkemboi21@gmail.com"
PAUL_EMAIL = "paulkevinkariuki@gmail.com"

# Uneven split: Faith gets ~62%, Paul gets ~38%
FAITH_SHARE = 0.62


def run_with_retry(action, description, retries=4):
    delay = 2

    for attempt in range(1, retries + 1):
        try:
            return action()
        except Exception as error:
            message = str(error)
            retryable = any(
                token in message
                for token in (
                    "RemoteProtocolError",
                    "ConnectionTerminated",
                    "ConnectionResetError",
                    "ReadTimeout",
                    "ConnectTimeout",
                    "Server disconnected",
                )
            )

            if not retryable or attempt == retries:
                raise

            print(f"{description} failed (attempt {attempt}/{retries}). Retrying in {delay}s...")
            time.sleep(delay)
            delay *= 2


def upsert_users(supabase):
    all_users = DEFAULT_USERS + build_extra_users()

    def action():
        return supabase.table("app_users").upsert(all_users, on_conflict="email").execute()

    try:
        run_with_retry(action, "Upsert users")
        print(f"Upserted {len(all_users)} users into app_users.")
        for user in all_users:
            print(f"  - {user['name']} ({user['email']})")
    except APIError as error:
        message = str(error)
        if "row-level security" in message or "42501" in message:
            raise SystemExit(
                "\nSupabase blocked the insert because Row Level Security is still enabled on app_users.\n"
                "Fix:\n"
                "1. Open Supabase → SQL Editor → New query\n"
                "2. Paste and run everything in fix_rls.sql\n"
                "3. Run this command again: python seed_users.py\n"
            ) from error
        raise


def fetch_all_reading_ids(supabase):
    rows = []
    page_size = 1000
    start = 0

    while True:

        def action(start=start):
            return (
                supabase.table("sensor_readings")
                .select("id")
                .order("created_at", desc=False)
                .range(start, start + page_size - 1)
                .execute()
            )

        response = run_with_retry(action, f"Fetch readings {start}-{start + page_size - 1}")
        batch = response.data or []

        if not batch:
            break

        rows.extend(batch)

        if len(batch) < page_size:
            break

        start += page_size

    return rows


def update_ids(supabase, ids, owner):
    chunk_size = 100

    for index in range(0, len(ids), chunk_size):
        chunk = ids[index : index + chunk_size]

        def action(chunk=chunk, owner=owner):
            return (
                supabase.table("sensor_readings")
                .update({"user_email": owner})
                .in_("id", chunk)
                .execute()
            )

        run_with_retry(action, f"Assign chunk to {owner}")


def assign_readings_to_users(supabase):
    rows = fetch_all_reading_ids(supabase)

    if not rows:
        print("No sensor readings found to assign.")
        return

    total = len(rows)
    faith_target = int(total * FAITH_SHARE)
    paul_target = total - faith_target

    faith_ids = [row["id"] for row in rows[:faith_target]]
    paul_ids = [row["id"] for row in rows[faith_target:]]

    update_ids(supabase, faith_ids, FAITH_EMAIL)
    update_ids(supabase, paul_ids, PAUL_EMAIL)

    print(f"Distributed all {total} sensor readings between Faith and Paul.")
    print(f"  Admin ({ADMIN_EMAIL}): 0 records")
    print(f"  Faith ({FAITH_EMAIL}): {faith_target} records")
    print(f"  Paul ({PAUL_EMAIL}): {paul_target} records")
    print(f"  Dashboard total (Faith + Paul): {total}")


def main():
    load_dotenv()
    supabase = create_supabase_client()
    upsert_users(supabase)
    assign_readings_to_users(supabase)
    print("User seeding complete.")


if __name__ == "__main__":
    main()
