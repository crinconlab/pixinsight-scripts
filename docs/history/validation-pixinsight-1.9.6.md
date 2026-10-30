Historical review snapshot. Current status: [validation summary](../validation-pixinsight-1.9.6.md).

# PixInsight 1.9.6 native review — Crinconlab

**Update 30 October 2026:** StarX separation, MLT blending and Screen recombination have now passed the automatic 1.9.6 follow-up. The missing-constructor and continuity-only statements below describe the earlier session and are superseded for StarX. [New report](../starx-validation-1.9.6.md). SPCC/fresh-solve scope is unchanged.

Date: 29 October 2026. Runtime: PixInsight Core 1.9.6 Lockhart x64, macOS.
Tested processing snapshot: `31a7c48782d4b466cb1d784429298a9b75117daa` on `cpd-review`.
Scope: four products; PolyMask excluded.

**Author disposition: accepted to continue with the CPD request.** The author accepts SPCC, fresh solving and StarXTerminator based on previously reported operation. This is an author-approved compatibility assumption, not a claim that these operations completed successfully during this 1.9.6 session.

The final candidate adds the header editor's 1.0.0 version label and updates documentation and hashes after that tested snapshot. Only the header editor's feature-description text and dialog title change in executable sources; no processing algorithms change. The manifest and SHA256SUMS.txt identify the final files.

| Product | Native result |
| --- | --- |
| FITS/XISF Header Editor 1.0.0 | Interface, simulation, new FITS/XISF fields, copy/readback, unchanged source pixels, existing-destination skip and overwrite with/without backup passed on owned synthetic fixtures. Progress reset/search/read/re-enable states passed. The 1.0.0 label identifies the tested implementation. |
| Astrometric Solution Copy 1.1 | Real detection and registered-copy verification passed with 480 matched stars and zero median/p90 displacement. Native solution transfer and blocking of an unauthorized target passed. |
| Focal Length Blend 0.11.5 | Production HTTPS download, astrometric reprojection of real solved starless samples, fixed 1500 × 1500 canvas, coverage/polygon mask, MLT blending, comparison dialog and Create Blended Image passed. Saved XISF reopened with astrometry. |
| RGB DualBand Solver SPCC 0.14.2 | Interface/SPCC response selectors, real coordinate reprojection/crop, red-channel composition and WCS propagation passed. A real image translated 18 × 9 pixels passed production StarAlignment and common crop. SPCC completion remains an accepted assumption. |

## Native download verification

The original `tests/Test_Sample_Download_PixInsight.js` was executed first, unchanged, with a console-capture wrapper. Native abc/empty SHA-256 vectors, verified replacement, rejection of equal-size altered content and destination preservation passed. The automation instance acknowledged the informational result dialog.

The production `MF_saveSampleZip` then downloaded the real archive through HTTPS curl, without a Node transfer adapter, verified it, published it and hashed it again natively:

- Expected and actual bytes: **85,376,365**.
- SHA-256: **9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26**.
- Transfer plus production verification plus the second native hash: **52.552 seconds**.
- Independent Python SHA-256 and every ZIP entry's CRC: passed.

The earlier eleven Node tests remain a separate source of evidence. ByteArray.at() emitted a deprecation warning but did not fail native verification. Windows/Linux execution was not tested in this session.

## Astrometric and blending evidence

Real sample solutions, including their distortion models, were reused. Reprojection kept the short-focal grid at 1500 × 1500; valid geometric coverage was about 5.012%. Focal blending used polygonal circular coverage, sigma 16 px, native MLT layers 1–3, intensity 35% and relative detail gain 0.5. The contrast estimate was 0.791972 (R² 0.96248). Sky-coordinate correspondence and exterior-mask protection passed.

For RGB geometry, the different-focal samples were used as geometric/arithmetic fixtures, **not as a scientifically valid linear RGB/Ha pair**. Coordinate mode produced a 148 × 363 common crop at (649,445), with preserved celestial coordinates. StarAlignment could not register this particular different-scale/field pair directly; that failure is retained in the record. A controlled 18 × 9 px translation of the same real image did register and produced a 1478 × 1487 crop. This supports the native StarAlignment API path, not universal registration success.

The Focal blend and the uncalibrated RGB geometry result were saved and reopened; both retained valid native solutions. Source samples were not overwritten. Only disposable synthetic header fixtures were used for overwrite tests.

## Limits accepted by the author

- **SPCC:** execution failed before calibration because the configured Gaia DR3/SP file was on an absent external volume. The user confirmed the catalog was unavailable here. No catalog paths or settings were changed. The samples are stretched; a valid linear prepared RGB/Dual Band pair and available spectral catalog are needed for direct photometric validation.
- **Fresh solution:** a real RD_solve attempt on an unsolved copy, seeded from the real solved image, did not return within a bounded run exceeding four minutes. Only that owned test instance was terminated. This attempt is inconclusive; no fresh-solve success or unverified cause is claimed.
- **StarXTerminator:** its constructor was unavailable in the V8 test instances. The no-StarX workflow was tested with solved starless samples. Separation/recombination are accepted based on prior operation, without a new 1.9.6 success claim.
- Interfaces were constructed and rendered programmatically and their captures inspected. Relevant native button/state callbacks were exercised; this was not an exhaustive physical mouse/keyboard session.
- The header editor retains its default legacy runtime; the other three scripts use V8. Legacy API warnings were observed without blocking successful checks.

These limitations do not block the author's decision to submit. They must not be represented as newly measured successes or as CPD approval. No certification, keys, signatures or update repository were created. Sanitized results are in [validation-results-1.9.6.json](../validation-results-1.9.6.json); complete logs and images remain with the author.


## Subsequent write-path safety update
The candidate was updated to Header Editor 1.0.1, Focal Length Blend 0.11.6 and RGB DualBand 0.14.3 with ProtectedPaths.jsh. This adds disk-write protection, not image-algorithm changes. New native guard/I/O regression checks passed on PixInsight 1.9.6. See [path-write-safety.md](../path-write-safety.md). Earlier processing results retain their original tested snapshot.
