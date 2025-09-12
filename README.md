# CloudPoints - Particle Visualization

An interactive web application for visualizing particles in 3D using TypeScript, React, and React Three Fiber.

## Features

### Two Visualization Modes

**Option 1: Direct JSON Visualization**
- Direct particle data loading from JSON files
- Real-time rendering of positions and colors

**Option 2: Texture-based Visualization**
- Generates textures that store particle data
- Positions encoded in RGB channels of a texture
- Colors stored in a separate texture
- Optimized for large particle quantities

### Interactive Controls (Custom CSS UI)

**Available Dot Shapes**
- Circular dots
- Square dots

## Project Structure

```
src/
├── components/
│   ├── ParticleSystem.tsx          # Direct visualization (JSON/Houdini)
│   ├── TextureParticleSystem.tsx   # Internal texture-based visualization
│   └── DebugParticleSystem.tsx     # Debug system for troubleshooting
├── hooks/
│   └── useParticleData.ts          # Hook for complete data management
├── types/
│   └── particle.ts                 # TypeScript types (includes Houdini)
├── utils/
│   ├── houdiniParser.ts            # Parser and optimizer for Houdini format
│   ├── textureGenerator.ts         # Internal and procedural texture generator
│   ├── textureExporter.ts          # Basic PNG texture exporter
│   ├── exrExporter.ts              # EXR-like Float32 exporter (HIGH PRECISION)
│   └── textureLoader.ts            # Texture importer for verification
├── App.tsx                         # Main component with custom CSS UI
└── main.tsx                        # Entry point

public/
├── point_data.json                 # Real Houdini data (1.2M particles)
└── particles-example.json         # Internal example file
```

## Installation and Usage

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Usage

1. **Open the application**: The application will run at `http://localhost:5173`

2. **Load Data**:
   - **"Load Houdini Data"**: Load your Houdini `point_data.json` file (1.2M → optimized to 50K)
   - **"Load Custom JSON"**: Load any JSON file with particle data
   - **"Test Simple Data"**: 5 test particles for quick debugging

### Workflow: Texture Export and Import

#### Export (Particles → Textures)
1. **Load data**: Use "Load Houdini Data" or "Load Custom JSON"
2. **Select format**: Choose PNG, JPG, or EXR from dropdown
3. **Export textures**: Click "Export Textures"
4. **Automatic downloads**: 3 files are downloaded:
   - `filename_positions_[FORMAT].png/jpg` - Normalized positions
   - `filename_colors.png/jpg` - RGB colors
   - `filename_metadata_[FORMAT].json` - Metadata with precision information

##### Available Formats:
- **PNG**: 8-bit RGBA, maximum compatibility
- **JPG**: 8-bit RGB compressed, smaller files
- **EXR**: Half Float (16-bit) if available, maximum precision

#### Import (Textures → Verification)
1. **Load textures**: Click "Load from Textures"
2. **IMPORTANT**: Select ALL 3 FILES:
   - `filename_positions_FORMAT.png` (positions)
   - `filename_colors.png` (colors)
   - `filename_metadata_FORMAT.json` (CRITICAL - without this = incorrect scaling)
3. **Automatic verification**: App reconstructs particles from textures
4. **Corrected coordinates**: No scaling issues (Y-axis inversion fixed)
5. **Comparison**: Visually verify they match original data

> **WARNING**: If you don't select the **metadata JSON** file, you'll see incorrect bounds `[-20,-20,-20] to [20,20,20]` and the shape will appear compressed/incorrect.

#### EXR Texture Structure

##### Position Texture with Anti-Grid
- **Format**: PNG with deterministic random mapping
- **Precision**: 8-bit RGB with normalized coordinates 0-1
- **Anti-Grid Mapping**:
  - **Problem solved**: Exported textures maintained artificial grid pattern
  - **Solution**: Deterministic shuffle mapping that preserves original organic distribution
  - **Result**: Particles loaded from textures maintain natural Houdini appearance

##### Color Texture (Standard PNG)
- **Format**: Standard PNG with RGB channels
- **Precision**: 8 bits per channel (sufficient for 0-1 colors)

##### Dimensions and Performance
- **Dimensions**: Power-of-2 square (e.g., 512x512 for ~250K particles)
- **Position file**: 3x larger but infinitely more precise
- **Compatibility**: All browsers (no native EXR support required)

3. **Controls**:
   - **Visualization Mode**: Switch between 'json' and 'texture'
   - **Particle Size**: Adjust size (0.01 - 2.0, default 0.15)
   - **Use Dots**: Toggle between dots and spheres
   - **Bloom**: Control glow effects
   - **Background Color**: Color picker and hex input for background
   - **Invert Y-Axis**: Flip particles vertically

4. **3D Navigation**:
   - **Click and drag**: Rotate camera
   - **Mouse wheel**: Zoom
   - **Right click and drag**: Pan
   - **RGB Gizmo**: X=Red, Y=Green, Z=Blue for orientation

## Supported Data Formats

### Houdini Format (Recommended)

The application natively supports JSON format exported by Houdini:

```json
[
    {
        "P": [2.049, -2.642, 0.584],
        "Cd": [0.020, 0.014, 0.012]
    },
    {
        "P": [1.367, -1.331, 0.596],
        "Cd": [0.083, 0.108, 0.125]
    }
]
```

- `P`: Particle position [x, y, z]
- `Cd`: Particle color [r, g, b] (values 0-1)

### Automatic Optimization
- Large files (>100K particles) are automatically optimized
- Smart subsampling to maintain performance
- Visual indicator when optimization is applied

### Internal Format (Alternative)

```json
{
  "metadata": {
    "count": 1000,
    "bounds": {
      "min": [-10, -10, -10],
      "max": [10, 10, 10]
    },
    "created": "2024-01-01T00:00:00Z"
  },
  "particles": [
    {
      "id": "particle_0",
      "position": [0, 0, 0],
      "color": [1, 0.5, 0.2],
      "size": 1.0
    }
  ]
}
```

### Required Fields per Particle
- `id`: Unique identifier (string)
- `position`: Array of 3 numbers [x, y, z]
- `color`: Array of 3 numbers [r, g, b] (values 0-1)
- `size`: Optional number (size multiplier)

## Technologies Used

- **React 18**: UI Framework
- **TypeScript**: Static typing
- **React Three Fiber**: React renderer for Three.js
- **@react-three/drei**: Utilities for R3F
- **@react-three/postprocessing**: Post-processing effects
- **Custom CSS**: Modern UI without external control dependencies
- **Three.js**: 3D Engine
- **Vite**: Build tool and dev server

## Troubleshooting

### "Export Textures" Button Disabled

**Cause**: No particles loaded or loading in progress

**Solution**: Load particle data first using one of the loading options

### Texture Import Issues

**Solution**: In "Load from Textures", select ALL 3 FILES:
- `filename_positions_FORMAT.png`
- `filename_colors.png`
- **`filename_metadata_FORMAT.json`** ← **CRITICAL**

## Performance

### Optimizations for Houdini Files
- **Automatic Detection**: Recognizes Houdini vs internal format automatically
- **Streaming**: Efficient handling of large files (>10MB)
- **Smart Subsampling**: Automatically reduces particles to maintain 60 FPS
- **Visual Indicators**: Shows when optimizations are applied

### Rendering Modes
- **JSON Option**: Optimal for up to ~50,000 particles (optimized)
- **Texture Option**: Optimal for 50,000+ particles
- **Dots vs Spheres**: Dots are more efficient for large quantities
- **Bloom Effect**: May impact performance with many particles

### Recommendations
- For large Houdini files: Use 'texture' mode + 'dots' + automatic optimization
- Datasets <10K: Any configuration works well
- Datasets >100K: Automatic subsampling will be applied

## Customization

### Adding New Effects
Modify `src/App.tsx` and add more effects to the `EffectComposer`.

### Changing Shaders
Shaders are defined in `ParticleSystem.tsx` and `TextureParticleSystem.tsx`.

### New Controls
Add controls in the `CustomUI` component and the `UIState` state in `App.tsx`.

## Build and Deploy

### Local Build
```bash
npm run build
```

### Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Vite configuration
3. Deploy with default settings

The application is optimized for production deployment and includes:
- Automatic code splitting
- Asset optimization
- TypeScript compilation
- Modern browser support