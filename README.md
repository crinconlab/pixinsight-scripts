# C_Rinconlab PixInsight Scripts

## Release candidate 2026.11.10 — ready for signing

| Script | Version |
| --- | --- |
| [FITS / XISF Header Editor](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) | 1.0.1 |
| [RGB Ha Blend](src/scripts/crinconlab/RGB_Ha_Blend.js) | 0.15.6 |
| [Focal Length Blend](src/scripts/crinconlab/Mezcla_Focales.js) | 0.11.13 |
| [PolyMask (Beta)](src/scripts/crinconlab/PolyMask_EN.js) | 0.3.0-beta.14 |

These sources are frozen for signing, targeting PixInsight 1.9.6. PolyMask includes multiple polygons/freehand drawing, color and lightness selection, symmetric feathering, project save/load and cached full-resolution preview refinement. Region-area inversion is in Shape; final-mask inversion is only in Output. Combining existing masks is temporarily disabled.

[Download the unsigned signing kit](https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/releases/pending/C_Rinconlab_2026.11.10_Para_Firmar.zip) · [Signing instructions (Spanish)](docs/releases/2026.11.10/LEEME_FIRMA_ES.txt) · [Version manifest](src/scripts/crinconlab/manifest.json) · [English manuals](src/scripts/crinconlab/manuals)

The kit contains four scripts and two shared libraries, icons, manuals, validation reports and the build configuration. No private keys or signatures are included. Source checksums are supplied. It is not yet an automatic-update package.

Astrometric Solution Copy is excluded from this candidate and the active source folder. Its code remains in [the archive](archive/astrometric-solution-copy-1.1), and the author's local copy is retained.

## Signing and publication

Sign the four .js entry points and both .jsh libraries on the author's PixInsight installation. Return the six matching .xsgn files without changing the sources. Then build the update ZIP, sign its updates.xri XML index, verify the signatures and publish the ZIP/index together. See [publication procedure](docs/publicacion.md).

The [release.cpd.json](release.cpd.json) configuration now targets 2026.11.10 and excludes Astrometric Solution Copy. Its required signatures are intentionally absent until the author signs this candidate. Old public signatures have been archived to prevent accidental pairing with changed sources.

## Existing automatic repository

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

This address currently serves the signed 2026.11.03 release, which still includes Astrometric Solution Copy and does not include PolyMask. The new release is not active until its signed index is published. No old signed ZIP or index has been modified.

[Website](https://crinconlab.onrender.com/) · [Historical CPD review snapshot](https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review)

Copyright © Carlos Rincón 2026.
