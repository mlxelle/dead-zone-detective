import requests
import pandas as pd
import json

# ── CONFIG ────────────────────────────────────────────────────────────────
CENSUS_API_KEY = "f8ad90e9c59ac0fb9ecd3ea0889f7d069fa70171"   # paste your key from api.census.gov
STATE_FIPS     = "42"              # Pennsylvania
COUNTY_FIPS    = "101"             # Philadelphia County

# ── 1. Fetch ACS 5-Year estimates ─────────────────────────────────────────
# B19013_001E = median household income
# B28002_013E = households with no internet access
print("Fetching ACS data from Census API...")

url = (
    f"https://api.census.gov/data/2023/acs/acs5"
    f"?get=B19013_001E,B28002_013E,NAME"
    f"&for=tract:*"
    f"&in=state:{STATE_FIPS}%20county:{COUNTY_FIPS}"
    f"&key={CENSUS_API_KEY}"
)

response = requests.get(url)
response.raise_for_status()
data = response.json()

# ── 2. Parse into DataFrame ───────────────────────────────────────────────
headers = data[0]
rows    = data[1:]
df = pd.DataFrame(rows, columns=headers)

df = df.rename(columns={
    "B19013_001E": "median_income",
    "B28002_013E": "no_internet_count",
    "NAME":        "tract_name"
})

# Cast numerics
df["median_income"]    = pd.to_numeric(df["median_income"],    errors="coerce")
df["no_internet_count"]= pd.to_numeric(df["no_internet_count"],errors="coerce")

# ── 3. Build the join key ─────────────────────────────────────────────────
# block_geoid[0:11] = state(2) + county(3) + tract(6) = census tract GEOID
# We replicate that here as: state + county + tract (no separator)
df["block_geoid_11"] = df["state"] + df["county"] + df["tract"]

print(f"  Fetched {len(df)} census tracts for Philadelphia")
print(df[["block_geoid_11", "median_income", "no_internet_count"]].head())

# ── 4. Write output ───────────────────────────────────────────────────────
output = df[["block_geoid_11", "tract_name",
             "median_income", "no_internet_count",
             "state", "county", "tract"]].to_dict(orient="records")

with open("data/acs_philly.json", "w") as f:
    json.dump(output, f, indent=2)

print("✅  Written → data/acs_philly.json")
print(f"    Sample: {output[0]}")