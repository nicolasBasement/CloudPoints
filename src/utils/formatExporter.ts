import { Particle } from '../types/particle';

export type ExportFormat = 'png' | 'jpg';

export interface ExportResult {
  positionUrl: string;
  colorUrl: string;
  metadata: {
    width: number;
    height: number;
    particleCount: number;
    bounds: {
      min: [number, number, number];
      max: [number, number, number];
    };
    format: ExportFormat;
    precision: string;
  };
}

export class FormatExporter {
  /**
   * Exports particles with the specified format
   */
  static async exportWithFormat(particles: Particle[], format: ExportFormat = 'png'): Promise<ExportResult> {
    const particleCount = particles.length;
    const textureSize = Math.ceil(Math.sqrt(particleCount));
    const textureSizePower2 = Math.pow(2, Math.ceil(Math.log2(textureSize)));
    
    const bounds = this.calculateBounds(particles);
    
    // Create textures based on format
    const positionUrl = await this.createPositionTexture(particles, textureSizePower2, bounds, format);
    const colorUrl = await this.createColorTexture(particles, textureSizePower2, format);

    return {
      positionUrl,
      colorUrl,
      metadata: {
        width: textureSizePower2,
        height: textureSizePower2,
        particleCount,
        bounds,
        format,
        precision: format === 'exr' ? 'Half Float (16-bit)' : format === 'png' ? '8-bit RGBA' : '8-bit RGB'
      }
    };
  }

  /**
   * Creates position texture with format-specific precision
   */
  private static async createPositionTexture(
    particles: Particle[], 
    textureSize: number, 
    bounds: { min: [number, number, number], max: [number, number, number] },
    format: ExportFormat
  ): Promise<string> {
    
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    const imageData = ctx.createImageData(textureSize, textureSize);
    this.fillImageDataBlack(imageData);

    // Normalize positions to 0-1 range for compatibility
    const range = [
      bounds.max[0] - bounds.min[0] || 1,
      bounds.max[1] - bounds.min[1] || 1, 
      bounds.max[2] - bounds.min[2] || 1
    ] as [number, number, number];

    console.log(`📤 Exporting ${particles.length} particles to ${format.toUpperCase()} (${textureSize}x${textureSize})`);
    console.log(`📤 Real bounds: [${bounds.min.map(n => n.toFixed(1)).join(', ')}] to [${bounds.max.map(n => n.toFixed(1)).join(', ')}]`);


    particles.forEach((particle, index) => {
      if (index >= textureSize * textureSize) return;
      
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const pixelIndex = (y * textureSize + x) * 4;
      
      // Export with Y inverted to match what's visible in rendering
      const renderPosition = [
        particle.position[0],      // X unchanged
        -particle.position[1],     // Y inverted (export what we see on screen)
        particle.position[2]       // Z unchanged
      ];

      const normalizedPos = [
        range[0] > 0 ? (renderPosition[0] - bounds.min[0]) / range[0] : 0,
        range[1] > 0 ? (renderPosition[1] - bounds.min[1]) / range[1] : 0,
        range[2] > 0 ? (renderPosition[2] - bounds.min[2]) / range[2] : 0
      ];

      // Debug first particle only (minimal)
      if (index === 0 && particles.length < 100) {
        console.log(`📤 Y-axis export: original=${particle.position[1]} → inverted=${renderPosition[1]}`);
      }

      // Standard 8-bit precision for both PNG and JPG
      imageData.data[pixelIndex] = Math.floor(Math.max(0, Math.min(1, normalizedPos[0])) * 255);
      imageData.data[pixelIndex + 1] = Math.floor(Math.max(0, Math.min(1, normalizedPos[1])) * 255);
      imageData.data[pixelIndex + 2] = Math.floor(Math.max(0, Math.min(1, normalizedPos[2])) * 255);
      imageData.data[pixelIndex + 3] = 255; // Full alpha
    });

    ctx.putImageData(imageData, 0, 0);

    // Return the appropriate format
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpg' ? 0.95 : 1.0;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        }
      }, mimeType, quality);
    });
  }

  /**
   * Creates color texture
   */
  private static async createColorTexture(
    particles: Particle[], 
    textureSize: number,
    format: ExportFormat
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

    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpg' ? 0.95 : 1.0;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        }
      }, mimeType, quality);
    });
  }

  /**
   * Downloads the export package
   */
  static async downloadPackage(
    exportResult: ExportResult,
    baseFilename: string
  ): Promise<void> {
    const ext = exportResult.metadata.format;
    const precisionLabel = exportResult.metadata.format === 'exr' ? '_HALF' : 
                          exportResult.metadata.format === 'png' ? '_8BIT' : '_COMP';

    // Download position texture
    this.downloadFile(
      exportResult.positionUrl, 
      `${baseFilename}_positions${precisionLabel}.${ext === 'jpg' ? 'jpg' : 'png'}`
    );
    
    await this.delay(100);
    
    // Download color texture  
    this.downloadFile(
      exportResult.colorUrl, 
      `${baseFilename}_colors.${ext === 'jpg' ? 'jpg' : 'png'}`
    );
    
    await this.delay(100);
    
    // Download metadata
    const metadataBlob = new Blob([JSON.stringify({
      ...exportResult.metadata,
      instructions: `Format: ${exportResult.metadata.format.toUpperCase()} - Precision: ${exportResult.metadata.precision}`
    }, null, 2)], {
      type: 'application/json'
    });
    const metadataUrl = URL.createObjectURL(metadataBlob);
    this.downloadFile(metadataUrl, `${baseFilename}_metadata_${ext.toUpperCase()}.json`);
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(exportResult.positionUrl);
      URL.revokeObjectURL(exportResult.colorUrl);
      URL.revokeObjectURL(metadataUrl);
    }, 5000);
  }

  private static fillImageDataBlack(imageData: ImageData): void {
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 0;     // R
      imageData.data[i + 1] = 0; // G  
      imageData.data[i + 2] = 0; // B
      imageData.data[i + 3] = 255; // A
    }
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
      // Calculate bounds using ORIGINAL positions (not inverted)
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
