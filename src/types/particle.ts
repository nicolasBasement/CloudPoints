export interface Particle {
  id: string;
  position: [number, number, number];
  color: [number, number, number];
  size?: number;
  velocity?: [number, number, number];
}

// Houdini format types
export interface HoudiniParticle {
  P: [number, number, number];  // Position
  Cd: [number, number, number]; // Color
}

export type HoudiniData = HoudiniParticle[];

export interface ParticleData {
  particles: Particle[];
  metadata?: {
    count: number;
    bounds?: {
      min: [number, number, number];
      max: [number, number, number];
    };
    created: string;
    source?: string;
    optimized?: boolean;
  };
}

export interface VisualizationConfig {
  particleSize: number;
  useDots: boolean;
  dotShape: 'circular' | 'square';
  bloomIntensity: number;
  bloomRadius: number;
  visualizationMode: 'json' | 'texture';
  enableRotation?: boolean;
  invertYAxis?: boolean;
}

export interface TextureData {
  positionTexture: HTMLCanvasElement | null;
  colorTexture: HTMLCanvasElement | null;
  width: number;
  height: number;
}
