#engine v8
#define POLYMASK_LIBRARY
#include "../src/scripts/crinconlab/PolyMask_EN.js"
var root='/Users/carlosrincon/.codex/.chatgpt-projects/g-p-69dea18d364c819187d66dffa14c38cf/release-2026-11-16/validation/2026.11.16/',checks=[],d=null,w=null,outputs=[],notices=[],NativeMessageBox=MessageBox;
function check(v,name){checks.push({name:name,passed:!!v});if(!v)throw new Error(name);}
MessageBox=function(text,title,icon,button){this.execute=function(){notices.push({text:text,title:title,icon:icon,button:button});return StdButton_Ok;};};
try{
 console.beginLog();
 var newsKey=PM_NEWS_SETTINGS_KEY,NewsDialog=PM_WhatsNewDialog,testKey="Crinconlab/PolyMask/tests/news-"+Date.now(),shown=0,accepted=true,suppress=false;
 try{
  var realNews=new PM_WhatsNewDialog;check(!realNews.suppress.checked&&realNews.windowTitle.indexOf('1.0.0')>=0,'Native news dialog defaults and title');
  PM_NEWS_SETTINGS_KEY=testKey;PM_WhatsNewDialog=function(){this.suppress={checked:suppress};this.execute=function(){++shown;return accepted;};};
  check(PM_showWhatsNew(false)&&shown===1,'First startup shows news');
  check(PM_showWhatsNew(false)&&shown===2,'Unchecked notice remains visible next startup');
  suppress=true;accepted=false;PM_showWhatsNew(false);Settings.read(testKey,DataType_Boolean);check(!Settings.lastReadOK,'Closing without OK does not persist suppression');
  accepted=true;PM_showWhatsNew(false);check(Settings.read(testKey,DataType_Boolean)===true&&Settings.lastReadOK,'Checked OK persists only own preference');
  var before=shown;check(!PM_showWhatsNew(false)&&shown===before,'Persisted preference suppresses next startup');
  check(PM_showWhatsNew(true)&&shown===before+1,'Explicit force can display news again');
  check(PM_HELP.indexOf('approximately 60%')>=0&&PM_HELP.indexOf('1-pixel steps')>=0,'Help includes permanent release notes');
 }finally{Settings.remove(testKey);PM_NEWS_SETTINGS_KEY=newsKey;PM_WhatsNewDialog=NewsDialog;}

 w=new ImageWindow(384,256,3,32,true,true,PM_unique('ConsoleTest'));w.mainView.beginProcess();try{w.mainView.image.fill(.4);}finally{w.mainView.endProcess();}
 d=new PM_MaskDialog(w.mainView,8);d.live.checked=false;d.previewTimer.stop();d.refineTimer.stop();d.fullRegionButton.onClick();
 d.feather.value=16;d.feather.fine.onValueUpdated(2);check(d.feather.value===18,'Boundary fine slider adds two pixels');d.feather.fine.onValueUpdated(-1);check(d.feather.value===15,'Boundary fine slider subtracts one pixel');d.feather.value=249;d.feather.fine.onValueUpdated(10);check(d.feather.value===250,'Boundary fine slider clamps upper limit');d.feather.value=1;d.feather.fine.onValueUpdated(-10);check(d.feather.value===0,'Boundary fine slider clamps lower limit');d.feather.value=16;check(d.feather.fine.value===0&&d.feather.value===16,'Programmatic region value resets fine slider');d.lightLow.value=20;d.lightLow.fine.onValueUpdated(2);check(d.lightLow.value===20.2,'Lightness fine slider retains 0.1 L steps');d.lightLow.value=0;
 check(d.calculate(false,true),'Full-resolution polygon preview completes');
 console.flush();var log=console.logText().toString();check(log.indexOf('PolyMask: Computing the full-resolution mask')>=0&&log.indexOf('Computing region 1 of 1')>=0,'Console logs start and region progress');
 var samples=new Float32Array(384*256);d.cachedMask.mainView.image.getSamples(samples);
 d.outputName.text=PM_availableId('PolyMask_Beta18_Test');var out=d.createOutput();if(out)outputs.push(out);
 check(out&&!out.isNull&&out.mainView.image.width===384&&out.mainView.image.height===256,'Create Mask returns full-resolution output');
 var actual=new Float32Array(samples.length);out.mainView.image.getSamples(actual);check(actual.every(function(x,i){return x===samples[i];}),'Created output matches full-resolution preview exactly');
 check(notices.length===1&&notices[0].title==='Mask created'&&notices[0].text.indexOf(out.mainView.id)>=0&&notices[0].button===StdButton_Ok,'Single success notice contains actual mask name and OK');
 check(!d.busy&&!d.disposed&&d.create.enabled,'Editor remains usable after acknowledging success');
 var next=d.createOutput();if(next)outputs.push(next);check(next&&next.mainView.id!==out.mainView.id&&notices.length===2,'Second mask can be created in the same editor');
 d.outputName.text='1invalid';var count=notices.length;check(d.createOutput()===null&&notices.length===count,'Invalid output never shows a success notice');
 d.outputName.text=PM_availableId('PolyMask_Beta18_Attached');d.targetView.currentView=w.mainView;d.applyMask.checked=true;var attached=d.createOutput();if(attached)outputs.push(attached);check(attached&&!w.mask.isNull&&w.mask.mainView.id===attached.mainView.id&&notices[notices.length-1].text.indexOf("Assigned to image '"+w.mainView.id+"'")>=0,'Attached-mask notice identifies its target');
 d.outputName.text=PM_availableId('PolyMask_Beta18_Apply');d.selection.points[0].x+=3;d.invalidate();count=notices.length;var applied=d.applyToTarget();if(applied)outputs.push(applied);check(applied&&notices.length===count+1&&notices[notices.length-1].text.indexOf('Assigned to image')>=0,'Apply Mask creates one notice after successful assignment');
 d.applyMask.checked=false;d.outputName.text=PM_availableId('PolyMask_Beta18_Separate');count=notices.length;var old=d.createdMasks.length;d.createSeparate();d.createdMasks.slice(old).forEach(function(x){outputs.push(x);});check(notices.length===count+1&&!d.busy,'Separate masks confirm creation once and release busy state');
 d.colorSelection.currentItem=1;d.colorSelection.onItemSelected(1);d.previewTimer.stop();check(d.calculate(true),'Reduced colour preview still completes');
 check(PM_projectData(d).scriptVersion==='1.0.0','Saved projects report current beta version');
 console.flush();log=console.logText().toString();check(log.indexOf('Mask created:')>=0&&log.indexOf('Rendering the mask preview')>=0,'Console records output completion and preview rendering');
}catch(e){checks.push({error:String(e),line:e.lineNumber});}
finally{MessageBox=NativeMessageBox;if(d)d.dispose();if(w&&!w.isNull){w.removeMask();w.forceClose();}outputs.forEach(function(x){if(x&&!x.isNull)x.forceClose();});console.endLog();File.writeTextFile(root+'v1-smoke.json',JSON.stringify({core:CoreApplication.version,checks:checks,notices:notices},null,2));}
