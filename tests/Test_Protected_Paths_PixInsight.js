#engine v8
#define CR_MF_LIBRARY
#include "../src/scripts/crinconlab/Mezcla_Focales.js"
var out=File.systemTempDirectory+"/CrinconlabPathGuardTests/",report=[],dir=out+'fixtures-'+Date.now();
if(!File.directoryExists(out))File.createDirectory(out,true);
if(!File.directoryExists(dir))File.createDirectory(dir);console.beginLog();
function check(name,fn){try{fn();report.push({name:name,ok:true});}catch(e){report.push({name:name,ok:false,error:String(e),stack:e.stack});}File.writeTextFile(out+'native-results.json',JSON.stringify(report,null,2));}
function assert(v,t){if(!v)throw new Error(t);}
function reject(fn){var yes=false;try{fn();}catch(e){yes=true;}assert(yes,'Protected operation was allowed');}
check('Installation child, root, case alias and dot traversal blocked',function(){[CoreApplication.baseDirPath,CoreApplication.baseDirPath+'/must-not-write.zip',CoreApplication.baseDirPath.toUpperCase()+'/must-not-write.zip',CoreApplication.baseDirPath+'/sub/../must-not-write.zip'].forEach(function(p){reject(function(){CR_assertUserWritePath(p);});});});
check('Core configuration protected',function(){reject(function(){CR_writeUserText(CoreApplication.configDirPath+'/must-not-write.txt','x');});});
check('Sibling prefix is not mistaken for protected directory',function(){CR_assertUserWritePath(CoreApplication.baseDirPath+'-UserData/a.zip');});
check('Regular user text output and replacement work',function(){CR_writeUserText(dir+'/manual.txt','abc');CR_writeUserText(dir+'/manual.txt','def');assert(File.readTextFile(dir+'/manual.txt')==='def','Write/read mismatch');});
check('macOS temporary directory alias resolves safely',function(){var p=CR_assertUserWritePath(File.systemTempDirectory+'/cr-guard-unused.txt');assert(p.indexOf('/private/var/')===0,'Temp alias not canonicalized');});
check('Symlink into installation blocked; allowed folder alias resolved',function(){var bad=dir+'/protected-link',good=dir+'/normal-link';if(!File.exists(bad) && !File.directoryExists(bad))File.createSymbolicLink(bad,CoreApplication.baseDirPath);if(!File.directoryExists(good))File.createSymbolicLink(good,dir);reject(function(){CR_assertUserWritePath(bad+'/must-not-write.zip');});assert(CR_assertUserWritePath(good+'/normal.txt')===dir+'/normal.txt','Allowed alias resolution');});
check('File hard-link alias rejected',function(){var a=dir+'/hard-a',b=dir+'/hard-b';File.writeTextFile(a,'owned fixture');if(!File.exists(b))File.createHardLink(b,a);reject(function(){CR_writeUserText(b,'overwrite');});assert(File.readTextFile(a)==='owned fixture','Hard link original changed');});
check('Download is rejected before transfer into protected root',function(){var called=false;reject(function(){MF_saveSampleZip(CoreApplication.baseDirPath+'/must-not-write.zip',function(){called=true;return 0;});});assert(!called,'Transfer started before destination validation');});
check('Publication refuses protected target without moving source',function(){var f=dir+'/partial';File.writeTextFile(f,'owned fixture');reject(function(){MF_publishSampleZip(f,CoreApplication.configDirPath+'/must-not-write.zip');});assert(File.readTextFile(f)==='owned fixture','Source moved');});
check('Native hash/download replacement regression',function(){var size=MF_SAMPLE_BYTES,hash=MF_SAMPLE_SHA256;try{MF_SAMPLE_BYTES=3;MF_SAMPLE_SHA256='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';var p=dir+'/sample.zip';File.writeTextFile(p,'old');assert(MF_saveSampleZip(p,function(partial){File.writeTextFile(partial,'abc');return 0;}),'Publication failed');assert(MF_fileSHA256(p)===MF_SAMPLE_SHA256,'Hash mismatch');reject(function(){MF_saveSampleZip(p,function(partial){File.writeTextFile(partial,'abd');return 0;});});assert(File.readTextFile(p)==='abc','Existing destination damaged');}finally{MF_SAMPLE_BYTES=size;MF_SAMPLE_SHA256=hash;}});
File.writeTextFile(out+'native.log',console.endLog().utf8ToString());
