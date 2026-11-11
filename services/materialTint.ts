import { Color, Material } from 'three';

// Clone material instances, retaining shared texture resources and shader hooks.
// A selected part must never recolor another mesh sharing its imported material.
export function tintMaterial<T extends Material | Material[]>(source: T, color?: string): T {
  if (!color) return source;
  const tint = (original: Material) => {
    const result = original.clone();
    result.onBeforeCompile = original.onBeforeCompile;
    result.customProgramCacheKey = original.customProgramCacheKey;
    if ('color' in result && result.color instanceof Color) {
      result.color.set(color);
    }
    return result;
  };
  return (Array.isArray(source) ? source.map(tint) : tint(source)) as T;
}
