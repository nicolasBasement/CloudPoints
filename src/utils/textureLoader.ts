import { Particle, ParticleData } from '../types/particle';

export interface TextureLoadResult {
  particles: Particle[];
  metadata: {
    width: number;
    height: number;
    particleCount: number;
    bounds: {
      min: [number, number, number];
      max: [number, number, number];
    };
    source: string;
  };
}

export class TextureLoader {
  /**
   * Loads particles from position and color texture files
   */
  static async loadFromTextures(
    positionFile: File,
    colorFile: File,
    metadataFile?: File
  ): Promise<ParticleData> {
    
    // Load metadata if provided
    let metadata: any = null;
    if (metadataFile) {
      const metadataText = await metadataFile.text();
      metadata = JSON.parse(metadataText);
      console.log('📥 Loaded metadata:', metadata);
    } else {
      console.log('❌ No metadata file provided - using estimated bounds');
    }

    // Load position texture
    const positionImageData = await this.loadImageData(positionFile);
    
    // Load color texture
    const colorImageData = await this.loadImageData(colorFile);
    
    // Verify dimensions match
    if (positionImageData.width !== colorImageData.width || 
        positionImageData.height !== colorImageData.height) {
      throw new Error('Position and color textures must have the same dimensions');
    }

    const textureWidth = positionImageData.width;
    const textureHeight = positionImageData.height;
    
    // Extract particles from texture data
    const particles: Particle[] = [];
    const bounds = metadata?.bounds || this.estimateBounds();
    const range: [number, number, number] = [
      bounds.max[0] - bounds.min[0] || 1,
      bounds.max[1] - bounds.min[1] || 1,
      bounds.max[2] - bounds.min[2] || 1
    ];

    console.log(`🔍 Loading textures (${textureWidth}x${textureHeight})`);

    // Create array of all pixel positions
    const pixelPositions = [];
    for (let y = 0; y < textureHeight; y++) {
      for (let x = 0; x < textureWidth; x++) {
        pixelPositions.push({ x, y, pixelIndex: (y * textureWidth + x) * 4 });
      }
    }

    // Shuffle pixels to break grid pattern (deterministic based on texture size)
    const seed = textureWidth * textureHeight * 1337;
    for (let i = pixelPositions.length - 1; i > 0; i--) {
      const j = Math.floor(((seed + i * 17) % 10000) / 10000 * (i + 1));
      [pixelPositions[i], pixelPositions[j]] = [pixelPositions[j], pixelPositions[i]];
    }

    // Process pixels in shuffled order to break grid pattern
    for (const { pixelIndex } of pixelPositions) {
        
      // Read position from position texture (RGB channels)
      const normalizedPos: [number, number, number] = [
        positionImageData.data[pixelIndex] / 255,     // R -> X
        positionImageData.data[pixelIndex + 1] / 255, // G -> Y  
        positionImageData.data[pixelIndex + 2] / 255  // B -> Z
      ];
      
      // Read color from color texture (RGB channels)
      const color: [number, number, number] = [
        colorImageData.data[pixelIndex] / 255,     // R
        colorImageData.data[pixelIndex + 1] / 255, // G
        colorImageData.data[pixelIndex + 2] / 255  // B
      ];
      
      // Skip black pixels (empty slots in texture)
      if (normalizedPos[0] === 0 && normalizedPos[1] === 0 && normalizedPos[2] === 0 && 
          color[0] === 0 && color[1] === 0 && color[2] === 0) {
        continue;
      }
      
      // Denormalize position back to world coordinates
      // Export stores inverted Y positions, we need to un-invert them back to original
      const invertedPosition: [number, number, number] = [
        normalizedPos[0] * range[0] + bounds.min[0],      // X unchanged
        normalizedPos[1] * range[1] + bounds.min[1],      // Y (still inverted from export)
        normalizedPos[2] * range[2] + bounds.min[2]       // Z unchanged
      ];

      // Un-invert Y to get back original Houdini coordinates
      const worldPosition: [number, number, number] = [
        invertedPosition[0],      // X unchanged
        -invertedPosition[1],     // Y un-inverted to restore original
        invertedPosition[2]       // Z unchanged
      ];
      
      // Debug first particle only (minimal)
      if (particles.length === 0) {
        console.log('🔍 Anti-grid loading: processing pixels in shuffled order');
        console.log(`🔍 Y-axis restoration: inverted=${invertedPosition[1]} → original=${worldPosition[1]}`);
      }
      
      particles.push({
        id: `texture_particle_${particles.length}`,
        position: worldPosition,
        color: color,
        size: 1.0
      });
    }

    console.log('✅ Loaded ' + particles.length + ' particles from textures with anti-grid processing');

    return {
      particles,
      metadata: {
        count: particles.length,
        created: new Date().toISOString(),
        source: 'texture_files',
        bounds: metadata?.bounds || this.calculateActualBounds(particles)
      }
    };
  }

  /**
   * Loads an image file and returns ImageData
   */
  private static async loadImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }
        
        // Draw image and extract pixel data
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
        
        // Cleanup
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
        URL.revokeObjectURL(img.src);
      };
      
      // Create object URL for the file
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Estimates bounds if metadata is not available
   */
  private static estimateBounds() {
    return {
      min: [-20, -20, -20] as [number, number, number],
      max: [20, 20, 20] as [number, number, number]
    };
  }

  /**
   * Calculates actual bounds from loaded particles
   */
  private static calculateActualBounds(particles: Particle[]) {
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

  /**
   * Creates a file input handler for texture loading
   */
  static createFileInputHandler(
    onLoad: (data: ParticleData) => void,
    onError: (error: string) => void
  ) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.json';
    
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      
      console.log(`📁 Selected ${files.length} files:`, files.map(f => f.name));
      
      if (files.length < 2) {
        onError('Please select at least 2 files: position texture + color texture. Include metadata JSON for correct scaling!');
        return;
      }
      
      try {
        // Identify file types
        const positionFile = files.find(f => 
          f.name.includes('position') || f.name.includes('pos')
        );
        const colorFile = files.find(f => 
          f.name.includes('color') || f.name.includes('col')
        );
        const metadataFile = files.find(f => 
          f.name.includes('metadata') || f.name.endsWith('.json')
        );
        
        console.log('📁 File identification:');
        console.log('  Position:', positionFile?.name || 'NOT FOUND');
        console.log('  Color:', colorFile?.name || 'NOT FOUND');
        console.log('  Metadata:', metadataFile?.name || 'NOT FOUND');

        if (!positionFile || !colorFile) {
          onError('Could not identify position and color files. Make sure filenames contain "position" and "color"');
          return;
        }
        
        if (!metadataFile) {
          console.warn('⚠️ No metadata file found! This will cause incorrect scaling. Please select the metadata JSON file.');
        }
        
        const data = await TextureLoader.loadFromTextures(
          positionFile, 
          colorFile, 
          metadataFile
        );
        
        onLoad(data);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    };
    
    return input;
  }
}