# Focal Length Blend 0.11.10 — inward mask transition

Concave polygon corners could show sharp black notches because the previous Gaussian blur was shifted by 0.5 and clipped against the original hard support. The effective mask now uses exact Euclidean distance to the nearest excluded support pixel, followed by `1-exp(-d*d/(2*sigma*sigma))`. The half-pixel boundary correction brings the ramp smoothly to zero at the edge. The same pipeline is used for preview and the final blend.

The support includes both the polygon and valid astrometric coverage. The exterior remains exactly black, including concave notches and coverage boundaries. Zero transition retains the hard support. The Transition value still controls the inward falloff scale, but the profile has changed: review the transition in Preview before creating a result. MLT extraction and blending coefficients are unchanged. Pan remains Shift + left-button drag.

## Native validation

PixInsight Core 1.9.6, macOS, synthetic images: 10 checks passed. The distance transform was compared against brute-force nearest-black-pixel distances on a concave polygon. Checks cover bounds, exterior support, continuity, sigma zero, increasing sigma, astrometric clipping, the shared preview path and the unchanged mask dialog. A 3000 x 2000 mask completed in 919 ms on the test machine; performance depends on hardware. These checks invoke native PJSR APIs and dialog callbacks, rather than simulating them in Node. They do not reproduce the user's particular image.

Run `tests/Test_Focal_Mask_Transition_PixInsight.js` from the repository checkout. It writes its JSON report and a synthetic mask PNG to the system temporary directory.

## Distribution

This commit updates source code and the local test package. The old adjacent `Mezcla_Focales.xsgn` signature is removed because it does not match the changed source. The already-signed 0.11.9 ZIP and `repository/updates.xri` are unchanged and still form a matching distribution. Version 0.11.10 must be signed again and packaged with a newly signed update index before it can be delivered through PixInsight's automatic updates. No private signing keys are used or committed.
