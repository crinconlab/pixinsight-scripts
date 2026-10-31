// Regression: Reset must preserve ImageSolver settings. No user image is modified.
#engine v8
#include <pjsr/DataType.jsh>
#define RGB_DUAL_LIBRARY
#include "../src/scripts/crinconlab/RGB_Ha_Blend.js"
function testResetIsolation(){
 var result={product:"RGB",ok:false}, sentinel="ImageSolver/CrinconlabResetTest_"+Date.now(), expected="Crinconlab/RGBHaBlend";
 try {
  // Guard before executing the native reset method.
  if(SETTINGS_MODULE!==expected)throw new Error("Unexpected reset namespace: "+SETTINGS_MODULE);
  if(SOLVER_SETTINGS_MODULE!=="ImageSolver")throw new Error("Shared solver key changed");
  Settings.write(sentinel,DataType_String,"keep");
  var solver=new ImageSolver();
  solver.solverCfg.ResetSettings();
  if(Settings.read(sentinel,DataType_String)!=="keep")throw new Error("ImageSolver sentinel removed");
  var entry=File.readTextFile(CoreApplication.baseDirPath+"/src/scripts/ImageSolver/ImageSolver.js");
  var match=entry.match(new RegExp('#define\\s+'+'VER'+'SION\\s+"([^"]+)"'));
  result.solverVersion=VERSION;result.detectedVersion=match?match[1]:null;
  if(!match || VERSION!==match[1])throw new Error("Installed solver version mismatch");
  var dialog=new ImageSolverDialog(solver.solverCfg,solver.metadata,true);
  dialog.render().save(File.systemTempDirectory+"/Crinconlab_Solver_RGB.png");
  result.solverVersion=VERSION;result.solverDialogRendered=true;
  result.ok=true;result.resetNamespace=SETTINGS_MODULE;result.sharedNamespace=SOLVER_SETTINGS_MODULE;
 }catch(e){result.error=String(e);}
 finally {Settings.remove(sentinel);}
 File.writeTextFile(File.systemTempDirectory+"/Crinconlab_Reset_RGB.json",JSON.stringify(result,null,2));
 if(!result.ok)throw new Error(result.error);
 console.writeln("PASS: RGB Reset preserves ImageSolver settings.");
}
testResetIsolation();
