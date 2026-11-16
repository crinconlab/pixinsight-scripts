#engine v8
#define RGB_DUAL_LIBRARY
#define POLYMASK_LIBRARY
#include "../src/scripts/crinconlab/RGB_Ha_Blend.js"
#include "../src/scripts/crinconlab/PolyMask_EN.js"
var root='/Users/carlosrincon/.codex/.chatgpt-projects/g-p-69dea18d364c819187d66dffa14c38cf/release-2026-11-16/validation/2026.11.16/',checks=[],notice=null;
function check(value,name){checks.push({name:name,passed:!!value});if(!value)throw new Error(name);}
try{
 var d=new RD_Dialog;
 check(d.noiseRecommendation.text==='Before running RGB Ha Blend, we recommend applying noise reduction with MLDenoise to both the RGB and Dual Band images.','Exact optional note is visible in image-selection dialog');
 check(d.noiseRecommendation.toolTip.indexOf('Optional')>=0,'Recommendation is explicitly optional');
 check(RD_HELP_TEXT.indexOf('This is optional')>=0,'Inline help identifies optional recommendation');
 check(RD_STARTUP_TEXT.indexOf('MLDenoise')<0,'No new per-run popup recommendation');
 check(d.windowTitle.indexOf('0.15.7')>=0,'RGB version updated');
 d.render().save(root+'rgb-setup.png');var h=new RD_HelpDialog;h.render().save(root+'rgb-help.png');
 var nd=new PM_WhatsNewDialog;check(!nd.suppress.checked,'News suppression is opt-in');nd.render().save(root+'polymask-news.png');
 var key=PM_NEWS_SETTINGS_KEY,DialogType=PM_WhatsNewDialog,shown=0,accept=true,hide=false,tmp='Crinconlab/PolyMask/tests/news-'+Date.now();
 try{PM_NEWS_SETTINGS_KEY=tmp;PM_WhatsNewDialog=function(){this.suppress={checked:hide};this.execute=function(){++shown;return accept;};};check(PM_showWhatsNew(false)&&shown===1,'News visible on first launch');hide=true;accept=false;PM_showWhatsNew(false);Settings.read(tmp,DataType_Boolean);check(!Settings.lastReadOK,'Closing news without OK leaves preference untouched');accept=true;PM_showWhatsNew(false);check(Settings.read(tmp,DataType_Boolean)===true,'Suppression preference persists');var old=shown;check(!PM_showWhatsNew(false)&&shown===old,'Suppressed news does not reappear');check(PM_HELP.indexOf('approximately 60%')>=0,'Release notes remain in Help');}finally{Settings.remove(tmp);PM_NEWS_SETTINGS_KEY=key;PM_WhatsNewDialog=DialogType;}

}catch(e){checks.push({error:String(e),line:e.lineNumber});}
File.writeTextFile(root+'native-results.json',JSON.stringify({version:CoreApplication.version,checks:checks},null,2));
