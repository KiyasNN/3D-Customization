import { Color, Material } from 'three';

// Clone material instances, retaining shared texture resources and shader hooks.
// A selected part must never recolor another mesh sharing its imported material.
export function tintMaterial<T extends Material | Material[]>(source: T, color?: string, slots?: Record<number, string>): T {
  if (!color && !Object.keys(slots || {}).length) return source;
  const tint = (original: Material, index: number) => {
    const slotColor = slots?.[index] ?? color;
    // Clone untouched slots too, so the owning mesh can dispose all instances safely.
    const result = original.clone();
    result.onBeforeCompile = original.onBeforeCompile;
    result.customProgramCacheKey = original.customProgramCacheKey;
    if (slotColor && 'color' in result && result.color instanceof Color) {
      result.color.set(slotColor);
    }
    return result;
  };
  return (Array.isArray(source) ? source.map(tint) : tint(source, 0)) as T;
}
