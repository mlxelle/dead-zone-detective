import json
import urllib.request

ACS_URL = (
    "https://api.census.gov/data/2022/acs/acs5"
    "?get=NAME,B19013_001E,B28002_013E"
    "&for=tract:*"
    "&in=state:42&in=county:101"
)

def fetch_acs():
    with urllib.request.urlopen(ACS_URL) as resp:
        data = json.loads(resp.read().decode())

    header = data[0]
    rows = data[1:]

    result = {}
    for row in rows:
        rec = dict(zip(header, row))
        geoid = rec["state"] + rec["county"] + rec["tract"]
        result[geoid] = {
            "name": rec["NAME"],
            "median_household_income": rec["B19013_001E"],
            "households_no_internet": rec["B28002_013E"],
        }

    out_path = "backend/acs_philly.json"
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Saved {len(result)} tracts to {out_path}\n")
    print("First 3 rows:")
    for i, (geoid, info) in enumerate(result.items()):
        if i >= 3:
            break
        print(f"  {geoid}: {info}")

if __name__ == "__main__":
    fetch_acs()
