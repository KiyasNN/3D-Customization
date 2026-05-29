
import { Material, ShoePart } from './types';

export const SHOE_PARTS: ShoePart[] = [
  { id: 'sole', name: 'Sole', meshName: 'Sole_Mesh' },
  { id: 'midsole', name: 'Midsole', meshName: 'Midsole_Mesh' },
  { id: 'upper', name: 'Upper Body', meshName: 'Upper_Mesh' },
  { id: 'laces', name: 'Laces', meshName: 'Laces_Mesh' },
  { id: 'tongue', name: 'Tongue', meshName: 'Tongue_Mesh' },
  { id: 'heel', name: 'Heel Patch', meshName: 'Heel_Mesh' },
  { id: 'logo', name: 'Logo Swoosh', meshName: 'Logo_Mesh' },
];

export const MATERIAL_PRESETS: Material[] = [
  { id: 'preset-leather-worn', name: 'Worn Leather', color: '#5D4037', roughness: 0.6, metalness: 0.0, type: 'leather' },
  { id: 'preset-leather-black', name: 'Premium Black', color: '#121212', roughness: 0.35, metalness: 0.1, type: 'leather' },
  { id: 'preset-metal-scuffed', name: 'Scuffed Aluminum', color: '#9ca3af', roughness: 0.5, metalness: 0.9, type: 'metallic' },
  { id: 'preset-metal-gold', name: 'Polished Gold', color: '#FFD700', roughness: 0.15, metalness: 1.0, type: 'metallic' },
  { id: 'preset-metal-copper', name: 'Brushed Copper', color: '#B87333', roughness: 0.6, metalness: 0.9, type: 'metallic' },
  { id: 'preset-plastic-glossy', name: 'Glossy Plastic Red', color: '#DC2626', roughness: 0.05, metalness: 0.0, type: 'fabric' },
  { id: 'preset-plastic-matte', name: 'Matte Plastic', color: '#374151', roughness: 0.9, metalness: 0.0, type: 'fabric' },
  { id: 'preset-rubber-tire', name: 'Tire Rubber', color: '#171717', roughness: 0.85, metalness: 0.0, type: 'rubber' },
  { id: 'preset-fabric-denim', name: 'Denim Blue', color: '#1e3a8a', roughness: 0.7, metalness: 0.0, type: 'fabric' },
  { id: 'preset-fabric-satin', name: 'Satin Purple', color: '#7c3aed', roughness: 0.4, metalness: 0.2, type: 'fabric' },
  { id: 'preset-carbon', name: 'Carbon Fiber', color: '#111111', roughness: 0.3, metalness: 0.5, type: 'metallic', textureUrl: 'https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf9d32ff9d4da268484e93059/hdri/carbon_normal.jpg' },
  { id: 'preset-concrete', name: 'Concrete', color: '#9ca3af', roughness: 0.95, metalness: 0.0, type: 'fabric' }
];

export const INITIAL_MATERIALS: Material[] = [
  { id: 'mat-leather-white', name: 'Clean Leather', color: '#f5f5f5', roughness: 0.4, metalness: 0.0, type: 'leather' },
  { id: 'mat-leather-black', name: 'Midnight Leather', color: '#1a1a1a', roughness: 0.3, metalness: 0.1, type: 'leather' },
  { id: 'mat-fabric-red', name: 'Sport Mesh Red', color: '#ef4444', roughness: 0.8, metalness: 0.0, type: 'fabric' },
  { id: 'mat-fabric-blue', name: 'Royal Knit', color: '#3b82f6', roughness: 0.9, metalness: 0.0, type: 'fabric' },
  { id: 'mat-rubber-gum', name: 'Gum Rubber', color: '#d97706', roughness: 0.6, metalness: 0.0, type: 'rubber' },
  { id: 'mat-gold', name: 'Metallic Gold', color: '#fbbf24', roughness: 0.2, metalness: 0.8, type: 'metallic' },
  { id: 'mat-camo', name: 'Forest Camo', color: '#575c44', roughness: 0.7, metalness: 0.0, type: 'fabric', textureUrl: 'https://picsum.photos/id/103/512/512' },
  { id: 'mat-denim', name: 'Washed Denim', color: '#607d8b', roughness: 0.6, metalness: 0.0, type: 'fabric', textureUrl: 'https://picsum.photos/id/400/512/512' },
  // PBR Example (Simulated with standard textures for demo)
  { 
    id: 'mat-carbon', 
    name: 'Carbon Fiber', 
    color: '#222222', 
    roughness: 0.4, 
    metalness: 0.3, 
    type: 'metallic',
    textureUrl: 'https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf9d32ff9d4da268484e93059/hdri/carbon_normal.jpg', // Using a generic pattern for demo
    normalMapUrl: 'https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf9d32ff9d4da268484e93059/hdri/carbon_normal.jpg'
  }
];

export const INITIAL_STATE = {
  sole: 'mat-leather-white',
  midsole: 'mat-leather-white',
  upper: 'mat-leather-white',
  laces: 'mat-leather-white',
  tongue: 'mat-leather-white',
  heel: 'mat-leather-white',
  logo: 'mat-leather-white',
};

// Default all visible
export const INITIAL_VISIBILITY: Record<string, boolean> = {
  sole: true,
  midsole: true,
  upper: true,
  laces: true,
  tongue: true,
  heel: true,
  logo: true,
};
