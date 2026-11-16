import datetime as dt,hashlib,io,json,sys,tempfile,unittest,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from build_release import build,package_server_url
from verify_release_asset import verify,HTTPSOnly
BASE='https://github.com/crinconlab/pixinsight-scripts/releases/download/suite-2026.11.16/'
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name).resolve();self.src=self.root/'src';p=self.src/'scripts/crinconlab';p.mkdir(parents=True);(p/'Test.js').write_text('#feature-id Test : Crinconlab > Test');(p/'Test.xsgn').write_text('TEST FIXTURE NOT A REAL SIGNATURE');self.c=dict(package_id='test-suite',version='1',title='Test',description='Test fixture',pixinsight_versions='1.9.6:1.9.6',files=['scripts/crinconlab/Test.js'],entrypoints=['scripts/crinconlab/Test.js'],package_server_url=BASE,release_tag='suite-2026.11.16')
 def tearDown(self):self.tmp.cleanup()
 def make(self):return build(self.c,self.src,self.root/'build',dt.date(2026,11,16))
 def test_external_server(self):
  d=self.make();p=ET.parse(d/'updates.xri').find('./platform/package');self.assertEqual(p.get('serverURL'),BASE);self.assertNotIn('/',p.get('fileName'));plan=json.loads((d/'release-plan.json').read_text());self.assertEqual(plan['download_url'],BASE+p.get('fileName'));self.assertEqual(hashlib.sha256((d/p.get('fileName')).read_bytes()).hexdigest(),plan['sha256'])
 def test_missing_signature(self):
  (self.src/'scripts/crinconlab/Test.xsgn').unlink()
  with self.assertRaises(ValueError):self.make()
 def test_legacy_relative(self):
  del self.c['package_server_url'];self.assertIsNone(ET.parse(self.make()/'updates.xri').find('./platform/package').get('serverURL'))
 def test_unsafe_server(self):
  for url in [BASE.replace('https:','http:'),BASE+'?x=1',BASE+'#x',BASE.replace('github.com','evil.example'),BASE.replace('suite-2026.11.16','latest'),BASE.rstrip('/'),BASE.replace('suite-2026.11.16','..')]:
   with self.subTest(url=url),self.assertRaises(ValueError):package_server_url(dict(self.c,package_server_url=url))
 def test_tag_mismatch(self):
  with self.assertRaises(ValueError):package_server_url(dict(self.c,release_tag='different'))
 def test_unsafe_files(self):
  for name in ['../key.xssk','scripts/crinconlab/.secret','scripts/crinconlab/private.xssk']:
   with self.subTest(name=name),self.assertRaises(ValueError):build(dict(self.c,files=self.c['files']+[name]),self.src,self.root/'build',dt.date.today())
 def test_no_overwrite(self):
  self.make()
  with self.assertRaises(ValueError):self.make()
 def test_matching_download(self):
  d=self.make();plan=json.loads((d/'release-plan.json').read_text());payload=(d/plan['asset']).read_bytes()
  class Response(io.BytesIO):
   def geturl(self):return 'https://release-assets.githubusercontent.com/test'
  self.assertTrue(verify(plan,d/'updates.xri',lambda *a,**kw:Response(payload))['verified'])
 def test_corruption(self):
  d=self.make();plan=json.loads((d/'release-plan.json').read_text())
  class Response(io.BytesIO):
   def geturl(self):return 'https://release-assets.githubusercontent.com/test'
  with self.assertRaises(ValueError):verify(plan,d/'updates.xri',lambda *a,**kw:Response(b'corrupt'))
 def test_index_plan_mismatch(self):
  d=self.make();plan=json.loads((d/'release-plan.json').read_text());plan['asset']='https://evil.example/file.zip'
  with self.assertRaises(ValueError):verify(plan,d/'updates.xri',lambda *a,**kw:None)
 def test_redirect_downgrade(self):
  with self.assertRaises(ValueError):HTTPSOnly().redirect_request(None,None,302,'Found',{},'http://example.com/file')
if __name__=='__main__':unittest.main()
