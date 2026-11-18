/**
 * ORION AI local-runtime capability and model policy.
 *
 * This module deliberately does not claim that WebGPU or a model runtime is
 * available until the browser reports it. Model sizes are conservative
 * download/weight estimates; actual peak RAM is higher and device-dependent.
 */

export const ORION_DEVICE_PROFILE = Object.freeze({
  physicalRamGb: 8,
  virtualRamGb: 8,
  storageGb: 256,
  freeStorageGb: 132,
  gpu: "ARM Mali-G615 MC2",
  chipset: "MediaTek Dimensity 7200 Pro",
});

export const LOCAL_MODEL_TIERS = Object.freeze([
  Object.freeze({
    id: "small-1b",
    label: "1B–1.5B Q4",
    maxParametersB: 1.5,
    estimatedDownloadGb: 1.2,
    recommended: true,
    purpose: "First offline-chat target for 8 GB Android devices",
  }),
  Object.freeze({
    id: "mid-3b",
    label: "3B Q4",
    maxParametersB: 3,
    estimatedDownloadGb: 2.2,
    recommended: false,
    purpose: "Optional device benchmark after the small model is stable",
  }),
  Object.freeze({
    id: "large-7b",
    label: "7B Q4",
    maxParametersB: 7,
    estimatedDownloadGb: 4.8,
    recommended: false,
    purpose: "Experimental only; likely memory pressure on this phone",
  }),
]);

export function getLocalRuntimeCapabilities(environment = globalThis) {
  const navigatorObject = environment?.navigator;
  const deviceMemory = Number(navigatorObject?.deviceMemory);
  const storageEstimate = environment?.navigator?.storage?.estimate;
  const hasWebGPU = Boolean(navigatorObject?.gpu);
  const isOnline = navigatorObject?.onLine !== false;

  return {
    hasWebGPU,
    isOnline,
    reportedDeviceMemoryGb: Number.isFinite(deviceMemory) && deviceMemory > 0
      ? deviceMemory
      : null,
    supportsBrowserLocalInference: hasWebGPU,
    runtimeStatus: hasWebGPU ? "webgpu-available-runtime-not-loaded" : "webgpu-unavailable",
    storageEstimateAvailable: typeof storageEstimate === "function",
  };
}

export function chooseLocalModelTier({
  physicalRamGb = ORION_DEVICE_PROFILE.physicalRamGb,
  freeStorageGb = ORION_DEVICE_PROFILE.freeStorageGb,
  hasWebGPU = false,
} = {}) {
  if (!Number.isFinite(physicalRamGb) || physicalRamGb < 6) return null;
  if (!Number.isFinite(freeStorageGb) || freeStorageGb < 2) return null;

  // WebGPU is a prerequisite for the planned browser runtime. Without it,
  // the UI must not promise local model inference.
  if (!hasWebGPU) return null;

  if (physicalRamGb >= 8 && freeStorageGb >= 6) {
    return LOCAL_MODEL_TIERS[0];
  }
  return null;
}

export function getCloudFallbackReason({ isOnline, hasWebGPU, runtimeLoaded }) {
  if (!isOnline) return "offline";
  if (!hasWebGPU) return "webgpu-unavailable";
  if (!runtimeLoaded) return "local-runtime-not-loaded";
  return null;
}
