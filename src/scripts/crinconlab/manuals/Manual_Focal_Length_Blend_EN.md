# Focal Length Blend — 0.11.7, preliminary CPD review build

Copyright © Carlos Rincón 2026

## Before you start

An English requirements notice appears before setup. Click **OK** to proceed or **Cancel** to stop without creating temporary images. Both inputs must be stretched, with gradients removed and color calibration completed. Star deconvolution is optional; noise reduction is recommended.

With StarXTerminator, use inputs with stars and an installed, activated module with a working AI model. Without StarXTerminator, both inputs must already be starless and retain valid astrometric solutions for their current pixel grids; disable separation in setup.

## Prepare the inputs

Select two stretched images with gradients corrected and color prepared:

- **Base: Short focal length** — the wide-field image. It defines the exact output width, height, pixel scale, field, color and retained stars.
- **Detail: Long focal length** — the image supplying high-frequency lightness structure. It is reprojected onto the base grid, with black padding outside its footprint.

The inputs may initially have different dimensions, orientations and pixel scales. The base is never enlarged to match the long-focal image. Reprojection can therefore discard some of the long-focal input's finer original sampling.

Leave **Separate stars with StarXTerminator** enabled when the inputs contain stars. The script first reuses existing astrometry or solves each unsolved input, then separates stars on copies at their original resolution, and finally reprojects the long-focal starless copy. Image Solver requires stars. Disable separation only for already starless inputs with valid solutions for their own pixel grids.

The script does not stretch images, remove gradients or calibrate color. The preparation reminder is displayed at the top of setup; there is no confirmation checkbox to tick. Image dimensions, mask type, coverage and output identifiers are still checked automatically. Those checks cannot determine whether gradients or color have been properly corrected.

## Install and update locally

Keep the complete **Crinconlab** folder together with its scripts, the SVG files in **icons**, and **manuals**. Replace the previous complete folder, keeping any personal files separately. In PixInsight, open **Script → Feature Scripts…**, remove outdated entries pointing to other locations if necessary, then **Add…** the folder containing the `.js` files and click **Done**.

Launch **Script → Crinconlab → Focal Length Blend**. The filename remains `Mezcla_Focales.js` so the replacement updates the existing script. Do not install both old and new copies in different folders. The source is published in the cpd-review branch of this GitHub repository for manual installation and CPD evaluation. No automatic update repository is active.

## 1. Solve, separate stars and prepare geometry

Choose the base and detail using their dropdown lists or **Open file…**. Each file must contain a single main image; monochrome and RGB without alpha channels are supported. **Refresh lists** updates the available open images.

Click **1. Solve, separate stars and prepare geometry**. Already solved images reuse their existing solutions. Before solving an unsolved input, a notification identifies its role and original image name, for example:

> Proceed with the astrometric solution of the long-focal-length image?

**OK** opens the official Image Solver dialog; **Cancel** stops preparation and cleans its temporary copies. Review coordinates, scale and other solver settings before proceeding. There is no notification for an already solved input because no new solve is performed.

After both solutions are available, StarXTerminator runs if enabled. This requires an installed, activated module with a working AI model. Its installed model and overlap defaults are retained. The script does not install or license the product.

The long-focal starless image is then reprojected with **ImageReprojection**, the official backend used by MosaicByCoordinates. The complete short-focal astrometric geometry, including available distortion, defines the destination grid. This avoids an automatically enlarged mosaic. The short-focal pixels are not resampled, although StarXTerminator does change the pixels of its copy when separation is enabled.

When explicit geometry preparation finishes, a **Go to Create Mask** notice asks you to click OK and opens the mask editor. Prepared geometry is reused when opening the mask editor or comparison. Changing either input or the StarXTerminator option invalidates it. If you edit an original externally while the script is open, reselect that input before preparing again. Original images are not overwritten.

## Where the stars are kept

The short-focal base is separated with **Unscreen**, appropriate to this stretched-image workflow. The long-focal image is made starless without keeping an unnecessary second stars layer.

When you confirm **Create Blended Image**, the starless blend remains open and the short-focal stars are retained in a separate image named **CR_MF_EstrellasBase**, with a numeric suffix when necessary. The identifier is retained for compatibility with earlier releases. **Neither image is saved to disk automatically.** Save the blend and stars manually.

Stars are not added back unless you select **Recombine stars in a new image when creating the blended image** in the comparison window. This option is available only when the script has retained base stars from StarXTerminator. It starts unchecked. When selected, **Create Blended Image** preserves the starless blend and stars separately and creates an additional Screen-combined image, named with a unique `CR_MF_Recombined` identifier. Nothing is saved to disk automatically.

The native PixelMath expression uses the actual starless-result and stars-image identifiers:

```text
~((~starless_result)*(~base_stars))
```

Separation and recombination may leave residuals, halos or clipped samples; exact numerical reconstruction is not guaranteed. **Back** retains temporary geometry and stars for reuse. Discarding, closing the workflow, changing inputs or changing the separation option removes temporary stars. No stars layer is created when StarXTerminator is disabled. Temporary masks created by this script are hidden and closed automatically when the workflow ends. Externally supplied masks are left untouched.

RC Astro generally recommends early separation in the linear stage. This particular workflow expects stretched inputs and uses Unscreen for their base stars. It does not convert linear inputs to stretched inputs. See the official usage notes: https://www.rc-astro.com/starxterminator-usage-notes/

## 2. Create mask

Click **2. Create mask…**. Draw on the short-focal base:

- **Purple:** fixed astrometric footprint of the long-focal image.
- **Cyan:** your editable coverage polygon, initially a circular outline inscribed inside that footprint. The circle is represented by 32 movable vertices, so you can reshape it freely. Very small or degenerate coverage can fall back to its footprint.

### Zoom and pan in the mask editor

The image and effective-mask panels share one camera, so both always show the same image region at the same scale.

- **Mouse wheel** over either panel: zoom around the image point beneath the pointer, within the image boundaries.
- **Fit Image:** return both panels to the full field.
- **100 %:** show one image pixel per screen pixel for accurate edge inspection.
- **+ / −:** zoom around the common view center.
- **Shift + left-button drag** on either panel: pan both views without changing vertices.
- **Normal left-button click/drag** on the image panel: add or move a vertex. The purple footprint and cyan polygon remain aligned as you navigate. The mask panel does not edit vertices.

Zoom and pan affect only the display: they do not resize the image or mask, invalidate a previously computed mask, or change transition strength. Coordinates remain in full-resolution base-image pixels. Editing a vertex or the transition still requires **Preview transition** to refresh the effective mask. In Fit mode, resizing the dialog refits the views; in a zoomed view, the camera retains its scale and keeps panning within the image bounds.

Move vertices inward to exclude registration or interpolation edges. **A softly feathered, irregular mask boundary can help achieve a more natural blend. Keep it within the valid detail coverage.** Irregularity alone does not replace feathering or careful edge inspection. You can drag vertices, select a vertex number, and edit its x/y coordinates in base-image pixels. A polygon requires 3–64 vertices; concave shapes are supported, but crossings, touching edges, duplicate vertices and holes are not.

**Close polygon** connects the last vertex to the first. **Undo** first reopens a closed polygon, then removes its last vertex. **Clear contour** starts over. **Back** returns to the initial setup without accepting the mask being edited. Prepared geometry and any previously selected mask are retained. The Full canvas option has been removed.

Set **Transition (px)** and click **Preview transition**. The right panel displays the effective mask: white adds detail, gray blends partially, and black preserves the base. Transition is an inward Gaussian feather, expressed as sigma in pixels. Zero keeps hard edges. The initial 32 pixels can be excessive for small fields.

**Create and select mask** selects a hidden temporary hard-edged mask in setup. A **Go to Prepare Comparison** notice asks you to click OK and proceeds to comparison preparation. The transition is applied once during blending, not baked into the support mask. Set it **only in the mask editor**; setup displays its value as information.

The script closes its own mask when replaced by another one or when the workflow ends, including acceptance and cancellation. **Back** keeps it hidden for reuse. It does not leave an extra mask image open after completion. You may select an external monochrome mask with the exact base dimensions; external masks are never closed by the script. For an external mask, the displayed transition defaults to 32 px unless a different value was chosen earlier in the mask editor.

Coverage is determined by reprojecting a white support with the long-focal astrometry, not by thresholding the nebula's brightness. Valid dark regions are preserved. Pre-existing black padding or invalid regions inside the original long-focal rectangle are not automatically detected: exclude them yourself. The polygon footprint is sampled from the source image edges and clipped to the base canvas.

## 3. Prepare comparison

Leave **Inject high-frequency detail with MLT** enabled, check the transition and optional automatic contrast gain, and click **3. Prepare comparison**.

The left comparison label shows the **original selected base identifier**, followed by **prepared copy**. Its pixels come from the prepared working copy, including star separation when enabled. Hidden identifiers such as `CR_MF_BaseResuelta` are internal copies, not previous blends. The script does not rename or modify the original image.

In the comparison window, choose the **MLT layers 1–8** to add. Layers **1, 2 and 3** start selected. The residual is always excluded. Layer 1 holds the finest structure and can also reinforce noise. Higher numbers include progressively larger structures. Approximate characteristic scales are 1, 2, 4, 8, 16, 32, 64 and 128 pixels, measured on the **reprojected output grid**, not the original long-focal image. They are overlapping filter scales, not exact object-size intervals.

You may select nonconsecutive layers. With no layers selected, the result is the unchanged prepared base.

**Compare lightness only** starts enabled in MLT mode. The left panel shows base CIE L* and the right shows CIE L* extracted from the actual computed output after LRGB combination. Turn it off to inspect full RGB color. This changes only the display; the output retains its original monochrome or RGB type.

Change layers, **Intensity (%)** or **Relative detail gain**, then click **Update Preview**. The preview is explicitly refreshed by that button. Acceptance is disabled while processing settings differ from the last successful calculation. Each update starts from the same prepared base, so effects do not accumulate. Solving, star separation and reprojection are not repeated.

Use **100 %** to judge fine detail. **Fit image**, zoom buttons, mouse wheel and dragging share the same zoom and center in both panels. The display uses no additional STF. Calculations are at full resolution.

Intensity starts at **35%**, with manual relative gain **0.50 (50%)**. Setting relative gain to zero still produces an exact copy of the prepared base. Change the gain and click Update Preview to see the corresponding detail amplitude. This zero setting also preserves the base when using the optional Gaussian method. To compare with a direct manual addition of MLT layers, use intensity **100%**, relative gain **1**, and disable **Estimate contrast gain inside the coverage** in setup. Automatic gain estimates a multiplier from smooth structures inside the effective mask; it is not photometric calibration. If unreliable, it falls back to 1 and reports a warning. Manual relative gain ranges from 0 to 4. A value of 1 preserves the extracted amplitude, 0.75 uses 75%, and 1.5 uses 150%. It multiplies both Intensity and the automatic gain when enabled. For example, intensity 35%, relative gain 1 and automatic gain 1 give a net coefficient of 0.35. The established positive-gain MLT/Gaussian calculations are unchanged; version 0.9.0 adds zero gain as a neutral setting.

**Create Blended Image** creates the current computed result with **one click** when the whole image is visible. It does not force a second click or change the lightness/color display mode.

If zooming or panning hides part of the image, a popup recommends reviewing the overall integration with Fit Image:

- **Fit Image:** show the whole comparison and return for inspection without creating an image. Click Create Blended Image when ready.
- **Create Anyway:** create the current result immediately, retaining the current zoom and display mode.
- **Cancel** or closing the popup: return without creating an image or changing the preview.

The check uses the actual visible image area, not simply whether the zoom controls were touched. A manually chosen scale that still shows the whole image does not trigger the warning. Processing changes must still be calculated with Update Preview before creation.

The confirmed image is exactly the successful computed result, using your output name, with an additional stars-recombined image if selected. No file is saved automatically. **Back** returns to setup while retaining reusable geometry. **Discard and close** removes the blend, temporary copies and any masks created in this session. A failed recalculation preserves the previous valid comparison.

Every interactive control has an English hover description explaining its purpose, range or consequence. Move the mouse over a control and pause to display its tooltip.

## Processing method

MLT mode uses native **MultiscaleLinearTransform**, Starlet transform and **B3 Spline (5)**, without noise reduction or layer bias adjustments. In RGB it extracts CIE L*; in monochrome it uses the single channel. It adds selected high-frequency layers from the long-focal detail to the base lightness, without subtracting a base detail band:

```text
L_result = clamp_0_1(L_base + intensity * effective_mask *
                    total_gain * sum(selected_MLT_layers(L_detail)))
```

Direct native MLT reconstruction can clip negative detail coefficients. This script instead subtracts native smoothed residuals and combines their differences with unclipped PixelMath. Both coefficient signs are retained until the final composition. It does not retain eight full-resolution layer images in memory. Updating gain or intensity also recalculates the selected layers.

RGB lightness is incorporated with neutral LRGBCombination settings; base pixels outside the effective mask are preserved. Color comes from the base, but changing lightness and handling out-of-gamut colors can alter its appearance. Photometric or exact color identity is not guaranteed. The output inherits the base astrometry.

### Earlier Gaussian method

Disable MLT in setup to use the earlier Gaussian-band replacement. Only then do **Fine sigma** and **Coarse sigma** become active. They define a difference between coverage-normalized Gaussian smoothings. That mode subtracts the base band and adds the gain-adjusted detail band. MLT layer checkboxes are disabled in this mode. Mask transition works in both modes.

## Limits and performance

Large images require substantial memory and processing time, even though the output dimensions do not grow. Several 32-bit images and screen bitmaps are held temporarily. Selecting larger layers requires more work.

High-frequency injection can amplify noise, halos and oversharpening. Large layers can pick up the black reprojection boundary; move the mask inward, increase the inward transition or omit overly large layers if edge artifacts appear. The final lightness is limited to 0–1; inspect highlights and shadows.

Astrometric reprojection depends on accurate input solutions. There is no subsequent StarAlignment refinement or automatic compensation for differences in PSF, filters, noise or processing artifacts. Inspect structures and alignment yourself. This script is not a replacement for those checks.

## Validation

The MLT implementation has been tested with native PixInsight 1.9.5 on synthetic monochrome and RGB images. Tests verify signed coefficients, the B3 first-layer difference, contiguous and nonconsecutive selections, injection, identity without layers, unchanged coverage exterior, stale-result rejection, error recovery, unchanged originals, and comparison controls. Dialogs are rendered for inspection and real PJSR control callbacks are exercised; physical mouse clicks are not automated.

Existing tests also cover masks, navigation, fixed-dimension astrometric reprojection and the native StarXTerminator flow. No fresh catalogue solve with real astronomical stars is claimed. Visual validation with your own astronomical images remains necessary.

## Changes in 0.8.0

Visible Copyright © Carlos Rincón 2026 in setup, mask, comparison and help windows.
Step-completion notifications lead to Create Mask and Prepare Comparison.
Circular editable initial mask, irregular-edge recommendation, and transition edited only in the mask editor.
Session-created masks stay hidden and are closed on replacement or exit.
Optional native PixelMath Screen recombination preserves the separate starless and stars images.
The existing fusion method and its intensity/gain defaults have not been changed.

## Sample images

Click **Download Sample Images** in setup. Before opening the download, an English dialog displays Copyright © Carlos Rincón 2026 and these usage conditions:

> These images are shared for personal testing of the Crinconlab Focal Length Blend script only.
>
> Please do not redistribute or publish the supplied images or any results created from them without prior permission from Carlos Rincón.
>
> Thank you for respecting the author’s work.

**Agree and Download** lets you choose where to save the ZIP, then downloads it directly without opening a browser. **Cancel** or closing either dialog starts no download. The notice appears each time; consent is not remembered. Requests and redirects allow HTTPS only. The script checks the file size and a pinned SHA-256 before publishing the ZIP. Rejected partial downloads are removed when possible, and an existing destination is preserved during verification. During replacement it is temporarily stored beside the destination as a unique `.previous-*` recovery file, restored on failure when possible and removed after success; any retained recovery path is reported. Unzip the verified file, then use its two workflows:

- **With_StarX:** Short_Focal_Length.xisf as Base and Long_Focal_Length.xisf as Detail. Leave StarXTerminator enabled. Both images contain stars and verified astrometry.
- **Without_StarX:** Short_Focal_Length_Starless.xisf as Base and Long_Focal_Length_Starless.xisf as Detail. Disable star separation. These derivatives already have stars removed and preserve the same astrometric geometry as the with-stars counterparts.

The sample package includes **Image_Solver_Settings_EN.txt**, with effective pixel sizes, focal lengths, image scales and centre coordinates. Use these values for the supplied resized files, not the physical sensor pixel pitch. Starless samples must retain their existing solutions; recover lost astrometry from the with-stars counterpart rather than trying to solve a field without stars.

| Sample | Focal length (mm) | Effective pixel size (µm) | Image scale (arcsec/pixel) |
|---|---:|---:|---:|
| Short focal length | 192.9183 | 8.623 | 9.219559 |
| Long focal length | 1244.9808 | 15.133 | 2.507191 |

Source and starless dimensions are 1500 × 1500 pixels for the short-focal image and 1500 × 1021 pixels for the long-focal image. No visible watermark was added. Copyright and usage conditions are included in XISF properties and LICENSE.txt. All derived results are subject to the stated personal-testing conditions.

Published release: https://github.com/crinconlab/pixinsight-scripts/releases/tag/sample-images-v1.0


## Changes in 0.9.0

- Rename the creation button to Create Blended Image.
- Start Relative detail gain at 0, with a supported range of 0–4. Zero preserves the base exactly.
- Initially required two-click full-image review; that behavior is superseded by the optional zoom warning in 0.9.1.
- Display startup requirements for stretched, gradient-corrected, color-calibrated inputs, optional star deconvolution, recommended noise reduction, and the starless/astrometry requirements without StarXTerminator.
- Include Download Sample Images as a visibly disabled button without a download action.
- Preserve existing masks, star recombination and positive-gain fusion behavior.

## Changes in 0.9.1

- Identify the original selected base in the comparison label, with an explicit prepared-copy note. Internal temporary names are no longer presented as the source identifier.
- Remove mandatory two-click creation. Create directly when the whole preview is visible.
- If zooming or panning hides pixels, show a recommendation popup with Fit Image, Create Anyway and Cancel.
- Preserve the preview display mode, current blend calculations, RDG default, and disabled sample-download button.

## Changes in 0.10.0

- Add synchronized wheel zoom and Shift-drag panning to both mask-editor panels.
- Add Fit Image, 100%, + and − controls and a zoom-percentage display.
- Keep image coordinates, footprint, vertices and full-resolution mask calculations independent of navigation.
- Rename the blend comparator update button to Update Preview.
- Preserve fusion, source labels, optional zoom warning before creation, stars and mask cleanup.

## Intensity versus Relative detail gain

Intensity ranges from 0 to 100%; Relative detail gain ranges from 0 to 4 (0–400%). In MLT mode, both multiply the selected detail band, so their effects overlap mathematically. With automatic gain 1 and a white mask, Intensity 35% and Relative detail gain 0.50 inject 17.5% of the extracted detail amplitude. Intensity 50% with gain 1 is equivalent to Intensity 100% with gain 0.50 in MLT mode. The automatic contrast gain multiplies this coefficient further.

In the optional Gaussian method, Intensity scales the full band-replacement correction, while Relative detail gain scales the incoming detail band. They are not generally interchangeable in that mode.

## Changes in 0.10.1

Set default Relative detail gain to 0.50 (50%). The control continues displaying a multiplier. Intensity stays at 35%; calculations, zoom and workflow remain unchanged.

## Changes in 0.11.4

Enable Download Sample Images with an explicit copyright/usage notice and Agree and Download / Cancel actions. Use the verified GitHub Releases asset. Add a documented real-image sample package with English image names, with-stars/starless pairs and preserved astrometry. Fusion, gain defaults and mask navigation are unchanged.

## Changes in 0.11.7

Sample downloads are restricted to HTTPS, including redirects. Before publication the script checks 85,376,365 bytes and the pinned SHA-256 `9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26`. The SHA-256 is calculated incrementally inside the script, without an external hash executable. An altered file is rejected even if its size is unchanged. An existing destination is retained during verification and protected with a temporary recovery file during replacement. File/read/transfer errors clean the partial download when possible.

Eleven standalone tests passed outside PixInsight, including the real published sample ZIP, known hash vectors, same-size tampering, failed transfers, replacement/rollback and HTTPS-only curl arguments. These tests use Node file adapters, not native PJSR bindings. Run `tests/Test_Sample_Download_PixInsight.js` for the native file/hash smoke test; that native test and a real HTTPS transfer passed on PixInsight 1.9.6/macOS. Reprojection, mask creation and MLT blending also passed. Fresh solving and optional StarX execution are accepted by the author based on prior operation; see docs/validation-pixinsight-1.9.6.md for the measured scope and limits. Image blending, astrometry, masks and gains are unchanged by this revision.


Task progress
-------------
Task descriptions appear in blue, with a percentage bar below. Percentages describe processing stages rather than elapsed time. Native Image Solver, StarXTerminator, reprojection, mask and MLT operations may hold the same percentage until the operation returns. Each new calculation resets progress; 100% is shown only after successful completion.


CPD REVIEW CANDIDATE — 29 OCTOBER 2026
Current scope: four scripts, PolyMask excluded. See docs/validation-pixinsight-1.9.6.md in the cpd-review repository for newly executed checks and author-accepted continuity assumptions. Earlier validation notes in this manual describe earlier work, not additional 1.9.6 results.


WRITE-PATH PROTECTION — 29 OCTOBER 2026
Keep ProtectedPaths.jsh beside the four scripts. Header Editor 1.0.1, Focal Length Blend 0.11.7 and RGB DualBand 0.14.3 refuse writes inside the running PixInsight installation and its per-user configuration directory. Symbolic links are resolved before comparison; ambiguous Windows paths and reparse points are rejected. Existing files with multiple hard links are rejected where reported by the platform. Choose normal user folders for output. The header editor retains its stricter source-link policy. See docs/path-write-safety.md in the cpd-review repository. This guard does not change image-processing algorithms, signing or security preferences.


SAMPLE DOWNLOAD UPDATE — 30 OCTOBER 2026
Focal Length Blend 0.11.7 adds a responsive progress window, separate transfer/SHA-256 percentages and Cancel, blocks duplicate clicks and accelerates native bounded file hashing. Two consecutive real button-callback downloads passed in PixInsight 1.9.6/macOS. HTTPS, the pinned SHA-256 and protected destinations remain enforced. See docs/sample-download-ui-1.9.6.md in cpd-review.
