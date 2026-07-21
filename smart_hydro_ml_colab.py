# Smart Hydro - Google Colab ML Notebook
# Paste each "# CELL X" block into its own Colab cell, top to bottom.
# This matches the dashboard AI logic: normal / warning / anomaly.

# ============================================================
# CELL 1 — Install libraries
# ============================================================
# !pip install scikit-learn pandas numpy matplotlib seaborn -q


# ============================================================
# CELL 2 — Imports
# ============================================================
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, ConfusionMatrixDisplay

np.random.seed(42)
print("Libraries loaded.")


# ============================================================
# CELL 3 — Data collection (simulated sensor readings)
# Same sensor types as the project: pH, temperature, water level, EC
# ============================================================
def collect_sensor_dataset(n_samples=1200):
    rows = []

    for _ in range(n_samples):
        label = np.random.choice(["normal", "warning", "anomaly"], p=[0.70, 0.20, 0.10])

        if label == "normal":
            ph = np.random.uniform(5.8, 6.5)
            temperature = np.random.uniform(20.0, 28.0)
            water_level = np.random.uniform(60.0, 95.0)
            ec = np.random.uniform(1.4, 2.4)
        elif label == "warning":
            ph = np.random.choice([
                np.random.uniform(5.4, 5.79),
                np.random.uniform(6.51, 6.9),
            ])
            temperature = np.random.choice([
                np.random.uniform(18.0, 19.9),
                np.random.uniform(28.1, 31.0),
            ])
            water_level = np.random.uniform(40.0, 59.0)
            ec = np.random.uniform(1.0, 1.39)
        else:  # anomaly
            ph = np.random.choice([
                np.random.uniform(4.8, 5.39),
                np.random.uniform(6.91, 7.4),
            ])
            temperature = np.random.choice([
                np.random.uniform(15.0, 17.9),
                np.random.uniform(31.1, 34.0),
            ])
            water_level = np.random.uniform(8.0, 39.0)
            ec = np.random.uniform(0.5, 0.99)

        rows.append({
            "ph": round(ph, 2),
            "temperature": round(temperature, 2),
            "water_level": round(water_level, 2),
            "ec": round(ec, 2),
            "label": label,
        })

    return pd.DataFrame(rows)


df = collect_sensor_dataset(1200)
print("Dataset shape:", df.shape)
print("\nLabel counts:")
print(df["label"].value_counts())
df.head()


# ============================================================
# CELL 4 — Explore the data
# ============================================================
print(df.describe())

plt.figure(figsize=(10, 4))
sns.countplot(data=df, x="label", order=["normal", "warning", "anomaly"], palette="Set2")
plt.title("Class distribution")
plt.show()

features = ["ph", "temperature", "water_level", "ec"]
df[features].hist(bins=20, figsize=(10, 8))
plt.suptitle("Sensor feature distributions")
plt.show()


# ============================================================
# CELL 5 — Optional: label using project rules (same as website)
# Use this if you collected raw readings without labels
# ============================================================
def classify_metric(metric, value):
    if metric == "ph":
        if 5.8 <= value <= 6.5:
            return "healthy"
        if 5.4 <= value <= 6.9:
            return "warning"
        return "critical"
    if metric == "water":
        if value >= 60:
            return "healthy"
        if value >= 40:
            return "warning"
        return "critical"
    if metric == "temperature":
        if 20 <= value <= 28:
            return "healthy"
        if 18 <= value <= 31:
            return "warning"
        return "critical"
    if metric == "ec":
        if 1.4 <= value <= 2.4:
            return "healthy"
        if 1.0 <= value <= 2.8:
            return "warning"
        return "critical"
    return "healthy"


def anomaly_score(row):
    ph_dev = abs(row["ph"] - 6.2) / 1.5
    water_dev = (70 - row["water_level"]) / 70 if row["water_level"] < 70 else 0
    temp_dev = abs(row["temperature"] - 24.5) / 10
    ec = row["ec"]
    ec_dev = (1.8 - ec) / 1.8 if ec < 1.8 else max(0, ec - 2.2) / 2.2
    return np.clip((ph_dev + water_dev + temp_dev + ec_dev) / 4, 0.03, 0.98)


def label_from_rules(row):
    levels = [
        classify_metric("ph", row["ph"]),
        classify_metric("water", row["water_level"]),
        classify_metric("temperature", row["temperature"]),
        classify_metric("ec", row["ec"]),
    ]
    score = anomaly_score(row)

    if "critical" in levels or score >= 0.72:
        return "anomaly"
    if "warning" in levels or score >= 0.38:
        return "warning"
    return "normal"


# Example on unlabeled raw data:
# raw_df["label"] = raw_df.apply(label_from_rules, axis=1)


# ============================================================
# CELL 6 — Prepare training data
# ============================================================
X = df[["ph", "temperature", "water_level", "ec"]]
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))


# ============================================================
# CELL 7 — Train the model
# ============================================================
model = RandomForestClassifier(
    n_estimators=150,
    random_state=42,
    class_weight="balanced",
)

model.fit(X_train, y_train)
print("Training complete.")


# ============================================================
# CELL 8 — Test the model
# ============================================================
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"Test Accuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["normal", "warning", "anomaly"]))

cm = confusion_matrix(y_test, y_pred, labels=["normal", "warning", "anomaly"])
ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["normal", "warning", "anomaly"]).plot(cmap="Blues")
plt.title("Confusion Matrix")
plt.show()


# ============================================================
# CELL 9 — Sample predictions (like Detect Anomaly on the website)
# ============================================================
test_samples = pd.DataFrame([
    {"ph": 6.2, "temperature": 23.5, "water_level": 78.0, "ec": 1.8},   # healthy
    {"ph": 5.5, "temperature": 30.0, "water_level": 45.0, "ec": 1.1},  # warning
    {"ph": 7.2, "temperature": 33.0, "water_level": 20.0, "ec": 0.7},   # anomaly
])

predictions = model.predict(test_samples)
probabilities = model.predict_proba(test_samples)

print("Sample predictions:\n")
for i, row in test_samples.iterrows():
    probs = dict(zip(model.classes_, probabilities[i]))
    print(f"Sample {i + 1}: {row.to_dict()}")
    print(f"  -> Prediction: {predictions[i]}")
    print(f"  -> Probabilities: {probs}\n")


# ============================================================
# CELL 10 — Feature importance
# ============================================================
importance = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False)
print("Feature importance:")
print(importance)

importance.plot(kind="bar", color="#2e8b57")
plt.title("Which sensor matters most for anomaly detection")
plt.ylabel("Importance")
plt.show()


# ============================================================
# CELL 11 — Optional: save the trained model
# ============================================================
# import joblib
# joblib.dump(model, "smart_hydro_anomaly_model.pkl")
# print("Model saved as smart_hydro_anomaly_model.pkl")


# ============================================================
# CELL 12 — SUPABASE STEP: Install Supabase client (Colab only)
# Run this after Cells 1–2. Replace simulated Cell 3 with Cells 13–18.
# ============================================================
# !pip install supabase -q


# ============================================================
# CELL 13 — SUPABASE STEP: Connect to your project
# Get these from Supabase: Project Settings > API
#   - Project URL  (example: https://abcd1234.supabase.co)
#   - anon public key
# Do NOT paste the dashboard URL and do NOT add /rest/v1
# ============================================================
# from supabase import create_client
#
# SUPABASE_URL = "https://your-project-ref.supabase.co"
# SUPABASE_ANON_KEY = "your-supabase-anon-key"
#
# supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
# print("Connected to Supabase.")


# ============================================================
# CELL 14 — SUPABASE STEP: Download sensor_readings from database
# Table columns in this project: ph, temperature, water_level, user_email
# Note: EC is not stored in Supabase yet, so we estimate it in the next cell.
# ============================================================
# def fetch_all_sensor_readings(client, page_size=1000):
#     rows = []
#     offset = 0
#
#     while True:
#         response = (
#             client.table("sensor_readings")
#             .select("created_at, ph, temperature, water_level, user_email")
#             .order("created_at", desc=False)
#             .range(offset, offset + page_size - 1)
#             .execute()
#         )
#
#         batch = response.data or []
#         if not batch:
#             break
#
#         rows.extend(batch)
#         offset += len(batch)
#
#         if len(batch) < page_size:
#             break
#
#     return rows
#
#
# raw_rows = fetch_all_sensor_readings(supabase)
# raw_df = pd.DataFrame(raw_rows)
# print("Supabase rows downloaded:", len(raw_df))
# raw_df.head()


# ============================================================
# CELL 15 — SUPABASE STEP: Estimate EC + label rows (same rules as website)
# ============================================================
# def estimate_ec(ph, water_level):
#     ec = 1.8 - (6.2 - ph) * 0.25 - max(0, 70 - water_level) * 0.008
#     return float(np.clip(ec, 0.9, 2.5))
#
#
# if raw_df.empty:
#     raise ValueError("No sensor_readings found in Supabase. Run seed_database.py first.")
#
# supabase_df = raw_df.copy()
# supabase_df["ec"] = supabase_df.apply(
#     lambda row: estimate_ec(row["ph"], row["water_level"]),
#     axis=1,
# )
# supabase_df["label"] = supabase_df.apply(label_from_rules, axis=1)
#
# df = supabase_df[["ph", "temperature", "water_level", "ec", "label", "created_at", "user_email"]]
# print("Labeled Supabase dataset shape:", df.shape)
# print(df["label"].value_counts())
# df.head()


# ============================================================
# CELL 16 — SUPABASE STEP: Explore real project data
# ============================================================
# print(df.describe())
#
# plt.figure(figsize=(10, 4))
# sns.countplot(data=df, x="label", order=["normal", "warning", "anomaly"], palette="Set2")
# plt.title("Supabase label distribution")
# plt.show()
#
# df[["ph", "temperature", "water_level", "ec"]].hist(bins=20, figsize=(10, 8))
# plt.suptitle("Supabase sensor feature distributions")
# plt.show()


# ============================================================
# CELL 17 — SUPABASE STEP: Train + test on Supabase data
# Reuses Cells 6–10 logic, but run AFTER Cell 15 replaces df.
# If stratify fails (only one label class), remove stratify=y below.
# ============================================================
# X = df[["ph", "temperature", "water_level", "ec"]]
# y = df["label"]
#
# try:
#     X_train, X_test, y_train, y_test = train_test_split(
#         X, y, test_size=0.25, random_state=42, stratify=y
#     )
# except ValueError:
#     print("Warning: not enough classes for stratified split. Using random split.")
#     X_train, X_test, y_train, y_test = train_test_split(
#         X, y, test_size=0.25, random_state=42
#     )
#
# model = RandomForestClassifier(n_estimators=150, random_state=42, class_weight="balanced")
# model.fit(X_train, y_train)
#
# y_pred = model.predict(X_test)
# print(f"Supabase Test Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
# print(classification_report(y_test, y_pred))


# ============================================================
# CELL 18 — SUPABASE STEP: Export Supabase training proof (CSV)
# ============================================================
# proof_path = "supabase_ml_training_dataset.csv"
# df.to_csv(proof_path, index=False)
# print(f"Saved proof file: {proof_path}")
# from google.colab import files
# files.download(proof_path)
