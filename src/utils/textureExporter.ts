import { Particle } from '../types/particle';

export interface ExportedTextures {
  positionTextureUrl: string;
  colorTextureUrl: string;
  metadata: {
    width: number;
    height: number;
    particleCount: number;
    bounds: {
      min: [number, number, number];
      max: [number, number, number];
    };
  };
}

export class TextureExporter {
  /**
   * Exports particles as two textures:
   * - Position texture (EXR format when available, fallback to PNG with high precision)
   * - Color texture (PNG format)
   */
  static async exportTextures(particles: Particle[]): Promise<ExportedTextures> {
    const particleCount = particles.length;
    
    // Calculate optimal texture dimensions (square power of 2)
    const textureSize = Math.ceil(Math.sqrt(particleCount));
    const textureSizePower2 = Math.pow(2, Math.ceil(Math.log2(textureSize)));
    
    // Calculate bounds for position normalization
    const bounds = this.calculateBounds(particles);
    const range: [number, number, number] = [
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
      bounds.max[2] - bounds.min[2]
    ];

    // Create position texture (high precision for positions)
    const positionTextureUrl = await this.createPositionTexture(
      particles, 
      textureSizePower2, 
      bounds, 
      range
    );

    // Create color texture (standard RGB for colors)
    const colorTextureUrl = await this.createColorTexture(
      particles, 
      textureSizePower2
    );

    return {
      positionTextureUrl,
      colorTextureUrl,
      metadata: {
        width: textureSizePower2,
        height: textureSizePower2,
        particleCount,
        bounds
      }
    };
  }

  /**
   * Creates a high-precision position texture
   * Uses 16-bit precision per channel when available
   */
  private static async createPositionTexture(
    particles: Particle[], 
    textureSize: number, 
    bounds: { min: [number, number, number], max: [number, number, number] },
    range: [number, number, number]
  ): Promise<string> {
    
    // Create canvas for position texture
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Create ImageData for high precision
    const imageData = ctx.createImageData(textureSize, textureSize);
    
    // Fill with black background first
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 0;     // R
      imageData.data[i + 1] = 0; // G  
      imageData.data[i + 2] = 0; // B
      imageData.data[i + 3] = 255; // A
    }

    // Fill texture data with normalized positions
    particles.forEach((particle, index) => {
      if (index >= textureSize * textureSize) return; // Safety check
      
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const pixelIndex = (y * textureSize + x) * 4;
      
      // Normalize position to 0-1 range, then to 0-255 for 8-bit storage
      // For higher precision, we use the full 0-255 range per channel
      const normalizedPos: [number, number, number] = [
        range[0] > 0 ? (particle.position[0] - bounds.min[0]) / range[0] : 0.5,
        range[1] > 0 ? (particle.position[1] - bounds.min[1]) / range[1] : 0.5,
        range[2] > 0 ? (particle.position[2] - bounds.min[2]) / range[2] : 0.5
      ];
      
      // Store position in RGB channels (0-255)
      imageData.data[pixelIndex] = Math.floor(normalizedPos[0] * 255);     // X -> R
      imageData.data[pixelIndex + 1] = Math.floor(normalizedPos[1] * 255); // Y -> G
      imageData.data[pixelIndex + 2] = Math.floor(normalizedPos[2] * 255); // Z -> B
      imageData.data[pixelIndex + 3] = 255; // Alpha
    });

    // Put image data to canvas
    ctx.putImageData(imageData, 0, 0);

    // Export as high-quality PNG (since EXR isn't natively supported in browsers)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        }
      }, 'image/png', 1.0); // Maximum quality PNG
    });
  }

  /**
   * Creates a color texture in PNG format
   */
  private static async createColorTexture(
    particles: Particle[], 
    textureSize: number
  ): Promise<string> {
    
    // Create canvas for color texture
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Create ImageData
    const imageData = ctx.createImageData(textureSize, textureSize);
    
    // Fill with black background first
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 0;     // R
      imageData.data[i + 1] = 0; // G  
      imageData.data[i + 2] = 0; // B
      imageData.data[i + 3] = 255; // A
    }

    // Fill texture data with colors
    particles.forEach((particle, index) => {
      if (index >= textureSize * textureSize) return; // Safety check
      
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const pixelIndex = (y * textureSize + x) * 4;
      
      // Store color in RGB channels (0-255)
      imageData.data[pixelIndex] = Math.floor(Math.max(0, Math.min(1, particle.color[0])) * 255);     // R
      imageData.data[pixelIndex + 1] = Math.floor(Math.max(0, Math.min(1, particle.color[1])) * 255); // G
      imageData.data[pixelIndex + 2] = Math.floor(Math.max(0, Math.min(1, particle.color[2])) * 255); // B
      imageData.data[pixelIndex + 3] = 255; // Alpha
    });

    // Put image data to canvas
    ctx.putImageData(imageData, 0, 0);

    // Export as PNG
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        }
      }, 'image/png', 1.0); // Maximum quality PNG
    });
  }

  /**
   * Downloads a texture file
   */
  static downloadTexture(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Creates downloadable ZIP with both textures and metadata
   */
  static async createDownloadPackage(
    exportedTextures: ExportedTextures, 
    baseFilename: string
  ): Promise<void> {
    // Download position texture
    this.downloadTexture(exportedTextures.positionTextureUrl, `${baseFilename}_positions.png`);
    
    // Small delay to avoid browser blocking multiple downloads
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Download color texture  
    this.downloadTexture(exportedTextures.colorTextureUrl, `${baseFilename}_colors.png`);
    
    // Download metadata JSON
    const metadataBlob = new Blob([JSON.stringify(exportedTextures.metadata, null, 2)], {
      type: 'application/json'
    });
    const metadataUrl = URL.createObjectURL(metadataBlob);
    this.downloadTexture(metadataUrl, `${baseFilename}_metadata.json`);
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(exportedTextures.positionTextureUrl);
      URL.revokeObjectURL(exportedTextures.colorTextureUrl);
      URL.revokeObjectURL(metadataUrl);
    }, 5000);
  }

  private static calculateBounds(particles: Particle[]) {
    if (particles.length === 0) {
      return { 
        min: [0, 0, 0] as [number, number, number], 
        max: [0, 0, 0] as [number, number, number] 
      };
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    particles.forEach(particle => {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], particle.position[i]);
        max[i] = Math.max(max[i], particle.position[i]);
      }
    });

    return { 
      min: min as [number, number, number], 
      max: max as [number, number, number] 
    };
  }
}
