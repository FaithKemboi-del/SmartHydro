import time

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

ADMIN_EMAIL = "fyugalbox21@gmail.com"
FAITH_EMAIL = "faithkemboi21@gmail.com"
PAUL_EMAIL = "paulkevinkariuki@gmail.com"
FAITH_TARGET = 340
PAUL_TARGET = 260


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
    def action():
        return supabase.table("app_users").upsert(DEFAULT_USERS, on_conflict="email").execute()

    try:
        run_with_retry(action, "Upsert users")
        for user in DEFAULT_USERS:
            print(f"Upserted user: {user['name']} ({user['email']})")
    except APIError as error:
        message = str(error)
        if "row-level security" in message or "42501" in message:
            raise SystemExit(
                "\nSupabase blocked the insert because Row Level Security is still enabled on app_users.\n"
                "Run the RLS fix SQL in Supabase SQL Editor, then try again.\n"
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

        run_with_retry(action, f"Assign chunk to {owner or 'unassigned'}")


def assign_readings_to_users(supabase):
    rows = fetch_all_reading_ids(supabase)

    if not rows:
        print("No sensor readings found to assign.")
        return

    total = len(rows)
    faith_target = min(FAITH_TARGET, total)
    paul_target = min(PAUL_TARGET, max(0, total - faith_target))
    unassigned = max(0, total - faith_target - paul_target)

    faith_ids = [row["id"] for row in rows[:faith_target]]
    paul_ids = [row["id"] for row in rows[faith_target : faith_target + paul_target]]
    leftover_ids = [row["id"] for row in rows[faith_target + paul_target :]]

    # Clear admin ownership first, then assign uneven counts.
    update_ids(supabase, [row["id"] for row in rows], None)
    update_ids(supabase, faith_ids, FAITH_EMAIL)
    update_ids(supabase, paul_ids, PAUL_EMAIL)
    update_ids(supabase, leftover_ids, None)

    assigned_total = faith_target + paul_target
    print(f"Processed {total} sensor readings.")
    print(f"  Admin ({ADMIN_EMAIL}): 0 records")
    print(f"  Faith ({FAITH_EMAIL}): {faith_target} records")
    print(f"  Paul ({PAUL_EMAIL}): {paul_target} records")
    print(f"  Unassigned: {unassigned} records")
    print(f"  Dashboard total (Faith + Paul only): {assigned_total}")


def main():
    load_dotenv()
    supabase = create_supabase_client()
    upsert_users(supabase)
    assign_readings_to_users(supabase)
    print("User seeding complete.")


if __name__ == "__main__":
    main()
