import { Particle, TextureData } from '../types/particle';

export class TextureGenerator {
  /**
   * Generates position and color textures from particle data
   * Position data is stored as RGB values in a canvas
   * Color data is stored separately
   */
  static generateTextures(particles: Particle[]): TextureData {
    const particleCount = particles.length;
    
    // Calculate optimal texture dimensions (square power of 2)
    const textureSize = Math.ceil(Math.sqrt(particleCount));
    const textureSizePower2 = Math.pow(2, Math.ceil(Math.log2(textureSize)));
    
    // Create position texture canvas
    const positionCanvas = document.createElement('canvas');
    positionCanvas.width = textureSizePower2;
    positionCanvas.height = textureSizePower2;
    const positionCtx = positionCanvas.getContext('2d');
    
    // Create color texture canvas
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = textureSizePower2;
    colorCanvas.height = textureSizePower2;
    const colorCtx = colorCanvas.getContext('2d');
    
    if (!positionCtx || !colorCtx) {
      throw new Error('Could not create canvas context');
    }
    
    // Create ImageData objects
    const positionImageData = positionCtx.createImageData(textureSizePower2, textureSizePower2);
    const colorImageData = colorCtx.createImageData(textureSizePower2, textureSizePower2);
    
    // Find bounds for position normalization
    const bounds = this.calculateBounds(particles);
    const range = [
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
      bounds.max[2] - bounds.min[2]
    ];
    
    // Fill texture data
    particles.forEach((particle, index) => {
      const x = index % textureSizePower2;
      const y = Math.floor(index / textureSizePower2);
      const pixelIndex = (y * textureSizePower2 + x) * 4;
      
      // Normalize position to 0-1 range, then to 0-255
      const normalizedPos = [
        ((particle.position[0] - bounds.min[0]) / range[0]) * 255,
        ((particle.position[1] - bounds.min[1]) / range[1]) * 255,
        ((particle.position[2] - bounds.min[2]) / range[2]) * 255
      ];
      
      // Store position in RGB channels of position texture
      positionImageData.data[pixelIndex] = Math.floor(normalizedPos[0]);
      positionImageData.data[pixelIndex + 1] = Math.floor(normalizedPos[1]);
      positionImageData.data[pixelIndex + 2] = Math.floor(normalizedPos[2]);
      positionImageData.data[pixelIndex + 3] = 255; // Alpha
      
      // Store color in RGB channels of color texture
      colorImageData.data[pixelIndex] = Math.floor(particle.color[0] * 255);
      colorImageData.data[pixelIndex + 1] = Math.floor(particle.color[1] * 255);
      colorImageData.data[pixelIndex + 2] = Math.floor(particle.color[2] * 255);
      colorImageData.data[pixelIndex + 3] = 255; // Alpha
    });
    
    // Put image data to canvases
    positionCtx.putImageData(positionImageData, 0, 0);
    colorCtx.putImageData(colorImageData, 0, 0);
    
    return {
      positionTexture: positionCanvas,
      colorTexture: colorCanvas,
      width: textureSizePower2,
      height: textureSizePower2
    };
  }
  
  private static calculateBounds(particles: Particle[]) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    particles.forEach(particle => {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], particle.position[i]);
        max[i] = Math.max(max[i], particle.position[i]);
      }
    });
    
    return { min: min as [number, number, number], max: max as [number, number, number] };
  }
  
  /**
   * Generates a procedural particle dataset for testing
   */
  static generateProceduralParticles(count: number): Particle[] {
    const particles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = Math.random() * 10 + 2;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      const hue = (i / count) * 360;
      const color = this.hslToRgb(hue, 0.8, 0.6);
      
      particles.push({
        id: `particle_${i}`,
        position: [x, y, z],
        color: color as [number, number, number],
        size: Math.random() * 0.5 + 0.5
      });
    }
    
    return particles;
  }
  
  private static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [f(0), f(8), f(4)];
  }
}
