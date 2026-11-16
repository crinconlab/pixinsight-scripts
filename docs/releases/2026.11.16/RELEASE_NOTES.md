# C_Rinconlab 2026.11.16 — release candidate, not published

- **PolyMask 1.0.0:** graduates from Beta. Column-based polygon filling preserves the previous pixel-centre rule. End-to-end synthetic tests measured approximately 56–59% less time when geometry is rebuilt; unchanged cached adjustments are not claimed to gain 60%. Boundary Softness now has a ±10 px fine slider in 1 px steps. A startup release note includes “Don't show this again”, saved in a private Crinconlab settings namespace; the same information remains in Help.
- **RGB Ha Blend 0.15.7:** optional recommendation beside the input selectors: “Before running RGB Ha Blend, we recommend applying noise reduction with MLDenoise to both the RGB and Dual Band images.” Included in inline help and English manuals; Spanish/English landing-page copy updated. No MLDenoise automation, new recurring popup or blend-algorithm changes.
- **Focal Length Blend 0.11.13:** source unchanged. Renew its signature for the current PixInsight installation; native verification of the old signature returns false.
- **FITS-XISF Header Editor 1.0.1:** unchanged, retained signature verified.
- Astrometric Solution Copy remains excluded from distribution.

## Distribution preparation

The next suite ZIP is intended to be a GitHub Release asset under the pinned tag `suite-2026.11.16`. The XRI uses the officially documented package `serverURL` attribute, and a relative `fileName`. The registered repository URL remains unchanged. The active signed index still points to the existing 2026.11.12 package.

No script telemetry or tracking requests have been added. GitHub asset counters belong to the whole suite ZIP, not individual scripts.

## Pending clarification

A separate nuance/refinement in Ha/RGB blending has not yet been specified by Carlos. It is deliberately not inferred, designed or implemented in this candidate. Further code changes require fresh signatures and a rebuilt ZIP/index.
