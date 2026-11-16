#engine v8
// Execute after importing the locally generated .xsgn files.
var root=File.fullPath(File.extractDirectory(#__FILE__)+"/../")+"/",results=[];
for(var name of ['FITS_XISF_Header_Editor_EN.js','RGB_Ha_Blend.js','Mezcla_Focales.js','PolyMask_EN.js','ProtectedPaths.jsh','PolyMaskProjects.jsh']){
 var p=root+'src/scripts/crinconlab/'+name;
 try{var sig=name.endsWith('.jsh')?Security.getCodeSignature(p):Security.getScriptSignature(p);results.push({file:name,signature:sig});}
 catch(e){results.push({file:name,error:String(e)});}
}
File.writeTextFile(root+'signature-verification.json',JSON.stringify(results,null,2));
var ok=results.every(function(r){return r.signature&&r.signature.valid&&r.signature.developerId==='Carlos_Rincon_Astrophoto';});
console.show();console.writeln(ok?'All six signatures are valid.':'STOP: at least one signature is missing or invalid. Review signature-verification.json.');
