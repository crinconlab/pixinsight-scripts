// Copyright © Carlos Rincón 2026
#feature-id CrinconlabMezclaFocales : Crinconlab > Focal Length Blend
#feature-icon icons/Mezcla_Focales_orange_v2.svg
#feature-info Astrometric preparation, StarXTerminator separation and selectable native MLT detail injection on a fixed short-focal canvas. Version 0.11.6. Copyright &copy; Carlos Rinc&oacute;n 2026.
#engine v8
#include "ProtectedPaths.jsh"
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/ButtonCodes.jsh>
#include <pjsr/DataType.jsh>
CoreApplication.ensureMinimumVersion(1,9,5);
#define VERSION "6.5.0"
#define TITLE "ImageSolver"
#define SOLVER_SETTINGS_MODULE "ImageSolver"
#define SETTINGS_MODULE "ImageSolver"
#include <pjsr/astrometry/AstrometricMetadata.js>
#include <pjsr/astrometry/AstronomicalCatalogs.js>
#include <pjsr/astrometry/SearchCoordinatesDialog.js>
#include <pjsr/astrometry/CatalogDownloaderDialog.js>
#include <pjsr/astrometry/ProjectionConfigurationDialog.js>
#include <pjsr/astrometry/UtilityControls.js>
#include <pjsr/astrometry/VizierMirrorDialog.js>
#include <pjsr/controls/DateTimeEditor.js>
#include <pjsr/controls/GeodeticCoordinatesEditor.js>
#include <../src/scripts/ImageSolver/ImageSolverDialog.js>
#include <../src/scripts/ImageSolver/ImageSolverEngine.js>

#include <pjsr/astrometry/ImageReprojection.js>

/*
 * Solve unsolved copies and reproject the long-focal detail using the official
 * MosaicByCoordinates backend. The short-focal base defines the exact grid.
 * Masks describe geometric coverage, not nebula brightness. Work on copies.
 * Default: inject selected native MLT detail layers. Gaussian-band replacement
 * remains available as an alternative.
 */
var MF_VERSION = "0.11.6";

function MF_clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function MF_number(value, name, low, high)
{
   var text = String(value).trim().replace(",", "."), n = Number(text);
   if (!text || !isFinite(n) || n < low || n > high)
      throw new Error(name + ": enter a value between " + low + " and " + high + ".");
   return n;
}
function MF_validId(id)
{
   if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id))
      throw new Error("The output name must start with a letter or underscore and contain only ASCII letters, digits and underscores.");
}
function MF_unique(tag)
{
   var base = "CR_MF_" + tag, id = base, i = 2;
   while (!ImageWindow.windowById(id).isNull) id = base + "_" + i++;
   return id;
}
function MF_assertView(view, name)
{
   if (!view || view.isNull || view.isPreview)
      throw new Error(name + ": select an open main image.");
   var image = view.image, channels = image.numberOfNominalChannels;
   if ((channels != 1 && channels != 3) || image.numberOfChannels != channels)
      throw new Error(name + ": monochrome or RGB images without alpha channels are supported.");
}
function MF_validate(config)
{
   MF_assertView(config.base, "Wide-field base");
   MF_assertView(config.detail, "Long-focal-length detail");
   MF_assertView(config.mask, "Coverage mask");
   var w = config.base.image.width, h = config.base.image.height;
   if (config.detail.image.width != w || config.detail.image.height != h ||
       config.mask.image.width != w || config.mask.image.height != h)
      throw new Error("Base, detail and mask must have matching dimensions and share the same registered pixel grid. Prepare the geometry first.");
   if (config.mask.image.numberOfNominalChannels != 1)
      throw new Error("The mask must be monochrome: white inside valid coverage and black outside.");
   if(config.coverage){MF_assertView(config.coverage,"Astrometric coverage");if(config.coverage.image.width!=w || config.coverage.image.height!=h || config.coverage.image.numberOfNominalChannels!=1)throw new Error("Astrometric coverage must be monochrome and match the short-focal-length image dimensions.");}
   config.fine = MF_number(config.fine, "Fine sigma", 0, 16);
   config.coarse = MF_number(config.coarse, "Coarse sigma", 0.25, 64);
   if (config.fine >= config.coarse) throw new Error("Fine sigma must be smaller than coarse sigma.");
   config.feather = MF_number(config.feather, "Coverage transition", 0, 256);
   MF_validId(config.id);
   if (!ImageWindow.windowById(config.id).isNull)
      throw new Error("An image already exists with this name: " + config.id + ".");
   if (!config.prepared)
      throw new Error("Images must be stretched, starless and registered; the mask must stay within valid coverage.");
}

// Ownership registry: never includes original user windows.
function MF_Work()
{
   this.windows = [];
}
MF_Work.prototype.own = function(window)
{
   if (window && !window.isNull && this.windows.indexOf(window) < 0) this.windows.push(window);
   return window;
};
MF_Work.prototype.release = function(window)
{
   var index = this.windows.indexOf(window);
   if (index >= 0) this.windows.splice(index, 1);
};
MF_Work.prototype.close = function(window)
{
   if (this.windows.indexOf(window) < 0) return;
   if (window && !window.isNull) window.forceClose();
   this.release(window);
};
MF_Work.prototype.dispose = function()
{
   var errors = [];
   while (this.windows.length)
   {
      var window = this.windows.pop();
      try { if (window && !window.isNull) window.forceClose(); }
      catch (e) { errors.push(String(e)); }
   }
   if (errors.length) console.warningln("Some temporary images could not be closed: " + errors.join("; "));
};
function MF_identitySTF(view)
{
   view.stf = [[0.5,0,1,0,1],[0.5,0,1,0,1],[0.5,0,1,0,1],[0.5,0,1,0,1]];
}
function MF_copyMetadata(source, destination)
{
   destination.keywords = source.keywords;
   if (source.hasAstrometricSolution) destination.copyAstrometricSolution(source);
}
function MF_clone(view, work, tag)
{
   var image = view.image;
   var window = work.own(new ImageWindow(image.width, image.height,
      image.numberOfNominalChannels, 32, true, image.isColor, MF_unique(tag)));
   image.pushSelections();
   try
   {
      image.resetSelections();
      window.mainView.beginProcess();
      try { window.mainView.image.assign(image); }
      finally { window.mainView.endProcess(); }
   }
   finally { image.popSelections(); }
   MF_identitySTF(window.mainView);
   return window;
}
function MF_math(expression, reference, work, tag, color)
{
   var id = MF_unique(tag), p = new PixelMath, result = null;
   p.expression = expression;
   p.useSingleExpression = true;
   p.generateOutput = true;
   p.singleThreaded = false;
   p.use64BitWorkingImage = true;
   p.rescale = false;
   p.truncate = false;
   p.createNewImage = true;
   p.showNewImage = false;
   p.newImageId = id;
   p.newImageWidth = reference.image.width;
   p.newImageHeight = reference.image.height;
   p.newImageAlpha = false;
   p.newImageColorSpace = color ? PixelMath.RGB : PixelMath.Gray;
   p.newImageSampleFormat = PixelMath.f32;
   try
   {
      if (!p.executeOn(reference)) throw new Error("PixelMath did not complete " + tag + ".");
   }
   finally
   {
      result = ImageWindow.windowById(id);
      if (!result.isNull) work.own(result);
   }
   if (result.isNull) throw new Error("Temporary image was not created: " + tag + ".");
   MF_identitySTF(result.mainView);
   return result;
}
function MF_lightness(window, work, tag)
{
   if (!window.mainView.image.isColor) return window;
   var id = MF_unique(tag), p = new ChannelExtraction, result = null;
   p.colorSpace = ChannelExtraction.CIELab;
   p.channels = [[true,id],[false,""],[false,""]];
   p.sampleFormat = ChannelExtraction.SameAsSource;
   try
   {
      if (!p.executeOn(window.mainView)) throw new Error("Could not extract CIE L*.");
   }
   finally
   {
      result = ImageWindow.windowById(id);
      if (!result.isNull) { work.own(result); result.hide(); }
   }
   if (result.isNull) throw new Error("The CIE L* component was not generated.");
   return result;
}
function MF_blur(window, sigma, work, tag)
{
   if (sigma === 0) return window;
   var result = MF_clone(window.mainView, work, tag), p = new Convolution;
   p.mode = Convolution.Parametric;
   p.sigma = sigma;
   p.shape = 2;
   p.aspectRatio = 1;
   p.rotationAngle = 0;
   if (!p.executeOn(result.mainView)) throw new Error("Could not smooth " + tag + ".");
   return result;
}
function MF_normalizedBlur(weighted, maskBlur, sigma, work, tag)
{
   var blurred = MF_blur(weighted, sigma, work, tag + "G");
   var out = MF_math(blurred.mainView.id + "/max(" + maskBlur.mainView.id + ",1e-6)",
                     weighted.mainView, work, tag, false);
   if (blurred !== weighted) work.close(blurred);
   return out;
}

// Vertices lie on pixel boundaries (0..width, 0..height). One simple
// convex or concave contour, without holes or crossing edges.
// Uses the official reprojection backend called by MosaicByCoordinates.
// The reference metadata is taken directly from the short-focal image, rather
// than allowing automatic mosaic dimensions or resolution to enlarge the canvas.
function MF_confirmSolve(source,role,showMessage)
{
   var message="Proceed with the astrometric solution of the "+(role || "selected")+" image?\n\nImage: "+source.mainView.id+"\n\nImage Solver will open next. Review its settings before solving.";
   if(showMessage)return showMessage(message)===StdButton_Ok;
   return new MessageBox(message,"Astrometric solution",StdIcon_Information,StdButton_Ok,StdButton_Cancel).execute()===StdButton_Ok;
}
function MF_solveInput(window,source,role)
{
   if(window.hasAstrometricSolution)return true;
   if(!MF_confirmSolve(source,role))return false;
   console.writeln("Image Solver: "+source.mainView.id);
   var engine=new ImageSolver;engine.initialize(source,false);engine.solverCfg.useActive=true;
   var dialog=new ImageSolverDialog(engine.solverCfg,engine.metadata,true);
   if(!dialog.execute())return false;
   engine.solverCfg=dialog.solverCfg;engine.solverCfg.useActive=true;engine.metadata=dialog.metadata;
   engine.solveImage(window);
   if(!window.hasAstrometricSolution)throw new Error("Image Solver could not solve "+source.mainView.id+". Solving requires stars; a starless image must already have a valid astrometric solution.");
   return true;
}
function MF_clipFootprint(points,width,height)
{
   var out=points;
   [
      {inside:function(p){return p.x>=0;},at:function(a,b){var t=-a.x/(b.x-a.x);return{x:0,y:a.y+t*(b.y-a.y)};}},
      {inside:function(p){return p.x<=width;},at:function(a,b){var t=(width-a.x)/(b.x-a.x);return{x:width,y:a.y+t*(b.y-a.y)};}},
      {inside:function(p){return p.y>=0;},at:function(a,b){var t=-a.y/(b.y-a.y);return{x:a.x+t*(b.x-a.x),y:0};}},
      {inside:function(p){return p.y<=height;},at:function(a,b){var t=(height-a.y)/(b.y-a.y);return{x:a.x+t*(b.x-a.x),y:height};}}
   ].forEach(function(edge){var input=out;out=[];for(var i=0;i<input.length;++i){var a=input[i],b=input[(i+1)%input.length],ia=edge.inside(a),ib=edge.inside(b);if(ia)out.push(a);if(ia!=ib)out.push(edge.at(a,b));}});
   // Remove coincident points and straight intermediate vertices, preserving
   // genuinely curved/distorted boundaries sampled along the source edges.
   out=out.filter(function(p,i){var q=out[(i+out.length-1)%out.length];return !q || Math.hypot(p.x-q.x,p.y-q.y)>1e-5;});
   var changed=true;while(changed && out.length>3){changed=false;for(var i=0;i<out.length;++i){var a=out[(i+out.length-1)%out.length],b=out[i],c=out[(i+1)%out.length],cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(cross)<1e-4){out.splice(i,1);changed=true;break;}}}
   return out;
}
function MF_footprint(target,source)
{
   var points=[],corners=[{x:0,y:0},{x:source.width,y:0},{x:source.width,y:source.height},{x:0,y:source.height}];
   for(var i=0;i<4;++i)for(var j=0;j<8;++j){var a=corners[i],b=corners[(i+1)%4],t=j/8,sky=source.Convert_I_RD(new Point(a.x+t*(b.x-a.x),a.y+t*(b.y-a.y))),p=sky?target.Convert_RD_I(sky):null;if(!p || !isFinite(p.x+p.y))throw new Error("Could not project the long-focal-length footprint onto the short-focal-length image.");points.push({x:p.x,y:p.y});}
   var clipped=MF_clipFootprint(points,target.width,target.height);
   if(clipped.length<3)throw new Error("The images have no usable overlapping coverage.");
   return MF_polygon(clipped,target.width,target.height);
}
function MF_starX(window,keepStars,work,factory)
{
   if(!factory && typeof StarXTerminator!="function")throw new Error("StarXTerminator is unavailable. Install and activate it, or disable separation if the inputs are already starless.");
   var before={};ImageWindow.windows.forEach(function(w){before[w.mainView.id]=true;});
   var generated=[],p=factory?factory():new StarXTerminator;
   // The blend accepts nonlinear inputs. Unscreen matches a later Screen blend.
   // Model/version and overlap retain the installed module's settings.
   p.output_stars=!!keepStars;p.unscreen=!!keepStars;
   try
   {
      if(!p.executeOn(window.mainView,false))throw new Error("StarXTerminator did not complete separation. Check its installation, license and AI model in the console.");
   }
   finally
   {
      ImageWindow.windows.forEach(function(w){if(!before[w.mainView.id]){work.own(w);generated.push(w);w.hide();}});
   }
   if(!window.hasAstrometricSolution)throw new Error("The copy lost its astrometric solution after StarXTerminator. Processing cannot continue with invalid geometry.");
   if(keepStars)
   {
      var candidates=generated.filter(function(w){return w.mainView.image.width==window.mainView.image.width && w.mainView.image.height==window.mainView.image.height && w.mainView.image.numberOfNominalChannels==window.mainView.image.numberOfNominalChannels;});
      if(candidates.length!=1)throw new Error("Could not uniquely identify the stars image generated by StarXTerminator.");
      MF_copyMetadata(window,candidates[0]);MF_identitySTF(candidates[0].mainView);return candidates[0];
   }
   generated.forEach(function(w){work.close(w);});return null;
}
function MF_retainBaseStars(geometry)
{
   if(!geometry || !geometry.baseStars || geometry.baseStars.isNull)return null;
   var stars=geometry.baseStars;stars.mainView.id=MF_unique("EstrellasBase");stars.show();geometry.work.release(stars);geometry.baseStars=null;return stars;
}

function MF_prepareGeometry(baseView,detailView,progress,services,options)
{
   MF_assertView(baseView,"Short-focal-length base");MF_assertView(detailView,"Long-focal-length detail");
   if(baseView.id==detailView.id)throw new Error("Select two different images.");
   services=services||{};options=options||{};
   if(options.removeStars && !services.starXFactory && typeof StarXTerminator!="function")throw new Error("StarXTerminator is not installed or unavailable. Activate it, or disable it only when the inputs are already starless.");
   var work=new MF_Work;
   function step(text,percent){console.writeln(text);if(progress)progress(text,percent);}
   try
   {
      var base=MF_clone(baseView,work,"BaseResuelta"),source=MF_clone(detailView,work,"LargaResuelta");
      MF_copyMetadata(baseView.window,base);MF_copyMetadata(detailView.window,source);
      step("Checking short-focal-length astrometry…",0);if(!base.hasAstrometricSolution && !(services.solve||MF_solveInput)(base,baseView.window,"short-focal-length")){work.dispose();return null;}
      step("Checking long-focal-length astrometry…",15);if(!source.hasAstrometricSolution && !(services.solve||MF_solveInput)(source,detailView.window,"long-focal-length")){work.dispose();return null;}
      if(!base.hasAstrometricSolution || !source.hasAstrometricSolution)throw new Error("Both images need a valid astrometric solution before reprojection.");
      var baseStars=null;
      if(options.removeStars)
      {
         step("StarXTerminator: separating short-focal-length stars…",30);baseStars=MF_starX(base,true,work,services.starXFactory);
         step("StarXTerminator: removing long-focal-length stars at the original resolution…",45);MF_starX(source,false,work,services.starXFactory);
      }
      var reference=new AstrometricMetadata,detailMetadata=new AstrometricMetadata;reference.ExtractMetadata(base);detailMetadata.ExtractMetadata(source);
      var footprint=MF_footprint(reference,detailMetadata);
      step("MosaicByCoordinates: reprojecting the long-focal-length image to "+reference.width+" × "+reference.height+" pixels at the short-focal-length scale…",65);
      var warp=new ImageReprojection(InterpolationAlgorithm.Auto,0.3,"_ra");
      var detail=work.own(warp.reprojectedImage(reference,source));detail.hide();
      if(detail.mainView.image.width!=baseView.image.width || detail.mainView.image.height!=baseView.image.height)throw new Error("Reprojection did not preserve the short-focal-length image dimensions.");
      // Reproject a constant-one source with the identical WCS to obtain
      // geometric coverage. Real dark nebula pixels are not mistaken for padding.
      step("Preparing astrometric coverage…",85);
      var white=work.own(new ImageWindow(source.mainView.image.width,source.mainView.image.height,1,32,true,false,MF_unique("SoporteOrigen")));
      white.mainView.beginProcess();try{white.mainView.image.fill(1);}finally{white.mainView.endProcess();}MF_copyMetadata(source,white);
      var supportWarp=new ImageReprojection(InterpolationAlgorithm.NearestNeighbor,0.3,"_ra");
      var projected=work.own(supportWarp.reprojectedImage(reference,white));projected.hide();
      var coverage=MF_math("iif("+projected.mainView.id+">0.5,1,0)",base.mainView,work,"CoberturaAstrometrica",false);
      MF_copyMetadata(base,coverage);work.close(projected);work.close(white);work.close(source);
      step("Geometry ready. Canvas and sampling match the short-focal-length image; the base has not been enlarged.",100);
      return {work:work,base:base,detail:detail,coverage:coverage,footprint:footprint,baseStars:baseStars,removeStars:!!options.removeStars};
   }
   catch(e){work.dispose();throw e;}
}
function MF_limitedPolygon(reference,vertices,coverage,work)
{
   var polygon=MF_polygonMask(reference,vertices,work);
   if(!coverage)return polygon;
   var mask=MF_math(polygon.mainView.id+"*iif("+coverage.mainView.id+">0.5,1,0)",reference,work,"CoberturaLimitada",false);work.close(polygon);return mask;
}

function MF_polygon(vertices,width,height)
{
   if (!Array.isArray(vertices) || vertices.length<3 || vertices.length>64)
      throw new Error("Coverage requires 3 to 64 vertices.");
   var points=vertices.map(function(p)
   {
      if (!p || typeof p.x!=="number" || typeof p.y!=="number" || !isFinite(p.x) || !isFinite(p.y) ||
          p.x<0 || p.x>width || p.y<0 || p.y>height)
         throw new Error("Coordinates must be finite and within the canvas.");
      return {x:p.x,y:p.y};
   });
   function cross(a,b,c) { return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x); }
   function on(a,b,p)
   {
      return Math.abs(cross(a,b,p))<1e-9 && p.x>=Math.min(a.x,b.x) && p.x<=Math.max(a.x,b.x) &&
         p.y>=Math.min(a.y,b.y) && p.y<=Math.max(a.y,b.y);
   }
   function intersects(a,b,c,d)
   {
      var ac=cross(a,b,c),ad=cross(a,b,d),ca=cross(c,d,a),cb=cross(c,d,b);
      return ((ac>0 && ad<0 || ac<0 && ad>0) && (ca>0 && cb<0 || ca<0 && cb>0)) ||
         on(a,b,c) || on(a,b,d) || on(c,d,a) || on(c,d,b);
   }
   var area=0,n=points.length;
   for (var i=0;i<n;++i)
   {
      var a=points[i],b=points[(i+1)%n],c=points[(i+2)%n];
      for (var j=i+1;j<n;++j)
         if (a.x===points[j].x && a.y===points[j].y)
            throw new Error("Do not repeat vertices; Close polygon connects the last vertex to the first.");
      if (Math.abs(cross(a,b,c))<1e-9 && (b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y)<0)
         throw new Error("Polygon edges cannot double back on themselves.");
      for (var k=i+2;k<n;++k)
      {
         if (i===0 && k===n-1) continue;
         if (intersects(a,b,points[k],points[(k+1)%n]))
            throw new Error("Polygon edges cannot cross or touch.");
      }
      area+=a.x*b.y-b.x*a.y;
   }
   if (Math.abs(area)<1)
      throw new Error("The polygon must cover at least half a square pixel.");
   return points;
}
function MF_PolygonSelection(width,height)
{
   this.width=width; this.height=height; this.points=[]; this.closed=false;
}
MF_PolygonSelection.prototype.point=function(x,y)
{
   return {x:Math.round(MF_clamp(x,0,this.width)),y:Math.round(MF_clamp(y,0,this.height))};
};
MF_PolygonSelection.prototype.add=function(x,y)
{
   if (this.closed) throw new Error("Reopen the contour with Undo or move its vertices.");
   if (this.points.length>=64) throw new Error("Up to 64 vertices are supported.");
   this.points.push(this.point(x,y));
};
MF_PolygonSelection.prototype.close=function()
{
   MF_polygon(this.points,this.width,this.height); this.closed=true;
};
MF_PolygonSelection.prototype.undo=function()
{
   if (this.closed) this.closed=false;
   else this.points.pop();
};
MF_PolygonSelection.prototype.polygon=function()
{
   if (!this.closed) throw new Error("Close the polygon before previewing or creating the mask.");
   return MF_polygon(this.points,this.width,this.height);
};
function MF_maskPoint(x,y,viewWidth,viewHeight,width,height)
{
   var scale=Math.min(viewWidth/width,viewHeight/height);
   return {x:MF_clamp((x-(viewWidth-width*scale)/2)/scale,0,width),
      y:MF_clamp((y-(viewHeight-height*scale)/2)/scale,0,height)};
}
function MF_defaultCircle(footprint,width,height)
{
   var points=MF_polygon(footprint,width,height);
   var minX=width,minY=height,maxX=0,maxY=0;
   points.forEach(function(p){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
   function radius(x,y)
   {
      var inside=false,distance=Infinity;
      for(var i=0,j=points.length-1;i<points.length;j=i++)
      {
         var a=points[j],b=points[i];
         if((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
         var dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
         var t=den?MF_clamp(((x-a.x)*dx+(y-a.y)*dy)/den,0,1):0;
         distance=Math.min(distance,Math.sqrt(Math.pow(x-a.x-t*dx,2)+Math.pow(y-a.y-t*dy,2)));
      }
      return inside?distance:0;
   }
   var best={x:(minX+maxX)/2,y:(minY+maxY)/2,r:0};best.r=radius(best.x,best.y);
   for(var iy=1;iy<32;++iy)for(var ix=1;ix<32;++ix)
   {
      var x=minX+(maxX-minX)*ix/32,y=minY+(maxY-minY)*iy/32,r=radius(x,y);
      if(r>best.r)best={x:x,y:y,r:r};
   }
   if(best.r<0.5)return points;
   var result=[];
   for(var k=0;k<32;++k){var angle=2*Math.PI*k/32;result.push({x:best.x+0.94*best.r*Math.cos(angle),y:best.y+0.94*best.r*Math.sin(angle)});}
   return MF_polygon(result,width,height);
}
function MF_polygonMask(reference,vertices,work)
{
   MF_assertView(reference,"Long-focal-length detail");
   var points=MF_polygon(vertices,reference.image.width,reference.image.height),inside="0";
   // Even-odd ray crossing rule, evaluated at each pixel center.
   // Skip horizontal edges to avoid division by zero in PixelMath.
   for (var i=0;i<points.length;++i)
   {
      var a=points[i],b=points[(i+1)%points.length];
      if (a.y===b.y) continue;
      var crossing="((("+a.y+">(y()+0.5)) != ("+b.y+">(y()+0.5))) && "+
         "((x()+0.5)<("+a.x+"+((y()+0.5)-"+a.y+")*("+(b.x-a.x)+")/("+(b.y-a.y)+"))))";
      inside="("+inside+" != "+crossing+")";
   }
   return MF_math("iif("+inside+",1,0)",reference,work,"CoberturaPoligonal",false);
}
// Shared mask-preview and final-blend calculation. Keep support hard-edged;
// apply the inward transition exactly once.
function MF_effectiveMask(support,sigma,work)
{
   sigma=MF_number(sigma,"Coverage transition",0,256);
   if (sigma===0) return support;
   var blurred=MF_blur(support,sigma,work,"Transicion");
   var effective=MF_math(support.mainView.id+"*min(1,max(0,("+blurred.mainView.id+"-0.5)*2))",
      support.mainView,work,"MascaraFinal",false);
   work.close(blurred);
   return effective;
}
function MF_renderCoverage(reference,vertices,sigma,coverage)
{
   var work=new MF_Work;
   try
   {
      var support=MF_limitedPolygon(reference,vertices,coverage,work);
      return MF_effectiveMask(support,sigma,work).mainView.image.render();
   }
   finally { work.dispose(); }
}
function MF_createCoverage(reference,vertices,coverage,visible)
{
   var work=new MF_Work;
   try
   {
      var mask=MF_limitedPolygon(reference,vertices,coverage,work);
      MF_copyMetadata(reference.window,mask);
      if(visible!==false)mask.show();
      work.release(mask);
      return mask;
   }
   finally { work.dispose(); }
}

// Contrast fit on large structures; not photometric calibration.
function MF_fitGain(pairs)
{
   var data = pairs.filter(function(p) { return isFinite(p[0]) && isFinite(p[1]); });
   var fallback = {gain:1, offset:0, reliable:false, count:data.length, r2:0};
   if (data.length < 32) return fallback;
   function median(values)
   {
      values.sort(function(a,b) { return a-b; });
      var n = values.length, i = Math.floor(n/2);
      return n % 2 ? values[i] : (values[i-1] + values[i])/2;
   }
   var fit;
   for (var iteration = 0; iteration < 3; ++iteration)
   {
      var mx=0, my=0, xx=0, yy=0, xy=0, n=data.length;
      for (var i=0; i<n; ++i) { mx+=data[i][0]/n; my+=data[i][1]/n; }
      for (var j=0; j<n; ++j)
      {
         var dx=data[j][0]-mx, dy=data[j][1]-my;
         xx+=dx*dx; yy+=dy*dy; xy+=dx*dy;
      }
      if (xx < 1e-10 || yy < 1e-10) return fallback;
      var gain=xy/xx, offset=my-gain*mx, r2=xy*xy/(xx*yy);
      if (!isFinite(gain) || gain < 0.1 || gain > 10 || r2 < 0.25) return fallback;
      fit={gain:gain,offset:offset,reliable:true,count:n,r2:r2};
      var residuals=data.map(function(p) { return p[1]-gain*p[0]-offset; });
      var center=median(residuals.slice());
      var mad=median(residuals.map(function(r) { return Math.abs(r-center); }));
      if (mad < 1e-8) break;
      var limit=3.5*1.4826*mad;
      var kept=data.filter(function(p) { return Math.abs(p[1]-gain*p[0]-offset-center) <= limit; });
      if (kept.length < 32 || kept.length === n || iteration === 2) break;
      data=kept;
   }
   return fit || fallback;
}
function MF_samplePairs(base, detail, mask)
{
   var w=base.width, h=base.height, pairs=[];
   var step=Math.max(1,Math.ceil(Math.sqrt(w*h/6400)));
   for (var y=Math.floor(step/2); y<h; y+=step)
      for (var x=Math.floor(step/2); x<w; x+=step)
         if (mask.sample(x,y,0) > 0.75)
            pairs.push([detail.sample(x,y,0),base.sample(x,y,0)]);
   return pairs;
}
// MLT normalizes reconstructed samples, clipping negative detail coefficients.
// Differences between positive residuals preserve both coefficient signs.
function MF_layers(layers)
{
   if (!Array.isArray(layers) || layers.length!==8) throw new Error("Provide eight MLT layer selection states.");
   return layers.map(function(value){return !!value;});
}
function MF_mltResidual(source, depth, work)
{
   if (depth===0) return source;
   var result=MF_clone(source.mainView,work,"ResiduoMLT"), p=new MultiscaleLinearTransform;
   var table=[];
   for(var i=0;i<=depth;++i) table.push([i===depth,false,0,false,3,1,1]);
   p.layers=table;
   p.transform=MultiscaleLinearTransform.StarletTransform; p.scaleDelta=0;
   // Normalized, nonoscillating B3 spline: residuals stay within the input range.
   var f=[1/16,4/16,6/16,4/16,1/16], kernel=[];
   for(var y=0;y<5;++y)for(var x=0;x<5;++x)kernel.push(f[y]*f[x]);
   p.scalingFunctionData=kernel;p.scalingFunctionRowFilter=f;p.scalingFunctionColFilter=f;
   p.scalingFunctionName="B3 Spline (5)";
   p.linearMask=false;p.linearMaskPreview=false;p.noiseThresholding=false;p.deringing=false;
   p.largeScaleFunction=MultiscaleLinearTransform.NoFunction;
   p.previewMode=MultiscaleLinearTransform.Disabled;p.lowRange=0;p.highRange=0;
   if(!p.executeOn(result.mainView))throw new Error("MLT could not compute the residual for layer "+depth+".");
   return result;
}
function MF_mltBand(source,layers,work)
{
   layers=MF_layers(layers);
   var band=null;
   for(var i=0;i<8;++i)
   {
      if(!layers[i])continue;
      var first=i;while(i+1<8 && layers[i+1])++i;
      var a=MF_mltResidual(source,first,work), b=MF_mltResidual(source,i+1,work);
      var next=MF_math((band?band.mainView.id+"+":"")+a.mainView.id+"-"+b.mainView.id,source.mainView,work,"CapasMLT",false);
      if(band)work.close(band);if(a!==source)work.close(a);work.close(b);band=next;
   }
   return band || MF_math("0",source.mainView,work,"CapasMLT",false);
}
function MF_prepare(config, progress)
{
   MF_validate(config);
   var work=new MF_Work;
   function step(text,percent) { if (progress) progress(text,percent); }
   try
   {
      step("Copying images without changing the originals…",0);
      var base=MF_clone(config.base,work,"Base");
      MF_copyMetadata(config.base.window,base);
      var detail=MF_clone(config.detail,work,"Detalle");
      var mask=MF_clone(config.mask,work,"Mascara");
      var lbase=MF_lightness(base,work,"BaseL"), ldetail=MF_lightness(detail,work,"DetalleL");
      // User-provided geometry: black image samples do not imply missing coverage.
      var support=MF_math("min(1,max(0,"+mask.mainView.id+"))"+(config.coverage?"*iif("+config.coverage.id+">0.5,1,0)":""),mask.mainView,work,"Cobertura",false);
      var effective=MF_effectiveMask(support,config.feather,work);
      if(config.method==="MLT")
      {
         var fit={gain:1,reliable:true,count:0,r2:1};
         if(config.autoGain)
         {
            step("Estimating lightness contrast…",50);
            var sm=MF_blur(support,4,work,"SoporteAjuste");
            var bw=MF_math(lbase.mainView.id+"*"+support.mainView.id,lbase.mainView,work,"BaseAjuste",false);
            var dw=MF_math(ldetail.mainView.id+"*"+support.mainView.id,ldetail.mainView,work,"DetalleAjuste",false);
            var bs=MF_normalizedBlur(bw,sm,4,work,"BaseSuave");
            var ds=MF_normalizedBlur(dw,sm,4,work,"DetalleSuave");
            var samples=MF_samplePairs(bs.mainView.image,ds.mainView.image,effective.mainView.image);
            if(samples.length<32)throw new Error("Not enough valid interior: enlarge the mask or reduce the transition.");
            fit=MF_fitGain(samples);
         }
         var keep=[base,lbase,ldetail,effective];
         work.windows.slice().forEach(function(window){if(keep.indexOf(window)<0)work.close(window);});
         return {work:work,base:base,lightness:lbase,detailLightness:ldetail,mask:effective,
            fit:fit,config:config,layersKey:null,result:null,accepted:false,amount:null,gain:null};
      }
      step("Computing detail scales and transition…",65);
      var maskFine=MF_blur(support,config.fine,work,"MaskFina");
      var maskCoarse=MF_blur(support,config.coarse,work,"MaskGruesa");
      var wb=MF_math(lbase.mainView.id+"*"+support.mainView.id,lbase.mainView,work,"BaseP",false);
      var wd=MF_math(ldetail.mainView.id+"*"+support.mainView.id,ldetail.mainView,work,"DetalleP",false);
      var bf=MF_normalizedBlur(wb,maskFine,config.fine,work,"BaseFina");
      var bc=MF_normalizedBlur(wb,maskCoarse,config.coarse,work,"BaseGruesa");
      var df=MF_normalizedBlur(wd,maskFine,config.fine,work,"DetalleFino");
      var dc=MF_normalizedBlur(wd,maskCoarse,config.coarse,work,"DetalleGrueso");
      var pairs=MF_samplePairs(bc.mainView.image,dc.mainView.image,effective.mainView.image);
      if (pairs.length < 32)
         throw new Error("The mask has insufficient valid interior. Check coverage and reduce the transition for small fields.");
      var fit=config.autoGain ? MF_fitGain(pairs) : {gain:1,reliable:true,count:pairs.length,r2:1};
      var baseBand=MF_math(bf.mainView.id+"-"+bc.mainView.id,bf.mainView,work,"BandaBase",false);
      var detailBand=MF_math(df.mainView.id+"-"+dc.mainView.id,df.mainView,work,"BandaDetalle",false);
      var retained=[base,lbase,effective,baseBand,detailBand];
      if(config.method==="MLT")retained.push(ldetail);
      work.windows.slice().forEach(function(window) { if (retained.indexOf(window)<0) work.close(window); });
      return {work:work,base:base,lightness:lbase,mask:effective,baseBand:baseBand,detailBand:detailBand,
         detailLightness:config.method==="MLT"?ldetail:null,layersKey:null,fit:fit,config:config,result:null,accepted:false,amount:null,gain:null};
   }
   catch (e) { work.dispose(); throw e; }
}
function MF_update(state, amount, gain, checkCandidate, layers, progress)
{
   amount=MF_number(amount,"Intensity",0,1);
   gain=MF_number(gain,"Relative gain",0,4);
   var work=state.work, before=work.windows.slice(), candidate=null;
   var isMLT=state.config.method==="MLT", selected=isMLT?MF_layers(layers || [true,true,true,false,false,false,false,false]):null;
   try
   {
      if(progress)progress("Preparing selected detail layers…",10);
      if (amount === 0 || gain === 0) candidate=MF_clone(state.base.mainView,work,"Resultado");
      else
      {
         var l=state.lightness.mainView.id, m=state.mask.mainView.id;
         var band=isMLT?MF_mltBand(state.detailLightness,selected,work):state.detailBand;
         if(progress)progress("Injecting detail into base lightness…",55);
         var expression="min(1,max(0,"+l+"+"+amount+"*"+m+"*("+(gain*state.fit.gain)+"*"+
            band.mainView.id+(isMLT?"":"-"+state.baseBand.mainView.id)+")))";
         var newL=MF_math(expression,state.lightness.mainView,work,"NuevaL",false);
         if (state.base.mainView.image.isColor)
         {
            var mixed=MF_clone(state.base.mainView,work,"Color");
            var p=new LRGBCombination;
            // Native process order: R, G, B, L.
            p.channels=[[false,"",1],[false,"",1],[false,"",1],[true,newL.mainView.id,1]];
            p.mL=0.5; p.mc=0.5; p.noiseReduction=false; p.clipHighlights=false;
            if (!p.executeOn(mixed.mainView)) throw new Error("Could not combine the new lightness with the base color.");
            // Prevent color conversion from changing pixels outside the effective mask.
            candidate=MF_math("iif("+m+">0,"+mixed.mainView.id+","+state.base.mainView.id+")",
               state.base.mainView,work,"Resultado",true);
         }
         else
            candidate=MF_math("iif("+m+">0,"+newL.mainView.id+","+state.base.mainView.id+")",
               state.base.mainView,work,"Resultado",false);
      }
      if(progress)progress("Copying astrometry and metadata…",80);
      MF_copyMetadata(state.base,candidate);
      MF_identitySTF(candidate.mainView);
      if(progress)progress("Rendering the comparison…",90);
      if (checkCandidate) checkCandidate(candidate);
      var previous=state.result;
      state.result=candidate; state.amount=amount; state.gain=gain;
      if(isMLT)state.layersKey=selected.join(",");
      if (previous) work.close(previous);
      if(progress)progress("Comparison ready",100);
      return candidate;
   }
   finally
   {
      work.windows.slice().forEach(function(window)
      {
         if (before.indexOf(window)<0 && window!==state.result) work.close(window);
      });
   }
}
function MF_accept(state, id, amount, gain, layers)
{
   MF_validId(id);
   if(state.config.method==="MLT" && MF_layers(layers || [true,true,true,false,false,false,false,false]).join(",")!==state.layersKey)
      throw new Error("Update the comparison with the selected layers before creating the blended image.");
   if (!state.result || state.result.isNull || amount!==state.amount || gain!==state.gain)
      throw new Error("Update the comparison with the selected values before creating the blended image.");
   if (!ImageWindow.windowById(id).isNull && ImageWindow.windowById(id).mainView.id!==state.result.mainView.id)
      throw new Error("An image already exists with this name: "+id+".");
   state.result.mainView.id=id;
   state.result.show();
   state.accepted=true;
   state.work.release(state.result);
   return state.result;
}

function MF_recombineStars(starless,stars,work)
{
   if(!starless || starless.isNull || !stars || stars.isNull)throw new Error("Both the starless result and base stars must be available.");
   var a=starless.mainView,b=stars.mainView;
   MF_assertView(a,"Starless result");MF_assertView(b,"Base stars");
   if(a.image.width!==b.image.width || a.image.height!==b.image.height || a.image.numberOfNominalChannels!==b.image.numberOfNominalChannels)
      throw new Error("The starless result and stars must have matching dimensions and channels.");
   var expression="~((~"+a.id+")*(~"+b.id+"))";
   var result=MF_math(expression,a,work,"Recombined",a.image.isColor);
   MF_copyMetadata(starless,result);MF_identitySTF(result.mainView);
   return result;
}
function MF_keepResult(state,id,amount,gain,layers,recombine)
{
   // Compute the optional Screen image before committing acceptance.
   var extraWork=new MF_Work,recombined=null;
   try
   {
      if(recombine)recombined=MF_recombineStars(state.result,state.config.baseStars,extraWork);
      MF_accept(state,id,amount,gain,layers);
      if(recombined)
      {
         recombined.show();extraWork.release(recombined);

      }
      return recombined;
   }
   finally{extraWork.dispose();}
}
function MF_copyright(parent)
{
   return MF_label(parent,"Copyright © Carlos Rincón 2026");
}
function MF_nextStep(message,title)
{
   return new MessageBox(message,title,StdIcon_Information,StdButton_Ok).execute();
}
var MF_SAMPLE_DOWNLOAD_URL = "https://github.com/crinconlab/pixinsight-scripts/releases/download/sample-images-v1.0/Crinconlab_Sample_Images.zip";
// Pinned from the release asset metadata and checked against the downloaded ZIP.
// Update this digest only when deliberately publishing a new sample asset.
var MF_SAMPLE_BYTES = 85376365;
var MF_SAMPLE_SHA256 = "9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26";

// Streaming SHA-256 (FIPS 180-4). Kept in this script: no downloaded
// implementation, external hash program or whole-file allocation is required.
function MF_SHA256()
{
   this.state=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
      0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
   this.block=new Uint8Array(64);this.words=new Uint32Array(64);
   this.used=0;this.bytes=0;this.result=null;
}
MF_SHA256.K=new Uint32Array([
   0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
   0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
   0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
   0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
   0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
   0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
   0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
   0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
MF_SHA256.prototype.compress=function()
{
   var w=this.words,b=this.block,h=this.state,k=MF_SHA256.K;
   function r(x,n){return (x>>>n)|(x<<(32-n));}
   for(var i=0;i<16;++i)w[i]=((b[4*i]<<24)|(b[4*i+1]<<16)|(b[4*i+2]<<8)|b[4*i+3])>>>0;
   for(var j=16;j<64;++j)
   {
      var x=w[j-15],y=w[j-2];
      w[j]=(w[j-16]+(r(x,7)^r(x,18)^(x>>>3))+w[j-7]+(r(y,17)^r(y,19)^(y>>>10)))>>>0;
   }
   var a=h[0],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],v=h[7],bb=h[1];
   for(var n=0;n<64;++n)
   {
      var t1=(v+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[n]+w[n])>>>0;
      var t2=((r(a,2)^r(a,13)^r(a,22))+((a&bb)^(a&c)^(bb&c)))>>>0;
      v=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=bb;bb=a;a=(t1+t2)>>>0;
   }
   var add=[a,bb,c,d,e,f,g,v];
   for(var z=0;z<8;++z)h[z]=(h[z]+add[z])>>>0;
};
MF_SHA256.prototype.update=function(data,count)
{
   if(this.result!==null)throw new Error("SHA-256 has already been finalized.");
   if(count===undefined)count=data.length;
   if(!Number.isSafeInteger(count) || count<0 || !Number.isSafeInteger(this.bytes+count))
      throw new Error("Invalid SHA-256 input length.");
   this.bytes+=count;
   // PJSR ByteArray exposes at(); typed arrays/arrays can use indexed access.
   var nativeBytes=!(data instanceof Uint8Array) && typeof data.at==="function";
   for(var i=0;i<count;++i)
   {
      this.block[this.used++]=nativeBytes?data.at(i):data[i];
      if(this.used===64){this.compress();this.used=0;}
   }
   return this;
};
MF_SHA256.prototype.hex=function()
{
   if(this.result!==null)return this.result;
   var low=(this.bytes*8)>>>0,high=Math.floor(this.bytes/0x20000000)>>>0;
   this.block[this.used++]=0x80;
   if(this.used>56){while(this.used<64)this.block[this.used++]=0;this.compress();this.used=0;}
   while(this.used<56)this.block[this.used++]=0;
   for(var i=0;i<4;++i){this.block[56+i]=(high>>>(24-8*i))&255;this.block[60+i]=(low>>>(24-8*i))&255;}
   this.compress();
   var out="";for(var j=0;j<8;++j)out+=("00000000"+this.state[j].toString(16)).slice(-8);
   this.result=out;return out;
};
function MF_fileSHA256(path)
{
   var file=new File,hash=new MF_SHA256;
   try
   {
      file.openForReading(path);var size=file.size;
      while(file.position<size)
      {
         if(console.abortRequested)throw new Error("Sample verification canceled.");
         var position=file.position,count=Math.min(1048576,size-position);
         var block=file.read(DataType_ByteArray,count);
         if(file.position!==position+count)throw new Error("The file changed while verifying its SHA-256.");
         hash.update(block,count);CoreApplication.processEvents();
      }
      if(console.abortRequested)throw new Error("Sample verification canceled.");
      if(file.size!==size)throw new Error("The file changed while verifying its SHA-256.");
      return hash.hex();
   }
   finally{if(file.isOpen)file.close();}
}
function MF_sampleTemporaryPath(path,kind)
{
   var name;
   do{name=path+"."+kind+"-"+Date.now()+"-"+Math.floor(Math.random()*1000000000);}
   while(File.exists(name)||File.directoryExists(name));
   return name;
}
function MF_publishSampleZip(partial,path)
{
   partial=CR_assertUserWritePath(partial);path=CR_assertUserWritePath(path);
   var backup=null;
   if(File.exists(path))
   {
      backup=MF_sampleTemporaryPath(path,"previous");
      File.moveFile(backup,path);
   }
   try{File.moveFile(path,partial);}
   catch(e)
   {
      if(backup)
      {
         try{File.moveFile(path,backup);}
         catch(restoreError){throw new Error("Could not install the verified ZIP. The previous file is preserved at: "+backup+". "+String(restoreError));}
      }
      throw e;
   }
   if(backup)try{File.remove(backup);}catch(e){console.warningln("The verified ZIP was saved, but the previous file remains at: "+backup);}
}
var MF_SAMPLE_TERMS = "These images are shared for personal testing of the Crinconlab Focal Length Blend script only.\n\nPlease do not redistribute or publish the supplied images or any results created from them without prior permission from Carlos Rincón.\n\nThank you for respecting the author’s work.";
class MF_SampleTermsDialog extends Dialog
{
constructor()
{
   super();var self=this;this.agreed=false;
   this.windowTitle="Sample images · Copyright and usage";
   var copyright=MF_copyright(this),text=MF_label(this,MF_SAMPLE_TERMS);
   var accept=this.agreeButton=new PushButton(this);accept.text="Agree and Download";
   accept.toolTip="Accept these usage conditions and choose where to save the sample ZIP.";
   accept.onClick=function(){self.agreed=true;self.ok();};
   var cancel=this.cancelButton=new PushButton(this);cancel.text="Cancel";cancel.toolTip="Close without accepting the conditions or starting a download.";
   cancel.onClick=function(){self.agreed=false;self.cancel();};
   var row=new HorizontalSizer;row.spacing=8;row.addStretch();row.add(accept);row.add(cancel);
   this.sizer=new VerticalSizer;this.sizer.margin=14;this.sizer.spacing=12;this.sizer.add(copyright);this.sizer.add(text);this.sizer.add(row);
   this.setScaledMinWidth(570);this.adjustToContents();
}
}
// Transfer directly: never open a modal web browser from the processing workflow.
function MF_saveSampleZip(path,transfer)
{
   path=CR_assertUserWritePath(path);
   var partial=CR_assertUserWritePath(MF_sampleTemporaryPath(path,"download")),completed=false;
   try
   {
      var program=/^(MS)?Windows$/i.test(CoreApplication.platform)?"curl.exe":"/usr/bin/curl";
      var code=transfer?transfer(partial):ExternalProcess.execute(program,
         ["--fail","--location","--proto","=https","--proto-redir","=https","--silent","--show-error","--connect-timeout","30","--max-time","900","--output",partial,MF_SAMPLE_DOWNLOAD_URL]);
      if(code!==0)throw new Error("Sample download failed (transfer code "+code+"). Please check your internet connection.");
      var file=new File;
      try{file.openForReading(partial);if(file.size!==MF_SAMPLE_BYTES)throw new Error("The downloaded ZIP is incomplete or unexpected. Please retry.");}
      finally{if(file.isOpen)file.close();}
      console.writeln("Verifying the sample ZIP (SHA-256)...");
      if(MF_fileSHA256(partial)!==MF_SAMPLE_SHA256)
         throw new Error("Sample ZIP SHA-256 mismatch. The download was rejected; any previous destination file has been preserved.");
      MF_publishSampleZip(partial,path);completed=true;
      return true;
   }
   finally
   {
      if(!completed && File.exists(partial))try{File.remove(partial);}catch(e){console.warningln("Could not remove the rejected partial download: "+partial);}
   }
}
function MF_downloadSampleFile()
{
   var save=new SaveFileDialog;
   save.caption="Save Crinconlab sample images";
   save.filters=[["ZIP archives","*.zip"]];
   save.initialPath="Crinconlab_Sample_Images.zip";
   save.overwritePrompt=true;
   if(!save.execute())return false;
   console.hide();console.writeln("Downloading sample images (81.4 MiB)...");
   MF_saveSampleZip(save.fileName);
   new MessageBox("Download completed and SHA-256 verified.\n\n"+save.fileName+"\n\nUnzip this file to use the sample images.","Sample images",StdIcon_Information,StdButton_Ok).execute();
   return true;
}
function MF_downloadSamples(openBrowser,showTerms)
{
   var agreed=false;
   if(showTerms)agreed=showTerms();
   else{var dialog=new MF_SampleTermsDialog;agreed=dialog.execute() && dialog.agreed;}
   if(!agreed)return false;
   var opened=openBrowser?openBrowser(MF_SAMPLE_DOWNLOAD_URL):MF_downloadSampleFile();
   return opened!==false;
}
class MF_ZoomWarning extends Dialog
{
constructor()
{
   super();var self=this;this.action="cancel";
   this.windowTitle="Review the full image";
   var text=MF_label(this,"The preview is zoomed or panned, so part of the image is outside the visible area. We recommend Fit Image to check the overall integration for bright patches and mask seams before creating the blended image.");
   var fit=this.fitButton=new PushButton(this);fit.text="Fit Image";fit.toolTip="Show the whole preview and return to the comparison without creating an image.";
   fit.onClick=function(){self.action="fit";self.ok();};
   var create=this.createButton=new PushButton(this);create.text="Create Anyway";create.toolTip="Create the current computed result now, without changing its pixels or the preview zoom.";
   create.onClick=function(){self.action="create";self.ok();};
   var cancel=this.cancelButton=new PushButton(this);cancel.text="Cancel";cancel.toolTip="Return to the comparison without creating an image or changing the zoom.";
   cancel.onClick=function(){self.action="cancel";self.cancel();};
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(fit);buttons.addStretch();buttons.add(create);buttons.add(cancel);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=12;this.sizer.add(text);this.sizer.add(buttons);this.sizer.add(MF_copyright(this));
   this.setScaledMinWidth(550);this.adjustToContents();
}
}
function MF_zoomCreationChoice()
{
   var dialog=new MF_ZoomWarning;return dialog.execute()?dialog.action:"cancel";
}
// Preview geometry shared by both panels.
function MF_Camera(width,height)
{
   this.width=width; this.height=height; this.x=width/2; this.y=height/2;
   this.scale=1; this.fitted=true;
}
MF_Camera.prototype.fit=function(w,h)
{
   this.scale=Math.min(w/this.width,h/this.height,1);
   this.x=this.width/2; this.y=this.height/2; this.fitted=true;
};
MF_Camera.prototype.showsWholeImage=function(w,h)
{
   if(!(this.scale>0) || !(w>0) || !(h>0))return false;
   var hx=w/(2*this.scale),hy=h/(2*this.scale),t=1e-6;
   return this.x-hx<=t && this.y-hy<=t && this.x+hx>=this.width-t && this.y+hy>=this.height-t;
};
MF_Camera.prototype.limit=function(w,h)
{
   var hx=w/(2*this.scale),hy=h/(2*this.scale);
   this.x=hx>=this.width/2?this.width/2:MF_clamp(this.x,hx,this.width-hx);
   this.y=hy>=this.height/2?this.height/2:MF_clamp(this.y,hy,this.height-hy);
};
MF_Camera.prototype.zoom=function(factor,x,y,w,h)
{
   var ix=this.x+(x-w/2)/this.scale,iy=this.y+(y-h/2)/this.scale;
   this.scale=MF_clamp(this.scale*factor,0.01,8); this.fitted=false;
   this.x=ix-(x-w/2)/this.scale; this.y=iy-(y-h/2)/this.scale;
   this.limit(w,h);
};
MF_Camera.prototype.pan=function(dx,dy,w,h)
{
   this.x-=dx/this.scale; this.y-=dy/this.scale; this.fitted=false; this.limit(w,h);
};

var MF_HELP = [
   "# Focal Length Blend \u2014 0.11.6, preliminary release",
   "",
   "Copyright \u00a9 Carlos Rinc\u00f3n 2026",
   "",
   "## Before you start",
   "",
   "An English requirements notice appears before setup. Click **OK** to proceed or **Cancel** to stop without creating temporary images. Both inputs must be stretched, with gradients removed and color calibration completed. Star deconvolution is optional; noise reduction is recommended.",
   "",
   "With StarXTerminator, use inputs with stars and an installed, activated module with a working AI model. Without StarXTerminator, both inputs must already be starless and retain valid astrometric solutions for their current pixel grids; disable separation in setup.",
   "",
   "## Prepare the inputs",
   "",
   "Select two stretched images with gradients corrected and color prepared:",
   "",
   "- **Base: Short focal length** \u2014 the wide-field image. It defines the exact output width, height, pixel scale, field, color and retained stars.",
   "- **Detail: Long focal length** \u2014 the image supplying high-frequency lightness structure. It is reprojected onto the base grid, with black padding outside its footprint.",
   "",
   "The inputs may initially have different dimensions, orientations and pixel scales. The base is never enlarged to match the long-focal image. Reprojection can therefore discard some of the long-focal input's finer original sampling.",
   "",
   "Leave **Separate stars with StarXTerminator** enabled when the inputs contain stars. The script first reuses existing astrometry or solves each unsolved input, then separates stars on copies at their original resolution, and finally reprojects the long-focal starless copy. Image Solver requires stars. Disable separation only for already starless inputs with valid solutions for their own pixel grids.",
   "",
   "The script does not stretch images, remove gradients or calibrate color. The preparation reminder is displayed at the top of setup; there is no confirmation checkbox to tick. Image dimensions, mask type, coverage and output identifiers are still checked automatically. Those checks cannot determine whether gradients or color have been properly corrected.",
   "",
   "## Install and update locally",
   "",
   "Keep the complete **Crinconlab** folder together with its scripts, the SVG files in **icons**, and **manuals**. Replace the previous complete folder, keeping any personal files separately. In PixInsight, open **Script \u2192 Feature Scripts\u2026**, remove outdated entries pointing to other locations if necessary, then **Add\u2026** the folder containing the `.js` files and click **Done**.",
   "",
   "Launch **Script \u2192 Crinconlab \u2192 Focal Length Blend**. The filename remains `Mezcla_Focales.js` so the replacement updates the existing script. Do not install both old and new copies in different folders. Source is published on GitHub for manual installation; the automatic update repository is not active.",
   "",
   "## 1. Solve, separate stars and prepare geometry",
   "",
   "Choose the base and detail using their dropdown lists or **Open file\u2026**. Each file must contain a single main image; monochrome and RGB without alpha channels are supported. **Refresh lists** updates the available open images.",
   "",
   "Click **1. Solve, separate stars and prepare geometry**. Already solved images reuse their existing solutions. Before solving an unsolved input, a notification identifies its role and original image name, for example:",
   "",
   "> Proceed with the astrometric solution of the long-focal-length image?",
   "",
   "**OK** opens the official Image Solver dialog; **Cancel** stops preparation and cleans its temporary copies. Review coordinates, scale and other solver settings before proceeding. There is no notification for an already solved input because no new solve is performed.",
   "",
   "After both solutions are available, StarXTerminator runs if enabled. This requires an installed, activated module with a working AI model. Its installed model and overlap defaults are retained. The script does not install or license the product.",
   "",
   "The long-focal starless image is then reprojected with **ImageReprojection**, the official backend used by MosaicByCoordinates. The complete short-focal astrometric geometry, including available distortion, defines the destination grid. This avoids an automatically enlarged mosaic. The short-focal pixels are not resampled, although StarXTerminator does change the pixels of its copy when separation is enabled.",
   "",
   "When explicit geometry preparation finishes, a **Go to Create Mask** notice asks you to click OK and opens the mask editor. Prepared geometry is reused when opening the mask editor or comparison. Changing either input or the StarXTerminator option invalidates it. If you edit an original externally while the script is open, reselect that input before preparing again. Original images are not overwritten.",
   "",
   "## Where the stars are kept",
   "",
   "The short-focal base is separated with **Unscreen**, appropriate to this stretched-image workflow. The long-focal image is made starless without keeping an unnecessary second stars layer.",
   "",
   "When you confirm **Create Blended Image**, the starless blend remains open and the short-focal stars are retained in a separate image named **CR_MF_EstrellasBase**, with a numeric suffix when necessary. The identifier is retained for compatibility with earlier releases. **Neither image is saved to disk automatically.** Save the blend and stars manually.",
   "",
   "Stars are not added back unless you select **Recombine stars in a new image when creating the blended image** in the comparison window. This option is available only when the script has retained base stars from StarXTerminator. It starts unchecked. When selected, **Create Blended Image** preserves the starless blend and stars separately and creates an additional Screen-combined image, named with a unique `CR_MF_Recombined` identifier. Nothing is saved to disk automatically.",
   "",
   "The native PixelMath expression uses the actual starless-result and stars-image identifiers:",
   "",
   "```text",
   "~((~starless_result)*(~base_stars))",
   "```",
   "",
   "Separation and recombination may leave residuals, halos or clipped samples; exact numerical reconstruction is not guaranteed. **Back** retains temporary geometry and stars for reuse. Discarding, closing the workflow, changing inputs or changing the separation option removes temporary stars. No stars layer is created when StarXTerminator is disabled. Temporary masks created by this script are hidden and closed automatically when the workflow ends. Externally supplied masks are left untouched.",
   "",
   "RC Astro generally recommends early separation in the linear stage. This particular workflow expects stretched inputs and uses Unscreen for their base stars. It does not convert linear inputs to stretched inputs. See the official usage notes: https://www.rc-astro.com/starxterminator-usage-notes/",
   "",
   "## 2. Create mask",
   "",
   "Click **2. Create mask\u2026**. Draw on the short-focal base:",
   "",
   "- **Purple:** fixed astrometric footprint of the long-focal image.",
   "- **Cyan:** your editable coverage polygon, initially a circular outline inscribed inside that footprint. The circle is represented by 32 movable vertices, so you can reshape it freely. Very small or degenerate coverage can fall back to its footprint.",
   "",
   "### Zoom and pan in the mask editor",
   "",
   "The image and effective-mask panels share one camera, so both always show the same image region at the same scale.",
   "",
   "- **Mouse wheel** over either panel: zoom around the image point beneath the pointer, within the image boundaries.",
   "- **Fit Image:** return both panels to the full field.",
   "- **100 %:** show one image pixel per screen pixel for accurate edge inspection.",
   "- **+ / \u2212:** zoom around the common view center.",
   "- **Shift + left-button drag** on either panel: pan both views without changing vertices.",
   "- **Normal left-button click/drag** on the image panel: add or move a vertex. The purple footprint and cyan polygon remain aligned as you navigate. The mask panel does not edit vertices.",
   "",
   "Zoom and pan affect only the display: they do not resize the image or mask, invalidate a previously computed mask, or change transition strength. Coordinates remain in full-resolution base-image pixels. Editing a vertex or the transition still requires **Preview transition** to refresh the effective mask. In Fit mode, resizing the dialog refits the views; in a zoomed view, the camera retains its scale and keeps panning within the image bounds.",
   "",
   "Move vertices inward to exclude registration or interpolation edges. **A softly feathered, irregular mask boundary can help achieve a more natural blend. Keep it within the valid detail coverage.** Irregularity alone does not replace feathering or careful edge inspection. You can drag vertices, select a vertex number, and edit its x/y coordinates in base-image pixels. A polygon requires 3\u201364 vertices; concave shapes are supported, but crossings, touching edges, duplicate vertices and holes are not.",
   "",
   "**Close polygon** connects the last vertex to the first. **Undo** first reopens a closed polygon, then removes its last vertex. **Clear contour** starts over. **Back** returns to the initial setup without accepting the mask being edited. Prepared geometry and any previously selected mask are retained. The Full canvas option has been removed.",
   "",
   "Set **Transition (px)** and click **Preview transition**. The right panel displays the effective mask: white adds detail, gray blends partially, and black preserves the base. Transition is an inward Gaussian feather, expressed as sigma in pixels. Zero keeps hard edges. The initial 32 pixels can be excessive for small fields.",
   "",
   "**Create and select mask** selects a hidden temporary hard-edged mask in setup. A **Go to Prepare Comparison** notice asks you to click OK and proceeds to comparison preparation. The transition is applied once during blending, not baked into the support mask. Set it **only in the mask editor**; setup displays its value as information.",
   "",
   "The script closes its own mask when replaced by another one or when the workflow ends, including acceptance and cancellation. **Back** keeps it hidden for reuse. It does not leave an extra mask image open after completion. You may select an external monochrome mask with the exact base dimensions; external masks are never closed by the script. For an external mask, the displayed transition defaults to 32 px unless a different value was chosen earlier in the mask editor.",
   "",
   "Coverage is determined by reprojecting a white support with the long-focal astrometry, not by thresholding the nebula's brightness. Valid dark regions are preserved. Pre-existing black padding or invalid regions inside the original long-focal rectangle are not automatically detected: exclude them yourself. The polygon footprint is sampled from the source image edges and clipped to the base canvas.",
   "",
   "## 3. Prepare comparison",
   "",
   "Leave **Inject high-frequency detail with MLT** enabled, check the transition and optional automatic contrast gain, and click **3. Prepare comparison**.",
   "",
   "The left comparison label shows the **original selected base identifier**, followed by **prepared copy**. Its pixels come from the prepared working copy, including star separation when enabled. Hidden identifiers such as `CR_MF_BaseResuelta` are internal copies, not previous blends. The script does not rename or modify the original image.",
   "",
   "In the comparison window, choose the **MLT layers 1\u20138** to add. Layers **1, 2 and 3** start selected. The residual is always excluded. Layer 1 holds the finest structure and can also reinforce noise. Higher numbers include progressively larger structures. Approximate characteristic scales are 1, 2, 4, 8, 16, 32, 64 and 128 pixels, measured on the **reprojected output grid**, not the original long-focal image. They are overlapping filter scales, not exact object-size intervals.",
   "",
   "You may select nonconsecutive layers. With no layers selected, the result is the unchanged prepared base.",
   "",
   "**Compare lightness only** starts enabled in MLT mode. The left panel shows base CIE L* and the right shows CIE L* extracted from the actual computed output after LRGB combination. Turn it off to inspect full RGB color. This changes only the display; the output retains its original monochrome or RGB type.",
   "",
   "Change layers, **Intensity (%)** or **Relative detail gain**, then click **Update Preview**. The preview is explicitly refreshed by that button. Acceptance is disabled while processing settings differ from the last successful calculation. Each update starts from the same prepared base, so effects do not accumulate. Solving, star separation and reprojection are not repeated.",
   "",
   "Use **100 %** to judge fine detail. **Fit image**, zoom buttons, mouse wheel and dragging share the same zoom and center in both panels. The display uses no additional STF. Calculations are at full resolution.",
   "",
   "Intensity starts at **35%**, with manual relative gain **0.50 (50%)**. Setting relative gain to zero still produces an exact copy of the prepared base. Change the gain and click Update Preview to see the corresponding detail amplitude. This zero setting also preserves the base when using the optional Gaussian method. To compare with a direct manual addition of MLT layers, use intensity **100%**, relative gain **1**, and disable **Estimate contrast gain inside the coverage** in setup. Automatic gain estimates a multiplier from smooth structures inside the effective mask; it is not photometric calibration. If unreliable, it falls back to 1 and reports a warning. Manual relative gain ranges from 0 to 4. A value of 1 preserves the extracted amplitude, 0.75 uses 75%, and 1.5 uses 150%. It multiplies both Intensity and the automatic gain when enabled. For example, intensity 35%, relative gain 1 and automatic gain 1 give a net coefficient of 0.35. The established positive-gain MLT/Gaussian calculations are unchanged; version 0.9.0 adds zero gain as a neutral setting.",
   "",
   "**Create Blended Image** creates the current computed result with **one click** when the whole image is visible. It does not force a second click or change the lightness/color display mode.",
   "",
   "If zooming or panning hides part of the image, a popup recommends reviewing the overall integration with Fit Image:",
   "",
   "- **Fit Image:** show the whole comparison and return for inspection without creating an image. Click Create Blended Image when ready.",
   "- **Create Anyway:** create the current result immediately, retaining the current zoom and display mode.",
   "- **Cancel** or closing the popup: return without creating an image or changing the preview.",
   "",
   "The check uses the actual visible image area, not simply whether the zoom controls were touched. A manually chosen scale that still shows the whole image does not trigger the warning. Processing changes must still be calculated with Update Preview before creation.",
   "",
   "The confirmed image is exactly the successful computed result, using your output name, with an additional stars-recombined image if selected. No file is saved automatically. **Back** returns to setup while retaining reusable geometry. **Discard and close** removes the blend, temporary copies and any masks created in this session. A failed recalculation preserves the previous valid comparison.",
   "",
   "Every interactive control has an English hover description explaining its purpose, range or consequence. Move the mouse over a control and pause to display its tooltip.",
   "",
   "## Processing method",
   "",
   "MLT mode uses native **MultiscaleLinearTransform**, Starlet transform and **B3 Spline (5)**, without noise reduction or layer bias adjustments. In RGB it extracts CIE L*; in monochrome it uses the single channel. It adds selected high-frequency layers from the long-focal detail to the base lightness, without subtracting a base detail band:",
   "",
   "```text",
   "L_result = clamp_0_1(L_base + intensity * effective_mask *",
   "                    total_gain * sum(selected_MLT_layers(L_detail)))",
   "```",
   "",
   "Direct native MLT reconstruction can clip negative detail coefficients. This script instead subtracts native smoothed residuals and combines their differences with unclipped PixelMath. Both coefficient signs are retained until the final composition. It does not retain eight full-resolution layer images in memory. Updating gain or intensity also recalculates the selected layers.",
   "",
   "RGB lightness is incorporated with neutral LRGBCombination settings; base pixels outside the effective mask are preserved. Color comes from the base, but changing lightness and handling out-of-gamut colors can alter its appearance. Photometric or exact color identity is not guaranteed. The output inherits the base astrometry.",
   "",
   "### Earlier Gaussian method",
   "",
   "Disable MLT in setup to use the earlier Gaussian-band replacement. Only then do **Fine sigma** and **Coarse sigma** become active. They define a difference between coverage-normalized Gaussian smoothings. That mode subtracts the base band and adds the gain-adjusted detail band. MLT layer checkboxes are disabled in this mode. Mask transition works in both modes.",
   "",
   "## Limits and performance",
   "",
   "Large images require substantial memory and processing time, even though the output dimensions do not grow. Several 32-bit images and screen bitmaps are held temporarily. Selecting larger layers requires more work.",
   "",
   "High-frequency injection can amplify noise, halos and oversharpening. Large layers can pick up the black reprojection boundary; move the mask inward, increase the inward transition or omit overly large layers if edge artifacts appear. The final lightness is limited to 0\u20131; inspect highlights and shadows.",
   "",
   "Astrometric reprojection depends on accurate input solutions. There is no subsequent StarAlignment refinement or automatic compensation for differences in PSF, filters, noise or processing artifacts. Inspect structures and alignment yourself. This script is not a replacement for those checks.",
   "",
   "## Validation",
   "",
   "The MLT implementation has been tested with native PixInsight 1.9.5 on synthetic monochrome and RGB images. Tests verify signed coefficients, the B3 first-layer difference, contiguous and nonconsecutive selections, injection, identity without layers, unchanged coverage exterior, stale-result rejection, error recovery, unchanged originals, and comparison controls. Dialogs are rendered for inspection and real PJSR control callbacks are exercised; physical mouse clicks are not automated.",
   "",
   "Existing tests also cover masks, navigation, fixed-dimension astrometric reprojection and the native StarXTerminator flow. No fresh catalogue solve with real astronomical stars is claimed. Visual validation with your own astronomical images remains necessary.",
   "",
   "## Changes in 0.8.0",
   "",
   "Visible Copyright \u00a9 Carlos Rinc\u00f3n 2026 in setup, mask, comparison and help windows.",
   "Step-completion notifications lead to Create Mask and Prepare Comparison.",
   "Circular editable initial mask, irregular-edge recommendation, and transition edited only in the mask editor.",
   "Session-created masks stay hidden and are closed on replacement or exit.",
   "Optional native PixelMath Screen recombination preserves the separate starless and stars images.",
   "The existing fusion method and its intensity/gain defaults have not been changed.",
   "",
   "## Sample images",
   "",
   "Click **Download Sample Images** in setup. Before opening the download, an English dialog displays Copyright \u00a9 Carlos Rinc\u00f3n 2026 and these usage conditions:",
   "",
   "> These images are shared for personal testing of the Crinconlab Focal Length Blend script only.",
   ">",
   "> Please do not redistribute or publish the supplied images or any results created from them without prior permission from Carlos Rinc\u00f3n.",
   ">",
   "> Thank you for respecting the author\u2019s work.",
   "",
   "**Agree and Download** lets you choose where to save the ZIP, then downloads it directly without opening a browser. **Cancel** or closing either dialog starts no download. The notice appears each time; consent is not remembered. Requests and redirects allow HTTPS only. The script checks the file size and a pinned SHA-256 before publishing the ZIP. Rejected partial downloads are removed when possible, and an existing destination is preserved during verification. During replacement it is temporarily stored beside the destination as a unique .previous-* recovery file, restored on failure when possible and removed after success; any retained recovery path is reported. Unzip the verified file, then use its two workflows:",
   "",
   "- **With_StarX:** Short_Focal_Length.xisf as Base and Long_Focal_Length.xisf as Detail. Leave StarXTerminator enabled. Both images contain stars and verified astrometry.",
   "- **Without_StarX:** Short_Focal_Length_Starless.xisf as Base and Long_Focal_Length_Starless.xisf as Detail. Disable star separation. These derivatives already have stars removed and preserve the same astrometric geometry as the with-stars counterparts.",
   "",
   "The sample package includes **Image_Solver_Settings_EN.txt**, with effective pixel sizes, focal lengths, image scales and centre coordinates. Use these values for the supplied resized files, not the physical sensor pixel pitch. Starless samples must retain their existing solutions; recover lost astrometry from the with-stars counterpart rather than trying to solve a field without stars.",
   "",
   "| Sample | Focal length (mm) | Effective pixel size (\u00b5m) | Image scale (arcsec/pixel) |",
   "|---|---:|---:|---:|",
   "| Short focal length | 192.9183 | 8.623 | 9.219559 |",
   "| Long focal length | 1244.9808 | 15.133 | 2.507191 |",
   "",
   "Source and starless dimensions are 1500 \u00d7 1500 pixels for the short-focal image and 1500 \u00d7 1021 pixels for the long-focal image. No visible watermark was added. Copyright and usage conditions are included in XISF properties and LICENSE.txt. All derived results are subject to the stated personal-testing conditions.",
   "",
   "Published release: https://github.com/crinconlab/pixinsight-scripts/releases/tag/sample-images-v1.0",
   "",
   "",
   "## Changes in 0.9.0",
   "",
   "- Rename the creation button to Create Blended Image.",
   "- Start Relative detail gain at 0, with a supported range of 0\u20134. Zero preserves the base exactly.",
   "- Initially required two-click full-image review; that behavior is superseded by the optional zoom warning in 0.9.1.",
   "- Display startup requirements for stretched, gradient-corrected, color-calibrated inputs, optional star deconvolution, recommended noise reduction, and the starless/astrometry requirements without StarXTerminator.",
   "- Include Download Sample Images as a visibly disabled button without a download action.",
   "- Preserve existing masks, star recombination and positive-gain fusion behavior.",
   "",
   "## Changes in 0.9.1",
   "",
   "- Identify the original selected base in the comparison label, with an explicit prepared-copy note. Internal temporary names are no longer presented as the source identifier.",
   "- Remove mandatory two-click creation. Create directly when the whole preview is visible.",
   "- If zooming or panning hides pixels, show a recommendation popup with Fit Image, Create Anyway and Cancel.",
   "- Preserve the preview display mode, current blend calculations, RDG default, and disabled sample-download button.",
   "",
   "## Changes in 0.10.0",
   "",
   "- Add synchronized wheel zoom and Shift-drag panning to both mask-editor panels.",
   "- Add Fit Image, 100%, + and \u2212 controls and a zoom-percentage display.",
   "- Keep image coordinates, footprint, vertices and full-resolution mask calculations independent of navigation.",
   "- Rename the blend comparator update button to Update Preview.",
   "- Preserve fusion, source labels, optional zoom warning before creation, stars and mask cleanup.",
   "",
   "## Intensity versus Relative detail gain",
   "",
   "Intensity ranges from 0 to 100%; Relative detail gain ranges from 0 to 4 (0\u2013400%). In MLT mode, both multiply the selected detail band, so their effects overlap mathematically. With automatic gain 1 and a white mask, Intensity 35% and Relative detail gain 0.50 inject 17.5% of the extracted detail amplitude. Intensity 50% with gain 1 is equivalent to Intensity 100% with gain 0.50 in MLT mode. The automatic contrast gain multiplies this coefficient further.",
   "",
   "In the optional Gaussian method, Intensity scales the full band-replacement correction, while Relative detail gain scales the incoming detail band. They are not generally interchangeable in that mode.",
   "",
   "## Changes in 0.10.1",
   "",
   "Set default Relative detail gain to 0.50 (50%). The control continues displaying a multiplier. Intensity stays at 35%; calculations, zoom and workflow remain unchanged.",
   "",
   "## Changes in 0.11.4",
   "",
   "Enable Download Sample Images with an explicit copyright/usage notice and Agree and Download / Cancel actions. Use the verified GitHub Releases asset. Add a documented real-image sample package with English image names, with-stars/starless pairs and preserved astrometry. Fusion, gain defaults and mask navigation are unchanged.",
   "",
   "",
   "Task progress",
   "-------------",
   "Task descriptions appear in blue, with a percentage bar below. Percentages describe processing stages rather than elapsed time. Native Image Solver, StarXTerminator, reprojection, mask and MLT operations may hold the same percentage until the operation returns. Each new calculation resets progress; 100% is shown only after successful completion.",
   ""
].join("\n");

function MF_label(parent,text)
{
   var label=new Label(parent); label.text=text; label.wordWrapping=true; return label;
}
function MF_taskLabel(parent,text)
{
   var label=MF_label(parent,text);
   label.styleSheet="QLabel { color: #1670d2; font-weight: bold; }";
   return label;
}
class MF_Progress extends Control
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
class MF_TaskDialog extends Dialog
{
constructor()
{
   super();this.windowTitle="Focal Length Blend · Preparing comparison";
   this.status=MF_taskLabel(this,"Preparing comparison…");this.progressBar=new MF_Progress(this);
   this.sizer=new VerticalSizer;this.sizer.margin=14;this.sizer.spacing=8;this.sizer.add(this.status);this.sizer.add(this.progressBar);
   this.setScaledMinWidth(560);this.adjustToContents();this.onClose=function(){return false;};
}
}
function MF_help()
{
   var dialog=new Dialog; dialog.windowTitle="Focal Length Blend · Help";
   var text=new TextBox(dialog); text.readOnly=true; text.text=MF_HELP; text.setScaledMinSize(620,420);
   var close=new PushButton(dialog); close.text="Close";close.toolTip="Close this window."; close.onClick=function() { dialog.ok(); };
   var row=new HorizontalSizer; row.addStretch(); row.add(close);
   dialog.sizer=new VerticalSizer; dialog.sizer.margin=10; dialog.sizer.spacing=8;
   dialog.sizer.add(text,100); dialog.sizer.add(row);dialog.sizer.add(MF_copyright(dialog)); dialog.adjustToContents(); dialog.execute();
}

class MF_MaskDialog extends Dialog
{
constructor(reference,feather,background,coverage,footprint)
{
   super();
   MF_assertView(reference,"Long-focal-length detail");
   var self=this, image=reference.image;
   this.background=background||reference;MF_assertView(this.background,"Short-focal-length base");
   if(this.background.image.width!=image.width || this.background.image.height!=image.height)throw new Error("Prepare reprojection before drawing the mask.");
   this.coverage=coverage||null;this.guide=footprint||[];
   this.reference=reference; this.createdMask=null; this.maskBitmap=null; this.syncing=false; this.busy=false;
   this.imageWidth=image.width; this.imageHeight=image.height;
   this.camera=new MF_Camera(image.width,image.height);
   this.selection=new MF_PolygonSelection(image.width,image.height); this.selected=-1;
   this.windowTitle="Mask on short-focal-length image · "+this.background.id;
   var display=this.background.image;display.pushSelections();
   try { display.resetSelections(); this.detailBitmap=display.render(); }
   finally { display.popSelections(); }
   this.vertex=new SpinBox(this); this.vertex.minValue=1; this.vertex.maxValue=1; this.vertex.value=1;
   this.vertex.toolTip="Select the editable polygon vertex by number.";
   this.vertex.onValueUpdated=function(value)
   {
      if (!self.syncing && self.selection.points.length)
      {
         self.selected=value-1; self.syncCoordinates(); self.detailPane.update();
      }
   };
   this.vertexX=new SpinBox(this); this.vertexX.minValue=0; this.vertexX.maxValue=image.width;
   this.vertexY=new SpinBox(this); this.vertexY.minValue=0; this.vertexY.maxValue=image.height;
   this.vertexX.toolTip="Horizontal coordinate of the selected vertex, in base-image pixels.";
   this.vertexY.toolTip="Vertical coordinate of the selected vertex, in base-image pixels.";
   this.vertexX.setScaledMinWidth(85); this.vertexY.setScaledMinWidth(85);
   function coordinateChanged()
   {
      if (self.syncing || self.selected<0) return;
      self.selection.points[self.selected]=self.selection.point(self.vertexX.value,self.vertexY.value);
      self.invalidate();
   }
   this.vertexX.onValueUpdated=coordinateChanged; this.vertexY.onValueUpdated=coordinateChanged;
   this.feather=new SpinBox(this); this.feather.minValue=0; this.feather.maxValue=256; this.feather.value=feather;
   this.feather.toolTip="Width of the inward transition, expressed as Gaussian sigma in pixels. Increase to soften the seam; 0 preserves hard edges.";
   this.feather.onValueUpdated=function() { self.invalidate(); };
   var coordinates=new HorizontalSizer; coordinates.spacing=6;
   coordinates.add(MF_label(this,"Vertex:")); coordinates.add(this.vertex);
   coordinates.add(MF_label(this,"x:")); coordinates.add(this.vertexX);
   coordinates.add(MF_label(this,"y:")); coordinates.add(this.vertexY);
   coordinates.addStretch(); coordinates.add(MF_label(this,"Transition (px):")); coordinates.add(this.feather);
   this.closePolygon=new PushButton(this); this.closePolygon.text="Close polygon";this.closePolygon.toolTip="Connect the last vertex to the first so the mask can be previewed or created.";
   this.closePolygon.onClick=function() { self.finishPolygon(); };
   this.undo=new PushButton(this); this.undo.text="Undo";this.undo.toolTip="Reopen a closed polygon; otherwise remove its last vertex.";
   this.undo.onClick=function()
   {
      self.selection.undo(); self.selected=self.selection.points.length-1; self.invalidate();
   };
   this.clear=new PushButton(this); this.clear.text="Clear contour";this.clear.toolTip="Remove every editable vertex and start a new polygon.";
   this.clear.onClick=function()
   {
      self.selection=new MF_PolygonSelection(self.imageWidth,self.imageHeight);
      self.selected=-1; self.invalidate();
   };
   var tools=new HorizontalSizer; tools.spacing=8;
   tools.add(this.closePolygon); tools.add(this.undo); tools.add(this.clear); tools.addStretch();
   this.detailPane=this.makePane(false); this.maskPane=this.makePane(true);
   this.detailPane.toolTip="Wheel: zoom around the pointer in both panels. Shift + left drag: pan both panels without editing. Normal left click/drag: add or move vertices. Purple is the fixed footprint; cyan is editable.";
   this.maskPane.toolTip="Effective feathered mask after Preview transition. White adds detail; gray blends partially; black preserves the base. Wheel zooms both panels; Shift + left drag pans. Navigation never modifies mask pixels.";
   this.fitButton=new PushButton(this);this.fitButton.text="Fit Image";this.fitButton.toolTip="Fit the full image and effective mask in both panels without changing the contour or transition.";
   this.fitButton.onClick=function(){self.fit();};
   this.oneButton=new PushButton(this);this.oneButton.text="100 %";this.oneButton.toolTip="Show one image pixel per screen pixel in both panels for precise edge inspection.";
   this.oneButton.onClick=function(){self.cancelDrags();self.camera.scale=1;self.camera.fitted=false;self.limitCamera();self.repaintBoth();};
   this.minusButton=new PushButton(this);this.minusButton.text="−";this.minusButton.toolTip="Zoom out in both mask-editor panels.";this.minusButton.onClick=function(){self.zoomAtCenter(1/1.25);};
   this.plusButton=new PushButton(this);this.plusButton.text="+";this.plusButton.toolTip="Zoom in on both mask-editor panels.";this.plusButton.onClick=function(){self.zoomAtCenter(1.25);};
   this.zoomLabel=MF_label(this,"");
   var navigation=new HorizontalSizer;navigation.spacing=8;navigation.add(this.fitButton);navigation.add(this.oneButton);navigation.add(this.minusButton);navigation.add(this.plusButton);navigation.add(this.zoomLabel);navigation.addStretch();
   var left=new VerticalSizer; left.spacing=4;
   left.add(MF_label(this,"Short focal length · purple: long-focal footprint · cyan: editable mask")); left.add(this.detailPane,100);
   var right=new VerticalSizer; right.spacing=4;
   right.add(MF_label(this,"Effective mask · white adds detail")); right.add(this.maskPane,100);
   var columns=new HorizontalSizer; columns.spacing=8; columns.add(left,100); columns.add(right,100);
   this.status=MF_taskLabel(this,"");this.progressBar=new MF_Progress(this);
   this.preview=new PushButton(this); this.preview.text="Preview transition";this.preview.toolTip="Compute the effective inward feathering at full resolution. This does not create or accept a mask.";
   this.preview.onClick=function() { self.calculate(); };
   this.create=new PushButton(this); this.create.text="Create and select mask";this.create.toolTip="Use this coverage mask in setup. It stays hidden and is closed automatically when the script finishes. Feathering is applied during blending.";
   this.create.onClick=function()
   {
      try
      {
         self.status.text="Creating the full-resolution mask…";self.status.repaint();self.progressBar.setValue(0);
         self.createdMask=MF_createCoverage(self.reference,self.selection.polygon(),self.coverage,false);self.progressBar.setValue(100); self.ok();
      }
      catch (e) { self.status.text="Error: "+String(e); }
   };
   var cancel=this.backButton=new PushButton(this); cancel.text="Back";cancel.toolTip="Return to the initial setup without accepting the mask being edited. Prepared geometry and any previously selected mask are retained."; cancel.onClick=function() { if(!self.busy)self.cancel(); };
   var buttons=new HorizontalSizer; buttons.spacing=8;
   buttons.add(this.preview); buttons.addStretch(); buttons.add(this.create); buttons.add(cancel);
   this.sizer=new VerticalSizer; this.sizer.margin=12; this.sizer.spacing=8;
   this.sizer.add(MF_label(this,"Draw on the short-focal-length image. Purple marks the long-focal astrometric footprint; cyan defines your mask. Move vertices inward to exclude registration edges."));
   this.sizer.add(navigation);this.sizer.add(columns,100); this.sizer.add(tools); this.sizer.add(coordinates);
   this.sizer.add(MF_label(this,"Wheel: zoom at the pointer. Shift + left drag: pan both panels. Normal left drag: move a vertex. Fit Image: return to the full field."));
   this.sizer.add(MF_label(this,"Move vertices or edit their pixel coordinates. Undo reopens a closed contour, then removes its last vertex. The temporary mask has hard edges; the inward transition is applied once when blending."));
   this.sizer.add(MF_label(this,"A softly feathered, irregular mask boundary can help achieve a more natural blend. Keep it within the valid detail coverage."));
   this.sizer.add(this.status);this.sizer.add(this.progressBar); this.sizer.add(buttons);this.sizer.add(MF_copyright(this));
   if(this.guide.length>=3){this.selection.points=MF_defaultCircle(this.guide,this.imageWidth,this.imageHeight);this.selection.close();this.selected=0;}
   this.setScaledMinSize(940,660); this.adjustToContents();this.fit(); this.invalidate();
}
viewport()
{
   return {width:Math.min(this.detailPane.width,this.maskPane.width),height:Math.min(this.detailPane.height,this.maskPane.height)};
}
cancelDrags()
{
   if(this.detailPane){this.detailPane.drag=null;this.detailPane.panDrag=null;}
   if(this.maskPane){this.maskPane.drag=null;this.maskPane.panDrag=null;}
}
limitCamera()
{
   var v=this.viewport();this.camera.limit(v.width,v.height);
}
fit()
{
   if(this.busy)return;
   this.cancelDrags();var v=this.viewport();this.camera.fit(v.width,v.height);this.repaintBoth();
}
zoomAtCenter(factor)
{
   if(this.busy)return;
   this.cancelDrags();var v=this.viewport();this.camera.zoom(factor,v.width/2,v.height/2,v.width,v.height);this.repaintBoth();
}
repaintBoth()
{
   this.detailPane.update();this.maskPane.update();
   if(this.zoomLabel)this.zoomLabel.text="Zoom "+(100*this.camera.scale).toFixed(1)+" %";
}
syncCoordinates()
{
   this.syncing=true;
   try
   {
      var points=this.selection.points,n=points.length;
      this.selected=n?MF_clamp(this.selected,0,n-1):-1;
      this.vertex.maxValue=Math.max(1,n); this.vertex.value=this.selected+1 || 1;
      this.vertex.enabled=this.vertexX.enabled=this.vertexY.enabled=n>0 && !this.busy;
      this.vertexX.value=n?points[this.selected].x:0; this.vertexY.value=n?points[this.selected].y:0;
   }
   finally { this.syncing=false; }
}
invalidate()
{
   this.maskBitmap=null; this.syncCoordinates();
   var valid=false;
   if (!this.selection.closed)
      this.status.text=this.selection.points.length+" vertices · add points and close the polygon to continue.";
   else
   {
      try { this.selection.polygon(); valid=true; this.status.text="Contour closed. Click Preview transition to see the effective mask."; }
      catch (e) { this.status.text=String(e); }
   }
   this.preview.enabled=this.create.enabled=valid && !this.busy;
   this.closePolygon.enabled=!this.selection.closed && this.selection.points.length>=3 && !this.busy;
   this.undo.enabled=this.clear.enabled=this.selection.points.length>0 && !this.busy;
   this.detailPane.update(); this.maskPane.update();
}
finishPolygon()
{
   try { this.selection.close(); this.invalidate(); }
   catch (e) { this.status.text=String(e); }
}
calculate()
{
   if (this.busy) return;
   this.busy=true; this.preview.enabled=false; this.create.enabled=false;
   this.status.text="Computing the full-resolution transition…";this.status.repaint();this.progressBar.setValue(0);
   try
   {
      // Do not process events while temporaries exist: the dialog cannot close
      // during calculation. Preview and blend use the same mask method.
      this.maskBitmap=MF_renderCoverage(this.reference,this.selection.polygon(),this.feather.value,this.coverage);
      this.progressBar.setValue(100);
      this.status.text="Transition computed · sigma "+this.feather.value+" px. Black preserves the base; gray blends partially.";
   }
   catch (e) { this.maskBitmap=null; this.status.text="Error: "+String(e); }
   finally
   {
      this.busy=false; this.preview.enabled=this.create.enabled=true; this.maskPane.update();
   }
}
makePane(isMask)
{
   var self=this, pane=new Control(this); pane.setScaledMinSize(350,300); pane.drag=null;pane.panDrag=null;
   function geometry()
   {
      var s=self.camera.scale;
      return {scale:s,x:pane.width/2-self.camera.x*s,y:pane.height/2-self.camera.y*s};
   }
   pane.onPaint=function()
   {
      var bitmap=isMask?self.maskBitmap:self.detailBitmap, g=new Graphics(this);
      try
      {
         g.fillRect(0,0,this.width,this.height,new Brush(0xff202020));
         if (!bitmap) return;
         var geo=geometry(),s=geo.scale,ox=geo.x,oy=geo.y;
         var x0=Math.max(0,Math.floor(-ox/s)),y0=Math.max(0,Math.floor(-oy/s));
         var x1=Math.min(bitmap.width,Math.ceil((this.width-ox)/s)),y1=Math.min(bitmap.height,Math.ceil((this.height-oy)/s));
         if(x1>x0 && y1>y0)
         {
            g.smoothInterpolation=s<1;
            g.drawScaledBitmapRect(ox+x0*s,oy+y0*s,ox+x1*s,oy+y1*s,bitmap,x0,y0,x1,y1);
         }
         if (!isMask)
         {
            if(self.guide.length>=3)
            {
               g.pen=new Pen(0xffbf40ff,4.5);
               for(var k=0;k<self.guide.length;++k){var a=self.guide[k],b=self.guide[(k+1)%self.guide.length];g.drawLine(ox+a.x*s,oy+a.y*s,ox+b.x*s,oy+b.y*s);}
            }
            var points=self.selection.points;
            g.pen=new Pen(self.guide.length?0xff65e4ed:0xffbf40ff,1);
            for (var i=1;i<points.length;++i)
               g.drawLine(ox+points[i-1].x*s,oy+points[i-1].y*s,ox+points[i].x*s,oy+points[i].y*s);
            if (self.selection.closed && points.length>2)
               g.drawLine(ox+points[points.length-1].x*s,oy+points[points.length-1].y*s,ox+points[0].x*s,oy+points[0].y*s);
            for (var j=0;j<points.length;++j)
            {
               g.pen=new Pen(j===self.selected?0xffffffff:0xff65e4ed,2);
               var px=ox+points[j].x*s,py=oy+points[j].y*s;
               g.drawRect(px-4,py-4,px+4,py+4);
            }
         }
      }
      finally { g.end(); }
   };
   function point(x,y)
   {
      var geo=geometry();return {x:MF_clamp((x-geo.x)/geo.scale,0,self.imageWidth),y:MF_clamp((y-geo.y)/geo.scale,0,self.imageHeight)};
   }
   function nearest(x,y)
   {
      var geo=geometry(),found=-1,best=81;
      self.selection.points.forEach(function(p,i)
      {
         var dx=geo.x+p.x*geo.scale-x,dy=geo.y+p.y*geo.scale-y,d=dx*dx+dy*dy;
         if (d<best) { best=d; found=i; }
      });
      return found;
   }
   function moveTo(index,x,y)
   {
      var p=point(x,y);
      self.selection.points[index]=self.selection.point(p.x,p.y); self.selected=index; self.invalidate();
   }
   pane.onMouseWheel=function(x,y,delta)
   {
      if(self.busy || !delta)return;
      self.cancelDrags();self.camera.zoom(delta>0?1.25:1/1.25,x,y,this.width,this.height);self.limitCamera();self.repaintBoth();
   };
   pane.onMousePress=function(x,y,button,buttons,modifiers)
   {
      if(self.busy || button!==MouseButton.Left)return;
      if(modifiers & KeyModifier_Shift){self.cancelDrags();this.panDrag={x:x,y:y};return;}
      if(isMask)return;
      var index=nearest(x,y);
      if(index===0 && !self.selection.closed && self.selection.points.length>=3){self.finishPolygon();return;}
      if(index>=0){self.selected=index;this.drag=index;self.syncCoordinates();this.update();return;}
      if(self.selection.closed)return;
      var p=point(x,y);
      try{self.selection.add(p.x,p.y);self.selected=self.selection.points.length-1;self.invalidate();}
      catch(e){self.status.text=String(e);}
   };
   function panTo(x,y)
   {
      var v=self.viewport();self.camera.pan(x-pane.panDrag.x,y-pane.panDrag.y,v.width,v.height);
      pane.panDrag={x:x,y:y};self.repaintBoth();
   }
   pane.onMouseMove=function(x,y,buttons)
   {
      if(self.busy)return;
      if(!(buttons & MouseButton.Left)){this.drag=null;this.panDrag=null;return;}
      if(this.panDrag){panTo(x,y);return;}
      if(!isMask && this.drag!==null)moveTo(this.drag,x,y);
   };
   pane.onMouseRelease=function(x,y,button)
   {
      if(button!==MouseButton.Left)return;
      if(this.panDrag){if(!self.busy)panTo(x,y);this.panDrag=null;return;}
      if(!isMask && this.drag!==null){if(!self.busy)moveTo(this.drag,x,y);this.drag=null;}
   };
   pane.onResize=function()
   {
      if(!self.detailPane || !self.maskPane)return;
      if(self.camera.fitted)self.fit();else{self.limitCamera();self.repaintBoth();}
   };
   return pane;
}
}

class MF_SetupDialog extends Dialog
{
constructor()
{
   super();
   var self=this;this.maskWork=new MF_Work;this.geometry=null;this.geometryBusy=false;this.onClose=function(){return !self.geometryBusy;};
   this.windowTitle="Focal Length Blend · "+MF_VERSION+" · local";
   this.base=new ViewList(this); this.detail=new ViewList(this); this.mask=new ViewList(this);
   this.base.toolTip="Select the short-focal-length, wide-field base. Its dimensions, pixel scale, color and stars define the final result.";
   this.detail.toolTip="Select the long-focal-length image that supplies high-frequency lightness detail. It will be reprojected onto the base grid.";
   this.mask.toolTip="Select a monochrome mask on the base grid. White injects detail; black preserves the base. The script also restricts it to valid astrometric coverage.";
   this.lists=[this.base,this.detail,this.mask];
   this.lists.forEach(function(list) { list.getMainViews(); });
   function refreshViews()
   {
      var old=self.lists.map(function(list) { return list.currentView; });
      self.refreshingViews=true;
      try{self.lists.forEach(function(list,i)
      {
         list.getMainViews();
         if (old[i] && !old[i].isNull) list.currentView=old[i];
      });}finally{self.refreshingViews=false;}
   }
   function imageRow(title,list)
   {
      var button=new PushButton(self); button.text="Open file…";button.toolTip="Open a single-image FITS or XISF file and select it in this row.";
      button.onClick=function()
      {
         try
         {
            var picker=new OpenFileDialog; picker.multipleSelections=false; picker.loadImageFilters();
            if (!picker.execute()) return;
            var windows=ImageWindow.open(picker.fileName,"","",true);
            if (windows.length!==1)
            {
               windows.forEach(function(window) { window.forceClose(); });
               throw new Error("Select a file containing exactly one image.");
            }
            windows[0].show(); refreshViews(); list.currentView=windows[0].mainView;
            if(list!==self.mask && self.geometry){self.geometry.work.dispose();self.geometry=null;self.mask.getMainViews();}
         }
         catch (e) { new MessageBox(String(e),"Open image",StdIcon_Error,StdButton_Ok).execute(); }
      };
      var titleLabel=MF_label(self,title);titleLabel.wordWrapping=false;titleLabel.setScaledMinWidth(165);
      var row=new HorizontalSizer; row.spacing=8; row.add(titleLabel); row.add(list,100); row.add(button);
      return row;
   }
   this.fine=new SpinBox(this); this.fine.minValue=0; this.fine.maxValue=16; this.fine.value=1;
   this.coarse=new SpinBox(this); this.coarse.minValue=1; this.coarse.maxValue=64; this.coarse.value=4;
   this.feather=new SpinBox(this); this.feather.minValue=0; this.feather.maxValue=256; this.feather.value=32;
   this.fine.toolTip="Fine sigma in output pixels. 0 includes the finest detail and its noise. Used only in Gaussian mode.";
   this.coarse.toolTip="Coarse sigma: together with fine sigma, defines the difference-of-Gaussians detail band. Not used in MLT mode.";
   this.feather.toolTip="Inward mask transition sigma in pixels. The exterior remains black. 0 uses the mask without additional smoothing.";
   var scales=new HorizontalSizer; scales.spacing=8;
   scales.add(MF_label(this,"Fine sigma:")); scales.add(this.fine);
   scales.add(MF_label(this,"Coarse sigma:")); scales.add(this.coarse);
   this.transitionInfo=MF_label(this,"Mask transition: 32 px · edit in Create mask");
   this.feather.visible=false;
   scales.addStretch();
   this.mlt=new CheckBox(this);this.mlt.text="Inject high-frequency detail with MLT (select layers in the comparison)";this.mlt.checked=true;
   this.mlt.toolTip="Enabled: add selected native MLT detail layers to base lightness. Disabled: use the earlier Gaussian-band replacement method. Select MLT layers in the comparison window.";
   this.fine.enabled=false;this.coarse.enabled=false;
   this.mlt.onCheck=function(value){self.fine.enabled=!value;self.coarse.enabled=!value;};
   this.autoGain=new CheckBox(this); this.autoGain.text="Estimate contrast gain inside the coverage"; this.autoGain.checked=true;
   this.autoGain.toolTip="Estimate a contrast multiplier from smooth structures inside the mask. This is not photometric calibration. Disable to use a multiplier of 1 before the manual relative gain.";
   this.outputName=new Edit(this); this.outputName.text="Focal_Length_Blend";this.outputName.toolTip="Name of the output image in PixInsight, not a file path. Start with a letter or underscore; use only ASCII letters, digits and underscores.";
   var nameRow=new HorizontalSizer; nameRow.spacing=8; nameRow.add(MF_label(this,"Result name:")); nameRow.add(this.outputName,100);
   
   [this.base,this.detail].forEach(function(list){list.onViewSelected=function(){if(self.refreshingViews)return;if(self.geometry){self.geometry.work.dispose();self.geometry=null;}self.mask.getMainViews();};});
   this.starX=new CheckBox(this);this.starX.text="Separate stars with StarXTerminator (stretched inputs with stars)";this.starX.checked=true;
   this.starX.toolTip="Solves first, then separates both inputs before reprojection. Keeps the short-focal stars separately using Unscreen when accepting. Disable only for already solved, starless inputs.";
   this.starX.onCheck=function(){if(self.geometry){self.geometry.work.dispose();self.geometry=null;}self.mask.getMainViews();};
   this.geometryStatus=MF_taskLabel(this,"The short-focal image defines canvas and scale. Image Solver opens only for unsolved inputs and needs stars.");
   this.geometryProgress=new MF_Progress(this);
   this.prepareButton=new PushButton(this);this.prepareButton.text="1. Solve, separate stars and prepare geometry";this.prepareButton.toolTip="Reuse existing astrometry or open Image Solver for each unsolved input, separate stars if enabled, and reproject the detail onto the base grid.";
   this.prepareButton.onClick=function(){try{if(self.ensureGeometry()){MF_nextStep("Geometry is ready.\n\nClick OK to go to Create Mask.","Go to Create Mask");self.createMaskButton.onClick();}}catch(e){new MessageBox(String(e),"Prepare images",StdIcon_Error,StdButton_Ok).execute();}};
   var createMask=this.createMaskButton=new PushButton(this); createMask.text="2. Create mask…";createMask.toolTip="Edit the cyan polygon on the short-focal base. Purple marks the footprint of the long-focal detail.";
   createMask.onClick=function()
   {
      try
      {
         var geometry=self.ensureGeometry();if(!geometry)return;
         var editor=new MF_MaskDialog(geometry.detail.mainView,self.feather.value,geometry.base.mainView,geometry.coverage,geometry.footprint);
         if (editor.execute())
         {
            self.maskWork.dispose();self.maskWork.own(editor.createdMask);editor.createdMask.hide();
            refreshViews(); self.mask.currentView=editor.createdMask.mainView;
            self.feather.value=editor.feather.value;
            self.transitionInfo.text="Mask transition: "+self.feather.value+" px · edit in Create mask";
            MF_nextStep("The mask is ready.\n\nClick OK to go to Prepare Comparison.","Go to Prepare Comparison");
            self.runButton.onClick();
         }
      }
      catch (e) { new MessageBox(String(e),"Create mask",StdIcon_Error,StdButton_Ok).execute(); }
   };
   var maskTools=new HorizontalSizer; maskTools.spacing=8;
   maskTools.add(createMask); maskTools.add(MF_label(this,"Draw on the short-focal image; the long-focal footprint is shown in purple."),100);
   var help=new PushButton(this); help.text="Help";help.toolTip="Open the English user guide, including preparation, MLT layers, star images and result saving."; help.onClick=MF_help;
   this.downloadButton=new PushButton(this);this.downloadButton.text="Download Sample Images";
   this.downloadButton.enabled=true;
   this.downloadButton.toolTip="Download the sample ZIP with with-stars/starless pairs, verified astrometry and Image Solver settings. Copyright and usage conditions must be accepted first.";
   this.downloadButton.onClick=function(){try{MF_downloadSamples();}catch(e){new MessageBox(String(e),"Sample images",StdIcon_Warning,StdButton_Ok).execute();}};
   var refresh=this.refreshButton=new PushButton(this); refresh.text="Refresh lists";refresh.toolTip="Refresh the available main images while preserving selections where possible."; refresh.onClick=refreshViews;
   var run=this.runButton=new PushButton(this); run.text="3. Prepare comparison";run.toolTip="Prepare lightness and the effective mask, then open the full-resolution comparison with selectable MLT layers.";
   run.onClick=function()
   {
      try
      {
         var geometry=self.ensureGeometry();if(!geometry)return;
         self.config={base:geometry.base.mainView,detail:geometry.detail.mainView,mask:self.mask.currentView,coverage:geometry.coverage?geometry.coverage.mainView:null,
            method:self.mlt.checked?"MLT":"Gaussian",fine:self.fine.value,coarse:self.coarse.value,feather:self.feather.value,
            autoGain:self.autoGain.checked,id:self.outputName.text.trim(),prepared:true,baseStars:geometry.baseStars || null,baseSourceId:self.base.currentView.id,detailSourceId:self.detail.currentView.id};
         MF_validate(self.config); self.ok();
      }
      catch (e) { new MessageBox(String(e),"Check inputs",StdIcon_Warning,StdButton_Ok).execute(); }
   };
   var cancel=new PushButton(this); cancel.text="Close";cancel.toolTip="Close this window."; cancel.onClick=function() { self.cancel(); };
   var buttons=new HorizontalSizer; buttons.spacing=8;
   buttons.add(help);buttons.add(this.downloadButton); buttons.add(refresh); buttons.addStretch(); buttons.add(run); buttons.add(cancel);
   this.sizer=new VerticalSizer; this.sizer.margin=12; this.sizer.spacing=10;
   this.sizer.add(MF_label(this,"Use stretched, gradient-corrected and color-prepared inputs. Solve with stars, separate with StarXTerminator, then reproject onto the short-focal grid. Color comes from the base."));
   this.sizer.add(imageRow("Base: Short focal length",this.base));
   this.sizer.add(imageRow("Detail: Long focal length",this.detail));
   this.sizer.add(this.starX);this.sizer.add(this.prepareButton);this.sizer.add(this.geometryStatus);this.sizer.add(this.geometryProgress);
   this.sizer.add(imageRow("Mask:",this.mask));
   this.sizer.add(maskTools);
   this.sizer.add(MF_label(this,"The long-focal image is reprojected onto the short-focal size, scale and field. The base is not enlarged. Mask white = valid detail; black = preserve base."));
   this.sizer.add(this.mlt); this.sizer.add(scales);this.sizer.add(this.transitionInfo); this.sizer.add(this.autoGain); this.sizer.add(nameRow);
   this.sizer.add(buttons);this.sizer.add(MF_copyright(this));
   this.setScaledMinWidth(820); this.adjustToContents();
}
ensureGeometry()
{
   MF_assertView(this.base.currentView,"Short-focal-length base");MF_assertView(this.detail.currentView,"Long-focal-length detail");
   if(this.geometry && this.geometry.inputBase===this.base.currentView.id && this.geometry.inputDetail===this.detail.currentView.id && !!this.geometry.removeStars===this.starX.checked)return this.geometry;
   if(this.geometry){this.geometry.work.dispose();this.geometry=null;}
   this.geometryProgress.setValue(0);this.geometryBusy=true;this.enabled=false;this.prepareButton.enabled=false;
   try
   {
      var self=this;
      var geometry=MF_prepareGeometry(this.base.currentView,this.detail.currentView,function(text,percent){self.geometryStatus.text=text;self.geometryStatus.repaint();self.geometryProgress.setValue(percent);CoreApplication.processEvents();},null,{removeStars:this.starX.checked});
      if(!geometry){this.geometryStatus.text="Image Solver cancelled. Geometry has not been prepared.";return null;}
      geometry.inputBase=this.base.currentView.id;geometry.inputDetail=this.detail.currentView.id;this.geometry=geometry;this.geometryStatus.text="Ready: "+geometry.base.mainView.image.width+" × "+geometry.base.mainView.image.height+" pixels. The long-focal image occupies only its footprint inside this canvas.";
      return geometry;
   }
   finally{this.geometryBusy=false;this.enabled=true;this.prepareButton.enabled=true;this.adjustToContents();}
}
}

class MF_PreviewDialog extends Dialog
{
constructor(state)
{
   super();
   var self=this; this.state=state; this.returnToSetup=false; this.ready=false; this.busy=false;
   this.windowTitle="Focal Length Blend · Comparison without STF · "+MF_VERSION;
   this.camera=new MF_Camera(state.base.mainView.image.width,state.base.mainView.image.height);
   this.showL=new CheckBox(this);this.showL.text="Compare lightness only";this.showL.checked=state.config.method==="MLT";this.showL.toolTip="Show CIE L* extracted from the base and actual output, or show their full RGB color. This changes only the display, not the computed result.";
   this.originalBitmap=(this.showL.checked?state.lightness:state.base).mainView.image.render(); this.resultBitmap=null;
   this.showL.onCheck=function(){try{var original=(self.showL.checked?state.lightness:state.base).mainView.image.render();var result=state.result?self.renderCandidate(state.result):null;self.originalBitmap=original;self.resultBitmap=result;self.repaintBoth();}catch(e){self.showL.checked=!self.showL.checked;self.status.text=String(e);}};
   this.layerChecks=[];var layerRow=new HorizontalSizer;layerRow.spacing=8;
   layerRow.add(MF_label(this,"MLT layers:"));
   for(var i=0;i<8;++i){var box=new CheckBox(this);box.text=String(i+1);box.checked=i<3;box.enabled=state.config.method==="MLT";box.toolTip="Layer "+(i+1)+": approximate characteristic scale "+Math.pow(2,i)+" px on the reprojected image. Layer 1 also includes noise.";box.onCheck=function(){self.freshness();};this.layerChecks.push(box);layerRow.add(box);}
   layerRow.add(MF_label(this,"Residual excluded"));layerRow.addStretch();
   this.originalPane=this.makePane(); this.resultPane=this.makePane();
   this.originalPane.toolTip="Unchanged prepared base. Wheel zooms both panels; drag pans both. Use 100% to inspect fine structures.";
   this.resultPane.toolTip="Latest computed blend using the selected layers, intensity and gain. Click Update Preview after changing processing controls.";
   this.baseLabel=MF_label(this,"Base: "+(state.config.baseSourceId || state.config.base.id)+" — prepared copy");
   this.baseLabel.toolTip="Original selected base: "+(state.config.baseSourceId || state.config.base.id)+". This panel displays its prepared working copy, including star separation when enabled; internal temporary names are not source image names.";
   var left=new VerticalSizer; left.spacing=4; left.add(this.baseLabel); left.add(this.originalPane,100);
   var right=new VerticalSizer; right.spacing=4; right.add(MF_label(this,"Blended result")); right.add(this.resultPane,100);
   var columns=new HorizontalSizer; columns.spacing=8; columns.add(left,100); columns.add(right,100);
   this.amount=new Slider(this); this.amount.setRange(0,100); this.amount.value=35;
   this.amountEdit=new Edit(this); this.amountEdit.text="35"; this.amountEdit.setScaledFixedWidth(65);
   this.gain=new Slider(this); this.gain.setRange(0,400); this.gain.value=50;
   this.gainEdit=new Edit(this); this.gainEdit.text="0.50"; this.gainEdit.setScaledFixedWidth(65);
   this.amount.toolTip=this.amountEdit.toolTip="Strength of the injected MLT detail, from 0 to 100%. Zero preserves the base; 100% applies the full selected detail with the chosen gain.";
   this.gain.toolTip=this.gainEdit.toolTip="Manual detail multiplier from 0 to 4; starts at 0.50 (50% detail amplitude); 0 adds no detail. Multiplies Intensity and the automatic contrast estimate if enabled. High values can create bright patches: inspect the whole image with Fit image as well as fine detail at 100%.";
   this.amount.onValueUpdated=function(value) { self.amountEdit.text=String(value); self.freshness(); };
   this.gain.onValueUpdated=function(value) { self.gainEdit.text=(value/100).toFixed(2); self.freshness(); };
   this.amountEdit.onEditCompleted=function()
   {
      try { self.amount.value=Math.round(MF_number(self.amountEdit.text,"Intensity",0,100)); }
      catch (e) { self.status.text=String(e); }
      self.freshness();
   };
   this.gainEdit.onEditCompleted=function()
   {
      try { self.gain.value=Math.round(100*MF_number(self.gainEdit.text,"Gain",0,4)); }
      catch (e) { self.status.text=String(e); }
      self.freshness();
   };
   var amountRow=new HorizontalSizer; amountRow.spacing=8; amountRow.add(MF_label(this,"Intensity (%):")); amountRow.add(this.amount,100); amountRow.add(this.amountEdit);
   var gainRow=new HorizontalSizer; gainRow.spacing=8; gainRow.add(MF_label(this,"Relative detail gain:")); gainRow.add(this.gain,100); gainRow.add(this.gainEdit);
   this.updateButton=new PushButton(this); this.updateButton.text="Update Preview";this.updateButton.toolTip="Recalculate from the unchanged prepared base using the currently selected layers, intensity and gain. Solving and star separation are not repeated.";
   this.updateButton.onClick=function() { self.calculate(); };
   var fit=new PushButton(this); fit.text="Fit image";fit.toolTip="Fit both images inside their panels, with the same zoom and center."; fit.onClick=function() { self.fit(); };
   var one=new PushButton(this); one.text="100 %";one.toolTip="Display one image pixel per screen pixel in both panels to inspect fine detail."; one.onClick=function()
   {
      self.camera.scale=1; self.camera.fitted=false; self.camera.limit(self.originalPane.width,self.originalPane.height); self.repaintBoth();
   };
   var minus=new PushButton(this); minus.text="−";minus.toolTip="Zoom out in both panels around their shared center."; minus.onClick=function() { self.zoomAtCenter(1/1.25); };
   var plus=new PushButton(this); plus.text="+";plus.toolTip="Zoom in on both panels around their shared center."; plus.onClick=function() { self.zoomAtCenter(1.25); };
   this.zoomLabel=MF_label(this,"");
   var navigation=new HorizontalSizer; navigation.spacing=8; navigation.add(fit); navigation.add(one); navigation.add(minus); navigation.add(plus); navigation.add(this.zoomLabel); navigation.addStretch(); navigation.add(this.updateButton);
   this.status=MF_taskLabel(this,"");this.progressBar=new MF_Progress(this);
   this.outputName=new Edit(this); this.outputName.text=state.config.id;this.outputName.toolTip="Final PixInsight image identifier. Keeping the result does not save a disk file.";
   var nameRow=new HorizontalSizer; nameRow.spacing=8; nameRow.add(MF_label(this,"Output name:")); nameRow.add(this.outputName,100);
   this.recombine=new CheckBox(this);this.recombine.text="Recombine stars in a new image when creating the blended image";
   this.recombine.checked=false;this.recombine.enabled=!!state.config.baseStars && !state.config.baseStars.isNull;
   this.recombine.toolTip=this.recombine.enabled?"Create an additional Screen-combined image using the actual result and base-stars identifiers. Keep the starless result and stars separately as well.":"Available only when this script separated and retained the base stars with StarXTerminator.";
   this.acceptButton=new PushButton(this); this.acceptButton.text="Create Blended Image";this.acceptButton.toolTip="Create the current computed image with one click. If the full image is not visible, a popup recommends Fit Image and lets you review, create anyway, or cancel. Prepared base stars are retained separately. Save the results manually."; this.acceptButton.enabled=false;
   this.acceptButton.onClick=function()
   {
      try
      {
         var values=self.values();
         self.freshness(true);
         if (!self.acceptButton.enabled) throw new Error("Update the comparison before creating the blended image.");
         if(!self.fullImageVisible())
         {
            var action=MF_zoomCreationChoice();
            if(action==="fit")
            {
               self.fit();self.status.text="Full image shown. Review the integration, then click Create Blended Image when ready.";return;
            }
            if(action!=="create")return;
         }
         MF_keepResult(state,self.outputName.text.trim(),values.amount,values.gain,self.selectedLayers(),self.recombine.enabled && self.recombine.checked); self.ok();
      }
      catch (e) { new MessageBox(String(e),"Create Blended Image",StdIcon_Warning,StdButton_Ok).execute(); }
   };
   this.backButton=new PushButton(this); this.backButton.text="Back";this.backButton.toolTip="Return to setup. Prepared geometry and stars are reused unless the inputs or star-separation option change.";
   this.backButton.onClick=function() { self.returnToSetup=true; self.cancel(); };
   this.closeButton=new PushButton(this); this.closeButton.text="Discard and close";this.closeButton.toolTip="Discard the blend and temporary prepared images. Original inputs and externally supplied masks are preserved. Temporary masks created in this session are closed.";
   this.closeButton.onClick=function() { self.returnToSetup=false; self.cancel(); };
   var help=new PushButton(this); help.text="Help";help.toolTip="Open the English user guide, including preparation, MLT layers, star images and result saving."; help.onClick=MF_help;
   var buttons=new HorizontalSizer; buttons.spacing=8; buttons.add(this.backButton); buttons.add(help); buttons.addStretch(); buttons.add(this.acceptButton); buttons.add(this.closeButton);
   this.sizer=new VerticalSizer; this.sizer.margin=10; this.sizer.spacing=8;
   this.sizer.add(layerRow);this.sizer.add(this.showL);
   this.sizer.add(amountRow); this.sizer.add(gainRow); this.sizer.add(navigation);
   this.sizer.add(columns,100); this.sizer.add(this.status);this.sizer.add(this.progressBar); this.sizer.add(nameRow);this.sizer.add(this.recombine); this.sizer.add(buttons);
   this.sizer.add(MF_label(this,"Wheel: zoom both panels. Drag: pan. Each update starts from the same base. Screen display without STF; full-resolution processing."));
   this.sizer.add(MF_copyright(this));
   this.setScaledMinSize(940,650); this.adjustToContents(); this.fit(); this.calculate();
}
fullImageVisible()
{
   return this.camera.showsWholeImage(Math.min(this.originalPane.width,this.resultPane.width),Math.min(this.originalPane.height,this.resultPane.height));
}
selectedLayers()
{
   return this.layerChecks.map(function(box){return box.checked;});
}
renderCandidate(candidate)
{
   if(!this.showL.checked || !candidate.mainView.image.isColor)return candidate.mainView.image.render();
   var work=new MF_Work;
   try{return MF_lightness(candidate,work,"PreviewL").mainView.image.render();}
   finally{work.dispose();}
}
values()
{
   return {amount:MF_number(this.amountEdit.text,"Intensity",0,100)/100,
           gain:MF_number(this.gainEdit.text,"Relative gain",0,4)};
}
freshness(quiet)
{
   var fresh=false;
   try { var v=this.values(); fresh=this.ready && !!this.state.result && v.amount===this.state.amount && v.gain===this.state.gain && (this.state.config.method!=="MLT" || this.selectedLayers().join(",")===this.state.layersKey); }
   catch (e) {}
   this.acceptButton.enabled=fresh && !this.busy;
   if (!quiet && this.ready && !fresh && !this.busy) this.status.text="Settings changed: click Update Preview.";
}
setBusy(value)
{
   this.busy=value;
   [this.updateButton,this.backButton,this.closeButton,this.amount,this.amountEdit,this.gain,this.gainEdit].forEach(function(control) { control.enabled=!value; });
   this.recombine.enabled=!value && !!this.state.config.baseStars && !this.state.config.baseStars.isNull;
   this.showL.enabled=!value;
   this.layerChecks.forEach(function(box){box.enabled=!value && this.state.config.method==="MLT";},this);
   this.freshness(true);
}
calculate()
{
   var self=this; this.setBusy(true);
   try
   {
      var v=this.values(), bitmap=null;
      this.progressBar.setValue(0);this.status.text="Computing new lightness and preparing the comparison…";
      CoreApplication.processEvents();
      MF_update(this.state,v.amount,v.gain,function(candidate) { bitmap=self.renderCandidate(candidate); },this.selectedLayers(),function(text,percent){self.status.text=text;self.status.repaint();self.progressBar.setValue(percent);});
      this.resultBitmap=bitmap; this.ready=true; this.repaintBoth();
      var f=this.state.fit;
      this.status.text=(this.state.config.method==="MLT"?"MLT · layers "+this.selectedLayers().map(function(on,i){return on?i+1:null;}).filter(function(x){return x!==null;}).join(",")+" · ":"")+"Comparison ready · intensity "+(v.amount*100).toFixed(1)+" % · total gain "+(f.gain*v.gain).toFixed(3)+
         (f.reliable?"":" · Automatic fit unreliable: initial gain set to 1. Review the result.");
      console.writeln(this.status.text);
   }
   catch (e)
   {
      this.status.text="Error: "+String(e)+(this.ready?" The last valid comparison has been kept.":"");
      console.warningln(this.status.text);
   }
   finally { this.setBusy(false); }
}
fit()
{
   this.camera.fit(Math.min(this.originalPane.width,this.resultPane.width),Math.min(this.originalPane.height,this.resultPane.height));
   this.repaintBoth();
}
zoomAtCenter(factor)
{
   var pane=this.originalPane;
   this.camera.zoom(factor,pane.width/2,pane.height/2,pane.width,pane.height); this.repaintBoth();
}
repaintBoth()
{
   this.originalPane.update(); this.resultPane.update();
   if (this.zoomLabel) this.zoomLabel.text="Zoom "+(this.camera.scale*100).toFixed(1)+" %";
}
makePane()
{
   var self=this, pane=new Control(this); pane.setScaledMinSize(350,300); pane.drag=null;
   pane.onPaint=function()
   {
      var bitmap=this===self.originalPane?self.originalBitmap:self.resultBitmap;
      var g=new Graphics(this);
      try
      {
         g.fillRect(0,0,this.width,this.height,new Brush(0xff202020));
         if (!bitmap) return;
         var s=self.camera.scale,ox=this.width/2-self.camera.x*s,oy=this.height/2-self.camera.y*s;
         var x0=Math.max(0,Math.floor(-ox/s)),y0=Math.max(0,Math.floor(-oy/s));
         var x1=Math.min(bitmap.width,Math.ceil((this.width-ox)/s)),y1=Math.min(bitmap.height,Math.ceil((this.height-oy)/s));
         if (x1>x0 && y1>y0)
         {
            g.smoothInterpolation=s<1;
            g.drawScaledBitmapRect(ox+x0*s,oy+y0*s,ox+x1*s,oy+y1*s,bitmap,x0,y0,x1,y1);
         }
      }
      finally { g.end(); }
   };
   pane.onMouseWheel=function(x,y,delta)
   {
      if (!delta) return;
      self.camera.zoom(delta>0?1.25:1/1.25,x,y,this.width,this.height); self.repaintBoth();
   };
   pane.onMousePress=function(x,y,button)
   {
      if (button===MouseButton.Left) this.drag={x:x,y:y};
   };
   pane.onMouseMove=function(x,y,buttons)
   {
      if (!this.drag) return;
      if (!(buttons & MouseButton.Left)) { this.drag=null; return; }
      self.camera.pan(x-this.drag.x,y-this.drag.y,this.width,this.height);
      this.drag={x:x,y:y}; self.repaintBoth();
   };
   pane.onMouseRelease=function() { this.drag=null; };
   pane.onResize=function()
   {
      if (!self.originalPane || !self.resultPane) return;
      if (self.camera.fitted) self.fit();
      else { self.camera.limit(this.width,this.height); self.repaintBoth(); }
   };
   return pane;
}
}

var MF_REQUIREMENTS = "INPUT REQUIREMENTS\n\nBoth images must be stretched, with gradients removed and color calibration completed. Star deconvolution is optional; noise reduction is recommended.\n\nWITH STARXTERMINATOR\nUse images with stars. StarXTerminator must be installed, activated and have a working AI model. The script solves unsolved inputs before separating the stars.\n\nWITHOUT STARXTERMINATOR\nBoth images must already be starless and retain valid astrometric solutions for their current pixel grids. Disable star separation in setup.\n\nSelect a short-focal-length base and a long-focal-length detail image of the same target with overlapping coverage.\n\nCopyright © Carlos Rincón 2026";
function MF_startupNotice(showMessage)
{
   if(showMessage)return showMessage(MF_REQUIREMENTS)===StdButton_Ok;
   return new MessageBox(MF_REQUIREMENTS,"Focal Length Blend · Before you start",StdIcon_Information,StdButton_Ok,StdButton_Cancel).execute()===StdButton_Ok;
}

function MF_main()
{
   if(!MF_startupNotice())return;
   console.hide();
   var setup=new MF_SetupDialog;
   try { while (setup.execute())
   {
      var state=null;
      try
      {
         var task=new MF_TaskDialog;task.show();task.bringToFront();
         try{state=MF_prepare(setup.config,function(text,percent){task.status.text=text;task.status.repaint();task.progressBar.setValue(percent);console.writeln(text);});task.progressBar.setValue(100);}
         finally{task.hide();}
         console.writeln("Gaussian scales: sigma "+setup.config.fine+"–"+setup.config.coarse+" px; transition "+setup.config.feather+" px; estimated gain "+state.fit.gain.toFixed(4));
         var preview=new MF_PreviewDialog(state);
         if (preview.execute())
         {
            var stars=MF_retainBaseStars(setup.geometry);
            if(stars)console.writeln("Base stars: "+stars.mainView.id+". Screen recombination: ~((~"+state.result.mainView.id+")*(~"+stars.mainView.id+"))");
            return;
         }
         if (!preview.returnToSetup) return;
      }
      catch (e) { new MessageBox(String(e),"Focal Length Blend",StdIcon_Error,StdButton_Ok).execute(); }
      finally { if (state) state.work.dispose(); }
   }}finally{setup.maskWork.dispose();if(setup.geometry)setup.geometry.work.dispose();}
}

#ifndef CR_MF_LIBRARY
try { MF_main(); }
catch (e) { new MessageBox(String(e),"Focal Length Blend",StdIcon_Error,StdButton_Ok).execute(); }
#endif


