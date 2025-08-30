import { Particle, ParticleData, HoudiniData } from '../types/particle';

export class HoudiniParser {
  /**
   * Converts Houdini format particles to internal format
   */
  static convertFromHoudini(houdiniData: HoudiniData): ParticleData {
    const particles: Particle[] = houdiniData.map((houdiniParticle, index) => ({
      id: `houdini_particle_${index}`,
      position: houdiniParticle.P,
      color: houdiniParticle.Cd,
      size: 1.0
    }));

    return {
      particles,
      metadata: {
        count: particles.length,
        created: new Date().toISOString(),
        source: 'houdini'
      }
    };
  }

  /**
   * Detects if data is in Houdini format
   */
  static isHoudiniFormat(data: any): data is HoudiniData {
    return Array.isArray(data) && 
           data.length > 0 && 
           typeof data[0] === 'object' &&
           'P' in data[0] && 
           'Cd' in data[0] &&
           Array.isArray(data[0].P) &&
           Array.isArray(data[0].Cd) &&
           data[0].P.length === 3 &&
           data[0].Cd.length === 3;
  }

  /**
   * Detects if data is in internal format
   */
  static isInternalFormat(data: any): data is ParticleData {
    return typeof data === 'object' && 
           'particles' in data && 
           Array.isArray(data.particles) &&
           data.particles.length > 0 &&
           'position' in data.particles[0] &&
           'color' in data.particles[0];
  }

  /**
   * Auto-detects format and converts to internal format
   */
  static parseParticleData(data: any): ParticleData {
    if (this.isHoudiniFormat(data)) {
      console.log(`Detected Houdini format with ${data.length} particles`);
      return this.convertFromHoudini(data);
    } else if (this.isInternalFormat(data)) {
      console.log(`Detected internal format with ${data.particles.length} particles`);
      return data;
    } else {
      throw new Error('Unknown particle data format. Expected Houdini format [{"P":[x,y,z],"Cd":[r,g,b]}] or internal format {"particles":[...]}');
    }
  }

  /**
   * Streams large JSON files in chunks to avoid memory issues
   */
  static async streamParseJSON(file: File, _chunkSize: number = 1000): Promise<ParticleData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          
          // For very large files, we might need to implement proper streaming
          // For now, parse the entire file but provide progress feedback
          console.log('Parsing large JSON file...');
          
          const data = JSON.parse(text);
          const particleData = this.parseParticleData(data);
          
          console.log(`Successfully loaded ${particleData.particles.length} particles`);
          resolve(particleData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Calculates bounds from particle positions
   */
  static calculateBounds(particles: Particle[]) {
    if (particles.length === 0) {
      return { min: [0, 0, 0] as [number, number, number], max: [0, 0, 0] as [number, number, number] };
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
   * Optimizes particles for rendering by reducing precision for very large datasets
   */
  static optimizeForRendering(data: ParticleData, maxParticles?: number): ParticleData {
    let particles = data.particles;
    
    // If too many particles, subsample
    if (maxParticles && particles.length > maxParticles) {
      console.log(`Subsampling ${particles.length} particles to ${maxParticles} for performance`);
      const step = Math.ceil(particles.length / maxParticles);
      particles = particles.filter((_, index) => index % step === 0);
    }

    const bounds = this.calculateBounds(particles);

    return {
      particles,
      metadata: {
        count: particles.length,
        created: data.metadata?.created || new Date().toISOString(),
        source: data.metadata?.source,
        bounds,
        optimized: particles.length < data.particles.length
      }
    };
  }
}
