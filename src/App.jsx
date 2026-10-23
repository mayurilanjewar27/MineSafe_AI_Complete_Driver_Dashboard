import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertOctagon, AlertTriangle, ArrowDownRight, ArrowUpRight,
  Bell, Camera, CheckCircle2, ChevronDown, CircleHelp, Clock3, Cpu,
  Download, Gauge, HardDrive, LayoutDashboard, LockKeyhole, LogOut,
  Menu, Radio, RefreshCw, Shield, ShieldAlert, ShieldCheck, Siren,
  SlidersHorizontal, UserRound, Users, Wifi, XCircle, Zap
} from "lucide-react";

const API = "/api";

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

const initialHealth = [
  { key: "camera", name: "Forward camera", detail: "Video input", icon: Camera },
  { key: "distance_sensor", name: "Distance sensor", detail: "Obstacle range", icon: Radio },
  { key: "ai_model", name: "AI detection model", detail: "Inference service", icon: Cpu },
  { key: "controller", name: "Vehicle controller", detail: "Control link", icon: Gauge },
  { key: "emergency_circuit", name: "Emergency-stop circuit", detail: "Safety circuit", icon: ShieldCheck },
  { key: "battery", name: "Battery / power", detail: "Power status", icon: Zap }
];

const riskTone = (risk) => risk >= 80 ? "critical" : risk >= 55 ? "danger" : risk >= 30 ? "warning" : "safe";
const statusLabel = (risk) => risk >= 80 ? "CRITICAL" : risk >= 55 ? "DANGER" : risk >= 30 ? "WARNING" : "SAFE";

function App() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(initialHealth.map((item) => ({ ...item, status: "OK" })));
  const [profile, setProfile] = useState({ driver_name: "", driver_id: "", vehicle_id: "MS-VEH-001", shift: "Day shift" });
  const [scenario, setScenario] = useState("safe");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadStatus = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await api("/status");
      setData(result);
      setProfile((current) => (current.driver_name || current.driver_id) ? current : (result.profile || current));
      setScenario(result.scenario || "safe");
      setHealth((old) => old.map((item) => ({ ...item, status: result.health?.[item.key] || "OK" })));
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setError(`${err.message}. Start the Python backend using the instructions in README.md.`);
    } finally {
      setLoading(false);
    }
  }, []); // initial profile is only a fallback

  useEffect(() => {
    loadStatus(true);
    const timer = window.setInterval(() => loadStatus(false), 5000);
    return () => window.clearInterval(timer);
  }, [loadStatus]);

  const doAction = async (path, body = {}, successText = "Updated") => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(path, { method: "POST", body: JSON.stringify(body) });
      setNotice(result.message || successText);
      await loadStatus(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const risk = data?.risk_score ?? 0;
  const tone = riskTone(risk);
  const events = data?.events || [];
  const isActive = Boolean(data?.system_active);
  const healthOk = health.every((item) => item.status === "OK");
  const riskDescription = risk >= 80 ? "Immediate hazard detected in demo scenario." :
    risk >= 55 ? "High risk: operator attention required." :
    risk >= 30 ? "Potential hazard: reduce speed and stay alert." : "No simulated hazard detected.";

  const saveProfile = (event) => {
    event.preventDefault();
    doAction("/profile", profile, "Driver profile saved");
  };

  const exportEvents = () => {
    const rows = [
      ["Timestamp", "Level", "Event", "Details"],
      ...events.map((event) => [event.timestamp, event.level, event.title, event.details])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "minesafe-events.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "driver", label: "Driver & vehicle", icon: UserRound },
    { id: "systems", label: "System health", icon: Activity },
    { id: "events", label: "Safety events", icon: Bell }
  ];

  const counts = useMemo(() => ({
    critical: events.filter((e) => e.level === "CRITICAL").length,
    warning: events.filter((e) => e.level === "WARNING").length
  }), [events]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Shield size={23} strokeWidth={2.4} /></div>
          <div><strong>MineSafe<span> AI</span></strong><small>OPERATOR SAFETY SYSTEM</small></div>
        </div>
        <div className="site-label"><span className="site-dot" /> DEMO CONTROL ROOM</div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeTab === id ? "selected" : ""}`} onClick={() => setActiveTab(id)}>
              <Icon size={18} /><span>{label}</span>
              {id === "events" && events.length > 0 && <span className="nav-count">{events.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <div className="demo-icon"><CircleHelp size={17} /></div>
            <strong>Prototype mode</strong>
            <p>Sensor readings and vehicle actions are simulated. No real vehicle is controlled.</p>
          </div>
          <div className="sidebar-user">
            <div className="avatar"><UserRound size={18} /></div>
            <div className="user-meta"><strong>{profile.driver_name || "Demo operator"}</strong><small>{profile.driver_id || "Driver ID not set"}</small></div>
            <ChevronDown size={15} className="muted" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>MineSafe AI</span><span className="crumb-sep">/</span><strong>{navItems.find((item) => item.id === activeTab)?.label}</strong></div>
          <div className="top-actions">
            <span className="demo-pill"><span /> DEMO ENVIRONMENT</span>
            <span className="top-divider" />
            <span className="updated"><Clock3 size={14} /> Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            <button className="icon-button" title="Refresh status" onClick={() => loadStatus(true)}><RefreshCw size={17} /></button>
          </div>
        </header>

        {error && <div className="banner error-banner"><AlertTriangle size={18} /><div><strong>Connection issue</strong><span>{error}</span></div></div>}
        {notice && <div className="banner success-banner"><CheckCircle2 size={18} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><XCircle size={16} /></button></div>}

        {activeTab === "overview" && (
          <>
            <section className="page-heading">
              <div><div className="eyebrow">LIVE MONITORING <span className="live-dot" /></div><h1>Driver Safety Dashboard</h1><p>Monitor operator readiness, hazard risk and connected system status.</p></div>
              <div className="heading-actions">
                <button className="button secondary" onClick={exportEvents}><Download size={16} /> Export events</button>
                <button className={`button ${isActive ? "danger-button" : "primary"}`} disabled={busy || (!isActive && !healthOk)} onClick={() => doAction(isActive ? "/deactivate" : "/activate", {}, isActive ? "Demo deactivated" : "Safety demo activated")}>
                  {isActive ? <LogOut size={16} /> : <ShieldCheck size={16} />}{isActive ? "Deactivate demo" : "Activate safety demo"}
                </button>
              </div>
            </section>

            <section className={`readiness-strip ${isActive ? "readiness-active" : ""}`}>
              <div className={`readiness-icon ${isActive ? "good" : "neutral"}`}>{isActive ? <ShieldCheck size={23} /> : <LockKeyhole size={23} />}</div>
              <div className="readiness-copy"><strong>{isActive ? "Safety demo is active" : "Safety system is not activated"}</strong><p>{isActive ? "The dashboard is processing simulated scenario data." : "Save a driver profile and confirm the simulated system checks before activating."}</p></div>
              <div className={`readiness-state ${isActive ? "good-text" : "muted"}`}><span />{isActive ? "ACTIVE" : "STANDBY"}</div>
            </section>

            <section className="metric-grid">
              <MetricCard icon={ShieldAlert} label="Collision risk score" value={`${risk}/100`} sub={statusLabel(risk)} tone={tone} foot={riskDescription} />
              <MetricCard icon={Camera} label="Detected object" value={data?.detected_object || "None"} sub={data?.object_distance_m == null ? "No object in scenario" : `${data.object_distance_m} m estimated`} tone={tone} foot="Simulated camera / sensor result" />
              <MetricCard icon={Gauge} label="Vehicle state" value={data?.vehicle_action || "STANDBY"} sub={data?.vehicle_speed_kmh != null ? `${data.vehicle_speed_kmh} km/h simulated` : "No live telemetry"} tone={data?.vehicle_action === "STOP REQUESTED" ? "critical" : "safe"} foot="No command is sent to a real vehicle" />
              <MetricCard icon={Activity} label="System checks" value={`${health.filter((item) => item.status === "OK").length}/${health.length}`} sub={healthOk ? "All demo checks pass" : "Faults require attention"} tone={healthOk ? "safe" : "danger"} foot="Software simulation only" />
            </section>

            <section className="content-grid">
              <div className="panel risk-panel">
                <div className="panel-heading"><div><h2>Hazard assessment</h2><p>Current simulated environment analysis</p></div><span className={`status-badge ${tone}`}>{statusLabel(risk)}</span></div>
                <div className="risk-layout">
                  <div className={`risk-gauge ${tone}`} style={{ "--risk": `${risk * 3.6}deg` }}><div className="gauge-inner"><span>RISK SCORE</span><strong>{risk}</strong><small>out of 100</small></div></div>
                  <div className="risk-details">
                    <div className="risk-detail"><span className="detail-dot object" /><div><small>Detected object</small><strong>{data?.detected_object || "Clear path"}</strong></div></div>
                    <div className="risk-detail"><span className="detail-dot distance" /><div><small>Estimated distance</small><strong>{data?.object_distance_m == null ? "—" : `${data.object_distance_m} metres`}</strong></div></div>
                    <div className="risk-detail"><span className="detail-dot visibility" /><div><small>Visibility estimate</small><strong>{data?.visibility || "Normal"}</strong></div></div>
                    <div className="risk-detail"><span className="detail-dot action" /><div><small>Recommended action</small><strong>{data?.recommended_action || "Continue monitoring"}</strong></div></div>
                  </div>
                </div>
                <div className={`risk-message ${tone}`}><AlertTriangle size={17} /><span>{riskDescription}</span></div>
                <div className="risk-legend"><span><i className="legend-safe" /> 0–29 Safe</span><span><i className="legend-warn" /> 30–54 Warning</span><span><i className="legend-danger" /> 55–79 Danger</span><span><i className="legend-critical" /> 80–100 Critical</span></div>
              </div>

              <div className="panel scenario-panel">
                <div className="panel-heading"><div><h2>Demo scenario simulator</h2><p>Use scenarios to test dashboard responses</p></div><SlidersHorizontal size={19} className="muted" /></div>
                <label className="field-label" htmlFor="scenario">Select test scenario</label>
                <select id="scenario" className="select-field" value={scenario} onChange={(e) => { setScenario(e.target.value); doAction("/scenario", { scenario: e.target.value }, "Scenario changed"); }}>
                  <option value="safe">Safe path — no obstacle</option>
                  <option value="person_warning">Person detected — warning distance</option>
                  <option value="critical_obstacle">Critical obstacle — immediate stop alert</option>
                  <option value="low_visibility">Low visibility — dust / fog simulation</option>
                  <option value="drowsiness">Driver attention — drowsiness alert simulation</option>
                </select>
                <div className="scenario-preview">
                  <div className={`scenario-visual ${scenario}`}>
                    {scenario === "safe" ? <CheckCircle2 size={40} /> : scenario === "person_warning" ? <Users size={40} /> : scenario === "drowsiness" ? <UserRound size={40} /> : scenario === "low_visibility" ? <Activity size={40} /> : <AlertOctagon size={40} />}
                    <span>{scenario.replaceAll("_", " ").toUpperCase()}</span>
                  </div>
                  <div className="scenario-info"><strong>{scenario === "safe" ? "Clear route" : scenario === "person_warning" ? "Person in proximity" : scenario === "critical_obstacle" ? "Obstacle too close" : scenario === "low_visibility" ? "Visibility reduced" : "Driver attention risk"}</strong><p>{scenario === "safe" ? "No simulated hazard is present." : scenario === "person_warning" ? "A person is shown within the warning range." : scenario === "critical_obstacle" ? "Critical proximity triggers a stop recommendation." : scenario === "low_visibility" ? "Simulates dust or fog affecting visibility." : "Simulates an attention warning; it does not diagnose drowsiness."}</p></div>
                </div>
                <button className="button primary full-width" disabled={busy} onClick={() => doAction("/scenario", { scenario }, "Scenario applied")}><RefreshCw size={16} /> Apply selected scenario</button>
                <p className="micro-note"><LockKeyhole size={13} /> Test data only — not a certified safety controller.</p>
              </div>
            </section>

            <section className="bottom-grid">
              <div className="panel">
                <div className="panel-heading"><div><h2>Driver readiness</h2><p>Pre-shift status overview</p></div><button className="text-button" onClick={() => setActiveTab("driver")}>View profile <ArrowUpRight size={14} /></button></div>
                <div className="readiness-list">
                  <ReadinessRow icon={UserRound} label="Driver profile" detail={profile.driver_name ? `${profile.driver_name} · ${profile.driver_id || "ID not set"}` : "Driver profile not completed"} good={Boolean(profile.driver_name && profile.driver_id)} />
                  <ReadinessRow icon={Activity} label="Attention monitoring" detail={data?.driver_attention || "NOT CONNECTED"} good={false} neutral />
                  <ReadinessRow icon={ShieldCheck} label="Alcohol screening" detail="NOT CONNECTED" good={false} neutral />
                  <ReadinessRow icon={HardDrive} label="Safety hardware" detail="Simulation only" good={false} neutral />
                </div>
              </div>
              <div className="panel">
                <div className="panel-heading"><div><h2>Recent safety events</h2><p>Latest system and hazard records</p></div><button className="text-button" onClick={() => setActiveTab("events")}>View all <ArrowUpRight size={14} /></button></div>
                <div className="event-list compact">
                  {events.slice(0, 4).map((event) => <EventRow key={event.id} event={event} />)}
                  {events.length === 0 && <div className="empty-state"><Bell size={22} /><span>No events recorded yet</span><small>Activate the demo and apply a scenario to create events.</small></div>}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "driver" && (
          <section className="page-section">
            <div className="page-heading"><div><div className="eyebrow">PRE-SHIFT CHECK</div><h1>Driver & vehicle profile</h1><p>Enter the demo operator details before running a safety simulation.</p></div></div>
            <div className="panel form-panel">
              <div className="panel-heading"><div><h2>Operator information</h2><p>Fields marked with * are required for this demo.</p></div><UserRound size={20} className="muted" /></div>
              <form onSubmit={saveProfile} className="profile-form">
                <FormField label="Driver full name *" value={profile.driver_name} onChange={(v) => setProfile({ ...profile, driver_name: v })} placeholder="e.g. Operator One" required />
                <FormField label="Driver ID *" value={profile.driver_id} onChange={(v) => setProfile({ ...profile, driver_id: v })} placeholder="e.g. DRV-1042" required />
                <FormField label="Vehicle ID *" value={profile.vehicle_id} onChange={(v) => setProfile({ ...profile, vehicle_id: v })} placeholder="e.g. MS-VEH-001" required />
                <div className="form-field"><label htmlFor="shift">Shift *</label><select id="shift" className="select-field" value={profile.shift} onChange={(e) => setProfile({ ...profile, shift: e.target.value })}><option>Day shift</option><option>Night shift</option><option>Rotating shift</option></select></div>
                <div className="form-actions"><button type="button" className="button secondary" onClick={() => setProfile({ driver_name: "", driver_id: "", vehicle_id: "MS-VEH-001", shift: "Day shift" })}>Reset form</button><button className="button primary" type="submit" disabled={busy}><CheckCircle2 size={16} /> Save profile</button></div>
              </form>
            </div>
            <div className="notice-panel"><ShieldCheck size={20} /><div><strong>Prototype limitation</strong><p>A saved profile is for this local demo only. It does not authenticate identity, verify training, check fitness for duty, or grant real vehicle access.</p></div></div>
          </section>
        )}

        {activeTab === "systems" && (
          <section className="page-section">
            <div className="page-heading"><div><div className="eyebrow">DIAGNOSTICS</div><h1>System health</h1><p>Inspect and simulate health status for each subsystem.</p></div><button className="button secondary" onClick={() => loadStatus(true)}><RefreshCw size={16} /> Refresh checks</button></div>
            <div className="health-summary"><div className="summary-icon"><Activity size={23} /></div><div><strong>{healthOk ? "All simulated checks passing" : "One or more simulated faults detected"}</strong><p>{health.filter((item) => item.status === "OK").length} of {health.length} subsystems report OK.</p></div><span className={`status-badge ${healthOk ? "safe" : "danger"}`}>{healthOk ? "HEALTHY" : "FAULT"}</span></div>
            <div className="health-grid">
              {health.map(({ key, name, detail, icon: Icon, status }) => <div className="panel health-card" key={key}><div className="health-card-top"><div className="health-icon"><Icon size={21} /></div><span className={`health-status ${status === "OK" ? "ok" : "fault"}`}><span />{status}</span></div><h3>{name}</h3><p>{detail}</p><label className="field-label" htmlFor={`health-${key}`}>Demo status</label><select id={`health-${key}`} className="select-field" value={status} onChange={(e) => doAction("/health", { key, status: e.target.value }, `${name} status updated`)}><option value="OK">OK — pass</option><option value="FAULT">FAULT — fail</option><option value="NOT_CONNECTED">NOT CONNECTED</option></select></div>)}
            </div>
            <div className="notice-panel warning-notice"><AlertTriangle size={20} /><div><strong>Activation interlock (demo only)</strong><p>The UI prevents activation if a simulated check is faulty. This is not a real safety-rated interlock. Real equipment requires independent, validated hardware safety systems.</p></div></div>
          </section>
        )}

        {activeTab === "events" && (
          <section className="page-section">
            <div className="page-heading"><div><div className="eyebrow">AUDIT TRAIL</div><h1>Safety events</h1><p>Review simulated hazards, operator actions and subsystem status changes.</p></div><div className="heading-actions"><button className="button secondary" onClick={exportEvents}><Download size={16} /> Export CSV</button><button className="button secondary" onClick={() => doAction("/events/clear", {}, "Event history cleared")}><XCircle size={16} /> Clear history</button></div></div>
            <div className="event-stats"><div className="panel event-stat"><span className="stat-icon critical"><AlertOctagon size={18} /></span><div><small>Critical events</small><strong>{counts.critical}</strong></div></div><div className="panel event-stat"><span className="stat-icon warning"><AlertTriangle size={18} /></span><div><small>Warning events</small><strong>{counts.warning}</strong></div></div><div className="panel event-stat"><span className="stat-icon neutral"><Bell size={18} /></span><div><small>Total events</small><strong>{events.length}</strong></div></div></div>
            <div className="panel events-table-panel"><div className="panel-heading"><div><h2>Event log</h2><p>Newest events appear first.</p></div><span className="status-badge neutral">{events.length} RECORDS</span></div>
              {events.length ? <div className="events-table-wrap"><table className="events-table"><thead><tr><th>Time</th><th>Severity</th><th>Event</th><th>Details</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td className="time-cell">{event.timestamp}</td><td><span className={`status-badge ${event.level.toLowerCase()}`}>{event.level}</span></td><td><strong>{event.title}</strong></td><td className="details-cell">{event.details}</td></tr>)}</tbody></table></div> : <div className="empty-state large"><Bell size={28} /><strong>No safety events</strong><span>Use the demo scenario simulator to generate test events.</span></div>}
            </div>
          </section>
        )}

        <footer className="footer"><span>© {new Date().getFullYear()} MineSafe AI · Educational prototype</span><span><span className="footer-dot" /> Backend {error ? "disconnected" : loading ? "connecting…" : "connected"} · Demo data only</span></footer>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, tone, foot }) {
  return <div className="metric-card"><div className="metric-top"><span className={`metric-icon ${tone}`}><Icon size={19} /></span><span className={`metric-trend ${tone}`}>{tone === "safe" ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{sub}</span></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-foot">{foot}</div></div>;
}
function ReadinessRow({ icon: Icon, label, detail, good, neutral }) {
  return <div className="readiness-row"><span className={`readiness-row-icon ${good ? "good" : ""}`}><Icon size={16} /></span><div className="readiness-row-copy"><strong>{label}</strong><small>{detail}</small></div><span className={`mini-state ${good ? "good" : neutral ? "neutral" : "danger"}`}><span />{good ? "READY" : neutral ? "UNVERIFIED" : "INCOMPLETE"}</span></div>;
}
function EventRow({ event }) {
  return <div className="event-row"><span className={`event-symbol ${event.level.toLowerCase()}`}>{event.level === "CRITICAL" ? <AlertOctagon size={16} /> : event.level === "WARNING" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}</span><div className="event-row-copy"><strong>{event.title}</strong><small>{event.details}</small></div><span className="event-time">{event.timestamp.split(" ").slice(-1)[0]}</span></div>;
}
function FormField({ label, value, onChange, placeholder, required }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <div className="form-field"><label htmlFor={id}>{label}</label><input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} /></div>;
}

export default App;
