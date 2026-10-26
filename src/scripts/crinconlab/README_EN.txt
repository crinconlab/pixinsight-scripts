CRINCONLAB — COMPLETE LOCAL SCRIPT COLLECTION
Copyright © Carlos Rincón 2026

Five scripts, five SVG icons in icons/, and user guides in manuals/.

INSTALLATION
1. Extract this complete folder to a permanent location.
2. Replace your previous collection folder; keep personal files separately.
3. In PixInsight, open Script > Feature Scripts and remove obsolete entries
   pointing to other copies. Add the folder containing the five .js files.
4. Click Done. Launch scripts from Script > Crinconlab.
Keep icons beside the scripts in their icons subfolder.

SCRIPTS
- FITS-XISF Header Editor
- RGB DualBand Solver SPCC 0.14
- Astrometric Solution Copy
- Focal Length Blend 0.11.4 (filename: Mezcla_Focales.js)

NEW IN FOCAL LENGTH BLEND 0.11.4
Download Sample Images is enabled. It displays copyright/usage conditions first.
Agree and Download asks for a destination and downloads the ZIP directly. Cancel starts
no download. The sample license also covers blended and otherwise processed
results. Samples are exclusively for personal testing without redistribution
or publication unless Carlos Rincón gives prior permission.

The sample ZIP is separate from this small script bundle and contains:
- With_StarX: Short_Focal_Length.xisf and Long_Focal_Length.xisf.
- Without_StarX: matching starless files with verified astrometry.
- Image_Solver_Settings_EN.txt, README_EN.txt, LICENSE.txt and SHA256SUMS.txt.
Both Desktop originals are unchanged. The with-stars copies retain the original
pixel/data attachments. Starless copies intentionally remove the stars while
preserving the image grid and astrometric solution. Authorship and conditions
are included in the XISF metadata, without adding a visible watermark.

Sample release:
https://github.com/crinconlab/pixinsight-scripts/releases/tag/sample-images-v1.0

IMAGE SOLVER
Use the effective sampling values documented for the reduced sample files:
Short focal length: 192.9183 mm; 8.623 micrometres; 9.219559 arcsec/pixel.
Long focal length: 1244.9808 mm; 15.133 micrometres; 2.507191 arcsec/pixel.
See manuals/Sample_Image_Solver_Settings_EN.txt for centre coordinates and
recovery steps. Do not substitute the camera's physical sensor pixel pitch.

CURRENT BLEND WORKFLOW
Base = short focal length; Detail = long focal length. Output uses the base grid.
Relative detail gain defaults to 0.50 (50%). Intensity remains 35%.
Update Preview recalculates processing changes. Create Blended Image creates
with one click when the whole image is visible, otherwise a zoom warning offers
Fit Image, Create Anyway or Cancel. Optional stars recombination is retained.

MASK EDITOR
Wheel: synchronized pointer-centred zoom. Shift + left drag: pan both panels.
Normal left drag: move a vertex. Fit Image, 100%, + and - control navigation.
Navigation never resizes or changes mask pixels or transition strength.
Session-created masks stay hidden and close on replacement or exit.
Externally supplied masks remain untouched.

VALIDATION
55 automated checks passed. Native PixInsight 1.9.5 tests verified both starless
sample generations and preserved astrometry, plus the consent dialog and
cancel/agree download paths with an intercepted browser opener. Published asset
digests match local files. Native dialogs rendered and inspected; physical mouse
clicks and actual browser launch from PixInsight are not automated.
Fusion and mask-pixel calculations are unchanged from 0.10.1.

0.11.4: Blue task text and stage-based percentage bars in geometry preparation, mask creation and comparison updates. Native processes may hold the percentage while busy. Fusion algorithms unchanged.

HEADER EDITOR: The editor stays open during every batch. Blue task text shows the current file. The progress bar counts processed files, including skipped files and errors. Counters distinguish Updated, Remaining, Simulated, Skipped and Errors. Controls are locked while processing; Stop after current file stops safely between files. After completion, prepare another batch in the same window. Close exits when idle.

Focal Length Blend 0.11.4: Removed Full canvas from mask editing. Back returns to setup without accepting the current edit, retaining geometry and any previous mask. All four Feature Scripts descriptions include Copyright © Carlos Rincón 2026.

RGB DUAL BAND 0.14
Register Dual Band onto RGB using stars (default), or reproject existing astrometry for solved/starless inputs. Automatically crop both copies to their common valid rectangle. The result retains the RGB astrometry shifted and validated for the crop. Original files and views are unchanged. Already registered mode skips registration/crop only when explicitly selected.
Blue task text and a stage-percentage bar show preparation, registration, crop, blend and SPCC. Registration is reused for intensity changes. Native tests cover real star registration and coordinate reprojection; calibration is injected in automated tests, so validate real SPCC with your installed Gaia catalog.

QUIET OPERATION
All four scripts stop explicitly opening the process console. They hide it at their previous show points; RGB also hides it at stage boundaries. Native processes may still reveal it or write technical messages. These messages remain available for troubleshooting.

HEADER LOADING: Folder search has an activity indicator and found-file counters. Header reading has file-based percentage progress and read-error counts. Cancel loading retains the previous selection. Successful loading resets the update bar and counters for the new batch.

UI UPDATE — RGB DUAL BAND 0.14.1
The registration menu now reads Align using stars, Align using astrometry, and Images are already aligned. Their processing behavior is unchanged. Preparation requirements remain visible; the general preparation confirmation checkbox has been removed. Other scripts have no general preparation confirmation checkbox. Astrometric Solution Copy retains its per-target override for cases where registration cannot be verified, as requested by the user.

HEADER DEFAULT
Simulation only is now unchecked by default. Save copies remains the initial save mode. Simulation can still be enabled, and overwrite confirmation remains in place. Loading progress, counters and cancellation are retained.

POLYMASK 0.1.0
New standalone polygon mask editor. No astrometry, extra reference image or blending process is required. Select an image; left click to draw, drag vertices, click closed edges to insert, right click for deletion/contour actions. Wheel zoom and Shift-drag pan. Preview and outputs include inward or symmetric Gaussian feathering, with optional inversion and optional attachment to the source.

Menu: Script > Crinconlab > PolyMask. See manuals/PolyMask_Quick_Start_EN.txt and PolyMask_Manual_EN.txt. The other four script files are byte-for-byte unchanged. The new icon follows the approved orange family.
