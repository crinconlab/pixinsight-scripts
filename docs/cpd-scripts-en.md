# Crinconlab — product descriptions for CPD review

**Author:** Carlos Rincón. **Requested developer identifier:** `Carlos_Rincon_Astrophoto`.

**Scope:** four scripts only; PolyMask is excluded. These draft descriptions were prepared on 29 October 2026 from the executable sources at commit `31fed1d6b8b06624dd8456d537ee29d60ce9b2a8`. The code is unchanged in this review package. This is a static source review and a description of current behaviour, not a declaration that native-component network access or PixInsight 1.9.6 compatibility has been fully verified. Outstanding checks are listed separately.

## 1. FITS / XISF Header Editor

**File:** `FITS_XISF_Header_Editor_EN.js`. The reviewed source has no product version declared in its header.

### Purpose and operation

Inspect and edit ordinary FITS keywords in single-image FITS and XISF files, individually or in batches. Users select files from a directory or recursively from a directory tree, inspect keyword values, comments and types, queue changes, and optionally simulate the operation before writing. XISF properties are displayed read-only. A limited explicit mapping synchronizes the XISF properties corresponding to FILTER, CREATOR, OBJECT and exposure-time keywords.

Copy mode is the default and preserves the original files. The user can explicitly select overwrite mode, with or without retained backups; both require confirmation. New files are reopened and their requested metadata verified before replacing an original or publishing a copy. Existing copy destinations are skipped. FITS editing updates the primary header and copies subsequent data bytes without image processing. XISF editing uses the installed format module and may regenerate serialization/encoding metadata; extensions not exposed through PJSR are not guaranteed to survive. Structural FITS keywords are protected from user edits.

### Network and external programs

The script implements no network client, file upload, server synchronization or exchange with other participants. It launches no external program. It uses file-system paths selected by the user. A directory mounted by the operating system from a NAS or server may also be accessible as a file-system path; any resulting transport belongs to that mount, not to a participant-exchange protocol implemented by this tool.

### File locations and retention

- Copies: the output directory selected by the user; the initially suggested directory is `Headers_Metadata`. Relative subdirectories are preserved in recursive mode.
- Overwrite mode: the selected originals' directories.
- Retained backups: `Metadata_Backups/<date-time-identifier>/` inside each source directory, only when overwrite-with-backup is selected. These backups remain for the user to manage.
- Work files: unique `.metadata_*` files in the output or source directories; overwrite-without-backup temporarily retains a `.metadata_original_*` recovery file. Cleanup/restoration failures are reported with paths.
- Simulation: no files or directories are created.

Replacement is performed per file, not as an atomic whole-batch transaction. A later failure does not undo earlier successful replacements. No default/script preference persistence or separate log-file writer is implemented in this source; progress and errors are reported through the interface and PixInsight console.

## 2. RGB DualBand Solver SPCC — 0.14.2

**File:** `RGB_DualBand_Solver_SPCC_EN.js`.

### Purpose and operation

Combine a prepared linear broadband RGB image with a prepared linear dual-band image. The workflow works on copies, using the RGB image as the reference grid. Registration can use native StarAlignment, astrometric reprojection of already-solved images, or the user's confirmation that both inputs already share a pixel grid. A geometric coverage mask is used to find an inscribed common-field crop when registration is performed.

The composition adds an adjustable multiple of the dual-band red channel, or its single monochrome channel, to the RGB red channel. The native SpectrophotometricColorCalibration process then calibrates the result using user-selected settings. An existing RGB astrometric solution is reused; otherwise the installed ImageSolver dialog is opened to solve a working copy. Astrometry is adjusted and checked after cropping. The user compares the calculated result and retains that image without repeating an accepted calculation. This is not continuum subtraction and does not guarantee strictly photometric colour after narrowband addition.

### Dependencies, network and external programs

The script references installed PixInsight astrometry/ImageSolver libraries; it does not download or bundle replacement copies. ImageSolver may contact catalogue or coordinate-resolver services according to its version and configuration. SPCC uses the user's installed native process and configured GaiaDR3SP spectral-catalogue resources. Exact endpoints, protocols, cache locations and transmitted query fields of these installed components remain to be inventoried on the target PixInsight 1.9.6 installation. There is no direct networking API, external executable invocation, self-installer or self-updater in this script's own source.

### Files and preferences

Input files may be opened at the user's request. Working and accepted images remain in the workspace; image files are not automatically saved. Optional manual export writes a text file to a user-selected path. SPCC defaults are persisted only when the user selects Save as defaults, through the official Settings API at `CarlosRincon/RGBDualBandSPCC/v1/defaults`; the physical settings location is managed by PixInsight. Installed `filters.xspd` and `white-references.xspd` are read from `CoreApplication.libraryDirPath` and are not modified. Preview calibration explicitly suppresses native graph, star-map and text-file generation. Native catalogue/solver cache locations still need final documentation.

## 3. Focal Length Blend — 0.11.4

**File:** `Mezcla_Focales.js`.

### Purpose and operation

Selectively incorporate high-frequency lightness structure from a longer-focal-length image into a prepared, stretched wide-field image. The shorter-focal-length base defines the exact output dimensions and pixel grid. Existing astrometry is reused; the installed ImageSolver can solve unsolved working copies when suitable stars are present. Optional star separation uses the user's already-installed and activated StarXTerminator module. Without that option, the inputs must already be starless and retain valid astrometry.

The longer-focal image is reprojected onto the base with the installed ImageReprojection backend. Coverage is calculated geometrically rather than inferred from nebular brightness. An editable polygon and inward transition control the blend area. The primary method adds selected native MultiscaleLinearTransform detail layers to base lightness; a Gaussian-band method is also available. A synchronized comparator supports visual inspection and independent recalculations. Base colour is the colour source. The workflow can retain base stars separately and optionally produce an additional Screen-recombined image. It does not stretch inputs, remove their gradients or perform colour calibration. Reprojection onto the base grid does not guarantee preservation of all original long-focal sampling.

### Network and external programs

ImageSolver has the delegated catalogue/resolver behaviour described above; its exact native endpoints and caches require verification. StarXTerminator must already be installed and activated with a working model; this script does not download, install or license that module or its model. Its own component-specific behaviour must not be confused with a fully audited offline guarantee for the workflow.

The optional Download Sample Images action requests acceptance of copyright/usage terms and a destination before connecting to:

`https://github.com/crinconlab/pixinsight-scripts/releases/download/sample-images-v1.0/Crinconlab_Sample_Images.zip`

The code invokes the system's `curl` through `ExternalProcess.execute`: `/usr/bin/curl`, or `curl.exe` in the source's Windows branch. The executable is not bundled. Arguments request HTTPS at that initial URL, follow redirects, report errors and apply connection/transfer timeouts. No certificate-verification bypass option is passed. Redirect destinations are determined by GitHub at transfer time; the current invocation does not explicitly restrict redirect protocols to HTTPS. The availability of the executable and platform selection need validation on supported systems.

The downloaded ZIP is intended to contain sample images and usage/settings documents. The script does not automatically extract it or execute code from it. The current implementation checks an expected length of **85,376,365 bytes**, not a cryptographic digest. This limitation must be resolved before describing the download as cryptographically integrity-verified or declaring the relevant network requirement fully addressed.

### File locations and retention

The ZIP is saved at the path chosen in the Save dialog. A partial file named `<destination>.download-<timestamp>` is created beside it and is removed on failure when cleanup succeeds. If the user confirms overwriting an existing destination, the current code replaces that destination after transfer and length checking. Unzipping is a separate user action. The script does not automatically save blend, stars or recombined image files; accepted results remain open in PixInsight. Temporary image windows belong to the script and are cleaned up by its workflow. Native solver/module cache and temporary-file paths remain to be checked in the target installation.

## 4. Astrometric Solution Copy — 1.1

**File:** `Astrometric_Solution_Copy_EN.js`.

### Purpose and operation

Transfer an existing native PixInsight astrometric solution from a solved reference image to selected open target images sharing that reference grid. Dimensions are checked and locally detected stellar positions are compared to assess registration. Positively misaligned images are blocked. When verification is inconclusive, a separate user confirmation is required for each target. Existing target solutions are retained by default unless replacement is explicitly selected.

The script does not perform a new catalogue solve, register/resample images or alter their pixel samples. It intentionally changes the astrometric metadata of authorized target windows. Its stellar check is statistical and does not prove perfect registration everywhere or the scientific correctness of the reference solution.

### Network, external programs and files

No network connection, catalogue query, external executable invocation or automatic image-file save is implemented. It operates on open images using PixInsight functions. The user must save targets separately to persist copied metadata to disk. Status/results are shown in the interface and console; there is no dedicated on-disk log writer or script preference persistence in this source.

## Scope and remaining work

The four own-source files contain no request for administrator privileges, self-installation into PixInsight, direct edit of security preferences, or network code downloader/executor found in this static review. This finding is limited to those files and is not a certification of every installed dependency's behaviour.

The package is available as source for manual review; no active automatic-update repository or CPD signatures are included. Descriptions of direct I/O above are supported by the current source. The dependency-level network/storage inventory, download-integrity improvement, product versioning for the header editor and checks on PixInsight 1.9.6 remain open: see [cpd-pending-checks.md](cpd-pending-checks.md). No application has been resubmitted on the author's behalf.
