from flask import Flask, jsonify, make_response, request
from flask_cors import CORS
import pandas as pd
import h3
import requests
import json
import csv
import io
import joblib

app = Flask(__name__)
CORS(app)

# ── Load data ──────────────────────────────────────────────────────────────
with open("data/philly_hexes_final.json") as f:
    HEX_DATA = json.load(f)

HEX_LOOKUP = {row["h3_res8_id"]: row for row in HEX_DATA}

# Load trained RandomForest model
try:
    MODEL = joblib.load("model.pkl")
    print("✅ model.pkl loaded")
except FileNotFoundError:
    MODEL = None
    print("⚠️  model.pkl not found — /predict will use rule-based scores")


# ── Helpers ────────────────────────────────────────────────────────────────
def h3_to_geojson(h3_index, properties):
    boundary = h3.cell_to_boundary(h3_index)
    ring = [[lng, lat] for lat, lng in boundary]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {"type": "Polygon", "coordinates": [ring]}
    }


def get_live_weather():
    """Fetch TODAY's Philadelphia forecast from Open-Meteo — no key needed."""
    try:
        r = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": 39.9526,
                "longitude": -75.1652,
                "daily": "precipitation_sum,windspeed_10m_max",
                "forecast_days": 1,
                "timezone": "America/New_York"
            },
            timeout=5
        )
        if r.status_code == 200:
            d = r.json().get("daily", {})
            return (
                d.get("precipitation_sum", [0])[0] or 0,
                d.get("windspeed_10m_max", [0])[0] or 0
            )
    except Exception as e:
        print("Live weather fetch failed:", e)
    return 0.0, 0.0


# ── Routes ─────────────────────────────────────────────────────────────────
@app.route("/hexes")
def get_hexes():
    """Return all Philadelphia H3 hexes as a GeoJSON FeatureCollection."""
    features = []
    for row in HEX_DATA:
        h3_index = row["h3_res8_id"]
        feature = h3_to_geojson(h3_index, row)
        features.append(feature)
    return jsonify({"type": "FeatureCollection", "features": features})


@app.route("/hex/<h3_id>")
def get_hex_by_id(h3_id):
    """Return a single hex by H3 ID with full feature breakdown."""
    h3_id = str(h3_id).strip()
    row = HEX_LOOKUP.get(h3_id)
    if not row:
        return jsonify({
            "error": "Hex not found",
            "requested": h3_id
        }), 404
    feature = h3_to_geojson(h3_id, row)
    return jsonify(feature)


@app.route("/predict")
def predict():
    """
    Re-score all hexes with a weather multiplier applied.
    ?weather=live   → fetches real Philadelphia forecast from Open-Meteo
    ?weather=rain   → simulates heavy storm (25mm rain, 45 kph wind)
    ?weather=clear  → clear day baseline (no multiplier)
    """
    mode = request.args.get("weather", "live")

    if mode == "live":
        precip, wind = get_live_weather()
    elif mode == "rain":
        precip, wind = 25.0, 45.0
    else:
        precip, wind = 0.0, 5.0

    # Weather multiplier: heavy rain + high wind = up to +25% risk boost
    weather_mult = 1.0 + min(0.25, (precip / 100) + (wind / 400))

    rescored = []
    for row in HEX_DATA:
        updated = dict(row)

        if MODEL is not None:
            features = [[
                row.get("asymmetry", 1.0),
                row.get("cable_only", 0),
                row.get("density_norm", 0.0),
                row.get("latency_risk", 0.0)
            ]]
            base_score = float(MODEL.predict(features)[0])
        else:
            base_score = row.get("risk_score", 0)

        updated["risk_score"] = min(100, round(base_score * weather_mult, 1))
        updated["weather_mode"] = mode
        updated["precip_mm"] = precip
        updated["wind_kph"] = wind
        rescored.append(updated)

    features_geojson = [
        h3_to_geojson(r["h3_res8_id"], r) for r in rescored
    ]

    return jsonify({
        "type": "FeatureCollection",
        "features": features_geojson,
        "weather_mode": mode,
        "precip_mm": precip,
        "wind_kph": wind,
        "multiplier": round(weather_mult, 3)
    })


@app.route("/export")
def export_csv():
    """Return top-20 highest risk hexes as a downloadable CSV for field ops."""
    top20 = sorted(HEX_DATA, key=lambda x: x.get("risk_score", 0), reverse=True)[:20]

    output = io.StringIO()
    fieldnames = [
        "h3_res8_id", "risk_score", "avg_dl_speed", "avg_ul_speed",
        "fiber_flag", "location_count", "dl_gap_pct", "ul_gap_pct",
        "cable_only", "equity_flag"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in top20:
        writer.writerow({k: row.get(k, "") for k in fieldnames})

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=netpulse_top20_risk.csv"
    response.headers["Content-Type"] = "text/csv"
    return response


@app.route("/summaries")
def summaries():
    """Return top-10 hex summaries with Claude-generated field ops actions."""
    try:
        with open("data/top10_summaries.json") as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({
            "error": "Summaries not generated yet — run generate_summaries.py first"
        }), 404


if __name__ == "__main__":
    app.run(debug=True, port=5000)