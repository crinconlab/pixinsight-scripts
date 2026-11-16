# Distribution and download counters — 2026.11.16

The signed suite ZIP is served directly from the existing raw GitHub repository. Users retain the same repository URL and Check for Updates workflow:

https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/

The final signed XML index omits package serverURL; fileName is relative to the repository. The exact ZIP was verified by size, SHA-1, SHA-256 and archive integrity. PixInsight 1.9.6 build 1718 verified the index signature and downloaded the selected suite successfully: 1 successful, 0 failed. Installation was scheduled; the application was not closed because the author had an unsaved image open. The temporary test repository was removed and all original repositories retained.

## Why Releases is a separate manual channel

The installed official PixInsight Update Repository Reference documents package/@serverURL as an alternate package-server base; fileName stays relative. Native acceptance testing showed that the updater rejected GitHub Releases' HTTP 302 redirect. Consequently the final index uses direct raw hosting. No intermediary service was introduced.

The same frozen signed ZIP is also attached to GitHub Release suite-2026.11.16 for manual downloads. Its counter does not include downloads made by Check for Updates from raw hosting.

## Query counters

Run `python3 tools/release_download_counts.py --tag suite-2026.11.16`, or inspect assets[].download_count at https://api.github.com/repos/crinconlab/pixinsight-scripts/releases/tags/suite-2026.11.16 . Choose the asset crinconlab-scripts-2026.11.16-264147971bf38db4.zip.

The counter counts asset downloads, not unique users, completed installations or script executions. Retries, tests and repeated downloads may contribute. This ZIP contains the entire suite, so its counter concerns the suite. Deleting/replacing an asset resets its asset-specific counter. Raw downloads cannot be measured retrospectively with this counter. The administrative counter tool is not installed with the scripts; no telemetry or tracking requests are added.

## Publication safeguards

All six source/code signatures and the final XML signature were verified natively. The public ZIP must exist and match the index before index activation. Do not alter signed source files, includes or the frozen ZIP. Any such change requires the relevant signatures and a new package. Historical signing-kit manifests inside the ZIP describe the pre-index state and are retained unchanged; this report records final distribution status.
