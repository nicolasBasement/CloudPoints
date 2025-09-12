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
  invertYAxis: boolean;
  backgroundColor: string;
  
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
  shouldDisableExport
}) => {
  const [activeTab, setActiveTab] = useState<'particles' | 'data' | 'export'>('particles');

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

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={state.invertYAxis}
                  onChange={(e) => onChange({ invertYAxis: e.target.checked })}
                />
                Invert Y-Axis
              </label>
              <div className="hint">Flips particles vertically</div>
            </div>

            <div className="control-group">
              <label>Background Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                <input
                  type="color"
                  value={state.backgroundColor}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  style={{
                    width: '40px',
                    height: '30px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: state.backgroundColor
                  }}
                />
                <input
                  type="text"
                  value={state.backgroundColor}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  placeholder="#001122"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    backgroundColor: '#222',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <div className="hint">Click color box or enter hex code (e.g., #001122)</div>
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
