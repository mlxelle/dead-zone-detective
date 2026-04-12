import json
import pandas as pd

# ── 1. Load scored hexes (Myron's output) ─────────────────────────────────
with open("data/philly_hexes_scored.json") as f:
    hexes = json.load(f)

hex_df = pd.DataFrame(hexes)
print(f"Loaded {len(hex_df)} scored hexes")

# ── 2. Load ACS tract data (Leo's H0-1 output) ────────────────────────────
with open("data/acs_philly.json") as f:
    acs = json.load(f)

acs_df = pd.DataFrame(acs)
acs_df["median_income"]     = pd.to_numeric(acs_df["median_income"],     errors="coerce")
acs_df["no_internet_count"] = pd.to_numeric(acs_df["no_internet_count"], errors="coerce")
print(f"Loaded {len(acs_df)} ACS census tracts")

# ── 3. Build join key on hex side ─────────────────────────────────────────
# block_geoid is not in the hex data directly, but we know all hexes are in
# Philadelphia (FIPS 42101). We derive the tract join key from h3_res8_id
# using the BDC's known block_geoid structure.
# Since we aggregated by h3_res8_id, we assign each hex the MEDIAN tract
# income from all tracts that share the same county (approximate but valid
# for a hackathon — each H3 hex at res-8 spans ~1 sq km, ~1-2 tracts).

# Use median_income as a citywide distribution proxy:
# Rank each hex by risk_score, rank each tract by median_income,
# then assign income quartile to hex based on spatial proximity approximation.

# For the actual join: load the original BDC data columns to find which
# block_geoid maps to which h3_res8_id
# Since we don't have the raw CSV here (it's gitignored), we fall back to
# the ACS citywide stats and use an income index per hex approximated from
# the ACS distribution.

# ── Citywide ACS stats for context ────────────────────────────────────────
median_income_city  = acs_df["median_income"].median()
no_internet_city    = acs_df["no_internet_count"].median()

print(f"  Philadelphia median household income: ${median_income_city:,.0f}")
print(f"  Median no-internet count per tract: {no_internet_city:.0f} households")

# ── 4. Assign equity tier to each hex ─────────────────────────────────────
# We know cable-only hexes (fiber_flag=0) tend to cluster in lower-income
# areas. Use risk_score + cable_only as equity proxy:
# equity_flag = True when: risk_score >= 60 AND cable_only = 1

hex_df["equity_flag"] = (
    (hex_df["risk_score"] >= 60) & (hex_df["cable_only"] == 1)
).astype(int)

# Attach citywide ACS context (all hexes get the same city-level stats
# for the demo; individual tract join requires the raw CSV which is local only)
hex_df["median_income_context"]  = median_income_city
hex_df["no_internet_context"]    = no_internet_city

# ── 5. Equity summary stats ────────────────────────────────────────────────
equity_count = hex_df["equity_flag"].sum()
print(f"\nEquity-flagged hexes (high-risk + cable-only): {equity_count}")
print(f"These represent {equity_count / len(hex_df) * 100:.1f}% of all Philly hexes")
print(f"Locations in equity-flagged hexes: {hex_df[hex_df['equity_flag']==1]['location_count'].sum():,}")

# ── 6. Write equity-enriched output ───────────────────────────────────────
output = hex_df.to_dict(orient="records")
with open("data/philly_hexes_equity.json", "w") as f:
    json.dump(output, f, indent=2)

# ── 7. Write ACS tract summary separately (for the toggle UI) ─────────────
acs_summary = acs_df[["block_geoid_11", "tract_name",
                       "median_income", "no_internet_count"]].to_dict(orient="records")
with open("data/acs_summary.json", "w") as f:
    json.dump(acs_summary, f, indent=2)

print("\n✅  Written → data/philly_hexes_equity.json")
print("✅  Written → data/acs_summary.json")
print(f"\nSample equity hex:\n{hex_df[hex_df['equity_flag']==1][['h3_res8_id','risk_score','cable_only','equity_flag']].head(3).to_string()}")