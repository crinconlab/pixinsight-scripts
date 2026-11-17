#engine v8
#define POLYMASK_LIBRARY
#include "../src/scripts/crinconlab/PolyMask_EN.js"
var checks=[],w=null,d=null,outputs=[];
function automatic(){var until=Date.now()+10000;while(d.cachedRevision!==d.revision&&Date.now()<until)CoreApplication.processEvents(true);return d.cachedRevision===d.revision;}
function check(v,name){checks.push({name:name,passed:!!v});if(!v)throw new Error(name);}
try{
 w=new ImageWindow(800,600,3,32,true,true,PM_unique('BlurRegression'));
 w.mainView.beginProcess();try{w.mainView.image.fill(.4);}finally{w.mainView.endProcess();}
 d=new PM_MaskDialog(w.mainView,8);d.live.checked=true;d.previewTimer.stop();d.fullRegionButton.onClick();d.previewTimer.stop();d.feather.value=0;d.invalidate();d.previewTimer.stop();
 d.selection.points=[{x:180,y:140},{x:600,y:140},{x:600,y:460},{x:180,y:460}];d.selection.closed=true;d.invalidate();d.previewTimer.stop();
 check(d.calculate(false),'Initial full preview');
 d.showOnlyActive.checked=true;d.showOnlyActive.onCheck();d.previewTimer.stop();
 for(var blur of [.05,1,31.4,0,.08,.2,12,0]){
  d.finalBlur.setValue(blur);d.finalBlur.onValueUpdated();
  check(automatic(),'Active-region automatic blur preview '+blur);
  check(d.liveCache.output&&!d.liveCache.output.isNull&&d.liveCache.output.mainView!==null,'Reusable buffer survives blur '+blur);
 }
 d.showOnlyActive.checked=false;d.showOnlyActive.onCheck();d.previewTimer.stop();d.finalBlur.setValue(18);d.finalBlur.onValueUpdated();d.previewTimer.stop();check(d.calculate(true),'Complete automatic blur preview');
 var before=new Float32Array(d.cachedMask.mainView.image.width*d.cachedMask.mainView.image.height);d.cachedMask.mainView.image.getSamples(before);
 d.finalBlur.setValue(0);d.finalBlur.onValueUpdated();d.previewTimer.stop();check(d.calculate(true),'Automatic blur removal');
 var after=new Float32Array(before.length);d.cachedMask.mainView.image.getSamples(after);check(after.some(function(v,i){return Math.abs(v-before[i])>.00001;}),'Changing blur changes actual preview pixels');
 d.finalBlur.setValue(18);d.finalBlur.onValueUpdated();d.previewTimer.stop();check(d.calculate(false,true),'Full-resolution blurred preview');
 d.outputName.text=PM_availableId('BlurRegressionOutput');var out=d.createOutput(false);if(out)outputs.push(out);check(out&&!out.isNull,'Final output after automatic blur changes');
 var work=new PM_Work;try{var expected=work.own(PM_makeRegions(w.mainView,d.regions,null,d.pipelineOptions()));var a=new Float32Array(800*600),b=new Float32Array(a.length);expected.mainView.image.getSamples(a);out.mainView.image.getSamples(b);check(a.every(function(v,i){return v===b[i];}),'Final output equals fresh native full pipeline');}finally{work.dispose();}
}catch(e){checks.push({error:String(e),line:e.lineNumber,status:d?d.status.text:''});}
finally{if(d)d.dispose();outputs.forEach(PM_close);PM_close(w);File.writeTextFile(File.fullPath(File.extractDirectory(#__FILE__)+"/../validation/2026.11.17/blur-regression.json"),JSON.stringify({core:CoreApplication.version,checks:checks},null,2));}
