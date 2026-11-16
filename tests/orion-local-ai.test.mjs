import test from "node:test";
import assert from "node:assert/strict";
import {
  ORION_DEVICE_PROFILE,
  LOCAL_MODEL_TIERS,
  getLocalRuntimeCapabilities,
  chooseLocalModelTier,
  getCloudFallbackReason,
} from "../lib/orion-local-ai.mjs";

test("records the confirmed Nothing Phone 2a resource budget", () => {
  assert.equal(ORION_DEVICE_PROFILE.physicalRamGb, 8);
  assert.equal(ORION_DEVICE_PROFILE.virtualRamGb, 8);
  assert.equal(ORION_DEVICE_PROFILE.storageGb, 256);
  assert.equal(ORION_DEVICE_PROFILE.freeStorageGb, 132);
});

test("does not promise local inference without WebGPU", () => {
  assert.equal(chooseLocalModelTier({ physicalRamGb: 8, freeStorageGb: 132, hasWebGPU: false }), null);
});

test("selects the conservative small tier when device prerequisites pass", () => {
  assert.equal(chooseLocalModelTier({ physicalRamGb: 8, freeStorageGb: 132, hasWebGPU: true }).id, "small-1b");
  assert.equal(LOCAL_MODEL_TIERS[1].id, "mid-3b");
});

test("rejects insufficient memory or storage", () => {
  assert.equal(chooseLocalModelTier({ physicalRamGb: 4, freeStorageGb: 132, hasWebGPU: true }), null);
  assert.equal(chooseLocalModelTier({ physicalRamGb: 8, freeStorageGb: 1, hasWebGPU: true }), null);
});

test("detects browser capabilities without assuming device RAM values", () => {
  const result = getLocalRuntimeCapabilities({ navigator: { onLine: false } });
  assert.equal(result.hasWebGPU, false);
  assert.equal(result.isOnline, false);
  assert.equal(result.reportedDeviceMemoryGb, null);
  assert.equal(result.runtimeStatus, "webgpu-unavailable");
});

test("provides explicit reasons for cloud fallback", () => {
  assert.equal(getCloudFallbackReason({ isOnline: false, hasWebGPU: true, runtimeLoaded: true }), "offline");
  assert.equal(getCloudFallbackReason({ isOnline: true, hasWebGPU: false, runtimeLoaded: false }), "webgpu-unavailable");
  assert.equal(getCloudFallbackReason({ isOnline: true, hasWebGPU: true, runtimeLoaded: false }), "local-runtime-not-loaded");
  assert.equal(getCloudFallbackReason({ isOnline: true, hasWebGPU: true, runtimeLoaded: true }), null);
});
