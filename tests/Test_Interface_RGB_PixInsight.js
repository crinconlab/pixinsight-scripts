#engine v8
#define RGB_DUAL_LIBRARY
#include "../src/scripts/crinconlab/RGB_Ha_Blend.js"
var result={ok:false};try{var d=new RD_Dialog;d.render().save(File.systemTempDirectory+"/Crinconlab_Interface_RGB.png");result.ok=true;result.title=d.windowTitle;}catch(e){result.error=String(e);}
File.writeTextFile(File.systemTempDirectory+"/Crinconlab_Interface_RGB.json",JSON.stringify(result,null,2));
