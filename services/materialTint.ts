import { Color, Material, ShaderChunk } from 'three';

function cloneMaterial(original: Material): Material {
  const clone = original.clone();
  clone.onBeforeCompile = original.onBeforeCompile;
  clone.customProgramCacheKey = original.customProgramCacheKey;
  return clone;
}

export function configureImportedMaterial<T extends Material | Material[]>(source: T, roughness?: number, wireframe = false): T {
  const configure = (original: Material) => {
    const result = cloneMaterial(original);
    if ('wireframe' in result) result.wireframe = wireframe;
    if (roughness !== undefined && 'roughness' in result) {
      result.roughness = Math.max(0, Math.min(1, roughness));
    }
    return result;
  };
  return (Array.isArray(source) ? source.map(configure) : configure(source)) as T;
}

// Clone material instances, retaining shared texture resources and shader hooks.
// A selected part must never recolor another mesh sharing its imported material.
export function tintMaterial<T extends Material | Material[]>(source: T, color?: string, slots?: Record<number, string>, replaceBaseColorMap = false): T {
  if (!color && !Object.keys(slots || {}).length) return source;
  const tint = (original: Material, index: number) => {
    const slotColor = slots?.[index] ?? color;
    // Clone untouched slots too, so the owning mesh can dispose all instances safely.
    const result = cloneMaterial(original);
    if (slotColor && 'color' in result && result.color instanceof Color) {
      result.color.set(slotColor);
      if (replaceBaseColorMap) {
        // Imported albedo and vertex colors must not darken the selected color.
        if ('vertexColors' in result) result.vertexColors = false;
        if ('map' in result && result.map) {
          if (result.transparent || result.alphaTest > 0 || result.alphaHash) {
            // GLB base-color maps may also carry cutout alpha. Keep that channel
            // without multiplying the chosen diffuse RGB by the original map.
            const beforeCompile = result.onBeforeCompile;
            const sourceCacheKey = original.customProgramCacheKey();
            result.onBeforeCompile = function(shader, renderer) {
              beforeCompile.call(this, shader, renderer);
              shader.fragmentShader = shader.fragmentShader
                .replace('#include <map_fragment>', ShaderChunk.map_fragment)
                .replace('diffuseColor *= sampledDiffuseColor;', 'diffuseColor.a *= sampledDiffuseColor.a;');
            };
            result.customProgramCacheKey = () => sourceCacheKey + '|solid-base-color-alpha';
          } else {
            result.map = null;
          }
        }
      }
    }
    return result;
  };
  return (Array.isArray(source) ? source.map(tint) : tint(source, 0)) as T;
}
