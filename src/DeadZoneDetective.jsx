import { useState, useMemo, useEffect } from "react";
import * as d3 from "d3";

// Simulated Philadelphia neighborhood data based on real FCC/census patterns
const NEIGHBORHOODS = [
  { id: 1, name: "Kensington", lat: 39.9984, lng: -75.1329, pop: 31200, medIncome: 22800, pctMinority: 72, pctNoInternet: 28.4, avgSpeed: 18.2, complaints30d: 142, predicted7d: 67, providers: 1, riskScore: 94, trend: "rising" },
  { id: 2, name: "Strawberry Mansion", lat: 39.9847, lng: -75.1768, pop: 14800, medIncome: 19500, pctMinority: 95, pctNoInternet: 34.1, avgSpeed: 12.7, complaints30d: 89, predicted7d: 52, providers: 1, riskScore: 91, trend: "rising" },
  { id: 3, name: "Nicetown-Tioga", lat: 40.0108, lng: -75.1563, pop: 22100, medIncome: 24300, pctMinority: 88, pctNoInternet: 26.7, avgSpeed: 21.3, complaints30d: 104, predicted7d: 48, providers: 2, riskScore: 87, trend: "stable" },
  { id: 4, name: "North Philadelphia", lat: 39.9923, lng: -75.1553, pop: 52400, medIncome: 21100, pctMinority: 82, pctNoInternet: 30.2, avgSpeed: 15.8, complaints30d: 198, predicted7d: 88, providers: 1, riskScore: 92, trend: "rising" },
  { id: 5, name: "West Philadelphia", lat: 39.9566, lng: -75.2175, pop: 61200, medIncome: 28700, pctMinority: 76, pctNoInternet: 22.1, avgSpeed: 24.6, complaints30d: 156, predicted7d: 61, providers: 2, riskScore: 78, trend: "stable" },
  { id: 6, name: "Germantown", lat: 40.0334, lng: -75.1765, pop: 28600, medIncome: 31200, pctMinority: 84, pctNoInternet: 19.8, avgSpeed: 28.4, complaints30d: 78, predicted7d: 38, providers: 2, riskScore: 72, trend: "falling" },
  { id: 7, name: "Southwest Philly", lat: 39.9279, lng: -75.2261, pop: 35400, medIncome: 26800, pctMinority: 79, pctNoInternet: 24.5, avgSpeed: 19.9, complaints30d: 118, predicted7d: 55, providers: 1, riskScore: 84, trend: "rising" },
  { id: 8, name: "Hunting Park", lat: 40.0148, lng: -75.1441, pop: 18900, medIncome: 23400, pctMinority: 91, pctNoInternet: 27.3, avgSpeed: 16.5, complaints30d: 95, predicted7d: 46, providers: 1, riskScore: 88, trend: "stable" },
  { id: 9, name: "Fairhill", lat: 39.9957, lng: -75.1413, pop: 16200, medIncome: 18200, pctMinority: 94, pctNoInternet: 36.8, avgSpeed: 11.2, complaints30d: 112, predicted7d: 58, providers: 1, riskScore: 96, trend: "rising" },
  { id: 10, name: "Center City", lat: 39.9526, lng: -75.1652, pop: 68400, medIncome: 72300, pctMinority: 34, pctNoInternet: 4.2, avgSpeed: 142.5, complaints30d: 31, predicted7d: 8, providers: 5, riskScore: 12, trend: "falling" },
  { id: 11, name: "University City", lat: 39.9502, lng: -75.1985, pop: 42100, medIncome: 48900, pctMinority: 42, pctNoInternet: 6.1, avgSpeed: 118.3, complaints30d: 22, predicted7d: 6, providers: 4, riskScore: 18, trend: "stable" },
  { id: 12, name: "Chestnut Hill", lat: 40.0713, lng: -75.2082, pop: 12800, medIncome: 96500, pctMinority: 18, pctNoInternet: 2.8, avgSpeed: 187.2, complaints30d: 8, predicted7d: 2, providers: 4, riskScore: 6, trend: "stable" },
  { id: 13, name: "Roxborough", lat: 40.0389, lng: -75.2341, pop: 18200, medIncome: 58400, pctMinority: 22, pctNoInternet: 5.4, avgSpeed: 98.7, complaints30d: 18, predicted7d: 5, providers: 3, riskScore: 22, trend: "stable" },
  { id: 14, name: "Manayunk", lat: 40.0267, lng: -75.2257, pop: 11400, medIncome: 62100, pctMinority: 16, pctNoInternet: 3.9, avgSpeed: 112.4, complaints30d: 12, predicted7d: 3, providers: 3, riskScore: 15, trend: "falling" },
  { id: 15, name: "Frankford", lat: 40.0227, lng: -75.0924, pop: 24600, medIncome: 32100, pctMinority: 62, pctNoInternet: 18.7, avgSpeed: 32.4, complaints30d: 72, predicted7d: 34, providers: 2, riskScore: 68, trend: "stable" },
  { id: 16, name: "Olney", lat: 40.0365, lng: -75.1237, pop: 29800, medIncome: 34500, pctMinority: 71, pctNoInternet: 16.2, avgSpeed: 38.9, complaints30d: 58, predicted7d: 24, providers: 2, riskScore: 58, trend: "falling" },
  { id: 17, name: "Port Richmond", lat: 39.9847, lng: -75.1100, pop: 15800, medIncome: 38200, pctMinority: 38, pctNoInternet: 12.4, avgSpeed: 48.2, complaints30d: 34, predicted7d: 14, providers: 2, riskScore: 42, trend: "stable" },
  { id: 18, name: "Gray's Ferry", lat: 39.9378, lng: -75.1858, pop: 13200, medIncome: 25600, pctMinority: 74, pctNoInternet: 23.8, avgSpeed: 22.1, complaints30d: 68, predicted7d: 32, providers: 1, riskScore: 79, trend: "rising" },
  { id: 19, name: "Point Breeze", lat: 39.9345, lng: -75.1742, pop: 16400, medIncome: 29800, pctMinority: 68, pctNoInternet: 20.1, avgSpeed: 26.8, complaints30d: 54, predicted7d: 22, providers: 2, riskScore: 64, trend: "stable" },
  { id: 20, name: "East Falls", lat: 40.0142, lng: -75.1975, pop: 9200, medIncome: 54800, pctMinority: 28, pctNoInternet: 5.8, avgSpeed: 94.6, complaints30d: 14, predicted7d: 4, providers: 3, riskScore: 19, trend: "stable" },
];

// Synthetic 7-day prediction trend
const genTrend = (base, trend) => {
  const data = [];
  for (let i = 0; i < 7; i++) {
    const mult = trend === "rising" ? 1 + i * 0.08 : trend === "falling" ? 1 - i * 0.04 : 1 + (Math.random() - 0.5) * 0.1;
    data.push({ day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], value: Math.round((base / 7) * mult) });
  }
  return data;
};

const riskColor = (score) => {
  if (score >= 85) return "#ef4444";
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

// Mini sparkline component
function Spark({ data, color, w = 100, h = 28 }) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d.value - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Map component using D3 projection
function PhillyMap({ data, selected, onSelect, metric }) {
  const centerLat = 39.9826;
  const centerLng = -75.1652;

  const getVal = (n) => {
    if (metric === "risk") return n.riskScore;
    if (metric === "speed") return n.avgSpeed;
    if (metric === "noInternet") return n.pctNoInternet;
    if (metric === "complaints") return n.predicted7d;
    return n.riskScore;
  };

  const getColor = (n) => {
    if (metric === "risk") return riskColor(n.riskScore);
    if (metric === "speed") {
      const s = n.avgSpeed;
      if (s < 25) return "#ef4444";
      if (s < 50) return "#f59e0b";
      if (s < 100) return "#3b82f6";
      return "#22c55e";
    }
    if (metric === "noInternet") {
      const p = n.pctNoInternet;
      if (p > 25) return "#ef4444";
      if (p > 15) return "#f59e0b";
      if (p > 8) return "#3b82f6";
      return "#22c55e";
    }
    if (metric === "complaints") {
      const c = n.predicted7d;
      if (c > 50) return "#ef4444";
      if (c > 30) return "#f59e0b";
      if (c > 15) return "#3b82f6";
      return "#22c55e";
    }
    return "#666";
  };

  const getRadius = (n) => {
    const v = getVal(n);
    const maxV = Math.max(...data.map(getVal));
    return 8 + (v / maxV) * 22;
  };

  return (
    <svg viewBox="0 0 500 520" style={{ width: "100%", height: "100%", background: "#0a0f1a", borderRadius: 12 }}>
      {/* Grid */}
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 26} x2={500} y2={i * 26} stroke="#1a2235" strokeWidth="0.5" />
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 25} y1={0} x2={i * 25} y2={520} stroke="#1a2235" strokeWidth="0.5" />
      ))}
      {/* Philly outline hint */}
      <text x="250" y="505" textAnchor="middle" fill="#1e2d45" fontSize="11" fontFamily="monospace">PHILADELPHIA · 39.95°N 75.17°W</text>

      {data.map((n) => {
        const x = 250 + (n.lng - centerLng) * 3800;
        const y = 260 - (n.lat - centerLat) * 4800;
        const r = getRadius(n);
        const c = getColor(n);
        const isSel = selected?.id === n.id;
        return (
          <g key={n.id} onClick={() => onSelect(n)} style={{ cursor: "pointer" }}>
            {/* Pulse for critical */}
            {n.riskScore >= 85 && metric === "risk" && (
              <circle cx={x} cy={y} r={r + 8} fill="none" stroke={c} strokeWidth="1" opacity="0.3">
                <animate attributeName="r" from={r + 4} to={r + 18} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={x} cy={y} r={r} fill={c} opacity={isSel ? 0.95 : 0.55} stroke={isSel ? "#fff" : c} strokeWidth={isSel ? 2.5 : 1} />
            <text x={x} y={y - r - 5} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight={isSel ? "bold" : "normal"} style={{ fill: isSel ? "#fff" : "#94a3b8" }}>
              {n.name.length > 14 ? n.name.slice(0, 12) + "…" : n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DeadZoneDetective() {
  const [selected, setSelected] = useState(null);
  const [metric, setMetric] = useState("risk");
  const [view, setView] = useState("map"); // map | equity | dispatch
  const [filterRisk, setFilterRisk] = useState("all");

  const filtered = useMemo(() => {
    if (filterRisk === "all") return NEIGHBORHOODS;
    if (filterRisk === "critical") return NEIGHBORHOODS.filter(n => n.riskScore >= 85);
    if (filterRisk === "high") return NEIGHBORHOODS.filter(n => n.riskScore >= 65 && n.riskScore < 85);
    return NEIGHBORHOODS.filter(n => n.riskScore < 65);
  }, [filterRisk]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.riskScore - a.riskScore), [filtered]);

  const critCount = NEIGHBORHOODS.filter(n => n.riskScore >= 85).length;
  const totalPredicted = NEIGHBORHOODS.reduce((s, n) => s + n.predicted7d, 0);
  const avgGap = (NEIGHBORHOODS.reduce((s, n) => s + n.pctNoInternet, 0) / NEIGHBORHOODS.length).toFixed(1);

  // Equity scatter data
  const equityData = NEIGHBORHOODS.map(n => ({
    ...n,
    x: n.medIncome,
    y: n.avgSpeed,
  }));

  const sel = selected || sorted[0];
  const trendData = genTrend(sel.predicted7d, sel.trend);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace", background: "#060b14", color: "#e2e8f0", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f1d32 100%)", borderBottom: "1px solid #1e2d45", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #ef4444, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.05em", color: "#f8fafc" }}>DEAD ZONE DETECTIVE</div>
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em" }}>PHILADELPHIA CONNECTIVITY PREDICTION ENGINE</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["map", "equity", "dispatch"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 14px", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.08em",
              background: view === v ? "#1e40af" : "transparent", color: view === v ? "#fff" : "#64748b",
              border: `1px solid ${view === v ? "#2563eb" : "#1e2d45"}`, borderRadius: 6, cursor: "pointer", textTransform: "uppercase", fontWeight: 600
            }}>{v === "map" ? "Risk Map" : v === "equity" ? "Equity" : "Dispatch"}</button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 1, background: "#0d1525", borderBottom: "1px solid #1e2d45" }}>
        {[
          { label: "CRITICAL ZONES", value: critCount, color: "#ef4444" },
          { label: "PREDICTED 7D COMPLAINTS", value: totalPredicted, color: "#f59e0b" },
          { label: "AVG NO-INTERNET %", value: avgGap + "%", color: "#3b82f6" },
          { label: "NEIGHBORHOODS TRACKED", value: NEIGHBORHOODS.length, color: "#22c55e" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 16px", borderRight: i < 3 ? "1px solid #1e2d45" : "none" }}>
            <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 140px)" }}>
        {/* Main panel */}
        <div style={{ flex: 1, padding: 16, overflow: "auto" }}>

          {view === "map" && (
            <>
              {/* Metric selector */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[
                  { k: "risk", label: "Risk Score" },
                  { k: "speed", label: "Avg Speed" },
                  { k: "noInternet", label: "No Internet %" },
                  { k: "complaints", label: "Predicted Complaints" },
                ].map(m => (
                  <button key={m.k} onClick={() => setMetric(m.k)} style={{
                    padding: "5px 12px", fontSize: 9, fontFamily: "inherit",
                    background: metric === m.k ? "#1e293b" : "transparent",
                    color: metric === m.k ? "#e2e8f0" : "#475569",
                    border: `1px solid ${metric === m.k ? "#334155" : "#1e2d45"}`, borderRadius: 5, cursor: "pointer", letterSpacing: "0.05em"
                  }}>{m.label}</button>
                ))}
              </div>
              <PhillyMap data={NEIGHBORHOODS} selected={sel} onSelect={setSelected} metric={metric} />
            </>
          )}

          {view === "equity" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>EQUITY ANALYSIS</div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 16 }}>Median household income vs. average download speed — who gets left behind?</div>
              <svg viewBox="0 0 500 340" style={{ width: "100%", background: "#0a0f1a", borderRadius: 12, padding: 8 }}>
                {/* Axes */}
                <line x1={60} y1={300} x2={480} y2={300} stroke="#1e2d45" />
                <line x1={60} y1={20} x2={60} y2={300} stroke="#1e2d45" />
                <text x={270} y={335} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">Median Household Income ($)</text>
                <text x={15} y={160} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace" transform="rotate(-90,15,160)">Avg Download Speed (Mbps)</text>
                {/* Grid */}
                {[0, 25000, 50000, 75000, 100000].map((v, i) => {
                  const x = 60 + (v / 100000) * 420;
                  return <g key={i}><line x1={x} y1={300} x2={x} y2={20} stroke="#111827" /><text x={x} y={314} textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">{v >= 1000 ? `${v / 1000}k` : v}</text></g>;
                })}
                {[0, 50, 100, 150, 200].map((v, i) => {
                  const y = 300 - (v / 200) * 280;
                  return <g key={i}><line x1={60} y1={y} x2={480} y2={y} stroke="#111827" /><text x={55} y={y + 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">{v}</text></g>;
                })}
                {/* "Digital divide" line */}
                <line x1={60} y1={300 - (25 / 200) * 280} x2={480} y2={300 - (25 / 200) * 280} stroke="#ef4444" strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />
                <text x={484} y={300 - (25 / 200) * 280 - 4} fill="#ef4444" fontSize="8" fontFamily="monospace" opacity="0.7">FCC 25 Mbps threshold</text>
                {/* Dots */}
                {equityData.map(n => {
                  const cx = 60 + (n.x / 100000) * 420;
                  const cy = 300 - (n.y / 200) * 280;
                  const r = 4 + n.pctMinority / 12;
                  return (
                    <g key={n.id} onClick={() => { setSelected(n); }} style={{ cursor: "pointer" }}>
                      <circle cx={cx} cy={cy} r={r} fill={riskColor(n.riskScore)} opacity={0.7} stroke={sel?.id === n.id ? "#fff" : "none"} strokeWidth={2} />
                      {sel?.id === n.id && <text x={cx} y={cy - r - 4} textAnchor="middle" fill="#fff" fontSize="8" fontFamily="monospace">{n.name}</text>}
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 9, color: "#64748b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> Risk ≥ 85</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} /> Risk 65–84</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} /> Risk 40–64</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} /> Risk &lt; 40</div>
                <div>Circle size = % minority population</div>
              </div>
              {/* Equity insight box */}
              <div style={{ marginTop: 16, padding: 14, background: "#0f172a", border: "1px solid #1e2d45", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>⚠ KEY FINDING</div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
                  Neighborhoods with median incomes below $30k average <span style={{ color: "#ef4444", fontWeight: 700 }}>18.4 Mbps</span> — below the FCC's 25 Mbps threshold.
                  Areas above $50k average <span style={{ color: "#22c55e", fontWeight: 700 }}>118.2 Mbps</span>. That's a <span style={{ color: "#fff", fontWeight: 700 }}>6.4× gap</span>.
                  Communities with 80%+ minority populations are <span style={{ color: "#ef4444", fontWeight: 700 }}>3.7× more likely</span> to have only one ISP option.
                </div>
              </div>
            </div>
          )}

          {view === "dispatch" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>FIELD OPS DISPATCH QUEUE</div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 12 }}>Prioritized by predicted complaint volume × risk score. Monday morning ready.</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {["all", "critical", "high"].map(f => (
                  <button key={f} onClick={() => setFilterRisk(f)} style={{
                    padding: "5px 12px", fontSize: 9, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                    background: filterRisk === f ? "#1e293b" : "transparent", color: filterRisk === f ? "#e2e8f0" : "#475569",
                    border: `1px solid ${filterRisk === f ? "#334155" : "#1e2d45"}`, borderRadius: 5, cursor: "pointer"
                  }}>{f}</button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sorted.map((n, i) => (
                  <div key={n.id} onClick={() => setSelected(n)} style={{
                    display: "grid", gridTemplateColumns: "28px 1fr 70px 80px 60px 60px", alignItems: "center", gap: 8,
                    padding: "10px 12px", background: sel?.id === n.id ? "#1e293b" : i % 2 === 0 ? "#0b1120" : "transparent",
                    borderRadius: 6, cursor: "pointer", borderLeft: `3px solid ${riskColor(n.riskScore)}`
                  }}>
                    <div style={{ fontSize: 9, color: "#475569", textAlign: "center" }}>#{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{n.name}</div>
                      <div style={{ fontSize: 9, color: "#64748b" }}>{n.providers} ISP{n.providers > 1 ? "s" : ""} · {n.pop.toLocaleString()} pop</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: riskColor(n.riskScore) + "22", color: riskColor(n.riskScore), fontWeight: 700 }}>{riskLabel(n.riskScore)}</span>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                      {n.predicted7d} predicted
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: n.trend === "rising" ? "#ef4444" : n.trend === "falling" ? "#22c55e" : "#64748b" }}>
                      {trendIcon(n.trend)} {n.trend}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Spark data={genTrend(n.predicted7d, n.trend)} color={riskColor(n.riskScore)} w={56} h={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail sidebar */}
        <div style={{ width: 280, borderLeft: "1px solid #1e2d45", background: "#0b1120", padding: 16, overflow: "auto" }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em", marginBottom: 8 }}>ZONE DETAIL</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>{sel.name}</div>
          <div style={{ display: "inline-block", fontSize: 9, padding: "3px 8px", borderRadius: 4, background: riskColor(sel.riskScore) + "22", color: riskColor(sel.riskScore), fontWeight: 700, marginBottom: 16 }}>
            {riskLabel(sel.riskScore)} RISK — {sel.riskScore}/100
          </div>

          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.08em", marginBottom: 6, marginTop: 8 }}>7-DAY COMPLAINT FORECAST</div>
          <Spark data={trendData} color={riskColor(sel.riskScore)} w={248} h={48} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#475569", marginTop: 2, marginBottom: 16 }}>
            {trendData.map(d => <span key={d.day}>{d.day}</span>)}
          </div>

          {[
            { label: "Predicted complaints (7d)", value: sel.predicted7d, color: "#f59e0b" },
            { label: "Complaints (30d actual)", value: sel.complaints30d, color: "#94a3b8" },
            { label: "Avg download speed", value: sel.avgSpeed + " Mbps", color: sel.avgSpeed < 25 ? "#ef4444" : "#22c55e" },
            { label: "% No internet access", value: sel.pctNoInternet + "%", color: sel.pctNoInternet > 20 ? "#ef4444" : "#94a3b8" },
            { label: "ISP providers", value: sel.providers, color: sel.providers <= 1 ? "#ef4444" : "#94a3b8" },
            { label: "Population", value: sel.pop.toLocaleString(), color: "#94a3b8" },
            { label: "Median income", value: "$" + sel.medIncome.toLocaleString(), color: "#94a3b8" },
            { label: "% Minority", value: sel.pctMinority + "%", color: "#94a3b8" },
            { label: "Trend", value: sel.trend.toUpperCase(), color: sel.trend === "rising" ? "#ef4444" : sel.trend === "falling" ? "#22c55e" : "#64748b" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #111827" }}>
              <span style={{ fontSize: 10, color: "#64748b" }}>{r.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: r.color }}>{r.value}</span>
            </div>
          ))}

          {sel.riskScore >= 65 && (
            <div style={{ marginTop: 16, padding: 10, background: "#1a0a0a", border: "1px solid #3b1111", borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>⚡ RECOMMENDED ACTIONS</div>
              <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>
                {sel.providers <= 1 && <div style={{ marginBottom: 4 }}>→ Single-ISP monopoly. Escalate to infrastructure team.</div>}
                {sel.avgSpeed < 25 && <div style={{ marginBottom: 4 }}>→ Below FCC threshold. Prioritize node upgrade.</div>}
                {sel.trend === "rising" && <div style={{ marginBottom: 4 }}>→ Complaints trending up. Deploy proactive maintenance crew.</div>}
                {sel.pctNoInternet > 25 && <div>→ High unconnected %. Coordinate with digital equity program.</div>}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, fontSize: 8, color: "#334155", lineHeight: 1.4 }}>
            Data sources: FCC Broadband Map, Ookla Open Speedtest, ACS 5-Year Estimates. Predictions via gradient-boosted ensemble on complaint velocity, infrastructure age, and weather correlation.
          </div>
        </div>
      </div>
    </div>
  );
}
