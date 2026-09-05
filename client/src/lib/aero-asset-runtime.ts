import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type AeroAssetConfig = {
  bicycleUrl: string;
  riderUrl: string;
};

declare global {
  interface Window {
    __BICYCLE_AERO_ASSETS__?: AeroAssetConfig;
  }
}

const fallbackConfig: AeroAssetConfig = {
  bicycleUrl: "/assets/bicycle.glb",
  riderUrl: "https://three.ws/api/glb?src=https%3A%2F%2Fpub-2534e921bf9c4314addcd4d8a6e98b7b.r2.dev%2Favatars%2Fmixamo%2Fglb%2Fy-bot.glb",
};

function config() {
  return window.__BICYCLE_AERO_ASSETS__ ?? fallbackConfig;
}

function normalize(root: THREE.Object3D, role: "bicycle" | "rider") {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const targetLength = role === "bicycle" ? 2.2 : 1.95;
  const scale = targetLength / maxDimension;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function poseRider(root: THREE.Object3D) {
  const bones = new Map<string, THREE.Object3D>();
  root.traverse((node) => {
    if (node.name) bones.set(node.name.toLowerCase(), node);
  });
  const find = (...names: string[]) => names.map((name) => bones.get(name.toLowerCase())).find(Boolean);
  const spine = find("spine", "spine1");
  const spine2 = find("spine2");
  const leftUpperArm = find("leftarm", "leftupperarm");
  const rightUpperArm = find("rightarm", "rightupperarm");
  const leftForearm = find("leftforearm", "leftlowerarm");
  const rightForearm = find("rightforearm", "rightlowerarm");
  const leftThigh = find("leftupleg", "leftthigh");
  const rightThigh = find("rightupleg", "rightthigh");
  const leftShin = find("leftleg", "leftlowerleg");
  const rightShin = find("rightleg", "rightlowerleg");
  if (spine) spine.rotation.x = -0.28;
  if (spine2) spine2.rotation.x = -0.2;
  if (leftUpperArm) leftUpperArm.rotation.z = -0.3;
  if (rightUpperArm) rightUpperArm.rotation.z = 0.3;
  if (leftForearm) leftForearm.rotation.z = -0.8;
  if (rightForearm) rightForearm.rotation.z = 0.8;
  if (leftThigh) leftThigh.rotation.x = -0.7;
  if (rightThigh) rightThigh.rotation.x = 0.7;
  if (leftShin) leftShin.rotation.x = 1.15;
  if (rightShin) rightShin.rotation.x = 1.15;
}

function loadPrimary(scene: THREE.Scene, role: "bicycle" | "rider", url: string) {
  if (!url || scene.userData[`__aeroPrimary_${role}`]) return;
  scene.userData[`__aeroPrimary_${role}`] = true;
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    const asset = gltf.scene;
    asset.name = `asset-${role}-primary`;
    normalize(asset, role);
    if (role === "bicycle") {
      const fallback = scene.userData.__aeroFallbackBike as THREE.Object3D | undefined;
      if (fallback) fallback.visible = false;
      asset.rotation.y = -Math.PI / 2;
    }
    if (role === "rider") {
      poseRider(asset);
      asset.rotation.y = -Math.PI / 2;
      asset.position.y += 0.05;
    }
    scene.add(asset);
    scene.userData[`__aeroPrimary_${role}_loaded`] = true;
  }, undefined, () => {
    scene.userData[`__aeroPrimary_${role}`] = false;
    if (role === "bicycle") scene.userData.__aeroPrimaryBicycleFailed = true;
  });
}

const originalAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function (...objects: THREE.Object3D[]) {
  const result = originalAdd.apply(this, objects);
  const fallbackBike = objects.find((object) => object.name.startsWith("bicycle-and-rider /"));
  if (fallbackBike) {
    this.userData.__aeroFallbackBike = fallbackBike;
    const assets = config();
    window.setTimeout(() => {
      loadPrimary(this, "bicycle", assets.bicycleUrl);
      loadPrimary(this, "rider", assets.riderUrl);
    }, 0);
  }
  return result;
};

export {};
