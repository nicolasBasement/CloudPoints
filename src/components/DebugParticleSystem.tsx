import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Particle, VisualizationConfig } from '../types/particle';
import { DotTextures } from '../utils/dotTextures';

interface DebugParticleSystemProps {
  particles: Particle[];
  config: VisualizationConfig;
}

export const DebugParticleSystem: React.FC<DebugParticleSystemProps> = ({ particles, config }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Debug: log first few particles
  useMemo(() => {
    console.log('DebugParticleSystem particles count:', particles.length);
    if (particles.length > 0) {
      console.log('First 5 particles:', particles.slice(0, 5));
      
      // Check bounds
      const positions = particles.map(p => p.position);
      const xValues = positions.map(p => p[0]);
      const yValues = positions.map(p => p[1]);
      const zValues = positions.map(p => p[2]);
      
      console.log('Position bounds:', {
        x: [Math.min(...xValues), Math.max(...xValues)],
        y: [Math.min(...yValues), Math.max(...yValues)],
        z: [Math.min(...zValues), Math.max(...zValues)]
      });

      // Check colors
      const colors = particles.map(p => p.color);
      const rValues = colors.map(c => c[0]);
      const gValues = colors.map(c => c[1]);
      const bValues = colors.map(c => c[2]);
      
      console.log('Color bounds:', {
        r: [Math.min(...rValues), Math.max(...rValues)],
        g: [Math.min(...gValues), Math.max(...gValues)],
        b: [Math.min(...bValues), Math.max(...bValues)]
      });
    }
  }, [particles]);

  // Create simple points geometry
  const { geometry, material } = useMemo(() => {
    if (particles.length === 0) {
      return { 
        geometry: new THREE.BufferGeometry(), 
        material: new THREE.PointsMaterial() 
      };
    }

    const particleCount = particles.length;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    particles.forEach((particle, index) => {
      const i3 = index * 3;
      
      // Positions (invert Y axis based on config)
      positions[i3] = particle.position[0];      // X
      positions[i3 + 1] = config.invertYAxis ? particle.position[1] : -particle.position[1]; // Y controlled by config
      positions[i3 + 2] = particle.position[2];  // Z
      
      // Colors (ensure they're in 0-1 range)
      colors[i3] = Math.max(0, Math.min(1, particle.color[0]));
      colors[i3 + 1] = Math.max(0, Math.min(1, particle.color[1]));
      colors[i3 + 2] = Math.max(0, Math.min(1, particle.color[2]));
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Use shader material with texture based on shape for better consistency
    const dotTextureUrl = DotTextures.getDotTexture(config.dotShape);
    const dotTexture = new THREE.TextureLoader().load(dotTextureUrl);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: dotTexture },
        pointSize: { value: config.particleSize * 2 }
      },
      vertexShader: `
        uniform float pointSize;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        
        void main() {
          gl_FragColor = vec4(vColor, 1.0);
          gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
          if (gl_FragColor.a < 0.1) discard;
        }
      `,
      transparent: true,
      vertexColors: true
    });

    console.log('Created geometry with', particleCount, 'particles');
    
    return { geometry, material };
  }, [particles, config.particleSize, config.dotShape]);

  // Animation frame
  useFrame((state) => {
    if (config.enableRotation && pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};
