// Native macOS UI/curl tests: makes real sample transfers to a unique temp directory.
// Terms and destination selection are test-controlled; no arbitrary user files are used.
#engine v8
#define CR_MF_LIBRARY
#include "../src/scripts/crinconlab/Mezcla_Focales.js"
var root=File.systemTempDirectory+"/CrinconlabDownloadUITests-"+Date.now()+"/",path=root+'CancelTransfer.zip',cancel=false,rejected=false,r={};console.beginLog();if(!File.directoryExists(root))File.createDirectory(root,true);File.writeTextFile(path,'keep previous destination');
if(!File.directoryExists(root))File.createDirectory(root,true);
try{MF_saveSampleZip(path,null,{isCanceled:function(){return cancel;},progress:function(phase,done){if(phase==='download' && done>0)cancel=true;}});}catch(e){rejected=/canceled/.test(String(e));r.message=String(e);}
r.ok=cancel && rejected && File.readTextFile(path)==='keep previous destination';var f=new FileFind;if(f.begin(path+'.download-*')){r.partialRetained=true;r.ok=false;f.end();}
File.writeTextFile(root+'cancel-transfer.json',JSON.stringify(r,null,2));File.writeTextFile(root+'cancel-transfer.log',console.endLog().utf8ToString());
