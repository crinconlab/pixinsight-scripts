// Copyright © Carlos Rincón 2026
#feature-id CarlosRinconHeaderEditorEN : Crinconlab > FITS-XISF Header Editor
#feature-icon icons/header_editor_orange_v2.svg
#feature-info FITS keyword and XISF metadata editor, with simulation, recursive selection and save modes. English edition. Copyright &copy; Carlos Rinc&oacute;n 2026.

/* FITS_XISF_Header_Editor_EN.js — PixInsight PJSR. Default: save copies; simulation is optional.
 * Output: Sesion_1/Lights_Metadata (sibling of Lights_OK).
 * Single-image XISF/FITS. Existing outputs and symbolic links are skipped.
 */
#include <pjsr/PropertyType.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/DataType.jsh>

// Ordinary valued FITS keywords only; structural cards remain visible but read-only.
function protectedKeyword( name )
{
   return /^(SIMPLE|XTENSION|BITPIX|NAXIS\d*|EXTEND|PCOUNT|GCOUNT|BSCALE|BZERO|BLANK|END|CHECKSUM|DATASUM|COMMENT|HISTORY|CONTINUE|LONGSTRN|THEAP|TFIELDS|TBCOL\d*|TFORM\d*|Z[A-Z0-9_]*|ROWORDER)$/.test(name);
}
function validateChange( change, fits )
{
   if (!/^[A-Z][A-Z0-9_-]{0,7}$/.test(change.name) || protectedKeyword(change.name))
      throw new Error("Invalid name or structural/read-only keyword: " + change.name);
   if (/^(FILTER|CREATOR|OBJECT)$/.test(change.name) && change.type != "Text")
      throw new Error(change.name + " must be of type Text.");
   if (/^(EXPTIME|EXPOSURE)$/.test(change.name) && change.type != "Number")
      throw new Error(change.name + " must be of type Number.");
   if (change.type == "Number")
   {
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$/.test(change.value) ||
          !isFinite(Number(change.value.replace(/[dD]/,"e"))))
         throw new Error("Invalid number: " + change.name + ". Use a decimal point.");
   }
   else if (change.type == "Boolean")
   {
      if (change.value != "T" && change.value != "F") throw new Error("Boolean value: enter T or F.");
   }
   else if (change.type != "Text") throw new Error("Unsupported type");
   if (/[\r\n\x00-\x1f]/.test(change.value + change.comment)) throw new Error("Line breaks and control characters are not allowed.");
   if (fits) fitsChangeCard(change);
   return change;
}
function keywordLiteral( change )
{
   return change.type == "Text" ? "'" + change.value.replace(/'/g,"''") + "'" : change.value;
}
function fitsChangeCard( change )
{
   var line = change.name + new Array(9-change.name.length).join(" ") + "= " + keywordLiteral(change);
   if (change.comment.length) line += " / " + change.comment;
   if (/[^\x20-\x7e]/.test(line) || line.length > 80)
      throw new Error("FITS: value/comment too long or contains non-ASCII characters in " + change.name);
   return line + new Array(81-line.length).join(" ");
}
function metadataKeywords( keywords, changes )
{
   var result = [], changed = {};
   for(var i=0;i<changes.length;++i) changed[changes[i].name]=true;
   for(var k=0;k<keywords.length;++k)
      if(!changed[keywords[k].name.trim().toUpperCase()]) result.push(keywords[k]);
   for(var j=0;j<changes.length;++j)
      result.push(new FITSKeyword(changes[j].name,keywordLiteral(changes[j]),changes[j].comment));
   return result;
}
// A small explicit mapping keeps frequently edited XISF metadata consistent.
function mappedProperty( change )
{
   if (change.name == "FILTER" && change.type == "Text") return ["Instrument:Filter:Name",change.value,PropertyType_String];
   if (change.name == "CREATOR" && change.type == "Text") return ["User:Creator",change.value,PropertyType_String];
   if (change.name == "OBJECT" && change.type == "Text") return ["Observation:Object:Name",change.value,PropertyType_String];
   if ((change.name == "EXPTIME" || change.name == "EXPOSURE") && change.type == "Number")
      return ["Instrument:ExposureTime",Number(change.value.replace(/[dD]/,"e")),PropertyType_Float32];
   return null;
}
function verifyMetadata( reader, config )
{
   var keys = reader.keywords;
   for(var j=0;j<config.changes.length;++j)
   {
      var c=config.changes[j], count=0;
      for(var k=0;k<keys.length;++k)
         if(keys[k].name.trim().toUpperCase()==c.name)
         {
            ++count;
            var equal = c.type=="Number" ? Number(keys[k].strippedValue.replace(/[dD]/,"e"))==Number(c.value.replace(/[dD]/,"e")) : (c.type=="Text"?keys[k].strippedValue.replace(/''/g,"'"):keys[k].strippedValue)==c.value;
            if(!equal || keys[k].comment.trim()!=c.comment.trim()) throw new Error("Value/comment mismatch: " + c.name);
         }
      if(count!=1) throw new Error("Missing or duplicate keyword: " + c.name);
      var m=mappedProperty(c);
      if(reader.format.canStoreImageProperties && m)
      {
         var value=reader.readImageProperty(m[0]);
         var equalProperty = typeof m[1]=="number" ? Math.abs(value-m[1])<=1e-6*Math.max(1,Math.abs(m[1])) : value==m[1];
         if(!equalProperty)throw new Error("XISF property mismatch: " + m[0]);
      }
   }
}

// FITS: copy primary header cards and all following bytes without pixel re-encoding.
// Remove CHECKSUM because it covers the changed header; DATASUM remains valid.
function writeFitsMetadataCopy( input, output, config )
{
   var changed = {}, newCards = [];
   for(var i=0;i<config.changes.length;++i)
   {
      validateChange(config.changes[i],true);
      changed[config.changes[i].name]=true;
      newCards.push(fitsChangeCard(config.changes[i]));
   }
   var source = new File, target = new File;
   try
   {
      source.openForReading(input);
      var cards = [], ended = false, skipContinuation = false;
      while ( !ended )
      {
         if ( source.size-source.position < 2880 ) throw new Error("Incomplete FITS header");
         var block = source.read(DataType_ByteArray, 2880);
         for ( var offset=0; offset<2880; offset+=80 )
         {
            var line=block.toString(offset,80), name=line.substr(0,8).trim();
            if ( name == "END" ) { ended=true; break; }
            if(name == "CONTINUE" && skipContinuation)continue;
            skipContinuation=!!changed[name];
            if ( !changed[name] && name != "CHECKSUM" ) cards.push(line);
         }
      }
      cards=cards.concat(newCards);
      cards.push("END" + new Array(78).join(" "));
      var header=cards.join("");
      header+=new Array(((2880-header.length%2880)%2880)+1).join(" ");
      target.createForWriting(output);
      target.outText(header);
      while ( source.position < source.size )
      {
         processEvents();
         if ( console.abortRequested ) throw new Error("Aborted by user");
         target.write(source.read(DataType_ByteArray, Math.min(1048576,source.size-source.position)));
      }
   }
   finally { if(source.isOpen)source.close(); if(target.isOpen)target.close(); }
}

function runMetadata( config, progress, shouldStop )
{
   function clean( p ) { return File.fullPath( p ).replace( /\\/g, "/" ).replace( /\/+$/, "" ); }
   function exists( p ) { return File.exists( p ) || File.directoryExists( p ); }
   function noLink( p )
   {
      var f = new FileFind;
      if ( f.begin( p ) )
      {
         var link = f.isSymbolicLink;
         f.end();
         if ( link ) throw new Error( "Symbolic link refused: " + p );
      }
   }
   function closeFile( f )
   {
      if ( f != null && f.isOpen )
         try { f.close(); } catch ( e ) { console.warningln( String( e ) ); }
   }
   function requireOK( result, what )
   {
      if ( !result ) throw new Error( what );
   }
   function copyProperties( reader, writer, imageLevel )
   {
      var list = imageLevel ? reader.imageProperties : reader.properties;
      for ( var n = 0; n < list.length; ++n )
      {
         var id = ("id" in list[n]) ? list[n].id : list[n][0];
         var type = ("type" in list[n]) ? list[n].type : list[n][1];
         var replaced=false;
         if(imageLevel) for(var op=0;op<config.changes.length;++op)
         { var m=mappedProperty(config.changes[op]); if(m && m[0]==id) replaced=true; }
         if(replaced)continue;
         // Format-owned file metadata must describe the new file, not the original encoding.
         if ( !imageLevel && /^XISF:(CreationTime|CreatorApplication|CreatorModule|BlockAlignmentSize|MaxInlineBlockSize|CompressionCodecs|CompressionLevel|ChecksumAlgorithms|OutputHints)$/.test( id ) ) continue;
         var value = imageLevel ? reader.readImageProperty( id ) : reader.readProperty( id );
         requireOK( imageLevel ? writer.writeImageProperty( id, value, type ) :
                                writer.writeProperty( id, value, type ), "Cannot copy property: " + id );
      }
   }
   var overwrite = config.overwrite === true;
   var keepBackup = config.keepBackup !== false;
   var src = clean( config.inputDir ), dst = overwrite ? src : clean( config.outputDir );
   if ( !File.directoryExists( src ) ) throw new Error( "Input directory not found: " + src );
   if ( !overwrite && src.toLowerCase() == dst.toLowerCase() )
      throw new Error( "To use the source folder, select Overwrite originals." );
   var check = dst;
   while ( check.length > 1 ) { noLink( check ); check = File.extractDirectory( check ); }
   check = src;
   while ( check.length > 1 ) { noLink( check ); check = File.extractDirectory( check ); }
   if ( File.exists( dst ) ) throw new Error( "Output path is a file: " + dst );
   var backupRoot = src + "/Metadata_Backups";
   if (overwrite && keepBackup) noLink(backupRoot);
   var backupDir = backupRoot + "/" + new Date().toISOString().replace(/[:.]/g,"-") + "_" + Math.floor(Math.random()*1000000000);
   var files = [], find = new FileFind;
   if ( config.files )
   {
      for ( var n = 0; n < config.files.length; ++n )
      {
         var chosen = clean( config.files[n] );
         if ( File.extractDirectory( chosen ) != src || !/\.(xisf|fits|fit|fts)$/i.test( chosen ) )
            throw new Error( "Select FITS or XISF files from a single folder" );
         noLink( chosen );
         var basename = File.extractNameAndExtension( chosen );
         if ( files.indexOf( basename ) < 0 ) files.push( basename );
      }
   }
   else if ( find.begin( src + "/*" ) )
   {
      do {
         if ( find.isFile && !find.isSymbolicLink && /\.(xisf|fits|fit|fts)$/i.test( find.name ) )
            files.push( find.name );
      } while ( find.next() );
      find.end();
   }
   files.sort();
   var total = files.length;
   if ( config.maxFiles > 0 ) files = files.slice( 0, config.maxFiles );
   var stats = { found: total, selected: files.length, simulated: 0, saved: 0, skipped: 0, overwritten: 0, errors: 0 };
   if(progress)progress(stats,"");
   console.hide();
   console.writeln( "Metadata | " + (config.dryRun ? "SIMULATION" : "WRITE") );
   console.writeln( "Mode: " + (overwrite ? (keepBackup ? "OVERWRITE WITH BACKUP" : "OVERWRITE WITHOUT BACKUP") : "COPIES") );
   console.writeln( "Input: " + src + "\nOutput: " + dst + "\nFound: " + total );
   for ( var i = 0; i < files.length; ++i )
   {
      if(shouldStop && shouldStop())break;
      var input = src + "/" + files[i], output = dst + "/" + files[i];
      var reader = null, writer = null, verifier = null, image = null, temp = "", ownTemp = false;
      try
      {
         if(progress)progress(stats,input);
         processEvents();
         if ( console.abortRequested ) throw new Error( "Aborted by user" );
         if ( !overwrite && exists( output ) )
         {
            ++stats.skipped;
            console.writeln( "SKIP existing: " + output );
            continue;
         }
         // Low-level I/O avoids ImageWindow's automatic metadata migration.
         var suffix = File.extractExtension( input ).toLowerCase();
         var isXisf = suffix == ".xisf";
         var format = new FileFormat( suffix, true, true );
         if ( format.isNull || !format.canStoreKeywords || (isXisf && !format.canStoreImageProperties) )
            throw new Error( "XISF format or metadata support unavailable" );
         reader = new FileFormatInstance( format );
         var hints = isXisf ? "properties fits-keywords no-import-fits-keywords no-auto-metadata no-normalize" : "bottom-up";
         var descriptions = reader.open( input, hints );
         if ( !descriptions || descriptions.length != 1 )
            throw new Error( "Expected exactly one image in XISF" );
         var desc = descriptions[0];
         if ( desc.complexSample || (!desc.ieeefpSampleFormat && desc.bitsPerSample > 32) )
            throw new Error( "Unsupported sample format; file skipped without conversion" );
         image = new Image( 1, 1, desc.numberOfChannels, desc.colorSpace, desc.bitsPerSample,
                            desc.ieeefpSampleFormat ? SampleType_Real : SampleType_Integer );
         requireOK( reader.readImage( image ), "Cannot read image" );
         if ( reader.wasInexactRead ) throw new Error( "Inexact pixel read refused" );
         for(var op=0;op<config.changes.length;++op)validateChange(config.changes[op],!isXisf);
         var keywords = metadataKeywords( reader.keywords, config.changes );
         console.writeln( "[" + (i+1) + "/" + files.length + "] " + files[i] );
         var currentKeys=reader.keywords;
         for(var op=0;op<config.changes.length;++op)
         {
            var present=false;
            for(var kk=0;kk<currentKeys.length;++kk)if(currentKeys[kk].name.trim().toUpperCase()==config.changes[op].name)present=true;
            console.writeln((present?"UPDATE ":"ADD ")+config.changes[op].name+" => "+config.changes[op].value+" / "+config.changes[op].comment);
         }
         // Simulation reads pixels and properties but creates no directory or file.
         if ( config.dryRun )
         {
            var pp = format.canStoreImageProperties ? reader.imageProperties : [];
            for ( var q = 0; q < pp.length; ++q ) reader.readImageProperty( ("id" in pp[q]) ? pp[q].id : pp[q][0] );
            ++stats.simulated;
            continue;
         }
         if ( !File.directoryExists( dst ) ) File.createDirectory( dst );
         // Save under a unique temporary XISF name, reopen and verify before publishing.
         do { temp = dst + "/.metadata_" + Date.now() + "_" + Math.floor( Math.random()*1000000000 ) + suffix; }
         while ( exists( temp ) );
         ownTemp = true;
         if ( !isXisf ) writeFitsMetadataCopy( input, temp, config );
         else
         {
         writer = new FileFormatInstance( format );
         requireOK( writer.create( temp, hints + (isXisf ? " no-compress-data" : ""), 1 ), "Cannot create temporary XISF" );
         // Preserve resolution, pixel representation, and serialized processing history.
         desc.embedProperties = true;
         desc.embedProcessingHistory = true;
         requireOK( writer.setOptions( desc ), "Cannot set output image options" );
         requireOK( writer.setImageId( desc.id ), "Cannot preserve image identifier" );
         writer.keywords = keywords;
         if ( format.canStoreProperties ) copyProperties( reader, writer, false );
         if ( format.canStoreImageProperties ) copyProperties( reader, writer, true );
         if ( format.canStoreImageProperties )
         {
         for(var op=0;op<config.changes.length;++op)
         {
            var m=mappedProperty(config.changes[op]);
            if(m)requireOK(writer.writeImageProperty(m[0],m[1],m[2]),"Cannot write " + m[0]);
         }
         }
         if ( format.canStoreICCProfiles ) writer.iccProfile = reader.iccProfile;
         if ( format.canStoreRGBWS ) writer.rgbws = reader.rgbws;
         if ( format.canStoreDisplayFunctions ) writer.displayFunction = reader.displayFunction;
         if ( format.canStoreColorFilterArrays )
         {
            var cfa = reader.colorFilterArray;
            if ( cfa.length > 0 && cfa[0].length > 0 ) writer.colorFilterArray = cfa;
         }
         if ( format.canStoreThumbnails )
         {
            var thumb = reader.thumbnail;
            if ( !thumb.isEmpty ) { desc.embedThumbnail = true; requireOK( writer.setOptions( desc ), "Cannot enable thumbnail" ); writer.thumbnail = thumb; }
            thumb.free();
         }
         requireOK( writer.writeImage( image ), "Cannot write pixels" );
         if ( writer.wasLossyWrite ) throw new Error( "Lossy pixel write refused" );
         requireOK( writer.close(), "Cannot finalize XISF" );
         }
         verifier = new FileFormatInstance( format );
         var outputDescriptions = verifier.open( temp, hints );
         if ( !outputDescriptions || outputDescriptions.length != 1 ) throw new Error( "Invalid saved XISF image count" );
         verifyMetadata( verifier, config );
         var outDesc = outputDescriptions[0];
         if ( desc.width != outDesc.width || desc.height != outDesc.height ||
              desc.numberOfChannels != outDesc.numberOfChannels ||
              desc.bitsPerSample != outDesc.bitsPerSample || desc.ieeefpSampleFormat != outDesc.ieeefpSampleFormat )
            throw new Error( "Saved image geometry/sample format changed" );
         closeFile( verifier ); verifier = null;
         closeFile( reader ); reader = null;
         if (overwrite)
         {
            noLink(input);
            var backup;
            if(keepBackup)
            {
               noLink(backupRoot);
               if (!File.directoryExists(backupDir)) File.createDirectory(backupDir,true);
               backup = backupDir + "/" + files[i];
            }
            else
            {
               // Transient recovery file only; removed after verified replacement is installed.
               do { backup=src+"/.metadata_original_"+Date.now()+"_"+Math.floor(Math.random()*1000000000)+suffix; }
               while(exists(backup));
            }
            // Move only after the replacement is complete, closed and verified.
            File.moveFile(backup,input);
            try { File.moveFile(output,temp); }
            catch(publishError)
            {
               try
               {
                  if (!exists(input)) File.moveFile(input,backup);
                  else throw new Error("The original path is occupied");
               }
               catch(restoreError)
               {
                  throw new Error("Could not restore the original. It has been preserved at: " + backup + ". " + String(restoreError));
               }
               throw publishError;
            }
            ++stats.overwritten;
            if(keepBackup)console.writeln("ORIGINAL BACKUP: " + backup);
            else
            {
               try { File.remove(backup); }
               catch(cleanupError) { console.warningln("Replacement completed, but the temporary original could not be removed: "+backup+". "+String(cleanupError)); }
            }
         }
         else
         {
            if ( exists( output ) ) throw new Error( "Output appeared during processing; refusing overwrite" );
            File.moveFile( output, temp );
         }
         ownTemp = false;
         ++stats.saved;
         console.writeln( "SAVED AND VERIFIED: " + output );
      }
      catch ( e )
      {
         ++stats.errors;
         console.warningln( "ERROR " + input + ": " + String( e ) );
      }
      finally
      {
         closeFile( verifier ); closeFile( writer ); closeFile( reader );
         if ( image != null ) image.free();
         if ( ownTemp && File.exists( temp ) )
            try { File.remove( temp ); }
            catch ( e ) { console.warningln( "Could not remove temporary file: " + temp ); }
         if(progress)progress(stats,input);
      }
      if ( console.abortRequested ) break;
   }
   console.writeln( "SUMMARY " + JSON.stringify( stats ) );
   return stats;
}

#include <pjsr/Sizer.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>

function readHeaderSnapshot( path )
{
   var f=new FileFormatInstance(new FileFormat(File.extractExtension(path),true,false));
   try
   {
      var d=f.open(path, /\.xisf$/i.test(path) ? "properties fits-keywords no-import-fits-keywords no-auto-metadata" : "bottom-up");
      if(!d || d.length!=1)throw new Error("Only one image per file is supported: " + path);
      var rows=[],keys=f.keywords;
      for(var k=0;k<keys.length;++k)
      {
         var kw=keys[k],type=kw.isString?"Text":kw.isBoolean?"Boolean":kw.isNumeric?"Number":"Read-only";
         rows.push({name:kw.name,value:kw.isString?String(kw.strippedValue).replace(/''/g,"'"):String(kw.strippedValue),comment:kw.comment,type:type});
      }
      function appendProperties(imageLevel)
      {
         var list=imageLevel?f.imageProperties:f.properties;
         for(var n=0;n<list.length;++n)
         {
            var id=("id" in list[n])?list[n].id:list[n][0];
            var value=imageLevel?f.readImageProperty(id):f.readProperty(id);
            rows.push({name:id,value:String(value),comment:imageLevel?"XISF image property; read-only":"XISF file property; read-only",type:"Property"});
         }
      }
      if(f.format.canStoreImageProperties)appendProperties(true);
      if(f.format.canStoreProperties)appendProperties(false);
      return rows;
   }
   finally {if(f.isOpen)f.close();}
}

function normalizedHeaderPath(path)
{
   return File.fullPath(path).replace(/\\/g,"/").replace(/\/+$/,"");
}
function scanHeaderDirectory(root, outputDirectory, progress, shouldStop)
{
   root=normalizedHeaderPath(root);
   if(!File.directoryExists(root))throw new Error("Folder not found: " + root);
   var output=outputDirectory?normalizedHeaderPath(outputDirectory):"", files=[],errors=[];
   var probe=new FileFind;
   if(probe.begin(root)){var link=probe.isSymbolicLink;probe.end();if(link)throw new Error("Select an actual folder, not a symbolic link.");}
   var stack=[root],visited=0,entries=0;console.hide();console.writeln("Searching for FITS/XISF in: "+root);
   while(stack.length)
   {
      processEvents();if(console.abortRequested || (shouldStop && shouldStop()))throw new Error("Search canceled");
      var dir=stack.pop(),f=new FileFind;++visited;
      if(progress)progress(files.length,visited,stack.length,dir);
      try
      {
         if(!f.begin(dir+"/*"))continue;
         do
         {
            if(++entries%128===0){if(progress)progress(files.length,visited,stack.length,dir);processEvents();}
            if(shouldStop && shouldStop())break;
            if(f.name=="." || f.name==".." || f.isSymbolicLink)continue;
            var path=dir+"/"+f.name;
            if(f.isDirectory)
            {
               if(f.name=="Metadata_Backups" || f.name=="Headers_Metadata" ||
                  (output && path.toLowerCase()==output.toLowerCase()))continue;
               stack.push(path);
            }
            else if(f.isFile && !/^\.metadata_/.test(f.name) && /\.(fit|fits|fts|xisf)$/i.test(f.name))files.push(path);
         }while(f.next());
      }
      catch(e){errors.push(dir+": "+String(e));console.warningln("Skipped folder: "+dir+": "+String(e));}
      finally{f.end();}
      if(shouldStop && shouldStop())throw new Error("Search canceled");
      if(progress)progress(files.length,visited,stack.length,dir);
   }
   files.sort();console.writeln("Found: "+files.length);
   return {files:files,errors:errors};
}
// The low-level writer handles one source folder. Preserve relative paths across groups.
function runHeaderBatch(config,progress,shouldStop)
{
   if(!config.inputRoot)return runMetadata(config,progress,shouldStop);
   var root=normalizedHeaderPath(config.inputRoot),dest=normalizedHeaderPath(config.outputDir);
   if(!config.overwrite && root.toLowerCase()==dest.toLowerCase())throw new Error("The copies destination must differ from the source folder.");
   var groups=[],byFolder={};
   for(var i=0;i<config.files.length;++i)
   {
      var file=normalizedHeaderPath(config.files[i]);
      if(file.indexOf(root+"/")!=0)throw new Error("File outside the selected folder: "+file);
      var folder=File.extractDirectory(file),relative=folder==root?"":folder.substring(root.length+1);
      if(!(folder in byFolder))
      {
         byFolder[folder]=groups.length;
         groups.push({inputDir:folder,outputDir:config.overwrite?folder:dest+(relative?"/"+relative:""),files:[],
                      dryRun:config.dryRun,overwrite:config.overwrite,keepBackup:config.keepBackup,maxFiles:0,changes:config.changes});
      }
      groups[byFolder[folder]].files.push(file);
   }
   var total={found:0,selected:0,simulated:0,saved:0,skipped:0,overwritten:0,errors:0};
   for(var g=0;g<groups.length;++g)
   {
      processEvents();if(console.abortRequested || (shouldStop && shouldStop()))break;
      try
      {
         var result=runMetadata(groups[g],progress?function(local,path)
         {
            var aggregate={selected:config.files.length};
            var keys=["saved","simulated","skipped","errors","overwritten"];
            for(var n=0;n<keys.length;++n){var key=keys[n];aggregate[key]=total[key]+local[key];}
            progress(aggregate,path);
         }:null,shouldStop);
         for(var k in total)total[k]+=result[k];
      }
      catch(e){total.found+=groups[g].files.length;total.selected+=groups[g].files.length;total.errors+=groups[g].files.length;console.warningln("Folder error: "+groups[g].inputDir+": "+String(e));}
   }
   if(progress){var finalStats={selected:config.files.length,saved:total.saved,simulated:total.simulated,skipped:total.skipped,errors:total.errors};progress(finalStats,"");}
   console.writeln("RECURSIVE TOTAL "+JSON.stringify(total));return total;
}

function HeaderEditorDialog()
{
   this.__base__=Dialog;this.__base__();
   var self=this;
   this.paths=[];this.inputRoot=null;this.snapshots=[];this.changes=[];this.visibleRows=[];this.config=null;
   this.windowTitle="FITS / XISF Header Editor";
   function label(text){var l=new Label(self);l.text=text;l.wordWrapping=true;return l;}
   function button(text,callback){var b=new PushButton(self);b.text=text;b.onClick=callback;return b;}
   function row(controls){var r=new HorizontalSizer;r.spacing=6;for(var i=0;i<controls.length;++i)r.add(controls[i],controls[i] instanceof Edit?1:0);return r;}
   function tree(headings,height)
   {
      var t=new TreeBox(self);t.numberOfColumns=headings.length;t.headerVisible=true;t.rootDecoration=false;t.alternateRowColor=true;
      for(var i=0;i<headings.length;++i)t.setHeaderText(i,headings[i]);
      t.setScaledMinWidth(800);t.setScaledFixedHeight(height);return t;
   }
   this.intro=label("1. Select files. 2. Choose a keyword or enter a new one. 3. Add changes to the list, then simulate or save.");
   this.select=button("Select FITS / XISF...",function()
   {
      var p=new OpenFileDialog;p.multipleSelections=true;p.caption="Files from the same folder";
      p.filters=[["FITS and XISF",".fit",".fits",".fts",".xisf"]];
      if(p.execute())
      {
         self.beginLoading();
         try{self.setFiles(p.fileNames);}
         catch(e){self.taskStatus.text="Loading stopped: "+String(e);new MessageBox(String(e),"Could not read",StdIcon_Error,StdButton_Ok).execute();}
         finally{self.endLoading();}
      }
   });
   this.selectDirectory=button("Select folder and subfolders...",function()
   {
      var picker=new GetDirectoryDialog;picker.caption="Folder to search for FITS and XISF, including subfolders";
      if(!picker.execute())return;
      self.beginLoading();
      try
      {
         var excluded=/^(\/|[A-Za-z]:[\\/])/.test(self.folderEdit.text.trim())?self.folderEdit.text.trim():"";
         var scan=scanHeaderDirectory(picker.directory,excluded,function(found,visited,pending,path){self.showSearchProgress(found,visited,pending,path);},function(){return self.stopRequested;});
         self.setFiles(scan.files,picker.directory,true);
         var skipped=self.readErrors.length+scan.errors.length;
         new MessageBox("Files loaded: "+self.paths.length+"\nFolders/files with errors: "+skipped+"\nSubfolders have been included. Check the console for any errors.","Search complete",StdIcon_Information,StdButton_Ok).execute();
      }
      catch(e){self.taskStatus.text="Loading stopped: "+String(e);new MessageBox(String(e),"Could not read",StdIcon_Error,StdButton_Ok).execute();}
      finally{self.endLoading();}
   });
   this.sourceButtons=row([this.select,this.selectDirectory]);
   this.fileCombo=new ComboBox(this);this.fileCombo.setScaledMaxWidth(800);
   this.fileCombo.onItemSelected=function(){self.renderHeaders();self.updateDestination();};
   this.search=new Edit(this);this.search.toolTip="Filter by keyword name or property identifier";
   this.search.onTextUpdated=function(){self.renderHeaders();};
   this.headers=tree(["Keyword / property","Current value","Comment","Type"],190);
   this.headers.onCurrentNodeUpdated=function(node)
   {
      if(!node)return;
      var i=self.headers.childIndex(node),r=self.visibleRows[i];
      if(!r)return;
      self.detail.text=r.name+"\n"+r.value+"\n"+r.comment;
      if(r.type=="Property")return;
      self.nameEdit.text=r.name;self.valueEdit.text=r.value;self.commentEdit.text=r.comment;
      self.typeCombo.currentItem=r.type=="Number"?1:r.type=="Boolean"?2:0;
      self.markEditorClean();
   };
   this.detail=new TextBox(this);this.detail.readOnly=true;this.detail.setScaledFixedHeight(65);
   this.nameEdit=new Edit(this);this.nameEdit.setScaledMinWidth(110);
   this.typeCombo=new ComboBox(this);this.typeCombo.addItem("Text");this.typeCombo.addItem("Number");this.typeCombo.addItem("Boolean");
   this.valueEdit=new Edit(this);this.commentEdit=new Edit(this);
   this.editRow=row([label("Keyword:"),this.nameEdit,label("Type:"),this.typeCombo,label("Value:"),this.valueEdit]);
   this.commentRow=row([label("Comment:"),this.commentEdit]);
   this.add=button("Add / update change",function()
   {
      try{self.queueChange({name:self.nameEdit.text.trim().toUpperCase(),type:["Text","Number","Boolean"][self.typeCombo.currentItem],
                           value:self.typeCombo.currentItem==0?self.valueEdit.text:self.valueEdit.text.trim(),comment:self.commentEdit.text.trim()});self.markEditorClean();}
      catch(e){new MessageBox(String(e),"Review change",StdIcon_Warning,StdButton_Ok).execute();}
   });
   this.newButton=button("New keyword",function(){self.resetEditor();});
   this.editButtons=row([this.newButton,this.add]);
   this.pendingLabel=label("Pending changes (only the changes in this list are applied):");
   this.pending=tree(["Keyword","New value","New comment","Type"],85);
   this.pending.onCurrentNodeUpdated=function(node)
   {
      if(!node)return;var c=self.changes[self.pending.childIndex(node)];if(!c)return;
      self.nameEdit.text=c.name;self.valueEdit.text=c.value;self.commentEdit.text=c.comment;
      self.typeCombo.currentItem=c.type=="Number"?1:c.type=="Boolean"?2:0;
      self.markEditorClean();
   };
   this.remove=button("Remove selected change",function()
   {
      var n=self.pending.currentNode;if(!n)return;var i=self.pending.childIndex(n);self.changes.splice(i,1);self.renderChanges();
   });
   this.scope=new ComboBox(this);this.scope.addItem("All selected files");this.scope.addItem("Only the displayed file");
   this.modeCombo=new ComboBox(this);
   this.modeCombo.addItem("Save copies to another folder");
   this.modeCombo.addItem("Overwrite originals (with backup)");
   this.modeCombo.addItem("Overwrite originals WITHOUT backup");
   this.folderEdit=new Edit(this);this.folderEdit.text="Headers_Metadata";this.folderEdit.readOnly=true;
   this.browseButton=button("Choose folder...",function()
   {
      var picker=new GetDirectoryDialog;picker.caption="Choose the destination folder for copies";
      if(self.paths.length)picker.initialPath=File.extractDirectory(self.paths[0]);
      if(picker.execute()){self.folderEdit.text=picker.directory;self.updateDestination();}
   });
   this.modeCombo.onItemSelected=function(){self.updateDestination();};
   this.scopeRow=row([label("Apply to:"),this.scope,label("Save mode:"),this.modeCombo]);
   this.outputRow=row([label("Copies folder:"),this.folderEdit,this.browseButton]);
   this.destination=label("Select files to inspect their headers.");
   this.notice=label("Structural keywords, COMMENT and HISTORY are read-only. XISF properties are displayed for reference; FILTER, CREATOR, OBJECT and EXPTIME/EXPOSURE synchronize their corresponding properties.");
   this.simulation=new CheckBox(this);this.simulation.text="Simulation only (do not write files)";this.simulation.checked=false;
   this.runButton=button("Save copies",function()
   {
      try
      {
         self.config=self.makeConfig();
         if(self.config.overwrite && !self.config.dryRun)
            if(new MessageBox("This will replace " + self.config.files.length + " original files with their edited versions.\n" + (self.config.keepBackup ? "A backup of each original will be kept in Metadata_Backups." : "WITHOUT BACKUP: you cannot recover the previous version through this script.") + "\n\nContinue?", "Overwrite originals",StdIcon_Warning,StdButton_Yes,StdButton_No).execute()!=StdButton_Yes)return;
         self.runVisibleBatch(self.config);
      }
      catch(e){new MessageBox(String(e),"Review",StdIcon_Warning,StdButton_Ok).execute();}
   });
   this.simulation.onCheck=function(){self.updateDestination();};
   this.cancelButton=button("Close",function(){if(self.busy){self.stopRequested=true;self.taskStatus.text=self.loading?"Cancelling file loading…":"Stopping after the current file…";}else self.cancel();});
   this.bottom=new HorizontalSizer;this.bottom.spacing=8;this.bottom.add(this.simulation);this.bottom.addStretch();this.bottom.add(this.runButton);this.bottom.add(this.cancelButton);
   this.taskStatus=label("Ready. Select files and prepare your changes.");
   this.taskStatus.styleSheet="QLabel { color: #1670d2; font-weight: bold; }";
   this.countStatus=label("Updated: 0 · Remaining: 0");
   this.progressBar=new HeaderBatchProgress(this);
   this.busy=false;this.stopRequested=false;this.onClose=function(){return !self.busy;};
   this.batchControls=[this.select,this.selectDirectory,this.fileCombo,this.search,this.headers,this.nameEdit,this.typeCombo,this.valueEdit,this.commentEdit,this.add,this.newButton,this.pending,this.remove,this.scope,this.modeCombo,this.folderEdit,this.browseButton,this.simulation,this.runButton];
   this.copyrightLabel=label("Copyright © Carlos Rincón 2026");
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=5;
   var items=[this.intro,this.sourceButtons,this.fileCombo,row([label("Search:"),this.search]),this.headers,this.detail,this.editRow,this.commentRow,this.editButtons,
              this.pendingLabel,this.pending,this.remove,this.scopeRow,this.outputRow,this.destination,this.notice,this.taskStatus,this.countStatus,this.progressBar,this.bottom,this.copyrightLabel];
   for(var i=0;i<items.length;++i)this.sizer.add(items[i]);
   this.nameEdit.onTextUpdated=this.valueEdit.onTextUpdated=this.commentEdit.onTextUpdated=function(){self.updateDraftStatus();};
   this.typeCombo.onItemSelected=function(){self.updateDraftStatus();};
   this.markEditorClean();
   this.adjustToContents();
}
HeaderEditorDialog.prototype=new Dialog;
HeaderEditorDialog.prototype.editorFingerprint=function()
{
   return JSON.stringify([this.nameEdit.text,this.typeCombo.currentItem,this.valueEdit.text,this.commentEdit.text]);
};
HeaderEditorDialog.prototype.markEditorClean=function()
{
   this.editorBaseline=this.editorFingerprint();this.updateDraftStatus();
};
HeaderEditorDialog.prototype.resetEditor=function()
{
   this.nameEdit.text="";this.valueEdit.text="";this.commentEdit.text="";this.typeCombo.currentItem=0;this.markEditorClean();
};
HeaderEditorDialog.prototype.updateDraftStatus=function()
{
   this.pendingLabel.text="Pending changes: "+this.changes.length+
      (this.editorBaseline!=this.editorFingerprint()?" — The edited field will be added when you simulate or save.":" — You can add multiple keywords to this list.");
};
HeaderEditorDialog.prototype.commitEditorDraft=function()
{
   if(this.editorBaseline==this.editorFingerprint())return;
   this.queueChange({name:this.nameEdit.text.trim().toUpperCase(),type:["Text","Number","Boolean"][this.typeCombo.currentItem],
      value:this.typeCombo.currentItem==0?this.valueEdit.text:this.valueEdit.text.trim(),comment:this.commentEdit.text.trim()});
   this.markEditorClean();
};
HeaderEditorDialog.prototype.setFiles=function(paths,inputRoot,skipErrors)
{
   if(!paths.length)throw new Error("No FITS/XISF files were found.");
   var parent=File.extractDirectory(File.fullPath(paths[0])),root=inputRoot?normalizedHeaderPath(inputRoot):null;
   var snapshots=[],accepted=[],errors=[];
   this.showLoadingProgress(0,paths.length,"",0);
   for(var i=0;i<paths.length;++i)
   {
      var path=normalizedHeaderPath(paths[i]);
      if((root?path.indexOf(root+"/")!=0:File.extractDirectory(path)!=parent) || !/\.(fit|fits|fts|xisf)$/i.test(path))
         throw new Error("File outside the selected folder: "+path);
      this.showLoadingProgress(i,paths.length,path,errors.length);
      if(this.stopRequested || console.abortRequested)throw new Error("Reading canceled");
      try{snapshots.push(readHeaderSnapshot(path));accepted.push(path);}
      catch(e)
      {
         if(!skipErrors)throw e;
         errors.push(path+": "+String(e));console.warningln("Skipped file: "+path+": "+String(e));
      }
      this.showLoadingProgress(i+1,paths.length,path,errors.length);
      if(this.stopRequested)throw new Error("Reading canceled");
      if(skipErrors && (i+1)%25==0)console.writeln("Headers read: "+(i+1)+"/"+paths.length);
   }
   if(!accepted.length)throw new Error("No files could be read; check the console.");
   this.paths=accepted;this.inputRoot=root;this.snapshots=snapshots;this.readErrors=errors;this.changes=[];
   this.fileCombo.clear();
   for(var i=0;i<accepted.length;++i)
      this.fileCombo.addItem((i+1)+"/"+accepted.length+" — "+(root?accepted[i].substring(root.length+1):File.extractNameAndExtension(accepted[i])));
   this.fileCombo.currentItem=0;this.renderHeaders();this.renderChanges();this.resetEditor();this.updateDestination();this.resetBatchStatus();
};
HeaderEditorDialog.prototype.resetBatchStatus=function()
{
   this.config=null;this.stopRequested=false;this.progressBar.indeterminate=false;this.progressBar.value=0;
   this.taskStatus.text="Ready. "+this.paths.length+" files loaded for a new batch.";
   this.countStatus.text="Updated: 0 · Remaining: "+this.paths.length+" · Simulated: 0 · Skipped: 0 · Errors: 0";
   this.progressBar.repaint();this.taskStatus.repaint();this.countStatus.repaint();
};
HeaderEditorDialog.prototype.renderHeaders=function()
{
   this.headers.clear();this.visibleRows=[];
   var rows=this.snapshots[this.fileCombo.currentItem]||[],search=this.search.text.trim().toUpperCase();
   for(var i=0;i<rows.length;++i)
   {
      if(search && rows[i].name.toUpperCase().indexOf(search)<0)continue;
      this.visibleRows.push(rows[i]);var node=new TreeBoxNode(this.headers);
      var cells=[rows[i].name,rows[i].value.replace(/[\r\n]+/g," "),rows[i].comment,rows[i].type];
      for(var c=0;c<cells.length;++c)node.setText(c,cells[c]);
   }
   this.headers.setColumnWidth(0,190);this.headers.setColumnWidth(1,250);this.headers.setColumnWidth(2,260);
};
HeaderEditorDialog.prototype.queueChange=function(change)
{
   var fits=false;for(var i=0;i<this.paths.length;++i)if(!/\.xisf$/i.test(this.paths[i]))fits=true;
   validateChange(change,fits);
   // Avoid conflicting aliases for the same native XISF property.
   var mapping=mappedProperty(change);
   for(var i=0;i<this.changes.length;++i)
   {
      var other=mappedProperty(this.changes[i]);
      if(mapping && other && change.name!=this.changes[i].name && mapping[0]==other[0] && mapping[1]!=other[1])
         throw new Error("EXPTIME and EXPOSURE must have the same value.");
      if(this.changes[i].name==change.name){this.changes[i]=change;this.renderChanges();return;}
   }
   this.changes.push(change);this.renderChanges();
};
HeaderEditorDialog.prototype.renderChanges=function()
{
   this.pending.clear();
   for(var i=0;i<this.changes.length;++i)
   {
      var c=this.changes[i],n=new TreeBoxNode(this.pending),cells=[c.name,c.value,c.comment,c.type];
      for(var j=0;j<cells.length;++j)n.setText(j,cells[j]);
   }
   this.pending.setColumnWidth(0,140);this.pending.setColumnWidth(1,220);this.pending.setColumnWidth(2,300);this.updateDraftStatus();
};
HeaderEditorDialog.prototype.outputDirectory=function()
{
   var folder=this.folderEdit.text.trim();
   if (/^(\/|[A-Za-z]:[\\/])/.test(folder))return File.fullPath(folder);
   if(!this.paths.length)return folder;
   return File.extractDirectory(this.inputRoot || File.extractDirectory(File.fullPath(this.paths[0])))+"/"+folder;
};
HeaderEditorDialog.prototype.updateDestination=function()
{
   var overwrite=this.modeCombo.currentItem>0;
   this.folderEdit.enabled=!overwrite;this.browseButton.enabled=!overwrite;
   this.runButton.text=this.simulation.checked?"Simulate":overwrite?"Overwrite originals":"Save copies";
   this.destination.text=!this.paths.length?"Select files to inspect their headers.":overwrite?
      (this.modeCombo.currentItem==2?"Originals will be overwritten WITHOUT keeping a backup.":"Selected files will be replaced. Backups are stored in Metadata_Backups inside each source folder."):
      "Destination: "+this.outputDirectory()+(this.inputRoot?" (preserving subfolders)":"");
};
HeaderEditorDialog.prototype.makeConfig=function()
{
   if(!this.paths.length)throw new Error("Select files first.");
   this.commitEditorDraft();
   if(!this.changes.length)throw new Error("Enter a new keyword or add at least one change to the list.");
   var files=this.scope.currentItem==1?[this.paths[this.fileCombo.currentItem]]:this.paths.slice(0);
   var src=File.extractDirectory(File.fullPath(files[0])),overwrite=this.modeCombo.currentItem>0;
   var dst=overwrite?src:this.outputDirectory();
   if(!overwrite && !this.folderEdit.text.trim())throw new Error("Choose a destination folder.");
   if(!overwrite && (this.inputRoot || src).toLowerCase()==dst.toLowerCase())throw new Error("Choose another folder or select Overwrite originals.");
   // A selected output tree must not also be treated as a source tree.
   if(this.inputRoot && !overwrite)
   {
      var outputPrefix=normalizedHeaderPath(dst).toLowerCase()+"/";
      files=files.filter(function(path){return path.toLowerCase().indexOf(outputPrefix)!=0;});
      if(!files.length)throw new Error("The destination folder contains all selected files; choose another one.");
   }
   return {inputDir:src,inputRoot:this.inputRoot,outputDir:dst,files:files,dryRun:this.simulation.checked,overwrite:overwrite,keepBackup:this.modeCombo.currentItem!=2,maxFiles:0,changes:this.changes.slice(0)};
};
function HeaderBatchProgress(parent)
{
   this.__base__=Control;this.__base__(parent);this.value=0;this.indeterminate=false;this.phase=0;
   this.setScaledMinSize(200,24);this.setScaledFixedHeight(24);
   this.onPaint=function()
   {
      var g=new Graphics(this);
      try{g.fillRect(0,0,this.width,this.height,new Brush(0xffe5eaf0));if(this.indeterminate){var segment=Math.max(30,Math.round(this.width/5)),x=Math.round((this.width-segment)*(this.phase%20)/19);g.fillRect(x,0,x+segment,this.height,new Brush(0xff78b6f0));}else g.fillRect(0,0,Math.round(this.width*this.value/100),this.height,new Brush(0xff78b6f0));g.pen=new Pen(0xff14283c);g.font=this.font;g.drawText(8,this.height-7,this.indeterminate?"Searching…":this.value+" %");}
      finally{g.end();}
   };
}
HeaderBatchProgress.prototype=new Control;
HeaderEditorDialog.prototype.beginLoading=function()
{
   this.busy=true;this.loading=true;this.stopRequested=false;this.progressBar.value=0;
   for(var i=0;i<this.batchControls.length;++i)this.batchControls[i].enabled=false;
   this.cancelButton.text="Cancel loading";
   this.taskStatus.text="Loading files…";this.countStatus.text="Files found: 0 · Headers read: 0";
   this.progressBar.repaint();this.taskStatus.repaint();this.countStatus.repaint();processEvents();
};
HeaderEditorDialog.prototype.endLoading=function()
{
   this.busy=false;this.loading=false;this.stopRequested=false;this.progressBar.indeterminate=false;
   for(var i=0;i<this.batchControls.length;++i)this.batchControls[i].enabled=true;
   this.cancelButton.text="Close";this.updateDestination();this.progressBar.repaint();this.taskStatus.repaint();
};
HeaderEditorDialog.prototype.showSearchProgress=function(found,visited,pending,path)
{
   this.progressBar.indeterminate=true;++this.progressBar.phase;
   this.taskStatus.text="Searching folder: "+path;
   this.countStatus.text="Files found: "+found+" · Folders searched: "+visited+" · Folders pending: "+pending;
   this.progressBar.repaint();this.taskStatus.repaint();this.countStatus.repaint();processEvents();
};
HeaderEditorDialog.prototype.showLoadingProgress=function(done,total,path,errors)
{
   this.progressBar.indeterminate=false;this.progressBar.value=total?Math.floor(100*done/total):0;
   this.taskStatus.text="Reading headers"+(path?": "+File.extractNameAndExtension(path):"…");
   this.countStatus.text="Headers read: "+done+" / "+total+" · Remaining: "+(total-done)+" · Read errors: "+errors;
   this.progressBar.repaint();this.taskStatus.repaint();this.countStatus.repaint();processEvents();
};
HeaderEditorDialog.prototype.showBatchProgress=function(stats,path,dryRun)
{
   var done=stats.saved+stats.simulated+stats.skipped+stats.errors,remaining=Math.max(0,stats.selected-done);
   this.progressBar.value=stats.selected?Math.floor(100*done/stats.selected):0;
   if(!this.stopRequested)this.taskStatus.text=path?(dryRun?"Simulating: ":"Updating: ")+File.extractNameAndExtension(path):"Preparing batch…";
   this.countStatus.text="Updated: "+stats.saved+" · Remaining: "+remaining+" · Simulated: "+stats.simulated+" · Skipped: "+stats.skipped+" · Errors: "+stats.errors;
   this.progressBar.repaint();this.taskStatus.repaint();this.countStatus.repaint();
   processEvents();
};
HeaderEditorDialog.prototype.runVisibleBatch=function(config,services)
{
   if(this.busy)return;
   services=services || {};var self=this,result=null;
   this.busy=true;this.stopRequested=false;
   for(var i=0;i<this.batchControls.length;++i)this.batchControls[i].enabled=false;
   this.cancelButton.text="Stop after current file";
   try
   {
      this.showBatchProgress({selected:config.files.length,saved:0,simulated:0,skipped:0,errors:0},"",config.dryRun);
      result=(services.runBatch || runHeaderBatch)(config,function(stats,path){self.showBatchProgress(stats,path,config.dryRun);},function(){return self.stopRequested;});
      this.showBatchProgress({selected:config.files.length,saved:result.saved,simulated:result.simulated,skipped:result.skipped,errors:result.errors},"",config.dryRun);
      var done=result.saved+result.simulated+result.skipped+result.errors;
      this.taskStatus.text=done<config.files.length?"Batch stopped. Remaining files have not been processed.":config.dryRun?"Simulation complete. Ready for another batch.":"Batch complete. Ready for another batch.";
   }
   catch(e)
   {
      this.taskStatus.text="Batch error: "+String(e);
      (services.error || function(error){new MessageBox(String(error),"Header Editor",StdIcon_Error,StdButton_Ok).execute();})(e);
   }
   finally
   {
      this.busy=false;this.stopRequested=false;
      for(var j=0;j<this.batchControls.length;++j)this.batchControls[j].enabled=true;
      this.cancelButton.text="Close";this.updateDestination();this.taskStatus.repaint();
   }
   return result;
};
#ifndef METADATA_LIBRARY
try{(new HeaderEditorDialog).execute();}
catch(e){new MessageBox(String(e),"Error",StdIcon_Error,StdButton_Ok).execute();}
#endif
