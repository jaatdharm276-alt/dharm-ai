# ORION AI Android wrapper

This project builds a lightweight Android WebView APK for the hosted ORION AI app at https://dharm-ai.vercel.app/.

## Build

The GitHub Actions workflow **ORION AI Android APK** builds an installable debug APK whenever Android wrapper files change, and can also be started manually with **Run workflow**. Download the `ORION-AI-Android-debug` artifact from the completed run.

Package ID: `ai.dharm.orion.debug` for debug builds.

## Install on Android

Download the APK artifact, open it on the Android phone, and allow installation from that download source if Android asks. The wrapper requires an internet connection for the hosted app and uses HTTPS only.

## Release / Play Store

The debug APK is for testing. A Play Store release requires a persistent release signing key, protected signing credentials, privacy policy, store listing, and final device testing. Do not commit a keystore or passwords to this repository.
