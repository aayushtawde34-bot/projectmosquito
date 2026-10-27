import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from './simulation/AudioEngine';
import { InsectSimulation, SimMetrics } from './simulation/InsectSimulation';
import { View2D } from './views/View2D';
import { View3D } from './views/View3D';
import { PRESENTATION_DATA, SlideInfo } from './data/presentationData';

export const App: React.FC = () => {
  // View & Simulation State
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'split'>('3d');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Camera & 2D Controls
  const [camPreset, setCamPreset] = useState<string>('orbit');
  const [mode2D, setMode2D] = useState<'topdown' | 'side'>('topdown');
  const [showRuler, setShowRuler] = useState<boolean>(true);

  // Trap & Environment Parameters
  const [activePreset, setActivePreset] = useState<string>('bedroom');
  const [trapType, setTrapTypeState] = useState<string>('zapper');
  const [wavelength, setWavelengthState] = useState<number>(365);
  const [ambientLight, setAmbientLightState] = useState<number>(0.15);
  const [lampHeight, setLampHeightState] = useState<number>(1.5);
  const [humanDistance, setHumanDistanceState] = useState<number>(3.5);

  // Metrics Telemetry
  const [metrics, setMetrics] = useState<SimMetrics>({
    activeFlying: 45,
    totalTrapped: 0,
    totalSpawned: 45,
    efficiencyPercent: 0,
    bitesPrevented: 0,
    humanBites: 0,
    speciesBreakdown: { mosquito: 0 },
    trapName: 'Electric Grid Zapper',
    trapPower: '15W–40W',
    trapSound: 'Audible Zap (>65 dB)',
    soundDb: 68,
    humanDistance: '3.5'
  });

  // Slide Guide Modal State
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [selectedSlideId, setSelectedSlideId] = useState<number>(1);

  // Engine Refs
  const audioRef = useRef<AudioEngine | null>(null);
  const simRef = useRef<InsectSimulation | null>(null);
  const view2dRef = useRef<View2D | null>(null);
  const view3dRef = useRef<View3D | null>(null);
  const canvas3DContainerRef = useRef<HTMLDivElement | null>(null);
  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Initialize Engines & Loop
  useEffect(() => {
    const audio = new AudioEngine();
    audioRef.current = audio;

    const sim = new InsectSimulation(audio);
    simRef.current = sim;

    // Initialize 3D View
    if (canvas3DContainerRef.current) {
      const v3d = new View3D(canvas3DContainerRef.current, sim);
      view3dRef.current = v3d;
    }

    // Initialize 2D View
    if (canvas2DRef.current) {
      const canvas = canvas2DRef.current;
      const parent = canvas.parentElement;
      canvas.width = parent?.clientWidth || 800;
      canvas.height = parent?.clientHeight || 600;
      const v2d = new View2D(canvas, sim);
      view2dRef.current = v2d;
    }

    // Simulation event listener
    const handleSimEvent = (eventType: string) => {
      if (eventType === 'zap' || eventType === 'suctionCapture' || eventType === 'stickyCapture' || eventType === 'trayCleaned') {
        if (simRef.current) {
          setMetrics(simRef.current.getMetrics());
        }
      }
    };
    sim.addListener(handleSimEvent);

    // Window resize handler
    const handleResize = () => {
      if (view3dRef.current) view3dRef.current.onResize();
      if (canvas2DRef.current && canvas2DRef.current.parentElement) {
        canvas2DRef.current.width = canvas2DRef.current.parentElement.clientWidth || 800;
        canvas2DRef.current.height = canvas2DRef.current.parentElement.clientHeight || 600;
      }
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let frameCount = 0;
    const renderLoop = (timeNow: number) => {
      const dt = Math.min(0.05, (timeNow - lastTimeRef.current) / 1000);
      lastTimeRef.current = timeNow;

      if (simRef.current && !simRef.current.isPaused) {
        simRef.current.update(dt);
      }

      if (view3dRef.current) {
        view3dRef.current.update(dt, timeNow);
      }

      if (view2dRef.current) {
        view2dRef.current.render(timeNow);
      }

      frameCount++;
      if (frameCount % 10 === 0 && simRef.current) {
        setMetrics(simRef.current.getMetrics());
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      sim.removeListener(handleSimEvent);
      if (view2dRef.current) view2dRef.current.destroy();
      if (view3dRef.current) view3dRef.current.destroy();
    };
  }, []);

  // Update Viewports layout on mode change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (view3dRef.current) view3dRef.current.onResize();
      if (canvas2DRef.current && canvas2DRef.current.parentElement) {
        canvas2DRef.current.width = canvas2DRef.current.parentElement.clientWidth || 800;
        canvas2DRef.current.height = canvas2DRef.current.parentElement.clientHeight || 600;
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [viewMode]);

  // Audio Toggle
  const toggleAudio = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.setMuted(nextMuted);
    }
  }, [isMuted]);

  // Play / Pause Toggle
  const togglePlayPause = useCallback(() => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (simRef.current) {
      simRef.current.isPaused = nextPaused;
    }
  }, [isPaused]);

  // Camera Presets
  const handleCamPreset = useCallback((preset: string) => {
    setCamPreset(preset);
    if (view3dRef.current) {
      view3dRef.current.setCameraPreset(preset);
    }
  }, []);

  // 2D Controls
  const handleMode2D = useCallback((mode: 'topdown' | 'side') => {
    setMode2D(mode);
    if (view2dRef.current) {
      view2dRef.current.setMode(mode);
    }
  }, []);

  const handleToggleRuler = useCallback(() => {
    const next = !showRuler;
    setShowRuler(next);
    if (view2dRef.current) {
      view2dRef.current.showRuler = next;
    }
  }, [showRuler]);

  // Day / Night Switcher
  const handleDayNightMode = useCallback((isDay: boolean) => {
    setIsDayMode(isDay);
    if (simRef.current) simRef.current.setDayNightMode(isDay);
    if (view3dRef.current) view3dRef.current.setDayNightMode(isDay);
    if (view2dRef.current) view2dRef.current.setDayNightMode(isDay);

    const val = isDay ? 0.85 : 0.12;
    setAmbientLightState(val);
  }, []);

  // Trap Selection
  const handleSelectTrap = useCallback((type: string) => {
    setTrapTypeState(type);
    if (simRef.current) {
      simRef.current.setTrapType(type);
      setMetrics(simRef.current.getMetrics());
    }
  }, []);

  // Wavelength Selection
  const handleSelectWavelength = useCallback((nm: number) => {
    setWavelengthState(nm);
    if (simRef.current) {
      simRef.current.setWavelength(nm);
      setMetrics(simRef.current.getMetrics());
    }
  }, []);

  // Sliders
  const handleAmbientLightChange = useCallback((v: number) => {
    setAmbientLightState(v);
    if (simRef.current) {
      simRef.current.setAmbientLight(v);
    }
  }, []);

  const handleLampHeightChange = useCallback((h: number) => {
    setLampHeightState(h);
    if (simRef.current) {
      simRef.current.setLampHeight(h);
    }
  }, []);

  const handleHumanDistanceChange = useCallback((d: number) => {
    setHumanDistanceState(d);
    if (simRef.current) {
      simRef.current.setHumanDistance(d);
      setMetrics(simRef.current.getMetrics());
    }
  }, []);

  // Scenario Presets
  const applyPreset = useCallback((preset: string) => {
    setActivePreset(preset);
    if (preset === 'bedroom') {
      handleDayNightMode(false);
      handleSelectTrap('suction');
      handleSelectWavelength(365);
      handleHumanDistanceChange(3.8);
      handleLampHeightChange(1.4);
    } else if (preset === 'patio') {
      handleDayNightMode(false);
      handleSelectTrap('zapper');
      handleSelectWavelength(365);
      handleHumanDistanceChange(3.2);
      handleLampHeightChange(1.6);
    } else if (preset === 'daylight') {
      handleDayNightMode(true);
      handleSelectTrap('solar');
      handleSelectWavelength(365);
      handleHumanDistanceChange(3.0);
      handleLampHeightChange(1.5);
    } else if (preset === 'scientific') {
      handleDayNightMode(false);
      handleSelectTrap('zapper');
      handleSelectWavelength(550);
      handleHumanDistanceChange(3.5);
    }
  }, [handleDayNightMode, handleSelectTrap, handleSelectWavelength, handleHumanDistanceChange, handleLampHeightChange]);

  // Release Swarm
  const handleReleaseSwarm = useCallback(() => {
    if (simRef.current) {
      simRef.current.spawnSwarm(15);
      setMetrics(simRef.current.getMetrics());
    }
  }, []);

  // Empty Tray
  const handleEmptyTray = useCallback(() => {
    if (simRef.current) {
      simRef.current.clearCatchTray();
      setMetrics(simRef.current.getMetrics());
    }
  }, []);

  // Current Wavelength info
  const currentWl = PRESENTATION_DATA.wavelengths.find(w => w.nm === wavelength) || PRESENTATION_DATA.wavelengths[0];
  const selectedSlide: SlideInfo = PRESENTATION_DATA.slides.find(s => s.id === selectedSlideId) || PRESENTATION_DATA.slides[0];

  return (
    <div id="app">
      {/* Top Navigation Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <div className="brand-title">
            <span>Mosquito &amp; Insect Lamp Simulator</span>
            <span className="brand-badge" id="chemical-free-badge">100% Chemical-Free</span>
          </div>
        </div>

        {/* Viewport Mode Selector (3D / 2D / Split View) */}
        <div className="view-mode-tabs">
          <button
            className={`tab-btn ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            3D Realistic Room
          </button>
          <button
            className={`tab-btn ${viewMode === '2d' ? 'active' : ''}`}
            onClick={() => setViewMode('2d')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            2D Tactical Radar
          </button>
          <button
            className={`tab-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="12" y1="3" x2="12" y2="21"></line>
            </svg>
            Dual Split View
          </button>
        </div>

        {/* Day / Night Mode Switcher */}
        <div className="day-night-toggle" id="day-night-toggle">
          <button
            className={`dn-btn ${!isDayMode ? 'active' : ''}`}
            data-dn="night"
            title="Night Mode: Optimal UV Contrast & Catch (Slide 11)"
            onClick={() => handleDayNightMode(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            Night
          </button>
          <button
            className={`dn-btn ${isDayMode ? 'active' : ''}`}
            data-dn="day"
            title="Day Mode: Bright Light Washes UV Contrast (Slide 11)"
            onClick={() => handleDayNightMode(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            Day
          </button>
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button
            className={`icon-btn ${!isMuted ? 'active' : ''}`}
            title="Toggle Sound FX (Zaps, Vortex Fan, Mosquito Buzz)"
            onClick={toggleAudio}
          >
            {isMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            )}
          </button>

          <button
            className="icon-btn"
            title="Play / Pause Simulation"
            onClick={togglePlayPause}
          >
            {isPaused ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            )}
          </button>

          <button
            className="guide-pill-btn"
            onClick={() => setIsGuideOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Slide Guide &amp; Specs
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="workspace-body">
        <div className={`viewports-wrapper ${viewMode === 'split' ? 'split-mode' : ''}`}>
          {/* 3D Realistic Viewport */}
          <div
            className={`viewport-pane ${
              viewMode === '3d'
                ? 'active-full'
                : viewMode === 'split'
                ? ''
                : 'hidden'
            }`}
            id="pane-3d"
          >
            <div id="canvas-3d-container" ref={canvas3DContainerRef}></div>

            {/* 3D Camera Controls Overlay */}
            <div className="camera-pills">
              <button
                className={`camera-pill-btn ${camPreset === 'orbit' ? 'active' : ''}`}
                onClick={() => handleCamPreset('orbit')}
              >
                Orbit Room
              </button>
              <button
                className={`camera-pill-btn ${camPreset === 'closeup' ? 'active' : ''}`}
                onClick={() => handleCamPreset('closeup')}
              >
                Close-up Zapper
              </button>
              <button
                className={`camera-pill-btn ${camPreset === 'human_pov' ? 'active' : ''}`}
                onClick={() => handleCamPreset('human_pov')}
              >
                Human POV
              </button>
              <button
                className={`camera-pill-btn ${camPreset === 'topdown' ? 'active' : ''}`}
                onClick={() => handleCamPreset('topdown')}
              >
                Top-Down 3D
              </button>
            </div>
          </div>

          {/* 2D Tactical Viewport */}
          <div
            className={`viewport-pane ${
              viewMode === '2d'
                ? 'active-full'
                : viewMode === 'split'
                ? ''
                : 'hidden'
            }`}
            id="pane-2d"
          >
            <canvas id="canvas-2d" ref={canvas2DRef}></canvas>

            {/* 2D Floating Sub Controls */}
            <div className="floating-sub-controls">
              <button
                className={`sub-btn ${mode2D === 'topdown' ? 'active' : ''}`}
                onClick={() => handleMode2D('topdown')}
              >
                Top-Down Floorplan
              </button>
              <button
                className={`sub-btn ${mode2D === 'side' ? 'active' : ''}`}
                onClick={() => handleMode2D('side')}
              >
                Side Cross-Section
              </button>
              <button
                className={`sub-btn ${showRuler ? 'active' : ''}`}
                title="Toggle 3-5m Spacing Ruler"
                onClick={handleToggleRuler}
              >
                Ruler: {showRuler ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Controls & Live Telemetry Sidebar */}
        <aside className="sidebar-panel">
          {/* Presets Section */}
          <section className="sidebar-section">
            <div className="section-title">
              <span>Scenario Presets</span>
              <span style={{ color: 'var(--cyan-accent)', fontSize: '0.7rem' }}>Quick Load</span>
            </div>
            <div className="preset-grid">
              <button
                className={`preset-card ${activePreset === 'bedroom' ? 'active' : ''}`}
                onClick={() => applyPreset('bedroom')}
              >
                <div className="preset-title">🌙 Bedroom Sleep</div>
                <div className="preset-subtitle">Suction Fan • 365nm • Night</div>
              </button>
              <button
                className={`preset-card ${activePreset === 'patio' ? 'active' : ''}`}
                onClick={() => applyPreset('patio')}
              >
                <div className="preset-title">⚡ Patio Zapper</div>
                <div className="preset-subtitle">High-Voltage • 2400V Grid</div>
              </button>
              <button
                className={`preset-card ${activePreset === 'daylight' ? 'active' : ''}`}
                onClick={() => applyPreset('daylight')}
              >
                <div className="preset-title">☀️ Day Exposure</div>
                <div className="preset-subtitle">Sunlight washes UV contrast</div>
              </button>
              <button
                className={`preset-card ${activePreset === 'scientific' ? 'active' : ''}`}
                onClick={() => applyPreset('scientific')}
              >
                <div className="preset-title">🔬 Wavelength Test</div>
                <div className="preset-subtitle">365nm UV vs 550nm Green</div>
              </button>
            </div>
          </section>

          {/* Trap Mechanism Selector */}
          <section className="sidebar-section">
            <div className="section-title">
              <span>Trap Type &amp; Mechanism</span>
              <span id="trap-sound-db" style={{ fontFamily: 'var(--font-mono)', color: 'var(--emerald)' }}>
                {metrics.soundDb} dB ({metrics.trapSound.split(' ')[0]})
              </span>
            </div>
            <div className="trap-selector-group">
              <div
                className={`trap-card ${trapType === 'zapper' ? 'active' : ''}`}
                onClick={() => handleSelectTrap('zapper')}
              >
                <div className="trap-info-left">
                  <div className="trap-icon-bubble">⚡</div>
                  <div>
                    <div className="trap-name">Electric Grid Zapper</div>
                    <div className="trap-subtext">15W–40W • Audible Zap (&gt;65 dB)</div>
                  </div>
                </div>
                <span className="trap-badge">High Impact</span>
              </div>

              <div
                className={`trap-card ${trapType === 'suction' ? 'active' : ''}`}
                onClick={() => handleSelectTrap('suction')}
              >
                <div className="trap-info-left">
                  <div className="trap-icon-bubble">🌀</div>
                  <div>
                    <div className="trap-name">Vortex Suction Fan</div>
                    <div className="trap-subtext">5W–12W • Whisper Quiet (&lt;25 dB)</div>
                  </div>
                </div>
                <span className="trap-badge">Clean &amp; Safe</span>
              </div>

              <div
                className={`trap-card ${trapType === 'sticky' ? 'active' : ''}`}
                onClick={() => handleSelectTrap('sticky')}
              >
                <div className="trap-info-left">
                  <div className="trap-icon-bubble">🍯</div>
                  <div>
                    <div className="trap-name">Hygienic Sticky Pad</div>
                    <div className="trap-subtext">8W–20W • Completely Silent (0 dB)</div>
                  </div>
                </div>
                <span className="trap-badge">Food-Safe</span>
              </div>

              <div
                className={`trap-card ${trapType === 'solar' ? 'active' : ''}`}
                onClick={() => handleSelectTrap('solar')}
              >
                <div className="trap-info-left">
                  <div className="trap-icon-bubble">☀️</div>
                  <div>
                    <div className="trap-name">Solar Outdoor Lamp</div>
                    <div className="trap-subtext">3W–10W • Battery + Electro-Mesh</div>
                  </div>
                </div>
                <span className="trap-badge">Off-Grid</span>
              </div>
            </div>
          </section>

          {/* Wavelength Selector */}
          <section className="sidebar-section">
            <div className="section-title">
              <span>Phototactic Wavelength</span>
              <span id="attraction-rate-text" style={{ color: currentWl.color, fontWeight: 700 }}>
                {currentWl.attraction}% Attraction ({currentWl.label})
              </span>
            </div>
            <div className="wavelength-selector">
              <button
                className={`wavelength-btn ${wavelength === 365 ? 'active' : ''}`}
                onClick={() => handleSelectWavelength(365)}
              >
                <span className="wl-nm">365 nm</span>
                <span className="wl-pct" style={{ color: '#c084fc' }}>94% Deep UV</span>
              </button>
              <button
                className={`wavelength-btn ${wavelength === 395 ? 'active' : ''}`}
                onClick={() => handleSelectWavelength(395)}
              >
                <span className="wl-nm">395 nm</span>
                <span className="wl-pct" style={{ color: '#a855f7' }}>71% Near UV</span>
              </button>
              <button
                className={`wavelength-btn ${wavelength === 450 ? 'active' : ''}`}
                onClick={() => handleSelectWavelength(450)}
              >
                <span className="wl-nm">450 nm</span>
                <span className="wl-pct" style={{ color: '#38bdf8' }}>43% Blue</span>
              </button>
              <button
                className={`wavelength-btn ${wavelength === 550 ? 'active' : ''}`}
                onClick={() => handleSelectWavelength(550)}
              >
                <span className="wl-nm">550 nm</span>
                <span className="wl-pct" style={{ color: '#34d399' }}>18% Green</span>
              </button>
            </div>
          </section>

          {/* Environmental & Placement Controls */}
          <section className="sidebar-section">
            <div className="section-title">
              <span>Environment &amp; Placement</span>
            </div>

            {/* Ambient Room Lighting Slider */}
            <div className="control-row">
              <div className="control-label-bar">
                <span className="control-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                  </svg>
                  Ambient Room Light
                </span>
                <span className="control-val">
                  {Math.round(ambientLight * 100) < 20
                    ? `Dark Night (${Math.round(ambientLight * 100)}%)`
                    : Math.round(ambientLight * 100) < 60
                    ? `Dim Interior (${Math.round(ambientLight * 100)}%)`
                    : `Bright Daylight (${Math.round(ambientLight * 100)}%)`}
                </span>
              </div>
              <input
                type="range"
                className="sim-slider"
                min="0"
                max="1"
                step="0.05"
                value={ambientLight}
                onChange={(e) => handleAmbientLightChange(Number(e.target.value))}
              />
            </div>

            {/* Hanging Height */}
            <div className="control-row">
              <div className="control-label-bar">
                <span className="control-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                  Lamp Height (Chest Level)
                </span>
                <span
                  className="control-val"
                  style={{
                    color: lampHeight >= 1.2 && lampHeight <= 1.8 ? 'var(--cyan-accent)' : 'var(--amber)'
                  }}
                >
                  {lampHeight.toFixed(1)} m {lampHeight >= 1.2 && lampHeight <= 1.8 ? '(Optimal Chest)' : '(Non-standard)'}
                </span>
              </div>
              <input
                type="range"
                className="sim-slider"
                min="0.8"
                max="2.4"
                step="0.1"
                value={lampHeight}
                onChange={(e) => handleLampHeightChange(Number(e.target.value))}
              />
            </div>

            {/* Human Distance */}
            <div className="control-row">
              <div className="control-label-bar">
                <span className="control-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Human Spacing Distance
                </span>
                <span
                  className="control-val"
                  style={{
                    color: humanDistance >= 3.0 && humanDistance <= 5.0 ? 'var(--emerald)' : 'var(--amber)'
                  }}
                >
                  {humanDistance.toFixed(1)} m {humanDistance >= 3.0 && humanDistance <= 5.0 ? '(Optimal 3-5m)' : humanDistance < 3.0 ? '⚠ Too Close (<3m)' : 'Far (>5m)'}
                </span>
              </div>
              <input
                type="range"
                className="sim-slider"
                min="1.0"
                max="5.5"
                step="0.2"
                value={humanDistance}
                onChange={(e) => handleHumanDistanceChange(Number(e.target.value))}
              />
            </div>
          </section>

          {/* Live Telemetry KPI Cards */}
          <section className="sidebar-section">
            <div className="section-title">
              <span>Live Protection Telemetry</span>
              <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>Active Guard</span>
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--uv-purple)' }}>{metrics.totalTrapped}</div>
                <div className="kpi-label">Pests Eliminated</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--cyan-accent)' }}>{metrics.efficiencyPercent}%</div>
                <div className="kpi-label">Trap Catch Rate</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--emerald)' }}>{metrics.bitesPrevented}</div>
                <div className="kpi-label">Bites Intercepted</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--amber)' }}>{metrics.activeFlying}</div>
                <div className="kpi-label">Flying in Room</div>
              </div>
            </div>

            {/* Mosquito Target Dynamics */}
            <div className="species-list">
              <div className="species-bar-item">
                <div className="species-header">
                  <span className="species-name">
                    <span className="species-dot" style={{ background: '#a855f7' }}></span>
                    Mosquitoes Neutralized
                  </span>
                  <span className="species-count">{metrics.totalTrapped}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, Math.round((metrics.totalTrapped / (metrics.totalSpawned || 1)) * 100))}%`,
                      background: '#a855f7'
                    }}
                  ></div>
                </div>
              </div>

              <div className="species-bar-item">
                <div className="species-header">
                  <span className="species-name">
                    <span className="species-dot" style={{ background: '#10b981' }}></span>
                    Bites Intercepted (Protected)
                  </span>
                  <span className="species-count">{metrics.bitesPrevented}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, metrics.bitesPrevented * 4)}%`,
                      background: '#10b981'
                    }}
                  ></div>
                </div>
              </div>

              <div className="species-bar-item">
                <div className="species-header">
                  <span className="species-name">
                    <span className="species-dot" style={{ background: '#06b6d4' }}></span>
                    365nm UV Phototaxis Captures
                  </span>
                  <span className="species-count">{Math.round(metrics.totalTrapped * 0.72)}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${currentWl.attraction}%`,
                      background: '#06b6d4'
                    }}
                  ></div>
                </div>
              </div>

              <div className="species-bar-item">
                <div className="species-header">
                  <span className="species-name">
                    <span className="species-dot" style={{ background: '#f59e0b' }}></span>
                    37°C Thermal Lure Captures
                  </span>
                  <span className="species-count">{Math.round(metrics.totalTrapped * 0.28)}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: '85%',
                      background: '#f59e0b'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Action Buttons */}
          <div className="bottom-dock">
            <button className="primary-btn" onClick={handleReleaseSwarm}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Release Mosquito Swarm
            </button>
            <button
              className="secondary-btn"
              title="Empty the Removable Catch Tray (Slide 11)"
              onClick={handleEmptyTray}
            >
              Empty Tray
            </button>
          </div>
        </aside>
      </main>

      {/* Slide Deck & Knowledge Modal (Slides 1 to 8) */}
      <div
        className={`modal-overlay ${isGuideOpen ? 'active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsGuideOpen(false);
        }}
      >
        <div className="modal-container">
          <div className="modal-header">
            <div className="modal-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--uv-purple)" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <span>Mosquito &amp; Insect Lamps: Science &amp; Presentation Reference</span>
            </div>
            <button className="modal-close-btn" onClick={() => setIsGuideOpen(false)}>&times;</button>
          </div>

          <div className="modal-body">
            {/* Slide Navigation Tabs */}
            <nav className="slide-nav">
              {PRESENTATION_DATA.slides.map((sl) => (
                <div
                  key={sl.id}
                  className={`slide-nav-item ${selectedSlideId === sl.id ? 'active' : ''}`}
                  onClick={() => setSelectedSlideId(sl.id)}
                >
                  {sl.id}. {sl.title}
                </div>
              ))}
            </nav>

            {/* Slide Content Display */}
            <div className="slide-content-view">
              <div className="slide-badge">{selectedSlide.badge}</div>
              <h1 className="slide-h1">{selectedSlide.h1}</h1>
              <p className="slide-desc">{selectedSlide.desc}</p>
              <div className="slide-cards-grid">
                {selectedSlide.cards.map((c, i) => (
                  <div key={i} className="slide-card-box">
                    <div className="slide-card-title">{c.title}</div>
                    <div className="slide-card-text">{c.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default App;
