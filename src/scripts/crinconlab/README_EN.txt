CRINCONLAB — FOUR-SCRIPT CPD REVIEW DRAFT
Copyright © Carlos Rincón 2026

PRODUCTS INCLUDED
FITS / XISF Header Editor — FITS_XISF_Header_Editor_EN.js
RGB DualBand Solver SPCC 0.14.2 — RGB_DualBand_Solver_SPCC_EN.js
Focal Length Blend 0.11.5 — Mezcla_Focales.js
Astrometric Solution Copy 1.1 — Astrometric_Solution_Copy_EN.js

PolyMask is not included in this review branch or package.

INSTALLATION FOR REVIEW
Keep the four .js files together with the icons and manuals subfolders.
Place this folder in a user-managed location. In PixInsight, choose
Script > Feature Scripts > Add and select the folder containing the .js files.
The entries appear under Script > Crinconlab. Avoid registering multiple copies.

This is a preliminary manual-installation package without CPD signatures.
There is no automatic-update repository in this package. The source targets
PixInsight 1.9.5; compatibility and full native checks on 1.9.6 remain pending.
Use the root README and docs/cpd-scripts-en.md for the review scope and
docs/cpd-pending-checks.md for outstanding documentation and validation work.

DEPENDENCIES
The scripts use installed PixInsight processes and PJSR libraries.
RGB DualBand Solver SPCC and Focal Length Blend reference installed ImageSolver
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
verification on synthetic fixtures; it has not been executed here.

Image files are never uploaded by any explicit upload routine in these four
sources. Behaviour of the installed dependent components is outside that
limited source finding and is not declared fully audited here.
