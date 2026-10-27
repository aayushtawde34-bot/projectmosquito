// Structured content from the Mosquito & Insect Lamp Presentation PDF

export interface WavelengthInfo {
  nm: number;
  label: string;
  attraction: number;
  color: string;
  glow: string;
  desc: string;
}

export interface TrapTypeInfo {
  name: string;
  power: string;
  mechanism: string;
  sound: string;
  soundValue: number;
  recommended: string;
  efficiency: number;
  badge: string;
  accent: string;
  desc: string;
}

export interface InsectSpeciesInfo {
  id: string;
  name: string;
  share: number;
  color: string;
  speed: number;
  size: number;
  thermalAffinity: number;
  lightAffinity: number;
  erraticness: number;
  desc: string;
}

export interface AnatomyPartInfo {
  id: string;
  title: string;
  desc: string;
}

export interface PlacementTipInfo {
  title: string;
  detail: string;
}

export interface TimelineInfo {
  year: string;
  title: string;
  desc: string;
}

export interface SlideInfo {
  id: number;
  title: string;
  badge: string;
  h1: string;
  desc: string;
  cards: { title: string; text: string }[];
}

export const PRESENTATION_DATA = {
  title: "Mosquito & Insect Lamps",
  subtitle: "A simple, clear guide to how modern ultraviolet bug lamps eliminate flying pests safely without harmful chemicals or toxic sprays.",
  
  wavelengths: [
    { nm: 365, label: "Deep UV-A", attraction: 94, color: "#9b51e0", glow: "rgba(155, 81, 224, 0.9)", desc: "Optimal peak wavelength for compound insect eyes. Emits over 5x more attraction than household room lighting." },
    { nm: 395, label: "Near-UV Light", attraction: 71, color: "#7928ca", glow: "rgba(121, 40, 202, 0.8)", desc: "High attraction spectrum, common in economy UV LED tubes." },
    { nm: 450, label: "Blue Light", attraction: 43, color: "#0070f3", glow: "rgba(0, 112, 243, 0.7)", desc: "Visible blue spectrum; captures mid-range phototactic attraction." },
    { nm: 550, label: "Green Light", attraction: 18, color: "#10b981", glow: "rgba(16, 185, 129, 0.6)", desc: "Low phototactic response for nocturnal biting mosquitoes; poor lure." }
  ] as WavelengthInfo[],

  trapTypes: {
    zapper: {
      name: "High-Voltage Electric Grid Zapper",
      power: "15W – 40W",
      mechanism: "Electrified galvanized metal wire mesh (1500V - 3000V)",
      sound: "Audible Zap (>65 dB)",
      soundValue: 68,
      recommended: "Patios, sheds, balconies, large open rooms",
      efficiency: 96,
      badge: "High Impact",
      accent: "#e056fd",
      desc: "Delivers an instant electric shock as soon as an insect makes contact. Instant audible zap, zero moving parts, long durability."
    },
    suction: {
      name: "Quiet Vortex Suction Fan",
      power: "5W – 12W",
      mechanism: "Whisper-quiet fan creates downward vortex vacuum draft",
      sound: "Whisper Quiet (<25 dB)",
      soundValue: 22,
      recommended: "Bedrooms, nurseries, dining areas, desks",
      efficiency: 89,
      badge: "Whisper Silent",
      accent: "#00f5ff",
      desc: "Traps insects whole without scattering burnt particles or sparks. Ideal for peaceful sleep and clean environments."
    },
    sticky: {
      name: "Hygienic Sticky Pad Trap",
      power: "8W – 20W",
      mechanism: "Non-drying glue pad beneath UV lamp",
      sound: "Completely Silent (0 dB)",
      soundValue: 0,
      recommended: "Kitchens, cafes, pantries, food prep",
      efficiency: 82,
      badge: "Food Safe",
      accent: "#f59e0b",
      desc: "Zero noise, zero splatter, 100% hygienic and compliant with sanitary food service requirements."
    },
    solar: {
      name: "Solar Outdoor Lamp",
      power: "3W – 10W",
      mechanism: "Rechargeable solar battery + electro-mesh with daylight sensor",
      sound: "Soft Zap (~50 dB)",
      soundValue: 48,
      recommended: "Gardens, lawns, camping, perimeter defense",
      efficiency: 86,
      badge: "Off-Grid Eco",
      accent: "#10b981",
      desc: "Autonomous outdoor pest perimeter defense powered by daylight charging."
    }
  } as Record<string, TrapTypeInfo>,

  insectSpecies: [
    {
      id: "mosquito",
      name: "Mosquitoes & Midges",
      share: 42,
      color: "#a855f7",
      speed: 1.3,
      size: 1.0,
      thermalAffinity: 0.95,
      lightAffinity: 0.85,
      erraticness: 0.8,
      desc: "Target human body warmth (37°C) & CO2, lured off-course by 365nm UV lamp."
    },
    {
      id: "fruitfly",
      name: "Fruit Flies & Drain Gnats",
      share: 28,
      color: "#06b6d4",
      speed: 1.7,
      size: 0.7,
      thermalAffinity: 0.3,
      lightAffinity: 0.95,
      erraticness: 0.9,
      desc: "Rapid darting flight; extremely responsive to light contrast gradient."
    },
    {
      id: "housefly",
      name: "Houseflies & Blowflies",
      share: 18,
      color: "#10b981",
      speed: 2.2,
      size: 1.4,
      thermalAffinity: 0.5,
      lightAffinity: 0.75,
      erraticness: 0.6,
      desc: "Fast, agile zig-zag flyers; susceptible to high-voltage grid & suction vortex."
    },
    {
      id: "moth",
      name: "Night Moths & Beetles",
      share: 12,
      color: "#f59e0b",
      speed: 1.1,
      size: 1.8,
      thermalAffinity: 0.2,
      lightAffinity: 1.0,
      erraticness: 0.4,
      desc: "Transverse phototaxis orientation results in tight spiral flight directly into grid."
    }
  ] as InsectSpeciesInfo[],

  anatomyParts: [
    {
      id: "uv_core",
      title: "UV Light Source (365nm)",
      desc: "Energy-efficient purple LEDs or UV quartz tubes emitting exact 365nm light tuned to insects' compound eyes."
    },
    {
      id: "grid_or_fan",
      title: "Electrified Wire Grid / Suction Vortex",
      desc: "Internal galvanized wire cage charged with voltage (1500V-3000V) or silent aerodynamic vortex impeller creating down-draft."
    },
    {
      id: "housing",
      title: "Outer Safety Housing",
      desc: "Finger-safe outer shell with narrow slots preventing curious children or pets from touching the high-voltage grid."
    },
    {
      id: "tray",
      title: "Removable Catch Tray",
      desc: "Twist-off bottom collector cup allowing mess-free disposal of trapped insects."
    },
    {
      id: "thermal_ring",
      title: "Thermal Lure Element (37°C)",
      desc: "Subtle heating circuit that mimics mammalian body temperature to trick blood-seeking mosquitoes."
    }
  ] as AnatomyPartInfo[],

  placementTips: [
    {
      title: "Hang at Chest Height (1.2m – 1.8m)",
      detail: "Matches the natural cruising flight height of seeking mosquitoes for the fastest catch rate."
    },
    {
      title: "Keep Other Lights Dim",
      detail: "Turn off bright overhead ceiling lamps so the 365nm purple UV glow maintains maximum contrast in the insect's eyes."
    },
    {
      title: "Place 3 to 5 Meters Away from You",
      detail: "Set the trap across the room from your bed or patio couch so incoming bugs intercept the lamp before reaching your skin."
    },
    {
      title: "Clean the Tray Weekly",
      detail: "Twist off and empty the collection cup regularly to maintain unimpeded airflow and keep the grid clear."
    }
  ] as PlacementTipInfo[],

  evolutionTimeline: [
    { year: "1930s", title: "Open Incandescent", desc: "First high-voltage bug electrocutors patented with open glowing incandescent wires." },
    { year: "1980s", title: "Fluorescent Blacklight", desc: "Black light fluorescent tubes become the gold standard in commercial restaurant kitchens." },
    { year: "2010s", title: "Silent Suction & Thermal", desc: "Quiet fan vortex suction traps and gentle 37°C thermal lures emerge for bedrooms." },
    { year: "2025+", title: "Smart UV-A LEDs & Solar", desc: "Modern low-power 365nm solid-state LEDs, USB-C portability, and autonomous solar garden traps." }
  ] as TimelineInfo[],

  slides: [
    {
      id: 1,
      title: "Overview: Safe Protection",
      badge: "Slide 1 & 2 • Foundation",
      h1: "Chemical-Free Flying Pest Defense",
      desc: "Modern insect lamps provide a healthy, continuous way to catch flying pests without aerosol sprays, toxic coils, or chemical vaporizers. By pairing natural ultraviolet light lure with subtle mammalian warmth (37°C), lamps protect families, dining areas, and patios safely.",
      cards: [
        { title: "Zero Toxic Residue", text: "Leaves no poisonous fumes or airborne chemical traces in living spaces." },
        { title: "No Pest Resistance", text: "Insects cannot develop physiological resistance to ultraviolet light traps." },
        { title: "Continuous Day & Night Guard", text: "Maintains uninterrupted protection around infants, elderly family, and pets." }
      ]
    },
    {
      id: 2,
      title: "How Insect Traps Work",
      badge: "Slide 3 • 3-Stage Mechanism",
      h1: "Light Lure + Warmth + Capture",
      desc: "Every modern insect trap relies on three scientifically calibrated physiological triggers to attract and neutralize flying pests:",
      cards: [
        { title: "1. 365nm UV Light Lure", text: "Emits specific ultraviolet wavelengths tuned to compound insect eyes, creating irresistible phototaxis contrast." },
        { title: "2. 37°C Body Warmth", text: "Built-in thermal elements mimic human body temperature, tricking blood-seeking mosquitoes into flying in." },
        { title: "3. Safe Capture Mechanism", text: "Electrified grid delivers instantaneous shock, or silent vortex fan pulls bugs into an escape-proof catch cup." }
      ]
    },
    {
      id: 3,
      title: "Light Wavelength Spectrum",
      badge: "Slide 5 • Phototaxis Physics",
      h1: "Which Light Colors Bugs Prefer",
      desc: "Compound eyes of nocturnal flying pests are biologically tuned to ultraviolet light. Wavelength selection directly governs attraction efficiency:",
      cards: [
        { title: "365 nm (Deep UV-A): 94%", text: "Highest phototactic attraction. Attracts over 5x more flying bugs than standard household room lighting." },
        { title: "395 nm (Near-UV): 71%", text: "High attraction spectrum, commonly utilized in energy-saving LED strips." },
        { title: "450 nm (Blue): 43%", text: "Moderate attraction, visible blue range." },
        { title: "550 nm (Green): 18%", text: "Low phototactic response for nocturnal biting mosquitoes; poor lure." }
      ]
    },
    {
      id: 4,
      title: "Key Lamp Anatomy",
      badge: "Slide 6 • Hardware Engineering",
      h1: "Anatomy of an Insect Killer",
      desc: "Explore the critical components engineered inside modern zappers and suction traps:",
      cards: [
        { title: "UV Light Core", text: "Energy-efficient 365nm quartz tubes or LED matrix tuned for maximum bug eye sensitivity." },
        { title: "Electrified Wire Grid", text: "Galvanized wire cage charged with 1500V–3000V to stop insects instantly upon touch." },
        { title: "Outer Safety Housing", text: "Finger-safe slotted outer shell preventing curious pets or children from touching high-voltage coils." },
        { title: "Removable Catch Tray", text: "Twist-off bottom collector cup allowing mess-free disposal of trapped pests." }
      ]
    },
    {
      id: 5,
      title: "Trap Mechanism Comparison",
      badge: "Slide 4 & 7 • Comparison Matrix",
      h1: "Comparing Trap Types",
      desc: "Choosing the optimal trap depends on sound tolerance, power requirements, and room environment:",
      cards: [
        { title: "High-Voltage Zapper", text: "15W–40W • Audible Zap (>65 dB) • Best for outdoor patios, balconies, garages, and large open rooms." },
        { title: "Quiet Vortex Suction Fan", text: "5W–12W • Whisper Quiet (<25 dB) • Downward air vortex pulls bugs whole; ideal for bedrooms & nurseries." },
        { title: "Hygienic Sticky Pad", text: "8W–20W • 100% Silent (0 dB) • Non-drying glue pad; food-grade for kitchens, cafes, and pantries." },
        { title: "Solar Outdoor Lamp", text: "3W–10W • Soft Zap (~50 dB) • Battery + electro-mesh with daylight charging for off-grid gardens." }
      ]
    },
    {
      id: 6,
      title: "Insect Species Breakdown",
      badge: "Slide 8 • Biological Distribution",
      h1: "What Bugs Are Trapped?",
      desc: "Field capture studies confirm that biting mosquitoes and household pests make up 88% of all trapped insects:",
      cards: [
        { title: "Mosquitoes & Midges: 42%", text: "Attracted by 37°C body heat + 365nm UV; eradicated before biting." },
        { title: "Fruit Flies & Drain Gnats: 28%", text: "Fast darting swarms drawn to light contrast gradients." },
        { title: "Houseflies & Blowflies: 18%", text: "High momentum zig-zag flyers intercepted by electric grid or fan vortex." },
        { title: "Night Moths & Beetles: 12%", text: "Transverse phototaxis orientation causes classic inward spiral flight." }
      ]
    },
    {
      id: 7,
      title: "Best Placement Tips",
      badge: "Slide 11 • Optimal Performance",
      h1: "Maximizing Trap Catch Rates",
      desc: "Follow these 4 scientific rules to achieve peak catch efficiency in any home or patio:",
      cards: [
        { title: "Hang at Chest Height (1.2m – 1.8m)", text: "Matches the natural cruising flight altitude of mosquitoes for the quickest catch." },
        { title: "Keep Other Lights Dim", text: "Turn off bright overhead room lamps so bugs easily spot the high-contrast 365nm purple glow." },
        { title: "Place 3 to 5 Meters Away from You", text: "Position the trap across the room from your bed or couch so pests intercept the lamp before reaching your skin." },
        { title: "Clean the Tray Weekly", text: "Twist off and empty the collection cup regularly to keep airflow strong and the unit clean." }
      ]
    },
    {
      id: 8,
      title: "Historical Evolution",
      badge: "Slide 10 • Technology Timeline",
      h1: "Evolution of Insect Lamps",
      desc: "From early open incandescent wires to smart solid-state UV LEDs:",
      cards: [
        { title: "1930s: Open High-Voltage", text: "First high-voltage bug electrocutors patented with open incandescent wires." },
        { title: "1980s: Fluorescent Black Light", text: "Black light fluorescent tubes become standard in commercial food preparation." },
        { title: "2010s: Quiet Suction & Thermal", text: "Whisper-quiet fan vortex traps and 37°C thermal lures emerge for bedrooms." },
        { title: "2025+: Smart UV LEDs & Solar", text: "Ultra low-power 365nm solid-state LEDs, USB-C portability, and autonomous solar garden traps." }
      ]
    }
  ] as SlideInfo[]
};
