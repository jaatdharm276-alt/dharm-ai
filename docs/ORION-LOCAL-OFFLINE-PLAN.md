# ORION AI Local + Offline Engine Plan

## Confirmed target device

- Phone: Nothing Phone (2a), Android 16
- SoC: MediaTek Dimensity 7200 Pro
- GPU: ARM Mali-G615 MC2
- Physical RAM: 8 GB
- RAM expansion: up to 8 GB virtual (storage-backed; not equivalent to physical RAM)
- Internal storage: 256 GB total, 132 GB free

## Model policy

1. Start with a 1B–1.5B quantized model.
2. Benchmark a 3B quantized model only after the small model works reliably.
3. Treat 7B as experimental on this device.
4. A 744B model is a remote/cloud deployment target, never a phone-local target.

Storage capacity only determines whether model files can be stored. It does not add GPU compute, GPU memory bandwidth, or physical RAM.

## Runtime decision

The current app is a Next.js PWA. The existing service worker caches the app shell but excludes API requests; that is not offline chat. Browser local inference must not be enabled merely because a device has free storage.

The first browser-runtime candidate is WebGPU-backed inference, gated on a real Android Chrome capability check. Mali-G615 WebGPU availability, driver stability, thermal behavior, and sustained token speed must be measured on the target handset. If WebGPU is absent or unstable, evaluate a native Android runtime in a dedicated APK build rather than silently falling back to CPU and claiming acceptable performance.

## Required implementation stages

1. Capability detection and conservative model policy (this change).
2. Add an explicitly versioned model/runtime adapter and model download manager with user-visible storage estimate, pause/resume, checksum verification, and delete controls.
3. Integrate local inference into chat with an honest Local / Cloud status and an explicit cloud fallback policy.
4. Cache only safe app assets and user-approved offline data; keep secrets out of browser storage.
5. Add offline tests, model-load failure tests, memory-pressure handling, thermal/performance measurement, and Android device acceptance.
6. Only call the feature Offline Chat when an actual downloaded model can generate a response with the network disabled.

## Safety and privacy constraints

- Never download a multi-gigabyte model automatically without explicit user action.
- Never send chat content to cloud when the user selected Local-only mode.
- In Hybrid mode, disclose cloud fallback before sending content to the server.
- Never store API credentials in IndexedDB or service-worker caches.
- Keep model files separate from chat history and provide a clear model removal action.

## Current scope

This commit adds capability policy and unit tests only. It does not yet load a model, enable offline inference, or alter the chat UI. Those are subsequent stages and must be validated on the actual Nothing Phone (2a).
