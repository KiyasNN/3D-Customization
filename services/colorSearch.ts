// ColorWall ASE supplies codes, not descriptive names. These searchable families
// describe the screen swatch; they are not official CSI shade names.
export function colorFamilyTags(hex: string): string[] {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return [];
  const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const chroma = max - min;
  const saturation = max === 0 ? 0 : chroma / max;
  const lightness = (max + min) / 2;
  const tags: string[] = [];
  if (max < 0.18) tags.push('black', 'hitam');
  if (saturation < 0.12 || chroma < 0.035) {
    if (max > 0.9) tags.push('white', 'putih');
    else if (max >= 0.18) tags.push('gray', 'grey', 'abu', 'abu-abu', 'silver');
    return tags;
  }
  let hue = max === r ? ((g - b) / chroma) % 6
    : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 20 || hue >= 345) tags.push('red', 'merah');
  if (hue >= 15 && hue < 50) tags.push('orange', 'oranye', 'jingga');
  if (hue >= 45 && hue < 75) tags.push('yellow', 'kuning', 'gold', 'emas');
  if (hue >= 70 && hue < 175) tags.push('green', 'hijau');
  if (hue >= 170 && hue < 205) tags.push('cyan', 'aqua', 'turquoise', 'toska', 'teal');
  if (hue >= 190 && hue < 255) tags.push('blue', 'biru');
  if (hue >= 260 && hue < 315) tags.push('purple', 'violet', 'ungu');
  if (hue >= 300 && hue < 350) tags.push('magenta', 'fuchsia');
  if ((hue >= 300 || hue < 20) && lightness > 0.55) tags.push('pink', 'merah muda');
  if (hue >= 10 && hue < 65 && max < 0.75) tags.push('brown', 'coklat', 'cokelat', 'tan');
  if (hue >= 20 && hue < 75 && saturation < 0.5 && max >= 0.55) tags.push('beige', 'cream', 'krem', 'ivory', 'tan');
  if (hue >= 200 && hue < 255 && max < 0.55) tags.push('navy', 'dongker');
  if (lightness > 0.7) tags.push('light', 'pastel', 'muda', 'terang');
  if (lightness < 0.35) tags.push('dark', 'tua', 'gelap');
  return tags;
}

export function matchesColorSearch(color: { hex: string; name: string; code?: string }, query: string): boolean {
  const search = query.trim().toLowerCase();
  if (!search) return true;
  const text = [color.name, color.code || '', color.hex, ...colorFamilyTags(color.hex)].join(' ').toLowerCase();
  return search.split(/\s+/).every(word => text.includes(word));
}
