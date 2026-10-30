# Focal Length Blend 0.11.7 — responsive sample download

30 October 2026. Only the optional sample downloader changes; image blending and astrometric algorithms are unchanged.

The previous implementation used a synchronous ExternalProcess.execute call with no transfer progress window, followed by native ByteArray.at() reads for hashing. This could make a working download appear stuck. Version 0.11.7 starts the same system curl utility asynchronously, polls with short bounded waits and pumps PixInsight UI events. It shows a dedicated blue task label, percentage and transferred/hashed MiB for separate Downloading and Verifying SHA-256 phases. Cancel requests stop the child transfer or verification; the existing destination is not replaced before verification succeeds. The setup is disabled during the operation, duplicate clicks are blocked and all busy states are restored on exit.

Native ByteArray blocks are converted to Uint8Array in bounded one-MiB chunks when available, with the existing adapter fallback retained. SHA-256 is still checked against the same embedded pin. HTTPS-only request/redirect restrictions, expected byte length, protected paths and replacement/rollback handling remain enabled. curl is still an auxiliary OS utility for data downloads, not an image processor. Low-speed connections time out after 30 seconds below 1024 bytes/second; the 30-second connection and 900-second overall limits remain. No browser opens. The destination picker prefers the current filePath API.

## Validation

Fourteen Node tests passed with the actual published ZIP, including hash vectors, streaming, tamper/error/rollback handling, protected destinations, duplicate-call blocking and cancellation preserving the destination.

Native PixInsight Core 1.9.6 x64/macOS tests invoked the actual setup Download button callback. Consent and destination selection used explicit test providers; the native progress dialog, real curl transfers, PJSR event loop and SHA-256 executed normally. This is not a claim of exhaustive physical mouse/file-picker testing.

- First real button callback: passed, 9.449 seconds including a second native hash check; 113 UI timer callbacks during transfer and 78 during verification. Three reentrant click attempts started no additional transfers.
- Second consecutive callback: passed, 8.135 seconds including rehashing; correctly replaced the first verified archive.
- Archive: 85,376,365 bytes; SHA-256 9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26.
- Cancel during native verification: passed; previous destination preserved.
- Cancel during a real curl transfer: passed; previous destination preserved and partial download removed.
- Native Cancel control and UI unlock: passed.

Timings depend on the network and computer. Windows/Linux native execution remains untested in this session. The older SPCC/fresh-solve/StarX validation scope is unchanged; the author reports that StarX is installed and working in his interactive environment. See the earlier report for the exact automated scope.
