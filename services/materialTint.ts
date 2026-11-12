import { Color, Material } from 'three';

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
export function tintMaterial<T extends Material | Material[]>(source: T, color?: string, slots?: Record<number, string>): T {
  if (!color && !Object.keys(slots || {}).length) return source;
  const tint = (original: Material, index: number) => {
    const slotColor = slots?.[index] ?? color;
    // Clone untouched slots too, so the owning mesh can dispose all instances safely.
    const result = cloneMaterial(original);
    if (slotColor && 'color' in result && result.color instanceof Color) {
      result.color.set(slotColor);
    }
    return result;
  };
  return (Array.isArray(source) ? source.map(tint) : tint(source, 0)) as T;
}
