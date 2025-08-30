# CloudPoints - Particle Visualization

Una aplicación web interactiva para visualizar partículas en 3D usando TypeScript, React y React Three Fiber.

## Características

### 🎯 Dos Modos de Visualización

**Opción 1: Visualización Directa desde JSON**
- Carga directa de datos de partículas desde archivos JSON
- Renderizado en tiempo real de posiciones y colores

**Opción 2: Visualización basada en Texturas**
- Genera texturas que almacenan datos de partículas
- Posiciones codificadas en canales RGB de una textura
- Colores almacenados en una textura separada
- Optimizado para grandes cantidades de partículas

### 🎮 Controles Interactivos (UI Personalizada CSS) 

🎯 **SIN LEVA** - UI completamente personalizada con CSS moderno y glassmorphism

**🌟 Características de la Nueva UI:**
- **🎨 Glassmorphism Design**: Fondo translúcido con blur effects
- **📱 Responsive**: Se adapta a móvil y desktop
- **🗂️ Navegación por Tabs**: Visual / Data / Export organizados
- **⚡ Sin Problemas de Sincronización**: Eliminados los bugs de botones deshabilitados de Leva
- **🎯 Controles Intuitivos**: Sliders con valores en tiempo real, botones con iconos
- **🐛 Debug Integrado**: Panel debug deslizable con JSON completo
- **💫 Animaciones Fluidas**: Transiciones y hover effects modernos

#### 🎨 Tab Visual (Controles de Rendering)
- **💎 Direct** / **🖼️ Texture**: Botones para cambiar modo de visualización
- **Particle Size**: Slider con valor en tiempo real (0.01 - 2.0, default: 0.15)
- **⚪ Dots** / **🔵 Spheres**: Botones para tipo de partícula  
- **⭕ Circular** / **⬜ Square**: Forma de dots (solo visible cuando useDots = true)
- **Bloom Intensity**: Slider con preview (0-3)
- **Bloom Radius**: Slider con preview (0-1) 
- **🔄 Auto Rotation**: Checkbox para rotación automática de cámara
- **🎯 Show Axes**: Checkbox para gismo RGB (X=rojo, Y=verde, Z=azul)

#### 📊 Tab Data (Carga de Datos)
- **🎭 Load Houdini Data**: Botón principal para datos P/Cd 
- **📂 Load Custom JSON**: Carga archivos JSON personalizados
- **🧪 Test Simple Data**: 5 partículas de prueba RGB
- **🔄 Reset Loading State**: Aparece cuando `isLoading` se traba

#### 💾 Tab Export (Exportación de Texturas)
- **Export Format**: Botones PNG / JPG / EXR (*EXR-like precision)
- **💾 Export Textures**: Exporta con formato seleccionado (con validación de estado)  
- **📥 Load from Textures**: Carga desde 3 archivos (position + colors + metadata)
- **Hints dinámicos**: Mensajes de error claros cuando export está deshabilitado

#### Texture Export/Import ⭐ CON SELECTOR DE FORMATO
- **Export Format**: Selector PNG/JPG/EXR (EXR si está disponible)
- **Export Textures**: Exporta con el formato seleccionado (coordenadas corregidas)
- **Load from Textures**: Importa de texturas para verificación
- **✅ Fix**: Problema de escalado en ejes resuelto (inversión Y correcta)
- **🎯 NUEVO**: Anti-Grid Mapping - Preserva distribución orgánica de partículas

#### Debug ⭐ MEJORADO CON FIX DE LOADING
- **Debug Mode**: Activa modo debug con información detallada + estado del botón export
- **Reset Loading State**: 🔄 Botón para arreglar estados de carga trabados
- **Test Simple Data**: 5 partículas de prueba con colores RGB puros
- **✅ Loading Fix**: Botón export ya no se queda deshabilitado por isLoading trabado

### 🔷 **Formas de Dots Disponibles**

#### Circular (Default)
- Gradiente radial suave desde el centro
- Bordes difuminados para efecto natural
- Mejor para simulaciones orgánicas o fluidas

#### Square  
- Gradiente lineal diagonal
- Bordes más definidos pero con transición suave
- Ideal para data visualization o efectos técnicos

**Nota**: La forma se aplica a todos los modos (JSON, Texture, Debug) de manera consistente.

### ✨ Efectos Visuales

- Efectos de bloom y glow post-procesamiento
- Rotación automática de la cámara
- Controles de órbita (pan, zoom, rotate)
- Fondo con gradiente radial
- Estadísticas de rendimiento en tiempo real

## Estructura del Proyecto

```
src/
├── components/
│   ├── ParticleSystem.tsx          # Visualización directa (JSON/Houdini)
│   ├── TextureParticleSystem.tsx   # Visualización basada en texturas internas
│   └── DebugParticleSystem.tsx     # Sistema de debug para diagnosticar problemas
├── hooks/
│   └── useParticleData.ts          # Hook para gestión de datos completa
├── types/
│   └── particle.ts                 # Tipos TypeScript (incluye Houdini)
├── utils/
│   ├── houdiniParser.ts            # Parser y optimizador para formato Houdini
│   ├── textureGenerator.ts         # Generador de texturas internas y procedurales
│   ├── textureExporter.ts          # Exportador de texturas PNG básico
│   ├── exrExporter.ts              ⭐ # Exportador EXR-like Float32 (ALTA PRECISIÓN)
│   └── textureLoader.ts            ⭐ # Importador de texturas para verificación
├── App.tsx                         # Componente principal con UI personalizada CSS
└── main.tsx                        # Punto de entrada

public/
├── point_data.json                 # Datos reales de Houdini (1.2M partículas)
└── particles-example.json         # Archivo de ejemplo interno
```

## Instalación y Uso

### Prerrequisitos
- Node.js 16 o superior
- npm o yarn

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

### Uso

1. **Abrir la aplicación**: La aplicación se ejecutará en `http://localhost:5173`

2. **Cargar Datos**:
   - **"Load Houdini Data"**: Carga tu archivo `point_data.json` de Houdini (1.2M → optimizado a 50K)
   - **"Load Custom JSON"**: Carga cualquier archivo JSON con datos de partículas
   - **"Test Simple Data"**: 5 partículas de prueba para debug rápido

### 🎨 **Flujo de Trabajo: Exportación e Importación de Texturas**

#### Exportación (Partículas → Texturas)
1. **Cargar datos**: Usa "Load Houdini Data" o "Load Custom JSON"
2. **Seleccionar formato**: Elige PNG, JPG, o EXR en el dropdown
3. **Exportar texturas**: Clic en "Export Textures"
4. **Descargas automáticas**: Se descargan 3 archivos:
   - `filename_positions_[FORMAT].png/jpg` - Posiciones normalizadas
   - `filename_colors.png/jpg` - Colores RGB  
   - `filename_metadata_[FORMAT].json` - Metadata con información de precisión

##### 🎯 **Formatos Disponibles:**
- **PNG**: 8-bit RGBA, máxima compatibilidad
- **JPG**: 8-bit RGB comprimido, archivos más pequeños
- **EXR**: Half Float (16-bit) si está disponible, máxima precisión

#### Importación (Texturas → Verificación)
1. **Cargar texturas**: Clic en "Load from Textures"
2. **⚠️ IMPORTANTE**: Selecciona LOS 3 ARCHIVOS:
   - `filename_positions_FORMAT.png` (posiciones)
   - `filename_colors.png` (colores)  
   - `filename_metadata_FORMAT.json` (📋 **CRÍTICO** - sin esto = escalado incorrecto)
3. **Verificación automática**: La app reconstruye las partículas desde las texturas
4. **✅ Coordenadas corregidas**: Sin problemas de escalado (inversión Y arreglada)
5. **Comparación**: Verifica visualmente que coincidan con los datos originales

> **🚨 AVISO**: Si no seleccionas el archivo **metadata JSON**, verás bounds incorrectos `[-20,-20,-20] to [20,20,20]` y la forma se verá comprimida/incorrecta.

#### Estructura de las Texturas EXR

##### 🔥 **Textura de Posiciones con Anti-Grid**
- **Formato**: PNG con mapeo aleatorio determinístico 
- **Precisión**: 8-bit RGB con coordenadas normalizadas 0-1
- **🎯 Anti-Grid Mapping**: 
  - **Problema resuelto**: Las texturas exportadas mantenían patrón de grid artificial
  - **Solución**: Mapeo shuffle determinista que preserva distribución orgánica original
  - **Resultado**: Las partículas cargadas desde texturas mantienen aspecto natural de Houdini

##### 🎨 **Textura de Colores (Estándar PNG)**
- **Formato**: PNG estándar con canales RGB
- **Precisión**: 8 bits por canal (suficiente para colores 0-1)

##### 📐 **Dimensiones y Rendimiento**
- **Dimensiones**: Cuadrado potencia de 2 (ej: 512x512 para ~250K partículas)
- **Archivo posiciones**: ~3x más grande pero infinitamente más preciso
- **Compatibilidad**: Todos los navegadores (no requiere soporte EXR nativo)

3. **Controles**:
   - **Visualization Mode**: Cambiar entre 'json' y 'texture'
   - **Particle Size**: Ajustar tamaño (0.01 - 2.0, por defecto 0.15)
   - **Use Dots**: Alternar entre puntos y esferas
   - **Bloom**: Controlar efectos de resplandor

4. **Navegación 3D**:
   - **Click y arrastrar**: Rotar cámara
   - **Rueda del ratón**: Zoom
   - **Click derecho y arrastrar**: Pan
   - **Gismo RGB**: X=Rojo, Y=Verde, Z=Azul para orientación

## Formatos de Datos Soportados

### 🎨 Formato Houdini (Recomendado)

La aplicación ahora soporta nativamente el formato JSON exportado por Houdini:

```json
[
    {
        "P": [2.049, -2.642, 0.584],
        "Cd": [0.020, 0.014, 0.012]
    },
    {
        "P": [1.367, -1.331, 0.596],
        "Cd": [0.083, 0.108, 0.125]
    }
]
```

- `P`: Posición de la partícula [x, y, z]
- `Cd`: Color de la partícula [r, g, b] (valores 0-1)

### 📊 Optimización Automática
- Archivos grandes (>100K partículas) se optimizan automáticamente
- Sub-muestreo inteligente para mantener rendimiento
- Indicador visual cuando se aplica optimización

### Formato Interno (Alternativo)

```json
{
  "metadata": {
    "count": 1000,
    "bounds": {
      "min": [-10, -10, -10],
      "max": [10, 10, 10]
    },
    "created": "2024-01-01T00:00:00Z"
  },
  "particles": [
    {
      "id": "particle_0",
      "position": [0, 0, 0],
      "color": [1, 0.5, 0.2],
      "size": 1.0
    }
  ]
}
```

### Campos Requeridos por Partícula
- `id`: Identificador único (string)
- `position`: Array de 3 números [x, y, z]
- `color`: Array de 3 números [r, g, b] (valores 0-1)
- `size`: Número opcional (multiplicador de tamaño)

## Tecnologías Utilizadas

- **React 18**: Framework de UI
- **TypeScript**: Tipado estático
- **React Three Fiber**: React renderer para Three.js
- **@react-three/drei**: Utilidades para R3F
- **@react-three/postprocessing**: Efectos post-procesamiento
- **CSS Personalizado**: UI moderna sin dependencias externas de controles
- **Three.js**: Motor 3D
- **Vite**: Build tool y dev server

## ⚠️ Troubleshooting

### 🚫 Botón "Export Textures" Deshabilitado

**Síntomas**: El botón se ve gris y no se puede hacer clic

**Diagnóstico**: Mira la esquina superior izquierda de la app:
- `Export: DISABLED ❌` 
- `Reasons: Loading NoData Empty`

**Soluciones**:
1. **Loading**: Clic en "Reset Loading State" en panel Debug
2. **NoData**: Usa "Load Houdini Data" o "Load Custom JSON" 
3. **Empty**: El archivo JSON no tiene partículas válidas
4. **UI Responsive**: La nueva UI CSS es completamente responsive y no tiene problemas de sincronización

### 🎯 Escalado Incorrecto al Cargar Texturas

**Síntomas**: Las partículas se ven comprimidas o con bounds `[-20,-20,-20] to [20,20,20]`

**Causa**: No seleccionaste el archivo metadata JSON

**Solución**: En "Load from Textures", selecciona **LOS 3 ARCHIVOS**:
- `filename_positions_FORMAT.png`
- `filename_colors.png` 
- **`filename_metadata_FORMAT.json`** ← **CRÍTICO**

### 🔍 Debug Info

- Activa "Debug Mode" para ver información detallada
- Abre consola del navegador (F12) para logs detallados
- El debug siempre muestra estado del botón export

## Rendimiento

### 🚀 Optimizaciones para Archivos de Houdini
- **Detección Automática**: Reconoce formato Houdini vs interno automáticamente
- **Streaming**: Manejo eficiente de archivos grandes (>10MB)
- **Sub-muestreo Inteligente**: Reduce automáticamente partículas para mantener 60 FPS
- **Indicadores Visuales**: Muestra cuando se aplican optimizaciones

### Modos de Renderizado
- **Opción JSON**: Optimal para hasta ~50,000 partículas (optimizado)
- **Opción Texture**: Optimal para 50,000+ partículas
- **Dots vs Spheres**: Los dots son más eficientes para grandes cantidades
- **Bloom Effect**: Puede impactar rendimiento con muchas partículas

### Recomendaciones
- Para archivos de Houdini grandes: Usar modo 'texture' + 'dots' + optimización automática
- Datasets <10K: Cualquier configuración funciona bien
- Datasets >100K: Se aplicará sub-muestreo automático

## Personalización

### Agregar Nuevos Efectos
Modificar `src/App.tsx` y agregar más efectos en el `EffectComposer`.

### Cambiar Shaders
Los shaders están definidos en `ParticleSystem.tsx` y `TextureParticleSystem.tsx`.

### Nuevos Controles
Agregar controles en el componente `CustomUI` y el estado `UIState` en `App.tsx`.
