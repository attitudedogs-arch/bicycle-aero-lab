// Bicycle Aero Lab — Wind-Tunnel Instrument direction. The viewport is the observation bay; controls expose measurable physical variables.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, CheckCircle2, ChevronDown, CircleHelp, Download, FileJson2, Gauge, History, Play, RotateCcw, Settings2, Wind, Zap } from "lucide-react";

const copper = "#c96b3b";
const blue = "#78c9d8";
const savedCasesKey = "bicycle-aero-lab:saved-geometry-cases";

type SavedCase = {
  id: string;
  name: string;
  model: string;
  wheelbase: number;
  wheelDiameter: number;
  riderHeight: number;
  preparedAt: string;
  status: string;
  flowModel?: string;
  solverModel?: string;
  turbulenceModel?: string;
  groundCondition?: string;
  meshTarget?: string;
  boundaryLayerLayers?: number;
  domainLength?: number;
  iterations?: number;
  residualExponent?: number;
};

function createCaseId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `case-${Date.now()}`;
}

function readSavedCases(): SavedCase[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(savedCasesKey);
    return stored ? (JSON.parse(stored) as SavedCase[]) : [];
  } catch {
    return [];
  }
}

function makeLine(points: THREE.Vector3[], color: string, opacity = 0.68) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(geometry, material);
}

function addBike(scene: THREE.Scene) {
  const bike = new THREE.Group();
  bike.name = "bicycle-and-rider";
  const carbon = new THREE.MeshStandardMaterial({ color: 0x27313b, roughness: 0.34, metalness: 0.6 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.85 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc96b3b, roughness: 0.3, metalness: 0.45 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc88f72, roughness: 0.7 });
  const kit = new THREE.MeshStandardMaterial({ color: 0x667f8b, roughness: 0.55 });

  const wheel = (x: number) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.025, 10, 48), tire);
    w.rotation.y = Math.PI / 2; w.position.set(x, 0.6, 0); bike.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), copperMat);
    hub.rotation.z = Math.PI / 2; hub.position.set(x, 0.6, 0); bike.add(hub);
  };
  wheel(-1.05); wheel(1.05);
  const tube = (a: THREE.Vector3, b: THREE.Vector3, radius = 0.045, material = carbon) => {
    const direction = new THREE.Vector3().subVectors(b, a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    bike.add(mesh);
  };
  const rear = new THREE.Vector3(-1.05, 0.6, 0), crankPoint = new THREE.Vector3(-0.16, 0.56, 0), head = new THREE.Vector3(0.69, 0.88, 0), seat = new THREE.Vector3(-0.48, 1.16, 0);
  tube(rear, crankPoint); tube(rear, seat); tube(seat, crankPoint); tube(crankPoint, head); tube(seat, head, 0.052, copperMat);
  tube(head, new THREE.Vector3(1.05, 0.6, 0), 0.04); tube(head, new THREE.Vector3(0.98, 1.08, 0), 0.035);
  tube(new THREE.Vector3(0.95, 1.08, 0), new THREE.Vector3(0.62, 1.1, 0), 0.035, copperMat);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.1), carbon); saddle.position.set(-0.48, 1.2, 0); bike.add(saddle);
  const crankDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 16), copperMat); crankDisc.rotation.x = Math.PI / 2; crankDisc.position.set(-0.16, 0.56, 0); bike.add(crankDisc);

  // Simplified rider, fixed aero position.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.54, 6, 12), kit); torso.rotation.z = -0.98; torso.position.set(-0.02, 1.58, 0); bike.add(torso);
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), skin); headMesh.position.set(0.38, 1.86, 0); bike.add(headMesh);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.75), carbon); helmet.position.set(0.38, 1.9, 0); bike.add(helmet);
  tube(new THREE.Vector3(0.12, 1.52, 0), new THREE.Vector3(0.62, 1.16, 0), 0.065, skin);
  tube(new THREE.Vector3(-0.17, 1.34, 0), new THREE.Vector3(-0.16, 0.72, 0), 0.075, kit);
  tube(new THREE.Vector3(-0.16, 0.72, 0), new THREE.Vector3(0.22, 0.55, 0), 0.045, skin);
  bike.scale.set(1.12, 1.12, 1.12);
  scene.add(bike);
  return bike;
}

function addAirflow(scene: THREE.Scene, intensity: number) {
  const group = new THREE.Group(); group.name = "airflow-streamlines";
  for (let row = 0; row < 9; row++) {
    const y = 0.2 + row * 0.28;
    const z = -1.1 + (row % 3) * 0.55;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      const x = -3 + i * 0.42;
      const disturbance = i > 6 ? Math.sin(i * 0.75 + row) * 0.11 * intensity * (i - 5) / 8 : 0;
      points.push(new THREE.Vector3(x, y + disturbance, z + Math.sin(i * 0.5 + row) * 0.035));
    }
    group.add(makeLine(points, row % 3 === 0 ? copper : blue, row % 3 === 0 ? 0.78 : 0.46));
  }
  scene.add(group);
  return group;
}

function Scene({ windAngle, airflow, resetSignal }: { windAngle: number; airflow: boolean; resetSignal: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x10171b);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 0.95, 0);
    let azimuth = 0.62; let elevation = 0.28; let radius = 6.8;
    const updateCamera = () => { const horizontal = Math.cos(elevation) * radius; camera.position.set(Math.sin(azimuth) * horizontal, target.y + Math.sin(elevation) * radius, Math.cos(azimuth) * horizontal); camera.lookAt(target); };
    updateCamera();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true; host.current.appendChild(renderer.domElement);
    const ambient = new THREE.HemisphereLight(0xdef3f2, 0x172027, 2.1); scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffe2c8, 2.2); key.position.set(-3, 5, 4); key.castShadow = true; scene.add(key);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshStandardMaterial({ color: 0x182127, roughness: 0.9, metalness: 0.05 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.04; floor.receiveShadow = true; scene.add(floor);
    const tunnel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 3, 3.2)), new THREE.LineBasicMaterial({ color: 0x607780, transparent: true, opacity: 0.32 })); tunnel.position.y = 1.2; scene.add(tunnel);
    const bike = addBike(scene); const air = addAirflow(scene, airflow ? 1 : 0.42);
    bike.rotation.y = THREE.MathUtils.degToRad(-windAngle * 0.18);
    let frame = 0; let raf = 0; let dragging = false; let lastX = 0; let lastY = 0;
    const canvas = renderer.domElement;
    const onPointerDown = (event: PointerEvent) => { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); canvas.style.cursor = "grabbing"; };
    const onPointerMove = (event: PointerEvent) => { if (!dragging) return; azimuth -= (event.clientX - lastX) * 0.008; elevation = THREE.MathUtils.clamp(elevation + (event.clientY - lastY) * 0.006, -0.05, 0.8); lastX = event.clientX; lastY = event.clientY; updateCamera(); };
    const onPointerUp = (event: PointerEvent) => { dragging = false; canvas.releasePointerCapture(event.pointerId); canvas.style.cursor = "grab"; };
    const onWheel = (event: WheelEvent) => { event.preventDefault(); radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.004, 4.6, 10); updateCamera(); };
    canvas.style.cursor = "grab"; canvas.addEventListener("pointerdown", onPointerDown); canvas.addEventListener("pointermove", onPointerMove); canvas.addEventListener("pointerup", onPointerUp); canvas.addEventListener("pointercancel", onPointerUp); canvas.addEventListener("wheel", onWheel, { passive: false });
    const resize = () => { if (!host.current) return; const { width, height } = host.current.getBoundingClientRect(); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
    const animate = () => { frame += 0.006; air.position.x = airflow ? Math.sin(frame) * 0.05 : 0; bike.position.y = Math.sin(frame * 0.55) * 0.008; renderer.render(scene, camera); raf = requestAnimationFrame(animate); };
    resize(); window.addEventListener("resize", resize); animate();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", onPointerDown); canvas.removeEventListener("pointermove", onPointerMove); canvas.removeEventListener("pointerup", onPointerUp); canvas.removeEventListener("pointercancel", onPointerUp); canvas.removeEventListener("wheel", onWheel); renderer.dispose(); host.current?.removeChild(renderer.domElement); };
  }, [windAngle, airflow, resetSignal]);
  return <div ref={host} className="scene-host" aria-label="Interactive 3D bicycle and airflow preview" />;
}

function Metric({ label, value, unit, tone = "default" }: { label: string; value: string; unit?: string; tone?: "default" | "copper" }) {
  return <div className={`metric ${tone === "copper" ? "metric-copper" : ""}`}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}

export default function Home() {
  const [speed, setSpeed] = useState(42);
  const [windAngle, setWindAngle] = useState(0);
  const [temperature, setTemperature] = useState(20);
  const [pressure, setPressure] = useState(1013);
  const [riderMass, setRiderMass] = useState(72);
  const [bikeMass, setBikeMass] = useState(8.4);
  const [wheelbase, setWheelbase] = useState(1.02);
  const [wheelDiameter, setWheelDiameter] = useState(0.70);
  const [riderHeight, setRiderHeight] = useState(1.78);
  const [geometryStatus, setGeometryStatus] = useState("Preview only");
  const [preparedAt, setPreparedAt] = useState<Date | null>(null);
  const [airflow, setAirflow] = useState(true);
  const [running, setRunning] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [modified, setModified] = useState(false);
  const [caseName, setCaseName] = useState("Baseline geometry");
  const [flowModel, setFlowModel] = useState("Steady external flow");
  const [solverModel, setSolverModel] = useState("RANS pressure-based");
  const [turbulenceModel, setTurbulenceModel] = useState("k-omega SST");
  const [groundCondition, setGroundCondition] = useState("Moving ground");
  const [meshTarget, setMeshTarget] = useState("2.5–4.0 M cells");
  const [boundaryLayerLayers, setBoundaryLayerLayers] = useState(12);
  const [domainLength, setDomainLength] = useState(6);
  const [iterations, setIterations] = useState(800);
  const [residualExponent, setResidualExponent] = useState(4);
  const [savedCases, setSavedCases] = useState<SavedCase[]>(readSavedCases);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState("Definition in progress");
  const airDensity = Number(((pressure * 100) / (287.05 * (temperature + 273.15))).toFixed(3));
  useEffect(() => {
    try { window.localStorage.setItem(savedCasesKey, JSON.stringify(savedCases)); } catch { /* Storage can be unavailable in private browsing. */ }
  }, [savedCases]);
  const readinessChecks = [preparedAt !== null, flowModel.length > 0, solverModel.length > 0, turbulenceModel.length > 0, meshTarget.length > 0, boundaryLayerLayers >= 10, domainLength >= 5, iterations >= 500];
  const readinessScore = Math.round((readinessChecks.filter(Boolean).length / readinessChecks.length) * 100);
  const markSimulationChanged = () => { if (preparedAt) setSimulationStatus("Settings changed / review required"); };
  const markGeometryChanged = () => { setGeometryStatus("Preview only"); setPreparedAt(null); setSimulationStatus("Definition in progress"); };
  const prepareGeometry = () => { setGeometryStatus("Spec ready / mesh pending"); setPreparedAt(new Date()); setSimulationStatus(readinessScore === 100 ? "Case ready for solver handoff" : "Spec ready / mesh pending"); };
  const saveCase = () => {
    if (!preparedAt) return;
    const nextCase: SavedCase = { id: createCaseId(), name: caseName.trim() || "Untitled geometry case", model: "Aero road / R-01", wheelbase, wheelDiameter, riderHeight, preparedAt: preparedAt.toISOString(), status: simulationStatus, flowModel, solverModel, turbulenceModel, groundCondition, meshTarget, boundaryLayerLayers, domainLength, iterations, residualExponent };
    setSavedCases((current) => [nextCase, ...current].slice(0, 8));
    setHistoryOpen(true);
  };
  const restoreCase = (savedCase: SavedCase) => {
    setCaseName(savedCase.name);
    setWheelbase(savedCase.wheelbase);
    setWheelDiameter(savedCase.wheelDiameter);
    setRiderHeight(savedCase.riderHeight);
    setGeometryStatus("Spec ready / mesh pending");
    setSimulationStatus(savedCase.status);
    setFlowModel(savedCase.flowModel ?? "Steady external flow");
    setSolverModel(savedCase.solverModel ?? "RANS pressure-based");
    setTurbulenceModel(savedCase.turbulenceModel ?? "k-omega SST");
    setGroundCondition(savedCase.groundCondition ?? "Moving ground");
    setMeshTarget(savedCase.meshTarget ?? "2.5–4.0 M cells");
    setBoundaryLayerLayers(savedCase.boundaryLayerLayers ?? 12);
    setDomainLength(savedCase.domainLength ?? 6);
    setIterations(savedCase.iterations ?? 800);
    setResidualExponent(savedCase.residualExponent ?? 4);
    setPreparedAt(new Date(savedCase.preparedAt));
    setHistoryOpen(false);
  };
  const deleteCase = (id: string) => setSavedCases((current) => current.filter((savedCase) => savedCase.id !== id));
  const downloadManifest = () => {
    const manifest = {
      schema: "bicycle-aero-lab.geometry.v1",
      model: "Aero road / R-01",
      coordinateSystem: "X forward · Y up · Z rider-right",
      posture: "Rider fixed aero",
      dimensions: { wheelbase_m: wheelbase, wheelDiameter_m: wheelDiameter, riderHeight_m: riderHeight },
      simulation: { flowModel, solverModel, turbulenceModel, groundCondition, airTemperature_C: temperature, staticPressure_hPa: pressure, groundSpeed_kmh: speed, crosswindAngle_deg: windAngle },
      mesh: { targetCells: meshTarget, boundaryLayerLayers, domainLength_m: domainLength, geometry: "simplified preview", watertightCheck: "pending" },
      convergence: { maxIterations: iterations, residualTargetExponent: residualExponent },
      readiness: { scorePercent: readinessScore, status: simulationStatus },
      preparedAt: preparedAt?.toISOString() ?? new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bicycle-aero-lab-R-01-geometry.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const run = () => { setRunning(true); window.setTimeout(() => setRunning(false), 1400); };
  return <main className="lab-shell">
    <aside className="lab-rail">
      <div className="brand-lockup"><img src="/manus-storage/bicycle-aero-lab-mark_3640483a.png" alt="" /><div><div className="eyebrow">BICYCLE AERO LAB / 01</div><div className="brand-name">Wind-tunnel instrument</div><div className="brand-subline"><span className="trace-rule" /> MEASURED AIR / ITERATION</div></div></div>
      <div className="rail-section"><div className="eyebrow">EXPERIMENT</div><div className="experiment-name">Road bike / {modified ? "modified case" : "baseline"}</div><div className="status-row"><span className={`status-dot ${running ? "is-running" : ""}`} />{running ? "CALCULATING" : "READY TO RUN"}<span className="run-id">RUN 001</span></div></div>
      <div className="rail-section"><div className="eyebrow">MODEL LIBRARY</div><button className="rail-select">Aero road / R-01 <ChevronDown size={14} /></button><button className="rail-select muted">Rider / fixed aero <ChevronDown size={14} /></button><button className={`integration-toggle ${modified ? "selected" : ""}`} onClick={() => setModified(!modified)}><span><b className="field-trace" />{modified ? "Aero bottle / active" : "Add shape integration"}</span><span>{modified ? "ON" : "+"}</span></button></div>
      <div className="rail-section rail-note"><div className="eyebrow">PROTOTYPE NOTE</div><p>This visualizes the first instrument pass. Solver data will replace the preview field in the next stage.</p></div>
      <div className="rail-bottom"><button className="icon-button"><Settings2 size={16} /></button><span>v0.1 / local study</span><CircleHelp size={15} /></div>
    </aside>
    <section className="lab-main">
      <header className="topbar"><div><div className="eyebrow">OBSERVATION BAY / CASE 01</div><h1>See what the air is doing.</h1></div><div className="top-actions"><span className="data-chip"><span className="chip-dot" />SIMULATION PREVIEW</span><button className="ghost-button" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen}><History size={15} /> Cases <span className="case-count">{savedCases.length}</span></button></div></header>
      {historyOpen && <section className="history-panel" aria-label="Saved geometry cases"><div className="history-heading"><div><div className="eyebrow">CASE ARCHIVE / LOCAL</div><h2>Prepared geometry cases.</h2><p>Saved in this browser only. Restore a specification to continue working from its dimensions.</p></div><button className="history-close" onClick={() => setHistoryOpen(false)} aria-label="Close case archive">Close</button></div>{savedCases.length === 0 ? <div className="history-empty"><History size={18} /><strong>No saved cases yet.</strong><span>Prepare a geometry specification, then save it here for quick comparison.</span></div> : <div className="history-list">{savedCases.map((savedCase) => <article className="history-row" key={savedCase.id}><div className="history-row-main"><div className="history-row-title"><strong>{savedCase.name}</strong><span className="history-status">{savedCase.status}</span></div><span>{savedCase.model} · prepared {new Date(savedCase.preparedAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span><small>Wheelbase {savedCase.wheelbase.toFixed(2)} m · wheel Ø {savedCase.wheelDiameter.toFixed(2)} m · rider {savedCase.riderHeight.toFixed(2)} m</small></div><div className="history-row-actions"><button className="restore-button" onClick={() => restoreCase(savedCase)}>Restore</button><button className="delete-button" onClick={() => deleteCase(savedCase.id)}>Delete</button></div></article>)}</div>}</section>}
      <div className="workspace-grid">
        <section className="viewport-card"><div className="viewport-header"><div><span className="eyebrow">3D FLOW FIELD</span><div className="viewport-title">Single rider · steady external flow</div></div><div className="viewport-tools"><button className={`mini-toggle ${airflow ? "active" : ""}`} onClick={() => setAirflow(!airflow)}><Wind size={14} /> Streamlines</button><button className="mini-toggle" onClick={() => setResetSignal((value) => value + 1)}><RotateCcw size={14} /> Reset view</button></div></div><div className="viewport"><Scene windAngle={windAngle} airflow={airflow} resetSignal={resetSignal} /><div className="viewport-overlay"><span>VELOCITY MAGNITUDE</span><div className="legend"><i className="legend-cool" /> 0 <i className="legend-hot" /> 18 m/s</div></div><div className="sensor-tag sensor-inlet">S-01 / INLET</div><div className="sensor-tag sensor-wake">S-04 / WAKE FIELD</div><div className="calibration-line"><span>0</span><i /><i /><i /><i /><span>3.0 m</span></div><div className="axis"><span>Y</span><span>X</span><span>Z</span></div></div><div className="viewport-footer"><span><b className="live-mark" /> Geometry preview</span><span>Mesh status <strong>not generated</strong></span><span>Drag to orbit · wheel to zoom</span></div></section>
        <aside className="results-card"><div className="card-kicker"><span className="eyebrow">RESULT LEDGER</span><span className="confidence">PREVIEW</span></div><div className="drag-readout"><span>{modified ? "Estimated drag force / modified" : "Estimated drag force / baseline"}</span><strong>{modified ? "30.6" : "31.8"}<small>N</small></strong><span className="delta positive">{modified ? "↓ 7.8% vs baseline" : "↓ 4.2% vs reference"}</span></div><div className="metric-list"><Metric label="CdA" value={modified ? "0.274" : "0.286"} unit="m²" tone="copper" /><Metric label="Power at speed" value="287" unit="W" /><Metric label="Air density" value={String(airDensity)} unit="kg/m³" /><Metric label="Flow state" value="Steady" /></div><div className="result-note"><Zap size={14} /><span>Measured values will appear after a CFD case is completed.</span></div><div className="wake-inset"><img src="/manus-storage/bicycle-aero-lab-wake_a66155fa.png" alt="Preview of a bicycle wake field" /><span>WAKE PREVIEW / NEXT SOLVER PASS</span></div></aside>
      </div>
      <section className="control-strip" style={{ backgroundImage: "linear-gradient(90deg, rgba(248,247,242,.98) 0%, rgba(248,247,242,.94) 58%, rgba(248,247,242,.72) 100%), url('/manus-storage/bicycle-aero-lab-terrain_8efdba22.png')", backgroundSize: "cover", backgroundPosition: "right center" }}><div className="control-heading"><div className="eyebrow">CASE PARAMETERS</div><h2>{modified ? "Compare the integration against baseline." : "Run the baseline before changing the shape."}</h2><p>These controls define the first steady-flow experiment.</p></div><div className="control-field"><div className="field-label"><span><b className="field-trace" />Ground speed</span><strong>{speed} <small>km/h</small></strong></div><input type="range" min="10" max="80" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></div><div className="control-field"><div className="field-label"><span><b className="field-trace" />Crosswind angle</span><strong>{windAngle > 0 ? "+" : ""}{windAngle} <small>°</small></strong></div><input type="range" min="-30" max="30" value={windAngle} onChange={(e) => setWindAngle(Number(e.target.value))} /></div><button className="run-button" onClick={run} disabled={running}><Play size={16} fill="currentColor" />{running ? "Calculating" : modified ? "Compare case" : "Run baseline"}</button></section>
      <section className="advanced-panel"><div className="advanced-heading"><div className="eyebrow">ADVANCED PARAMETERS / CASE 01</div><h2>Define the physical test conditions.</h2><p>These values will become solver inputs after geometry and mesh preparation.</p></div><div className="param-group"><div className="param-group-title"><Wind size={14} /> Environment</div><label>Air temperature <strong>{temperature} °C</strong><input type="range" min="-10" max="45" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /></label><label>Static pressure <strong>{pressure} hPa</strong><input type="range" min="950" max="1050" value={pressure} onChange={(e) => setPressure(Number(e.target.value))} /></label></div><div className="param-group"><div className="param-group-title"><Activity size={14} /> Mass model</div><label>Rider mass <strong>{riderMass} kg</strong><input type="range" min="45" max="120" value={riderMass} onChange={(e) => setRiderMass(Number(e.target.value))} /></label><label>Bicycle mass <strong>{bikeMass.toFixed(1)} kg</strong><input type="range" min="6" max="18" step="0.1" value={bikeMass} onChange={(e) => setBikeMass(Number(e.target.value))} /></label></div><div className="solver-readiness"><div className="param-group-title"><Gauge size={14} /> Solver workflow</div><div className="solver-steps"><span className="active">01 Setup</span><span>02 Mesh</span><span>03 Solve</span><span>04 Review</span></div><div className="readiness-line"><span className="status-dot" /> Geometry preview only <strong>Mesh not generated</strong></div></div></section><section className="simulation-panel"><div className="simulation-heading"><div className="eyebrow">SIMULATION DEFINITION / CASE 01</div><h2>Describe the run before the solver.</h2><p>These assumptions make the preview explicit and create a practical handoff contract for a later CFD service.</p><div className="readiness-meter"><div><span>CASE READINESS</span><strong>{readinessScore}%</strong></div><i><b style={{ width: `${readinessScore}%` }} /></i><small>{simulationStatus}</small></div></div><div className="simulation-grid"><label className="simulation-field"><span>Flow regime</span><select value={flowModel} onChange={(e) => { markSimulationChanged(); setFlowModel(e.target.value); }}><option>Steady external flow</option><option>Transient gust response</option></select></label><label className="simulation-field"><span>Solver formulation</span><select value={solverModel} onChange={(e) => { markSimulationChanged(); setSolverModel(e.target.value); }}><option>RANS pressure-based</option><option>LES research mode</option><option>Potential flow estimate</option></select></label><label className="simulation-field"><span>Turbulence model</span><select value={turbulenceModel} onChange={(e) => { markSimulationChanged(); setTurbulenceModel(e.target.value); }}><option>k-omega SST</option><option>k-epsilon realizable</option><option>Spalart–Allmaras</option></select></label><label className="simulation-field"><span>Ground condition</span><select value={groundCondition} onChange={(e) => { markSimulationChanged(); setGroundCondition(e.target.value); }}><option>Moving ground</option><option>Stationary ground</option><option>Roadway boundary</option></select></label><label className="simulation-field"><span>Mesh target</span><select value={meshTarget} onChange={(e) => { markSimulationChanged(); setMeshTarget(e.target.value); }}><option>2.5–4.0 M cells</option><option>1.0–2.5 M cells</option><option>4.0–8.0 M cells</option></select></label><label className="simulation-field range-field"><span>Boundary-layer layers <strong>{boundaryLayerLayers}</strong></span><input type="range" min="6" max="20" value={boundaryLayerLayers} onChange={(e) => { markSimulationChanged(); setBoundaryLayerLayers(Number(e.target.value)); }} /></label><label className="simulation-field range-field"><span>Inlet-to-rider length <strong>{domainLength} m</strong></span><input type="range" min="4" max="10" value={domainLength} onChange={(e) => { markSimulationChanged(); setDomainLength(Number(e.target.value)); }} /></label><label className="simulation-field range-field"><span>Maximum iterations <strong>{iterations}</strong></span><input type="range" min="300" max="2000" step="100" value={iterations} onChange={(e) => { markSimulationChanged(); setIterations(Number(e.target.value)); }} /></label><label className="simulation-field range-field"><span>Residual target <strong>1e-{residualExponent}</strong></span><input type="range" min="3" max="6" value={residualExponent} onChange={(e) => { markSimulationChanged(); setResidualExponent(Number(e.target.value)); }} /></label></div><div className="assumption-strip"><span className="field-trace" /><strong>Current assumption</strong><span>{flowModel} · {groundCondition.toLowerCase()} · {turbulenceModel} · {meshTarget}</span></div></section><section className="geometry-panel"><div className="geometry-heading"><div className="eyebrow">GEOMETRY SPECIFICATION / R-01</div><h2>Reference dimensions for meshing.</h2><p>The current scene is a simplified concept. These values define its scale and coordinate contract before CAD or mesh export.</p></div><div className="geometry-grid"><label>Wheelbase <strong>{wheelbase.toFixed(2)} m</strong><input type="range" min="0.90" max="1.20" step="0.01" value={wheelbase} onChange={(e) => { markGeometryChanged(); setWheelbase(Number(e.target.value)); }} /></label><label>Wheel diameter <strong>{wheelDiameter.toFixed(2)} m</strong><input type="range" min="0.65" max="0.75" step="0.01" value={wheelDiameter} onChange={(e) => { markGeometryChanged(); setWheelDiameter(Number(e.target.value)); }} /></label><label>Rider height <strong>{riderHeight.toFixed(2)} m</strong><input type="range" min="1.55" max="2.05" step="0.01" value={riderHeight} onChange={(e) => { markGeometryChanged(); setRiderHeight(Number(e.target.value)); }} /></label></div><div className={`geometry-status ${preparedAt ? "is-prepared" : ""}`}><div className="geometry-status-head"><span className="eyebrow">MESH CONTRACT</span>{preparedAt ? <CheckCircle2 size={16} /> : <span className="status-dot" />}</div><strong>{geometryStatus}</strong><label className="case-name-field"><span>Case name</span><input value={caseName} onChange={(e) => setCaseName(e.target.value)} aria-label="Case name" /></label><span className="readiness-copy">Scale locked · surfaces simplified · watertight check pending</span>{preparedAt && <span className="prepared-stamp">Prepared {preparedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}<div className="geometry-actions"><button className="export-button" onClick={prepareGeometry}>{preparedAt ? "Refresh preparation" : "Prepare solver export"}</button><button className="save-case-button" onClick={saveCase} disabled={!preparedAt}><History size={13} /> Save case</button><button className="manifest-button" onClick={downloadManifest} disabled={!preparedAt} title={preparedAt ? "Download the prepared geometry manifest" : "Prepare the geometry specification first"}><FileJson2 size={13} /> Manifest <Download size={12} /></button></div></div></section><footer className="lab-footer"><span><Gauge size={14} /> Solver: preview field / no CFD</span><span>Air density {airDensity} kg/m³</span><span>Last saved just now</span></footer>
    </section>
  </main>;
}
