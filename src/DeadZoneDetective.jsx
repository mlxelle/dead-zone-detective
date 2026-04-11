import { useState, useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from "react-leaflet";
import * as d3 from "d3";
import "leaflet/dist/leaflet.css";

// ========== HEX GEOMETRY ==========
function createHexagon(lat, lng, radiusKm = 0.42) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i - 30) * (Math.PI / 180);
    const dlat = (radiusKm / 111.32) * Math.cos(angle);
    const dlng = (radiusKm / (111.32 * Math.cos(lat * (Math.PI / 180)))) * Math.sin(angle);
    points.push([lat + dlat, lng + dlng]);
  }
  points.push(points[0]);
  return points;
}

// ========== DATA ==========
const NEIGHBORHOODS = [
  { id: 1, name: "Kensington", lat: 39.9984, lng: -75.1329, pop: 31200, medIncome: 22800, pctMinority: 72, pctNoInternet: 28.4, avgDownload: 18.2, avgUpload: 4.1, complaints30d: 142, predicted7d: 67, providers: 1, fiber: false, riskScore: 94, trend: "rising" },
  { id: 2, name: "Strawberry Mansion", lat: 39.9847, lng: -75.1768, pop: 14800, medIncome: 19500, pctMinority: 95, pctNoInternet: 34.1, avgDownload: 12.7, avgUpload: 2.8, complaints30d: 89, predicted7d: 52, providers: 1, fiber: false, riskScore: 91, trend: "rising" },
  { id: 3, name: "Nicetown-Tioga", lat: 40.0108, lng: -75.1563, pop: 22100, medIncome: 24300, pctMinority: 88, pctNoInternet: 26.7, avgDownload: 21.3, avgUpload: 5.2, complaints30d: 104, predicted7d: 48, providers: 2, fiber: false, riskScore: 87, trend: "stable" },
  { id: 4, name: "North Philadelphia", lat: 39.9923, lng: -75.1553, pop: 52400, medIncome: 21100, pctMinority: 82, pctNoInternet: 30.2, avgDownload: 15.8, avgUpload: 3.4, complaints30d: 198, predicted7d: 88, providers: 1, fiber: false, riskScore: 92, trend: "rising" },
  { id: 5, name: "West Philadelphia", lat: 39.9566, lng: -75.2175, pop: 61200, medIncome: 28700, pctMinority: 76, pctNoInternet: 22.1, avgDownload: 24.6, avgUpload: 6.1, complaints30d: 156, predicted7d: 61, providers: 2, fiber: false, riskScore: 78, trend: "stable" },
  { id: 6, name: "Germantown", lat: 40.0334, lng: -75.1765, pop: 28600, medIncome: 31200, pctMinority: 84, pctNoInternet: 19.8, avgDownload: 28.4, avgUpload: 7.2, complaints30d: 78, predicted7d: 38, providers: 2, fiber: false, riskScore: 72, trend: "falling" },
  { id: 7, name: "Southwest Philly", lat: 39.9279, lng: -75.2261, pop: 35400, medIncome: 26800, pctMinority: 79, pctNoInternet: 24.5, avgDownload: 19.9, avgUpload: 4.8, complaints30d: 118, predicted7d: 55, providers: 1, fiber: false, riskScore: 84, trend: "rising" },
  { id: 8, name: "Hunting Park", lat: 40.0148, lng: -75.1441, pop: 18900, medIncome: 23400, pctMinority: 91, pctNoInternet: 27.3, avgDownload: 16.5, avgUpload: 3.6, complaints30d: 95, predicted7d: 46, providers: 1, fiber: false, riskScore: 88, trend: "stable" },
  { id: 9, name: "Fairhill", lat: 39.9957, lng: -75.1413, pop: 16200, medIncome: 18200, pctMinority: 94, pctNoInternet: 36.8, avgDownload: 11.2, avgUpload: 2.1, complaints30d: 112, predicted7d: 58, providers: 1, fiber: false, riskScore: 96, trend: "rising" },
  { id: 10, name: "Center City", lat: 39.9526, lng: -75.1652, pop: 68400, medIncome: 72300, pctMinority: 34, pctNoInternet: 4.2, avgDownload: 142.5, avgUpload: 42.3, complaints30d: 31, predicted7d: 8, providers: 5, fiber: true, riskScore: 12, trend: "falling" },
  { id: 11, name: "University City", lat: 39.9502, lng: -75.1985, pop: 42100, medIncome: 48900, pctMinority: 42, pctNoInternet: 6.1, avgDownload: 118.3, avgUpload: 35.7, complaints30d: 22, predicted7d: 6, providers: 4, fiber: true, riskScore: 18, trend: "stable" },
  { id: 12, name: "Chestnut Hill", lat: 40.0713, lng: -75.2082, pop: 12800, medIncome: 96500, pctMinority: 18, pctNoInternet: 2.8, avgDownload: 187.2, avgUpload: 48.1, complaints30d: 8, predicted7d: 2, providers: 4, fiber: true, riskScore: 6, trend: "stable" },
  { id: 13, name: "Roxborough", lat: 40.0389, lng: -75.2341, pop: 18200, medIncome: 58400, pctMinority: 22, pctNoInternet: 5.4, avgDownload: 98.7, avgUpload: 28.4, complaints30d: 18, predicted7d: 5, providers: 3, fiber: true, riskScore: 22, trend: "stable" },
  { id: 14, name: "Manayunk", lat: 40.0267, lng: -75.2257, pop: 11400, medIncome: 62100, pctMinority: 16, pctNoInternet: 3.9, avgDownload: 112.4, avgUpload: 32.1, complaints30d: 12, predicted7d: 3, providers: 3, fiber: true, riskScore: 15, trend: "falling" },
  { id: 15, name: "Frankford", lat: 40.0227, lng: -75.0924, pop: 24600, medIncome: 32100, pctMinority: 62, pctNoInternet: 18.7, avgDownload: 32.4, avgUpload: 8.9, complaints30d: 72, predicted7d: 34, providers: 2, fiber: false, riskScore: 68, trend: "stable" },
  { id: 16, name: "Olney", lat: 40.0365, lng: -75.1237, pop: 29800, medIncome: 34500, pctMinority: 71, pctNoInternet: 16.2, avgDownload: 38.9, avgUpload: 10.2, complaints30d: 58, predicted7d: 24, providers: 2, fiber: false, riskScore: 58, trend: "falling" },
  { id: 17, name: "Port Richmond", lat: 39.9847, lng: -75.1100, pop: 15800, medIncome: 38200, pctMinority: 38, pctNoInternet: 12.4, avgDownload: 48.2, avgUpload: 12.8, complaints30d: 34, predicted7d: 14, providers: 2, fiber: false, riskScore: 42, trend: "stable" },
  { id: 18, name: "Gray's Ferry", lat: 39.9378, lng: -75.1858, pop: 13200, medIncome: 25600, pctMinority: 74, pctNoInternet: 23.8, avgDownload: 22.1, avgUpload: 5.4, complaints30d: 68, predicted7d: 32, providers: 1, fiber: false, riskScore: 79, trend: "rising" },
  { id: 19, name: "Point Breeze", lat: 39.9345, lng: -75.1742, pop: 16400, medIncome: 29800, pctMinority: 68, pctNoInternet: 20.1, avgDownload: 26.8, avgUpload: 6.8, complaints30d: 54, predicted7d: 22, providers: 2, fiber: false, riskScore: 64, trend: "stable" },
  { id: 20, name: "East Falls", lat: 40.0142, lng: -75.1975, pop: 9200, medIncome: 54800, pctMinority: 28, pctNoInternet: 5.8, avgDownload: 94.6, avgUpload: 26.3, complaints30d: 14, predicted7d: 4, providers: 3, fiber: true, riskScore: 19, trend: "stable" },
];

// ========== HELPERS ==========
const riskHex = (score) => {
  if (score >= 85) return "#dc2626";
  if (score >= 65) return "#f59e0b";
  if (score >= 40) return "#3b82f6";
  return "#22c55e";
};

const riskLabel = (score) => {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
};

const trendIcon = (t) => t === "rising" ? "▲" : t === "falling" ? "▼" : "—";

// ========== FLY TO ==========
function FlyTo({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 13, { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

// ========== D3 ARC GAUGE ==========
function ArcGauge({ score, size = 170 }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const w = size, h = size * 0.62;
    const radius = size * 0.4;
    const cx = w / 2, cy = h * 0.88;
    const g = svg.attr("width", w).attr("height", h).append("g").attr("transform", `translate(${cx},${cy})`);
    const arc = d3.arc().innerRadius(radius - 13).outerRadius(radius).cornerRadius(3);
    g.append("path").datum({ startAngle: -Math.PI * 0.75, endAngle: Math.PI * 0.75 }).attr("d", arc).attr("fill", "#1e2d45");
    const segments = [
      { start: -0.75, end: -0.375, color: "#22c55e" },
      { start: -0.375, end: 0, color: "#3b82f6" },
      { start: 0, end: 0.375, color: "#f59e0b" },
      { start: 0.375, end: 0.75, color: "#dc2626" },
    ];
    const scoreAngle = -Math.PI * 0.75 + (score / 100) * Math.PI * 1.5;
    segments.forEach(seg => {
      const start = Math.PI * seg.start;
      const end = Math.PI * seg.end;
      const clipEnd = Math.min(end, scoreAngle);
      if (clipEnd > start) {
        g.append("path").datum({ startAngle: start, endAngle: clipEnd }).attr("d", arc).attr("fill", seg.color).attr("opacity", 0.85);
      }
    });
    const needleAngle = scoreAngle - Math.PI / 2;
    const needleLen = radius - 20;
    g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", Math.cos(needleAngle) * needleLen).attr("y2", Math.sin(needleAngle) * needleLen).attr("stroke", "#fff").attr("stroke-width", 2.5).attr("stroke-linecap", "round");
    g.append("circle").attr("r", 4.5).attr("fill", "#fff");
    g.append("text").attr("y", -18).attr("text-anchor", "middle").attr("fill", riskHex(score)).attr("font-size", "26px").attr("font-weight", "800").attr("font-family", "'JetBrains Mono', monospace").text(score);
    g.append("text").attr("y", -2).attr("text-anchor", "middle").attr("fill", "#555").attr("font-size", "8px").attr("font-family", "'JetBrains Mono', monospace").attr("letter-spacing", "0.12em").text("RISK SCORE");
  }, [score, size]);
  return <svg ref={svgRef} />;
}

// ========== SPEED BAR ==========
function SpeedBar({ label, value, max, unit, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
        <span style={{ color: "#555" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value} {unit}</span>
      </div>
      <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ========== WEATHER ==========
const WEATHER = {
  clear: { label: "Clear", mult: 1.0, icon: "☀️" },
  rain: { label: "Rain", mult: 1.35, icon: "🌧️" },
  storm: { label: "Storm", mult: 1.8, icon: "⛈️" },
  heat: { label: "Heat Wave", mult: 1.25, icon: "🔥" },
};

// ========== MAIN ==========
export default function DeadZoneDetective() {
  const [selected, setSelected] = useState(NEIGHBORHOODS[3]);
  const [weather, setWeather] = useState("clear");
  const [panelOpen, setPanelOpen] = useState(true);
  const [flyTarget, setFlyTarget] = useState(null);

  const mult = WEATHER[weather].mult;

  const top10 = useMemo(() =>
    [...NEIGHBORHOODS]
      .map(n => ({ ...n, adjRisk: Math.min(100, Math.round(n.riskScore * mult)) }))
      .sort((a, b) => b.adjRisk - a.adjRisk)
      .slice(0, 10),
    [mult]
  );

  const selectHood = (n) => {
    setSelected(n);
    setPanelOpen(true);
    setFlyTarget({ lat: n.lat, lng: n.lng });
  };

  const adjRisk = Math.min(100, Math.round(selected.riskScore * mult));
  const adjPredicted = Math.round(selected.predicted7d * mult);
  const critCount = NEIGHBORHOODS.filter(n => Math.min(100, Math.round(n.riskScore * mult)) >= 85).length;
  const totalPredicted = NEIGHBORHOODS.reduce((s, n) => s + Math.round(n.predicted7d * mult), 0);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace", background: "#060608", color: "#e2e8f0", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* HEADER */}
      <header style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #120000 100%)",
        borderBottom: "2px solid #CC0000",
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, zIndex: 1000,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="34" height="34" viewBox="0 0 36 36">
            <rect width="36" height="36" rx="8" fill="#CC0000" />
            <circle cx="18" cy="18" r="6" fill="none" stroke="#fff" strokeWidth="2" />
            <circle cx="18" cy="18" r="11" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            <circle cx="18" cy="12" r="2" fill="#fff" />
          </svg>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.08em" }}>
              <span style={{ color: "#CC0000" }}>NET</span>PULSE
            </div>
            <div style={{ fontSize: 8, color: "#555", letterSpacing: "0.15em" }}>DEAD ZONE DETECTIVE · PHILADELPHIA</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>WEATHER</span>
          {Object.entries(WEATHER).map(([k, v]) => (
            <button key={k} onClick={() => setWeather(k)} style={{
              padding: "5px 10px", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
              background: weather === k ? "#CC0000" : "#111",
              color: weather === k ? "#fff" : "#444",
              border: `1px solid ${weather === k ? "#CC0000" : "#222"}`,
              borderRadius: 5, transition: "all 0.2s",
            }}>{v.icon} {v.label}</button>
          ))}
        </div>
      </header>

      {/* STATS BAR */}
      <div style={{ display: "flex", background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        {[
          { label: "CRITICAL ZONES", value: critCount, color: "#CC0000" },
          { label: "7D PREDICTED COMPLAINTS", value: totalPredicted, color: "#f59e0b" },
          { label: "WEATHER IMPACT", value: `${mult}×`, color: weather !== "clear" ? "#CC0000" : "#22c55e" },
          { label: "ZONES MONITORED", value: NEIGHBORHOODS.length, color: "#3b82f6" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "10px 16px", borderRight: i < 3 ? "1px solid #1a1a1a" : "none" }}>
            <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.12em" }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT: TOP 10 */}
        <div style={{ width: 230, background: "#080808", borderRight: "1px solid #1a1a1a", overflowY: "auto", flexShrink: 0, zIndex: 900 }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 9, color: "#444", letterSpacing: "0.12em", borderBottom: "1px solid #1a1a1a", position: "sticky", top: 0, background: "#080808" }}>
            TOP 10 · HIGHEST RISK
          </div>
          {top10.map((n, i) => (
            <div key={n.id} onClick={() => selectHood(n)} style={{
              padding: "10px 14px", cursor: "pointer",
              background: selected.id === n.id ? "#1a0000" : "transparent",
              borderBottom: "1px solid #111",
              borderLeft: `3px solid ${riskHex(n.adjRisk)}`,
              transition: "background 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, color: "#333", fontWeight: 700 }}>#{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#ccc" }}>{n.name}</div>
                    <div style={{ fontSize: 9, color: "#444" }}>{n.providers} ISP{n.providers > 1 ? "s" : ""} · {n.trend} {trendIcon(n.trend)}</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800, color: riskHex(n.adjRisk),
                  textShadow: n.adjRisk >= 85 ? `0 0 8px ${riskHex(n.adjRisk)}40` : "none",
                }}>{n.adjRisk}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CENTER: LEAFLET MAP */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer center={[39.9826, -75.1652]} zoom={12} style={{ width: "100%", height: "100%", background: "#0a0a0a" }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}
            {NEIGHBORHOODS.map(n => {
              const aRisk = Math.min(100, Math.round(n.riskScore * mult));
              const hex = createHexagon(n.lat, n.lng);
              const color = riskHex(aRisk);
              const isSel = selected.id === n.id;
              return (
                <Polygon key={n.id} positions={hex} pathOptions={{
                  fillColor: color, fillOpacity: isSel ? 0.7 : 0.4,
                  color: isSel ? "#fff" : color, weight: isSel ? 2.5 : 1, opacity: isSel ? 1 : 0.6,
                }} eventHandlers={{ click: () => selectHood(n) }}>
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.4 }}>
                      <strong>{n.name}</strong><br />
                      Risk: <span style={{ color }}>{aRisk}/100</span><br />
                      Speed: {n.avgDownload} Mbps<br />
                      No Internet: {n.pctNoInternet}%
                    </div>
                  </Tooltip>
                </Polygon>
              );
            })}
          </MapContainer>

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 20, left: 20, background: "#0a0a0aEE",
            padding: "10px 14px", borderRadius: 8, border: "1px solid #222",
            fontSize: 9, color: "#666", zIndex: 800,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, letterSpacing: "0.1em", color: "#444" }}>RISK LEVEL</div>
            {[
              { label: "Critical (85+)", color: "#dc2626" },
              { label: "High (65–84)", color: "#f59e0b" },
              { label: "Moderate (40–64)", color: "#3b82f6" },
              { label: "Low (<40)", color: "#22c55e" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ width: 10, height: 10, background: l.color, opacity: 0.7, clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: DETAIL PANEL */}
        {panelOpen && (
          <div style={{ width: 280, background: "#080808", borderLeft: "1px solid #1a1a1a", overflowY: "auto", flexShrink: 0, zIndex: 900 }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #1a1a1a",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              position: "sticky", top: 0, background: "#080808",
            }}>
              <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.12em" }}>ZONE DETAIL</span>
              <button onClick={() => setPanelOpen(false)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>×</button>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{selected.name}</div>
              <div style={{
                display: "inline-block", fontSize: 9, padding: "3px 10px", borderRadius: 4,
                background: riskHex(adjRisk) + "18", color: riskHex(adjRisk),
                fontWeight: 700, letterSpacing: "0.08em",
              }}>
                {riskLabel(adjRisk)} · {adjRisk}/100
                {weather !== "clear" && <span style={{ opacity: 0.7 }}> ({WEATHER[weather].icon})</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 4px" }}>
                <ArcGauge score={adjRisk} size={180} />
              </div>

              <div style={{ marginTop: 8 }}>
                <SpeedBar label="Download" value={selected.avgDownload} max={200} unit="Mbps" color={selected.avgDownload < 25 ? "#CC0000" : "#22c55e"} />
                <SpeedBar label="Upload" value={selected.avgUpload} max={50} unit="Mbps" color={selected.avgUpload < 5 ? "#CC0000" : "#3b82f6"} />
              </div>

              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px",
                borderRadius: 5, marginTop: 4, marginBottom: 14,
                background: selected.fiber ? "#001a00" : "#1a0000",
                border: `1px solid ${selected.fiber ? "#003300" : "#330000"}`,
                fontSize: 10, color: selected.fiber ? "#22c55e" : "#CC0000", fontWeight: 600,
              }}>
                {selected.fiber ? "✓ FIBER AVAILABLE" : "✗ NO FIBER"}
              </div>

              {[
                { label: "Predicted complaints (7d)", value: adjPredicted, color: "#f59e0b" },
                { label: "Actual complaints (30d)", value: selected.complaints30d, color: "#888" },
                { label: "No internet access", value: selected.pctNoInternet + "%", color: selected.pctNoInternet > 20 ? "#CC0000" : "#888" },
                { label: "ISP providers", value: selected.providers, color: selected.providers <= 1 ? "#CC0000" : "#888" },
                { label: "Population", value: selected.pop.toLocaleString(), color: "#888" },
                { label: "Median income", value: "$" + selected.medIncome.toLocaleString(), color: "#888" },
                { label: "% Minority", value: selected.pctMinority + "%", color: "#888" },
                { label: "Trend", value: selected.trend.toUpperCase() + " " + trendIcon(selected.trend), color: selected.trend === "rising" ? "#CC0000" : selected.trend === "falling" ? "#22c55e" : "#555" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111" }}>
                  <span style={{ fontSize: 10, color: "#555" }}>{r.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.color }}>{r.value}</span>
                </div>
              ))}

              {adjRisk >= 65 && (
                <div style={{ marginTop: 14, padding: 10, background: "#0f0505", border: "1px solid #330000", borderRadius: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#CC0000", marginBottom: 6, letterSpacing: "0.1em" }}>⚡ DISPATCH ACTIONS</div>
                  <div style={{ fontSize: 10, color: "#888", lineHeight: 1.6 }}>
                    {selected.providers <= 1 && <div style={{ marginBottom: 4 }}>→ Single-ISP monopoly. Escalate to infra team.</div>}
                    {selected.avgDownload < 25 && <div style={{ marginBottom: 4 }}>→ Below FCC threshold. Prioritize node upgrade.</div>}
                    {selected.trend === "rising" && <div style={{ marginBottom: 4 }}>→ Complaints trending up. Deploy proactive crew.</div>}
                    {selected.pctNoInternet > 25 && <div style={{ marginBottom: 4 }}>→ High unconnected %. Coordinate equity program.</div>}
                    {weather !== "clear" && <div>→ {WEATHER[weather].label} alert. Pre-position repair units.</div>}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, fontSize: 7, color: "#282828", lineHeight: 1.4 }}>
                Sources: FCC Broadband Map, Ookla Open Data, ACS 5-Year. Model: gradient-boosted ensemble on complaint velocity, infrastructure age, weather correlation.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
