#define METADATA_LIBRARY
#include "../src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js"
var out=File.systemTempDirectory+"/CrinconlabPathGuardTests/",r=[];
if(!File.directoryExists(out))File.createDirectory(out,true);
function check(name,fn){try{fn();r.push({name:name,ok:true});}catch(e){r.push({name:name,ok:false,error:String(e)});}File.writeTextFile(out+'header-results.json',JSON.stringify(r,null,2));}
function rejects(fn){var yes=false;try{fn();}catch(e){yes=true;}if(!yes)throw new Error('Protected write allowed');}
check('Legacy runtime protects core configuration',function(){rejects(function(){CR_writeUserText(CoreApplication.configDirPath+'/must-not-write.txt','x');});});
check('Header copy refuses installation destination before writing',function(){rejects(function(){runMetadata({inputDir:out,outputDir:CoreApplication.baseDirPath,changes:[],dryRun:false});});});
check('Header overwrite refuses installation source',function(){rejects(function(){runMetadata({inputDir:CoreApplication.baseDirPath,overwrite:true,changes:[],dryRun:false});});});
check('Low-level FITS writer rejects protected destination',function(){rejects(function(){writeFitsMetadataCopy('missing.fits',CoreApplication.configDirPath+'/must-not-write.fits',{changes:[]});});});
