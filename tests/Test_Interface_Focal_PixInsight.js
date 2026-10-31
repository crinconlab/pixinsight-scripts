#engine v8
#define CR_MF_LIBRARY
#include "../src/scripts/crinconlab/Mezcla_Focales.js"
var result={ok:false};try{var d=new MF_SetupDialog;d.render().save(File.systemTempDirectory+"/Crinconlab_Interface_Focal.png");result.ok=true;result.title=d.windowTitle;}catch(e){result.error=String(e);}
File.writeTextFile(File.systemTempDirectory+"/Crinconlab_Interface_Focal.json",JSON.stringify(result,null,2));
