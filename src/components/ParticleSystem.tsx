import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
  
  // Mouse interaction state
  const [mousePosition, setMousePosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const { camera, gl } = useThree();
  
  // PHYSICS DISABLED - Use original particles always to prevent disappearing
  // const { particles: physicsParticles, isPhysicsEnabled } = usePhysics(particles, config);
  
  // Always use original particles (physics completely disabled)
  const renderParticles = particles;
  
  // Mouse tracking with throttling to prevent flicker
  const lastMouseUpdate = useRef(0);
  
  React.useEffect(() => {
    if (!config.mouseInteraction) return;

    const canvasElement = gl.domElement;

    const handleMouseMove = (event: MouseEvent) => {
      // Throttle mouse updates to 30 FPS to prevent flicker
      const now = Date.now();
      if (now - lastMouseUpdate.current < 33) return; // ~30 FPS
      lastMouseUpdate.current = now;

      // Get canvas bounds
      const rect = canvasElement.getBoundingClientRect();
      
      // Convert mouse position to normalized device coordinates (-1 to +1)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Create raycaster to get world position
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(x, y);
      raycaster.setFromCamera(mouse, camera);
      
      // Project to particle cloud center distance
      const distance = 8; // Closer to particle cloud
      const direction = raycaster.ray.direction.clone();
      const worldPosition = raycaster.ray.origin.clone().add(direction.multiplyScalar(distance));
      
      setMousePosition(worldPosition);
    };

    canvasElement.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      canvasElement.removeEventListener('mousemove', handleMouseMove);
    };
  }, [config.mouseInteraction, camera, gl]);

  // Animation + optimized mouse interaction updates
  const prevMouseInteraction = useRef(config.mouseInteraction);
  const prevMouseForce = useRef(config.mouseForce);
  const prevMousePos = useRef(new THREE.Vector3());

  useFrame((_: any, delta: number) => {
    if (config.enableRotation && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1; // Slow rotation around Y-axis
    }

    // Only update mouse uniforms when needed (prevent flicker)
    if (config.useDots && pointsRef.current && config.mouseInteraction) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        // Only update if values actually changed
        const mouseChanged = !mousePosition.equals(prevMousePos.current);
        const interactionChanged = prevMouseInteraction.current !== config.mouseInteraction;
        const forceChanged = prevMouseForce.current !== config.mouseForce;
        
        if (mouseChanged || interactionChanged || forceChanged) {
          if (mouseChanged) {
            material.uniforms.mousePosition.value.copy(mousePosition);
            prevMousePos.current.copy(mousePosition);
          }
          if (interactionChanged) {
            material.uniforms.mouseInteraction.value = config.mouseInteraction ? 1.0 : 0.0;
            prevMouseInteraction.current = config.mouseInteraction;
          }
          if (forceChanged) {
            material.uniforms.hoverStrength.value = config.mouseForce || 1.5;
            prevMouseForce.current = config.mouseForce;
          }
        }
      }
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
      
      // Positions (invert Y axis to match Houdini coordinate system)
      positions[i3] = particle.position[0];      // X
      positions[i3 + 1] = -particle.position[1]; // Y inverted
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
          pointTexture: { value: dotTexture },
          mousePosition: { value: mousePosition },
          mouseInteraction: { value: config.mouseInteraction ? 1.0 : 0.0 },
          hoverRadius: { value: 1.0 }, // MUCH smaller radius
          hoverStrength: { value: config.mouseForce || 1.5 }
        },
        vertexShader: `
          attribute float size;
          uniform vec3 mousePosition;
          uniform float mouseInteraction;
          uniform float hoverRadius;
          uniform float hoverStrength;
          varying vec3 vColor;
          varying float vHoverFactor;
          
          void main() {
            vColor = color;
            vHoverFactor = 0.0;
            
            // Transform position to world coordinates
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vec4 mvPosition = viewMatrix * worldPosition;
            
            // Base size calculation with depth attenuation
            float baseSize = size * (300.0 / -mvPosition.z);
            float finalSize = baseSize;
            
            // Mouse hover effect - PER PARTICLE
            if (mouseInteraction > 0.5) {
              // Calculate distance in world space, not model space
              float distanceToMouse = distance(worldPosition.xyz, mousePosition);
              
              // Only affect particles within hover radius
              if (distanceToMouse < hoverRadius) {
                float hoverFactor = 1.0 - (distanceToMouse / hoverRadius);
                hoverFactor = smoothstep(0.0, 1.0, hoverFactor); // Smooth transition
                vHoverFactor = hoverFactor; // Pass to fragment for debugging
                finalSize = baseSize * (1.0 + hoverFactor * hoverStrength);
              }
            }
            
            gl_PointSize = max(1.0, finalSize); // Ensure minimum size
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          varying float vHoverFactor;
          
          void main() {
            vec4 baseColor = vec4(vColor, 1.0);
            vec4 texColor = texture2D(pointTexture, gl_PointCoord);
            
            // Optional: Add slight color boost for hovered particles
            // float colorBoost = 1.0 + (vHoverFactor * 0.2);
            // baseColor.rgb *= colorBoost;
            
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
  }, [renderParticles, config, mousePosition]);

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
