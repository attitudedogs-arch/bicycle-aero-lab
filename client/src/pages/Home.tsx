// Bicycle Aero Lab — Wind-Tunnel Instrument direction. The viewport is the observation bay; controls expose measurable physical variables.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, CheckCircle2, ChevronDown, CircleHelp, Download, FileJson2, Gauge, History, Play, RotateCcw, Settings2, Upload, Wind, X, Zap } from "lucide-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const copper = "#c96b3b";
const blue = "#78c9d8";
const savedCasesKey = "bicycle-aero-lab:saved-geometry-cases";

type SolverStage = "idle" | "queued" | "meshing" | "solving" | "review";
type QualityMode = "low" | "balanced" | "high";
type ResultLayer = "velocity" | "pressure" | "streamlines" | "wake";
const resultLayerLabels: Record<ResultLayer, string> = { velocity: "Velocity", pressure: "Pressure", streamlines: "Streamlines", wake: "Wake deficit" };

const solverStages: SolverStage[] = ["queued", "meshing", "solving", "review"];
const solverStageLabels: Record<SolverStage, string> = { idle: "Idle", queued: "Queued", meshing: "Meshing", solving: "Solving", review: "Review" };

type AssetRole = "bicycle" | "rider" | "custom";
type TransformKey = "scale" | "yaw" | "pitch" | "roll" | "offsetY";
type RoleTransform = { scale: number; yaw: number; pitch: number; roll: number; offsetY: number };
type LocalAsset = { fileName: string; type: string; size: number; url: string };
const roleLabels: Record<AssetRole, string> = { bicycle: "Bicycle", rider: "Rider", custom: "Custom part" };
const defaultRoleTransforms: Record<AssetRole, RoleTransform> = { bicycle: { scale: 1, yaw: 0, pitch: 0, roll: 0, offsetY: 0 }, rider: { scale: 1, yaw: 0, pitch: 0, roll: 0, offsetY: 0.05 }, custom: { scale: 1, yaw: 0, pitch: 0, roll: 0, offsetY: 0 } };
type SavedAssetMeta = { fileName: string; type: string; size: number };

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
  referenceArea?: number;
  characteristicLength?: number;
  dynamicViscosity?: number;
  subjectModel?: string;
  riderPreset?: string;
  customPart?: string;
  location?: string;
  weather?: string;
  surfaceType?: string;
  trackSlope?: number;
  bikeSlope?: number;
  airflowDirection?: string;
  airflowSpeed?: number;
  airTemperature?: number;
  chainType?: string;
  acceleration?: number;
  assetMeta?: Partial<Record<AssetRole, SavedAssetMeta>>;
  assetTransforms?: Partial<Record<AssetRole, RoleTransform>>;
  qualityMode?: QualityMode;
  resultLayer?: ResultLayer;
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

function addBike(scene: THREE.Scene, subjectModel: string, customPart: string, riderPreset: string, qualityMode: QualityMode) {
  const bike = new THREE.Group();
  bike.name = `bicycle-and-rider / ${subjectModel}`;
  const modelColor = subjectModel.includes("Time trial") ? 0x36596a : subjectModel.includes("Gravel") ? 0x62584a : 0x273b45;
  const detail = qualityMode === "high" ? { spokeCount: 18, wheelSegments: 72, tubeSegments: 8, riderSegments: 9 } : qualityMode === "low" ? { spokeCount: 8, wheelSegments: 32, tubeSegments: 4, riderSegments: 5 } : { spokeCount: 12, wheelSegments: 48, tubeSegments: 5, riderSegments: 6 };
  const carbon = new THREE.MeshStandardMaterial({ color: modelColor, roughness: 0.28, metalness: 0.55 });
  const carbonEdge = new THREE.MeshStandardMaterial({ color: 0x17262c, roughness: 0.35, metalness: 0.42 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.92, metalness: 0.02 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xa8b6b8, roughness: 0.24, metalness: 0.78 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xd27545, roughness: 0.25, metalness: 0.5 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc78a70, roughness: 0.72 });
  const kit = new THREE.MeshStandardMaterial({ color: 0x6c8792, roughness: 0.5, metalness: 0.04 });
  const kitDark = new THREE.MeshStandardMaterial({ color: 0x2c3e48, roughness: 0.63 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x142229, roughness: 0.14, metalness: 0.36, transparent: true, opacity: 0.78 });
  const addMesh = <T extends THREE.Object3D>(mesh: T, parent: THREE.Object3D = bike, cast = true) => { mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
  const tube = (a: THREE.Vector3, b: THREE.Vector3, radius = 0.05, material = carbon, parent: THREE.Object3D = bike) => {
    const direction = new THREE.Vector3().subVectors(b, a); const length = direction.length();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.05, length - radius * 1.8), detail.tubeSegments, detail.tubeSegments * 2), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return addMesh(mesh, parent);
  };
  const wheel = (x: number, deep = false) => {
    const wheelGroup = new THREE.Group(); wheelGroup.position.set(x, 0.6, 0); bike.add(wheelGroup);
    const tireMesh = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, qualityMode === "high" ? 12 : 8, detail.wheelSegments), tire); tireMesh.rotation.y = Math.PI / 2; addMesh(tireMesh, wheelGroup);
    const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.022, qualityMode === "high" ? 10 : 7, detail.wheelSegments), carbonEdge); sidewall.rotation.y = Math.PI / 2; sidewall.position.x = 0.055; addMesh(sidewall, wheelGroup);
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, deep ? 0.085 : 0.035, qualityMode === "high" ? 12 : 8, detail.wheelSegments), deep ? carbonEdge : rim); rimMesh.rotation.y = Math.PI / 2; addMesh(rimMesh, wheelGroup);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12), copperMat); hub.rotation.z = Math.PI / 2; addMesh(hub, wheelGroup);
    const brakeRotor = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, qualityMode === "high" ? 24 : 14), rim); brakeRotor.rotation.z = Math.PI / 2; brakeRotor.position.x = 0.08; addMesh(brakeRotor, wheelGroup, false);
    for (let i = 0; i < detail.spokeCount; i++) {
      const theta = (i / detail.spokeCount) * Math.PI * 2;
      const edge = new THREE.Vector3(0, Math.sin(theta) * 0.51, Math.cos(theta) * 0.51);
      tube(new THREE.Vector3(0, 0, 0), edge, 0.006, rim, wheelGroup);
      tube(new THREE.Vector3(0.025, 0, 0), edge.clone().multiplyScalar(0.96), 0.004, rim, wheelGroup);
    }
  };
  const deepWheels = subjectModel.includes("Time trial") || customPart === "Deep-section wheels";
  wheel(-1.05, deepWheels); wheel(1.05, deepWheels);
  const rear = new THREE.Vector3(-1.05, 0.6, 0), crank = new THREE.Vector3(-0.16, 0.6, 0), head = new THREE.Vector3(0.68, 0.88, 0), seat = new THREE.Vector3(-0.5, 1.15, 0);
  tube(rear, crank, 0.048); tube(rear, seat, 0.045); tube(seat, crank, 0.055); tube(crank, head, 0.06); tube(seat, head, 0.055, copperMat);
  tube(new THREE.Vector3(-1.05, 0.6, -0.06), new THREE.Vector3(-0.5, 1.15, -0.06), 0.022, carbonEdge); tube(new THREE.Vector3(-1.05, 0.6, 0.06), new THREE.Vector3(-0.5, 1.15, 0.06), 0.022, carbonEdge);
  const forkAxle = new THREE.Vector3(1.05, 0.6, 0); tube(head, forkAxle, 0.042, carbonEdge); tube(new THREE.Vector3(0.72, 0.94, -0.055), new THREE.Vector3(1.05, 0.6, -0.055), 0.028, carbon); tube(new THREE.Vector3(0.72, 0.94, 0.055), new THREE.Vector3(1.05, 0.6, 0.055), 0.028, carbon);
  tube(head, new THREE.Vector3(0.79, 1.2, 0), 0.034, carbonEdge);
  const handlebar = new THREE.Vector3(0.79, 1.2, 0); tube(handlebar, new THREE.Vector3(0.7, 1.24, -0.2), 0.026, copperMat); tube(handlebar, new THREE.Vector3(0.7, 1.24, 0.2), 0.026, copperMat); tube(new THREE.Vector3(0.7, 1.24, -0.2), new THREE.Vector3(0.58, 1.14, -0.2), 0.022, carbonEdge); tube(new THREE.Vector3(0.7, 1.24, 0.2), new THREE.Vector3(0.58, 1.14, 0.2), 0.022, carbonEdge);
  const saddle = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.2, 5, 8), carbonEdge); saddle.rotation.z = Math.PI / 2; saddle.position.set(-0.5, 1.2, 0); addMesh(saddle);
  tube(new THREE.Vector3(-0.5, 1.16, 0), new THREE.Vector3(-0.5, 1.27, 0), 0.022, carbonEdge);
  const crankset = new THREE.Group(); crankset.position.copy(crank); bike.add(crankset); const chainring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 6, 24), copperMat); chainring.rotation.x = Math.PI / 2; addMesh(chainring, crankset); const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), carbonEdge); spindle.rotation.x = Math.PI / 2; addMesh(spindle, crankset); tube(new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(0.14, 0.03, 0.02), 0.014, copperMat, crankset); tube(new THREE.Vector3(0, 0, -0.02), new THREE.Vector3(-0.13, -0.04, -0.02), 0.014, copperMat, crankset);
  const upright = riderPreset.includes("upright"); const hip = new THREE.Vector3(upright ? -0.34 : -0.38, upright ? 1.3 : 1.28, 0); const shoulder = new THREE.Vector3(upright ? 0.06 : 0.22, upright ? 1.68 : 1.64, 0); const headPos = new THREE.Vector3(upright ? 0.28 : 0.42, upright ? 1.91 : 1.88, 0);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.48, detail.riderSegments, detail.riderSegments * 2), kit); torso.rotation.z = upright ? -0.34 : -0.82; torso.position.copy(shoulder).add(hip).multiplyScalar(0.5); addMesh(torso);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.08, 5, 8), skin); neck.position.set(0.39, headPos.y - 0.13, 0); addMesh(neck);
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, detail.riderSegments * 2, detail.riderSegments), skin); headMesh.position.copy(headPos); addMesh(headMesh);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, detail.riderSegments * 2, detail.riderSegments, 0, Math.PI * 2, 0, Math.PI / 1.7), carbonEdge); helmet.position.set(headPos.x, headPos.y + 0.04, 0); addMesh(helmet);
  const visorMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.11, 4, 8), visor); visorMesh.rotation.z = Math.PI / 2; visorMesh.position.set(headPos.x + 0.11, headPos.y + 0.015, -0.02); addMesh(visorMesh);
  const elbowNear = new THREE.Vector3(0.24, shoulder.y - 0.1, -0.12), handNear = new THREE.Vector3(0.66, 1.22, -0.16); tube(shoulder, elbowNear, 0.065, kit); tube(elbowNear, handNear, 0.052, skin); const elbowFar = new THREE.Vector3(0.24, shoulder.y - 0.1, 0.12), handFar = new THREE.Vector3(0.66, 1.22, 0.16); tube(shoulder, elbowFar, 0.065, kit); tube(elbowFar, handFar, 0.052, skin);
  const kneeNear = new THREE.Vector3(-0.28, 1.05, -0.1), ankleNear = new THREE.Vector3(-0.16, 0.69, -0.1); tube(hip, kneeNear, 0.075, kitDark); tube(kneeNear, ankleNear, 0.054, skin); const kneeFar = new THREE.Vector3(-0.2, 1.02, 0.1), ankleFar = new THREE.Vector3(0.02, 0.66, 0.1); tube(hip, kneeFar, 0.075, kitDark); tube(kneeFar, ankleFar, 0.054, skin);
  const shoeNear = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.18, 5, 8), carbonEdge); shoeNear.rotation.z = Math.PI / 2; shoeNear.position.set(-0.04, 0.65, -0.1); addMesh(shoeNear); const shoeFar = shoeNear.clone(); shoeFar.position.z = 0.1; addMesh(shoeFar);
  if (customPart === "Aero bottle") { const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.24, 5, 10), copperMat); bottle.rotation.z = -0.95; bottle.position.set(-0.3, 0.8, 0.08); addMesh(bottle); }
  if (customPart === "Custom handlebar preview") { tube(new THREE.Vector3(0.74, 1.21, -0.28), new THREE.Vector3(0.52, 1.3, -0.28), 0.035, copperMat); tube(new THREE.Vector3(0.74, 1.21, 0.28), new THREE.Vector3(0.52, 1.3, 0.28), 0.035, copperMat); }
  bike.scale.setScalar(1.12);
  bike.traverse((node) => { if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; } });
  scene.add(bike);
  return bike;
}

function addAirflow(scene: THREE.Scene, intensity: number, resultLayer: ResultLayer) {
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
    const lineColor = resultLayer === "pressure" ? (row % 2 === 0 ? "#d9754d" : "#6ab8c5") : resultLayer === "wake" ? (row > 4 ? copper : blue) : row % 3 === 0 ? copper : blue;
    group.add(makeLine(points, lineColor, resultLayer === "streamlines" ? (row % 3 === 0 ? 0.78 : 0.46) : 0.64));
  }
  scene.add(group);
  return group;
}

function Scene({ windAngle, airflow, resetSignal, subjectModel, customPart, riderPreset, surfaceType, assetUrls, assetTransforms, qualityMode, resultLayer }: { windAngle: number; airflow: boolean; resetSignal: number; subjectModel: string; customPart: string; riderPreset: string; surfaceType: string; assetUrls: Partial<Record<AssetRole, string>>; assetTransforms: Record<AssetRole, RoleTransform>; qualityMode: QualityMode; resultLayer: ResultLayer }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x10171b);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 0.95, 0);
    let azimuth = 0.62; let elevation = 0.28; let radius = 6.8;
    const updateCamera = () => { const horizontal = Math.cos(elevation) * radius; camera.position.set(Math.sin(azimuth) * horizontal, target.y + Math.sin(elevation) * radius, Math.cos(azimuth) * horizontal); camera.lookAt(target); };
    updateCamera();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; host.current.appendChild(renderer.domElement);
    const ambient = new THREE.HemisphereLight(0xd9f0ef, 0x11191e, 1.9); scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffe2c8, 3.1); key.position.set(-3.5, 5.5, 4.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 0.5; key.shadow.camera.far = 15; key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 4; key.shadow.camera.bottom = -2; scene.add(key);
    const rimLight = new THREE.DirectionalLight(0x82c8d4, 1.7); rimLight.position.set(3, 2.8, -4); scene.add(rimLight);
    const fillLight = new THREE.PointLight(0xc96b3b, 0.8, 8); fillLight.position.set(-1.8, 1.8, 1.8); scene.add(fillLight);
    const surfaceColor = surfaceType.includes("sand") ? 0x5d5141 : surfaceType.includes("soil") ? 0x4b4037 : surfaceType.includes("cement") ? 0x394047 : 0x182127;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshStandardMaterial({ color: surfaceColor, roughness: 0.9, metalness: 0.05 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.04; floor.receiveShadow = true; scene.add(floor);
    const tunnel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 3, 3.2)), new THREE.LineBasicMaterial({ color: 0x607780, transparent: true, opacity: 0.32 })); tunnel.position.y = 1.2; scene.add(tunnel);
    const originAxes = new THREE.AxesHelper(0.72); originAxes.position.set(0, 0.02, 0); scene.add(originAxes);
    const bike = addBike(scene, subjectModel, customPart, riderPreset, qualityMode); const loadedAssets: THREE.Object3D[] = [];
    const loader = new GLTFLoader();
    const loadRoleAsset = (role: AssetRole, url?: string) => {
      if (!url) return;
      loader.load(url, (gltf) => {
        const loadedAsset = gltf.scene;
        const box = new THREE.Box3().setFromObject(loadedAsset);
        const size = new THREE.Vector3(); const center = new THREE.Vector3(); box.getSize(size); box.getCenter(center);
        const maxDimension = Math.max(size.x, size.y, size.z) || 1;
        const fitScale = role === "custom" ? 1.2 / maxDimension : 2.2 / maxDimension;
        const transform = assetTransforms[role];
        loadedAsset.scale.setScalar(fitScale * transform.scale);
        loadedAsset.position.set(-center.x * fitScale, -box.min.y * fitScale + (role === "rider" ? 0.05 : 0) + transform.offsetY, -center.z * fitScale + (role === "custom" ? 0.18 : 0));
        loadedAsset.rotation.set(THREE.MathUtils.degToRad(transform.pitch), THREE.MathUtils.degToRad(-windAngle * 0.18 + transform.yaw), THREE.MathUtils.degToRad(transform.roll));
        loadedAsset.traverse((node) => { if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; } });
        scene.add(loadedAsset); loadedAssets.push(loadedAsset);
        if (role === "bicycle") bike.visible = false;
      }, undefined, () => { if (role === "bicycle") bike.visible = true; });
    };
    loadRoleAsset("bicycle", assetUrls.bicycle); loadRoleAsset("rider", assetUrls.rider); loadRoleAsset("custom", assetUrls.custom);
    const air = addAirflow(scene, airflow ? 1 : 0.42, resultLayer);
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
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", onPointerDown); canvas.removeEventListener("pointermove", onPointerMove); canvas.removeEventListener("pointerup", onPointerUp); canvas.removeEventListener("pointercancel", onPointerUp); canvas.removeEventListener("wheel", onWheel); scene.traverse((node) => { if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.LineSegments) { node.geometry.dispose(); const materials = Array.isArray(node.material) ? node.material : [node.material]; materials.forEach((material) => material.dispose()); } }); renderer.dispose(); host.current?.removeChild(renderer.domElement); };
  }, [windAngle, airflow, resetSignal, subjectModel, customPart, riderPreset, surfaceType, assetUrls.bicycle, assetUrls.rider, assetUrls.custom, assetTransforms, qualityMode, resultLayer]);
  return <div ref={host} className="scene-host" aria-label={`Interactive 3D ${subjectModel} with ${riderPreset} and ${customPart}`} />;
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
  const [subjectModel, setSubjectModel] = useState("Aero road / R-01");
  const [riderPreset, setRiderPreset] = useState("Rider / fixed aero");
  const [customPart, setCustomPart] = useState("No custom part");
  const [location, setLocation] = useState("Wind-tunnel baseline");
  const [weather, setWeather] = useState("Normal / dry");
  const [surfaceType, setSurfaceType] = useState("Track / road");
  const [trackSlope, setTrackSlope] = useState(0);
  const [bikeSlope, setBikeSlope] = useState(0);
  const [airflowDirection, setAirflowDirection] = useState("Headwind / aligned");
  const [airflowSpeed, setAirflowSpeed] = useState(0);
  const [airTemperature, setAirTemperature] = useState(20);
  const [chainType, setChainType] = useState("12-speed road");
  const [acceleration, setAcceleration] = useState(0);
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
  const [referenceArea, setReferenceArea] = useState(0.50);
  const [characteristicLength, setCharacteristicLength] = useState(1.02);
  const [dynamicViscosity, setDynamicViscosity] = useState(1.81);
  const [savedCases, setSavedCases] = useState<SavedCase[]>(readSavedCases);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState("Definition in progress");
  const [solverStage, setSolverStage] = useState<SolverStage>("idle");
  const [localAsset, setLocalAsset] = useState<LocalAsset | null>(null);
  const [riderAsset, setRiderAsset] = useState<LocalAsset | null>(null);
  const [customAsset, setCustomAsset] = useState<LocalAsset | null>(null);
  const [assetTransforms, setAssetTransforms] = useState<Record<AssetRole, RoleTransform>>(defaultRoleTransforms);
  const [selectedRole, setSelectedRole] = useState<AssetRole>("bicycle");
  const [qualityMode, setQualityMode] = useState<QualityMode>("balanced");
  const [resultLayer, setResultLayer] = useState<ResultLayer>("streamlines");
  const gizmoDragRef = useRef<{ x: number; y: number } | null>(null);
  const [assetInputError, setAssetInputError] = useState("");
  const airDensity = Number(((pressure * 100) / (287.05 * (temperature + 273.15))).toFixed(3));
  const speedMs = speed / 3.6;
  const viscosityPaS = dynamicViscosity * 1e-5;
  const reynoldsNumber = (airDensity * speedMs * characteristicLength) / viscosityPaS;
  const previewCda = modified ? 0.274 : 0.286;
  const dynamicPressure = 0.5 * airDensity * speedMs * speedMs;
  const derivedDragForce = dynamicPressure * previewCda;
  const forceModelCd = previewCda / referenceArea;
  const liftProxy = dynamicPressure * (0.012 + Math.abs(trackSlope) * 0.0015 + Math.abs(windAngle) * 0.0008);
  const wakeDeficit = Math.min(0.92, 0.18 + Math.abs(windAngle) * 0.004 + airflowSpeed * 0.006 + (customPart === "Deep-section wheels" ? 0.05 : 0));
  const probePressure = Number((-dynamicPressure * (0.2 + wakeDeficit * 0.35)).toFixed(1));
  useEffect(() => {
    try { window.localStorage.setItem(savedCasesKey, JSON.stringify(savedCases)); } catch { /* Storage can be unavailable in private browsing. */ }
  }, [savedCases]);
  useEffect(() => () => { [localAsset?.url, riderAsset?.url, customAsset?.url].forEach((url) => { if (url) URL.revokeObjectURL(url); }); }, [localAsset?.url, riderAsset?.url, customAsset?.url]);
  const handleRoleAssetInput = (role: AssetRole, file?: File) => {
    if (!file) return;
    const isSupported = file.name.toLowerCase().endsWith(".glb") || file.name.toLowerCase().endsWith(".gltf");
    if (!isSupported) { setAssetInputError(`Choose a .glb or .gltf model for the ${role} slot.`); return; }
    setAssetInputError("");
    const nextAsset = { fileName: file.name, type: file.name.toLowerCase().endsWith(".glb") ? "GLB" : "GLTF", size: file.size, url: URL.createObjectURL(file) };
    if (role === "bicycle") setLocalAsset(nextAsset);
    if (role === "rider") setRiderAsset(nextAsset);
    if (role === "custom") setCustomAsset(nextAsset);
    setSimulationStatus(`${role} asset loaded / preview geometry active`);
  };
  const handleAssetInput = (file?: File) => handleRoleAssetInput("bicycle", file);
  const clearRoleAsset = (role: AssetRole) => { if (role === "bicycle") setLocalAsset(null); if (role === "rider") setRiderAsset(null); if (role === "custom") setCustomAsset(null); setAssetInputError(""); setSimulationStatus(preparedAt ? "Case ready for solver handoff" : "Definition in progress"); };
  const clearLocalAsset = () => clearRoleAsset("bicycle");
  const updateAssetTransform = (role: AssetRole, key: TransformKey, value: number) => { markSimulationChanged(); setAssetTransforms((current) => ({ ...current, [role]: { ...current[role], [key]: value } })); };
  const resetAssetTransform = (role: AssetRole) => { setAssetTransforms((current) => ({ ...current, [role]: { ...defaultRoleTransforms[role] } })); markSimulationChanged(); };
  const resetAllAssetTransforms = () => { setAssetTransforms(defaultRoleTransforms); markSimulationChanged(); };
  const handleGizmoPointerDown = (event: React.PointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture(event.pointerId); gizmoDragRef.current = { x: event.clientX, y: event.clientY }; };
  const handleGizmoPointerMove = (event: React.PointerEvent<HTMLDivElement>) => { if (!gizmoDragRef.current) return; const dx = event.clientX - gizmoDragRef.current.x; const dy = event.clientY - gizmoDragRef.current.y; gizmoDragRef.current = { x: event.clientX, y: event.clientY }; updateAssetTransform(selectedRole, "yaw", Math.max(-180, Math.min(180, assetTransforms[selectedRole].yaw + dx * 0.8))); updateAssetTransform(selectedRole, "offsetY", Math.max(-0.5, Math.min(0.8, assetTransforms[selectedRole].offsetY - dy * 0.004))); };
  const handleGizmoPointerUp = (event: React.PointerEvent<HTMLDivElement>) => { gizmoDragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); };
  const readinessChecks = [preparedAt !== null, subjectModel.length > 0, riderPreset.length > 0, surfaceType.length > 0, airflowDirection.length > 0, flowModel.length > 0, solverModel.length > 0, turbulenceModel.length > 0, meshTarget.length > 0, boundaryLayerLayers >= 10, domainLength >= 5, iterations >= 500];
  const readinessScore = Math.round((readinessChecks.filter(Boolean).length / readinessChecks.length) * 100);
  const solverStageIndex = solverStage === "idle" ? -1 : solverStages.indexOf(solverStage);
  const solverIsRunning = solverStage === "queued" || solverStage === "meshing" || solverStage === "solving";
  const markSimulationChanged = () => { if (preparedAt) setSimulationStatus("Settings changed / review required"); };
  const markGeometryChanged = () => { setGeometryStatus("Preview only"); setPreparedAt(null); setSimulationStatus("Definition in progress"); };
  const prepareGeometry = () => { setGeometryStatus("Spec ready / mesh pending"); setPreparedAt(new Date()); setSimulationStatus(readinessScore === 100 ? "Case ready for solver handoff" : "Spec ready / mesh pending"); };
  const saveCase = () => {
    if (!preparedAt) return;
      const nextCase: SavedCase = { id: createCaseId(), name: caseName.trim() || "Untitled geometry case", model: subjectModel, wheelbase, wheelDiameter, riderHeight, preparedAt: preparedAt.toISOString(), status: simulationStatus, flowModel, solverModel, turbulenceModel, groundCondition, meshTarget, boundaryLayerLayers, domainLength, iterations, residualExponent, referenceArea, characteristicLength, dynamicViscosity, subjectModel, riderPreset, customPart, location, weather, surfaceType, trackSlope, bikeSlope, airflowDirection, airflowSpeed, airTemperature, chainType, acceleration, assetMeta: { ...(localAsset ? { bicycle: { fileName: localAsset.fileName, type: localAsset.type, size: localAsset.size } } : {}), ...(riderAsset ? { rider: { fileName: riderAsset.fileName, type: riderAsset.type, size: riderAsset.size } } : {}), ...(customAsset ? { custom: { fileName: customAsset.fileName, type: customAsset.type, size: customAsset.size } } : {}) }, assetTransforms, qualityMode, resultLayer };
    setSavedCases((current) => [nextCase, ...current].slice(0, 8));
    setHistoryOpen(true);
  };
  const restoreCase = (savedCase: SavedCase) => {
    setCaseName(savedCase.name);
    setLocalAsset(null);
    setRiderAsset(null);
    setCustomAsset(null);
    setAssetTransforms(savedCase.assetTransforms ? { ...defaultRoleTransforms, ...savedCase.assetTransforms } : defaultRoleTransforms);
    setQualityMode(savedCase.qualityMode ?? "balanced");
    setResultLayer(savedCase.resultLayer ?? "streamlines");
    setAssetInputError("");
    setSubjectModel(savedCase.subjectModel ?? savedCase.model ?? "Aero road / R-01");
    setRiderPreset(savedCase.riderPreset ?? "Rider / fixed aero");
    setCustomPart(savedCase.customPart ?? "No custom part");
    setLocation(savedCase.location ?? "Wind-tunnel baseline");
    setWeather(savedCase.weather ?? "Normal / dry");
    setSurfaceType(savedCase.surfaceType ?? "Track / road");
    setTrackSlope(savedCase.trackSlope ?? 0);
    setBikeSlope(savedCase.bikeSlope ?? 0);
    setAirflowDirection(savedCase.airflowDirection ?? "Headwind / aligned");
    setAirflowSpeed(savedCase.airflowSpeed ?? 0);
    setAirTemperature(savedCase.airTemperature ?? 20);
    setChainType(savedCase.chainType ?? "12-speed road");
    setAcceleration(savedCase.acceleration ?? 0);
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
    setReferenceArea(savedCase.referenceArea ?? 0.50);
    setCharacteristicLength(savedCase.characteristicLength ?? savedCase.wheelbase ?? 1.02);
    setDynamicViscosity(savedCase.dynamicViscosity ?? 1.81);
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
      simulation: { flowModel, solverModel, turbulenceModel, groundCondition, subjectModel, riderPreset, customPart, chainType, location, weather, surfaceType, trackSlope_deg: trackSlope, bikeSlope_deg: bikeSlope, airTemperature_C: airTemperature, staticPressure_hPa: pressure, groundSpeed_kmh: speed, acceleration_mps2: acceleration, airflowDirection, airflowSpeed_kmh: airflowSpeed, crosswindAngle_deg: windAngle },
      mesh: { targetCells: meshTarget, boundaryLayerLayers, domainLength_m: domainLength, geometry: "simplified preview", watertightCheck: "pending" },
      convergence: { maxIterations: iterations, residualTargetExponent: residualExponent },
      validation: { referenceArea_m2: referenceArea, characteristicLength_m: characteristicLength, dynamicViscosity_PaS: viscosityPaS, reynoldsNumber: Math.round(reynoldsNumber), dynamicPressure_Pa: Number(dynamicPressure.toFixed(2)), forceModelCd: Number(forceModelCd.toFixed(3)), derivedDragForce_N: Number(derivedDragForce.toFixed(2)) },
      assets: { bicycle: localAsset ? { fileName: localAsset.fileName, type: localAsset.type, sizeBytes: localAsset.size } : null, rider: riderAsset ? { fileName: riderAsset.fileName, type: riderAsset.type, sizeBytes: riderAsset.size } : null, custom: customAsset ? { fileName: customAsset.fileName, type: customAsset.type, sizeBytes: customAsset.size } : null, storage: "local browser object URL only" },
      transforms: assetTransforms,
      qualityMode,
      resultLayer,
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
  const run = () => {
    if (!preparedAt) { setSimulationStatus("Prepare geometry before queueing a run"); return; }
    setRunning(true); setSolverStage("queued"); setSimulationStatus("Preview run queued / no external solver");
    window.setTimeout(() => { setSolverStage("meshing"); setSimulationStatus("Preview mesh stage / geometry remains simplified"); }, 900);
    window.setTimeout(() => { setSolverStage("solving"); setSimulationStatus("Preview solve stage / values remain estimated"); }, 2100);
    window.setTimeout(() => { setSolverStage("review"); setRunning(false); setSimulationStatus("Preview run complete / awaiting CFD"); }, 4300);
  };
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
        <section className="viewport-card"><div className="viewport-header"><div><span className="eyebrow">3D FLOW FIELD</span><div className="viewport-title">{subjectModel} · {weather.toLowerCase()} · {flowModel.toLowerCase()}</div></div><div className="viewport-tools"><button className={`mini-toggle ${airflow ? "active" : ""}`} onClick={() => setAirflow(!airflow)}><Wind size={14} /> Streamlines</button><label className="quality-control layer-control"><span>LAYER</span><select value={resultLayer} onChange={(e) => setResultLayer(e.target.value as ResultLayer)} aria-label="Aerodynamic result layer"><option value="velocity">Velocity</option><option value="pressure">Pressure</option><option value="streamlines">Streamlines</option><option value="wake">Wake deficit</option></select></label><label className="quality-control"><span>DETAIL</span><select value={qualityMode} onChange={(e) => { markSimulationChanged(); setQualityMode(e.target.value as QualityMode); }} aria-label="Preview detail quality"><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><button className="mini-toggle" onClick={() => setResetSignal((value) => value + 1)}><RotateCcw size={14} /> Reset view</button></div></div><div className="viewport"><Scene windAngle={windAngle} airflow={airflow} resetSignal={resetSignal} subjectModel={subjectModel} customPart={customPart} riderPreset={riderPreset} surfaceType={surfaceType} assetUrls={{ bicycle: localAsset?.url, rider: riderAsset?.url, custom: customAsset?.url }} assetTransforms={assetTransforms} qualityMode={qualityMode} resultLayer={resultLayer} /><div className="viewport-overlay"><span>{resultLayerLabels[resultLayer].toUpperCase()} / PREVIEW FIELD</span><div className="legend"><i className="legend-cool" /> {resultLayer === "pressure" ? "low" : resultLayer === "wake" ? "0%" : "0"} <i className="legend-hot" /> {resultLayer === "pressure" ? "high" : resultLayer === "wake" ? `${Math.round(wakeDeficit * 100)}%` : "18 m/s"}</div></div><div className="sensor-tag sensor-inlet">S-01 / INLET</div><div className="sensor-tag sensor-wake">S-04 / WAKE FIELD</div><div className="calibration-line"><span>0</span><i /><i /><i /><i /><span>3.0 m</span></div><div className="axis"><span>Y</span><span>X</span><span>Z</span></div><div className="origin-gizmo" aria-label="Viewport coordinate frame"><span className="gizmo-x">X</span><span className="gizmo-y">Y</span><span className="gizmo-z">Z</span><i className="gizmo-center" /></div><div className="gizmo-drag-pad" onPointerDown={handleGizmoPointerDown} onPointerMove={handleGizmoPointerMove} onPointerUp={handleGizmoPointerUp} onPointerCancel={handleGizmoPointerUp} aria-label={`Drag to adjust ${roleLabels[selectedRole]} yaw and origin`}><span>DRAG {roleLabels[selectedRole].toUpperCase()}</span><b>↕</b><i>↔</i></div></div><div className="viewport-footer"><span><b className="live-mark" /> {localAsset || riderAsset || customAsset ? "Hybrid local assets" : "Procedural fallback"}</span><span>Mesh status <strong>{solverStage === "review" ? "preview complete" : "not generated"}</strong></span><span>Drag to orbit · wheel to zoom</span></div></section>
        <aside className="results-card"><div className="card-kicker"><span className="eyebrow">RESULT LEDGER</span><span className="confidence">PREVIEW</span></div><div className="drag-readout"><span>{modified ? "Preview drag force / modified" : "Preview drag force / baseline"}</span><strong>{derivedDragForce.toFixed(1)}<small>N</small></strong><span className="delta positive">{modified ? "↓ 7.8% vs baseline" : "Force-model estimate"}</span></div><div className="metric-list"><Metric label="CdA" value={previewCda.toFixed(3)} unit="m²" tone="copper" /><Metric label="Dynamic pressure" value={dynamicPressure.toFixed(1)} unit="Pa" /><Metric label="Lift proxy" value={liftProxy.toFixed(1)} unit="N" /><Metric label="Wake deficit" value={`${Math.round(wakeDeficit * 100)}%`} /><Metric label="Review layer" value={resultLayerLabels[resultLayer]} /></div><div className="result-note"><Zap size={14} /><span>Physics-derived preview only. A real CFD mesh and solver run are still required for measured pressure, lift, drag, and wake values.</span></div><div className="wake-inset"><img src="/manus-storage/bicycle-aero-lab-wake_a66155fa.png" alt="Preview of a bicycle wake field" /><span>WAKE PREVIEW / NEXT SOLVER PASS</span></div></aside>
      </div>
      <section className="control-strip" style={{ backgroundImage: "linear-gradient(90deg, rgba(248,247,242,.98) 0%, rgba(248,247,242,.94) 58%, rgba(248,247,242,.72) 100%), url('/manus-storage/bicycle-aero-lab-terrain_8efdba22.png')", backgroundSize: "cover", backgroundPosition: "right center" }}><div className="control-heading"><div className="eyebrow">CASE PARAMETERS</div><h2>{modified ? "Compare the integration against baseline." : "Run the baseline before changing the shape."}</h2><p>These controls define the first steady-flow experiment.</p></div><div className="control-field"><div className="field-label"><span><b className="field-trace" />Ground speed</span><strong>{speed} <small>km/h</small></strong></div><input type="range" min="10" max="80" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></div><div className="control-field"><div className="field-label"><span><b className="field-trace" />Crosswind angle</span><strong>{windAngle > 0 ? "+" : ""}{windAngle} <small>°</small></strong></div><input type="range" min="-30" max="30" value={windAngle} onChange={(e) => setWindAngle(Number(e.target.value))} /></div><button className="run-button" onClick={run} disabled={solverIsRunning}><Play size={16} fill="currentColor" />{solverIsRunning ? solverStageLabels[solverStage] : !preparedAt ? "Prepare first" : solverStage === "review" ? "Run again" : modified ? "Compare case" : "Run baseline"}</button></section>
      <section className="advanced-panel"><div className="advanced-heading"><div className="eyebrow">ADVANCED PARAMETERS / CASE 01</div><h2>Define the physical test conditions.</h2><p>These values will become solver inputs after geometry and mesh preparation.</p></div><div className="param-group"><div className="param-group-title"><Wind size={14} /> Environment</div><label>Air temperature <strong>{temperature} °C</strong><input type="range" min="-10" max="45" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /></label><label>Static pressure <strong>{pressure} hPa</strong><input type="range" min="950" max="1050" value={pressure} onChange={(e) => setPressure(Number(e.target.value))} /></label></div><div className="param-group"><div className="param-group-title"><Activity size={14} /> Mass model</div><label>Rider mass <strong>{riderMass} kg</strong><input type="range" min="45" max="120" value={riderMass} onChange={(e) => setRiderMass(Number(e.target.value))} /></label><label>Bicycle mass <strong>{bikeMass.toFixed(1)} kg</strong><input type="range" min="6" max="18" step="0.1" value={bikeMass} onChange={(e) => setBikeMass(Number(e.target.value))} /></label></div><div className="solver-readiness"><div className="param-group-title"><Gauge size={14} /> Solver workflow</div><div className="solver-steps"><span className="active">01 Setup</span><span className={solverStageIndex >= 1 ? "active" : ""}>02 Mesh</span><span className={solverStageIndex >= 2 ? "active" : ""}>03 Solve</span><span className={solverStageIndex >= 3 ? "active" : ""}>04 Review</span></div><div className="readiness-line"><span className={`status-dot ${solverIsRunning ? "is-running" : ""}`} /> {solverStage === "idle" ? "Geometry preview only" : solverStageLabels[solverStage]} <strong>{solverStage === "review" ? "Awaiting CFD" : "Mesh not generated"}</strong></div></div></section><section className="case-builder-panel"><div className="builder-heading"><div><div className="eyebrow">CASE BUILDER / CONFIGURATION</div><h2>Choose what is moving through the air.</h2><p>Stage the subject, rider, surface, and environment before refining solver assumptions. Unavailable assets remain labeled as preview geometry.</p></div><span className="builder-status">LOCAL PREVIEW / {subjectModel}</span></div><div className="asset-strip"><div className="asset-strip-copy"><div className="eyebrow">LOCAL 3D ASSET SLOT</div><strong>{localAsset ? localAsset.fileName : "Procedural fallback geometry active"}</strong><span>{localAsset ? `${localAsset.type} · ${(localAsset.size / 1024 / 1024).toFixed(2)} MB · browser-local object URL` : "Load a bicycle, rider, or custom-part GLB/GLTF without uploading it."}</span></div><label className="asset-input"><Upload size={14} /><span>{localAsset ? "Replace asset" : "Add GLB / GLTF"}</span><input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(e) => handleAssetInput(e.target.files?.[0])} /></label>{localAsset && <button className="asset-clear" onClick={clearLocalAsset} aria-label="Clear local 3D asset"><X size={14} /> Clear</button>}{assetInputError && <span className="asset-error">{assetInputError}</span>}</div><div className="asset-role-grid"><div className="asset-role-card"><div><span className="eyebrow">RIDER SLOT</span><strong>{riderAsset ? riderAsset.fileName : "Procedural rider"}</strong></div><label className="asset-input compact"><Upload size={13} /><span>{riderAsset ? "Replace" : "Load rider"}</span><input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(e) => handleRoleAssetInput("rider", e.target.files?.[0])} /></label>{riderAsset && <button className="asset-clear compact" onClick={() => clearRoleAsset("rider")} aria-label="Clear rider asset"><X size={13} /></button>}</div><div className="asset-role-card"><div><span className="eyebrow">CUSTOM PART SLOT</span><strong>{customAsset ? customAsset.fileName : "No custom asset"}</strong></div><label className="asset-input compact"><Upload size={13} /><span>{customAsset ? "Replace" : "Load part"}</span><input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(e) => handleRoleAssetInput("custom", e.target.files?.[0])} /></label>{customAsset && <button className="asset-clear compact" onClick={() => clearRoleAsset("custom")} aria-label="Clear custom part asset"><X size={13} /></button>}</div></div><div className="transform-banner"><div><span className="field-trace" /><strong>CALIBRATION FRAME</strong><span>X forward · Y up · Z rider-right · units in metres/degrees</span><div className="role-select"><span>Selected role</span>{(["bicycle", "rider", "custom"] as AssetRole[]).map((role) => <button key={role} className={selectedRole === role ? "selected" : ""} onClick={() => setSelectedRole(role)}>{roleLabels[role]}</button>)}</div></div><button className="transform-reset-all" onClick={resetAllAssetTransforms}>Reset all to origin</button></div><div className="asset-transform-grid">{(["bicycle", "rider", "custom"] as AssetRole[]).map((role) => <div className="asset-transform-card" key={role}><div className="asset-transform-heading"><div><span className="eyebrow">{roleLabels[role]} TRANSFORM</span><strong>{assetTransforms[role].scale.toFixed(2)}× / {assetTransforms[role].yaw}° yaw</strong></div><button className="transform-reset" onClick={() => resetAssetTransform(role)}>Reset</button></div><label className="transform-field"><span>Scale <b>{assetTransforms[role].scale.toFixed(2)}×</b></span><input type="range" min="0.25" max="2.5" step="0.05" value={assetTransforms[role].scale} onChange={(e) => updateAssetTransform(role, "scale", Number(e.target.value))} /></label><label className="transform-field"><span>Yaw <b>{assetTransforms[role].yaw}°</b></span><input type="range" min="-180" max="180" step="1" value={assetTransforms[role].yaw} onChange={(e) => updateAssetTransform(role, "yaw", Number(e.target.value))} /></label><label className="transform-field"><span>Pitch / roll <b>{assetTransforms[role].pitch}° / {assetTransforms[role].roll}°</b></span><div className="transform-dual"><input type="range" min="-30" max="30" step="1" value={assetTransforms[role].pitch} onChange={(e) => updateAssetTransform(role, "pitch", Number(e.target.value))} /><input type="range" min="-30" max="30" step="1" value={assetTransforms[role].roll} onChange={(e) => updateAssetTransform(role, "roll", Number(e.target.value))} /></div></label><div className="transform-numeric-grid"><label>Scale<input type="number" min="0.25" max="2.5" step="0.05" value={assetTransforms[role].scale} onChange={(e) => updateAssetTransform(role, "scale", Number(e.target.value))} /></label><label>Yaw<input type="number" min="-180" max="180" step="1" value={assetTransforms[role].yaw} onChange={(e) => updateAssetTransform(role, "yaw", Number(e.target.value))} /></label><label>Pitch<input type="number" min="-30" max="30" step="1" value={assetTransforms[role].pitch} onChange={(e) => updateAssetTransform(role, "pitch", Number(e.target.value))} /></label><label>Roll<input type="number" min="-30" max="30" step="1" value={assetTransforms[role].roll} onChange={(e) => updateAssetTransform(role, "roll", Number(e.target.value))} /></label></div><label className="transform-field"><span>Origin Y <b>{assetTransforms[role].offsetY.toFixed(2)} m</b></span><input type="range" min="-0.5" max="0.8" step="0.01" value={assetTransforms[role].offsetY} onChange={(e) => updateAssetTransform(role, "offsetY", Number(e.target.value))} /></label></div>)}</div><div className="builder-groups"><div className="builder-group"><div className="builder-group-title"><span>01 / Subject & custom parts</span><small>3D preview geometry</small></div><label className="builder-field"><span>Bicycle model</span><select value={subjectModel} onChange={(e) => { markSimulationChanged(); setSubjectModel(e.target.value); }}><option>Aero road / R-01</option><option>Time trial / TT-02</option><option>Gravel / GR-03</option></select></label><label className="builder-field"><span>Rider / posture</span><select value={riderPreset} onChange={(e) => { markSimulationChanged(); setRiderPreset(e.target.value); }}><option>Rider / fixed aero</option><option>Rider / upright endurance</option><option>Rider / custom posture preview</option></select></label><label className="builder-field"><span>Custom part</span><select value={customPart} onChange={(e) => { markSimulationChanged(); setCustomPart(e.target.value); }}><option>No custom part</option><option>Aero bottle</option><option>Deep-section wheels</option><option>Custom handlebar preview</option><option>Custom tyre profile preview</option></select></label></div><div className="builder-group"><div className="builder-group-title"><span>02 / Bike & rider motion</span><small>Current case inputs</small></div><label className="builder-field"><span>Chain / drivetrain</span><select value={chainType} onChange={(e) => { markSimulationChanged(); setChainType(e.target.value); }}><option>12-speed road</option><option>1x gravel</option><option>Time-trial electronic</option></select></label><label className="builder-field range-field"><span>Acceleration <strong>{acceleration.toFixed(1)} m/s²</strong></span><input type="range" min="-2" max="3" step="0.1" value={acceleration} onChange={(e) => { markSimulationChanged(); setAcceleration(Number(e.target.value)); }} /></label><label className="builder-field range-field"><span>Bike pitch / slope <strong>{bikeSlope > 0 ? "+" : ""}{bikeSlope}°</strong></span><input type="range" min="-12" max="12" value={bikeSlope} onChange={(e) => { markSimulationChanged(); setBikeSlope(Number(e.target.value)); }} /></label></div><div className="builder-group"><div className="builder-group-title"><span>03 / Location & surface</span><small>Atmosphere and terrain</small></div><label className="builder-field"><span>Location / test context</span><input value={location} onChange={(e) => { markSimulationChanged(); setLocation(e.target.value); }} /></label><label className="builder-field"><span>Weather condition</span><select value={weather} onChange={(e) => { markSimulationChanged(); setWeather(e.target.value); }}><option>Normal / dry</option><option>Hot / dry</option><option>Rain / wet</option><option>Snow / cold</option><option>Custom atmospheric case</option></select></label><label className="builder-field"><span>Track surface</span><select value={surfaceType} onChange={(e) => { markSimulationChanged(); setSurfaceType(e.target.value); }}><option>Track / road</option><option>Cement / slippery</option><option>Soil / land</option><option>Mountain / rigid</option><option>Sand on road / slippery</option></select></label><label className="builder-field range-field"><span>Track slope <strong>{trackSlope > 0 ? "+" : ""}{trackSlope}°</strong></span><input type="range" min="-15" max="15" value={trackSlope} onChange={(e) => { markSimulationChanged(); setTrackSlope(Number(e.target.value)); }} /></label></div><div className="builder-group"><div className="builder-group-title"><span>04 / Airflow & atmosphere</span><small>Relative to cycle heading</small></div><label className="builder-field"><span>Airflow direction</span><select value={airflowDirection} onChange={(e) => { markSimulationChanged(); setAirflowDirection(e.target.value); }}><option>Headwind / aligned</option><option>Tailwind / aligned</option><option>Crosswind / left</option><option>Crosswind / right</option><option>User angle / vector input</option></select></label><label className="builder-field range-field"><span>Ambient airflow <strong>{airflowSpeed} km/h</strong></span><input type="range" min="0" max="60" value={airflowSpeed} onChange={(e) => { markSimulationChanged(); setAirflowSpeed(Number(e.target.value)); }} /></label><label className="builder-field range-field"><span>Air temperature <strong>{airTemperature} °C</strong></span><input type="range" min="-20" max="50" value={airTemperature} onChange={(e) => { markSimulationChanged(); setAirTemperature(Number(e.target.value)); setTemperature(Number(e.target.value)); }} /></label><div className="builder-note"><span className="field-trace" /> Air density remains derived from temperature and pressure; real atmospheric or weather data is not fetched in this prototype.</div></div></div></section><section className="simulation-panel"><div className="simulation-heading"><div className="eyebrow">SIMULATION DEFINITION / CASE 01</div><h2>Describe the run before the solver.</h2><p>These assumptions make the preview explicit and create a practical handoff contract for a later CFD service.</p><div className="readiness-meter"><div><span>CASE READINESS</span><strong>{readinessScore}%</strong></div><i><b style={{ width: `${readinessScore}%` }} /></i><small>{simulationStatus}</small></div></div><div className="simulation-grid"><label className="simulation-field"><span>Flow regime</span><select value={flowModel} onChange={(e) => { markSimulationChanged(); setFlowModel(e.target.value); }}><option>Steady external flow</option><option>Transient gust response</option></select></label><label className="simulation-field"><span>Solver formulation</span><select value={solverModel} onChange={(e) => { markSimulationChanged(); setSolverModel(e.target.value); }}><option>RANS pressure-based</option><option>LES research mode</option><option>Potential flow estimate</option></select></label><label className="simulation-field"><span>Turbulence model</span><select value={turbulenceModel} onChange={(e) => { markSimulationChanged(); setTurbulenceModel(e.target.value); }}><option>k-omega SST</option><option>k-epsilon realizable</option><option>Spalart–Allmaras</option></select></label><label className="simulation-field"><span>Ground condition</span><select value={groundCondition} onChange={(e) => { markSimulationChanged(); setGroundCondition(e.target.value); }}><option>Moving ground</option><option>Stationary ground</option><option>Roadway boundary</option></select></label><label className="simulation-field"><span>Mesh target</span><select value={meshTarget} onChange={(e) => { markSimulationChanged(); setMeshTarget(e.target.value); }}><option>2.5–4.0 M cells</option><option>1.0–2.5 M cells</option><option>4.0–8.0 M cells</option></select></label><label className="simulation-field range-field"><span>Boundary-layer layers <strong>{boundaryLayerLayers}</strong></span><input type="range" min="6" max="20" value={boundaryLayerLayers} onChange={(e) => { markSimulationChanged(); setBoundaryLayerLayers(Number(e.target.value)); }} /></label><label className="simulation-field range-field"><span>Inlet-to-rider length <strong>{domainLength} m</strong></span><input type="range" min="4" max="10" value={domainLength} onChange={(e) => { markSimulationChanged(); setDomainLength(Number(e.target.value)); }} /></label><label className="simulation-field range-field"><span>Maximum iterations <strong>{iterations}</strong></span><input type="range" min="300" max="2000" step="100" value={iterations} onChange={(e) => { markSimulationChanged(); setIterations(Number(e.target.value)); }} /></label><label className="simulation-field range-field"><span>Residual target <strong>1e-{residualExponent}</strong></span><input type="range" min="3" max="6" value={residualExponent} onChange={(e) => { markSimulationChanged(); setResidualExponent(Number(e.target.value)); }} /></label></div><div className="assumption-strip"><span className="field-trace" /><strong>Current assumption</strong><span>{flowModel} · {groundCondition.toLowerCase()} · {turbulenceModel} · {meshTarget}</span></div></section><section className="solver-timeline-panel"><div className="timeline-heading"><div><div className="eyebrow">SOLVER RUN / PREVIEW TIMELINE</div><h2>Follow the handoff state.</h2><p>This timed sequence is interface-only. It does not call a CFD solver or produce measured results.</p></div><span className={`timeline-badge ${solverStage}`}>{solverStageLabels[solverStage]}</span></div><div className="timeline-track">{solverStages.map((stage, index) => <div className={`timeline-step ${index < solverStageIndex ? "complete" : ""} ${index === solverStageIndex ? "active" : ""}`} key={stage}><span className="timeline-node">{index + 1}</span><div><strong>{solverStageLabels[stage]}</strong><small>{stage === "queued" ? "Inputs accepted" : stage === "meshing" ? "Preparing surface discretization" : stage === "solving" ? "Iterating estimated field" : "Inspect derived outputs"}</small></div></div>)}</div><div className="timeline-footer"><span>{simulationStatus}</span><button className="timeline-reset" onClick={() => { setSolverStage("idle"); setRunning(false); setSimulationStatus(preparedAt ? "Case ready for solver handoff" : "Definition in progress"); }} disabled={solverIsRunning}>Reset run</button></div></section><section className="validation-panel"><div className="validation-heading"><div className="eyebrow">VALIDATION READOUT / DERIVED</div><h2>Keep the force estimate interpretable.</h2><p>These values are derived from the current preview inputs. They are not measured CFD results.</p></div><div className="validation-grid"><label className="validation-field"><span>Reference area <strong>{referenceArea.toFixed(2)} m²</strong></span><input type="range" min="0.30" max="0.80" step="0.01" value={referenceArea} onChange={(e) => { markSimulationChanged(); setReferenceArea(Number(e.target.value)); }} /></label><label className="validation-field"><span>Characteristic length <strong>{characteristicLength.toFixed(2)} m</strong></span><input type="range" min="0.70" max="1.40" step="0.01" value={characteristicLength} onChange={(e) => { markSimulationChanged(); setCharacteristicLength(Number(e.target.value)); }} /></label><label className="validation-field"><span>Dynamic viscosity <strong>{dynamicViscosity.toFixed(2)}e-5 Pa·s</strong></span><input type="range" min="1.55" max="2.10" step="0.01" value={dynamicViscosity} onChange={(e) => { markSimulationChanged(); setDynamicViscosity(Number(e.target.value)); }} /></label></div><div className="validation-ledger"><div><span>Reynolds number</span><strong>{Math.round(reynoldsNumber).toLocaleString()}</strong><small>dimensionless</small></div><div><span>Dynamic pressure</span><strong>{dynamicPressure.toFixed(1)}</strong><small>Pa</small></div><div><span>Force-model Cd</span><strong>{forceModelCd.toFixed(3)}</strong><small>Cd = CdA / area</small></div><div><span>Preview drag basis</span><strong>{derivedDragForce.toFixed(1)}</strong><small>N · estimated</small></div></div></section><section className="geometry-panel"><div className="geometry-heading"><div className="eyebrow">GEOMETRY SPECIFICATION / R-01</div><h2>Reference dimensions for meshing.</h2><p>The current scene is a simplified concept. These values define its scale and coordinate contract before CAD or mesh export.</p></div><div className="geometry-grid"><label>Wheelbase <strong>{wheelbase.toFixed(2)} m</strong><input type="range" min="0.90" max="1.20" step="0.01" value={wheelbase} onChange={(e) => { markGeometryChanged(); setWheelbase(Number(e.target.value)); }} /></label><label>Wheel diameter <strong>{wheelDiameter.toFixed(2)} m</strong><input type="range" min="0.65" max="0.75" step="0.01" value={wheelDiameter} onChange={(e) => { markGeometryChanged(); setWheelDiameter(Number(e.target.value)); }} /></label><label>Rider height <strong>{riderHeight.toFixed(2)} m</strong><input type="range" min="1.55" max="2.05" step="0.01" value={riderHeight} onChange={(e) => { markGeometryChanged(); setRiderHeight(Number(e.target.value)); }} /></label></div><div className={`geometry-status ${preparedAt ? "is-prepared" : ""}`}><div className="geometry-status-head"><span className="eyebrow">MESH CONTRACT</span>{preparedAt ? <CheckCircle2 size={16} /> : <span className="status-dot" />}</div><strong>{geometryStatus}</strong><label className="case-name-field"><span>Case name</span><input value={caseName} onChange={(e) => setCaseName(e.target.value)} aria-label="Case name" /></label><span className="readiness-copy">Scale locked · surfaces simplified · watertight check pending</span>{preparedAt && <span className="prepared-stamp">Prepared {preparedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}<div className="geometry-actions"><button className="export-button" onClick={prepareGeometry}>{preparedAt ? "Refresh preparation" : "Prepare solver export"}</button><button className="save-case-button" onClick={saveCase} disabled={!preparedAt}><History size={13} /> Save case</button><button className="manifest-button" onClick={downloadManifest} disabled={!preparedAt} title={preparedAt ? "Download the prepared geometry manifest" : "Prepare the geometry specification first"}><FileJson2 size={13} /> Manifest <Download size={12} /></button></div></div></section><footer className="lab-footer"><span><Gauge size={14} /> Solver: preview field / no CFD</span><span>Air density {airDensity} kg/m³</span><span>Last saved just now</span></footer>
    </section>
  </main>;
}
