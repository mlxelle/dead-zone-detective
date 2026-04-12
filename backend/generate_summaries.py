import json
import time
import google.generativeai as genai

# ── CONFIG — paste your free Gemini key here ───────────────────────────────
GEMINI_API_KEY = "AIzaSyAl2W_8jggWBIldR7uYdGutZZ19ZSfmWso"

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

# ── 1. Load final hex data ─────────────────────────────────────────────────
with open("data/philly_hexes_final.json") as f:
    hexes = json.load(f)

# Sort by risk_score, take top 10
top10 = sorted(hexes, key=lambda x: x.get("risk_score", 0), reverse=True)[:10]
print(f"Generating field ops summaries for top {len(top10)} hexes...\n")

# ── 2. Call Gemini for each hex ────────────────────────────────────────────
summaries = []

for i, hex_data in enumerate(top10):
    prompt = f"""You are a field operations advisor for a broadband provider in Philadelphia.

Given this broadband hex cell data, write exactly ONE sentence (max 20 words) that a field ops technician would act on Monday morning. Be specific and actionable. No preamble, no explanation — just the sentence.

Hex data:
- Risk score: {hex_data.get('risk_score')}/100
- Avg download speed: {hex_data.get('avg_dl_speed')} Mbps (advertised)
- Avg upload speed: {hex_data.get('avg_ul_speed')} Mbps (advertised)
- Fiber available: {'Yes' if hex_data.get('fiber_flag') else 'No'}
- Locations served: {hex_data.get('location_count')}
- Cable-only zone: {'Yes' if hex_data.get('cable_only') else 'No'}
- Download gap (advertised vs actual): {hex_data.get('dl_gap_pct')}%
- Equity flagged (high-risk + low income): {'Yes' if hex_data.get('equity_flag') else 'No'}"""

    try:
        response = model.generate_content(prompt)
        summary_text = response.text.strip()
    except Exception as e:
        print(f"  ⚠️  Gemini call failed for hex {i+1}: {e}")
        summary_text = f"Inspect cable node — risk score {hex_data.get('risk_score')}/100, {hex_data.get('location_count')} locations affected."

    print(f"  Hex {i+1}: {hex_data.get('h3_res8_id')}")
    print(f"  Risk: {hex_data.get('risk_score')}/100")
    print(f"  → {summary_text}\n")

    summaries.append({
        "rank":              i + 1,
        "h3_res8_id":        hex_data.get("h3_res8_id"),
        "risk_score":        hex_data.get("risk_score"),
        "avg_dl_speed":      hex_data.get("avg_dl_speed"),
        "avg_ul_speed":      hex_data.get("avg_ul_speed"),
        "fiber_flag":        hex_data.get("fiber_flag"),
        "location_count":    hex_data.get("location_count"),
        "cable_only":        hex_data.get("cable_only"),
        "equity_flag":       hex_data.get("equity_flag"),
        "dl_gap_pct":        hex_data.get("dl_gap_pct"),
        "field_ops_summary": summary_text
    })

    time.sleep(0.5)  # stay well within free tier rate limits

# ── 3. Write output ────────────────────────────────────────────────────────
with open("data/top10_summaries.json", "w") as f:
    json.dump(summaries, f, indent=2)

print("✅  Written → data/top10_summaries.json")
print(f"\nTop hex: {summaries[0]['h3_res8_id']}")
print(f"Summary: {summaries[0]['field_ops_summary']}")