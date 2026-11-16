# Release assets, XRI and download counters

## Verified format

The official **PixInsight Update Repository Reference** installed with PixInsight 1.9.6 documents `package/@serverURL` as the alternate package-server base URL. `fileName` remains relative to that base. See the Package section, installed HTML lines 363–414:

- Installed reference: `/Applications/PixInsight/doc/docs/PIRepositoryReference/PIRepositoryReference.html`.
- Official web counterpart: https://pixinsight.com/doc/docs/PIRepositoryReference/PIRepositoryReference.html (web retrieval unavailable during this review; the installed reference was read).

Example structure only — **not a publishable index**:

```xml
<package
  fileName="FROZEN_ASSET_BASENAME.zip"
  serverURL="https://github.com/crinconlab/pixinsight-scripts/releases/download/suite-2026.11.16/"
  sha1="SHA1_OF_THE_ACTUAL_FINAL_ZIP"
  type="script" releaseDate="20261116">
  <title>C_Rinconlab Scripts 2026.11.16</title>
</package>
```

Do not place a full URL in `fileName`. Do not use `latest/download`, an API asset URL, a temporary signed `release-assets.githubusercontent.com` URL, or a private/draft asset as the public target.

Users keep:
`https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/`

Only the package-server metadata changes. PixInsight's normal Check for Updates, checksum checks and script/XML signature validation remain the installation path. The native Check for Updates path with the **new signed asset** is a mandatory final acceptance test, still pending signing and asset publication; HTTP tests alone do not establish updater behavior across redirects.

## Integrity and publication gates

1. Freeze and sign sources, including included code. Validate all six signatures natively in the intended installed PixInsight environment.
2. Build the deterministic ZIP and local unsigned index. SHA-1 is required by XRI; also record SHA-256, byte size and a hash-based immutable asset name.
3. Upload the actual frozen signed ZIP as a Release asset. Publish the Release so its browser_download_url works without credentials. The production index must not change yet.
4. Run `tools/verify_release_asset.py --build-dir build/<generated-directory>` against the public asset. It rejects changed content, unexpected names, non-HTTPS redirects and mismatched metadata. It verifies transport/content only, not source or XML signatures.
5. Sign the final `updates.xri` only after the asset exists. Validate its XML signature in PixInsight. Test that signed index via a temporary test repository and the real Check for Updates UI, including download, validation and installation. Remove the temporary test registration afterwards. Do not weaken signature/security settings to make the test pass.
6. Publish **only** the signed and tested index to the unchanged production repository. Preserve the previous index/package as rollback evidence. Never overwrite an asset under the same name after signing the index; create a new package/hash/tag revision when bytes change.

The current production index/package are deliberately unchanged. No future `updates.xri` has been generated in the source-signing kit because signatures determine final ZIP bytes/hashes.

## Counter per version

GitHub exposes `assets[].download_count`, alongside asset id, name and byte size:
https://docs.github.com/en/rest/releases/assets

For the final release:

```sh
python3 tools/release_download_counts.py --tag suite-2026.11.16
```

Or inspect the public endpoint:
`https://api.github.com/repos/crinconlab/pixinsight-scripts/releases/tags/suite-2026.11.16`

Select the entry whose name matches `release-plan.json` → `asset`. The admin script lives in tools/, not in the ZIP installed in PixInsight. No client-side telemetry, registration, callback or extra script request is involved. It queries GitHub only when an administrator explicitly runs it.

**Limits:** downloads are not unique users, completed installations, active users or script executions. Validation/automation and repeated downloads can contribute. The suite ZIP counter covers the entire suite. Separate sample-image downloads have separate counters. Retain asset ids and tags when making historical reports; deleting/replacing an asset creates a new counter. Public API calls are subject to GitHub rate limits. The counter cannot retrospectively measure old ZIPs served from raw repository paths, and source archives are not the same asset.

A real HTTPS redirect/byte-hash test was made against the existing historical PolyMask_0.1.0.zip asset solely as a transport fixture. It was not installed or executed. Its existing download counter was queried as an example. This is not a test of the new suite release or native updater.
