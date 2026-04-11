from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import h3
import requests

app = Flask(__name__)
CORS(app)

# load data
df = pd.read_csv("data.csv")
df["h3"] = df["h3"].astype(str).str.strip()


def h3_to_geojson(h3_index, properties):
    boundary = h3.cell_to_boundary(h3_index)
    ring = [[lng, lat] for lat, lng in boundary]

    if ring[0] != ring[-1]:
        ring.append(ring[0])

    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring]
        }
    }


def fetch_weather(lat, lon):
    try:
        url = (
            "https://archive.open-meteo.com/v1/archive"
            f"?latitude={lat}"
            f"&longitude={lon}"
            "&start_date=2023-01-01"
            "&end_date=2024-12-31"
            "&daily=precipitation_sum,windspeed_10m_max,temperature_2m_max"
            "&timezone=America/New_York"
        )

        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            data = response.json()
            daily = data.get("daily", {})

            temps = daily.get("temperature_2m_max", [])
            precip = daily.get("precipitation_sum", [])
            winds = daily.get("windspeed_10m_max", [])

            return {
                "avg_temp": sum(temps) / len(temps) if temps else None,
                "total_precip": sum(precip) if precip else None,
                "max_wind": max(winds) if winds else None
            }

    except Exception as e:
        print("Weather API failed:", e)

    return {
        "avg_temp": None,
        "total_precip": None,
        "max_wind": None
    }


@app.route("/hexes")
def get_hexes():
    features = []

    for _, row in df.iterrows():
        h3_index = str(row["h3"]).strip()
        lat, lon = h3.cell_to_latlng(h3_index)

        weather = fetch_weather(lat, lon)

        properties = row.to_dict()
        properties.update(weather)

        feature = h3_to_geojson(h3_index, properties)
        features.append(feature)

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })


@app.route("/hex/<h3_id>")
def get_hex_by_id(h3_id):
    h3_id = str(h3_id).strip()
    row = df[df["h3"] == h3_id]

    if row.empty:
        return jsonify({
            "error": "Hex not found",
            "requested": h3_id,
            "available": df["h3"].tolist()
        }), 404

    row_data = row.iloc[0]
    lat, lon = h3.cell_to_latlng(h3_id)
    weather = fetch_weather(lat, lon)

    properties = row_data.to_dict()
    properties.update(weather)

    feature = h3_to_geojson(h3_id, properties)
    return jsonify(feature)


if __name__ == "__main__":
    app.run(debug=True, port=5000)