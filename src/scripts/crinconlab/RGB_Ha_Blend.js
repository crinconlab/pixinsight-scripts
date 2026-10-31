// Copyright © Carlos Rincón 2026
// Manual validation by Carlos Rincon: all workflow tests have been repeated manually with satisfactory results.
#feature-id CrinconlabRGBHaBlend : Crinconlab > RGB Ha Blend
#feature-icon icons/rgb_dualband_orange_v2.svg
#feature-info RGB + Dual Band composition, Image Solver and SPCC. Version 0.15.0. English edition. Copyright &copy; Carlos Rinc&oacute;n 2026. Manual validation by Carlos Rincon: all workflow tests have been repeated manually with satisfactory results.
#engine v8
#include "ProtectedPaths.jsh"
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/PropertyType.jsh>
#include <pjsr/PropertyAttribute.jsh>
CoreApplication.ensureMinimumVersion(1,9,5);
#define VERSION "6.5.0"
#define TITLE "ImageSolver"
#define SOLVER_SETTINGS_MODULE "ImageSolver"
#define SETTINGS_MODULE "Crinconlab/RGBHaBlend"
#include <pjsr/astrometry/AstrometricMetadata.js>
#include <pjsr/astrometry/AstronomicalCatalogs.js>
#include <pjsr/astrometry/SearchCoordinatesDialog.js>
#include <pjsr/astrometry/CatalogDownloaderDialog.js>
#include <pjsr/astrometry/ProjectionConfigurationDialog.js>
#include <pjsr/astrometry/UtilityControls.js>
#include <pjsr/astrometry/VizierMirrorDialog.js>
#include <pjsr/astrometry/ImageReprojection.js>
#include <pjsr/controls/DateTimeEditor.js>
#include <pjsr/controls/GeodeticCoordinatesEditor.js>
#include <../src/scripts/ImageSolver/ImageSolverDialog.js>
#include <../src/scripts/ImageSolver/ImageSolverEngine.js>

var RD_HELP_TEXT=[
   "RGB HA BLEND \u2014 VERSION 0.15.0",
   "Copyright \u00a9 Carlos Rinc\u00f3n 2026",
   "",
   "MANUAL VALIDATION",
   "Manual validation by Carlos Rincon: all workflow tests have been repeated manually with satisfactory results.",
   "",
   "INPUT PREPARATION",
   "Both images must be linear, gradient-corrected and color-calibrated. ML Denoise is optional. RGB must have three channels. Dual Band may be RGB or monochrome. A display STF is allowed. Original inputs are never edited.",
   "",
   "REGISTRATION AND AUTOMATIC CROP",
   "RGB defines the pixel grid. Align using stars (default) uses native StarAlignment with a geometric registration mask. The largest axis-aligned rectangle fully inside that mask is retained, with a two-pixel interpolation guard if borders were removed. Both copies receive exactly the same crop. The mask is geometric: real dark pixels are not treated as missing coverage. Existing padding already present inside an input is not detected. Inputs need enough stars and overlapping field; different scales/rotations can be handled within StarAlignment's matching limits. If registration fails, review your data rather than accepting an unregistered blend.",
   "Align using astrometry supports already solved Dual Band images, including starless images. Its WCS is reprojected onto RGB with the official ImageReprojection backend. Coverage comes from reprojecting a constant-one image with the same geometry. This relies on the accuracy of both astrometric solutions; it is not a further stellar refinement.",
   "Images are already aligned bypasses registration and crop, requiring matching dimensions and your assurance that the pixel grids match. It preserves any existing padding. Do not select it just because two images have the same dimensions.",
   "",
   "ASTROMETRY",
   "RGB's solution is reused; if absent, Image Solver opens on a temporary RGB copy. An unsolved starless RGB cannot be solved: provide a valid solution first. The script never blindly copies an unregistered Dual Band solution onto RGB. The crop shifts the astrometric reference pixel and all image control points, preserves spline-generation parameters, regenerates the native solution and checks sky coordinates at three points. The final SPCC-calibrated image receives the cropped RGB solution. Registration/crop are cached during intensity changes and recreated after Back.",
   "",
   "WORKFLOW",
   "Select images and registration mode, name the result, review Configure SPCC, then Open preview. Preparation requirements remain visible without a confirmation checkbox. Click Update preview to register, crop, blend and calibrate. Both panels show the same cropped field. Adjust intensity from 1 to 5, initially 3, and Update preview again. Same STF remains off by default. Accept result retains the reviewed calibrated image without rerunning processing; save it yourself. Back returns to setup; Cancel discards owned temporary images. Failed updates retain the previous valid calibrated result. Unchanged originals remain open.",
   "",
   "BLEND",
   "R = RGB[0] + k * DualBand[0]",
   "G = RGB[1]",
   "B = RGB[2]",
   "The red channel is used for color Dual Band, or the single channel for mono. k ranges from 1 to 5, including intermediate values. No continuum subtraction or input brightness normalization is performed. Floating-point PixelMath output is not clipped or rescaled. SPCC may change all channels. Standard RGB SPCC settings do not guarantee rigorously photometric colors after adding narrowband signal.",
   "",
   "SPCC",
   "PixInsight 1.9.5 and ImageSolver 6.5.0 are required, with configured GaiaDR3SP data for SPCC. Configure the RGB filter responses, QE, white reference, limiting magnitude and background neutralization. Save as defaults preserves the exposed settings; background reference views are session-dependent. Preview suppresses graph/star-map/text outputs. Real SPCC depends on your installed catalog and equipment configuration.",
   "",
   "STATUS AND CONSOLE",
   "Blue text describes the task. The bar gives processing-stage percentages, not time estimates, and may remain fixed during native operations. Input controls are disabled during updates. The script does not explicitly open the process console and hides it at stage boundaries; native processes may still bring it forward. Technical messages remain available for troubleshooting.",
   "",
   "INSTALLATION",
   "Replace the complete Crinconlab folder, keeping icons/. Update Script > Feature Scripts and launch RGB Ha Blend. Help works before selecting images; Save manual .txt exports these instructions.",
   "",
   "VALIDATION LIMITS",
   "Native tests use synthetic stars, real registration masks and astrometric coordinate comparisons after cropping. Automated calibration tests inject a calibration callback: validate a complete run with your installed SPCC catalog and real astrophotography data.",
   ""
].join("\n");
class RD_HelpDialog extends Dialog
{
constructor()
{
   super();var self=this;this.windowTitle="Help and instructions · RGB Ha Blend · v0.15.0";
   this.manual=new TextBox(this);this.manual.readOnly=true;this.manual.text=RD_HELP_TEXT;
   this.manual.setScaledMinSize(700,460);
   this.exportButton=new PushButton(this);this.exportButton.text="Save manual .txt...";
   this.exportButton.onClick=function()
   {
      var picker=new SaveFileDialog;picker.caption="Save instructions";
      picker.filters=[["Text file",".txt"]];picker.initialPath="RGB_Ha_Blend_Manual_EN.txt";
      if(picker.execute())try{CR_writeUserText(picker.fileName,RD_HELP_TEXT);}
      catch(e){new MessageBox(String(e),"Could not save the manual",StdIcon_Error,StdButton_Ok).execute();}
   };
   var close=new PushButton(this);close.text="Close";close.onClick=function(){self.ok();};
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.exportButton);buttons.addStretch();buttons.add(close);
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(this.manual,100);this.sizer.add(buttons);
   this.adjustToContents();
}
}
function RD_showHelp(){(new RD_HelpDialog).execute();}
function RD_validate(rgb,dual,id)
{
   if(!rgb || rgb.isNull || !dual || dual.isNull)throw new Error("Select both images.");
   if(rgb.isPreview || dual.isPreview)throw new Error("Select main images, not previews.");
   if(!rgb.image.isColor || rgb.image.numberOfNominalChannels!=3)throw new Error("The first image must be RGB.");
   if(dual.image.numberOfNominalChannels!=1 && dual.image.numberOfNominalChannels!=3)throw new Error("Dual Band must be monochrome or RGB.");
   if(rgb.id===dual.id)throw new Error("Select two different input images.");
   if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id))throw new Error("Name: use unaccented letters, digits and underscores; do not start with a digit.");
   if(!ImageWindow.windowById(id).isNull)throw new Error("An image already exists with the name "+id);
}
function RD_intensity(value)
{
   if(value===undefined)return 3;
   var text=String(value).trim().replace(",",".");
   if(!text)throw new Error("Enter an intensity between 1 and 5.");
   var factor=Number(text);
   if(!isFinite(factor) || factor<1 || factor>5)throw new Error("Intensity must be between 1 and 5.");
   return factor;
}
function RD_create(rgb,dual,id,intensity,visible)
{
   RD_validate(rgb,dual,id);
   if(rgb.image.width!==dual.image.width || rgb.image.height!==dual.image.height)throw new Error("Internal registered-image dimensions do not match.");
   var factor=RD_intensity(intensity);
   var p=new PixelMath;
   p.useSingleExpression=false;
   p.expression=rgb.id+"[0] + "+String(factor)+"*"+dual.id+"[0]";
   p.expression1=rgb.id+"[1]";p.expression2=rgb.id+"[2]";
   p.generateOutput=true;p.singleThreaded=false;p.use64BitWorkingImage=true;
   p.rescale=false;p.truncate=false;
   p.createNewImage=true;p.showNewImage=visible!==false;p.newImageId=id;
   p.newImageWidth=rgb.image.width;p.newImageHeight=rgb.image.height;
   p.newImageAlpha=false;p.newImageColorSpace=PixelMath.RGB;
   p.newImageSampleFormat=PixelMath.f32;
   console.writeln("R = "+p.expression+"\nG = "+p.expression1+"\nB = "+p.expression2);
   if(!p.executeOn(rgb))throw new Error("PixelMath did not complete successfully.");
   var out=ImageWindow.windowById(id);
   if(out.isNull)throw new Error("PixelMath did not create the expected image.");
   out.keywords=rgb.window.keywords;
   if(visible!==false)out.show();return out;
}
function RD_solve(window,seedWindow)
{
   var engine=new ImageSolver;
   engine.initialize(seedWindow || window,false);
   engine.solverCfg.useActive=true;
   var dialog=new ImageSolverDialog(engine.solverCfg,engine.metadata,true);
   if(!dialog.execute())return false;
   engine.solverCfg=dialog.solverCfg;engine.solverCfg.useActive=true;
   engine.metadata=dialog.metadata;
   engine.solveImage(window);
   if(!window.hasAstrometricSolution)throw new Error("Image Solver did not produce an astrometric solution. The composition is retained; SPCC will not run.");
   return true;
}
function RD_getSPCC(icon)
{
   if(icon && typeof icon.processId=="function" && icon.processId()=="SpectrophotometricColorCalibration")return icon;
   if(!icon)throw new Error("Select a configured SPCC process icon on the PixInsight workspace.");
   var p=ProcessInstance.fromIcon(icon);
   if(!p || p.processId()!="SpectrophotometricColorCalibration")throw new Error("The selected icon is not an SPCC process.");
   return p;
}
function RD_run(config,solver)
{
   var state={reference:null,dual:null,result:null,accepted:false};
   try
   {
      if(!RD_previewUpdate(config,state,RD_intensity(config.intensity),solver?{solve:solver}:{}))return {window:null,canceled:true};
      return {window:RD_acceptPreview(config,state,config.id,config.intensity),canceled:false};
   }finally{RD_previewDispose(state);}
}
function RD_uniqueId(base)
{
   var id=base,n=2;while(!ImageWindow.windowById(id).isNull)id=base+"_"+n++;return id;
}
// Image copies honor the source selection, including its channel range and ROI.
function RD_fullImageCopy(image)
{
   image.pushSelections();
   try{image.resetSelections();return new Image(image);}
   finally{image.popSelections();}
}
function RD_cloneReference(view)
{
   var out=new ImageWindow(view.image.width,view.image.height,3,32,true,true,RD_uniqueId("RD_Reference"));
   try
   {
      var full=RD_fullImageCopy(view.image);
      try{out.mainView.beginProcess();try{out.mainView.image.assign(full);}finally{out.mainView.endProcess();}}finally{full.free();}
      out.keywords=view.window.keywords;
      if(view.window.hasAstrometricSolution)out.copyAstrometricSolution(view.window);
      return out;
   }
   catch(e){out.forceClose();throw e;}
}
function RD_closeOwned(window){if(window && !window.isNull)window.forceClose();}
function RD_previewDispose(state)
{
   RD_closeOwned(state.reference);state.reference=null;RD_closeOwned(state.dual);state.dual=null;
   if(!state.accepted){RD_closeOwned(state.result);state.result=null;}
}
function RD_previewUpdate(config,state,value,services)
{
   services=services || {};var factor=RD_intensity(value),progress=services.progress || function(){};
   RD_getSPCC(config.spcc || config.spccIcon);
   if(!state.reference || state.reference.isNull || !state.dual || state.dual.isNull)
   {
      var prepared=RD_prepareInputs(config,services,progress);if(!prepared)return false;
      state.reference=prepared.reference;state.dual=prepared.dual;state.crop=prepared.crop;
      state.referenceSTF=RD_linkedSTF(state.reference.mainView.image);
   }
   var candidate=null;
   try
   {
      progress("Combining RGB and registered Dual Band…",82);
      candidate=RD_create(state.reference.mainView,state.dual.mainView,RD_uniqueId("RD_Calibrated"),factor,false);
      candidate.copyAstrometricSolution(state.reference);
      if(!candidate.hasAstrometricSolution)throw new Error("Could not transfer the cropped RGB astrometric solution.");
      progress("Calibrating the blend with SPCC…",90);
      if(services.calibrate)services.calibrate(candidate,config.spcc);
      else
      {
         var spcc=RD_getSPCC(config.spcc || config.spccIcon);
         var graphs=spcc.generateGraphs,maps=spcc.generateStarMaps,text=spcc.generateTextFiles;
         try{spcc.generateGraphs=false;spcc.generateStarMaps=false;spcc.generateTextFiles=false;if(!spcc.executeOn(candidate.mainView))throw new Error("SPCC did not complete the calibration.");}
         finally{spcc.generateGraphs=graphs;spcc.generateStarMaps=maps;spcc.generateTextFiles=text;}
      }
      if(!candidate.hasAstrometricSolution)throw new Error("The calibrated result lost its astrometric solution.");
      var previous=state.result;state.result=candidate;candidate=null;state.factor=factor;
      RD_closeOwned(previous);progress("Calibrated common-field preview ready",100);return true;
   }finally{RD_closeOwned(candidate);}
}
function RD_cloneInput(view)
{
   var out=new ImageWindow(view.image.width,view.image.height,view.image.numberOfNominalChannels,32,true,view.image.isColor,RD_uniqueId("RD_Input"));
   try
   {
      var full=RD_fullImageCopy(view.image);
      try{out.mainView.beginProcess();try{out.mainView.image.assign(full);}finally{out.mainView.endProcess();}}finally{full.free();}
      out.keywords=view.window.keywords;
      if(view.window.hasAstrometricSolution)out.copyAstrometricSolution(view.window);
      out.hide();return out;
   }catch(e){RD_closeOwned(out);throw e;}
}
function RD_largestRectangle(mask,progress)
{
   var w=mask.width,h=mask.height,heights=new Int32Array(w),row=new Float32Array(w),best={x:0,y:0,width:0,height:0},area=0;
   for(var y=0;y<h;++y)
   {
      mask.getSamples(row,0,y,w,y+1,0);
      var stack=[];
      for(var x=0;x<=w;++x)
      {
         if(x<w)heights[x]=row[x]>.999?heights[x]+1:0;
         var height=x<w?heights[x]:0,start=x;
         while(stack.length && stack[stack.length-1].height>height)
         {
            var previous=stack.pop(),size=previous.height*(x-previous.start);start=previous.start;
            if(size>area){area=size;best={x:start,y:y-previous.height+1,width:x-start,height:previous.height};}
         }
         if(height>0 && (!stack.length || stack[stack.length-1].height<height))stack.push({start:start,height:height});
      }
      if(progress && y%128===0)progress("Finding the common valid field…",55+Math.floor(15*y/h));
   }
   if(area<256)throw new Error("Not enough common valid area. Check the selected images and registration method.");
   // A fully covered canvas needs no crop. Otherwise leave a two-pixel interpolation guard.
   if(best.x!==0 || best.y!==0 || best.width!==w || best.height!==h){best.x+=2;best.y+=2;best.width-=4;best.height-=4;}
   if(best.width<16 || best.height<16)throw new Error("The common field is too small after removing registration edges.");
   return best;
}
function RD_cropGeometry(window,rect)
{
   if(rect.x===0 && rect.y===0 && rect.width===window.mainView.image.width && rect.height===window.mainView.image.height)return;
   var metadata=[],sky=[],has=window.hasAstrometricSolution;
   if(has)
   {
      window.updateAstrometryMetadata();
      // Preserve the standard solution and spline generation settings, not cached transforms.
      window.mainView.properties.forEach(function(id)
      {
         if(id.indexOf("AstrometricSolution:")===0 || id.indexOf("PCL:AstrometricSolution:Generation:")===0)
            metadata.push({id:id,value:window.mainView.propertyValue(id),type:window.mainView.propertyType(id),attributes:window.mainView.propertyAttributes(id)});
      });
      if(!metadata.some(function(p){return p.id==="AstrometricSolution:ReferenceImageCoordinates";}))throw new Error("The RGB astrometric solution cannot be propagated safely through this crop.");
      [[.1,.1],[.5,.5],[.9,.9]].forEach(function(p){var x=rect.width*p[0],y=rect.height*p[1];sky.push({x:x,y:y,rd:window.imageToCelestial(x+rect.x,y+rect.y)});});
   }
   var crop=new Crop;crop.leftMargin=-rect.x;crop.topMargin=-rect.y;crop.rightMargin=rect.x+rect.width-window.mainView.image.width;crop.bottomMargin=rect.y+rect.height-window.mainView.image.height;crop.noGUIMessages=true;
   if(!crop.executeOn(window.mainView,false))throw new Error("Automatic common-field crop failed.");
   if(has)
   {
      window.clearAstrometricSolution();
      metadata.forEach(function(p)
      {
         if(p.id==="AstrometricSolution:ReferenceImageCoordinates")p.value=new Vector([p.value[0]-rect.x,p.value[1]-rect.y]);
         if(p.id==="AstrometricSolution:ControlPoints:Image")
         {
            var points=new Matrix(p.value);
            for(var i=0;i<points.rows;++i){points[i][0]-=rect.x;points[i][1]-=rect.y;}p.value=points;
         }
         window.mainView.setPropertyValue(p.id,p.value,p.type,p.attributes);
      });
      window.regenerateAstrometricSolution();
      if(!window.hasAstrometricSolution)throw new Error("Could not rebuild the cropped RGB astrometric solution.");
      sky.forEach(function(p){var rd=window.imageToCelestial(p.x,p.y);if(!rd || !p.rd || Math.hypot((rd.x-p.rd.x)*Math.cos(rd.y*Math.PI/180),rd.y-p.rd.y)*3600>.05)throw new Error("Astrometric validation failed after cropping.");});
      window.updateAstrometryMetadata();
   }
}
function RD_prepareInputs(config,services,progress)
{
   services=services || {};var owned=[],reference=null,dual=null,mask=null;
   function own(w){owned.push(w);return w;}
   function step(text,p){if(progress)progress(text,p);}
   try
   {
      step("Copying the RGB reference…",0);reference=own(RD_cloneReference(config.rgb));reference.hide();
      if(!reference.hasAstrometricSolution)
      {
         step("Solving the RGB reference…",10);
         if(!(services.solve?services.solve(reference,config.rgb.window):RD_solve(reference,config.rgb.window))){owned.forEach(RD_closeOwned);return null;}
      }
      if(!reference.hasAstrometricSolution)throw new Error("RGB requires an astrometric solution before registration.");
      dual=own(RD_cloneInput(config.dual));
      var mode=config.registration || "Stars";
      if(mode==="Registered")
      {
         if(reference.mainView.image.width!==dual.mainView.image.width || reference.mainView.image.height!==dual.mainView.image.height)throw new Error("Already registered inputs must have the same pixel dimensions.");
      }
      else if(mode==="Coordinates")
      {
         step("Checking Dual Band astrometry…",20);
         if(!dual.hasAstrometricSolution)throw new Error("Coordinate registration requires an existing astrometric solution on Dual Band. Use star registration for unsolved images with stars.");
         var meta=new AstrometricMetadata;meta.ExtractMetadata(reference);
         step("Reprojecting Dual Band onto RGB…",30);
         var projected=own((new ImageReprojection(InterpolationAlgorithm.Auto,.3,"_rd")).reprojectedImage(meta,dual));projected.hide();
         var white=own(new ImageWindow(dual.mainView.image.width,dual.mainView.image.height,1,32,true,false,RD_uniqueId("RD_Support")));
         white.mainView.beginProcess();try{white.mainView.image.fill(1);}finally{white.mainView.endProcess();}white.copyAstrometricSolution(dual);
         mask=own((new ImageReprojection(InterpolationAlgorithm.NearestNeighbor,.3,"_rd")).reprojectedImage(meta,white));mask.hide();dual=projected;
      }
      else
      {
         step("Registering Dual Band stars to RGB…",25);
         var before=ImageWindow.windows.map(function(w){return w.mainView.id;}),sa=new StarAlignment;
         sa.referenceImage=reference.mainView.id;sa.referenceIsFile=false;sa.generateMasks=true;sa.generateDrizzleData=false;sa.inheritAstrometricSolution=true;sa.outputSampleFormat=StarAlignment.f32;sa.distortionCorrection=false;
         try
         {
            if(!sa.executeOn(dual.mainView,false) || !sa.outputData.length)throw new Error("Star registration failed. Images need stars and sufficient overlap. For solved starless images, select coordinate registration.");
            var row=sa.outputData[0];dual=ImageWindow.windowById(row[0]);mask=ImageWindow.windowById(row[1]);
            if(dual.isNull || mask.isNull)throw new Error("StarAlignment did not return a registered image and coverage mask.");
         }
         finally{ImageWindow.windows.forEach(function(w){if(before.indexOf(w.mainView.id)<0){own(w);w.hide();}});}
      }
      var rect={x:0,y:0,width:reference.mainView.image.width,height:reference.mainView.image.height};
      if(mask){step("Finding the common valid field…",55);rect=RD_largestRectangle(mask.mainView.image,progress);}
      dual.copyAstrometricSolution(reference);
      step("Cropping both images and updating astrometry…",72);
      RD_cropGeometry(reference,rect);RD_cropGeometry(dual,rect);
      dual.copyAstrometricSolution(reference);
      var keepIds=[reference.mainView.id,dual.mainView.id];owned.forEach(function(w){if(!w.isNull && keepIds.indexOf(w.mainView.id)<0)RD_closeOwned(w);});
      step("Registered common field ready: "+rect.width+" × "+rect.height+" px",80);
      return {reference:reference,dual:dual,crop:rect};
   }
   catch(e){owned.forEach(RD_closeOwned);throw e;}
   finally{if(!reference || !reference.hasAstrometricSolution)owned.forEach(RD_closeOwned);}
}

function RD_linkedSTF(image)
{
   var sample=RD_fullImageCopy(image),median=0,mad=0;
   try
   {
      var scale=Math.min(1,700/Math.max(sample.width,sample.height));if(scale<1)sample.resample(scale);
      for(var c=0;c<3;++c){sample.selectedChannel=c;median+=sample.median()/3;mad+=sample.MAD()/3;}
   }
   finally{sample.free();}
   var shadows=Math.max(0,Math.min(0.99,median-2.8*1.4826*mad));
   var x=Math.max(1e-6,Math.min(0.999999,(median-shadows)/(1-shadows))),target=0.25;
   var m=(target-1)*x/((2*target-1)*x-target);m=Math.max(1e-6,Math.min(0.999999,m));
   return {shadows:shadows,midtones:m};
}
function RD_displayBitmap(view,stretch)
{
   var image=RD_fullImageCopy(view.image),display=null;
   try
   {
      var scale=Math.min(1,900/Math.max(image.width,image.height));if(scale<1)image.resample(scale);
      display=new ImageWindow(image.width,image.height,3,32,true,true,RD_uniqueId("RD_Display"));
      display.mainView.beginProcess();try{display.mainView.image.assign(image);}finally{display.mainView.endProcess();}
      var h=new HistogramTransformation;
      h.H=[[0,0.5,1,0,1],[0,0.5,1,0,1],[0,0.5,1,0,1],[stretch.shadows,stretch.midtones,1,0,1],[0,0.5,1,0,1]];
      if(!h.executeOn(display.mainView))throw new Error("Could not prepare the display.");
      return display.mainView.image.render();
   }
   finally{image.free();RD_closeOwned(display);}
}
function RD_acceptPreview(config,state,name,value)
{
   var factor=RD_intensity(value);
   if(!state.result || state.result.isNull || factor!==state.factor)throw new Error("Update the preview with the selected intensity before accepting.");
   if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw new Error("Invalid image name.");
   var existing=ImageWindow.windowById(name);
   if(!existing.isNull && existing.mainView.id!=state.result.mainView.id)throw new Error("An image already exists with the name "+name);
   state.result.mainView.id=name;state.accepted=true;state.result.show();return state.result;
}
class RD_Progress extends Control
{
constructor(parent)
{
   super(parent);this.value=0;
   this.setScaledMinSize(200,24);this.setScaledFixedHeight(24);
   this.toolTip="Task progress by completed processing stages, not elapsed time. Native processes may hold the percentage until they return.";
   this.onPaint=function()
   {
      var g=new Graphics(this);
      try
      {
         g.fillRect(0,0,this.width,this.height,new Brush(0xffe5eaf0));
         g.fillRect(0,0,Math.round(this.width*this.value/100),this.height,new Brush(0xff78b6f0));
         g.pen=new Pen(0xff14283c);g.font=this.font;
         g.drawText(8,this.height-7,this.value+" % · stages");
      }finally{g.end();}
   };
}
setValue(value)
{
   this.value=Math.max(0,Math.min(100,Math.round(value)));this.repaint();
}
}

class RD_PreviewDialog extends Dialog
{
constructor(config,services)
{
   super();var self=this;this.busy=false;this.onClose=function(){return !self.busy;};this.config=config;this.services=services;this.state={reference:null,result:null,accepted:false};
   this.windowTitle="SPCC-calibrated preview · v0.15.0";
   function label(text){var l=new Label(self);l.text=text;l.wordWrapping=true;return l;}
   function pane()
   {
      var c=new Control(self);c.bitmap=null;c.setScaledMinSize(380,300);
      c.onPaint=function()
      {
         var g=new Graphics(this);try
         {
            g.fillRect(0,0,this.width,this.height,new Brush(0xff202020));
            if(this.bitmap)
            {
               var ratio=Math.min(this.width/this.bitmap.width,this.height/this.bitmap.height),w=Math.round(this.bitmap.width*ratio),h=Math.round(this.bitmap.height*ratio);
               var x=Math.floor((this.width-w)/2),y=Math.floor((this.height-h)/2);g.drawScaledBitmap(x,y,x+w,y+h,this.bitmap);
            }
         }finally{g.end();}
      };return c;
   }
   this.originalPane=pane();this.resultPane=pane();
   var columns=new HorizontalSizer;columns.spacing=8;
   var left=new VerticalSizer;left.add(label("9. Compare · RGB common field"));left.add(this.originalPane,100);
   var right=new VerticalSizer;right.add(label("SPCC-calibrated result"));right.add(this.resultPane,100);columns.add(left,100);columns.add(right,100);
   this.slider=new Slider(this);this.slider.setRange(100,500);this.slider.value=Math.round(config.intensity*100);
   this.factorEdit=new Edit(this);this.factorEdit.text=String(config.intensity);this.factorEdit.setScaledFixedWidth(75);
   this.slider.onValueUpdated=function(value){self.factorEdit.text=(value/100).toFixed(2);self.updateFreshness();};
   this.factorEdit.onEditCompleted=function(){try{var v=RD_intensity(self.factorEdit.text);self.slider.value=Math.round(v*100);self.updateFreshness();}catch(e){self.status.text=String(e);self.acceptButton.enabled=false;}};
   var factorRow=new HorizontalSizer;factorRow.spacing=8;factorRow.add(label("7. Adjust Dual Band intensity (1–5):"));factorRow.add(this.slider,100);factorRow.add(this.factorEdit);
   this.sharedSTF=new CheckBox(this);this.sharedSTF.text="Same STF for color comparison";this.sharedSTF.checked=false;
   this.sharedSTF.onCheck=function(){try{self.refreshBitmaps();}catch(e){self.status.text=String(e);}};
   this.status=label("Click Update preview to register, crop and calibrate the blend.");
   this.status.styleSheet="QLabel { color: #1670d2; font-weight: bold; }";this.progressBar=new RD_Progress(this);
   this.outputName=new Edit(this);this.outputName.text=config.id;
   var nameRow=new HorizontalSizer;nameRow.spacing=8;nameRow.add(label("10. Review the result name:"));nameRow.add(this.outputName,100);
   this.updateButton=new PushButton(this);this.updateButton.text="8. Update preview";
   this.updateButton.onClick=function()
   {
      if(self.busy)return;self.busy=true;self.outputName.enabled=false;self.updateButton.enabled=false;self.acceptButton.enabled=false;self.cancelButton.enabled=false;self.backButton.enabled=false;self.slider.enabled=false;self.factorEdit.enabled=false;self.sharedSTF.enabled=false;
      try
      {
         self.progressBar.setValue(0);self.status.text="Preparing registered inputs and calibration…";CoreApplication.processEvents();
         var services={};if(self.services)for(var key in self.services)services[key]=self.services[key];
         services.progress=function(text,percent){self.status.text=text;self.status.repaint();self.progressBar.setValue(percent);console.hide();};
         if(RD_previewUpdate(config,self.state,self.factorEdit.text,services))
         {self.refreshBitmaps();self.status.text="Calibrated common field "+self.state.crop.width+" × "+self.state.crop.height+" px · intensity "+self.state.factor+". You can accept it or try another value.";}
         else self.status.text="Image Solver canceled. You can update again or cancel.";
      }
      catch(e){self.status.text="Error: "+String(e);console.warningln(String(e));}
      finally
      {
         console.hide();self.busy=false;self.outputName.enabled=true;self.updateButton.enabled=true;self.cancelButton.enabled=true;self.backButton.enabled=true;self.slider.enabled=true;self.factorEdit.enabled=true;self.sharedSTF.enabled=true;self.updateFreshness();
      }
   };
   this.acceptButton=new PushButton(this);this.acceptButton.text="11. Accept result";this.acceptButton.enabled=false;
   this.acceptButton.onClick=function()
   {
      try
      {
         var stf=self.sharedSTF.checked?self.state.referenceSTF:RD_linkedSTF(self.state.result.mainView.image);
         var result=RD_acceptPreview(config,self.state,self.outputName.text.trim(),self.factorEdit.text);
         result.mainView.stf=[[stf.midtones,stf.shadows,1,0,1],[stf.midtones,stf.shadows,1,0,1],[stf.midtones,stf.shadows,1,0,1],[0.5,0,1,0,1]];
         self.ok();
      }catch(e){new MessageBox(String(e),"Review result",StdIcon_Warning,StdButton_Ok).execute();}
   };
   this.returnToSetup=false;
   this.backButton=new PushButton(this);this.backButton.text="Back";
   this.backButton.toolTip="Return to the first screen and keep your settings. The temporary preview is discarded.";
   this.backButton.onClick=function(){self.returnToSetup=true;self.cancel();};
   this.cancelButton=new PushButton(this);this.cancelButton.text="Cancel";this.cancelButton.onClick=function(){self.returnToSetup=false;self.cancel();};
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.backButton);buttons.addStretch();buttons.add(this.acceptButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(factorRow);this.sizer.add(this.updateButton);this.sizer.add(columns,100);this.sizer.add(this.sharedSTF);this.sizer.add(this.status);this.sizer.add(this.progressBar);this.sizer.add(nameRow);this.sizer.add(buttons);this.sizer.add(label("STF is for display only. SPCC runs at full resolution. Copyright © Carlos Rincón 2026"));
   this.adjustToContents();
}
updateFreshness()
{
   var fresh=false;try{fresh=!!this.state.result && !this.state.result.isNull && RD_intensity(this.factorEdit.text)===this.state.factor;}catch(e){}
   this.acceptButton.enabled=fresh;
   if(this.state.result && !fresh)this.status.text="Intensity changed: click Update preview to recalibrate.";
}
refreshBitmaps()
{
   if(!this.state.reference || !this.state.result)return;
   var shared=this.state.referenceSTF,stretch=this.sharedSTF.checked?shared:RD_linkedSTF(this.state.result.mainView.image);
   this.originalPane.bitmap=RD_displayBitmap(this.state.reference.mainView,shared);
   this.resultPane.bitmap=RD_displayBitmap(this.state.result.mainView,stretch);
   this.originalPane.update();this.resultPane.update();
}
}

var RD_DEFAULTS_KEY="CarlosRincon/RGBDualBandSPCC/v1/defaults";
var RD_DEFAULT_FIELDS=["redFilterName","redFilterTrCurve","greenFilterName","greenFilterTrCurve",
   "blueFilterName","blueFilterTrCurve","deviceQECurveName","deviceQECurve","whiteReferenceName",
   "whiteReferenceSpectrum","autoLimitMagnitude","limitMagnitude","neutralizeBackground","generateGraphs"];
function RD_saveDefaults(process,key)
{
   var record={schema:1,parameters:{}};
   RD_DEFAULT_FIELDS.forEach(function(name){record.parameters[name]=process[name];});
   Settings.write(key || RD_DEFAULTS_KEY,DataType.String,JSON.stringify(record));
}
function RD_loadDefaults(key)
{
   var process=new SpectrophotometricColorCalibration;
   try
   {
      var text=Settings.read(key || RD_DEFAULTS_KEY,DataType.String);
      if(!Settings.lastReadOK || !text)return process;
      var record=JSON.parse(text);
      if(record.schema!=1 || !record.parameters)throw new Error("Unrecognized preferences format");
      // Validate the complete record before assigning any parameter.
      RD_DEFAULT_FIELDS.forEach(function(name)
      {
         var value=record.parameters[name];
         if(typeof value!=typeof process[name] || (typeof value=="number" && !isFinite(value)))throw new Error("Invalid preference: "+name);
      });
      RD_DEFAULT_FIELDS.forEach(function(name){process[name]=record.parameters[name];});
   }
   catch(e){console.warningln("Could not load the saved SPCC settings; using the initial settings. "+String(e));return new SpectrophotometricColorCalibration;}
   return process;
}
function RD_spectralLibrary()
{
   function read(file,tag)
   {
      var doc=new XMLDocument;doc.parseFromFile(CoreApplication.libraryDirPath+"/"+file);
      return doc.rootElement.childElementsByName(tag).map(function(e){return {name:e.attributeValue("name"),data:e.attributeValue("data"),channel:e.attributeValue("channel")};});
   }
   return {filters:read("filters.xspd","Filter"),whites:read("white-references.xspd","WhiteRef")};
}
class RD_SPCCDialog extends Dialog
{
constructor(process)
{
   super();var self=this;this.windowTitle="Configure SPCC";this.options={};
   var library=RD_spectralLibrary();
   function label(text){var l=new Label(self);l.text=text;l.wordWrapping=true;return l;}
   function selector(title,entries,current,key)
   {
      entries=entries.slice().sort(function(a,b){return a.name.localeCompare(b.name);});
      // Retain a configured curve even if it is absent from the bundled library.
      if(!entries.some(function(e){return e.name==current.name;}))entries.unshift(current);
      var combo=new ComboBox(self);
      for(var i=0;i<entries.length;++i){combo.addItem(entries[i].name);if(entries[i].name==current.name)combo.currentItem=i;}
      self.options[key]={combo:combo,entries:entries};
      var row=new HorizontalSizer;row.spacing=8;row.add(label(title));row.add(combo,100);return row;
   }
   this.rows=[];
   for(var channel of ["red","green","blue"])
   {
      var code=channel[0].toUpperCase(),title=channel=="red"?"Red filter:":channel=="green"?"Green filter:":"Blue filter:";
      this.rows.push(selector(title,library.filters.filter(function(e){return e.channel==code || e.channel=="PAN" || e.channel=="L";}),
         {name:process[channel+"FilterName"],data:process[channel+"FilterTrCurve"]},channel));
   }
   this.rows.push(selector("QE curve:",library.filters.filter(function(e){return e.channel=="Q";}),{name:process.deviceQECurveName,data:process.deviceQECurve},"qe"));
   this.rows.push(selector("White reference:",library.whites,{name:process.whiteReferenceName,data:process.whiteReferenceSpectrum},"white"));
   this.autoMagnitude=new CheckBox(this);this.autoMagnitude.text="Automatic limiting magnitude";this.autoMagnitude.checked=process.autoLimitMagnitude;
   this.magnitude=new Edit(this);this.magnitude.text=String(process.limitMagnitude);this.magnitude.enabled=!this.autoMagnitude.checked;
   this.autoMagnitude.onCheck=function(checked){self.magnitude.enabled=!checked;};
   var magrow=new HorizontalSizer;magrow.spacing=8;magrow.add(this.autoMagnitude);magrow.add(label("Manual magnitude:"));magrow.add(this.magnitude,100);
   this.neutralize=new CheckBox(this);this.neutralize.text="Neutralize background";this.neutralize.checked=process.neutralizeBackground;
   this.background=new ViewList(this);this.background.getMainViews();
   if(process.backgroundReferenceViewId){var view=View.viewById(process.backgroundReferenceViewId);if(view && !view.isNull)this.background.currentView=view;}
   var bgrow=new HorizontalSizer;bgrow.spacing=8;bgrow.add(label("Background reference (empty = target image):"));bgrow.add(this.background,100);
   this.graphs=new CheckBox(this);this.graphs.text="Generate graphs";this.graphs.checked=process.generateGraphs;
   this.okButton=new PushButton(this);this.okButton.text="OK";
   this.okButton.onClick=function()
   {
      try{self.validate();self.ok();}catch(e){new MessageBox(String(e),"Review SPCC",StdIcon_Warning,StdButton_Ok).execute();}
   };
   var cancel=new PushButton(this);cancel.text="Cancel";cancel.onClick=function(){self.cancel();};
   this.saveDefaults=new PushButton(this);this.saveDefaults.text="Save as defaults";
   this.saveDefaults.onClick=function()
   {
      try
      {
         var candidate=new SpectrophotometricColorCalibration;self.applyTo(candidate);RD_saveDefaults(candidate);
         new MessageBox("Settings saved. They will be loaded the next time you open this script.\nSelect the background reference view for each session.","SPCC defaults",StdIcon_Information,StdButton_Ok).execute();
      }
      catch(e){new MessageBox(String(e),"Could not save settings",StdIcon_Error,StdButton_Ok).execute();}
   };
   var help=new PushButton(this);help.text="Help";help.onClick=RD_showHelp;
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(help);buttons.add(this.saveDefaults);buttons.addStretch();buttons.add(this.okButton);buttons.add(cancel);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;
   this.sizer.add(label("SPCC settings. Use them now or save them as defaults for future runs."));
   this.rows.forEach(function(row){self.sizer.add(row);});
   this.sizer.add(label("For color sensor filters that already include sensor sensitivity, use Ideal QE curve."));
   this.sizer.add(magrow);this.sizer.add(this.neutralize);this.sizer.add(bgrow);this.sizer.add(this.graphs);
   this.sizer.add(label("Catalog: "+process.catalogId+". Uses the PixInsight catalog installation; this dialog does not download or install Gaia."));
   this.sizer.add(buttons);this.sizer.add(label("Copyright © Carlos Rincón 2026"));this.setScaledMinWidth(650);this.adjustToContents();
}
validate()
{
   var m=Number(this.magnitude.text.trim());
   if(!this.autoMagnitude.checked && (!isFinite(m) || m<0 || m>30))throw new Error("Enter a manual magnitude between 0 and 30.");
}
applyTo(process)
{
   this.validate();
   function selected(option){return option.entries[option.combo.currentItem];}
   for(var channel of ["red","green","blue"])
   {
      var entry=selected(this.options[channel]);process[channel+"FilterName"]=entry.name;process[channel+"FilterTrCurve"]=entry.data;
   }
   var qe=selected(this.options.qe),white=selected(this.options.white);
   process.deviceQECurveName=qe.name;process.deviceQECurve=qe.data;
   process.whiteReferenceName=white.name;process.whiteReferenceSpectrum=white.data;
   process.autoLimitMagnitude=this.autoMagnitude.checked;
   if(!process.autoLimitMagnitude)process.limitMagnitude=Number(this.magnitude.text.trim());
   process.neutralizeBackground=this.neutralize.checked;
   var bg=this.background.currentView;process.backgroundReferenceViewId=bg && !bg.isNull?bg.id:"";
   process.generateGraphs=this.graphs.checked;process.applyCalibration=true;
   // This is the requested broadband/hybrid RGB workflow, not an SHO/HOO calibration.
   process.narrowbandMode=false;
}
}
class RD_Dialog extends Dialog
{
constructor()
{
   super();var self=this;
   this.windowTitle="RGB Ha Blend · v0.15.0";
   function label(text){var l=new Label(self);l.text=text;l.wordWrapping=true;return l;}
   function choose(list)
   {
      var f=new OpenFileDialog;f.multipleSelections=false;f.loadImageFilters();
      if(f.execute())
      {
         var windows=ImageWindow.open(f.fileName,"","",true);
         if(windows.length!=1){for(var i=0;i<windows.length;++i)windows[i].forceClose();throw new Error("Choose a file containing a single image.");}
         var previousRGB=self.rgb.currentView,previousDual=self.dual.currentView;
         windows[0].show();self.rgb.getMainViews();self.dual.getMainViews();
         if(previousRGB && !previousRGB.isNull)self.rgb.currentView=previousRGB;
         if(previousDual && !previousDual.isNull)self.dual.currentView=previousDual;
         list.currentView=windows[0].mainView;
      }
   }
   function imageRow(title,list)
   {
      var b=new PushButton(self);b.text="Open file...";b.onClick=function(){try{choose(list);}catch(e){new MessageBox(String(e),"Error",StdIcon_Error,StdButton_Ok).execute();}};
      var row=new HorizontalSizer;row.spacing=6;row.add(label(title));row.add(list,100);row.add(b);return row;
   }
   this.rgb=new ViewList(this);this.rgb.getMainViews();this.dual=new ViewList(this);this.dual.getMainViews();
   this.rgbRow=imageRow("2. RGB image:",this.rgb);this.dualRow=imageRow("3. Dual Band image:",this.dual);
   this.idEdit=new Edit(this);this.idEdit.text="RGB_DualBand";
   this.spccProcess=RD_loadDefaults();
   this.spccSummary=label("");
   this.updateSPCCSummary=function(){self.spccSummary.text="SPCC · R: "+self.spccProcess.redFilterName+" · G: "+self.spccProcess.greenFilterName+" · B: "+self.spccProcess.blueFilterName+" · White reference: "+self.spccProcess.whiteReferenceName;};
   this.updateSPCCSummary();
   this.configureSPCC=new PushButton(this);this.configureSPCC.text="5. Configure SPCC...";
   this.configureSPCC.onClick=function()
   {
      try{var dialog=new RD_SPCCDialog(self.spccProcess);if(dialog.execute()){dialog.applyTo(self.spccProcess);self.updateSPCCSummary();}}
      catch(e){new MessageBox(String(e),"SPCC settings",StdIcon_Error,StdButton_Ok).execute();}
   };
   this.preparation=label("1. Before starting: RGB and Dual Band must be linear, gradient-corrected and color-calibrated. ML Denoise is optional. Registration and common-field cropping are performed on copies.");
   this.registration=new ComboBox(this);this.registration.addItem("Align using stars");this.registration.addItem("Align using astrometry");this.registration.addItem("Images are already aligned");
   this.registration.toolTip="RGB defines the reference grid. Star registration creates a geometric coverage mask; the largest valid common rectangle is cropped from both copies. Coordinates mode requires existing Dual Band astrometry. Already registered trusts your confirmation and retains the full field, including any pre-existing padding.";
   this.okButton=new PushButton(this);this.okButton.text="6. Open preview";
   this.okButton.onClick=function()
   {
      try
      {
         var config={registration:["Stars","Coordinates","Registered"][self.registration.currentItem],rgb:self.rgb.currentView,dual:self.dual.currentView,id:self.idEdit.text.trim(),spcc:self.spccProcess,intensity:self.previewIntensity===undefined?3:self.previewIntensity};
         RD_validate(config.rgb,config.dual,config.id);RD_getSPCC(config.spcc);self.config=config;self.ok();
      }catch(e){new MessageBox(String(e),"Review inputs",StdIcon_Warning,StdButton_Ok).execute();}
   };
   this.cancelButton=new PushButton(this);this.cancelButton.text="Cancel";this.cancelButton.onClick=function(){self.cancel();};
   this.helpButton=new PushButton(this);this.helpButton.text="Help and instructions";this.helpButton.onClick=RD_showHelp;
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.helpButton);buttons.addStretch();buttons.add(this.okButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;
   var items=[this.preparation,this.rgbRow,this.dualRow,label("Registration and automatic common-field crop:"),this.registration,
      label("4. New image name:"),this.idEdit,this.spccSummary,this.configureSPCC,
      label("RGB is the reference. Its astrometry is reused or solved first. The cropped result retains an updated solution. Each preview update runs SPCC."),
      buttons,label("Copyright © Carlos Rincón 2026")];
   for(var i=0;i<items.length;++i)this.sizer.add(items[i]);
   this.setScaledMinWidth(650);this.adjustToContents();
}
}
// Reuse the initial dialog so selections and SPCC settings survive Back.
function RD_workflow(dialog,makePreview)
{
   makePreview=makePreview || function(config){return new RD_PreviewDialog(config);};
   while(dialog.execute())
   {
      var preview=makePreview(dialog.config);
      try
      {
         if(preview.execute())return preview.state.result;
         if(!preview.returnToSetup)return null;
         dialog.idEdit.text=preview.outputName.text.trim();
         try{dialog.previewIntensity=RD_intensity(preview.factorEdit.text);}catch(e){dialog.previewIntensity=dialog.config.intensity;}
      }
      finally{RD_previewDispose(preview.state);}
   }
   return null;
}
var RD_STARTUP_TEXT=[
   "Select two images of the same astronomical target:",
   "",
   "RGB image: the color image used as the reference for alignment and framing.",
   "",
   "Color Dual Band image: the script adds the Ha signal from this image to the RGB image.",
   "",
   "Both images must be linear, gradient-corrected and color-calibrated. Gentle noise reduction is recommended. A display STF is allowed.",
   "",
   "Choose the appropriate alignment method. Starless images require valid astrometric solutions.",
   "",
   "The script aligns and crops copies of your inputs as needed, adds the Ha signal and applies Spectrophotometric Color Calibration (SPCC) using your selected settings.",
   "",
   "Output: a new linear RGB + Ha image, calibrated with SPCC and with a valid astrometric solution. If the RGB input is not already solved, the script opens Image Solver to obtain the solution. Your original images remain unchanged. Save the result manually.",
   "",
   "Copyright \u00a9 Carlos Rinc\u00f3n 2026"
].join("\n");
function RD_startupNotice(showMessage)
{
   if(showMessage)return showMessage(RD_STARTUP_TEXT)===StdButton_Ok;
   return new MessageBox(RD_STARTUP_TEXT,"RGB + Ha Blend — Before you start",StdIcon_Information,StdButton_Ok,StdButton_Cancel).execute()===StdButton_Ok;
}
#ifndef RGB_DUAL_LIBRARY
try
{
   console.hide();var result=null;
   if(RD_startupNotice())result=RD_workflow(new RD_Dialog);
   if(result)new MessageBox("Calibrated result: "+result.mainView.id+"\nThe image you just reviewed is retained without rerunning SPCC. Save it when you want to keep it.","RGB Ha Blend",StdIcon_Information,StdButton_Ok).execute();
}
catch(e){console.criticalln(String(e));new MessageBox(String(e),"RGB Ha Blend: error",StdIcon_Error,StdButton_Ok).execute();}
#endif
