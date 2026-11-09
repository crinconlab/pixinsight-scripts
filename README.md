# Crinconlab PixInsight Scripts

## Current development sources

| Script | Version |
| --- | --- |
| [FITS / XISF Header Editor](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) | 1.0.1 |
| [RGB Ha Blend](src/scripts/crinconlab/RGB_Ha_Blend.js) | 0.15.1 |
| [Focal Length Blend](src/scripts/crinconlab/Mezcla_Focales.js) | 0.11.10 |
| [PolyMask](src/scripts/crinconlab/PolyMask_EN.js) | **0.3.0-beta.12** |

PolyMask's latest development beta targets PixInsight 1.9.6. It provides multiple editable polygons and freehand regions, color and lightness selections, symmetric feathering, final blur, final inversion, project save/load and automatic preview refinement. Combining existing masks is currently disabled.

Keep the entire [script folder](src/scripts/crinconlab/) together, including both .jsh libraries, icons and manuals. Register this folder with **Script > Feature Scripts > Add**, avoiding duplicate registrations. PolyMask is unsigned and is not delivered through the automatic update repository.

[PolyMask manual](src/scripts/crinconlab/manuals/PolyMask_Advanced_Manual_EN.txt) · [Spanish tutorial notes](src/scripts/crinconlab/manuals/Tutorial_Notes_ES.txt) · [Validation evidence](src/scripts/crinconlab/validation)

Astrometric Solution Copy is **temporarily withdrawn from the active source collection** while its design is reconsidered. Its source, signature, icon and manual are preserved in [the archive](archive/astrometric-solution-copy-1.1). The source has a .js.disabled extension to prevent accidental menu registration.

## Existing signed distribution

The signed **2026.11.03** distribution remains a historical, separate build. It includes Astrometric Solution Copy and does not include this PolyMask beta. No new signatures, signed packages or automatic update indexes were produced for this development change. Existing installations are not automatically removed.

The previously published update URL is:

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

The [release.cpd.json](release.cpd.json) configuration describes that previous signed distribution, not the current development selection. It must be revised before the next signing/build.

[Signing and publication procedure](docs/publicacion.md) · [CPD review snapshot](https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review)

Copyright © Carlos Rincón 2026.
