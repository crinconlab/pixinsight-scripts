// Native macOS UI/curl tests: makes real sample transfers to a unique temp directory.
// Terms and destination selection are test-controlled; no arbitrary user files are used.
#engine v8
#define CR_MF_LIBRARY
#include "../src/scripts/crinconlab/Mezcla_Focales.js"
var root=File.systemTempDirectory+"/CrinconlabDownloadUITests-"+Date.now()+"/",report=[],out=root+'Sample.zip',ticks=0,phase='',phaseTicks={download:0,verify:0},attempts=0,selected=0,completed=0,owner=new MF_SetupDialog;
if(!File.directoryExists(root))File.createDirectory(root,true);
console.beginLog();
function assert(v,t){if(!v)throw new Error(t);}
function record(n,fn){try{var details=fn();report.push({name:n,ok:true,details:details});}catch(e){report.push({name:n,ok:false,error:String(e),stack:e.stack});}File.writeTextFile(root+'native-results.json',JSON.stringify(report,null,2));}
var realDownload=MF_downloadSampleFile,realSamples=MF_downloadSamples;
MF_downloadSamples=function(open,terms,o){return realSamples(open,function(){var d=new MF_SampleTermsDialog;d.agreeButton.onClick();return d.agreed;},o);};
MF_downloadSampleFile=function(o){return realDownload(o,{chooseFile:function(){selected++;return out;},completed:function(){completed++;},progress:function(p,done,total,d){phase=p;if(p==='verify' && done===total)d.render().save(root+'Download_Verification.png');}});};
var timer=new Timer(.02,true);timer.onTimeout=function(){ticks++;if(phaseTicks[phase]!==undefined)phaseTicks[phase]++;if(owner.downloadBusy && attempts<3){attempts++;owner.downloadButton.onClick();}};
try{
record('First real Download button click completes with responsive UI and no reentrant transfer',function(){timer.start();var start=Date.now();owner.downloadButton.onClick();timer.stop();assert(selected===1 && completed===1,'First-click did not complete once');assert(!MF_sampleDownloadBusy && !owner.downloadBusy && owner.enabled && owner.downloadButton.enabled,'UI did not unlock');assert(MF_fileSHA256(out)===MF_SAMPLE_SHA256,'Real archive hash mismatch');assert(phaseTicks.download>0 && phaseTicks.verify>0,'UI heartbeat stopped');return {seconds:(Date.now()-start)/1000,phaseTicks:phaseTicks,reentrantAttempts:attempts};});
record('Second real Download button click completes and replaces the first valid archive',function(){var start=Date.now();owner.downloadButton.onClick();assert(selected===2 && completed===2,'Second click failed');assert(MF_fileSHA256(out)===MF_SAMPLE_SHA256,'Replaced archive mismatch');return {seconds:(Date.now()-start)/1000};});
record('Cancel during native verification preserves an existing destination',function(){var target=root+'Cancel.zip';File.writeTextFile(target,'keep existing destination');var canceled=false,rejected=false;try{MF_saveSampleZip(target,function(partial){File.copyFile(partial,out);return 0;},{isCanceled:function(){return canceled;},progress:function(p){if(p==='verify')canceled=true;}});}catch(e){rejected=/canceled/.test(String(e));}assert(rejected && File.readTextFile(target)==='keep existing destination','Cancel did not preserve destination');});
record('Progress dialog cancellation control works',function(){var d=new MF_DownloadDialog;d.cancelButton.onClick();assert(d.cancelRequested && !d.cancelButton.enabled,'Cancel control inactive');});
}finally{timer.stop();MF_downloadSampleFile=realDownload;MF_downloadSamples=realSamples;}
File.writeTextFile(root+'native.log',console.endLog().utf8ToString());
