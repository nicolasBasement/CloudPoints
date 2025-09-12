import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Particle, VisualizationConfig } from '../types/particle';
import { DotTextures } from '../utils/dotTextures';
// import { usePhysics } from '../hooks/usePhysics'; // DISABLED

interface ParticleSystemProps {
  particles: Particle[];
  config: VisualizationConfig;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ particles, config }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  
  // PHYSICS DISABLED - Use original particles always to prevent disappearing
  // const { particles: physicsParticles, isPhysicsEnabled } = usePhysics(particles, config);
  
  // Always use original particles (physics completely disabled)
  const renderParticles = particles;
  

  useFrame((_: any, delta: number) => {
    if (config.enableRotation && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1; // Slow rotation around Y-axis
    }
  });

  // Physics debug removed - using original particles always now

  // Create geometry and material based on config
  const { geometry, material } = useMemo(() => {
    if (renderParticles.length === 0) {
      return { 
        geometry: new THREE.BufferGeometry(), 
        material: new THREE.PointsMaterial() 
      };
    }

    const particleCount = renderParticles.length;
    
    // Create arrays for position, color, and size attributes
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    renderParticles.forEach((particle, index) => {
      const i3 = index * 3;
      
      // Positions (invert Y axis based on config)
      positions[i3] = particle.position[0];      // X
      positions[i3 + 1] = config.invertYAxis ? particle.position[1] : -particle.position[1]; // Y controlled by config
      positions[i3 + 2] = particle.position[2];  // Z
      
      // Colors (ensure they're in 0-1 range)
      colors[i3] = Math.max(0, Math.min(1, particle.color[0]));
      colors[i3 + 1] = Math.max(0, Math.min(1, particle.color[1]));
      colors[i3 + 2] = Math.max(0, Math.min(1, particle.color[2]));
      
      // Sizes
      sizes[index] = (particle.size || 1.0) * config.particleSize;
    });

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    if (config.useDots) {
      // Use Points for dot rendering with custom texture based on shape
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      // Get texture based on selected shape
      const dotTextureUrl = DotTextures.getDotTexture(config.dotShape);
      const dotTexture = new THREE.TextureLoader().load(dotTextureUrl);

      material = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: dotTexture }
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          
          void main() {
            vColor = color;
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Base size calculation with depth attenuation
            float baseSize = size * (300.0 / -mvPosition.z);
            
            gl_PointSize = max(1.0, baseSize); // Ensure minimum size
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          
          void main() {
            vec4 baseColor = vec4(vColor, 1.0);
            vec4 texColor = texture2D(pointTexture, gl_PointCoord);
            
            gl_FragColor = baseColor * texColor;
            if (gl_FragColor.a < 0.1) discard;
          }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
      });
    } else {
      // Use InstancedMesh for sphere rendering
      geometry = new THREE.SphereGeometry(0.1, 8, 6);
      material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8
      });
    }

    return { geometry, material };
  }, [renderParticles, config]);

  // Set up instanced mesh if using spheres
  useMemo(() => {
    if (!config.useDots && meshRef.current) {
      const mesh = meshRef.current;
      
      // Create matrices for each instance
      renderParticles.forEach((particle, index) => {
        const matrix = new THREE.Matrix4();
        const scale = (particle.size || 1.0) * config.particleSize * 0.1; // Scale down spheres
        
        // Apply Y inversion here too
        matrix.setPosition(
          particle.position[0],
          -particle.position[1], // Y inverted
          particle.position[2]
        );
        matrix.scale(new THREE.Vector3(scale, scale, scale));
        
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, new THREE.Color(
          Math.max(0, Math.min(1, particle.color[0])),
          Math.max(0, Math.min(1, particle.color[1])),
          Math.max(0, Math.min(1, particle.color[2]))
        ));
      });
      
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [renderParticles, config, meshRef]);

  // Animation frame - removed individual rotations, using group rotation instead

  return (
    <group ref={groupRef}>
      {config.useDots ? (
        <points ref={pointsRef} geometry={geometry} material={material} />
      ) : (
        <instancedMesh
          ref={meshRef}
          args={[geometry, material, particles.length]}
          geometry={geometry}
          material={material}
          count={particles.length}
        />
      )}
    </group>
  );
};
