#ifndef CRINCONLAB_PROTECTED_PATHS
#define CRINCONLAB_PROTECTED_PATHS
// Shared ES5/PJSR guard. No external programs, settings edits or elevated access.
function CR_resolveWritePath(path)
{
   if(typeof path!="string" || !path.trim() || /[\x00-\x1f*?]/.test(path))throw new Error("Invalid output path.");
   if(path.replace(/\\/g,"/").split("/").indexOf("..")>=0)throw new Error("Choose an absolute output path without parent-directory segments.");
   var raw=File.fullPath(path).replace(/\\/g,"/"),prefix="/",parts;
   if(/^[A-Za-z]:/.test(raw) && raw.charAt(2)==="/"){prefix=raw.substring(0,3);raw=raw.substring(3);}
   else if(raw.indexOf("//")===0){parts=raw.substring(2).split("/");prefix="//"+parts.shift()+"/"+parts.shift()+"/";raw=parts.join("/");}
   else raw=raw.replace(/^\/+/,"");
   var queue=raw.split("/"),stack=[],links=0;
   while(queue.length)
   {
      var part=queue.shift();if(!part || part===".")continue;
      if(part===".."){if(stack.length)stack.pop();continue;}
      if(/Windows/i.test(String(CoreApplication.platform)) && (/[.: ]$/.test(part) || part.indexOf(":")>=0 || /~[0-9]/.test(part) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])([.]|$)/i.test(part)))throw new Error("Ambiguous Windows output path.");
      stack.push(part);var current=prefix+stack.join("/"),info=new FileInfo(current);
      if(info.isRedirectionPoint || info.isReparsePoint)throw new Error("Redirected Windows paths are not supported for writing. Choose a regular folder: "+current);
      if(info.isSymbolicLink)
      {
         if(++links>40)throw new Error("Too many symbolic links in output path.");
         var target=String(info.symbolicLinkTarget).replace(/\\/g,"/");if(!target)throw new Error("Cannot resolve symbolic link: "+current);
         stack.pop();
         if(target.charAt(0)==="/"){prefix="/";stack=[];target=target.replace(/^\/+/,"");}
         queue=target.split("/").concat(queue);
      }
   }
   return prefix+stack.join("/");
}
function CR_assertUserWritePath(path)
{
   var resolved=CR_resolveWritePath(path),roots=[CoreApplication.baseDirPath,CoreApplication.configDirPath,CoreApplication.appDirPath];
   if(!roots[0] || !roots[1])throw new Error("Cannot identify protected PixInsight directories; writing has been stopped.");
   function key(p){p=p.replace(/\/+$/,"");if(typeof p.normalize==="function")p=p.normalize("NFC");return p.toLowerCase();}
   var candidate=key(resolved);
   for(var i=0;i<roots.length;++i)if(roots[i])
   {
      var root=key(CR_resolveWritePath(String(roots[i])));
      if(candidate===root || candidate.indexOf(root+"/")===0)throw new Error("Protected PixInsight location. Choose a folder outside its installation and configuration directories: "+resolved);
   }
   var info=new FileInfo(resolved);
   if(info.isFile && info.numberOfHardLinks>1)throw new Error("Writing to a file with multiple hard links is not supported: "+resolved);
   return resolved;
}
function CR_writeUserText(path,text)
{
   path=CR_assertUserWritePath(path);
   var temp,backup=null;
   do{temp=path+".cr-text-"+Date.now()+"-"+Math.floor(Math.random()*1000000000);}while(File.exists(temp)||File.directoryExists(temp));
   temp=CR_assertUserWritePath(temp);
   try
   {
      File.writeTextFile(temp,text);
      CR_assertUserWritePath(path);
      if(File.exists(path))
      {
         backup=CR_assertUserWritePath(temp+".previous");
         File.moveFile(backup,path);
      }
      try{File.moveFile(path,temp);}
      catch(e)
      {
         if(backup)try{File.moveFile(path,backup);backup=null;}catch(restoreError){throw new Error("Could not restore the previous manual. It remains at: "+backup+". "+String(restoreError));}
         throw e;
      }
      if(backup)try{File.remove(backup);}catch(cleanupError){console.warningln("Previous manual retained at: "+backup);}
   }
   finally{if(File.exists(temp))try{File.remove(temp);}catch(cleanupError){console.warningln("Temporary manual retained at: "+temp);}}
}
#endif
