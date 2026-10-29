# Focal Length Blend 0.11.5 — sample ZIP verification

The optional sample download remains a data download, not a code installer or updater. The user must accept the usage terms and choose the output path before it starts.

## Pinned asset

- Release: `sample-images-v1.0` in `crinconlab/pixinsight-scripts`.
- Asset: `Crinconlab_Sample_Images.zip`, GitHub asset ID `670042048`.
- URL: `https://github.com/crinconlab/pixinsight-scripts/releases/download/sample-images-v1.0/Crinconlab_Sample_Images.zip`.
- Expected bytes: `85376365`.
- Expected SHA-256: `9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26`.

The pin was taken from GitHub's HTTPS release-asset metadata on 29 October 2026. A downloaded copy was independently hashed with SHA-256 and matched that digest and length. The production file-hash helper was also tested against that complete ZIP using Node file adapters. The digest is embedded in the script rather than downloaded and trusted afresh for each transfer. Publishing different samples requires an explicit pin update.

## Download and publication

`curl` uses `--proto =https` and `--proto-redir =https`; certificate verification is not disabled. A unique partial file is saved beside the user-selected destination. Length and incremental SHA-256 must match before publication. A same-size altered file is rejected. Partial files are removed on failure when possible.

An existing destination remains untouched during transfer/verification. During replacement it is moved to a unique adjacent `.previous-*` recovery path, restored after publication failure when possible and removed after success. If restoration or cleanup fails, its retained path is reported. No ZIP is automatically extracted and nothing downloaded is executed.

SHA-256 is implemented inside the script, reading at most one MiB at a time; no external hash program or additional library download is used. Image-processing calculations are unchanged.

## Tests and limits

```bash
CR_MF_SAMPLE_ZIP=/path/to/Crinconlab_Sample_Images.zip node --test tests/sample-download.test.cjs
```

Eleven tests passed, with no skipped tests when the real sample path was supplied. They cover known empty/abc/million-a vectors; binary padding boundaries and incremental input; native-style ByteArray access through file adapters; the complete published ZIP; same-size changes; truncation/transfer failures; replacement; rollback and failed rollback; read failures/cancellation; and HTTPS-only curl arguments on the supported platform identifiers. Without `CR_MF_SAMPLE_ZIP`, only the real-archive check is skipped; the tests make no network requests.

The eleven Node results exercise production JavaScript with file adapters. Subsequently, the original `tests/Test_Sample_Download_PixInsight.js` passed in PixInsight Core 1.9.6 x64 on macOS. A real production HTTPS transfer through `MF_saveSampleZip` also passed size and SHA-256 verification, followed by a second native hash and independent Python SHA-256/ZIP CRC checks. The 85,376,365-byte archive matched the pinned digest above. Transfer plus both native hashes took 52.552 seconds. ByteArray.at() produced a deprecation warning without failing the test. Windows and Linux native transfer execution was not tested in this session. See [the native validation report](validation-pixinsight-1.9.6.md) for the broader workflow and its limits.
