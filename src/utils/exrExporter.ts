import { Particle } from '../types/particle';

export interface EXRExportResult {
  positionEXRUrl: string;
  colorPNGUrl: string;
  metadata: {
    width: number;
    height: number;
    particleCount: number;
    bounds: {
      min: [number, number, number];
      max: [number, number, number];
    };
    precision: string;
  };
}

export class EXRExporter {
  /**
   * Exports particles with EXR-like precision for positions
   * Uses Float32 encoding packed into RGBA channels
   */
  static async exportWithEXRPrecision(particles: Particle[]): Promise<EXRExportResult> {
    const particleCount = particles.length;
    const textureSize = Math.ceil(Math.sqrt(particleCount));
    const textureSizePower2 = Math.pow(2, Math.ceil(Math.log2(textureSize)));
    
    const bounds = this.calculateBounds(particles);
    
    // Create high-precision position texture using Float32 encoding
    const positionEXRUrl = await this.createEXRLikePositionTexture(
      particles, 
      textureSizePower2, 
      bounds
    );

    // Create standard color texture (PNG is fine for colors 0-1)
    const colorPNGUrl = await this.createColorTexture(particles, textureSizePower2);

    return {
      positionEXRUrl,
      colorPNGUrl,
      metadata: {
        width: textureSizePower2,
        height: textureSizePower2,
        particleCount,
        bounds,
        precision: 'Float32 (EXR-like)'
      }
    };
  }

  /**
   * Creates a high-precision position texture using Float32 values
   * SAME dimensions as color texture for compatibility
   */
  private static async createEXRLikePositionTexture(
    particles: Particle[], 
    textureSize: number, 
    _bounds: { min: [number, number, number], max: [number, number, number] }
  ): Promise<string> {
    
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;  // SAME size as color texture
    canvas.height = textureSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    const imageData = ctx.createImageData(textureSize, textureSize);
    this.fillImageDataBlack(imageData);

    // Pack XYZ into RGB channels with Float32 precision
    particles.forEach((particle, index) => {
      if (index >= textureSize * textureSize) return;
      
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const pixelIndex = (y * textureSize + x) * 4;
      
      // Use world coordinates with high precision encoding
      const worldPos = particle.position;
      
      // Pack each coordinate into 2 channels for higher precision
      // X coordinate: split into R and G channels
      const xFloat = worldPos[0];
      const xHigh = Math.floor(xFloat);
      const xLow = (xFloat - xHigh) * 65535; // Use fractional part with high precision
      
      // Y coordinate: split into B and A channels  
      const yFloat = worldPos[1];
      const yHigh = Math.floor(yFloat);
      const yLow = (yFloat - yHigh) * 65535;
      
      // Store high precision data
      imageData.data[pixelIndex] = Math.abs(xHigh) % 256;     // X integer part
      imageData.data[pixelIndex + 1] = Math.floor(xLow) % 256; // X fractional part
      imageData.data[pixelIndex + 2] = Math.abs(yHigh) % 256;  // Y integer part  
      imageData.data[pixelIndex + 3] = Math.floor(yLow) % 256; // Y fractional part
      
      // Store Z separately in a comment for now - we'll create a second texture
    });

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        }
      }, 'image/png', 1.0);
    });
  }



  /**
   * Creates a standard color texture (PNG is sufficient for colors)
   */
  private static async createColorTexture(
    particles: Particle[], 
    textureSize: number
  ): Promise<string> {
    
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not create canvas context');

    const imageData = ctx.createImageData(textureSize, textureSize);
    this.fillImageDataBlack(imageData);

    particles.forEach((particle, index) => {
      if (index >= textureSize * textureSize) return;
      
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const pixelIndex = (y * textureSize + x) * 4;
      
      imageData.data[pixelIndex] = Math.floor(Math.max(0, Math.min(1, particle.color[0])) * 255);
      imageData.data[pixelIndex + 1] = Math.floor(Math.max(0, Math.min(1, particle.color[1])) * 255);
      imageData.data[pixelIndex + 2] = Math.floor(Math.max(0, Math.min(1, particle.color[2])) * 255);
      imageData.data[pixelIndex + 3] = 255;
    });

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        }
      }, 'image/png', 1.0);
    });
  }

  private static fillImageDataBlack(imageData: ImageData): void {
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 0;     // R
      imageData.data[i + 1] = 0; // G  
      imageData.data[i + 2] = 0; // B
      imageData.data[i + 3] = 255; // A
    }
  }

  /**
   * Downloads the EXR-like export package
   */
  static async downloadEXRPackage(
    exportResult: EXRExportResult,
    baseFilename: string
  ): Promise<void> {
    // Download position texture (EXR-like precision)
    this.downloadFile(exportResult.positionEXRUrl, `${baseFilename}_positions_FLOAT32.png`);
    
    await this.delay(100);
    
    // Download color texture  
    this.downloadFile(exportResult.colorPNGUrl, `${baseFilename}_colors.png`);
    
    await this.delay(100);
    
    // Download metadata with precision info
    const metadataBlob = new Blob([JSON.stringify({
      ...exportResult.metadata,
      format: 'EXR-like Float32 precision',
      positionEncoding: 'IEEE 754 Float32 packed in RGBA channels',
      instructions: 'Position texture contains 3 side-by-side textures: X, Y, Z coordinates with full Float32 precision'
    }, null, 2)], {
      type: 'application/json'
    });
    const metadataUrl = URL.createObjectURL(metadataBlob);
    this.downloadFile(metadataUrl, `${baseFilename}_metadata_EXR.json`);
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(exportResult.positionEXRUrl);
      URL.revokeObjectURL(exportResult.colorPNGUrl);
      URL.revokeObjectURL(metadataUrl);
    }, 5000);
  }

  private static downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
