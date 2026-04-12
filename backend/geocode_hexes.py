import json
import h3
import requests
import time

with open("data/top10_summaries.json") as f:
    summaries = json.load(f)

print(f"Reverse-geocoding {len(summaries)} top-risk hexes...\n")

def get_neighborhood(lat, lon):
    try:
        r = requests.get(
            "https://geocoding.geo.census.gov/geocoder/geographies/coordinates",
            params={
                "x": lon, "y": lat,
                "benchmark": "Public_AR_Current",
                "vintage": "Current_Current",
                "layers": "10",
                "format": "json"
            },
            timeout=8
        )
        if r.status_code == 200:
            geos = r.json().get("result", {}).get("geographies", {})
            places = geos.get("Incorporated Places", [])
            tracts = geos.get("Census Tracts", [])
            if places:
                return places[0].get("NAME", "Philadelphia")
            if tracts:
                return f"Tract {tracts[0].get('NAME', 'Unknown')}, Philadelphia"
    except Exception as e:
        print(f"  Geocoder error: {e}")
    return "Philadelphia"

for item in summaries:
    h3_id = item["h3_res8_id"]
    lat, lon = h3.cell_to_latlng(h3_id)
    neighborhood = get_neighborhood(lat, lon)
    item["neighborhood"] = neighborhood
    print(f"  Rank {item['rank']}: {neighborhood} — Risk {item['risk_score']}/100")
    print(f"  → {item['field_ops_summary']}\n")
    time.sleep(0.3)

with open("data/top10_summaries.json", "w") as f:
    json.dump(summaries, f, indent=2)

print("✅  Written → data/top10_summaries.json")