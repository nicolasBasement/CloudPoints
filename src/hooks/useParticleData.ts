import { useState, useCallback } from 'react';
import { ParticleData } from '../types/particle';
import { TextureGenerator } from '../utils/textureGenerator';
import { HoudiniParser } from '../utils/houdiniParser';

import { TextureLoader } from '../utils/textureLoader';
import { SimpleExporter } from '../utils/simpleExporter';

export const useParticleData = () => {
  const [particleData, setParticleData] = useState<ParticleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<string>('');

  const loadFromJSON = useCallback(async (url: string, optimizeForPerformance: boolean = false) => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress('Fetching data...');
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load JSON: ${response.statusText}`);
      }
      
      setLoadingProgress('Parsing JSON...');
      const rawData = await response.json();
      
      setLoadingProgress('Processing particles...');
      // Use HoudiniParser to auto-detect format and convert
      let data = HoudiniParser.parseParticleData(rawData);
      
      // Optimize for performance if requested or if very large dataset
      if (optimizeForPerformance || data.particles.length > 100000) {
        setLoadingProgress('Optimizing for performance...');
        data = HoudiniParser.optimizeForRendering(data, 50000); // Limit to 50k particles
      }
      
      setParticleData(data);
      setLoadingProgress('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading particle data:', err);
    } finally {
      setIsLoading(false);
      setLoadingProgress('');
    }
  }, []);

  const loadFromFile = useCallback(async (file: File, optimizeForPerformance: boolean = true) => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress('Reading file...');
    
    try {
      // Use streaming parser for large files
      let data: ParticleData;
      
      if (file.size > 10 * 1024 * 1024) { // Files larger than 10MB
        setLoadingProgress('Processing large file...');
        data = await HoudiniParser.streamParseJSON(file);
      } else {
        setLoadingProgress('Parsing file...');
        const text = await file.text();
        const rawData = JSON.parse(text);
        data = HoudiniParser.parseParticleData(rawData);
      }
      
      // Optimize for performance with large datasets
      if (optimizeForPerformance && data.particles.length > 50000) {
        setLoadingProgress('Optimizing for performance...');
        data = HoudiniParser.optimizeForRendering(data, 50000);
      }
      
      setParticleData(data);
      setLoadingProgress('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error parsing particle file:', err);
    } finally {
      setIsLoading(false);
      setLoadingProgress('');
    }
  }, []);

  const generateProcedural = useCallback((count: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const particles = TextureGenerator.generateProceduralParticles(count);
      const data: ParticleData = {
        particles,
        metadata: {
          count: particles.length,
          created: new Date().toISOString()
        }
      };
      
      setParticleData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error generating procedural particles';
      setError(errorMessage);
      console.error('Error generating procedural particles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHoudiniData = useCallback(async () => {
    // Specifically load the Houdini point_data.json file
    await loadFromJSON('/point_data.json', true); // Always optimize for performance
  }, [loadFromJSON]);

  const setTestData = useCallback((data: ParticleData) => {
    setParticleData(data);
    setError(null);
    setLoadingProgress('');
    setIsLoading(false); // ✅ FIX: Asegurar que isLoading se ponga en false
  }, []);

  const exportTextures = useCallback(async () => {
    if (!particleData || !particleData.particles || particleData.particles.length === 0) {
      setError('No particle data to export');
      return;
    }

    setIsLoading(true);
    setLoadingProgress('Generating PNG textures...');
    
    try {
      console.log('🚀 Starting simple export...');
      
      // Use simple exporter
      const exportResult = await SimpleExporter.exportParticles(particleData.particles);
      
      setLoadingProgress('Creating downloads...');
      
      // Create filename based on source and timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
      const source = particleData.metadata?.source || 'particles';
      const filename = `${source}_${timestamp}`;
      
      await SimpleExporter.downloadExport(exportResult, filename);
      
      setLoadingProgress('');
      console.log('✅ Simple export completed successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error exporting textures';
      setError(errorMessage);
      console.error('❌ Error in simple export:', err);
    } finally {
      setIsLoading(false);
      setLoadingProgress('');
    }
  }, [particleData]);

  const loadCustomJSON = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsLoading(true);
      setLoadingProgress('Loading custom JSON...');
      setError(null);
      
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        
        // Try to parse as particle data
        const parsedData = await HoudiniParser.parseParticleData(jsonData);
        setParticleData(parsedData);
        console.log(`Loaded ${parsedData.particles.length} particles from custom JSON`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error loading custom JSON';
        setError(errorMessage);
        console.error('Error loading custom JSON:', error);
      } finally {
        setIsLoading(false);
        setLoadingProgress('');
      }
    };
    
    fileInput.click();
  }, []);

  const loadFromTextures = useCallback(() => {
    const fileInput = TextureLoader.createFileInputHandler(
      (data) => {
        setParticleData(data);
        setError(null);
        setIsLoading(false); // ✅ FIX: Limpiar estado de carga
        console.log('Loaded particles from textures:', data.particles.length);
      },
      (errorMessage) => {
        setError(errorMessage);
        setIsLoading(false); // ✅ FIX: Limpiar estado de carga en error también
        console.error('Error loading textures:', errorMessage);
      }
    );
    
    fileInput.click();
  }, []);

  const clearData = useCallback(() => {
    setParticleData(null);
    setError(null);
    setLoadingProgress('');
    setIsLoading(false); // ✅ FIX: También limpiar estado de loading
  }, []);

  const resetLoadingState = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLoadingProgress('');
    console.log('🔄 Loading state reset');
  }, []);

  return {
    particleData,
    isLoading,
    error,
    loadingProgress,
    loadFromJSON,
    loadFromFile,
    generateProcedural,
    loadHoudiniData,
    loadCustomJSON,
    setTestData,
    exportTextures,
    loadFromTextures,
    clearData,
    resetLoadingState
  };
};
