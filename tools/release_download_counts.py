#!/usr/bin/env python3
"""Read GitHub Release asset counters. This admin tool is never installed in PixInsight."""
import argparse,json,urllib.request,urllib.parse
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--tag',required=True)
a=p.parse_args()
u='https://api.github.com/repos/crinconlab/pixinsight-scripts/releases/tags/'+urllib.parse.quote(a.tag,safe='')
r=urllib.request.Request(u,headers={'Accept':'application/vnd.github+json','User-Agent':'Crinconlab-release-admin'})
with urllib.request.urlopen(r,timeout=30) as response:d=json.load(response)
print(json.dumps({'tag':d['tag_name'],'release':d['html_url'],'assets':[{'id':x['id'],'name':x['name'],'download_count':x['download_count'],'bytes':x['size']} for x in d['assets']]},indent=2))
