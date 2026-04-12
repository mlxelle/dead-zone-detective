import json
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib

# ── 1. Load scored hexes ───────────────────────────────────────────────────
with open("data/philly_hexes_scored.json") as f:
    hexes = json.load(f)

df = pd.DataFrame(hexes)

FEATURES = ["asymmetry", "cable_only", "density_norm", "latency_risk"]
TARGET   = "risk_score"

X = df[FEATURES]
y = df[TARGET]

# ── 2. Train/test split ────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── 3. Train RandomForestRegressor ────────────────────────────────────────
print("Training RandomForest...")
model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

# ── 4. Evaluate ────────────────────────────────────────────────────────────
preds = model.predict(X_test)
mae   = mean_absolute_error(y_test, preds)
print(f"  MAE on test set: {mae:.2f} points")

importances = dict(zip(FEATURES, model.feature_importances_.round(3)))
print(f"  Feature importances: {importances}")

# ── 5. Add model predictions back to full dataset ─────────────────────────
df["model_risk_score"] = model.predict(X).round(1)

output = df.to_dict(orient="records")
with open("data/philly_hexes_scored.json", "w") as f:
    json.dump(output, f, indent=2)

# ── 6. Serialize model ─────────────────────────────────────────────────────
joblib.dump(model, "model.pkl")
print("✅  model.pkl saved")
print("✅  philly_hexes_scored.json updated with model_risk_score")