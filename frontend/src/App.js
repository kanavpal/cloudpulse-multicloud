/**
 * CloudPulse — Grafana-Style Multi-Cloud DevOps Dashboard
 *
 * Layout modeled after Grafana: left sidebar, topbar breadcrumb,
 * colored stat panels, bar chart, and data table.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import "./App.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Filler, Tooltip, Legend
);

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------
const BACKENDS = [
  {
    name: "AWS",
    whoami: "http://52.206.184.80:8000/whoami/",
    health: "http://52.206.184.80:8000/health/",
    metrics: "http://52.206.184.80:8000/metrics/",
  },
  {
    name: "Oracle",
    whoami: "http://152.67.188.94:8000/whoami/",
    health: "http://152.67.188.94:8000/health/",
    metrics: "http://152.67.188.94:8000/metrics/",
  },
];

const LB_IP = "52.206.184.80";
const POLL_INTERVAL = 3000;
const MAX_LOG_ENTRIES = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimeShort(isoStr) {
  try {
    return new Date(isoStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function formatDateTimeShort(isoStr) {
  try {
    const d = new Date(isoStr);
    return (
      d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    );
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  // ── State ──
  const [awsHealth, setAwsHealth] = useState(null);
  const [oracleHealth, setOracleHealth] = useState(null);
  const [awsStatus, setAwsStatus] = useState("checking");
  const [oracleStatus, setOracleStatus] = useState("checking");
  const [lastRequest, setLastRequest] = useState(null);
  const [awsCount, setAwsCount] = useState(0);
  const [oracleCount, setOracleCount] = useState(0);
  const [requestLog, setRequestLog] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lbAlgorithm] = useState("Round Robin");
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [toasts, setToasts] = useState([]);

  const pollCountRef = useRef(0);
  const rrIndexRef = useRef(0); // round-robin index

  // Client-side metrics tracking
  const awsResponseTimes = useRef([]);
  const oracleResponseTimes = useRef([]);
  const awsFirstSeen = useRef(null);
  const oracleFirstSeen = useRef(null);

  // SLA tracking refs
  const awsTotalPolls = useRef(0);
  const awsSuccessPolls = useRef(0);
  const oracleTotalPolls = useRef(0);
  const oracleSuccessPolls = useRef(0);

  // Previous status refs for change detection
  const prevAwsUp = useRef(null);
  const prevOracleUp = useRef(null);

  // ── Clock ──
  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Toast notifications ──
  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  // ── Fetch with timeout ──
  const fetchJSON = useCallback(async (url, timeout = 5000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }, []);

  // ── Poll ──
  const pollAll = useCallback(async () => {
    pollCountRef.current += 1;
    const now = new Date().toISOString();

    // ── 1. Health checks with response time measurement ──
    let awsUp = false;
    let oracleUp = false;

    try {
      const t0 = performance.now();
      const d = await fetchJSON(BACKENDS[0].health);
      const elapsed = Math.round(performance.now() - t0);
      awsResponseTimes.current = [...awsResponseTimes.current.slice(-29), elapsed];
      if (!awsFirstSeen.current) awsFirstSeen.current = new Date();
      setAwsHealth(d); setAwsStatus("online"); awsUp = true;
    } catch { setAwsStatus("offline"); setAwsHealth(null); }

    try {
      const t0 = performance.now();
      const d = await fetchJSON(BACKENDS[1].health);
      const elapsed = Math.round(performance.now() - t0);
      oracleResponseTimes.current = [...oracleResponseTimes.current.slice(-29), elapsed];
      if (!oracleFirstSeen.current) oracleFirstSeen.current = new Date();
      setOracleHealth(d); setOracleStatus("online"); oracleUp = true;
    } catch { setOracleStatus("offline"); setOracleHealth(null); }

    // ── 2. Client-side Round-Robin load balancing with failover ──
    // Pick the next server in rotation; if it's down, failover to the other
    const availableBackends = [];
    if (awsUp) availableBackends.push(BACKENDS[0]);
    if (oracleUp) availableBackends.push(BACKENDS[1]);

    if (availableBackends.length > 0) {
      // Round-robin: pick next available backend
      const idx = rrIndexRef.current % availableBackends.length;
      const chosen = availableBackends[idx];
      rrIndexRef.current += 1;

      try {
        const data = await fetchJSON(chosen.whoami);
        const cloud = data.cloud || chosen.name;
        setLastRequest({ ...data, cloud, fetchedAt: now });
        if (cloud === "AWS") setAwsCount((c) => c + 1);
        else if (cloud === "Oracle" || cloud === "ORACLE") setOracleCount((c) => c + 1);
        setRequestLog((prev) =>
          [{ id: Date.now(), cloud, hostname: data.hostname || "—", region: data.region || "—", time: now }, ...prev].slice(0, MAX_LOG_ENTRIES)
        );
      } catch {
        // Chosen server failed whoami — try failover to the other
        const fallbackIdx = (idx + 1) % availableBackends.length;
        if (fallbackIdx !== idx) {
          try {
            const fb = availableBackends[fallbackIdx];
            const data = await fetchJSON(fb.whoami);
            const cloud = data.cloud || fb.name;
            setLastRequest({ ...data, cloud, fetchedAt: now, failover: true });
            if (cloud === "AWS") setAwsCount((c) => c + 1);
            else if (cloud === "Oracle" || cloud === "ORACLE") setOracleCount((c) => c + 1);
            setRequestLog((prev) =>
              [{ id: Date.now(), cloud, hostname: data.hostname || "—", region: data.region || "—", time: now, failover: true }, ...prev].slice(0, MAX_LOG_ENTRIES)
            );
          } catch {
            setLastRequest((prev) =>
              prev ? { ...prev, cloud: "Offline", fetchedAt: now } : { cloud: "Offline", fetchedAt: now }
            );
          }
        }
      }
    } else {
      // Both down
      setLastRequest((prev) =>
        prev ? { ...prev, cloud: "Offline", fetchedAt: now } : { cloud: "Offline", fetchedAt: now }
      );
    }

    // ── SLA tracking ──
    awsTotalPolls.current += 1;
    if (awsUp) awsSuccessPolls.current += 1;
    oracleTotalPolls.current += 1;
    if (oracleUp) oracleSuccessPolls.current += 1;

    // ── Toast alerts on status change ──
    if (prevAwsUp.current !== null && prevAwsUp.current !== awsUp) {
      if (awsUp) addToast("✅ AWS EC2 is back ONLINE", "success");
      else addToast("🔴 AWS EC2 went OFFLINE!", "error");
    }
    if (prevOracleUp.current !== null && prevOracleUp.current !== oracleUp) {
      if (oracleUp) addToast("✅ Oracle Cloud is back ONLINE", "success");
      else addToast("🔴 Oracle Cloud went OFFLINE!", "error");
    }
    prevAwsUp.current = awsUp;
    prevOracleUp.current = oracleUp;

    // ── Track latency history for live timeline chart ──
    const _awsLastMs = awsResponseTimes.current.length > 0
      ? awsResponseTimes.current[awsResponseTimes.current.length - 1]
      : null;
    const _oracleLastMs = oracleResponseTimes.current.length > 0
      ? oracleResponseTimes.current[oracleResponseTimes.current.length - 1]
      : null;
    setTrafficHistory((prev) => [
      ...prev.slice(-29),
      {
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
        awsMs: awsUp ? _awsLastMs : null,
        oracleMs: oracleUp ? _oracleLastMs : null,
      },
    ]);
  }, [fetchJSON, addToast]);

  useEffect(() => {
    pollAll();
    const iv = setInterval(pollAll, POLL_INTERVAL);
    return () => clearInterval(iv);
  }, [pollAll]);

  // ── Computed ──
  const total = awsCount + oracleCount;
  const awsPct = total > 0 ? ((awsCount / total) * 100).toFixed(1) : "0.0";
  const oraclePct = total > 0 ? ((oracleCount / total) * 100).toFixed(1) : "0.0";
  const activeBackends =
    (awsStatus === "online" ? 1 : 0) + (oracleStatus === "online" ? 1 : 0);

  // ── Client-computed metrics ──
  const avgMs = (times) => times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const uptimeSec = (firstSeen) => firstSeen ? Math.floor((Date.now() - firstSeen.getTime()) / 1000) : 0;

  const awsAvgMs = avgMs(awsResponseTimes.current);
  const oracleAvgMs = avgMs(oracleResponseTimes.current);
  const awsUptimeSec = uptimeSec(awsFirstSeen.current);
  const oracleUptimeSec = uptimeSec(oracleFirstSeen.current);

  // ── SLA computed ──
  const awsSLA = awsTotalPolls.current > 0
    ? ((awsSuccessPolls.current / awsTotalPolls.current) * 100).toFixed(2)
    : null;
  const oracleSLA = oracleTotalPolls.current > 0
    ? ((oracleSuccessPolls.current / oracleTotalPolls.current) * 100).toFixed(2)
    : null;
  const slaClass = (sla) => sla === null ? "" : parseFloat(sla) >= 99 ? "sla-good" : parseFloat(sla) >= 95 ? "sla-warn" : "sla-bad";

  // ── Chart config ──
  const chartData = {
    labels: ["AWS", "Oracle"],
    datasets: [
      {
        label: "Requests",
        data: [awsCount, oracleCount],
        backgroundColor: ["rgba(255,152,48,0.75)", "rgba(242,73,92,0.75)"],
        borderColor: ["#ff9830", "#f2495c"],
        borderWidth: 1,
        borderRadius: 3,
        barPercentage: 0.45,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e2028",
        titleColor: "#d8dade",
        bodyColor: "#8e8e8e",
        borderColor: "#2a2d35",
        borderWidth: 1,
        cornerRadius: 4,
        padding: 10,
        titleFont: { family: "Inter", weight: "600", size: 12 },
        bodyFont: { family: "JetBrains Mono", size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6e7076", font: { family: "Inter", weight: "600", size: 12 } },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
        ticks: { color: "#6e7076", font: { family: "JetBrains Mono", size: 11 }, stepSize: 1, precision: 0 },
        border: { display: false },
      },
    },
  };

  // ── Line chart (latency timeline) ──
  const lineChartData = {
    labels: trafficHistory.map((h) => h.time),
    datasets: [
      {
        label: "AWS (ms)",
        data: trafficHistory.map((h) => h.awsMs),
        borderColor: "#ff9830",
        backgroundColor: "rgba(255,152,48,0.10)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: "#ff9830",
        borderWidth: 2,
        spanGaps: false,
      },
      {
        label: "Oracle (ms)",
        data: trafficHistory.map((h) => h.oracleMs),
        borderColor: "#f2495c",
        backgroundColor: "rgba(242,73,92,0.10)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: "#f2495c",
        borderWidth: 2,
        spanGaps: false,
      },
    ],
  };
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: true, position: "top", labels: { color: "#8e8e8e", font: { family: "Inter", size: 11 }, boxWidth: 12, padding: 12 } },
      tooltip: { backgroundColor: "#1e2028", titleColor: "#d8dade", bodyColor: "#8e8e8e", borderColor: "#2a2d35", borderWidth: 1, cornerRadius: 4, padding: 10, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw !== null ? ctx.raw + " ms" : "offline"}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6e7076", font: { family: "JetBrains Mono", size: 9 }, maxTicksLimit: 6, maxRotation: 0 }, border: { display: false } },
      y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#6e7076", font: { family: "JetBrains Mono", size: 10 }, callback: (v) => v + "ms" }, border: { display: false } },
    },
  };

  // ── Doughnut chart (traffic split) ──
  const doughnutData = {
    labels: ["AWS", "Oracle"],
    datasets: [{ data: total > 0 ? [awsCount, oracleCount] : [1, 1], backgroundColor: ["rgba(255,152,48,0.85)", "rgba(242,73,92,0.85)"], borderColor: ["#ff9830", "#f2495c"], borderWidth: 2, hoverOffset: 8 }],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "72%",
    animation: { duration: 500, animateRotate: true },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1e2028", titleColor: "#d8dade", bodyColor: "#8e8e8e", borderColor: "#2a2d35", borderWidth: 1, cornerRadius: 4, padding: 10, callbacks: { label: (ctx) => { const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : "0.0"; return ` ${ctx.raw} requests (${pct}%)`; } } },
    },
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="app-layout">
      {/* ═══════ LEFT SIDEBAR ═══════ */}
      <aside className="sidebar">
        <div className="sidebar-logo" title="CloudPulse">⚡</div>
        <nav className="sidebar-nav">
          <div className="sidebar-item active" title="Dashboard">📊</div>
        </nav>
        <div className="sidebar-spacer"></div>
      </aside>

      {/* ═══════ MAIN AREA ═══════ */}
      <div className="main-area">
        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              <span className="topbar-breadcrumb-icon">📊</span>
              <span className="topbar-breadcrumb-folder">CloudPulse</span>
              <span className="topbar-breadcrumb-sep">›</span>
              <span className="topbar-breadcrumb-page">Multi-Cloud Dashboard</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-live">
              <span className="topbar-live-dot"></span>
              LIVE
            </div>
            <div className="topbar-time">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="content">
          {/* ═══════ ROW 1: STAT PANELS ═══════ */}
          <div className="stat-row">
            {/* AWS Server */}
            <div className="stat-panel blue" id="stat-aws">
              <div className="stat-panel-badge">
                <span className={`stat-panel-badge-dot ${awsStatus}`}></span>
                {awsStatus === "online" ? "Online" : awsStatus === "checking" ? "..." : "Offline"}
              </div>
              <div className="stat-panel-label">AWS EC2</div>
              <div className="stat-panel-value">
                {awsStatus === "online" ? "UP" : awsStatus === "checking" ? "..." : "DOWN"}
              </div>
              <div className="stat-panel-sub">
                {awsHealth ? `↑ ${formatUptime(awsHealth.uptime_seconds)}` : "52.206.184.80:8000"}
              </div>
            </div>

            {/* Oracle Server */}
            <div className="stat-panel green" id="stat-oracle">
              <div className="stat-panel-badge">
                <span className={`stat-panel-badge-dot ${oracleStatus}`}></span>
                {oracleStatus === "online" ? "Online" : oracleStatus === "checking" ? "..." : "Offline"}
              </div>
              <div className="stat-panel-label">Oracle Cloud</div>
              <div className="stat-panel-value">
                {oracleStatus === "online" ? "UP" : oracleStatus === "checking" ? "..." : "DOWN"}
              </div>
              <div className="stat-panel-sub">
                {oracleHealth ? `↑ ${formatUptime(oracleHealth.uptime_seconds)}` : "152.67.188.94:8000"}
              </div>
            </div>

            {/* Load Balancer */}
            <div className="stat-panel navy" id="stat-lb">
              <div className="stat-panel-badge">
                <span className={`stat-panel-badge-dot ${activeBackends > 0 ? "online" : "offline"}`}></span>
                {activeBackends > 0 ? "Active" : "Down"}
              </div>
              <div className="stat-panel-label">Load Balancer (1)</div>
              <div className="stat-panel-value smaller">
                {activeBackends}<span className="stat-panel-unit">/ 2</span>
              </div>
              <div className="stat-panel-sub">IP: {LB_IP} • Backends: {activeBackends} active</div>
            </div>

            {/* Total Requests */}
            <div className="stat-panel red" id="stat-total">
              <div className="stat-panel-badge">Last 1 hour</div>
              <div className="stat-panel-label">Total Requests</div>
              <div className="stat-panel-value">
                {total}
              </div>
              <div className="stat-panel-sub">
                AWS: {awsCount} ({awsPct}%) • Oracle: {oracleCount} ({oraclePct}%)
              </div>
            </div>
          </div>

          {/* ═══════ ROW 2: LIVE TIMELINE + TRAFFIC RING ═══════ */}
          <div className="panel-row two-one" id="row-live">
            {/* Live Latency Timeline */}
            <div className="panel" id="panel-timeline">
              <div className="panel-header">
                <div className="panel-title"><span className="panel-title-icon">📈</span>Live Response Time</div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Last {trafficHistory.length} polls · {POLL_INTERVAL/1000}s interval</span>
              </div>
              <div className="panel-body">
                <div className="chart-container" style={{ height: "150px" }}>
                  {trafficHistory.length > 1
                    ? <Line data={lineChartData} options={lineChartOptions} />
                    : <div className="empty-state" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>Collecting data…</div>}
                </div>
                <div className="latency-gauges">
                  {[{ label: "AWS", ms: awsAvgMs, status: awsStatus }, { label: "Oracle", ms: oracleAvgMs, status: oracleStatus }].map(({ label, ms, status }) => {
                    const cls = ms === null ? "" : ms < 200 ? "good" : ms < 500 ? "warn" : "bad";
                    const pct = ms !== null ? Math.min((ms / 1000) * 100, 100) : 0;
                    return (
                      <div className="latency-gauge-item" key={label}>
                        <div className="latency-gauge-header">
                          <span className="latency-gauge-label">{label} Latency</span>
                          <span className={`latency-gauge-val ${cls}`}>{ms !== null ? `${ms} ms` : status === "offline" ? "OFFLINE" : "—"}</span>
                        </div>
                        <div className="latency-gauge-track"><div className={`latency-gauge-fill ${cls}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Traffic Distribution Ring */}
            <div className="panel" id="panel-traffic-ring">
              <div className="panel-header"><div className="panel-title"><span className="panel-title-icon">🍩</span>Traffic Split</div></div>
              <div className="panel-body ring-body">
                <div className="doughnut-wrap">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div className="doughnut-center">
                    <div className="doughnut-center-val">{total}</div>
                    <div className="doughnut-center-label">Total</div>
                  </div>
                </div>
                <div className="doughnut-legend">
                  <div className="doughnut-legend-item"><div className="doughnut-legend-dot aws" /><span>AWS</span><strong>{awsPct}%</strong></div>
                  <div className="doughnut-legend-item"><div className="doughnut-legend-dot oracle" /><span>Oracle</span><strong>{oraclePct}%</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ ROW 3: CHART + REQUEST LOG TABLE ═══════ */}
          <div className="panel-row two-one">
            {/* Traffic Chart */}
            <div className="panel" id="panel-traffic">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-title-icon">📊</span>
                  Traffic Distribution
                </div>

              </div>
              <div className="panel-body">
                <div className="chart-container">
                  <Bar data={chartData} options={chartOptions} />
                </div>
                <div className="traffic-bars">
                  <div className="traffic-bar-item">
                    <div className="traffic-bar-color aws"></div>
                    <div className="traffic-bar-info">
                      <div className="traffic-bar-label">AWS Requests</div>
                      <div className="traffic-bar-val">{awsCount}</div>
                    </div>
                    <div className="traffic-bar-pct">{awsPct}%</div>
                  </div>
                  <div className="traffic-bar-item">
                    <div className="traffic-bar-color oracle"></div>
                    <div className="traffic-bar-info">
                      <div className="traffic-bar-label">Oracle Requests</div>
                      <div className="traffic-bar-val">{oracleCount}</div>
                    </div>
                    <div className="traffic-bar-pct">{oraclePct}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Request / Server Detail */}
            <div className="panel" id="panel-server-detail">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-title-icon">🎯</span>
                  Last Routed Request
                </div>

              </div>
              <div className="panel-body">
                <div className="metrics-list">
                  <div className="metrics-row">
                    <span className="metrics-label">Cloud Provider</span>
                    <span className="metrics-val">
                      {lastRequest?.cloud || "Waiting..."}
                    </span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Hostname</span>
                    <span className="metrics-val">{lastRequest?.hostname || "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Region</span>
                    <span className="metrics-val">{lastRequest?.region || "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Timestamp</span>
                    <span className="metrics-val">
                      {lastRequest?.timestamp ? formatTimeShort(lastRequest.timestamp) : "—"}
                    </span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">LB IP</span>
                    <span className="metrics-val" style={{ color: "var(--accent-blue)" }}>{LB_IP}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Active Backends</span>
                    <span className="metrics-val">{activeBackends} / 2</span>
                  </div>
                </div>

                {/* Server health detail */}
                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                    Server Health
                  </div>
                  <div className="health-grid">
                    <div className="health-cell">
                      <div className="health-cell-label">AWS Platform</div>
                      <div className="health-cell-value">{awsHealth?.platform || "—"}</div>
                    </div>
                    <div className="health-cell">
                      <div className="health-cell-label">Oracle Platform</div>
                      <div className="health-cell-value">{oracleHealth?.platform || "—"}</div>
                    </div>
                    <div className="health-cell">
                      <div className="health-cell-label">AWS Memory</div>
                      <div className="health-cell-value">{awsHealth?.memory_usage_percent ? `${awsHealth.memory_usage_percent}%` : "—"}</div>
                    </div>
                    <div className="health-cell">
                      <div className="health-cell-label">Oracle Memory</div>
                      <div className="health-cell-value">{oracleHealth?.memory_usage_percent ? `${oracleHealth.memory_usage_percent}%` : "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ ROW 3: METRICS PANELS ═══════ */}
          <div className="panel-row three-col">
            {/* AWS Metrics */}
            <div className="panel" id="panel-aws-metrics">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-title-icon" style={{ color: "var(--aws-color)" }}>⬡</span>
                  AWS Metrics
                </div>
              </div>
              <div className="panel-body">
                <div className="metrics-list">
                  <div className="metrics-row">
                    <span className="metrics-label">Total Requests</span>
                    <span className="metrics-val">{awsCount || "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Avg Response Time</span>
                    <span className="metrics-val">{awsAvgMs !== null ? `${awsAvgMs} ms` : "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Uptime</span>
                    <span className="metrics-val">{awsUptimeSec > 0 ? formatUptime(awsUptimeSec) : "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">First Seen</span>
                    <span className="metrics-val">{awsFirstSeen.current ? formatTimeShort(awsFirstSeen.current.toISOString()) : "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">SLA (session)</span>
                    <span className={`metrics-val ${slaClass(awsSLA)}`}>{awsSLA !== null ? `${awsSLA}%` : "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Oracle Metrics */}
            <div className="panel" id="panel-oracle-metrics">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-title-icon" style={{ color: "var(--oracle-color)" }}>◈</span>
                  Oracle Metrics
                </div>
              </div>
              <div className="panel-body">
                <div className="metrics-list">
                  <div className="metrics-row">
                    <span className="metrics-label">Total Requests</span>
                    <span className="metrics-val">{oracleCount || "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Avg Response Time</span>
                    <span className="metrics-val">{oracleAvgMs !== null ? `${oracleAvgMs} ms` : "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Uptime</span>
                    <span className="metrics-val">{oracleUptimeSec > 0 ? formatUptime(oracleUptimeSec) : "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">First Seen</span>
                    <span className="metrics-val">{oracleFirstSeen.current ? formatTimeShort(oracleFirstSeen.current.toISOString()) : "—"}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">SLA (session)</span>
                    <span className={`metrics-val ${slaClass(oracleSLA)}`}>{oracleSLA !== null ? `${oracleSLA}%` : "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Overview */}
            <div className="panel" id="panel-system">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-title-icon">🌐</span>
                  System Overview
                </div>
              </div>
              <div className="panel-body">
                <div className="metrics-list">
                  <div className="metrics-row">
                    <span className="metrics-label">Cloud Providers</span>
                    <span className="metrics-val">2</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Poll Interval</span>
                    <span className="metrics-val">3s</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">LB Algorithm</span>
                    <span className="metrics-val">{lbAlgorithm}</span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">AWS Status</span>
                    <span className="metrics-val">
                      <span className={`status-pill ${awsStatus === "online" ? "online" : "offline"}`}>
                        <span className={`status-pill-dot ${awsStatus === "online" ? "online" : "offline"}`}></span>
                        {awsStatus === "online" ? "UP" : "DOWN"}
                      </span>
                    </span>
                  </div>
                  <div className="metrics-row">
                    <span className="metrics-label">Oracle Status</span>
                    <span className="metrics-val">
                      <span className={`status-pill ${oracleStatus === "online" ? "online" : "offline"}`}>
                        <span className={`status-pill-dot ${oracleStatus === "online" ? "online" : "offline"}`}></span>
                        {oracleStatus === "online" ? "UP" : "DOWN"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ ROW 4: REQUEST LOG TABLE ═══════ */}
          <div className="panel-row">
            <div className="panel" id="panel-request-log">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-title-icon">📋</span>
                  Request Log
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {requestLog.length} entries
                </span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Time ▼</th>
                        <th>Cloud Provider</th>
                        <th>Hostname</th>
                        <th>Region</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestLog.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            Waiting for incoming requests…
                          </td>
                        </tr>
                      ) : (
                        requestLog.map((entry) => {
                          const cloudNorm = entry.cloud?.toUpperCase() === "ORACLE" ? "Oracle" : entry.cloud === "AWS" ? "AWS" : entry.cloud;
                          const isAws = cloudNorm === "AWS";
                          return (
                            <tr key={entry.id}>
                              <td>{formatDateTimeShort(entry.time)}</td>
                              <td>
                                <span className={`cloud-tag ${isAws ? "aws" : "oracle"}`}>
                                  <span className={`cloud-tag-dot ${isAws ? "aws" : "oracle"}`}></span>
                                  {cloudNorm}{entry.failover ? " ⚡" : ""}
                                </span>
                              </td>
                              <td>{entry.hostname || "—"}</td>
                              <td>{entry.region || "—"}</td>
                              <td>
                                <span className="status-pill online">
                                  <span className="status-pill-dot online"></span>
                                  OK
                                </span>
                              </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ═══════ TOAST NOTIFICATIONS ═══════ */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-msg">{t.msg}</span>
            <button className="toast-close" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;