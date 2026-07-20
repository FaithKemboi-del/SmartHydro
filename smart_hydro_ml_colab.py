# Smart Hydro - Google Colab ML Training and Testing
# Paste each section into Colab cells, or run as one script.

# !pip install scikit-learn pandas numpy matplotlib seaborn -q

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, ConfusionMatrixDisplay

np.random.seed(42)

def make_hydroponic_dataset(n_samples=1200):
    rows = []
    for _ in range(n_samples):
        label = np.random.choice(["normal", "warning", "anomaly"], p=[0.70, 0.20, 0.10])
        if label == "normal":
            ph = np.random.uniform(5.8, 6.5)
            temperature = np.random.uniform(20, 28)
            water_level = np.random.uniform(60, 95)
            ec = np.random.uniform(1.4, 2.4)
        elif label == "warning":
            ph = np.random.choice([np.random.uniform(5.4, 5.79), np.random.uniform(6.51, 6.9)])
            temperature = np.random.choice([np.random.uniform(18, 19.9), np.random.uniform(28.1, 31)])
            water_level = np.random.uniform(40, 59)
            ec = np.random.uniform(1.0, 1.39)
        else:
            ph = np.random.choice([np.random.uniform(4.8, 5.39), np.random.uniform(6.91, 7.4)])
            temperature = np.random.choice([np.random.uniform(15, 17.9), np.random.uniform(31.1, 34)])
            water_level = np.random.uniform(8, 39)
            ec = np.random.uniform(0.5, 0.99)
        rows.append({
            "ph": round(ph, 2),
            "temperature": round(temperature, 2),
            "water_level": round(water_level, 2),
            "ec": round(ec, 2),
            "label": label,
        })
    return pd.DataFrame(rows)

# 1) Load data
df = make_hydroponic_dataset(1200)
print("Dataset shape:", df.shape)
print(df["label"].value_counts())

# 2) Train/test split
X = df[["ph", "temperature", "water_level", "ec"]]
y = df["label"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

# 3) Train
model = RandomForestClassifier(n_estimators=150, random_state=42, class_weight="balanced")
model.fit(X_train, y_train)
print("Training complete.")

# 4) Test
y_pred = model.predict(X_test)
print(f"Test Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
print(classification_report(y_test, y_pred))

cm = confusion_matrix(y_test, y_pred, labels=["normal", "warning", "anomaly"])
ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["normal", "warning", "anomaly"]).plot(cmap="Blues")
plt.title("Confusion Matrix")
plt.show()

# 5) Sample predictions
samples = pd.DataFrame([
    {"ph": 6.2, "temperature": 23.5, "water_level": 78.0, "ec": 1.8},
    {"ph": 5.5, "temperature": 30.0, "water_level": 45.0, "ec": 1.1},
    {"ph": 7.2, "temperature": 33.0, "water_level": 20.0, "ec": 0.7},
])
preds = model.predict(samples)
for i, row in samples.iterrows():
    print(f"Sample {i+1}: {row.to_dict()} -> {preds[i]}")
