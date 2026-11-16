# C_Rinconlab 2026.11.16 — signed release

- **PolyMask 1.0.0:** graduates from Beta. Column-based polygon filling preserves the previous pixel-centre rule. End-to-end synthetic tests measured approximately 56–59% less time when geometry is rebuilt; unchanged cached adjustments are not claimed to gain 60%. Boundary Softness now has a ±10 px fine slider in 1 px steps. A startup release note includes “Don't show this again”, saved in a private Crinconlab settings namespace; the same information remains in Help.
- **RGB Ha Blend 0.15.7:** optional recommendation beside the input selectors: “Before running RGB Ha Blend, we recommend applying noise reduction with MLDenoise to both the RGB and Dual Band images.” Included in inline help and English manuals; Spanish/English landing-page copy updated. No MLDenoise automation, new recurring popup or blend-algorithm changes.
- **Focal Length Blend 0.11.13:** source unchanged. Signature renewed and verified in the current PixInsight installation.
- **FITS-XISF Header Editor 1.0.1:** unchanged, retained signature verified.
- Astrometric Solution Copy remains excluded from distribution.

## Distribution

The signed suite ZIP is hosted at the existing raw repository for Check for Updates. The final signed index and all six source signatures have been verified in PixInsight 1.9.6. Native download succeeded (1 successful, 0 failed); installation is scheduled for exit, not yet observed. The same ZIP is also a manual GitHub Release asset under `suite-2026.11.16`. Its download counter covers manual Release downloads only, not raw updater downloads. No telemetry is added and the registered repository URL is unchanged.

## Pending clarification

A separate nuance/refinement in Ha/RGB blending has not yet been specified by Carlos. It is deliberately not inferred, designed or implemented in this candidate. Further code changes require fresh signatures and a rebuilt ZIP/index.
