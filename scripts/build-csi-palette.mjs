import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Adobe ASE Lab uses D50; adapt XYZ to D65 before encoding screen sRGB.
export function labToHex([l, a, b]) {
  const fy = (l + 16) / 116;
  const inverse = v => v > 6 / 29 ? v ** 3 : 3 * (6 / 29) ** 2 * (v - 4 / 29);
  const xyz50 = [inverse(fy + a / 500) * 0.96422, inverse(fy), inverse(fy - b / 200) * 0.82521];
  const multiply = (matrix, vector) => matrix.map(row => row.reduce((sum, v, i) => sum + v * vector[i], 0));
  const xyz65 = multiply([
    [0.9555766, -0.0230393, 0.0631636],
    [-0.0282895, 1.0099416, 0.0210077],
    [0.0122982, -0.0204830, 1.3299098],
  ], xyz50);
  const linear = multiply([
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660, 1.8760108, 0.0415560],
    [0.0556434, -0.2040259, 1.0572252],
  ], xyz65);
  return '#' + linear.map(v => {
    const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, encoded)) * 255).toString(16).padStart(2, '0');
  }).join('');
}

export function parseAse(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'ASEF') throw Error('Invalid ASE header');
  const colors = [];
  let offset = 12;
  for (let i = 0; i < buffer.readUInt32BE(8); i++) {
    const type = buffer.readUInt16BE(offset);
    const end = offset + 6 + buffer.readUInt32BE(offset + 2);
    offset += 6;
    if (end > buffer.length) throw Error('Truncated ASE block');
    if (type === 1) {
      const length = buffer.readUInt16BE(offset);
      offset += 2;
      let code = '';
      for (let n = 0; n < length - 1; n++) code += String.fromCharCode(buffer.readUInt16BE(offset + n * 2));
      offset += length * 2;
      const mode = buffer.toString('ascii', offset, offset + 4);
      offset += 4;
      if (mode !== 'LAB ') throw Error(`Unsupported CSI color space: ${mode}`);
      const lab = [buffer.readFloatBE(offset) * 100, buffer.readFloatBE(offset + 4), buffer.readFloatBE(offset + 8)];
      if (!lab.every(Number.isFinite)) throw Error('Invalid Lab color');
      colors.push({ code, hex: labToHex(lab), lab });
    }
    offset = end;
  }
  return colors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const colors = parseAse(fs.readFileSync(new URL('../data/ColorWall.ase', import.meta.url)));
  fs.writeFileSync(new URL('../data/csi-colorwall.json', import.meta.url), JSON.stringify(colors));
  console.log(`Generated ${colors.length} CSI ColorWall screen swatches`);
}
