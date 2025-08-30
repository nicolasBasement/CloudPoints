import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Particle, VisualizationConfig } from '../types/particle';

interface PhysicsParticle {
  originalPosition: [number, number, number];
  currentPosition: [number, number, number];
  velocity: [number, number, number];
  id: string;
}

interface MousePosition {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  worldZ: number;
}

export const usePhysics = (particles: Particle[], config: VisualizationConfig) => {
  const [physicsParticles, setPhysicsParticles] = useState<PhysicsParticle[]>([]);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0, worldX: 0, worldY: 0, worldZ: 0 });
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);
  const prevPhysicsEnabled = useRef(config.enablePhysics);

  // DEBUG: Log when physics is enabled/disabled
  if (prevPhysicsEnabled.current !== config.enablePhysics) {
    console.log(`🔄 Mouse physics state: ${prevPhysicsEnabled.current} → ${config.enablePhysics}`);
    if (config.enablePhysics) {
      console.log(`🖱️ Mouse physics activated: force=${config.mouseForce}, return=${config.returnSpeed}`);
    }
    prevPhysicsEnabled.current = config.enablePhysics;
  }

  // DEBUG: Track particles array reference changes vs content changes
  const prevParticlesRef = useRef(particles);
  if (prevParticlesRef.current !== particles) {
    console.log(`📦 Particles array reference changed (length: ${particles.length})`);
    if (prevParticlesRef.current.length === particles.length && particles.length > 0 && 
        prevParticlesRef.current[0]?.id === particles[0]?.id) {
      console.log(`⚠️ Same content, different reference - physics won't re-initialize (GOOD!)`);
    }
    prevParticlesRef.current = particles;
  }
  
  // Initialize physics particles when base particles REALLY change (not just reference)
  const particlesLength = particles.length;
  const particlesHash = useMemo(() => {
    if (particles.length === 0) return '';
    // Create stable hash based on content, not array reference
    return `${particles.length}-${particles[0].id}-${particles[particles.length-1].id}`;
  }, [particles.length, particles[0]?.id, particles[particles.length-1]?.id]);
  
  useEffect(() => {
    if (particles.length === 0) {
      setPhysicsParticles([]);
      console.log(`🔄 Physics cleared - no particles`);
      return;
    }
    
    const newPhysicsParticles: PhysicsParticle[] = particles.map(particle => ({
      originalPosition: [...particle.position] as [number, number, number],
      currentPosition: [...particle.position] as [number, number, number],
      velocity: [0, 0, 0] as [number, number, number],
      id: particle.id
    }));
    
    setPhysicsParticles(newPhysicsParticles);
    console.log(`🔄 Physics initialized for ${particles.length} particles (hash: ${particlesHash}) - SHOULD ONLY HAPPEN ONCE`);
    if (particles.length > 0) {
      console.log(`📍 Sample original position:`, particles[0].position);
      
      // Log bounds of original particles to detect issues
      const xs = particles.map(p => p.position[0]);
      const ys = particles.map(p => p.position[1]);
      const zs = particles.map(p => p.position[2]);
      console.log(`📏 Original bounds: X[${Math.min(...xs).toFixed(2)}, ${Math.max(...xs).toFixed(2)}] Y[${Math.min(...ys).toFixed(2)}, ${Math.max(...ys).toFixed(2)}] Z[${Math.min(...zs).toFixed(2)}, ${Math.max(...zs).toFixed(2)}]`);
    }
  }, [particlesLength, particlesHash]); // ← FIXED: Only re-init when particles REALLY change
  
  // Mouse event handlers
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Convert to world coordinates (approximate)
    const worldX = x * 10;
    const worldY = y * 10;
    const worldZ = 0;
    
    setMousePosition({
      x: event.clientX,
      y: event.clientY,
      worldX,
      worldY,
      worldZ
    });
  }, []);
  
  // Physics update loop (THROTTLED: prevent multiple calls per frame)
  const lastUpdateTime = useRef(0);
  const updatePhysics = useCallback(() => {
    const now = Date.now();
    
    // Throttle: Only update max 60 FPS (every 16.67ms)
    if (now - lastUpdateTime.current < 16) {
      return; // Skip this update
    }
    lastUpdateTime.current = now;
    
    if (!config.enablePhysics) {
      return;
    }
    
    const time = Date.now() * 0.001; // Convert to seconds
    const deltaTime = time - timeRef.current;
    timeRef.current = time;
    
    if (deltaTime > 0.1) return; // Skip large time jumps
    
    setPhysicsParticles(prev => {
      if (prev.length === 0) {
        return prev;
      }
      
      const updatedParticles = prev.map(particle => {
        let newVelocity = [...particle.velocity] as [number, number, number];
        let newPosition = [...particle.currentPosition] as [number, number, number];
      
        // Apply mouse interaction (SIMPLIFIED: Only mouse physics)
        if (config.mouseForce && config.mouseForce > 0) {
          const dx = mousePosition.worldX - particle.currentPosition[0];
          const dy = mousePosition.worldY - particle.currentPosition[1];
          const dz = mousePosition.worldZ - particle.currentPosition[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < 5 && distance > 0.1) { // Interaction radius
            const force = (config.mouseForce || 0.1) / (distance + 0.5); // Simple force calculation
            newVelocity[0] += dx * force * deltaTime * 0.5; // More visible interaction
            newVelocity[1] += dy * force * deltaTime * 0.5;
            newVelocity[2] += dz * force * deltaTime * 0.3;
          }
        }
      
        // Apply return force to original position (stronger)
        const returnStrength = (config.returnSpeed || 3) * 2; // Stronger return force
        const returnForceX = (particle.originalPosition[0] - particle.currentPosition[0]) * returnStrength;
        const returnForceY = (particle.originalPosition[1] - particle.currentPosition[1]) * returnStrength;
        const returnForceZ = (particle.originalPosition[2] - particle.currentPosition[2]) * returnStrength;
        
        newVelocity[0] += returnForceX * deltaTime;
        newVelocity[1] += returnForceY * deltaTime;
        newVelocity[2] += returnForceZ * deltaTime;
        
        // Apply stronger damping to prevent runaway motion
        const damping = 0.85; // Stronger damping
        newVelocity[0] *= damping;
        newVelocity[1] *= damping;
        newVelocity[2] *= damping;
        
        // Limit velocity to prevent runaway motion
        const maxVelocity = 5.0;
        const velocityMagnitude = Math.sqrt(newVelocity[0] * newVelocity[0] + newVelocity[1] * newVelocity[1] + newVelocity[2] * newVelocity[2]);
        if (velocityMagnitude > maxVelocity) {
          const scale = maxVelocity / velocityMagnitude;
          newVelocity[0] *= scale;
          newVelocity[1] *= scale;
          newVelocity[2] *= scale;
        }
        
        // Update position
        newPosition[0] += newVelocity[0] * deltaTime;
        newPosition[1] += newVelocity[1] * deltaTime;
        newPosition[2] += newVelocity[2] * deltaTime;
        
        // Limit maximum displacement from original position (reasonable for mouse interaction)
        const maxDisplacement = 0.5; // Allow more movement for visible mouse effects
        const dx = newPosition[0] - particle.originalPosition[0];
        const dy = newPosition[1] - particle.originalPosition[1];
        const dz = newPosition[2] - particle.originalPosition[2];
        const displacement = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (displacement > maxDisplacement) {
          const scale = maxDisplacement / displacement;
          newPosition[0] = particle.originalPosition[0] + dx * scale;
          newPosition[1] = particle.originalPosition[1] + dy * scale;
          newPosition[2] = particle.originalPosition[2] + dz * scale;
          
          // Reduce velocity when hitting displacement limit
          newVelocity[0] *= 0.1;
          newVelocity[1] *= 0.1;
          newVelocity[2] *= 0.1;
          
          // Debug first few particles hitting limit
          if (Math.random() < 0.01) { // Only 1% of particles for debugging
            console.log(`⚠️ Particle hit displacement limit: ${displacement.toFixed(3)} → ${maxDisplacement}`);
            console.log(`📍 Original:`, particle.originalPosition);
            console.log(`📍 New:`, newPosition);
          }
        }
        
        return {
          ...particle,
          velocity: newVelocity,
          currentPosition: newPosition
        };
      });
      
      // Debug physics every 10 seconds (REDUCED frequency)
      if (Math.floor(time) % 10 === 0 && time - Math.floor(time) < 0.1 && updatedParticles.length > 0) {
        const sampleParticle = updatedParticles[0];
        const displacement = Math.sqrt(
          Math.pow(sampleParticle.currentPosition[0] - sampleParticle.originalPosition[0], 2) +
          Math.pow(sampleParticle.currentPosition[1] - sampleParticle.originalPosition[1], 2) +
          Math.pow(sampleParticle.currentPosition[2] - sampleParticle.originalPosition[2], 2)
        );
        console.log(`🔍 Physics Debug - Displacement: ${displacement.toFixed(4)}`);
        console.log(`📍 Current pos:`, sampleParticle.currentPosition);
        console.log(`📍 Original pos:`, sampleParticle.originalPosition);
      }
      
      return updatedParticles;
    });
  }, [config, mousePosition]); // FIXED: Removed physicsParticles dependency
  
  // Animation loop (PROTECTED: prevent multiple loops)
  useEffect(() => {
    // Always cancel any existing animation frame first
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    if (!config.enablePhysics) {
      return;
    }
    
    let isActive = true; // Prevent multiple loops
    
    const animate = () => {
      if (!isActive) return; // Exit if component unmounted or physics disabled
      
      updatePhysics();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    timeRef.current = Date.now() * 0.001;
    animate();
    
    return () => {
      isActive = false; // Mark as inactive
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [config.enablePhysics, updatePhysics]);
  
  // Mouse event listeners
  useEffect(() => {
    if (config.enablePhysics && config.mouseInteraction) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [config.enablePhysics, config.mouseInteraction, handleMouseMove]);
  
  // Return computed particles with physics positions
  const computedParticles: Particle[] = particles.map((particle, index) => {
    const physicsParticle = physicsParticles[index];
    if (!physicsParticle || !config.enablePhysics) {
      return particle;
    }
    
    // Verify position is valid
    const position = physicsParticle.currentPosition;
    if (!position || position.some(p => !isFinite(p))) {
      console.error(`⚠️ Invalid position for particle ${index}:`, position);
      return { ...particle, position: physicsParticle.originalPosition }; // Fallback to original
    }
    
    // CRITICAL: Ensure all particle properties are preserved
    return {
      id: particle.id,
      position: position,
      color: particle.color,     // ← CRITICAL: Preserve color
      size: particle.size        // ← CRITICAL: Preserve size
    };
  });
  
  // DEBUG: Critical rendering debug (REDUCED frequency)
  if (config.enablePhysics && Math.random() < 0.01) {
    const hasMovement = physicsParticles.length > 0 && physicsParticles.some(p => 
      Math.abs(p.currentPosition[0] - p.originalPosition[0]) > 0.0001 ||
      Math.abs(p.currentPosition[1] - p.originalPosition[1]) > 0.0001 ||
      Math.abs(p.currentPosition[2] - p.originalPosition[2]) > 0.0001
    );
    
    console.log(`🔍 PHYSICS RENDER DEBUG:`);
    console.log(`  - Original particles: ${particles.length}`);
    console.log(`  - Physics particles: ${physicsParticles.length}`);
    console.log(`  - Computed particles: ${computedParticles.length}`);
    console.log(`  - Movement detected: ${hasMovement}`);
    
    // Check if computed particles have all required properties
    if (computedParticles.length > 0) {
      const sample = computedParticles[0];
      console.log(`  - Sample computed particle:`, {
        id: sample.id,
        hasPosition: !!sample.position,
        hasColor: !!sample.color,
        hasSize: !!sample.size,
        position: sample.position,
        color: sample.color,
        size: sample.size
      });
    }
    
    // Check for invalid particles
    const invalidParticles = computedParticles.filter(p => 
      !p || !p.position || !p.color || p.position.some(coord => !isFinite(coord))
    ).length;
    
    if (invalidParticles > 0) {
      console.error(`  - ⚠️ ${invalidParticles} particles have invalid properties!`);
    }
    
    // Check original vs physics array length mismatch
    if (particles.length !== physicsParticles.length) {
      console.error(`  - ⚠️ Array length mismatch! Original: ${particles.length}, Physics: ${physicsParticles.length}`);
    }
  }
  
  // Emergency fallback: if computed particles are empty or problematic, use originals
  const finalParticles = (computedParticles.length === 0 || 
    computedParticles.every(p => !p || !p.position || p.position.some(coord => !isFinite(coord)))) 
    ? particles 
    : computedParticles;

  if (config.enablePhysics && finalParticles === particles) {
    console.warn(`🚨 Physics emergency fallback: using original particles`);
  }

  return {
    particles: finalParticles,
    isPhysicsEnabled: config.enablePhysics || false
  };
};
