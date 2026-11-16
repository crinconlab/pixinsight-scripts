#engine v8
var root='/Users/carlosrincon/.codex/.chatgpt-projects/g-p-69dea18d364c819187d66dffa14c38cf/release-2026-11-16/',results=[];
for(var name of ['FITS_XISF_Header_Editor_EN.js','Mezcla_Focales.js','ProtectedPaths.jsh']){try{var p=root+'src/scripts/crinconlab/'+name;results.push({file:name,signature:name.endsWith('.jsh')?Security.getCodeSignature(p):Security.getScriptSignature(p)});}catch(e){results.push({file:name,error:String(e)});}}
File.writeTextFile(root+'validation/2026.11.16/retained-signatures.json',JSON.stringify(results,null,2));
