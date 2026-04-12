import json
import pandas as pd

# ── 1. Load philly_hexes.json ──────────────────────────────────────────────
with open("data/philly_hexes.json") as f:
    hexes = json.load(f)

df = pd.DataFrame(hexes)
print(f"Loaded {len(df)} hexes")

# ── 2. Compute 4 risk features ─────────────────────────────────────────────

# Feature 1: upload asymmetry ratio (dl/ul) — higher = worse
df["asymmetry"] = (df["avg_dl_speed"] / df["avg_ul_speed"].replace(0, 1)).round(2)

# Feature 2: cable-only penalty (no fiber = 1)
df["cable_only"] = (df["fiber_flag"] == 0).astype(int)

# Feature 3: density score — normalize location_count 0-1
df["density_norm"] = (df["location_count"] / df["location_count"].max()).round(4)

# Feature 4: low latency inverse — 0 = bad latency
df["latency_risk"] = (1 - df["low_latency"]).round(4)

# ── 3. Rule-based risk score 0–100 ────────────────────────────────────────
# Weights: asymmetry=40pts, cable_only=25pts, density=20pts, latency=15pts
df["asymmetry_score"] = (df["asymmetry"].clip(upper=50) / 50 * 40).round(2)
df["cable_score"]     = df["cable_only"] * 25
df["density_score"]   = (df["density_norm"] * 20).round(2)
df["latency_score"]   = (df["latency_risk"] * 15).round(2)

df["risk_score"] = (
    df["asymmetry_score"] +
    df["cable_score"]     +
    df["density_score"]   +
    df["latency_score"]
).clip(upper=100).round(1)

print(f"Risk score range: {df['risk_score'].min()} – {df['risk_score'].max()}")
print(f"High-risk hexes (≥60): {(df['risk_score'] >= 60).sum()}")
print(f"Sample:\n{df[['h3_res8_id','risk_score','asymmetry','cable_only']].head(3)}")

# ── 4. Write enriched hex data ─────────────────────────────────────────────
output_cols = [
    "h3_res8_id", "avg_dl_speed", "avg_ul_speed",
    "fiber_flag", "location_count", "low_latency",
    "asymmetry", "cable_only", "density_norm", "latency_risk",
    "risk_score"
]
output = df[output_cols].to_dict(orient="records")

with open("data/philly_hexes_scored.json", "w") as f:
    json.dump(output, f, indent=2)

print("✅  Written → data/philly_hexes_scored.json")