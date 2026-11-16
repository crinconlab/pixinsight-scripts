#!/usr/bin/env python3
"""Finalize metadata only after native signature verification. Does not publish or use keys."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'src/scripts/crinconlab'
report=ROOT/'signature-verification.json'
if not report.is_file():raise SystemExit('Run Verify_All_Signatures_PixInsight.js first; missing native report.')
rows=json.loads(report.read_text());required={'FITS_XISF_Header_Editor_EN.js','RGB_Ha_Blend.js','Mezcla_Focales.js','PolyMask_EN.js','ProtectedPaths.jsh','PolyMaskProjects.jsh'}
if len(rows)!=6 or {r.get('file') for r in rows}!=required or not all(r.get('signature',{}).get('valid') is True and r['signature']['developerId']=='Carlos_Rincon_Astrophoto' for r in rows):raise SystemExit('Missing/invalid native signatures. STOP.')
freeze=json.loads((ROOT/'docs/releases/2026.11.16/source-freeze.json').read_text())
for n,digest in freeze['files'].items():
 if hashlib.sha256((src/n).read_bytes()).hexdigest()!=digest:raise SystemExit('Frozen source changed; revalidate/re-sign and revise the freeze record: '+n)
# A report is evidence of the last native run; rerun it immediately before this tool.
for name in required:
 if not (src/Path(name).with_suffix('.xsgn')).is_file():raise SystemExit('Signature sidecar missing: '+name)
p=src/'manifest.json';m=json.loads(p.read_text());m['status']='source signatures verified; final index pending';m['sourceSigningStatus']='verified in the local PixInsight environment';m['filesToSign']=[]
for item in m['scripts']:item['sha256']=hashlib.sha256((src/item['script']).read_bytes()).hexdigest()
p.write_text(json.dumps(m,indent=2)+'\n')
paths=[p for p in src.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt'];(src/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(src).as_posix()+'\n' for p in sorted(paths)))
print('Metadata finalized. Signed source bytes unchanged. Build the ZIP next.')
