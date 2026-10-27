# 🦟 Mosquito & Insect Lamp Interactive Simulator (2D & 3D) — React + TypeScript

A high-performance, interactive scientific simulation of modern ultraviolet bug lamps and mosquitoes (*Culicidae*), built with **React**, **TypeScript**, **Three.js**, and **HTML5 Canvas**, based on the principles of **UV Phototaxis Wavelengths (365nm)**, **Mammalian Body Warmth Mimicry (37°C)**, **High-Voltage Grid Electric Arcs (2400V)**, and **Vortex Suction Down-draft Traps**.

---

## 🌟 Key Features

### 1. Dual Viewport System (2D & 3D)
- **3D Realistic WebGL Room** (`Three.js`):
  - Dynamic 3D Room with natural lighting, window with daylight/night sky, shadows, and reflection.
  - **Procedural 3D Lamp Model**: Central glowing 365nm UV quartz tube, electrified galvanized wire grid coils, spinning 5-bladed suction fan, outer finger-guard slotted safety cage, 37°C thermal heating ring, and twist-off collection cup.
  - **Anatomically Accurate 3D Mosquitoes**: Slender humpbacked thorax, striped segmented abdomen, 6 long spindly articulated legs (with signature extra-long trailing hind legs), piercing needle proboscis, compound eyes, feathery antennae, and high-frequency translucent flapping wings.
  - **3D Visual FX**: Electric lightning arcs bound strictly between grid and mosquito, spark particle bursts, and conical suction vortex stream particles.
  - **Camera Presets**: `Orbit Room`, `Close-up Zapper`, `Human POV`, and `Top-Down 3D`.
- **2D Tactical Radar View** (HTML5 Canvas):
  - Switchable between **Top-Down Floorplan** and **Side Elevation Cross-Section**.
  - **UV Phototaxis Vector Field**: Inverse-square intensity gradients and attraction contours.
  - **37°C Convection Heatmaps**: Thermal gradients emitted by lamp and competing human host.
  - **Suction Streamlines**: Dynamic whirlpool draft vectors.
  - **Drag-and-Drop Spacing Ruler**: Demonstrates the recommended **3–5 meter placement rule**.
- **Dual Split Mode**: Simultaneous side-by-side execution with shared real-time physics in React.

### 2. Day Mode ☀️ & Night Mode 🌙
- **Night Mode (Default)**: Deep nocturnal darkness with maximum UV contrast. Mosquitoes detect the 365nm purple glow as an irresistible beacon across the room.
- **Day Mode**: Warm sunlight streams through the window, washing out the optical contrast ratio of the UV lamp (demonstrating Slide 11's rule: *"Turn off bright lights so insects easily notice UV glow"*).

### 3. Biological & Physical Mechanics
- **Phototactic Wavelength Selection (Slide 5)**:
  - `365 nm (Deep UV-A)`: **94%** peak attraction.
  - `395 nm (Near-UV)`: **71%** attraction.
  - `450 nm (Blue Light)`: **43%** attraction.
  - `550 nm (Green Light)`: **18%** attraction.
- **Capture Mechanisms (Slide 4 & 7)**:
  - **High-Voltage Grid Zapper (15W–40W)**: Audible electric zap (>65 dB).
  - **Quiet Vortex Suction Fan (5W–12W)**: Whisper quiet (<25 dB).
  - **Hygienic Sticky Pad (8W–20W)**: Silent glue pad (0 dB).
  - **Solar Outdoor Lamp (3W–10W)**: Battery + daylight charging.
- **Procedural Sound Engine (`Web Audio API`)**:
  - Real-time synthesized electric arc crackles with sub-bass pop.
  - Soft pink-noise vortex fan drone.
  - Proximity-based mosquito flight whining with Doppler FM.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server on port 3000
npm run dev

# 3. Type check & build production bundle
npm run build
```

---

## 📁 Project Structure

```
mosquito-lamp-sim/
├── index.html                     # HTML root & typography fonts
├── metadata.json                  # AI Studio applet configuration
├── package.json                   # React, Three.js, Vite & TypeScript dependencies
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite bundler & server settings (port 3000)
├── README.md                      # Project documentation
└── src/
    ├── main.tsx                   # React root entry point
    ├── App.tsx                    # Main React application & state management
    ├── style.css                  # Dark glassmorphic design system
    ├── vite-env.d.ts              # Vite environment declarations
    ├── data/
    │   └── presentationData.ts    # Presentation slides, wavelengths, and trap specs
    ├── simulation/
    │   ├── InsectSimulation.ts    # 3D physics, agent steering, phototaxis & thermotaxis
    │   └── AudioEngine.ts         # Web Audio API procedural synthesis
    └── views/
        ├── View2D.ts              # HTML5 Canvas 2D tactical radar & cross-section
        └── View3D.ts              # Three.js 3D WebGL room, lamp, and mosquitoes
```
