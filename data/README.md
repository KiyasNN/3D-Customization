# CSI ColorWall palette

Source: Color Solutions International's public digital swatch download page:
https://csicolors.com/color-communication-tools/downloadable-digital-media/

Original ASE download: https://csicolors.wpengine.com/wp-content/uploads/2021/ColorWall.ase

Retrieved 2026-11-11. This is the published 2021 download, not a claim to the latest complete CSI catalog.
CSI/ColorWall names and source data belong to Color Solutions International.

The source contains 3,709 named Lab swatches. `csi-colorwall.json` preserves their
original codes and Lab coordinates, with sRGB HEX approximations for screen display
(D50 Lab → XYZ D50 → Bradford D65 → sRGB; out-of-gamut channels clipped).
These are digital previews, not physical certified color standards.

Rebuild with `node scripts/build-csi-palette.mjs`.
