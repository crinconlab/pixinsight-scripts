# Crinconlab — product descriptions for CPD review

**Author:** Carlos Rincón. **Requested developer identifier:** `Carlos_Rincon_Astrophoto`.

**Scope:** four products only; PolyMask is excluded. The source baseline is commit `31fed1d6b8b06624dd8456d537ee29d60ce9b2a8`. On 29 October 2026 Focal Length Blend 0.11.5 adds verified sample downloads; RGB DualBand and Astrometric Solution Copy retain their implementations. The header editor is now labelled 1.0.0 without changing processing. These descriptions identify direct I/O and installed dependencies. They do not declare CPD approval. Native PixInsight 1.9.6 results and author-accepted compatibility assumptions are recorded in [the validation report](validation-pixinsight-1.9.6.md).

## 1. FITS / XISF Header Editor

**File:** `FITS_XISF_Header_Editor_EN.js`. **Version: 1.0.0.** This labels the existing implementation without changing processing.

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

The script uses the official ImageSolver included with PixInsight and its installed astrometry libraries; it does not download or bundle replacement copies. Catalogue and coordinate-resolver queries are performed by that official component according to its installed version and the user's configuration. SPCC uses the installed native process and configured GaiaDR3SP spectral-catalogue resources. No independent catalogue service is implemented by this script. There is no direct networking API, external executable invocation, self-installer or self-updater in its own source.

### Files and preferences

Input files may be opened at the user's request. Working and accepted images remain in the workspace; image files are not automatically saved. Optional manual export writes a text file to a user-selected path. SPCC defaults are persisted only when the user selects Save as defaults, through the official Settings API at `CarlosRincon/RGBDualBandSPCC/v1/defaults`; the physical settings location is managed by PixInsight. Installed `filters.xspd` and `white-references.xspd` are read from `CoreApplication.libraryDirPath` and are not modified. Preview calibration explicitly suppresses native graph, star-map and text-file generation. Native catalogue/solver cache handling is delegated to the installed official components.

## 3. Focal Length Blend — 0.11.5

**File:** `Mezcla_Focales.js`.

### Purpose and operation

Selectively incorporate high-frequency lightness structure from a longer-focal-length image into a prepared, stretched wide-field image. The shorter-focal-length base defines the exact output dimensions and pixel grid. Existing astrometry is reused; the installed ImageSolver can solve unsolved working copies when suitable stars are present. Optional star separation uses the user's already-installed and activated StarXTerminator module. Without that option, the inputs must already be starless and retain valid astrometry.

The longer-focal image is reprojected onto the base with the installed ImageReprojection backend. Coverage is calculated geometrically rather than inferred from nebular brightness. An editable polygon and inward transition control the blend area. The primary method adds selected native MultiscaleLinearTransform detail layers to base lightness; a Gaussian-band method is also available. A synchronized comparator supports visual inspection and independent recalculations. Base colour is the colour source. The workflow can retain base stars separately and optionally produce an additional Screen-recombined image. It does not stretch inputs, remove their gradients or perform colour calibration. Reprojection onto the base grid does not guarantee preservation of all original long-focal sampling.

### Network and external programs

Astrometric solving and its catalogue/resolver queries use the official ImageSolver included with PixInsight, under that component's installed version and configuration. No independent catalogue service is implemented. StarXTerminator must already be installed and activated with a working model; this script does not download, install or license that module or its model. These dependencies are not presented as an offline guarantee for the workflow.

The optional Download Sample Images action requests acceptance of copyright/usage terms and a destination before connecting to:

`https://github.com/crinconlab/pixinsight-scripts/releases/download/sample-images-v1.0/Crinconlab_Sample_Images.zip`

The code invokes the system's `curl` through `ExternalProcess.execute`: `/usr/bin/curl`, or `curl.exe` for Windows/MSWindows platform identifiers. The executable is not bundled. Both initial requests and redirects are restricted to HTTPS with `--proto =https` and `--proto-redir =https`. Transfer errors and connection/transfer timeouts are handled; no certificate-verification bypass is requested. Asset redirects are managed by GitHub. Native executable availability remains part of platform testing.

The ZIP is intended to contain sample images and usage/settings documents. It is not automatically extracted and no code from it is executed. Before publication the script checks **85,376,365 bytes** and the pinned SHA-256 **`9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26`**. The expected digest was obtained from the GitHub release asset metadata and independently matched against the downloaded ZIP. It is embedded in the script, not accepted from a new remote checksum file at download time. Incremental SHA-256 is implemented in the script and uses bounded file reads; no external hash executable is required. A mismatch rejects the partial download before touching an existing destination. Changing the sample asset requires deliberately updating the pin.

### File locations and retention

The ZIP is saved at the path chosen in the Save dialog. A partial file named `<destination>.download-<timestamp>-<identifier>` is created beside it and is removed on failure when cleanup succeeds. After size and hash verification, an existing destination is temporarily preserved as `<destination>.previous-<timestamp>-<identifier>` during replacement. It is restored if publication fails when possible, and removed after success. If restoration or cleanup fails, the recovery file is retained and its path reported. Unzipping is a separate user action. Blend, stars and recombined image files are not automatically saved; accepted results remain open in PixInsight. Native solver/module cache handling belongs to the installed components.

## 4. Astrometric Solution Copy — 1.1

**File:** `Astrometric_Solution_Copy_EN.js`.

### Purpose and operation

Transfer an existing native PixInsight astrometric solution from a solved reference image to selected open target images sharing that reference grid. Dimensions are checked and locally detected stellar positions are compared to assess registration. Positively misaligned images are blocked. When verification is inconclusive, a separate user confirmation is required for each target. Existing target solutions are retained by default unless replacement is explicitly selected.

The script does not perform a new catalogue solve, register/resample images or alter their pixel samples. It intentionally changes the astrometric metadata of authorized target windows. Its stellar check is statistical and does not prove perfect registration everywhere or the scientific correctness of the reference solution.

### Network, external programs and files

No network connection, catalogue query, external executable invocation or automatic image-file save is implemented. It operates on open images using PixInsight functions. The user must save targets separately to persist copied metadata to disk. Status/results are shown in the interface and console; there is no dedicated on-disk log writer or script preference persistence in this source.

## Scope and remaining work

The four own-source files contain no request for administrator privileges, self-installation into PixInsight, direct edit of security preferences, or network code downloader/executor found in this static review. This finding is limited to those files and is not a certification of every installed dependency's behaviour.

The package is available as source for manual review; no active automatic-update repository or CPD signatures are included. Descriptions of direct I/O above are supported by the current source. Eleven download/hash tests passed outside PixInsight, including the actual published ZIP, same-size tampering, failed transfers, rollback and HTTPS-only arguments. Native file/hash verification, a real HTTPS download, the four interfaces, header I/O, astrometric copying, reprojection/crop and MLT blending have now been checked on PixInsight 1.9.6. SPCC, a fresh solve and StarXTerminator are accepted by the author based on prior operation, not claimed as newly verified successes. The header editor is versioned 1.0.0. See [cpd-pending-checks.md](cpd-pending-checks.md). No application has been resubmitted on the author's behalf.
