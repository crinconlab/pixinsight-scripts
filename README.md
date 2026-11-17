# C_Rinconlab PixInsight Scripts

## Signed release 2026.11.17 — PixInsight 1.9.6

| Script | Version |
| --- | --- |
| [FITS / XISF Header Editor](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) | 1.0.1 |
| [RGB Ha Blend](src/scripts/crinconlab/RGB_Ha_Blend.js) | 0.15.7 |
| [Focal Length Blend](src/scripts/crinconlab/Mezcla_Focales.js) | 0.11.13 |
| [PolyMask](src/scripts/crinconlab/PolyMask_EN.js) | 1.0.1 |

Release **2026.11.17**, including **PolyMask 1.0.1**, is signed and published. All six source/code signatures and the XML update-index signature have been verified in PixInsight 1.9.6.

[Release validation and distribution notes](docs/releases/2026.11.17/SIGNING_STATUS.md)

## PolyMask improvements

PolyMask 1.0.1 fixes an automatic final-blur preview error when crossing very small blur values. Twenty-three native regression checks passed; final output calculations are unchanged.


PolyMask 1.0.0 uses column filling for faster polygon construction and adds a one-pixel fine boundary-softness control. RGB Ha Blend 0.15.7 adds an optional MLDenoise preparation recommendation; its blending algorithm is unchanged.


Beta 18 keeps the Process Console visible during calculations and afterwards. Successful output displays **Mask created** (or a summary for separate masks). **OK** closes only the notice and returns to the editor; an attached mask identifies its target. Fourteen native checks and the real message-box/console UI check passed in PixInsight 1.9.6. Mask calculations and selection formulas are unchanged.


Editing a polygon changes its contour without recalculating the full mask. Click **Update Preview** when ready. Automatic color, lightness and final-blur previews remain reduced-resolution updates and do not accept pending polygon edits. Final-mask inversion reuses a current calculated mask and updates display bitmaps without rebuilding geometry or filters.

A small red **Preview out of date** notice appears only when manual refresh is required. It is hidden during automatic selection updates. Create Mask and Apply Mask always use the complete current settings at full resolution.

## Install or update

In PixInsight select **Resources > Updates > Manage Repositories > Add**:

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Then run **Resources > Updates > Check for Updates** and follow the installation/restart prompts. Avoid separately registering another local copy of the same script.

In the published 2026.11.17 package, the four scripts, both shared libraries and XML index are signed by **Carlos_Rincon_Astrophoto**. The signatures are verified with PixInsight 1.9.6. The developer identity must be present in the installed certified-developer database.

[Website](https://crinconlab.onrender.com/) · [English manuals](src/scripts/crinconlab/manuals) · [Signed package](repository/crinconlab-scripts-2026.11.17-7ef01fb69817ce97.zip) · [Source signature verification](docs/releases/2026.11.17/source-signatures.json) · [Index verification](docs/releases/2026.11.17/index-signature.json) · [Package checks](docs/releases/2026.11.17/package-verification.json)

## Astrometric Solution Copy

Excluded from the current package and active sources. Its previous source remains in [the archive](archive/astrometric-solution-copy-1.1). The author's local copy is retained. Separately installed local copies are not managed by this release.

## Release records

The signing kit and source manifest record the frozen pre-signing state. Current release status is documented here and in the verification reports. Published signed package files were not edited after signing; the current main-branch source signatures are also verified. Previous signed packages are retained for history; updates.xri selects this release.

[Publication procedure](docs/publicacion.md) · [Historical CPD review](https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review)

Copyright © Carlos Rincón 2026.
