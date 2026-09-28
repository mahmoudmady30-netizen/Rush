# Motion Rush 2 — Complete Body-Controlled Runner

A production-oriented prototype combining:
- Three.js 3D endless runner
- MediaPipe Pose body tracking
- Lean left/right lane control
- Hands-up jump
- Crouch slide
- Procedural city/road/obstacle/coin world
- Score, distance, speed and coins
- Missions and persistent progress
- Skins
- Pause/resume
- Calibration
- Haptic feedback
- Sound effects generated with Web Audio
- Arabic/English-ready architecture
- Local persistence
- Camera preview
- Keyboard fallback
- PWA manifest

## Run
Camera access requires HTTPS or localhost. GitHub Pages is suitable.
For local testing:
python3 -m http.server 8080
Then open http://localhost:8080

## Notes
Three.js and MediaPipe are loaded from public CDNs. For a commercial release, pin and self-host approved dependency versions and assets, add your own licensed 3D models/audio, privacy consent, crash analytics, device-performance tiers, store billing and a backend leaderboard.

## Controls
Body:
- Lean left/right = lane
- Both hands above shoulders = jump
- Crouch = slide

Keyboard:
- A/D or arrows = lane
- W/Space = jump
- S/down = slide
- P = pause
