import pandas as pd
import json


# ── 1. Load & filter to Philadelphia (FIPS 42101) ──────────────────────────
print("Loading BDC data...")
bdc = pd.read_csv("data/bdc_pa_fixed.csv", dtype=str, low_memory=False)
bdc = bdc[bdc["block_geoid"].str.startswith("42101", na=False)]
print(f"  Filtered to {len(bdc):,} Philly rows")


# Cast numeric columns
for col in ["max_advertised_download_speed", "max_advertised_upload_speed",
            "low_latency", "technology"]:
    bdc[col] = pd.to_numeric(bdc[col], errors="coerce")


# ── 2. Aggregate per hex ───────────────────────────────────────────────────
print("Aggregating by hex...")
agg = bdc.groupby("h3_res8_id").agg(
    avg_dl_speed   = ("max_advertised_download_speed", "mean"),
    avg_ul_speed   = ("max_advertised_upload_speed",   "mean"),
    fiber_flag     = ("technology", lambda x: int((x == 50).any())),
    location_count = ("location_id", "count"),
    low_latency    = ("low_latency", "mean"),
).reset_index().round(2)


print(f"  Total hexes: {len(agg)}")


# ── 3. Write output ────────────────────────────────────────────────────────
output = agg.to_dict(orient="records")
with open("data/philly_hexes.json", "w") as f:
    json.dump(output, f, indent=2)


print("✅  Written → data/philly_hexes.json")
print(f"    Sample: {output[0]}")