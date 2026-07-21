"""
Generate the Smart Hydro ML training dataset (CSV + PDF proof).
Uses the same logic and random seed as smart_hydro_ml_colab.py.
"""

from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from fpdf import FPDF


OUTPUT_DIR = Path(__file__).resolve().parent
CSV_PATH = OUTPUT_DIR / "ml_training_dataset.csv"
PDF_PATH = OUTPUT_DIR / "ml_training_dataset.pdf"
RANDOM_SEED = 42
SAMPLE_COUNT = 1200


def collect_sensor_dataset(n_samples=SAMPLE_COUNT):
    np.random.seed(RANDOM_SEED)
    rows = []

    for index in range(n_samples):
        label = np.random.choice(["normal", "warning", "anomaly"], p=[0.70, 0.20, 0.10])

        if label == "normal":
            ph = np.random.uniform(5.8, 6.5)
            temperature = np.random.uniform(20.0, 28.0)
            water_level = np.random.uniform(60.0, 95.0)
            ec = np.random.uniform(1.4, 2.4)
        elif label == "warning":
            ph = np.random.choice(
                [np.random.uniform(5.4, 5.79), np.random.uniform(6.51, 6.9)]
            )
            temperature = np.random.choice(
                [np.random.uniform(18.0, 19.9), np.random.uniform(28.1, 31.0)]
            )
            water_level = np.random.uniform(40.0, 59.0)
            ec = np.random.uniform(1.0, 1.39)
        else:
            ph = np.random.choice(
                [np.random.uniform(4.8, 5.39), np.random.uniform(6.91, 7.4)]
            )
            temperature = np.random.choice(
                [np.random.uniform(15.0, 17.9), np.random.uniform(31.1, 34.0)]
            )
            water_level = np.random.uniform(8.0, 39.0)
            ec = np.random.uniform(0.5, 0.99)

        rows.append(
            {
                "record_id": index + 1,
                "ph": round(ph, 2),
                "temperature_c": round(temperature, 2),
                "water_level_percent": round(water_level, 2),
                "ec_nutrient": round(ec, 2),
                "label": label,
            }
        )

    return pd.DataFrame(rows)


def write_csv(df):
    df.to_csv(CSV_PATH, index=False)
    print(f"CSV saved: {CSV_PATH}")


class TrainingDatasetPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 8, "Smart Hydro - ML Training Dataset", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")


def write_pdf(df):
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    label_counts = df["label"].value_counts().reindex(["normal", "warning", "anomaly"]).fillna(0).astype(int)

    pdf = TrainingDatasetPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.set_margins(14, 14, 14)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Smart Hydroponics ML Training Dataset", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 11)
    summary_lines = [
        "Project: Smart Hydroponics Monitoring and Anomaly Detection System",
        f"Generated: {generated_at}",
        f"Random seed: {RANDOM_SEED}",
        f"Total records: {len(df)}",
        "Features: pH, temperature (C), water level (%), EC / nutrient level",
        "Target label: normal, warning, anomaly",
        "Purpose: Training data proof for Google Colab Random Forest model",
        "",
        "Label distribution:",
        f"  normal  : {label_counts['normal']}",
        f"  warning : {label_counts['warning']}",
        f"  anomaly : {label_counts['anomaly']}",
        "",
        "Train/test split used in Colab: 75% training (900), 25% testing (300)",
        "Model: RandomForestClassifier (n_estimators=150, class_weight=balanced)",
        "",
        "Note: This dataset uses hydroponic operating thresholds aligned with the",
        "Smart Hydro dashboard anomaly detection rules.",
    ]

    for line in summary_lines:
        if not line.strip():
            pdf.ln(4)
            continue
        pdf.multi_cell(pdf.epw, 6, line)

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Full training records", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    col_widths = [18, 22, 30, 34, 28, 28]
    headers = ["ID", "pH", "Temp C", "Water %", "EC", "Label"]

    def draw_table_header():
        pdf.set_font("Helvetica", "B", 9)
        for width, header in zip(col_widths, headers):
            pdf.cell(width, 7, header, border=1)
        pdf.ln()

    draw_table_header()
    pdf.set_font("Helvetica", "", 8)

    for _, row in df.iterrows():
        if pdf.get_y() > 275:
            pdf.add_page()
            draw_table_header()

        values = [
            str(int(row["record_id"])),
            f"{row['ph']:.2f}",
            f"{row['temperature_c']:.2f}",
            f"{row['water_level_percent']:.2f}",
            f"{row['ec_nutrient']:.2f}",
            str(row["label"]),
        ]

        for width, value in zip(col_widths, values):
            pdf.cell(width, 6, value, border=1)
        pdf.ln()

    pdf.output(PDF_PATH)
    print(f"PDF saved: {PDF_PATH}")


def main():
    df = collect_sensor_dataset()
    write_csv(df)
    write_pdf(df)
    print("\nDataset preview:")
    print(df.head())
    print("\nLabel counts:")
    print(df["label"].value_counts())


if __name__ == "__main__":
    main()
