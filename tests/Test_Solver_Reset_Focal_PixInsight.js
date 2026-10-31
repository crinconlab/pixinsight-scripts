// Regression: Reset must preserve ImageSolver settings. No user image is modified.
#engine v8
#define CR_MF_LIBRARY
#include "../src/scripts/crinconlab/Mezcla_Focales.js"
function testResetIsolation(){
 var result={product:"Focal",ok:false}, sentinel="ImageSolver/CrinconlabResetTest_"+Date.now(), expected="Crinconlab/FocalLengthBlend";
 try {
  // Guard before executing the native reset method.
  if(SETTINGS_MODULE!==expected)throw new Error("Unexpected reset namespace: "+SETTINGS_MODULE);
  if(SOLVER_SETTINGS_MODULE!=="ImageSolver")throw new Error("Shared solver key changed");
  Settings.write(sentinel,DataType_String,"keep");
  var solver=new ImageSolver();
  solver.solverCfg.ResetSettings();
  if(Settings.read(sentinel,DataType_String)!=="keep")throw new Error("ImageSolver sentinel removed");
  result.ok=true;result.resetNamespace=SETTINGS_MODULE;result.sharedNamespace=SOLVER_SETTINGS_MODULE;
 }catch(e){result.error=String(e);}
 finally {Settings.remove(sentinel);}
 File.writeTextFile(File.systemTempDirectory+"/Crinconlab_Reset_Focal.json",JSON.stringify(result,null,2));
 if(!result.ok)throw new Error(result.error);
 console.writeln("PASS: Focal Reset preserves ImageSolver settings.");
}
testResetIsolation();
