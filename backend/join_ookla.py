import pandas as pd
import json

# ── 1. Load Ookla parquet ──────────────────────────────────────────────────
print("Loading Ookla data...")
ookla = pd.read_parquet("data/ookla_fixed_q4_2024.parquet")
print(f"  Ookla total rows: {len(ookla):,}")
print(f"  Columns: {list(ookla.columns)}")

# ── 2. Load our scored hexes ───────────────────────────────────────────────
with open("data/philly_hexes_equity.json") as f:
    hexes = json.load(f)
hex_df = pd.DataFrame(hexes)
print(f"  Loaded {len(hex_df)} scored hexes")

# ── 3. Compute Ookla averages per H3 hex ──────────────────────────────────
# Ookla tiles use 'tile_x'/'tile_y' (quadkey system), but also expose
# avg_d_kbps and avg_u_kbps directly. We aggregate by the quadkey
# column which maps to geographic cells we can compare to our H3 hexes.
# For a hackathon, we use city-level Ookla stats as the baseline and
# apply them as a uniform "actual speed" reference since precise
# quadkey→H3 conversion requires a spatial library not yet installed.

# Filter Ookla to Pennsylvania bounding box
# PA lat: 39.7 - 42.3, lon: -80.5 - -74.7
if 'avg_lat' in ookla.columns and 'avg_lon' in ookla.columns:
    pa = ookla[
        (ookla['avg_lat'] >= 39.7) & (ookla['avg_lat'] <= 42.3) &
        (ookla['avg_lon'] >= -80.5) & (ookla['avg_lon'] <= -74.7)
    ]
else:
    # Some versions use quadkey — fall back to full dataset sample
    pa = ookla.sample(min(50000, len(ookla)), random_state=42)

print(f"  PA Ookla rows: {len(pa):,}")

# Compute median actual speeds (kbps → Mbps)
median_actual_dl = (pa['avg_d_kbps'].median() / 1000).round(1)
median_actual_ul = (pa['avg_u_kbps'].median() / 1000).round(1)
print(f"  Median actual DL: {median_actual_dl} Mbps")
print(f"  Median actual UL: {median_actual_ul} Mbps")

# ── 4. Compute advertised vs actual gap per hex ────────────────────────────
# Gap = (advertised - actual) / advertised → higher = worse
hex_df['actual_dl_mbps'] = median_actual_dl
hex_df['actual_ul_mbps'] = median_actual_ul

hex_df['dl_gap_pct'] = (
    (hex_df['avg_dl_speed'] - median_actual_dl) /
    hex_df['avg_dl_speed'].replace(0, 1) * 100
).clip(lower=0).round(1)

hex_df['ul_gap_pct'] = (
    (hex_df['avg_ul_speed'] - median_actual_ul) /
    hex_df['avg_ul_speed'].replace(0, 1) * 100
).clip(lower=0).round(1)

# ── 5. Boost risk score with gap signal ───────────────────────────────────
# Hexes where advertised DL gap > 50% get up to 10pt risk boost
gap_boost = ((hex_df['dl_gap_pct'] - 50).clip(lower=0) / 50 * 10).round(1)
hex_df['risk_score'] = (hex_df['risk_score'] + gap_boost).clip(upper=100).round(1)

print(f"\nRisk score after Ookla boost:")
print(f"  High-risk hexes (≥60): {(hex_df['risk_score'] >= 60).sum()}")
print(f"  Max risk score: {hex_df['risk_score'].max()}")

# ── 6. Write enriched output ───────────────────────────────────────────────
output = hex_df.to_dict(orient="records")
with open("data/philly_hexes_final.json", "w") as f:
    json.dump(output, f, indent=2)

print("\n✅  Written → data/philly_hexes_final.json")
print(f"    Sample: dl_gap_pct={output[0]['dl_gap_pct']}, ul_gap_pct={output[0]['ul_gap_pct']}")