import os
import random
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client


READ_INTERVAL_SECONDS = 5


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def drift(value, minimum, maximum, step):
    return clamp(value + random.uniform(-step, step), minimum, maximum)


def create_supabase_client():
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")

    return create_client(supabase_url, supabase_key)


def main():
    supabase = create_supabase_client()

    ph = random.uniform(5.8, 6.2)
    temperature = random.uniform(20.0, 22.5)
    water_level = random.uniform(82.0, 96.0)

    print("Smart Hydro ESP32 simulator started. Press Ctrl+C to stop.")

    while True:
        ph = drift(ph, 5.5, 6.5, 0.04)
        temperature = drift(temperature, 19.0, 24.0, 0.18)
        water_level = clamp(water_level - random.uniform(0.08, 0.32), 8.0, 100.0)

        if water_level <= 12.0:
            water_level = random.uniform(88.0, 96.0)
            print("Reservoir refill simulated; water level restored.")

        reading = {
            "ph": round(ph, 2),
            "temperature": round(temperature, 2),
            "water_level": round(water_level, 2),
        }

        response = supabase.table("sensor_readings").insert(reading).execute()
        inserted = response.data[0] if response.data else reading

        print(
            f"{datetime.now(timezone.utc).isoformat()} | "
            f"pH={inserted['ph']} | "
            f"temperature={inserted['temperature']}C | "
            f"water_level={inserted['water_level']}%"
        )

        time.sleep(READ_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
