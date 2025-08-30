/**
 * Utility for generating different dot shape textures
 */
export class DotTextures {
  
  /**
   * Creates a circular dot texture (soft edges)
   */
  static createCircularDotTexture(): string {
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="circularGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="white" stop-opacity="1"/>
            <stop offset="70%" stop-color="white" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="white" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#circularGrad)"/>
      </svg>
    `);
  }

  /**
   * Creates a square dot texture (sharp edges)
   */
  static createSquareDotTexture(): string {
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="squareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="white" stop-opacity="1"/>
            <stop offset="80%" stop-color="white" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="white" stop-opacity="0.7"/>
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" fill="url(#squareGrad)" rx="2"/>
      </svg>
    `);
  }

  /**
   * Creates a sharp square dot texture (no gradients)
   */
  static createSharpSquareDotTexture(): string {
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" fill="white" fill-opacity="1"/>
      </svg>
    `);
  }

  /**
   * Gets the appropriate texture based on shape selection
   */
  static getDotTexture(shape: 'circular' | 'square'): string {
    switch (shape) {
      case 'circular':
        return this.createCircularDotTexture();
      case 'square':
        return this.createSquareDotTexture();
      default:
        return this.createCircularDotTexture();
    }
  }

  /**
   * Creates a canvas-based texture for more control
   */
  static createCanvasDotTexture(shape: 'circular' | 'square', size: number = 64): string {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return this.getDotTexture(shape);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Create gradient
    let gradient: CanvasGradient;
    
    if (shape === 'circular') {
      gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(4, 4, size - 8, size - 8);
    }

    return canvas.toDataURL();
  }
}
