# C_Rinconlab PixInsight Scripts

## Source candidate 2026.11.12 — awaiting signatures

| Script | Version |
| --- | --- |
| [FITS / XISF Header Editor](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) | 1.0.1 |
| [RGB Ha Blend](src/scripts/crinconlab/RGB_Ha_Blend.js) | 0.15.6 |
| [Focal Length Blend](src/scripts/crinconlab/Mezcla_Focales.js) | 0.11.13 |
| [PolyMask (Beta)](src/scripts/crinconlab/PolyMask_EN.js) | 0.3.0-beta.18 |

The main-branch source is a signing candidate. Sign **PolyMask_EN.js** and **PolyMaskProjects.jsh**; the other scripts are unchanged. Old signatures for the changed files have been removed. The automatic-update repository still serves the signed **2026.11.11 / PolyMask beta 17** package until the new signatures and index are ready.

[Candidate validation and signing notes](docs/releases/2026.11.12/signing-candidate.md)

## PolyMask improvements

Beta 18 keeps the Process Console visible during calculations and afterwards. Successful output displays **Mask created** (or a summary for separate masks). **OK** closes only the notice and returns to the editor; an attached mask identifies its target. Fourteen native checks and the real message-box/console UI check passed in PixInsight 1.9.6. Mask calculations and selection formulas are unchanged.


Editing a polygon changes its contour without recalculating the full mask. Click **Update Preview** when ready. Automatic color, lightness and final-blur previews remain reduced-resolution updates and do not accept pending polygon edits. Final-mask inversion reuses a current calculated mask and updates display bitmaps without rebuilding geometry or filters.

A small red **Preview out of date** notice appears only when manual refresh is required. It is hidden during automatic selection updates. Create Mask and Apply Mask always use the complete current settings at full resolution.

## Install or update

In PixInsight select **Resources > Updates > Manage Repositories > Add**:

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Then run **Resources > Updates > Check for Updates** and follow the installation/restart prompts. Avoid separately registering another local copy of the same script.

In the published 2026.11.11 package, the four scripts, both shared libraries and XML index are signed by **Carlos_Rincon_Astrophoto**. The signatures are verified with PixInsight 1.9.6. The developer identity must be present in the installed certified-developer database.

[Website](https://crinconlab.onrender.com/) · [English manuals](src/scripts/crinconlab/manuals) · [Signed package](repository/crinconlab-scripts-2026.11.11-5a3ad7742762a021.zip) · [Source signature verification](docs/releases/2026.11.11/signature-verification.json) · [Index verification](docs/releases/2026.11.11/index-verification.json) · [Package checks](docs/releases/2026.11.11/package-verification.json)

## Astrometric Solution Copy

Excluded from the current package and active sources. Its previous source remains in [the archive](archive/astrometric-solution-copy-1.1). The author's local copy is retained. Separately installed local copies are not managed by this release.

## Release records

The signing kit and source manifest record the frozen pre-signing state. Current release status is documented here and in the verification reports. Published signed package files were not edited after signing; the newer main-branch source candidate awaits its own signatures. Previous signed packages are retained for history; updates.xri selects this release.

[Publication procedure](docs/publicacion.md) · [Historical CPD review](https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review)

Copyright © Carlos Rincón 2026.
