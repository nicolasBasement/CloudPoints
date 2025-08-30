import { Particle } from '../types/particle';

export interface SimpleExportResult {
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
    created: string;
  };
}

export class SimpleExporter {
  /**
   * Export particles as 2 simple PNG textures + metadata
   */
  static async exportParticles(particles: Particle[]): Promise<SimpleExportResult> {
    console.log('🚀 Starting simple export for', particles.length, 'particles');
    
    // Calculate texture size (square)
    const particleCount = particles.length;
    const textureSize = Math.ceil(Math.sqrt(particleCount));
    const finalSize = Math.pow(2, Math.ceil(Math.log2(textureSize))); // Power of 2
    
    console.log(`📐 Texture dimensions: ${finalSize}x${finalSize} (for ${particleCount} particles)`);
    
    // Calculate bounds for normalization (with Y inverted)
    const originalBounds = this.calculateBounds(particles);
    console.log('📏 Original Bounds:', originalBounds);
    
    // Create inverted bounds for export (Y axis flipped)
    const bounds = {
      min: [
        originalBounds.min[0],      // X unchanged
        -originalBounds.max[1],     // Y inverted: -max becomes min
        originalBounds.min[2]       // Z unchanged
      ] as [number, number, number],
      max: [
        originalBounds.max[0],      // X unchanged  
        -originalBounds.min[1],     // Y inverted: -min becomes max
        originalBounds.max[2]       // Z unchanged
      ] as [number, number, number]
    };
    
    console.log('📏 Export Bounds (Y inverted):', bounds);
    
    // Create canvases
    const positionCanvas = document.createElement('canvas');
    const colorCanvas = document.createElement('canvas');
    
    positionCanvas.width = finalSize;
    positionCanvas.height = finalSize;
    colorCanvas.width = finalSize;
    colorCanvas.height = finalSize;
    
    const posCtx = positionCanvas.getContext('2d')!;
    const colorCtx = colorCanvas.getContext('2d')!;
    
    // Clear canvases to black
    posCtx.fillStyle = 'black';
    posCtx.fillRect(0, 0, finalSize, finalSize);
    colorCtx.fillStyle = 'black';
    colorCtx.fillRect(0, 0, finalSize, finalSize);
    
    // Get image data for direct pixel manipulation
    const posImageData = posCtx.createImageData(finalSize, finalSize);
    const colorImageData = colorCtx.createImageData(finalSize, finalSize);
    
    // Calculate ranges for normalization
    const range = [
      bounds.max[0] - bounds.min[0] || 1,
      bounds.max[1] - bounds.min[1] || 1,
      bounds.max[2] - bounds.min[2] || 1
    ];
    
    console.log('🔄 Processing particles...');
    
    // Fill pixels with particle data
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      
      // Calculate pixel position (sequential, no shuffle for now)
      const x = i % finalSize;
      const y = Math.floor(i / finalSize);
      const pixelIndex = (y * finalSize + x) * 4;
      
      // INVERT Y-axis to match Three.js coordinate system
      const exportPosition = [
        particle.position[0],      // X unchanged
        -particle.position[1],     // Y inverted for export
        particle.position[2]       // Z unchanged
      ];
      
      // Debug first particle only
      if (i === 0) {
        console.log(`🔄 Y-axis inversion: original=${particle.position[1]} → export=${exportPosition[1]}`);
      }
      
      // POSITION TEXTURE: Normalize XYZ to 0-255 (using inverted bounds)
      const normalizedPos = [
        Math.round(((exportPosition[0] - bounds.min[0]) / range[0]) * 255),
        Math.round(((exportPosition[1] - bounds.min[1]) / range[1]) * 255),
        Math.round(((exportPosition[2] - bounds.min[2]) / range[2]) * 255)
      ];
      
      // Clamp to 0-255 range
      posImageData.data[pixelIndex] = Math.max(0, Math.min(255, normalizedPos[0]));     // R = X
      posImageData.data[pixelIndex + 1] = Math.max(0, Math.min(255, normalizedPos[1])); // G = Y  
      posImageData.data[pixelIndex + 2] = Math.max(0, Math.min(255, normalizedPos[2])); // B = Z
      posImageData.data[pixelIndex + 3] = 255; // Alpha = 1
      
      // COLOR TEXTURE: Direct RGB mapping
      colorImageData.data[pixelIndex] = Math.round(particle.color[0] * 255);     // R
      colorImageData.data[pixelIndex + 1] = Math.round(particle.color[1] * 255); // G
      colorImageData.data[pixelIndex + 2] = Math.round(particle.color[2] * 255); // B
      colorImageData.data[pixelIndex + 3] = 255; // Alpha = 1
    }
    
    console.log('🎨 Rendering textures...');
    
    // Put image data back to canvases
    posCtx.putImageData(posImageData, 0, 0);
    colorCtx.putImageData(colorImageData, 0, 0);
    
    // Convert to blobs
    const positionBlob = await new Promise<Blob>((resolve) => {
      positionCanvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
    
    const colorBlob = await new Promise<Blob>((resolve) => {
      colorCanvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
    
    // Create URLs
    const positionUrl = URL.createObjectURL(positionBlob);
    const colorUrl = URL.createObjectURL(colorBlob);
    
    console.log('✅ Export completed successfully');
    
    return {
      positionUrl,
      colorUrl,
      metadata: {
        width: finalSize,
        height: finalSize,
        particleCount,
        bounds: originalBounds, // Save original bounds in metadata for correct loading
        created: new Date().toISOString()
      }
    };
  }
  
  /**
   * Download the exported textures and metadata
   */
  static async downloadExport(exportResult: SimpleExportResult, baseName: string = 'particles') {
    console.log('📥 Starting downloads...');
    
    // Download position texture
    this.downloadFile(exportResult.positionUrl, `${baseName}_position.png`);
    
    // Wait a bit to avoid browser blocking
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Download color texture
    this.downloadFile(exportResult.colorUrl, `${baseName}_color.png`);
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Download metadata
    const metadataBlob = new Blob([JSON.stringify(exportResult.metadata, null, 2)], {
      type: 'application/json'
    });
    const metadataUrl = URL.createObjectURL(metadataBlob);
    this.downloadFile(metadataUrl, `${baseName}_metadata.json`);
    
    console.log('✅ All files downloaded');
    
    // Cleanup URLs after download
    setTimeout(() => {
      URL.revokeObjectURL(exportResult.positionUrl);
      URL.revokeObjectURL(exportResult.colorUrl);
      URL.revokeObjectURL(metadataUrl);
    }, 5000);
  }
  
  /**
   * Helper to download a file
   */
  private static downloadFile(url: string, filename: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Calculate bounds of all particles
   */
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
