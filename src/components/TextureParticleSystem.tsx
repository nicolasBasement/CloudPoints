import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VisualizationConfig, TextureData } from '../types/particle';
import { DotTextures } from '../utils/dotTextures';

interface TextureParticleSystemProps {
  textureData: TextureData;
  particleCount: number;
  config: VisualizationConfig;
}

export const TextureParticleSystem: React.FC<TextureParticleSystemProps> = ({ 
  textureData, 
  particleCount, 
  config 
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // const { gl } = useThree(); // Reserved for future use

  // Create geometry and material using textures
  const { geometry, material } = useMemo(() => {
    if (!textureData.positionTexture || !textureData.colorTexture) {
      return { geometry: new THREE.BufferGeometry(), material: new THREE.Material() };
    }

    // Convert canvases to Three.js textures
    const positionTexture = new THREE.CanvasTexture(textureData.positionTexture);
    positionTexture.format = THREE.RGBAFormat;
    positionTexture.type = THREE.UnsignedByteType;
    positionTexture.flipY = false;
    positionTexture.generateMipmaps = false;
    positionTexture.minFilter = THREE.NearestFilter;
    positionTexture.magFilter = THREE.NearestFilter;

    const colorTexture = new THREE.CanvasTexture(textureData.colorTexture);
    colorTexture.format = THREE.RGBAFormat;
    colorTexture.type = THREE.UnsignedByteType;
    colorTexture.flipY = false;
    colorTexture.generateMipmaps = false;
    colorTexture.minFilter = THREE.NearestFilter;
    colorTexture.magFilter = THREE.NearestFilter;

    const textureSize = textureData.width;
    
    // Create UV coordinates for each particle to sample from texture
    const uvArray = new Float32Array(particleCount * 2);
    const indexArray = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const x = i % textureSize;
      const y = Math.floor(i / textureSize);
      
      uvArray[i * 2] = (x + 0.5) / textureSize;
      uvArray[i * 2 + 1] = (y + 0.5) / textureSize;
      indexArray[i] = i;
    }

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    if (config.useDots) {
      // Use Points with texture sampling shader
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
      geometry.setAttribute('particleIndex', new THREE.BufferAttribute(indexArray, 1));

      material = new THREE.ShaderMaterial({
        uniforms: {
          positionTexture: { value: positionTexture },
          colorTexture: { value: colorTexture },
          textureSize: { value: textureSize },
          particleSize: { value: config.particleSize },
          pointTexture: { 
            value: new THREE.TextureLoader().load(DotTextures.getDotTexture(config.dotShape))
          }
        },
        vertexShader: `
          uniform sampler2D positionTexture;
          uniform sampler2D colorTexture;
          uniform float textureSize;
          uniform float particleSize;
          
          attribute vec2 uv;
          attribute float particleIndex;
          
          varying vec3 vColor;
          
          void main() {
            // Sample position from texture (normalized 0-1, convert back to world space)
            vec4 positionSample = texture2D(positionTexture, uv);
            vec3 position = (positionSample.rgb - 0.5) * 20.0; // Scale back to world space
            
            // Invert Y axis to match Houdini coordinate system
            position.y = -position.y;
            
            // Sample color from texture
            vec4 colorSample = texture2D(colorTexture, uv);
            vColor = colorSample.rgb;
            
            // Transform position
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = particleSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          
          void main() {
            gl_FragColor = vec4(vColor, 1.0);
            gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
            if (gl_FragColor.a < 0.5) discard;
          }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true
      });
    } else {
      // Use InstancedMesh with texture sampling
      geometry = new THREE.SphereGeometry(0.1, 8, 6);
      
      material = new THREE.ShaderMaterial({
        uniforms: {
          positionTexture: { value: positionTexture },
          colorTexture: { value: colorTexture },
          textureSize: { value: textureSize },
          particleSize: { value: config.particleSize }
        },
        vertexShader: `
          uniform sampler2D positionTexture;
          uniform sampler2D colorTexture;
          uniform float textureSize;
          uniform float particleSize;
          
          attribute float instanceId;
          varying vec3 vColor;
          
          void main() {
            // Calculate UV from instance ID
            float x = mod(instanceId, textureSize);
            float y = floor(instanceId / textureSize);
            vec2 uv = vec2((x + 0.5) / textureSize, (y + 0.5) / textureSize);
            
            // Sample position and color
            vec4 positionSample = texture2D(positionTexture, uv);
            vec3 instancePosition = (positionSample.rgb - 0.5) * 20.0;
            
            // Invert Y axis to match Houdini coordinate system
            instancePosition.y = -instancePosition.y;
            
            vec4 colorSample = texture2D(colorTexture, uv);
            vColor = colorSample.rgb;
            
            // Apply transformations
            vec3 scaled = position * particleSize;
            vec4 worldPosition = instanceMatrix * vec4(scaled + instancePosition, 1.0);
            
            gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          
          void main() {
            gl_FragColor = vec4(vColor, 0.8);
          }
        `,
        transparent: true
      });
    }

    return { geometry, material };
  }, [textureData, particleCount, config]);

  // Animation
  useFrame((state) => {
    if (config.enableRotation) {
      if (pointsRef.current) {
        pointsRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      }
      if (meshRef.current) {
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      }
    }
  });

  if (config.useDots) {
    return (
      <points ref={pointsRef} geometry={geometry} material={material} />
    );
  } else {
    return (
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, particleCount]}
        count={particleCount}
      />
    );
  }
};
