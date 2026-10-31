// Native PJSR file/hash smoke test. Run from the PixInsight script editor.
// Keep this tests/ directory beside src/. Does not perform a network transfer.
#engine v8
#define CR_MF_LIBRARY
#include "../src/scripts/crinconlab/Mezcla_Focales.js"

function MF_nativeSampleVerificationTest()
{
   function check(ok,message){if(!ok)throw new Error("FAIL: "+message);}
   var prefix=File.systemTempDirectory+"/CR_MF_SHA256_Test_"+Date.now()+"_"+Math.floor(Math.random()*1000000000);
   var input=prefix+".bin",output=prefix+".zip";
   var originalSize=MF_SAMPLE_BYTES,originalHash=MF_SAMPLE_SHA256;
   var abc="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
   try
   {
      File.writeTextFile(input,"abc");
      check(MF_fileSHA256(input)===abc,"native file bytes and SHA-256 for abc");
      File.writeTextFile(input,"");
      check(MF_fileSHA256(input)==="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","empty file SHA-256");
      // Small test data; production constants are restored even after failure.
      MF_SAMPLE_BYTES=3;MF_SAMPLE_SHA256=abc;
      File.writeTextFile(output,"previous archive");
      MF_saveSampleZip(output,function(partial){File.writeTextFile(partial,"abc");return 0;});
      check(MF_fileSHA256(output)===abc,"native verified publication and replacement");
      var rejected=false;
      try{MF_saveSampleZip(output,function(partial){File.writeTextFile(partial,"abd");return 0;});}
      catch(e){rejected=String(e).indexOf("SHA-256 mismatch")>=0;}
      check(rejected,"same-size altered file rejected");
      check(MF_fileSHA256(output)===abc,"existing destination retained after rejection");
      console.writeln("PASS: native file reads, SHA-256, verified publication and rejection of same-size tampering.");
      new MessageBox("Native sample verification tests passed. A real HTTPS transfer and the remaining workflow still require testing.","Focal Length Blend",StdIcon_Information,StdButton_Ok).execute();
   }
   finally
   {
      MF_SAMPLE_BYTES=originalSize;MF_SAMPLE_SHA256=originalHash;
      [input,output].forEach(function(p){if(File.exists(p))File.remove(p);});
   }
}
try{MF_nativeSampleVerificationTest();}
catch(e){console.criticalln(String(e));new MessageBox(String(e),"Focal Length Blend sample tests",StdIcon_Error,StdButton_Ok).execute();}
