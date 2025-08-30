import React, { useState } from 'react';
import './CustomUI.css';

export interface UIState {
  // Particle Controls
  visualizationMode: 'json' | 'texture';
  particleSize: number;
  useDots: boolean;
  dotShape: 'circular' | 'square';
  bloomIntensity: number;
  bloomRadius: number;
  
  // Camera & Animation
  enableRotation: boolean;
  showAxesHelper: boolean;
  
  // Physics
  enablePhysics: boolean;
  windStrength: number;
  windSpeed: number;
  mouseInteraction: boolean;
  mouseForce: number;
  returnSpeed: number;
  
  // Export - now always PNG
}

interface CustomUIProps {
  state: UIState;
  onChange: (updates: Partial<UIState>) => void;
  
  // Action handlers
  onLoadHoudiniData: () => void;
  onLoadCustomJSON: () => void;
  onTestSimpleData: () => void;
  onExportTextures: () => void;
  onLoadFromTextures: () => void;
  onResetLoading: () => void;
  
  // State info
  isLoading: boolean;
  particleCount: number;
  shouldDisableExport: boolean;
  debugInfo: any;
}

export const CustomUI: React.FC<CustomUIProps> = ({
  state,
  onChange,
  onLoadHoudiniData,
  onLoadCustomJSON,
  onTestSimpleData,
  onExportTextures,
  onLoadFromTextures,
  onResetLoading,
  isLoading,
  particleCount,
  shouldDisableExport,
  debugInfo
}) => {
  const [activeTab, setActiveTab] = useState<'particles' | 'data' | 'physics' | 'export'>('particles');

  return (
    <div className="custom-ui">
      {/* Header */}
      <div className="ui-header">
        <h2>CloudPoints</h2>
        <div className="particle-count">
          {particleCount > 0 && `${particleCount.toLocaleString()} particles`}
          {isLoading && ' (loading)'}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ui-tabs">
        <button 
          className={`tab ${activeTab === 'particles' ? 'active' : ''}`}
          onClick={() => setActiveTab('particles')}
        >
          Visual
        </button>
        <button 
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          Data
        </button>
        <button 
          className={`tab ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          Physics
        </button>
        <button 
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
      </div>

      {/* Content */}
      <div className="ui-content">
        {activeTab === 'particles' && (
          <div className="tab-content">
            {/* Visualization Mode */}
            <div className="control-group">
              <label>Rendering Mode</label>
              <div className="button-group">
                <button 
                  className={state.visualizationMode === 'json' ? 'active' : ''}
                  onClick={() => onChange({ visualizationMode: 'json' })}
                >
                  Direct
                </button>
                <button 
                  className={state.visualizationMode === 'texture' ? 'active' : ''}
                  onClick={() => onChange({ visualizationMode: 'texture' })}
                >
                  Texture
                </button>
              </div>
            </div>

            {/* Particle Size */}
            <div className="control-group">
              <label>Particle Size: {state.particleSize.toFixed(2)}</label>
              <input
                type="range"
                min="0.01"
                max="2.0"
                step="0.01"
                value={state.particleSize}
                onChange={(e) => onChange({ particleSize: parseFloat(e.target.value) })}
                className="slider"
              />
            </div>

            {/* Particle Type */}
            <div className="control-group">
              <label>Particle Type</label>
              <div className="button-group">
                <button 
                  className={state.useDots ? 'active' : ''}
                  onClick={() => onChange({ useDots: true })}
                >
                  Dots
                </button>
                <button 
                  className={!state.useDots ? 'active' : ''}
                  onClick={() => onChange({ useDots: false })}
                >
                  Spheres
                </button>
              </div>
            </div>

            {/* Dot Shape (only show when useDots is true) */}
            {state.useDots && (
              <div className="control-group">
                <label>Dot Shape</label>
                <div className="button-group">
                  <button 
                    className={state.dotShape === 'circular' ? 'active' : ''}
                    onClick={() => onChange({ dotShape: 'circular' })}
                  >
                    Circular
                  </button>
                  <button 
                    className={state.dotShape === 'square' ? 'active' : ''}
                    onClick={() => onChange({ dotShape: 'square' })}
                  >
                    Square
                  </button>
                </div>
              </div>
            )}

            {/* Bloom Effects */}
            <div className="control-group">
              <label>Bloom Intensity: {state.bloomIntensity.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={state.bloomIntensity}
                onChange={(e) => onChange({ bloomIntensity: parseFloat(e.target.value) })}
                className="slider"
              />
            </div>

            <div className="control-group">
              <label>Bloom Radius: {state.bloomRadius.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={state.bloomRadius}
                onChange={(e) => onChange({ bloomRadius: parseFloat(e.target.value) })}
                className="slider"
              />
            </div>

            {/* Camera & Animation */}
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={state.enableRotation}
                  onChange={(e) => onChange({ enableRotation: e.target.checked })}
                />
                Auto Rotation
              </label>
            </div>

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={state.showAxesHelper}
                  onChange={(e) => onChange({ showAxesHelper: e.target.checked })}
                />
                Show Axes
              </label>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="tab-content">
            <div className="control-group">
              <button 
                className="action-btn primary"
                onClick={onLoadHoudiniData}
                disabled={isLoading}
              >
                Load Houdini Data
              </button>
            </div>

            <div className="control-group">
              <button 
                className="action-btn secondary"
                onClick={onLoadCustomJSON}
                disabled={isLoading}
              >
                Load Custom JSON
              </button>
            </div>

            <div className="control-group">
              <button 
                className="action-btn tertiary"
                onClick={onTestSimpleData}
                disabled={isLoading}
              >
                Test Simple Data
              </button>
            </div>

            {isLoading && (
              <div className="control-group">
                <button 
                  className="action-btn warning"
                  onClick={onResetLoading}
                >
                  Reset Loading State
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'physics' && (
          <div className="tab-content">
            {/* Enable Physics */}
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={state.enablePhysics}
                  onChange={(e) => onChange({ enablePhysics: e.target.checked })}
                />
                Mouse Physics
              </label>
              <div className="hint">Particles react to mouse movement</div>
            </div>

            {/* Mouse Physics - Simple and Effective */}
            <div className="control-group">
              <div className="hint" style={{ color: '#f59e0b', fontSize: '11px', marginBottom: '10px' }}>
                ⚠️ COMPLEX PHYSICS DISABLED - Try simple alternatives below
              </div>
            </div>

            {/* SIMPLE ALTERNATIVES */}
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={state.enableRotation}
                  onChange={(e) => onChange({ enableRotation: e.target.checked })}
                />
                Auto Rotation
              </label>
              <div className="hint">Slowly rotate the entire particle cloud</div>
            </div>

            <div className="control-group">
              <label>Particle Size: {state.particleSize.toFixed(2)}</label>
              <input
                type="range"
                min="0.01"
                max="2.0"
                step="0.01"
                value={state.particleSize}
                onChange={(e) => onChange({ particleSize: parseFloat(e.target.value) })}
              />
              <div className="hint">Change particle size dynamically</div>
            </div>

            <div className="control-group">
              <label>Bloom Intensity: {state.bloomIntensity.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={state.bloomIntensity}
                onChange={(e) => onChange({ bloomIntensity: parseFloat(e.target.value) })}
              />
              <div className="hint">Adjust glow effect around particles</div>
            </div>

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={state.mouseInteraction || false}
                  onChange={(e) => onChange({ mouseInteraction: e.target.checked })}
                />
                Mouse Hover Effect
              </label>
              <div className="hint">Particles react to mouse position (hover effect)</div>
            </div>

            {state.mouseInteraction && (
              <div className="control-group">
                <label>Hover Strength: {(state.mouseForce || 1.5).toFixed(1)}</label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={state.mouseForce || 1.5}
                  onChange={(e) => onChange({ mouseForce: parseFloat(e.target.value) })}
                />
                <div className="hint">How much particles grow when mouse is near (smaller radius, precise effect)</div>
              </div>
            )}

            <div className="control-group">
              <button 
                className="action-btn"
                onClick={() => {
                  // Reset to default values
                  onChange({ 
                    particleSize: 0.15,
                    bloomIntensity: 1.0,
                    enableRotation: false,
                    mouseInteraction: false,
                    mouseForce: 1.5
                  });
                }}
              >
                Reset to Defaults
              </button>
              <div className="hint">Reset all controls to default values</div>
            </div>

            <div className="control-group">
              <div className="hint" style={{ color: '#22c55e', fontSize: '11px' }}>
                ✅ These controls work immediately without breaking particles
              </div>
            </div>

            <div className="control-group">
              <div className="hint" style={{ color: '#3b82f6', fontSize: '11px' }}>
                Try: Auto Rotation + larger particle size + higher bloom for cinematic effect
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="tab-content">
            {/* Export Actions */}
            <div className="control-group">
              <label>Export as PNG Textures</label>
              <button 
                className={`action-btn ${shouldDisableExport ? 'disabled' : 'primary'}`}
                onClick={onExportTextures}
                disabled={shouldDisableExport}
              >
                Export Textures (PNG)
              </button>
              {shouldDisableExport && (
                <div className="hint error">
                  {!particleCount ? 'No particles loaded' : 
                   isLoading ? 'Loading in progress' : 'Unknown issue'}
                </div>
              )}
              <div className="hint">Creates: position.png + color.png + metadata.json</div>
            </div>

            <div className="control-group">
              <label>Import from Textures</label>
              <button 
                className="action-btn secondary"
                onClick={onLoadFromTextures}
              >
                Load from Textures
              </button>
              <div className="hint">Select 3 files: position.png + color.png + metadata.json</div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};
