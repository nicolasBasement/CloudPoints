import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ParticleSystem } from './components/ParticleSystem';
import { TextureParticleSystem } from './components/TextureParticleSystem';

import { CustomUI, UIState } from './components/CustomUI';
import { useParticleData } from './hooks/useParticleData';
import { VisualizationConfig } from './types/particle';
import { TextureGenerator } from './utils/textureGenerator';

import * as THREE from 'three';

function Scene() {
  const { 
    particleData, 
    isLoading, 
    loadHoudiniData,
    loadCustomJSON,
    setTestData,
    exportTextures,
    loadFromTextures,
    resetLoadingState
  } = useParticleData();
  const [textureData, setTextureData] = useState<any>(null);

  // Custom UI State (replaces Leva)
  const [uiState, setUIState] = useState<UIState>({
    visualizationMode: 'json',
    particleSize: 0.15,
    useDots: true,
    dotShape: 'circular',
    bloomIntensity: 1.5,
    bloomRadius: 0.4,
    enableRotation: false,
    showAxesHelper: true,
    invertYAxis: false,
    backgroundColor: '#001122'
  });

  // Convert UI state to VisualizationConfig
  const config: VisualizationConfig = {
    visualizationMode: uiState.visualizationMode,
    particleSize: uiState.particleSize,
    useDots: uiState.useDots,
    dotShape: uiState.dotShape,
    bloomIntensity: uiState.bloomIntensity,
    bloomRadius: uiState.bloomRadius,
    enableRotation: uiState.enableRotation,
    invertYAxis: uiState.invertYAxis
  };

  // Generate dynamic background gradient
  const generateBackgroundGradient = (color: string): string => {
    // Create a radial gradient from the selected color to black
    return `radial-gradient(circle, ${color} 0%, #000000 100%)`;
  };

  // Simple test data handler
  const handleTestSimpleData = () => {
    const testParticles = [
      { id: 'test1', position: [0, 0, 0] as [number, number, number], color: [1, 0, 0] as [number, number, number] },
      { id: 'test2', position: [2, 2, 0] as [number, number, number], color: [0, 1, 0] as [number, number, number] },
      { id: 'test3', position: [-2, -2, 0] as [number, number, number], color: [0, 0, 1] as [number, number, number] },
      { id: 'test4', position: [5, 0, 5] as [number, number, number], color: [1, 1, 0] as [number, number, number] },
      { id: 'test5', position: [-5, 0, -5] as [number, number, number], color: [1, 0, 1] as [number, number, number] }
    ];
    console.log('Loading simple test data:', testParticles);
    const testData = {
      particles: testParticles,
      metadata: {
        count: testParticles.length,
        created: new Date().toISOString(),
        source: 'test'
      }
    };
    setTestData(testData);
  };

  // Check if export should be disabled
  const shouldDisableExport = !particleData || !particleData.particles || particleData.particles.length === 0 || isLoading;

  // Generate textures when switching to texture mode
  React.useEffect(() => {
    if (config.visualizationMode === 'texture' && particleData && !textureData) {
      const textures = TextureGenerator.generateTextures(particleData.particles);
      setTextureData(textures);
    }
  }, [config.visualizationMode, particleData, textureData]);

  // Reset texture data when changing modes
  React.useEffect(() => {
    if (config.visualizationMode === 'json') {
      setTextureData(null);
    }
  }, [config.visualizationMode]);

  const renderParticleSystem = () => {
    if (!particleData) return null;

    if (config.visualizationMode === 'texture' && textureData) {
      return (
        <TextureParticleSystem
          textureData={textureData}
          particleCount={particleData.particles.length}
          config={config}
        />
      );
    } else {
      return (
        <ParticleSystem
          particles={particleData.particles}
          config={config}
        />
      );
    }
  };


  return (
    <>
      {/* Custom UI */}
      <CustomUI
        state={uiState}
        onChange={(updates) => setUIState(prev => ({ ...prev, ...updates }))}
        onLoadHoudiniData={loadHoudiniData}
        onLoadCustomJSON={loadCustomJSON}
        onTestSimpleData={handleTestSimpleData}
        onExportTextures={() => exportTextures()}
        onLoadFromTextures={loadFromTextures}
        onResetLoading={resetLoadingState}
        isLoading={isLoading}
        particleCount={particleData?.particles?.length || 0}
        shouldDisableExport={shouldDisableExport}
      />

      {/* Canvas */}
      <Canvas
        camera={{ position: [15, 15, 15], fov: 60 }}
        gl={{ antialias: true }}
        style={{ background: generateBackgroundGradient(uiState.backgroundColor) }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          
          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.05}
            rotateSpeed={0.5}
          />

          {/* Axes Helper - RGB Orientation Gizmo */}
          {uiState.showAxesHelper && (
            <primitive object={new THREE.AxesHelper(5)} />
          )}

          {/* Particle System */}
          {renderParticleSystem()}

          {/* Post-processing effects */}
          <EffectComposer>
            <Bloom
              intensity={config.bloomIntensity}
              radius={config.bloomRadius}
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
            />
          </EffectComposer>

          {/* Performance stats */}
          <Stats />
        </Suspense>
      </Canvas>


    </>
  );
}

export default function App() {
  return <Scene />;
}
