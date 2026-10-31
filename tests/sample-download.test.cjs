// Runs the production download/verification helpers with real Node file I/O.
// PJSR controls are not instantiated; this does not certify native API bindings.
const {test,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');

const script=path.join(__dirname,'../src/scripts/crinconlab/Mezcla_Focales.js');
const source=fs.readFileSync(script,'utf8').split('#ifndef CR_MF_LIBRARY')[0].replace(/^#.*$/gm,'');
let ctx,dir,events,opened,fail,downloadBytes;
function digest(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
class PJSRFile {
  constructor(){this.fd=null;this.position=0;}
  get isOpen(){return this.fd!==null;}
  get size(){return fs.fstatSync(this.fd).size;}
  openForReading(name){this.fd=fs.openSync(name,'r');this.position=0;opened.add(this);}
  read(type,count){
    if(fail==='read')throw Error('injected read failure');
    const bytes=Buffer.alloc(count),n=fs.readSync(this.fd,bytes,0,count,this.position);this.position+=n;
    return {at:i=>bytes[i]}; // Native ByteArray path, deliberately no [] indexing.
  }
  close(){fs.closeSync(this.fd);this.fd=null;opened.delete(this);}
  static fullPath(name){return path.resolve(name);}
  static exists(name){return fs.existsSync(name)&&fs.statSync(name).isFile();}
  static directoryExists(name){return fs.existsSync(name)&&fs.statSync(name).isDirectory();}
  static remove(name){events.push(['remove',name]);fs.unlinkSync(name);}
  static moveFile(destination,source){
    events.push(['move',destination,source]);
    if((fail==='publish'||fail==='restore')&&source.includes('.download-'))throw Error('injected publication failure');
    if(fail==='restore'&&source.includes('.previous-'))throw Error('injected restoration failure');
    if(fs.existsSync(destination))throw Error('destination exists');
    fs.renameSync(source,destination);
  }
}
beforeEach(()=>{
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'cr-mf-hash-'));events=[];opened=new Set();fail=null;downloadBytes=Buffer.from('abc');
  ctx=vm.createContext({Dialog:class{},Control:class{},File:PJSRFile,DataType_ByteArray:0,
    FileInfo:class{constructor(name){let st;try{st=fs.lstatSync(name);}catch(e){if(e.code!=='ENOENT' && e.code!=='ENOTDIR')throw e;}this.isSymbolicLink=!!st?.isSymbolicLink();this.symbolicLinkTarget=this.isSymbolicLink?fs.readlinkSync(name):'';this.isFile=!!st?.isFile();this.numberOfHardLinks=st?.nlink||0;this.exists=!!st;this.size=st?.size||0;}},
    CoreApplication:{baseDirPath:path.join(dir,'PixInsight'),configDirPath:path.join(dir,'CoreConfig'),platform:'MacOSX',ensureMinimumVersion(){},processEvents(){}},
    ExternalProcess:class{constructor(){this.isRunning=false;this.isStarting=false;this.exitCode=0;}start(program,args){events.push(['curl',program,args]);fs.writeFileSync(args[args.indexOf('--output')+1],downloadBytes);}waitForStarted(){return true;}waitForFinished(){return true;}get standardOutput(){return{utf8ToString(){return '';}};}},
    console:{abortRequested:false,writeln(){},warningln(){}}});
  const guard=fs.readFileSync(path.join(path.dirname(script),'ProtectedPaths.jsh'),'utf8').replace(/^#.*$/gm,'');
  vm.runInContext(guard,ctx,{filename:'ProtectedPaths.jsh'});
  vm.runInContext(source,ctx,{filename:script});
});
afterEach(()=>{assert.equal(opened.size,0,'file descriptors must be closed');fs.rmSync(dir,{recursive:true,force:true});});
function small(){ctx.MF_SAMPLE_BYTES=3;ctx.MF_SAMPLE_SHA256=digest(Buffer.from('abc'));return path.join(dir,'sample.zip');}
function transfer(bytes,code=0){return name=>{events.push(['transfer',name]);fs.writeFileSync(name,bytes);return code;};}
function noPartials(){assert.ok(fs.readdirSync(dir).every(n=>!n.includes('.download-')&&!n.includes('.previous-')));}

test('SHA-256 matches published empty, abc and million-a vectors',()=>{
  for(const [bytes,expected] of [
    [Buffer.alloc(0),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    [Buffer.from('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [Buffer.alloc(1000000,97),'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0']
  ]){
    const hash=new ctx.MF_SHA256;hash.update(bytes);assert.equal(hash.hex(),expected);assert.equal(hash.hex(),expected);
    assert.throws(()=>hash.update(Buffer.from('x')),/finalized/);
  }
});
test('binary padding/block boundaries and incremental updates match Node crypto',()=>{
  for(const n of [1,2,54,55,56,57,63,64,65,119,120,127,128,129,4097]){
    const bytes=Buffer.from(Array.from({length:n},(_,i)=>(i*37+11)&255)),hash=new ctx.MF_SHA256;
    for(let i=0;i<n;i+=13)hash.update(bytes.subarray(i,Math.min(n,i+13)));
    assert.equal(hash.hex(),digest(bytes),'length '+n);
  }
});
test('file hashing streams across one-MiB boundaries using native-style ByteArray access',()=>{
  const bytes=Buffer.alloc(2*1048576+73);for(let i=0;i<bytes.length;i++)bytes[i]=(i*17+91)&255;
  const name=path.join(dir,'binary.dat');fs.writeFileSync(name,bytes);
  assert.equal(ctx.MF_fileSHA256(name),digest(bytes));
});
test('the actual sample ZIP matches the production pin through the production file-hash helper',{
  skip:!process.env.CR_MF_SAMPLE_ZIP
},()=>{
  const name=process.env.CR_MF_SAMPLE_ZIP;
  assert.equal(fs.statSync(name).size,ctx.MF_SAMPLE_BYTES);
  assert.equal(ctx.MF_fileSHA256(name),ctx.MF_SAMPLE_SHA256);
});
test('a same-size altered download is rejected without replacing an existing destination',()=>{
  const output=small();fs.writeFileSync(output,'previous archive');
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abd'))),/SHA-256 mismatch/);
  assert.equal(fs.readFileSync(output,'utf8'),'previous archive');noPartials();
  assert.equal(events.some(e=>e[0]==='move'),false);
});
test('truncated downloads and transfer failures clean partials and preserve the destination',()=>{
  const output=small();fs.writeFileSync(output,'previous archive');
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('ab'))),/incomplete/);
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc'),23)),/transfer code 23/);
  assert.equal(fs.readFileSync(output,'utf8'),'previous archive');noPartials();
});
test('verified data is published successfully, replacing the old destination only after verification',()=>{
  const output=small();fs.writeFileSync(output,'previous archive');
  assert.equal(ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc'))),true);
  assert.equal(fs.readFileSync(output,'utf8'),'abc');noPartials();
  const firstMove=events.find(e=>e[0]==='move');assert.ok(firstMove[1].includes('.previous-'));
});
test('failed publication restores the previous destination and removes the partial',()=>{
  const output=small();fs.writeFileSync(output,'previous archive');fail='publish';
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc'))),/publication failure/);
  assert.equal(fs.readFileSync(output,'utf8'),'previous archive');noPartials();
});
test('failed restoration retains the old archive at the reported recovery path',()=>{
  const output=small();fs.writeFileSync(output,'previous archive');fail='restore';
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc'))),/previous file is preserved at/);
  const preserved=fs.readdirSync(dir).filter(n=>n.includes('.previous-'));assert.equal(preserved.length,1);
  assert.equal(fs.readFileSync(path.join(dir,preserved[0]),'utf8'),'previous archive');
  assert.equal(fs.readdirSync(dir).some(n=>n.includes('.download-')),false);
});
test('read errors and cancellation close files and leave the old destination unchanged',()=>{
  const output=small();fs.writeFileSync(output,'previous archive');fail='read';
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc'))),/read failure/);noPartials();
  fail=null;ctx.console.abortRequested=true;
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc'))),/canceled/);noPartials();
  ctx.console.abortRequested=false;ctx.CoreApplication.processEvents=()=>{ctx.console.abortRequested=true;};
  assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc'))),/canceled/);noPartials();
  assert.equal(fs.readFileSync(output,'utf8'),'previous archive');
});
test('curl uses HTTPS-only requests and redirects for both Windows identifiers and macOS',()=>{
  const output=small();
  for(const [platform,program] of [['MacOSX','/usr/bin/curl'],['Windows','curl.exe'],['MSWindows','curl.exe']]){
    ctx.CoreApplication.platform=platform;ctx.MF_saveSampleZip(output);
    const call=events.filter(e=>e[0]==='curl').at(-1);assert.equal(call[1],program);
    const args=call[2];assert.equal(args[args.indexOf('--proto')+1],'=https');
    assert.equal(args[args.indexOf('--proto-redir')+1],'=https');assert.equal(args.includes('--insecure'),false);
  }
  noPartials();
});

test('protected installation and configuration reject downloads before transfer',()=>{
 let called=false;for(const p of [path.join(ctx.CoreApplication.baseDirPath,'sample.zip'),path.join(ctx.CoreApplication.configDirPath,'sample.zip')])assert.throws(()=>ctx.MF_saveSampleZip(p,()=>{called=true;return 0;}),/Protected PixInsight/);assert.equal(called,false);
});

test('download reentrancy is blocked and guard resets after cancellation/error',()=>{
 let count=0;assert.equal(ctx.MF_downloadSamples(()=>{count++;assert.equal(ctx.MF_downloadSamples(()=>{count++;},()=>true),false);return true;},()=>true),true);assert.equal(count,1);assert.equal(ctx.MF_sampleDownloadBusy,false);assert.throws(()=>ctx.MF_downloadSamples(()=>{throw Error('injected');},()=>true),/injected/);assert.equal(ctx.MF_sampleDownloadBusy,false);assert.equal(ctx.MF_downloadSamples(()=>true,()=>false),false);assert.equal(ctx.MF_sampleDownloadBusy,false);
});
test('canceling verification preserves the old destination and removes partial data',()=>{
 const output=small();fs.writeFileSync(output,'previous archive');let cancel=false;assert.throws(()=>ctx.MF_saveSampleZip(output,transfer(Buffer.from('abc')),{isCanceled(){return cancel;},progress(phase){if(phase==='verify')cancel=true;}}),/canceled/);assert.equal(fs.readFileSync(output,'utf8'),'previous archive');noPartials();
});
