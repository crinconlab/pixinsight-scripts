#!/usr/bin/env python3
"""Verify a public Release asset before publishing its signed XRI. Does not publish."""
import argparse,hashlib,json,urllib.request,urllib.parse,xml.etree.ElementTree as ET
from pathlib import Path
from build_release import package_server_url
class HTTPSOnly(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if urllib.parse.urlsplit(newurl).scheme!='https':raise ValueError('Refused non-HTTPS redirect')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
def verify(plan,index,opener=None):
 # An unsigned local index may be used to verify an asset before index signing.
 # This function does NOT validate cryptographic XML/source signatures.
 package=ET.fromstring(Path(index).read_bytes().split(b'<Signature',1)[0]).find('./platform/package')
 if package is None:raise ValueError('Missing package declaration')
 base=package.get('serverURL');tag=plan['release_tag'];package_server_url({'package_server_url':base,'release_tag':tag})
 name=package.get('fileName')
 if name!=plan['asset'] or '/' in name or '\\' in name:raise ValueError('Unexpected asset name')
 if base!=plan['serverURL'] or package.get('sha1')!=plan['sha1']:raise ValueError('Index and plan differ')
 url=base+name
 if url!=plan['download_url']:raise ValueError('Download URL and plan differ')
 fetch=opener or urllib.request.build_opener(HTTPSOnly()).open
 request=urllib.request.Request(url,headers={'User-Agent':'Crinconlab-release-verification'})
 with fetch(request,timeout=120) as response:
  if urllib.parse.urlsplit(response.geturl()).scheme!='https':raise ValueError('Non-HTTPS final URL')
  h1=hashlib.sha1();h256=hashlib.sha256();size=0
  while True:
   block=response.read(1024*1024)
   if not block:break
   size+=len(block)
   if size>plan['bytes']:raise ValueError('Downloaded asset exceeds expected size')
   h1.update(block);h256.update(block)
 if size!=plan['bytes'] or h1.hexdigest()!=plan['sha1'] or h256.hexdigest()!=plan['sha256']:raise ValueError('Downloaded asset integrity mismatch')
 return {'url':url,'bytes':size,'sha256':h256.hexdigest(),'sha1':h1.hexdigest(),'verified':True,'scope':'HTTP bytes only; native signature and Check for Updates validation still required'}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--build-dir',type=Path,required=True);p.add_argument('--index',type=Path);a=p.parse_args();plan=json.loads((a.build_dir/'release-plan.json').read_text());print(json.dumps(verify(plan,a.index or a.build_dir/'updates.xri'),indent=2))
