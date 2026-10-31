CRINCONLAB — COMPLETE COLLECTION
Copyright © Carlos Rincón 2026

PRODUCTS INCLUDED
FITS / XISF Header Editor 1.0.1 — FITS_XISF_Header_Editor_EN.js
RGB Ha Blend 0.15.0 — RGB_Ha_Blend.js
Focal Length Blend 0.11.8 — Mezcla_Focales.js
Astrometric Solution Copy 1.1 — Astrometric_Solution_Copy_EN.js

PolyMask is included in this collection, outside the four-script CPD application.

INSTALLATION FOR REVIEW
Keep all .js files and ProtectedPaths.jsh together with icons/ and manuals/.
Place this folder in a user-managed location. In PixInsight, choose
Script > Feature Scripts > Add and select the folder containing the .js files.
The entries appear under Script > Crinconlab. Avoid registering multiple copies.

This is a preliminary manual-installation package without CPD signatures.
There is no automatic-update repository in this package. The source targets
PixInsight 1.9.5. Native checks on 1.9.6/macOS now cover interfaces, header I/O,
WCS copying, reprojection/crop, blending and verified sample downloads. Successful manual ImageSolver and SPCC execution in both 1.9.5 and 1.9.6
is confirmed by Carlos Rincon.
Native StarX separation and Screen recombination subsequently passed the
automatic 1.9.6 workflow; see docs/starx-validation-1.9.6.md in the repository.
Use the root README and docs/cpd-scripts-en.md for the review scope and
docs/cpd-pending-checks.md for outstanding documentation and validation work.

DEPENDENCIES
The scripts use installed PixInsight processes and PJSR libraries.
RGB Ha Blend and Focal Length Blend reference installed ImageSolver
components. The former also requires the user's configured SPCC/GaiaDR3SP data.
Focal Length Blend can invoke an installed, activated StarXTerminator module;
it can also work with already-starless inputs that retain valid astrometry.
Its optional sample-data downloader invokes the system curl program.
No ImageSolver libraries, StarXTerminator module or curl executable are bundled.

USER FILES AND NETWORK
The header editor reads and writes selected file-system locations. Copy mode
is the default. Overwriting is explicit, with retained backups optional.
No direct network communication or participant exchange is implemented in it.

The other three scripts work primarily on open image windows. Blend outputs
are retained in the workspace and are not automatically saved to image files.
Astrometric Solution Copy intentionally changes target-window astrometry.
Optional help export in RGB DualBand saves a .txt file to a user-selected path.
RGB DualBand can save its exposed SPCC defaults with the PixInsight Settings API.

The scripts use the official ImageSolver included with PixInsight. Catalogue
and coordinate-resolver queries follow that component's installed version and
configuration; no separate catalogue service is implemented by these scripts.
Focal Length Blend's optional sample download uses an HTTPS GitHub Releases URL,
follows redirects and saves a ZIP at a user-selected location. It does not
automatically extract or execute that ZIP. HTTPS-only requests and redirects
are enforced. Size and a pinned SHA-256 are checked before publication, and a
failed verification leaves any existing destination file unchanged. An existing
download is temporarily moved to a unique .previous-* recovery path during
replacement, restored on failure when possible and removed after success.
The hash is computed inside the script without an external hash program.

tests/sample-download.test.cjs covers the production hash/download helpers with
Node file adapters, including the real sample ZIP when CR_MF_SAMPLE_ZIP is set.
tests/Test_Sample_Download_PixInsight.js checks native file operations and hash
verification on synthetic fixtures; it passed in PixInsight 1.9.6/macOS.
A real production HTTPS transfer also matched the pinned size and SHA-256.
See docs/validation-pixinsight-1.9.6.md in the repository for evidence and limits.

Image files are never uploaded by any explicit upload routine in these four
sources. Behaviour of the installed dependent components is outside that
limited source finding and is not declared fully audited here.



VALIDATION SUMMARY
Automated development checks in PixInsight 1.9.5 covered astrometric-solution handling, ImageSolver initialization and SPCC configuration/workflow integration. Native automatic 1.9.6/macOS checks cover metadata editing, registration/reprojection, astrometric transfer, MLT blending, StarX separation/Screen recombination and verified downloads. The author separately confirms successful manual ImageSolver and full SPCC execution on both 1.9.5 and 1.9.6. See docs/validation-pixinsight-1.9.6.md in the repository.

MANUAL END-TO-END VALIDATION
Carlos Rincon confirms successful manual ImageSolver astrometric solving and full SPCC calibration in both PixInsight 1.9.5 and 1.9.6. These results complement the automated checks.

PolyMask is also included in this branch and is outside the four-script CPD submission.
