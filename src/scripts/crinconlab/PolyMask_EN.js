// Copyright © Carlos Rincón 2026
#feature-id CrinconlabPolyMaskAdvancedPreview : Crinconlab > PolyMask Advanced (beta)
#feature-icon icons/polymask_orange.svg
#feature-info Editable polygon masks, normalized chrominance, color and lightness selections, project save/load and live preview while dragging. Six author-supplied color masks. Version 0.3.0-beta.17. Copyright &copy; Carlos Rinc&oacute;n 2026.
#engine v8
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/ButtonCodes.jsh>
#include <pjsr/UndoFlag.jsh>
#include "ProtectedPaths.jsh"
#include "PolyMaskProjects.jsh"
CoreApplication.ensureMinimumVersion(1,9,6);
// Retained for future releases; not exposed or used in this local edition.
var PM_ENABLE_MASK_COMBINATION=false;

function PM_clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function PM_number(value, name, low, high)
{
   var text = String(value).trim().replace(",", "."), n = Number(text);
   if (!text || !isFinite(n) || n < low || n > high)
      throw new Error(name + ": enter a value between " + low + " and " + high + ".");
   return n;
}
function PM_validId(id)
{
   if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id))
      throw new Error("The output name must start with a letter or underscore and contain only ASCII letters, digits and underscores.");
}
function PM_unique(tag)
{
   var base = "CR_PM_" + tag, id = base, i = 2;
   while (!ImageWindow.windowById(id).isNull) id = base + "_" + i++;
   return id;
}
function PM_assertView(view, name)
{
   if (!view || view.isNull || view.isPreview)
      throw new Error(name + ": select an open main image.");
   var image = view.image, channels = image.numberOfNominalChannels;
   if ((channels != 1 && channels != 3) || image.numberOfChannels != channels)
      throw new Error(name + ": monochrome or RGB images without alpha channels are supported.");
}
function PM_Work()
{
   this.windows = [];
}
PM_Work.prototype.own = function(window)
{
   if (window && !window.isNull && this.windows.indexOf(window) < 0) this.windows.push(window);
   return window;
};
PM_Work.prototype.release = function(window)
{
   var index = this.windows.indexOf(window);
   if (index >= 0) this.windows.splice(index, 1);
};
PM_Work.prototype.close = function(window)
{
   if (this.windows.indexOf(window) < 0) return;
   if (window && !window.isNull) window.forceClose();
   this.release(window);
};
PM_Work.prototype.dispose = function()
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
function PM_identitySTF(view)
{
   view.stf = [[0.5,0,1,0,1],[0.5,0,1,0,1],[0.5,0,1,0,1],[0.5,0,1,0,1]];
}
function PM_copyMetadata(source, destination)
{
   destination.keywords = source.keywords;
   if (source.hasAstrometricSolution) destination.copyAstrometricSolution(source);
}
function PM_clone(view, work, tag)
{
   var image = view.image;
   var window = work.own(new ImageWindow(image.width, image.height,
      image.numberOfNominalChannels, 32, true, image.isColor, PM_unique(tag)));
   image.pushSelections();
   try
   {
      image.resetSelections();
      window.mainView.beginProcess();
      try { window.mainView.image.assign(image); }
      finally { window.mainView.endProcess(); }
   }
   finally { image.popSelections(); }
   PM_identitySTF(window.mainView);
   return window;
}
function PM_math(expression, reference, work, tag, color)
{
   var id = PM_unique(tag), p = new PixelMath, result = null;
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
   var sourceImage=reference.image,sourceRect=new Rect(sourceImage.selectedRect),sourcePoint=new Point(sourceImage.selectedPoint),sourceFirst=sourceImage.firstSelectedChannel,sourceLast=sourceImage.lastSelectedChannel;
   sourceImage.pushSelections();
   try
   {
      sourceImage.resetSelections();
      if (!p.executeOn(reference)) throw new Error("PixelMath did not complete " + tag + ".");
   }
   finally
   {
      sourceImage.popSelections();
      // Native process execution can reset the view's selection object.
      var restore=reference.image;restore.selectedRect=sourceRect;restore.selectedChannel=sourceFirst;restore.lastSelectedChannel=sourceLast;restore.selectedPoint=sourcePoint;
      result = ImageWindow.windowById(id);
      if (!result.isNull) work.own(result);
   }
   if (result.isNull) throw new Error("Temporary image was not created: " + tag + ".");
   PM_identitySTF(result.mainView);
   return result;
}
function PM_blur(window, sigma, work, tag)
{
   if (sigma < 0.1) return window; // Subpixel draft blur below native precision is negligible.
   var result = PM_clone(window.mainView, work, tag), p = new Convolution;
   p.mode = Convolution.Parametric;
   p.sigma = sigma;
   p.shape = 2;
   p.aspectRatio = 1;
   p.rotationAngle = 0;
   if (!p.executeOn(result.mainView,false)) throw new Error("Could not smooth " + tag + ".");
   return result;
}
function PM_polygon(vertices,width,height,allowSubpixel)
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
   if (Math.abs(area)<(allowSubpixel?1e-12:1))
      throw new Error("The polygon must cover at least half a square pixel.");
   return points;
}
function PM_PolygonSelection(width,height)
{
   this.width=width; this.height=height; this.points=[]; this.closed=false;
}
PM_PolygonSelection.prototype.point=function(x,y)
{
   return {x:Math.round(PM_clamp(x,0,this.width)),y:Math.round(PM_clamp(y,0,this.height))};
};
PM_PolygonSelection.prototype.add=function(x,y)
{
   if (this.closed) throw new Error("Reopen the contour with Undo or move its vertices.");
   if (this.points.length>=64) throw new Error("Up to 64 vertices are supported.");
   this.points.push(this.point(x,y));
};
PM_PolygonSelection.prototype.close=function()
{
   PM_polygon(this.points,this.width,this.height); this.closed=true;
};
PM_PolygonSelection.prototype.undo=function()
{
   if (this.closed) this.closed=false;
   else this.points.pop();
};
PM_PolygonSelection.prototype.polygon=function()
{
   if (!this.closed) throw new Error("Close the polygon before previewing or creating the mask.");
   return PM_polygon(this.points,this.width,this.height);
};
function PM_maskPoint(x,y,viewWidth,viewHeight,width,height)
{
   var scale=Math.min(viewWidth/width,viewHeight/height);
   return {x:PM_clamp((x-(viewWidth-width*scale)/2)/scale,0,width),
      y:PM_clamp((y-(viewHeight-height*scale)/2)/scale,0,height)};
}
function PM_polygonMask(reference,vertices,work,allowSubpixel)
{
   PM_assertView(reference,"Reference image");
   var points=PM_polygon(vertices,reference.image.width,reference.image.height,allowSubpixel),inside="0";
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
   return PM_math("iif("+inside+",1,0)",reference,work,"CoberturaPoligonal",false);
}
function PM_Camera(width,height)
{
   this.width=width; this.height=height; this.x=width/2; this.y=height/2;
   this.scale=1; this.fitted=true;
}
PM_Camera.prototype.fit=function(w,h)
{
   this.scale=Math.min(w/this.width,h/this.height,1);
   this.x=this.width/2; this.y=this.height/2; this.fitted=true;
};
PM_Camera.prototype.showsWholeImage=function(w,h)
{
   if(!(this.scale>0) || !(w>0) || !(h>0))return false;
   var hx=w/(2*this.scale),hy=h/(2*this.scale),t=1e-6;
   return this.x-hx<=t && this.y-hy<=t && this.x+hx>=this.width-t && this.y+hy>=this.height-t;
};
PM_Camera.prototype.limit=function(w,h)
{
   var hx=w/(2*this.scale),hy=h/(2*this.scale);
   this.x=hx>=this.width/2?this.width/2:PM_clamp(this.x,hx,this.width-hx);
   this.y=hy>=this.height/2?this.height/2:PM_clamp(this.y,hy,this.height-hy);
};
PM_Camera.prototype.zoom=function(factor,x,y,w,h)
{
   var ix=this.x+(x-w/2)/this.scale,iy=this.y+(y-h/2)/this.scale;
   this.scale=PM_clamp(this.scale*factor,0.01,8); this.fitted=false;
   this.x=ix-(x-w/2)/this.scale; this.y=iy-(y-h/2)/this.scale;
   this.limit(w,h);
};
PM_Camera.prototype.pan=function(dx,dy,w,h)
{
   this.x-=dx/this.scale; this.y-=dy/this.scale; this.fitted=false; this.limit(w,h);
};

// Screen-only status badge: never written into mask/image pixels.
function PM_drawPendingBadge(g,width,height)
{
   var text="Preview out of date",font=new Font("Helvetica",13,"px");
   g.font=font;g.opacity=1;
   var w=font.width(text)+16,h=font.height+10,x=Math.max(4,width-w-10),y=10;
   g.fillRect(x,y,x+w,y+h,new Brush(0xe6141414));
   g.pen=new Pen(0xffff6262,1);g.drawText(x+8,y+5+font.ascent,text);
}
function PM_label(parent,text)
{
   var label=new Label(parent); label.text=text; label.wordWrapping=true; return label;
}
function PM_taskLabel(parent,text)
{
   var label=PM_label(parent,text);
   label.styleSheet="QLabel { color: #1670d2; font-weight: bold; }";
   return label;
}
// Native V8 controls: avoid legacy NumericControl.jsh/Sizer declarations.
function PM_simplifyStroke(points,tolerance)
{
 var clean=[];points.forEach(function(p){var q=clean[clean.length-1];if(!q||Math.hypot(p.x-q.x,p.y-q.y)>1e-6)clean.push({x:p.x,y:p.y});});
 if(clean.length>2 && Math.hypot(clean[0].x-clean[clean.length-1].x,clean[0].y-clean[clean.length-1].y)<tolerance)clean.pop();
 function simplify(epsilon){var keep={0:true},last=clean.length-1;keep[last]=true;var stack=[[0,last]];
 while(stack.length){var edge=stack.pop(),a=clean[edge[0]],b=clean[edge[1]],best=epsilon*epsilon,index=-1,dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 for(var i=edge[0]+1;i<edge[1];++i){var p=clean[i],t=den?PM_clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0,d=(p.x-a.x-t*dx)*(p.x-a.x-t*dx)+(p.y-a.y-t*dy)*(p.y-a.y-t*dy);if(d>best){best=d;index=i;}}
 if(index>=0){keep[index]=true;stack.push([edge[0],index],[index,edge[1]]);}}
 return clean.filter(function(p,i){return !!keep[i];});}
 if(clean.length<3)throw new Error("Draw a closed area with at least three distinct points.");
 var result=simplify(tolerance);for(var n=0;result.length>64&&n<40;++n){tolerance*=1.3;result=simplify(tolerance);}
 if(result.length<3||result.length>64)throw new Error("Stroke is too small or complex. Draw a larger, simpler contour.");return result;
}
class PM_RangeControl extends Control
{
constructor(parent,maximum,initial)
{
 super(parent);var self=this;
 this.slider=new Slider(this);this.slider.setRange(0,maximum);this.slider.setScaledMinWidth(90);
 this.readout=new Label(this);this.readout.setScaledFixedWidth(30);
 this.sizer=new HorizontalSizer;this.sizer.spacing=5;this.sizer.add(this.slider,100);this.sizer.add(this.readout);
 this.adjusting=false;this.updating=false;
 this.slider.onMousePress=function(){self.adjusting=true;if(self.onAdjustmentStarted)self.onAdjustmentStarted();};
 this.slider.onMouseRelease=function(){self.adjusting=false;if(self.onAdjustmentFinished)self.onAdjustmentFinished();if(self.onValueUpdated)self.onValueUpdated(self.value);};
 this.slider.onValueUpdated=function(v){self.readout.text=String(v);if(!self.updating){if(self.adjusting){if(self.onLiveValueUpdated)self.onLiveValueUpdated(v);}else if(self.onValueUpdated)self.onValueUpdated(v);}};this.value=initial;
}
get value(){return this.slider.value;}
set value(v){this.updating=true;try{this.slider.value=v;this.readout.text=String(this.slider.value);}finally{this.updating=false;}}
}
class PM_PreciseRange extends Control
{
constructor(parent,initial)
{
 super(parent);var self=this;this.current=initial;this.anchor=initial;this.updating=false;this.adjusting=false;
 this.slider=new Slider(this);this.slider.setRange(0,100);this.slider.setScaledMinWidth(235);
 this.fine=new Slider(this);this.fine.setRange(-10,10);this.fine.value=0;this.fine.setScaledMinWidth(190);this.fine.toolTip="Fine adjustment: 0.1 L* steps, within ±1 L* of the coarse setting.";
 this.readout=new Label(this);this.readout.setScaledFixedWidth(40);
 var row=new HorizontalSizer;row.spacing=6;row.add(this.slider,100);row.add(this.readout);
 var fineRow=new HorizontalSizer;fineRow.spacing=6;var label=new Label(this);label.text="Fine ±1:";fineRow.add(label);fineRow.add(this.fine,100);
 this.sizer=new VerticalSizer;this.sizer.spacing=3;this.sizer.add(row);this.sizer.add(fineRow);
 function notify(){if(self.updating)return;if(self.adjusting){if(self.onLiveValueUpdated)self.onLiveValueUpdated(self.current);}else if(self.onValueUpdated)self.onValueUpdated(self.current);}
 this.slider.onValueUpdated=function(v){if(self.updating)return;self.current=v;self.anchor=v;self.updating=true;self.fine.value=0;self.updating=false;self.readout.text=v.toFixed(1);notify();};
 this.fine.onValueUpdated=function(v){if(self.updating)return;self.current=Math.round(PM_clamp(self.anchor+v/10,0,100)*10)/10;self.readout.text=self.current.toFixed(1);notify();};
 [this.slider,this.fine].forEach(function(slider){slider.onMousePress=function(){self.adjusting=true;if(self.onAdjustmentStarted)self.onAdjustmentStarted();};slider.onMouseRelease=function(){self.adjusting=false;if(self.onAdjustmentFinished)self.onAdjustmentFinished();notify();};});this.value=initial;
}
get value(){return this.current;}
set value(v){this.updating=true;try{this.current=Math.round(PM_clamp(v,0,100)*10)/10;this.anchor=this.current;this.slider.value=Math.round(this.current);this.fine.value=0;this.readout.text=this.current.toFixed(1);}finally{this.updating=false;}}
}
function PM_assertMask(view,reference,name)
{
 PM_assertView(view,name);
 if(view.image.numberOfNominalChannels!==1 || view.image.numberOfChannels!==1 || view.image.width!==reference.image.width || view.image.height!==reference.image.height)
 throw new Error(name+": select a grayscale mask with the same dimensions and registered pixel grid.");
}
class PM_BlurControl extends Control
{
constructor(parent)
{
   super(parent);var self=this;
   this.label=new Label(this);this.label.text="Final blur sigma (px):";
   this.slider=new Slider(this);this.slider.setRange(0,2500);this.slider.value=0;this.slider.setScaledMinWidth(130);
   this.edit=new Edit(this);this.edit.text="0.0";this.edit.setScaledFixedWidth(60);
   this.sizer=new HorizontalSizer;this.sizer.spacing=6;this.sizer.add(this.label);this.sizer.add(this.slider,100);this.sizer.add(this.edit);
   this.adjusting=false;this.slider.onMousePress=function(){self.adjusting=true;if(self.onAdjustmentStarted)self.onAdjustmentStarted();};this.slider.onMouseRelease=function(){self.adjusting=false;if(self.onAdjustmentFinished)self.onAdjustmentFinished();if(self.onValueUpdated)self.onValueUpdated(self.value);};
   this.slider.onValueUpdated=function(v){self.edit.text=(v/10).toFixed(1);if(self.adjusting){if(self.onLiveValueUpdated)self.onLiveValueUpdated(v/10);}else if(self.onValueUpdated)self.onValueUpdated(v/10);};
   this.edit.onEditCompleted=function(){try{self.setValue(PM_number(self.edit.text,"Final blur sigma",0,250));if(self.onValueUpdated)self.onValueUpdated(self.value);}catch(e){self.edit.text=self.value.toFixed(1);}};
}
get value(){return this.slider.value/10;}
setValue(v){this.slider.value=Math.round(PM_clamp(v,0,250)*10);this.edit.text=this.value.toFixed(1);}
}
class PM_Progress extends Control
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

function PM_close(window){if(window && !window.isNull)window.forceClose();}
function PM_availableId(base){var id=base,i=2;while(!ImageWindow.windowById(id).isNull)id=base+"_"+i++;return id;}
function PM_copyright(parent){return PM_label(parent,"Copyright © Carlos Rincón 2026");}
function PM_displayBitmap(view,useSTF)
{
   PM_assertView(view,"Reference image");var copy=null,display=null;
   view.image.pushSelections();
   try{view.image.resetSelections();copy=new Image(view.image);}finally{view.image.popSelections();}
   try
   {
      display=new ImageWindow(copy.width,copy.height,copy.numberOfNominalChannels,32,true,copy.isColor,PM_unique("Display"));
      display.mainView.beginProcess();try{display.mainView.image.assign(copy);}finally{display.mainView.endProcess();}
      if(useSTF)
      {
         var stf=view.stf,h=new HistogramTransformation,rows=[[0,.5,1,0,1],[0,.5,1,0,1],[0,.5,1,0,1],[0,.5,1,0,1],[0,.5,1,0,1]];
         if(copy.isColor)for(var c=0;c<3;++c)rows[c]=[stf[c][1],stf[c][0],stf[c][2],stf[c][3],stf[c][4]];
         else rows[3]=[stf[0][1],stf[0][0],stf[0][2],stf[0][3],stf[0][4]];
         h.H=rows;if(!h.executeOn(display.mainView,false))throw new Error("Could not prepare the reference display.");
      }
      return display.mainView.image.render();
   }finally{if(copy)copy.free();PM_close(display);console.hide();}
}
function PM_makeMask(view,vertices,sigma,mode,invert,progress,allowSubpixel)
{
   PM_assertView(view,"Reference image");sigma=PM_number(sigma,"Feather sigma",0,250);
   var points=PM_polygon(vertices,view.image.width,view.image.height,allowSubpixel),work=new PM_Work;
   function step(p,text){if(progress)progress(p,text);}
   try
   {
      var canvas=work.own(new ImageWindow(view.image.width,view.image.height,1,32,true,false,PM_unique("Canvas")));
      step(20,"Rasterizing polygon…");var support=PM_polygonMask(canvas.mainView,points,work,allowSubpixel),mask=support;
      if(sigma>0)
      {
         step(50,"Computing symmetric feathered edges…");
         var blurred=PM_blur(support,sigma,work,"Feather");
         mask=PM_math("min(1,max(0,"+blurred.mainView.id+"))",support.mainView,work,"Symmetric",false);
      }
      if(invert){step(85,"Inverting the mask…");mask=PM_math("1-"+mask.mainView.id,mask.mainView,work,"Inverted",false);}
      PM_identitySTF(mask.mainView);mask.hide();work.release(mask);step(100,"Mask computed");return mask;
   }finally{work.dispose();console.hide();}
}
function PM_edgeAt(points,x,y,geo,width,height)
{
   var best=null,limit=49;
   for(var i=0;i<points.length;++i)
   {
      var a=points[i],b=points[(i+1)%points.length],ax=geo.x+a.x*geo.scale,ay=geo.y+a.y*geo.scale,dx=(b.x-a.x)*geo.scale,dy=(b.y-a.y)*geo.scale;
      var length=dx*dx+dy*dy;if(!length)continue;
      var t=PM_clamp(((x-ax)*dx+(y-ay)*dy)/length,0,1),px=ax+t*dx,py=ay+t*dy,d=(x-px)*(x-px)+(y-py)*(y-py);
      if(d<limit){limit=d;best={index:i,point:{x:PM_clamp(a.x+t*(b.x-a.x),0,width),y:PM_clamp(a.y+t*(b.y-a.y),0,height)}};}
   }
   return best;
}

// Author-supplied PixelMath formulas. Constants and mtf arguments are preserved.
// E1 selects Chrominance (0) or Lightness (1). E2 was not used in supplied equations.
var PM_COLOR_NAMES=["None","Red","Green","Blue","Cyan","Magenta","Yellow"];
var PM_COLOR_FORMULAS={"Green": "iif(CIEh($T)<0.2778,0,iif(CIEh($T)<=0.4111,~mtf((CIEh($T)-0.2778)/0.1333,0)*CIEc($T),iif(CIEh($T)<=0.5444,~mtf((0.5444-CIEh($T))/0.1333,0)*CIEc($T),0)))", "Cyan": "iif(CIEh($T)<0.375,0,iif(CIEh($T)<=0.6041,~mtf((CIEh($T)-0.375)/0.2291,0)*CIEc($T),iif(CIEh($T)<=0.8334,~mtf((0.8334-CIEh($T))/0.2291,0)*CIEc($T),0)))", "Blue": "iif(CIEh($T)<0.5444,0,iif(CIEh($T)<=0.7375,~mtf((CIEh($T)-0.5444)/0.1930,0)*CIEc($T),iif(CIEh($T)<=0.9305,~mtf((0.9305-CIEh($T))/0.1930,0)*CIEc($T),0)))", "Magenta": "iif(CIEh($T)<=0.1,~mtf((0.1-CIEh($T))/0.1333,0)*CIEc($T),iif(CIEh($T)<0.8333,0,iif(CIEh($T)<=0.9666,~mtf((CIEh($T)-0.8333)/0.1333,0)*CIEc($T),~mtf((1+0.1-CIEh($T))/0.1333,0)*CIEc($T))))", "Red": "iif(CIEh($T)<=0.104,~mtf((CIEh($T)+1-0.930)/0.1736,0)*CIEc($T),iif(CIEh($T)<=0.277,~mtf((0.277-CIEh($T))/0.1736,0)*CIEc($T),iif(CIEh($T)<0.9305,0,~mtf((CIEh($T)-0.930)/0.173,0)*CIEc($T))))", "Yellow": "iif(CIEh($T)<0.1,0,iif(CIEh($T)<=0.2375,~mtf((CIEh($T)-0.1)/0.1375,0)*CIEc($T),iif(CIEh($T)<=0.375,~mtf((0.375-CIEh($T))/0.1375,0)*CIEc($T),0)))"};
var PM_OPERATIONS=["Union (maximum)","Add (clipped)","Subtract","Intersect (minimum)"];
function PM_copyRegion(r)
{
   var selection=new PM_PolygonSelection(r.selection.width,r.selection.height);
   selection.points=r.selection.points.map(function(p){return{x:p.x,y:p.y};});selection.closed=r.selection.closed;
   return {selection:selection,feather:r.feather,mode:1,invert:r.invert,strength:r.strength,
      name:r.name||"",operation:r.operation||0,color:r.color||0,colorMode:r.colorMode||0,lightEnabled:!!r.lightEnabled,
      lightLow:r.lightLow===undefined?0:r.lightLow,lightHigh:r.lightHigh===undefined?100:r.lightHigh,
      lightSoft:r.lightSoft===undefined?0:r.lightSoft};
}
function PM_combineExpression(a,b,operation)
{
   if(operation===1)return "min(1,max(0,("+a+")+("+b+")))";
   if(operation===2)return "max(0,("+a+")-("+b+"))";
   if(operation===3)return "min("+a+","+b+")";
   if(operation!==0)throw new Error("Unknown mask operation.");
   return "max("+a+","+b+")";
}
function PM_colorExpression(view,color,mode)
{
   if(!color)return "1";
   PM_assertView(view,"Color reference");
   if(!view.image.isColor)throw new Error("Color selection requires an RGB reference.");
   var name=PM_COLOR_NAMES[color],formula=PM_COLOR_FORMULAS[name];
   if(!name || !formula)throw new Error("Unknown color mask.");
   if(mode===1)formula=formula.split("CIEc($T)").join("CIEL($T)");
   return "min(1,max(0,("+formula.split("$T").join(view.id)+")))";
}
function PM_lightExpression(view,r)
{
   if(!r.lightEnabled)return "1";
   var low=PM_number(r.lightLow,"Minimum lightness",0,100)/100;
   var high=PM_number(r.lightHigh,"Maximum lightness",0,100)/100;
   var soft=PM_number(r.lightSoft||0,"Lightness transition",0,50)/100;
   if(low>high)throw new Error("Minimum lightness cannot exceed maximum lightness.");
   var l="min(1,max(0,CIEL("+view.id+")))";
   if(soft===0)return "iif(("+l+">="+low+") && ("+l+"<="+high+"),1,0)";
   // Full selection inside the interval, smoothstep falloff outside its ends.
   function smooth(x){return "(("+x+")*("+x+")*(3-2*("+x+")))";}
   var left=low===0?"1":smooth("min(1,max(0,("+l+"-("+(low-soft)+"))/"+soft+"))");
   var right=high===1?"1":smooth("min(1,max(0,("+(high+soft)+"-"+l+")/"+soft+"))");
   return "("+left+")*("+right+")";
}
// Bounded automatic chrominance normalization. Zero is preserved; very weak
// chroma is not stretched, and the gain never exceeds 250. Lightness is unchanged.
function PM_chromaScale(samples)
{
   var values=[],stride=Math.max(1,Math.ceil(samples.length/65536));
   for(var i=0;i<samples.length;i+=stride)if(isFinite(samples[i])&&samples[i]>1e-7)values.push(samples[i]);
   if(!values.length)return 1;
   values.sort(function(a,b){return a-b;});
   var q=values[Math.floor((values.length-1)*.995)];
   return q<.001?1:Math.max(.004,q);
}
function PM_colorMask(reference,color,mode,work)
{
   var raw=PM_math(PM_colorExpression(reference,color,mode),reference,work,"ColorRaw",false);
   if(mode!==0)return raw;
   var samples=new Float32Array(raw.mainView.image.width*raw.mainView.image.height);raw.mainView.image.getSamples(samples);
   var scale=PM_chromaScale(samples);samples=null;
   if(scale===1)return raw;
   var result=PM_math("min(1,max(0,"+raw.mainView.id+"/"+scale+"))",reference,work,"ColorNormalized",false);work.close(raw);return result;
}
// Reduced preview only. The full-size output still uses the native pipeline.
function PM_LiveCache(reference)
{
   this.reference=reference;this.work=new PM_Work;this.entries=[];this.colors={};this.otherKey=null;this.other=null;this.lastMs=0;
   var im=reference.image;this.n=im.width*im.height;this.light=new Float32Array(this.n);this.combined=new Float32Array(this.n);
   var l=PM_math("CIEL("+reference.id+")",reference,this.work,"LiveLightness",false);l.mainView.image.getSamples(this.light);this.work.close(l);
   this.output=this.work.own(new ImageWindow(im.width,im.height,1,32,true,false,PM_unique("LiveBuffer")));
}
PM_LiveCache.prototype.dispose=function(){this.work.dispose();this.entries=[];this.colors={};this.other=null;this.light=null;this.combined=null;this.progress=null;};
PM_LiveCache.prototype.owns=function(w){return this.work.windows.indexOf(w)>=0;};
PM_LiveCache.prototype.region=function(r,index)
{
   var geometryKey=JSON.stringify([r.selection.points,r.feather,!!r.invert]),e=this.entries[index];
   if(!e||e.geometryKey!==geometryKey){if(this.progress)this.progress(Math.round(70*index/this.regionCount),"Preparing live region "+(index+1)+" of "+this.regionCount+"…");var w=this.work.own(PM_makeMask(this.reference,r.selection.points,r.feather,1,r.invert,null,true)),g=new Float32Array(this.n);w.mainView.image.getSamples(g);this.work.close(w);e={geometryKey:geometryKey,geometry:g,values:new Float32Array(this.n),filterKey:null};this.entries[index]=e;}
   var color=r.color||0,mode=r.colorMode||0,colorKey=color+":"+mode,c=null;
   if(color){c=this.colors[colorKey];if(!c){if(this.progress)this.progress(Math.round(70*index/this.regionCount),"Preparing color selection for region "+(index+1)+"…");var w=PM_colorMask(this.reference,color,mode,this.work);c=new Float32Array(this.n);w.mainView.image.getSamples(c);this.work.close(w);this.colors[colorKey]=c;}}
   var key=JSON.stringify([geometryKey,colorKey,r.strength,!!r.lightEnabled,r.lightLow,r.lightHigh,r.lightSoft]);
   if(e.filterKey!==key){var low=(r.lightLow===undefined?0:r.lightLow)/100,high=(r.lightHigh===undefined?100:r.lightHigh)/100,soft=(r.lightSoft||0)/100,strength=r.strength/100;
      for(var k=0;k<this.n;++k){var gate=1;if(r.lightEnabled){var l=PM_clamp(this.light[k],0,1);if(!soft)gate=l>=low&&l<=high?1:0;else{var a=low===0?1:PM_clamp((l-low+soft)/soft,0,1),b=high===1?1:PM_clamp((high+soft-l)/soft,0,1);gate=(a*a*(3-2*a))*(b*b*(3-2*b));}}e.values[k]=e.geometry[k]*strength*(c?c[k]:1)*gate;}e.filterKey=key;
   }
   return e;
};
PM_LiveCache.prototype.calculate=function(regions,active,options,progress)
{
   this.progress=progress||null;this.regionCount=regions.length;var start=Date.now(),self=this,entries=regions.map(function(r,i){return self.region(r,i);});this.entries.length=regions.length;
   var supported=regions.every(function(r){return !r.operation;});
   if(supported){var key=entries.map(function(e,i){return i===active?null:e.filterKey;}).join("|")+":"+active;
      if(key!==this.otherKey){this.other=new Float32Array(this.n);for(var j=0;j<entries.length;++j)if(j!==active){var values=entries[j].values;for(var k=0;k<this.n;++k)if(values[k]>this.other[k])this.other[k]=values[k];}this.otherKey=key;}
      var current=entries[active].values;for(var k=0;k<this.n;++k)this.combined[k]=Math.max(this.other[k],current[k]);
   }else{this.combined.set(entries[0].values);for(var j=1;j<entries.length;++j){var a=entries[j].values,op=regions[j].operation||0;for(var k=0;k<this.n;++k)this.combined[k]=op===1?Math.min(1,this.combined[k]+a[k]):op===2?Math.max(0,this.combined[k]-a[k]):op===3?Math.min(this.combined[k],a[k]):Math.max(this.combined[k],a[k]);}}
   this.output.mainView.beginProcess(UndoFlag_NoSwapFile);try{this.output.mainView.image.setSamples(this.combined);}finally{this.output.mainView.endProcess();}
   var result=options.blur>0?PM_blur(this.output,options.blur,this.work,"LiveFinalBlur"):PM_clone(this.output.mainView,this.work,"LiveResult");
   if(options.invert){var next=PM_math("1-"+result.mainView.id,this.reference,this.work,"LiveInverse",false);this.work.close(result);result=next;}
   this.work.release(result);this.lastMs=Date.now()-start;return result;
};

// Native full-resolution cache. Images remain private to this modal editor.
// Content keys exclude region order/name: reordering still combines in current order.
// LRU retention is bounded; output computation never uses reduced samples.
function PM_RegionCache(reference,budget)
{
   this.reference=reference;this.work=new PM_Work;this.entries={};this.bytes=0;this.clock=0;
   this.budget=budget===undefined?384*1024*1024:budget;
   this.stats={geometry:0,color:0,filtered:0,hits:0};
}
PM_RegionCache.prototype.get=function(key){var e=this.entries[key];if(!e)return null;if(e.window.isNull){this.bytes-=e.bytes;delete this.entries[key];return null;}e.used=++this.clock;++this.stats.hits;return e.window;};
PM_RegionCache.prototype.put=function(key,w){var size=w.mainView.image.width*w.mainView.image.height*4;this.work.own(w);this.entries[key]={window:w,bytes:size,used:++this.clock};this.bytes+=size;return w;};
PM_RegionCache.prototype.trim=function(keep){while(this.bytes>this.budget){var oldest=null;for(var key in this.entries){var e=this.entries[key];if(e.window!==keep&&(oldest===null||e.used<this.entries[oldest].used))oldest=key;}if(oldest===null)break;var e=this.entries[oldest];this.bytes-=e.bytes;this.work.close(e.window);delete this.entries[oldest];}};
PM_RegionCache.prototype.region=function(r)
{
   var geometry=JSON.stringify([r.selection.points,r.feather,!!r.invert]);
   var colorKey=(r.color||0)+":"+(r.colorMode||0);
   var filterKey="F:"+JSON.stringify([geometry,colorKey,r.strength,!!r.lightEnabled,r.lightLow,r.lightHigh,r.lightSoft]);
   var result=this.get(filterKey);if(result)return result;
   var mask=this.get("G:"+geometry);
   if(!mask){mask=this.put("G:"+geometry,PM_makeMask(this.reference,r.selection.points,r.feather,r.mode,r.invert));++this.stats.geometry;}
   var color=null;if(r.color){color=this.get("C:"+colorKey);if(!color){color=this.put("C:"+colorKey,PM_colorMask(this.reference,r.color,r.colorMode||0,this.work));++this.stats.color;}}
   var expression=mask.mainView.id+"*"+(r.strength/100)+"*("+(color?color.mainView.id:"1")+")*("+PM_lightExpression(this.reference,r)+")";
   result=this.put(filterKey,PM_math(expression,mask.mainView,this.work,"CachedRegion",false));++this.stats.filtered;
   this.trim(result);return result;
};
PM_RegionCache.prototype.dispose=function(){this.work.dispose();this.entries={};this.bytes=0;};

function PM_makeRegions(reference,regions,progress,options)
{
   options=options||{};PM_assertView(reference,"Reference image");
   if(!options.baseMask && (!regions.length || regions.length>32))throw new Error("Select 1 to 32 regions.");
   (options.baseMask?[]:regions).forEach(function(r){if(!r.selection.closed)throw new Error("Close the polygon before preview or output.");PM_polygon(r.selection.points,reference.image.width,reference.image.height,options.draftGeometry);PM_number(r.strength,"Mask strength",0,100);});
   var work=new PM_Work,result=null,colorMasks={};
   function step(p,text){if(progress)progress(p,text);}
   try{
      if(options.baseMask){PM_assertMask(options.baseMask,reference,"Base mask A");result=PM_clone(options.baseMask,work,"BaseMask");}
      for(var i=0;!options.baseMask && i<regions.length;++i){
         var r=regions[i];step(75*i/regions.length,"Computing region "+(i+1)+" of "+regions.length+"…");
         if(options.regionCache){
            var filtered=options.regionCache.region(r);
            var expression=result?PM_combineExpression(result.mainView.id,filtered.mainView.id,r.operation||0):filtered.mainView.id;
            var next=PM_math(expression,reference,work,"Regions",false);if(result)work.close(result);result=next;
         }else{
         var mask=work.own(PM_makeMask(reference,r.selection.points,r.feather,r.mode,r.invert,null,options.draftGeometry));
         var colorKey=(r.color||0)+":"+(r.colorMode||0),colorMask=null;
         if(r.color){colorMask=colorMasks[colorKey];if(!colorMask)colorMask=colorMasks[colorKey]=PM_colorMask(reference,r.color,r.colorMode||0,work);}
         var expression=mask.mainView.id+"*"+(r.strength/100)+"*("+(colorMask?colorMask.mainView.id:"1")+")*("+PM_lightExpression(reference,r)+")";
         if(result)expression=PM_combineExpression(result.mainView.id,expression,r.operation||0);
         var next=PM_math(expression,mask.mainView,work,"Regions",false);work.close(mask);if(result)work.close(result);result=next;
         }
      }
      if(options.operand){
         var operand=options.operand;PM_assertView(operand,"Other mask");
         if(operand.image.numberOfNominalChannels!==1 || operand.image.width!==reference.image.width || operand.image.height!==reference.image.height)
            throw new Error("Other mask must be grayscale and match the reference dimensions.");
         step(80,"Combining the other mask…");
         result=PM_math(PM_combineExpression(result.mainView.id,"min(1,max(0,"+operand.id+"))",options.operandOperation||0),reference,work,"Combined",false);
      }
      var blur=PM_number(options.blur||0,"Final blur sigma",0,250);
      if(blur>0){step(88,"Applying final Gaussian blur…");result=PM_blur(result,blur,work,"FinalBlur");}
      if(options.invert){step(95,"Inverting the final mask…");result=PM_math("1-"+result.mainView.id,reference,work,"FinalInverse",false);}
      result=PM_math("min(1,max(0,"+result.mainView.id+"))",reference,work,"Final",false);
      work.release(result);step(100,"Final mask computed");return result;
   }finally{work.dispose();console.hide();}
}

class PM_MaskDialog extends Dialog
{
constructor(reference,feather,background,coverage,footprint)
{
   super();
   PM_assertView(reference,"Reference image");
   var self=this, image=reference.image;
   this.background=background||reference;PM_assertView(this.background,"Reference image");
   if(this.background.image.width!=image.width || this.background.image.height!=image.height)throw new Error("Reference dimensions do not match.");
   this.coverage=null;this.guide=[];this.history=[];this.cachedMask=null;this.overlayBitmap=null;this.createdMasks=[];
   this.reference=reference; this.createdMask=null; this.maskBitmap=null; this.syncing=false; this.busy=false;
   this.imageWidth=image.width; this.imageHeight=image.height;
   this.camera=new PM_Camera(image.width,image.height);
   this.selection=new PM_PolygonSelection(image.width,image.height); this.selected=-1;
   this.regions=[];this.activeRegion=0;this.revision=0;this.cachedRevision=-1;this.outputRevision=-1;this.draftSource=null;this.previewIsDraft=false;this.disposed=false;this.liveCache=null;this.liveDragging=false;this.pendingLive=false;
   this.windowTitle="Crinconlab PolyMask · v0.3.0-beta.17 · "+this.background.id;
   this.detailBitmap=PM_displayBitmap(this.background,true);
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
      self.recordEdit();self.selection.points[self.selected]=self.selection.point(self.vertexX.value,self.vertexY.value);
      self.invalidate();
   }
   this.vertexX.onValueUpdated=coordinateChanged; this.vertexY.onValueUpdated=coordinateChanged;
   this.feather=new PM_RangeControl(this,250,feather===undefined?16:feather);
   this.feather.toolTip="Boundary softness: a Gaussian transition extends inside and outside each polygon before regions are combined. This is different from Final mask blur, which blurs the completed mask.";
   this.feather.onValueUpdated=function() { self.invalidate(); };
   this.strength=new SpinBox(this);this.strength.minValue=0;this.strength.maxValue=100;this.strength.value=100;
   this.strength.toolTip="Mask strength for the selected region. 100% allows full processing; 0% protects it. This does not adjust image brightness.";
   this.strength.onValueUpdated=function(){self.invalidate();};
   this.regionList=new ComboBox(this);this.regionList.setScaledMinWidth(160);
   this.regionList.toolTip="Choose the polygon to edit. Other contours remain visible in cyan.";
   this.regionName=new Edit(this);this.regionName.toolTip="Name the selected polygon to identify it in the list and image.";this.regionName.onEditCompleted=function(){if(self.syncing||!self.regions.length)return;self.regions[self.activeRegion].name=self.regionName.text.trim()||("Region "+(self.activeRegion+1));self.refreshRegions();self.repaintBoth();};
   this.activeRegionLabel=new Label(this);this.activeRegionLabel.useRichText=true;this.activeRegionLabel.wordWrapping=true;
   this.regionList.onItemSelected=function(i){if(!self.syncing && !self.busy)self.switchRegion(i);};
   this.addRegionButton=new PushButton(this);this.addRegionButton.text="Add region";
   this.addRegionButton.onClick=function(){self.addRegion();};
   this.deleteRegionButton=new PushButton(this);this.deleteRegionButton.text="Delete region";
   this.deleteRegionButton.onClick=function(){self.deleteRegion();};
   this.fullRegionButton=new PushButton(this);this.fullRegionButton.text="Full image region";this.fullRegionButton.onClick=function(){if(self.busy)return;self.recordEdit();self.selection.points=[{x:0,y:0},{x:self.imageWidth,y:0},{x:self.imageWidth,y:self.imageHeight},{x:0,y:self.imageHeight}];self.selection.close();self.invalidate();};
   this.drawMode=new ComboBox(this);this.drawMode.addItem("By points");this.drawMode.addItem("Freehand");this.drawMode.currentItem=1;this.drawMode.toolTip="Freehand: hold the left mouse button and trace an area, then release to close. Drag a vertex to refine it. Drawing away from vertices replaces the selected polygon; Undo restores it. Shift-drag pans.";
   this.operation=new ComboBox(this);PM_OPERATIONS.forEach(function(n){self.operation.addItem(n);});
   this.operation.toolTip="Combine this region with the accumulated mask above it. The first region starts the mask. Subtraction is ordered: accumulated mask minus this region.";
   this.operation.onItemSelected=function(){self.invalidate();};
   this.colorSelection=new ComboBox(this);PM_COLOR_NAMES.forEach(function(n){self.colorSelection.addItem(n);});
   this.colorSelection.toolTip="Select an author-supplied hue mask. It reads the working RGB image, restricted to this region. Use Full image region to create a whole-image color mask.";
   this.colorSelection.onItemSelected=function(i){if(self.syncing)return;if(i && !self.selection.points.length){self.fullRegionButton.onClick();self.status.text="Color mask uses the full image. Draw a contour or add regions to restrict it.";}else self.invalidate();};
   this.colorMode=new ComboBox(this);this.colorMode.addItem("Chrominance");this.colorMode.addItem("Lightness");this.colorMode.toolTip="Chrominance uses CIEc with bounded automatic normalization to make weak color masks usable. Lightness uses the original CIEL weighting. Very weak chroma is not amplified; neutral pixels remain black. Neither changes source pixels.";this.colorMode.onItemSelected=function(){if(!self.syncing)self.invalidate();};
   this.moveUp=new PushButton(this);this.moveUp.text="Move up";this.moveUp.toolTip="Move the selected region earlier in the operation order.";this.moveUp.onClick=function(){self.moveRegion(-1);};
   this.moveDown=new PushButton(this);this.moveDown.text="Move down";this.moveDown.toolTip="Move the selected region later in the operation order.";this.moveDown.onClick=function(){self.moveRegion(1);};
   this.operation.hide();this.moveUp.hide();this.moveDown.hide();
   this.lightEnabled=new CheckBox(this);this.lightEnabled.text="Limit by lightness (CIE L*)";
   this.lightEnabled.toolTip="Select a lightness interval in this polygon. Values are read from the source image, not from the display STF. Normally use a stretched image.";
   this.lightLow=new PM_PreciseRange(this,0);
   this.lightHigh=new PM_PreciseRange(this,100);
   this.lightSoft=new PM_RangeControl(this,50,0);
   this.lightLow.toolTip="Minimum selected CIE L*, from 0 to 100. Must not exceed Maximum.";
   this.lightHigh.toolTip="Maximum selected CIE L*, from 0 to 100. Must not be below Minimum.";
   this.lightSoft.toolTip="Smooth transition outside the selected interval, in L* units. Zero produces a hard brightness cutoff.";
   this.lightEnabled.onCheck=this.lightSoft.onValueUpdated=function(){self.invalidate();};
   this.lightLow.onValueUpdated=function(v){if(v>self.lightHigh.value)self.lightHigh.value=v;self.invalidate();};
   this.lightHigh.onValueUpdated=function(v){if(v<self.lightLow.value)self.lightLow.value=v;self.invalidate();};
   
   this.closePolygon=new PushButton(this); this.closePolygon.text="Close polygon";this.closePolygon.toolTip="Connect the last vertex to the first so the mask can be previewed or created.";
   this.closePolygon.onClick=function() { self.finishPolygon(); };
   this.undo=new PushButton(this); this.undo.text="Undo";this.undo.toolTip="Reopen a closed polygon; otherwise remove its last vertex.";
   this.undo.onClick=function(){self.undoEdit();};
   this.undo.toolTip="Undo the last contour edit, including moving, inserting or deleting vertices.";
   this.clear=new PushButton(this);this.clear.text="Clear contour";this.clear.toolTip="Remove all vertices. Undo can restore the previous contour.";
   this.clear.onClick=function(){self.clearContour();};
   this.detailPane=this.makePane(false); this.maskPane=this.makePane(true);
   this.detailPane.toolTip="Left click adds vertices. Drag a vertex to move it. Click the first vertex to close. On a closed edge, click to insert a vertex. Right click opens contour actions. Wheel zooms; Shift + left drag pans.";
   this.maskPane.toolTip="White allows processing, black protects, and gray applies it partially. This is the actual feathered mask. Wheel zooms both panels; Shift + left drag pans.";
   this.fitButton=new PushButton(this);this.fitButton.text="Fit Image";this.fitButton.toolTip="Fit the full image and effective mask in both panels without changing the contour or transition.";
   this.fitButton.onClick=function(){self.fit();};
   this.oneButton=new PushButton(this);this.oneButton.text="100 %";this.oneButton.toolTip="Show one image pixel per screen pixel in both panels for precise edge inspection.";
   this.oneButton.onClick=function(){self.cancelDrags();self.camera.scale=1;self.camera.fitted=false;self.limitCamera();self.repaintBoth();};
   this.minusButton=new PushButton(this);this.minusButton.text="−";this.minusButton.toolTip="Zoom out in both mask-editor panels.";this.minusButton.onClick=function(){self.zoomAtCenter(1/1.25);};
   this.plusButton=new PushButton(this);this.plusButton.text="+";this.plusButton.toolTip="Zoom in on both mask-editor panels.";this.plusButton.onClick=function(){self.zoomAtCenter(1.25);};
   this.zoomLabel=PM_label(this,"");
   var left=new VerticalSizer; left.spacing=4;
   this.detailCaption=new Label(this);this.detailCaption.useRichText=false;this.detailCaption.wordWrapping=true;left.add(this.detailCaption);left.add(this.detailPane,100);
   var right=new VerticalSizer; right.spacing=4;
   this.maskCaption=new Label(this);this.maskCaption.wordWrapping=true;right.add(this.maskCaption); right.add(this.maskPane,100);
   var columns=new HorizontalSizer; columns.spacing=8; columns.add(left,100); columns.add(right,100);
   this.status=PM_taskLabel(this,"");this.progressBar=new PM_Progress(this);
   this.preview=new PushButton(this); this.preview.text="Update Preview";this.preview.toolTip="Compute the full-resolution mask and overlay. Preview and output use the same pixel values.";
   this.preview.onClick=function() { self.calculate(false); };
   this.mode=new ComboBox(this);this.mode.addItem("Inward");this.mode.addItem("Both sides");this.mode.currentItem=1;this.mode.hide();
   this.mode.toolTip="Compatibility field only. Feathering is always symmetric across both sides of the contour.";
   this.invert=new CheckBox(this);this.invert.text="Invert region area";this.invert.toolTip="Select the outside instead of the inside of this polygon, after boundary softness. Color and lightness selections are then restricted to this inverted area. Other regions are unchanged.";
   this.mode.onItemSelected=this.invert.onCheck=function(){self.invalidate();};
   this.opacity=new Slider(this);this.opacity.setRange(0,80);this.opacity.value=35;this.opacity.setScaledMinWidth(100);
   this.opacity.toolTip="Overlay opacity for display only. Does not change the mask.";
   this.opacity.onValueUpdated=function(){self.detailPane.update();};
   this.overlayColor=new ComboBox(this);["Purple","Cyan","Red"].forEach(function(name){self.overlayColor.addItem(name);});
   this.overlayColor.toolTip="Overlay display color. Does not change the mask.";
   this.overlayColor.onItemSelected=function(){self.rebuildOverlay();self.detailPane.update();};
   this.useSTF=new CheckBox(this);this.useSTF.text="Use image STF";this.useSTF.checked=true;
   this.useSTF.toolTip="Use the reference's current display stretch. Activate an STF before opening PolyMask for a linear image. Mask pixels are never stretched.";
   this.useSTF.onCheck=function(){try{self.detailBitmap=PM_displayBitmap(self.background,self.useSTF.checked);self.repaintBoth();}catch(e){self.status.text=String(e);}};
   this.finalInvert=new CheckBox(this);this.finalInvert.text="Invert final mask";this.finalInvert.toolTip="Complement the complete result after color/lightness selection and final blur. This also activates previously excluded areas; it does not invert just the polygon area. For color selection outside a polygon, use Invert region area in Shape.";this.finalInvert.onCheck=function(){self.toggleFinalInversion();};
   this.finalBlur=new PM_BlurControl(this);this.finalBlur.setValue(0);this.finalBlur.onValueUpdated=function(){self.invalidate();};
   this.finalBlur.label.text="Final mask blur (px):";this.finalBlur.toolTip="Applied LAST to the combined polygon, color and lightness selections, before final inversion. Blur can spread gray into nearby excluded areas: gray means partial processing. Boundary softness only softens polygon edges.";
   this.live=new CheckBox(this);this.live.text="Automatic selection preview";this.live.checked=true;this.live.toolTip="Automatically update a reduced preview for color, lightness and final blur. Polygon edits require Update Preview. Full resolution is computed only by Update Preview, Create Mask or Apply Mask.";
   this.live.onCheck=function(){self.previewTimer.stop();self.invalidate();};
   this.baseEnabled=new CheckBox(this);this.baseEnabled.text="Use existing mask A";
   this.baseEnabled.toolTip="Use an already-created grayscale mask instead of the polygon result. For example, select a luminance mask A and subtract a red mask B. Polygon and per-region filters are bypassed in this mode.";
   this.baseView=new ViewList(this);this.baseView.getMainViews();this.baseView.setScaledMinWidth(180);
   this.baseEnabled.onCheck=this.baseView.onViewSelected=function(){self.invalidate();};
   this.otherEnabled=new CheckBox(this);this.otherEnabled.text="Combine mask B";this.otherEnabled.toolTip="Combine the region result with an open grayscale mask on the same pixel grid.";
   this.otherView=new ViewList(this);this.otherView.getMainViews();this.otherView.setScaledMinWidth(200);
   this.otherOperation=new ComboBox(this);PM_OPERATIONS.forEach(function(n){self.otherOperation.addItem(n);});this.otherOperation.toolTip="Region result is the first operand; the selected open mask is the second. Subtract means region result minus selected mask.";
   this.otherEnabled.onCheck=this.otherOperation.onItemSelected=this.otherView.onViewSelected=function(){self.invalidate();};
   this.targetView=new ViewList(this);this.targetView.getMainViews();this.targetView.currentView=reference;this.targetView.setScaledMinWidth(220);
   this.targetView.toolTip="Target image for Apply Mask. It must have the same dimensions and pixel grid as the reference. Mask assignment never changes image pixels.";
   this.applyButton=new PushButton(this);this.applyButton.text="Apply Mask";this.applyButton.toolTip="Create the current full-resolution mask if necessary and attach it to the selected target. Replaces that target's mask attachment; source pixels are not edited.";
   this.applyButton.onClick=function(){self.applyToTarget();};
   this.refreshViewsButton=new PushButton(this);this.refreshViewsButton.text="Refresh views";this.refreshViewsButton.onClick=function(){self.refreshViewLists();self.invalidate();};
   this.previewTimer=new Timer(0.12,false,this);this.previewTimer.onTimeout=function(){if(!self.disposed && self.live.checked && !self.geometryDirty && !self.busy && self.allValid())self.calculate(true);};
   this.refineTimer=new Timer(0.45,false,this);this.refineTimer.onTimeout=function(){if(self.disposed)return;if(self.isAdjusting()){self.queueRefinement();return;}if(self.busy){self.refinePending=true;return;}if(self.allValid()&&(self.previewIsDraft||self.cachedRevision!==self.revision))self.calculate(false);};
   [this.lightLow,this.lightHigh,this.lightSoft,this.feather,this.finalBlur].forEach(function(c){c.onAdjustmentStarted=function(){self.liveDragging=true;self.refineTimer.stop();};c.onAdjustmentFinished=function(){self.liveDragging=false;};c.onLiveValueUpdated=function(v){if(self.live.checked&&c.onValueUpdated)c.onValueUpdated(v);};});
   this.outputName=new Edit(this);this.outputName.text=PM_availableId("PolyMask");
   this.outputName.toolTip="New mask image identifier. Use ASCII letters, digits and underscores; begin with a letter or underscore.";
   this.applyMask=new CheckBox(this);this.applyMask.text="Attach when creating";this.applyMask.checked=false;
   this.applyMask.toolTip="Attach the new mask to the selected target, replacing its current mask. This does not edit image pixels.";
   this.create=new PushButton(this);this.create.text="Create Mask";this.create.toolTip="Create a full-resolution 32-bit grayscale mask. Stay in the editor to create more masks.";
   this.create.onClick=function(){self.createOutput();};
   var cancel=this.backButton=new PushButton(this);cancel.text="Back";cancel.toolTip="Return to image selection. Discard this contour and temporary preview, but keep masks already created.";
   cancel.onClick=function(){if(!self.busy)self.cancel();};
   var help=new PushButton(this);help.text="Help";help.onClick=PM_help;
   this.separate=new PushButton(this);this.separate.text="Separate region masks";this.separate.onClick=function(){self.createSeparate();};
   this.workMode=new ComboBox(this);this.workMode.addItem("Create a mask");this.workMode.addItem("Combine existing masks");this.workMode.onItemSelected=function(){if(!self.syncing)self.setWorkflow();};
   this.showOnlyActive=new CheckBox(this);this.showOnlyActive.text="Preview active region only";this.showOnlyActive.toolTip="Preview only. Create Mask and Apply Mask always use all regions and final settings.";this.showOnlyActive.onCheck=function(){self.invalidate();};
   this.advancedShape=new CheckBox(this);this.advancedShape.text="Advanced region controls";
   this.advancedAddition=new CheckBox(this);this.advancedAddition.text="Advanced: clipped addition";this.advancedAddition.toolTip="Union uses max(A,B), preserving overlap strength. Clipped addition uses min(1,A+B), so overlapping gray areas get stronger.";this.advancedAddition.onCheck=function(){self.populateOperations(self.operationCode());self.invalidate();};this.operationMap=[0,2,3];
   this.saveProjectButton=new PushButton(this);this.saveProjectButton.text="Save project…";this.saveProjectButton.toolTip="Save contours, region names and settings as a local JSON project. Image pixels and output masks are not saved.";this.saveProjectButton.onClick=function(){self.saveProjectFile();};
   this.loadProjectButton=new PushButton(this);this.loadProjectButton.text="Load project…";this.loadProjectButton.onClick=function(){self.loadProjectFile();};
   this.leftPanel=new Control(this);this.leftPanel.setScaledFixedWidth(390);
   this.controlTabs=new TabBox(this.leftPanel);
   var shapePage=new Control(this.controlTabs),selectionPage=new Control(this.controlTabs),combinePage=new Control(this.controlTabs),outputPage=new Control(this.controlTabs);
   function form(page){page.sizer=new VerticalSizer;page.sizer.margin=10;page.sizer.spacing=8;return page.sizer;}
   function row(page,controls){var row=new HorizontalSizer;row.spacing=6;controls.forEach(function(c){if(typeof c==="string"){var label=new Label(page);label.text=c;row.add(label);}else{c.parent=page;row.add(c,100);}});page.sizer.add(row);}
   function add(page,c){c.parent=page;page.sizer.add(c);}
   function heading(page,text){var label=new Label(page);label.text=text;page.sizer.add(label);}
   form(shapePage);row(shapePage,["Drawing:",this.drawMode]);row(shapePage,[this.fullRegionButton]);row(shapePage,[this.closePolygon,this.undo]);row(shapePage,[this.clear]);heading(shapePage,"Boundary softness (px):");add(shapePage,this.feather);row(shapePage,["Strength (%):",this.strength]);add(shapePage,this.invert);add(shapePage,this.advancedShape);this.advancedBox=new Control(shapePage);form(this.advancedBox);row(this.advancedBox,["Vertex:",this.vertex]);row(this.advancedBox,["X:",this.vertexX,"Y:",this.vertexY]);shapePage.sizer.add(this.advancedBox);this.advancedBox.hide();this.advancedShape.onCheck=function(checked){self.advancedBox.visible=checked;};shapePage.sizer.addStretch();
   form(selectionPage);row(selectionPage,["Color:",this.colorSelection]);row(selectionPage,["Weight:",this.colorMode]);add(selectionPage,this.lightEnabled);heading(selectionPage,"Minimum lightness (L*):");add(selectionPage,this.lightLow);heading(selectionPage,"Maximum lightness (L*):");add(selectionPage,this.lightHigh);heading(selectionPage,"Lightness transition:");add(selectionPage,this.lightSoft);selectionPage.sizer.addStretch();
   form(combinePage);this.baseEnabled.hide();this.otherEnabled.hide();heading(combinePage,"Starting mask (A):");add(combinePage,this.baseView);row(combinePage,["Operation:",this.otherOperation]);heading(combinePage,"Other mask (B):");add(combinePage,this.otherView);add(combinePage,this.refreshViewsButton);add(combinePage,this.advancedAddition);combinePage.sizer.addStretch();
   form(outputPage);add(outputPage,this.finalBlur);add(outputPage,this.finalInvert);heading(outputPage,"New mask name:");add(outputPage,this.outputName);heading(outputPage,"Target image:");add(outputPage,this.targetView);add(outputPage,this.applyMask);add(outputPage,this.applyButton);add(outputPage,this.separate);add(outputPage,this.useSTF);row(outputPage,["Overlay:",this.overlayColor]);add(outputPage,this.opacity);outputPage.sizer.addStretch();
   this.controlTabs.addPage(shapePage,"Shape");this.controlTabs.addPage(selectionPage,"Selection");if(PM_ENABLE_MASK_COMBINATION)this.controlTabs.addPage(combinePage,"Combine");else combinePage.hide();this.controlTabs.addPage(outputPage,"Output");
   this.leftPanel.sizer=new VerticalSizer;this.leftPanel.sizer.spacing=8;this.workMode.parent=this.leftPanel;if(PM_ENABLE_MASK_COMBINATION)this.leftPanel.sizer.add(this.workMode);else this.workMode.hide();this.activeRegionLabel.parent=this.leftPanel;this.leftPanel.sizer.add(this.activeRegionLabel);
   function leftRow(controls){var row=new HorizontalSizer;row.spacing=6;controls.forEach(function(c){c.parent=self.leftPanel;row.add(c,100);});self.leftPanel.sizer.add(row);}
   leftRow([this.regionList]);leftRow([this.regionName]);leftRow([this.addRegionButton,this.deleteRegionButton]);leftRow([this.saveProjectButton,this.loadProjectButton]);this.leftPanel.sizer.add(this.controlTabs,100);
   leftRow([this.fitButton,this.oneButton,this.minusButton,this.plusButton]);leftRow([this.showOnlyActive]);leftRow([this.live]);leftRow([this.preview,this.create]);leftRow([help,cancel]);

   var previewArea=new VerticalSizer;previewArea.spacing=8;previewArea.add(columns,100);previewArea.add(this.zoomLabel);previewArea.add(this.status);previewArea.add(this.progressBar);
   var body=new HorizontalSizer;body.spacing=14;body.add(this.leftPanel);body.add(previewArea,100);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(body,100);this.sizer.add(PM_copyright(this));
   this.regions=[{name:"Region 1",selection:this.selection,feather:this.feather.value,mode:1,invert:false,strength:100}];this.refreshRegions();this.refreshViewLists();this.populateOperations(0);this.setWorkflow();
   this.onClose=function(){return !self.busy;};this.onHide=function(){self.previewTimer.stop();self.refineTimer.stop();self.liveDragging=false;};
   this.setScaledMinSize(1150,760); this.adjustToContents();this.fit(); this.invalidate();
}

moveRegion(delta)
{
   var next=this.activeRegion+delta;if(this.busy || next<0 || next>=this.regions.length)return;
   this.recordEdit();var r=this.regions.splice(this.activeRegion,1)[0];this.regions.splice(next,0,r);this.activeRegion=next;this.loadRegion();
}
refreshRegionIndicator()
{
 var r=this.regions[this.activeRegion];if(!r)return;var title="Editing "+(r.name||("Region "+(this.activeRegion+1)))+" · "+(this.activeRegion+1)+" / "+this.regions.length;
 this.activeRegionLabel.text="<b><font color='#bf40ff'>"+title.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</font></b>";
 this.maskCaption.text=this.showOnlyActive.checked&&!this.baseEnabled.checked?"ACTIVE REGION ONLY · preview, not final output":"Complete output mask · white allows processing";
 this.detailCaption.text=this.baseEnabled.checked?"Existing-mask mode · polygon controls bypassed":title+" · purple = active; cyan = other regions";
 if(!this.regionName.hasFocus)this.regionName.text=r.name||("Region "+(this.activeRegion+1));
}
operationCode(){var i=this.otherOperation.currentItem;return this.operationMap?this.operationMap[i]:i;}
populateOperations(code)
{
 var sync=this.syncing;this.syncing=true;try{this.operationMap=this.advancedAddition.checked?[0,2,3,1]:[0,2,3];this.otherOperation.clear();var names=["Union","Subtract B from A","Intersection","Add (clipped)"];for(var i=0;i<this.operationMap.length;++i)this.otherOperation.addItem(names[i]);this.otherOperation.currentItem=Math.max(0,this.operationMap.indexOf(code));}finally{this.syncing=sync;}
}
setWorkflow()
{
 if(!PM_ENABLE_MASK_COMBINATION)this.workMode.currentItem=0;
 var combine=PM_ENABLE_MASK_COMBINATION && this.workMode.currentItem===1;this.baseEnabled.checked=combine;this.otherEnabled.checked=combine;
 this.controlTabs.enablePage(0,!combine);this.controlTabs.enablePage(1,!combine);if(PM_ENABLE_MASK_COMBINATION)this.controlTabs.enablePage(2,combine);
 if(combine)this.controlTabs.currentPageIndex=2;else if(PM_ENABLE_MASK_COMBINATION&&this.controlTabs.currentPageIndex===2)this.controlTabs.currentPageIndex=0;
 [this.activeRegionLabel,this.regionList,this.regionName,this.addRegionButton,this.deleteRegionButton,this.showOnlyActive].forEach(function(c){c.visible=!combine;});this.invalidate();
}
saveProjectTo(path){if(this.busy)return;var data=PM_projectData(this);PM_validateProject(data);CR_writeUserText(path,JSON.stringify(data,null,2));this.status.text="Project saved. Reference images and output masks are not included.";return data;}
saveProjectFile()
{
 if(this.busy)return;try{var picker=new SaveFileDialog;picker.caption="Save PolyMask project";picker.filters=[["PolyMask project","*.pmp.json"]];picker.initialPath="PolyMask_Project.pmp.json";if(picker.execute())this.saveProjectTo(picker.fileName);}catch(e){new MessageBox(String(e),"Save project",StdIcon_Error,StdButton_Ok).execute();}
}
restoreProject(data,acceptChangedReference)
{
 if(this.busy)throw new Error("Wait for processing to finish.");var regions=PM_validateProject(data),warnings=PM_projectWarnings(data,this.reference),settings=data.settings;
 if(!PM_ENABLE_MASK_COMBINATION && settings.workMode===1)throw new Error("This edition creates masks only. Projects that combine existing masks must be opened in beta 7; that workflow is temporarily hidden in this edition.");
 if(warnings.length&&!acceptChangedReference)throw new Error(warnings.join("\n")+"\nConfirm the changed reference before restoring this project.");
 this.previewTimer.stop();this.refineTimer.stop();var missing=[],self=this;
 function view(id,label){var v=id?View.viewById(id):null;if(!v)v=new View;if(id&&v.isNull)missing.push(label+" is not open: "+id);if(!v.isNull&&(v.image.width!==self.imageWidth||v.image.height!==self.imageHeight))throw new Error(label+" dimensions do not match.");return v;}
 // Resolve and validate saved references before modifying the editor.
 var base=view(settings.maskA,"Mask A"),other=view(settings.maskB,"Mask B"),target=view(settings.target,"Target");
 if(!base.isNull)PM_assertMask(base,this.reference,"Mask A");if(!other.isNull)PM_assertMask(other,this.reference,"Mask B");
 this.syncing=true;try{
 this.regions=regions;this.activeRegion=data.activeRegion;this.history=[];this.workMode.currentItem=settings.workMode;this.baseView.currentView=base;this.otherView.currentView=other;this.targetView.currentView=target;this.advancedAddition.checked=settings.operator===1;this.populateOperations(settings.operator);this.finalBlur.setValue(settings.blur);this.finalInvert.checked=settings.invert;this.drawMode.currentItem=settings.drawMode;this.outputName.text=settings.outputName;this.applyMask.checked=settings.attach;this.live.checked=settings.live;this.useSTF.checked=settings.useSTF;this.overlayColor.currentItem=settings.overlayColor;this.opacity.value=settings.opacity;this.showOnlyActive.checked=false;this.createdMask=null;this.outputRevision=-1;PM_close(this.draftSource);this.draftSource=null;if(this.liveCache){this.liveCache.dispose();this.liveCache=null;}if(this.fullCache){this.fullCache.dispose();this.fullCache=null;}
 }finally{this.syncing=false;}
 this.loadRegion();this.setWorkflow();this.detailBitmap=PM_displayBitmap(this.background,this.useSTF.checked);this.fit();this.status.text="Project loaded."+(warnings.length?" Reference change confirmed.":"")+(missing.length?" Select missing images: "+missing.join("; "):"");return {warnings:warnings,missing:missing};
}
loadProjectFile()
{
 if(this.busy)return;try{var picker=new OpenFileDialog;picker.caption="Load PolyMask project";picker.multipleSelections=false;picker.filters=[["PolyMask project","*.json"]];if(!picker.execute())return;var info=new FileInfo(picker.fileName);if(info.size>2097152)throw new Error("Project file exceeds 2 MB.");var data=JSON.parse(File.readTextFile(picker.fileName));PM_validateProject(data);var warnings=PM_projectWarnings(data,this.reference);if(warnings.length&&new MessageBox(warnings.join("\n")+"\n\nRestore these polygons on the current image? Matching dimensions do not guarantee alignment.","Review project changes",StdIcon_Warning,StdButton_Yes,StdButton_No).execute()!==StdButton_Yes)return;this.restoreProject(data,true);}catch(e){new MessageBox(String(e),"Load project",StdIcon_Error,StdButton_Ok).execute();}
}

pipelineOptions()
{
   return {blur:this.finalBlur.value,invert:this.finalInvert.checked,
      baseMask:PM_ENABLE_MASK_COMBINATION&&this.baseEnabled.checked?this.baseView.currentView:null,operand:PM_ENABLE_MASK_COMBINATION&&this.otherEnabled.checked?this.otherView.currentView:null,operandOperation:this.operationCode()};
}
refreshViewLists()
{
 if(this.busy)return;var self=this,lists=[this.baseView,this.otherView,this.targetView];
 lists.forEach(function(list,index){var selected=list.currentView;list.getMainViews();ImageWindow.windows.forEach(function(w){if(w.isNull)return;var v=w.mainView,im=v.image;var owned=w===self.cachedMask||w===self.draftSource||(self.liveCache&&self.liveCache.owns(w));if(owned||im.width!==self.imageWidth||im.height!==self.imageHeight||im.numberOfChannels!==im.numberOfNominalChannels||(index<2&&im.numberOfNominalChannels!==1))list.remove(v);});if(selected&&!selected.isNull&&selected.image.width===self.imageWidth&&selected.image.height===self.imageHeight&&(index===2||selected.image.numberOfChannels===1)&&(!self.cachedMask||selected.window!==self.cachedMask)&&(!self.draftSource||selected.window!==self.draftSource))list.currentView=selected;});
}
validateTarget()
{
   var target=this.targetView.currentView;PM_assertView(target,"Target image");
   if(target.image.width!==this.imageWidth || target.image.height!==this.imageHeight)throw new Error("Target dimensions must match the reference. Select an image on the same pixel grid.");
   return target;
}
applyToTarget()
{
   if(this.busy)return null;
   try{
      var target=this.validateTarget(),output=this.createdMask;
      if(!output || output.isNull || this.outputRevision!==this.revision){
         var automatic=this.applyMask.checked;this.applyMask.checked=false;
         try{output=this.createOutput();}finally{this.applyMask.checked=automatic;}
      }
      if(!output || output.isNull)return null;
      if(output===target.window)throw new Error("A mask cannot be attached to itself.");
      target.window.setMask(output,false);target.window.maskEnabled=true;target.window.maskVisible=true;
      this.status.text="Applied "+output.mainView.id+" to "+target.id+". Save the mask manually.";return output;
   }catch(e){this.status.text="Error: "+String(e);return null;}
}
draftInputs()
{
   var scale=Math.min(1,640/Math.max(this.imageWidth,this.imageHeight)),work=new PM_Work;
   try{
      if(!this.draftSource || this.draftSource.isNull){
         this.draftSource=PM_clone(this.reference,work,"DraftSource");
         if(scale<1){this.draftSource.mainView.beginProcess();try{this.draftSource.mainView.image.resample(scale);}finally{this.draftSource.mainView.endProcess();}}
         work.release(this.draftSource);
      }
      var source=this.draftSource.mainView,sx=source.image.width/this.imageWidth,sy=source.image.height/this.imageHeight;
      var regions=this.regions.map(function(r){var c=PM_copyRegion(r);c.selection=new PM_PolygonSelection(source.image.width,source.image.height);c.selection.points=r.selection.points.map(function(p){return{x:p.x*sx,y:p.y*sy};});c.selection.closed=true;c.feather=r.feather*Math.sqrt(sx*sy);return c;});
      var options=this.pipelineOptions();options.draftGeometry=true;options.blur*=Math.sqrt(sx*sy);
      if(options.baseMask){
         PM_assertMask(options.baseMask,this.reference,"Base mask A");
         var base=PM_clone(options.baseMask,work,"DraftBase");if(scale<1){base.mainView.beginProcess();try{base.mainView.image.resample(scale);}finally{base.mainView.endProcess();}}options.baseMask=base.mainView;
      }
      if(options.operand){
         var original=options.operand;PM_assertView(original,"Other mask");
         if(original.image.width!==this.imageWidth || original.image.height!==this.imageHeight || original.image.numberOfNominalChannels!==1)throw new Error("Other mask must be grayscale and match the reference dimensions.");
         var other=PM_clone(original,work,"DraftOperand");if(scale<1){other.mainView.beginProcess();try{other.mainView.image.resample(scale);}finally{other.mainView.endProcess();}}options.operand=other.mainView;
      }
      return {reference:source,regions:regions,options:options,work:work};
   }catch(e){work.dispose();throw e;}
}
saveRegion()
{
   if(!this.regions.length)return;
   var r=this.regions[this.activeRegion];r.selection=this.selection;r.feather=this.feather.value;r.mode=1;r.invert=this.invert.checked;r.strength=this.strength.value;r.operation=this.operation.currentItem;r.color=this.colorSelection.currentItem;r.colorMode=this.colorMode.currentItem;r.lightEnabled=this.lightEnabled.checked;r.lightLow=this.lightLow.value;r.lightHigh=this.lightHigh.value;r.lightSoft=this.lightSoft.value;
}
refreshRegions()
{
   this.syncing=true;try{this.regionList.clear();for(var i=0;i<this.regions.length;++i)this.regionList.addItem((i===this.activeRegion?"▶ ":"")+(this.regions[i].name||("Region "+(i+1)))+" · "+(this.regions[i].selection.closed?"closed":"drawing"));this.regionList.currentItem=this.activeRegion;this.operation.enabled=this.activeRegion>0;this.moveUp.enabled=this.activeRegion>0;this.moveDown.enabled=this.activeRegion<this.regions.length-1;}finally{this.syncing=false;}
}
loadRegion()
{
   var r=this.regions[this.activeRegion];this.syncing=true;
   try{this.selection=r.selection;this.feather.value=r.feather;this.mode.currentItem=1;this.invert.checked=r.invert;this.strength.value=r.strength;this.operation.currentItem=r.operation||0;this.colorSelection.currentItem=r.color||0;this.colorMode.currentItem=r.colorMode||0;this.lightEnabled.checked=!!r.lightEnabled;this.lightLow.value=r.lightLow===undefined?0:r.lightLow;this.lightHigh.value=r.lightHigh===undefined?100:r.lightHigh;this.lightSoft.value=r.lightSoft||0;this.selected=-1;}finally{this.syncing=false;}
   this.regionName.text=r.name||("Region "+(this.activeRegion+1));this.refreshRegions();this.invalidate();
}
switchRegion(index)
{
   if(index<0 || index>=this.regions.length)return;
   this.cancelDrags();this.saveRegion();this.activeRegion=index;this.loadRegion();
}
addRegion()
{
   if(this.busy)return;
   if(this.regions.length>=32){this.status.text="Up to 32 regions are supported.";return;}
   this.saveRegion();this.recordEdit();this.regions.push({name:"Region "+(this.regions.length+1),selection:new PM_PolygonSelection(this.imageWidth,this.imageHeight),feather:16,mode:1,invert:false,strength:100});this.activeRegion=this.regions.length-1;this.loadRegion();
}
deleteRegion()
{
   if(this.busy)return;this.saveRegion();this.recordEdit();this.regions.splice(this.activeRegion,1);
   if(!this.regions.length)this.regions.push({name:"Region "+(this.regions.length+1),selection:new PM_PolygonSelection(this.imageWidth,this.imageHeight),feather:16,mode:1,invert:false,strength:100});
   this.activeRegion=Math.min(this.activeRegion,this.regions.length-1);this.loadRegion();
}
allValid(forceComplete)
{
   try{if(this.baseEnabled.checked){PM_assertMask(this.baseView.currentView,this.reference,"Base mask A");if(this.otherEnabled.checked)PM_assertMask(this.otherView.currentView,this.reference,"Mask B");return true;}this.saveRegion();var reference=this.reference;(this.showOnlyActive.checked&&!forceComplete?[this.regions[this.activeRegion]]:this.regions).forEach(function(r,i){try{r.selection.polygon();PM_lightExpression(reference,r);PM_colorExpression(reference,r.color||0,r.colorMode||0);}catch(e){throw new Error((r.name||("Region "+(i+1)))+": "+String(e));}});return this.regions.length>0;}catch(e){this.validationError=String(e);return false;}
}
createSeparate()
{
   if(this.busy || this.baseEnabled.checked || !this.allValid(true))return;
   var work=new PM_Work,outputs=[];this.busy=true;
   try{
      var base=this.outputName.text.trim();PM_validId(base);
      for(var i=0;i<this.regions.length;++i){
         var r=this.regions[i],mask=work.own(PM_makeRegions(this.reference,[r],null,{blur:this.finalBlur.value,invert:this.finalInvert.checked}));
         mask.mainView.id=PM_availableId(base+"_Region_"+(i+1));
         if(this.reference.window.hasAstrometricSolution)mask.copyAstrometricSolution(this.reference.window);
         outputs.push(mask);
      }
      outputs.forEach(function(w){w.show();work.release(w);});this.createdMasks=this.createdMasks.concat(outputs);
      this.status.text="Created "+outputs.length+" separate masks. Attach each mask to apply different processes; save manually.";
   }catch(e){this.status.text="Error: "+String(e);}finally{work.dispose();this.busy=false;console.hide();}
}

viewport()
{
   return {width:Math.min(this.detailPane.width,this.maskPane.width),height:Math.min(this.detailPane.height,this.maskPane.height)};
}
cancelDrags()
{
   if(this.detailPane){this.detailPane.drag=null;this.detailPane.panDrag=null;this.detailPane.stroke=null;}
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
      this.selected=n?PM_clamp(this.selected,0,n-1):-1;
      this.vertex.maxValue=Math.max(1,n); this.vertex.value=this.selected+1 || 1;
      this.vertex.enabled=this.vertexX.enabled=this.vertexY.enabled=n>0 && !this.busy;
      this.vertexX.value=n?points[this.selected].x:0; this.vertexY.value=n?points[this.selected].y:0;
   }
   finally { this.syncing=false; }
}
isAdjusting()
{
   return this.liveDragging || !!(this.detailPane&&(this.detailPane.drag!==null||this.detailPane.panDrag||this.detailPane.stroke)) || !!(this.maskPane&&this.maskPane.panDrag);
}
previewOutOfDate()
{
   // Warn only when the user must explicitly refresh; automatic selection
   // updates may briefly lag without requiring a manual action.
   return this.cachedRevision!==this.revision && (!!this.geometryDirty || !this.live.checked);
}
geometryKey()
{
   return JSON.stringify(this.regions.map(function(r){return [r.selection.points,r.selection.closed,r.feather,!!r.invert];}));
}
toggleFinalInversion()
{
   if(this.disposed)return;
   if(this.busy){this.invalidate();return;}
   this.previewTimer.stop();this.refineTimer.stop();
   if(this.cachedMask&&!this.cachedMask.isNull&&this.cachedRevision===this.revision&&!this.geometryDirty){
      var work=new PM_Work;
      try{
         var inverse=PM_math("1-"+this.cachedMask.mainView.id,this.cachedMask.mainView,work,"FastInverse",false);
         PM_close(this.cachedMask);this.cachedMask=inverse;work.release(inverse);
         if(this.maskBitmap)this.maskBitmap.invert();
         if(this.overlayBitmap)this.overlayBitmap.xor(0xff000000);
         ++this.revision;this.cachedRevision=this.revision;this.cachedInvert=this.finalInvert.checked;
         this.status.text="Final inversion updated from the current preview.";this.repaintBoth();
      }catch(e){this.status.text="Error: "+String(e);}finally{work.dispose();}
   }else this.invalidate();
}
queueRefinement()
{
   // Kept for release/slider callbacks. Full refinement is explicit, never queued.
   if(this.refineTimer)this.refineTimer.stop();
}

invalidate()
{
   if(this.syncing || this.disposed || !this.separate)return;
   if(this.refineTimer)this.refineTimer.stop();
   if(this.busy){++this.revision;this.pendingLive=true;return;}
   this.saveRegion();var key=this.geometryKey();if(this.previewGeometryKey!==key)this.geometryDirty=true;
   if(this.previewTimer&&!this.liveDragging)this.previewTimer.stop();++this.revision;
   if(this.progressBar)this.progressBar.setValue(0);this.syncCoordinates();
   this.refreshRegions();this.refreshRegionIndicator();
   var valid=false;
   if (!this.selection.closed)
      this.status.text=this.selection.points.length+" vertices · add points and close the polygon to continue.";
   else
   {
      try { this.selection.polygon(); valid=true; this.status.text="Contour closed. Click Update Preview to refresh the mask."; }
      catch (e) { this.status.text=String(e); }
   }
   valid=this.allValid();
   if(this.selection.closed && !valid)this.status.text=this.validationError||"Close every region before preview or output.";
   this.preview.enabled=valid && !this.busy;this.create.enabled=this.allValid(true) && !this.busy;this.separate.enabled=this.allValid(true) && !this.busy && !this.baseEnabled.checked;
   this.baseView.enabled=this.baseEnabled.checked && !this.busy;
   if(this.baseEnabled.checked && valid)this.status.text="Existing mask A selected. Polygons and per-region filters are bypassed; operation uses A and B.";
   this.closePolygon.enabled=!this.selection.closed && this.selection.points.length>=3 && !this.busy;
   this.undo.enabled=this.history.length>0 && !this.busy;this.clear.enabled=this.selection.points.length>0 && !this.busy;
   this.lightLow.enabled=this.lightHigh.enabled=this.lightSoft.enabled=this.lightEnabled.checked && !this.busy && !this.baseEnabled.checked;
   var polygonMode=!this.baseEnabled.checked && !this.busy;[this.regionList,this.addRegionButton,this.deleteRegionButton,this.fullRegionButton,this.regionName,this.drawMode,this.feather,this.strength,this.colorSelection,this.colorMode,this.lightEnabled,this.invert,this.mode].forEach(function(c){c.enabled=polygonMode;});
   this.colorMode.enabled=polygonMode && this.colorSelection.currentItem>0;
   this.otherView.enabled=this.otherOperation.enabled=this.otherEnabled.checked && !this.busy;
   this.operation.enabled=this.activeRegion>0 && !this.busy;
   this.applyButton.enabled=this.allValid(true) && !this.busy;
   this.showOnlyActive.enabled=!this.baseEnabled.checked && !this.busy;
   this.detailPane.update(); this.maskPane.update();
   if(this.geometryDirty){this.previewTimer.stop();if(valid)this.status.text="Preview out of date · click Update Preview. The displayed mask is the previous result.";this.maskCaption.text="PREVIEW OUT OF DATE · click Update Preview";}
   else if(valid && this.live.checked && !this.busy&&!this.previewTimer.isRunning)this.previewTimer.start();
   if(valid&&!this.isAdjusting())this.queueRefinement();
}
recordEdit()
{
   this.saveRegion();this.history.push({regions:this.regions.map(PM_copyRegion),active:this.activeRegion,selected:this.selected});if(this.history.length>50)this.history.shift();
}
undoEdit()
{
   if(this.busy || !this.history.length)return;
   var previous=this.history.pop();this.regions=previous.regions.map(PM_copyRegion);this.activeRegion=previous.active;this.loadRegion();this.selected=previous.selected;this.syncCoordinates();
}
clearContour()
{
   if(this.busy || !this.selection.points.length)return;
   this.recordEdit();this.selection=new PM_PolygonSelection(this.imageWidth,this.imageHeight);this.selected=-1;this.invalidate();
}
deleteVertex(index)
{
   if(this.busy || index<0 || index>=this.selection.points.length)return;
   this.recordEdit();this.selection.points.splice(index,1);if(this.selection.points.length<3)this.selection.closed=false;
   this.selected=Math.min(index,this.selection.points.length-1);this.invalidate();
}
buildContextMenu(index)
{
   var self=this,menu=new Menu(this);
   menu.deleteVertex=new MenuItem("Delete vertex");menu.deleteVertex.enabled=index>=0;menu.deleteVertex.onTrigger=function(){self.deleteVertex(index);};menu.addItem(menu.deleteVertex);
   menu.closePolygon=new MenuItem("Close polygon");menu.closePolygon.enabled=!this.selection.closed && this.selection.points.length>=3;menu.closePolygon.onTrigger=function(){self.finishPolygon();};menu.addItem(menu.closePolygon);
   menu.clearContour=new MenuItem("Clear contour");menu.clearContour.enabled=this.selection.points.length>0;menu.clearContour.onTrigger=function(){self.clearContour();};menu.addItem(menu.clearContour);return menu;
}
finishPolygon()
{
   if(this.busy || this.selection.closed)return;
   try{PM_polygon(this.selection.points,this.imageWidth,this.imageHeight);this.recordEdit();this.selection.close();this.invalidate();}
   catch(e){this.status.text=String(e);}
}
rebuildOverlay()
{
   this.overlayBitmap=null;if(!this.maskBitmap)return;
   var colors=[0xffbf40ff,0xff20dfdf,0xffff4040];
   var bitmap=new Bitmap(this.maskBitmap.width,this.maskBitmap.height),target=new BitmapIterator(bitmap).data,source=new BitmapIterator(this.maskBitmap).data,color=colors[this.overlayColor.currentItem]&0xffffff;
   // Copy grayscale intensity into alpha explicitly. Native setAlpha(Bitmap)
   // copies the source alpha, which is opaque in rendered grayscale masks.
   for(var i=0;i<target.length;++i)target[i]=((source[i]&255)<<24)|color;
   this.overlayBitmap=bitmap;
}
calculate(draft,forceComplete)
{
   if(this.busy || this.disposed)return false;this.previewTimer.stop();this.refineTimer.stop();this.refinePending=false;this.busy=true;this.preview.enabled=this.create.enabled=this.applyButton.enabled=false;
   this.status.text=draft?"Updating live preview…":"Computing the full-resolution final mask…";if(!draft){this.status.repaint();this.progressBar.setValue(0);}
   var candidate=null,inputs=null,startedRevision=this.revision;this.pendingLive=false;
   try
   {
      this.saveRegion();var self=this,reference=this.reference,regions=this.regions,options=this.pipelineOptions();
      if(draft){inputs=this.draftInputs();reference=inputs.reference;regions=inputs.regions;options=inputs.options;}
      var isolated=this.showOnlyActive.checked&&!this.baseEnabled.checked&&!forceComplete;
      if(isolated){regions=[regions[this.activeRegion]];options.operand=null;}
      if(draft&&!options.baseMask&&!options.operand){if(!this.liveCache||this.liveCache.reference.id!==reference.id){if(this.liveCache)this.liveCache.dispose();this.liveCache=new PM_LiveCache(reference);}candidate=this.liveCache.calculate(regions,isolated?0:this.activeRegion,options,function(p,text){self.status.text=text;self.status.repaint();self.progressBar.setValue(p);CoreApplication.processEvents(true);});}
      else {if(!options.baseMask&&!options.operand){if(!this.fullCache)this.fullCache=new PM_RegionCache(this.reference);options.regionCache=this.fullCache;}candidate=PM_makeRegions(reference,regions,function(p,text){self.status.text=text;self.status.repaint();self.progressBar.setValue(p);},options);}
      if(startedRevision!==this.revision){this.status.text="Preview out of date · click Update Preview.";return false;}
      var bitmap=candidate.mainView.image.render();
      // Keep draft display and overlay bounded; do not expand to full source size.
      PM_close(this.cachedMask);this.cachedMask=candidate;candidate=null;this.cachedRevision=startedRevision;this.cachedScope=isolated?"active":"complete";this.maskCaption.text=isolated?"ACTIVE REGION ONLY · preview, not final output":"Complete output mask · white allows processing";this.previewIsDraft=!!draft;this.previewGeometryKey=this.geometryKey();this.geometryDirty=false;this.cachedInvert=options.invert;this.maskBitmap=bitmap;this.rebuildOverlay();
      this.progressBar.setValue(100);this.status.text=isolated?"ACTIVE REGION ONLY — preview. Output will include all regions.":draft?"Quick selection preview (up to 640 px). Update Preview or Create Mask computes full resolution.":"Refined full-resolution preview ready. Create Mask uses these exact pixels.";return true;
   }
   catch(e){this.status.text="Error: "+String(e);return false;}
   finally{if(inputs)inputs.work.dispose();PM_close(candidate);this.busy=false;this.preview.enabled=this.allValid();this.create.enabled=this.applyButton.enabled=this.allValid(true);this.separate.enabled=this.allValid(true) && !this.baseEnabled.checked;this.repaintBoth();console.hide();if(this.pendingLive&&!this.disposed){this.pendingLive=false;this.invalidate();}else if(!this.disposed&&(this.refinePending||(draft&&!this.isAdjusting())))this.queueRefinement();}
}
createOutput()
{
   if(this.busy)return null;
   var output=null;
   try
   {
      if(!this.allValid(true))throw new Error(this.validationError||"Complete every region before creating the final mask.");
      var id=this.outputName.text.trim();PM_validId(id);if(!ImageWindow.windowById(id).isNull)throw new Error("An image already exists with that name.");
      if(this.applyMask.checked)this.validateTarget();
      if((!this.cachedMask || this.previewIsDraft || this.cachedScope!=="complete" || this.cachedRevision!==this.revision) && !this.calculate(false,true))return null;
      var work=new PM_Work;
      try{output=PM_clone(this.cachedMask.mainView,work,"Output");output.mainView.id=id;if(this.reference.window.hasAstrometricSolution)output.copyAstrometricSolution(this.reference.window);work.release(output);}finally{work.dispose();}
      if(this.applyMask.checked){var target=this.validateTarget();if(output===target.window)throw new Error("A mask cannot be attached to itself.");target.window.setMask(output,false);target.window.maskEnabled=true;target.window.maskVisible=true;}
      output.show();this.createdMasks.push(output);this.createdMask=output;this.outputRevision=this.revision;this.status.text="Created "+id+". Save the mask manually. You can create another mask or go Back.";
      this.outputName.text=PM_availableId(id);return output;
   }catch(e){PM_close(output);this.status.text="Error: "+String(e);return null;}
}
dispose()
{
   this.disposed=true;if(this.previewTimer)this.previewTimer.stop();if(this.refineTimer)this.refineTimer.stop();PM_close(this.draftSource);this.draftSource=null;if(this.liveCache){this.liveCache.dispose();this.liveCache=null;}if(this.fullCache){this.fullCache.dispose();this.fullCache=null;}
   PM_close(this.cachedMask);this.cachedMask=null;this.maskBitmap=null;this.overlayBitmap=null;
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
         if (!bitmap){if(isMask&&self.previewOutOfDate())PM_drawPendingBadge(g,this.width,this.height);return;}
         var geo=geometry(),s=geo.scale,ox=geo.x,oy=geo.y;
         var x0=Math.max(0,Math.floor(-ox/s)),y0=Math.max(0,Math.floor(-oy/s));
         var x1=Math.min(self.imageWidth,Math.ceil((this.width-ox)/s)),y1=Math.min(self.imageHeight,Math.ceil((this.height-oy)/s));
         var bx=bitmap.width/self.imageWidth,by=bitmap.height/self.imageHeight;
         if(x1>x0 && y1>y0)
         {
            g.smoothInterpolation=s<1;
            g.drawScaledBitmapRect(ox+x0*s,oy+y0*s,ox+x1*s,oy+y1*s,bitmap,Math.floor(x0*bx),Math.floor(y0*by),Math.ceil(x1*bx),Math.ceil(y1*by));
         }
         if(!isMask && self.overlayBitmap)
         {
            g.opacity=self.opacity.value/100;
            if(x1>x0 && y1>y0)g.drawScaledBitmapRect(ox+x0*s,oy+y0*s,ox+x1*s,oy+y1*s,self.overlayBitmap,Math.floor(x0*self.overlayBitmap.width/self.imageWidth),Math.floor(y0*self.overlayBitmap.height/self.imageHeight),Math.ceil(x1*self.overlayBitmap.width/self.imageWidth),Math.ceil(y1*self.overlayBitmap.height/self.imageHeight));
            g.opacity=1;
         }
         if (!isMask && !self.baseEnabled.checked)
         {
            if(self.guide.length>=3)
            {
               g.pen=new Pen(0xffbf40ff,4.5);
               for(var k=0;k<self.guide.length;++k){var a=self.guide[k],b=self.guide[(k+1)%self.guide.length];g.drawLine(ox+a.x*s,oy+a.y*s,ox+b.x*s,oy+b.y*s);}
            }
            self.regions.forEach(function(region,index){
               if(index===self.activeRegion)return;var pts=region.selection.points;g.pen=new Pen(0xff20dfdf,1);
               for(var k=1;k<pts.length;++k)g.drawLine(ox+pts[k-1].x*s,oy+pts[k-1].y*s,ox+pts[k].x*s,oy+pts[k].y*s);
               if(region.selection.closed && pts.length>2)g.drawLine(ox+pts[pts.length-1].x*s,oy+pts[pts.length-1].y*s,ox+pts[0].x*s,oy+pts[0].y*s);
            });
            if(pane.stroke){g.pen=new Pen(0xffbf40ff,2);for(var si=1;si<pane.stroke.length;++si){var a=pane.stroke[si-1],b=pane.stroke[si];g.drawLine(ox+a.x*s,oy+a.y*s,ox+b.x*s,oy+b.y*s);}}
            self.regions.forEach(function(region,index){var pts=region.selection.points;if(!pts.length)return;var x=0,y=0;pts.forEach(function(p){x+=p.x;y+=p.y;});x=ox+x/pts.length*s;y=oy+y/pts.length*s;var name=(index+1)+": "+(region.name||("Region "+(index+1)))+(index===self.activeRegion?" [EDITING]":"");g.font=new Font("Helvetica",12,"px");g.pen=new Pen(0xff000000,3);g.drawText(x+1,y+1,name);g.pen=new Pen(index===self.activeRegion?0xfff0b5ff:0xff65e4ed,1);g.drawText(x,y,name);});
            var points=self.selection.points;
            g.pen=new Pen(0xffbf40ff,3);
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
      finally { if(isMask&&bitmap&&self.previewOutOfDate())PM_drawPendingBadge(g,this.width,this.height);g.end(); }
   };
   function point(x,y)
   {
      var geo=geometry();return {x:PM_clamp((x-geo.x)/geo.scale,0,self.imageWidth),y:PM_clamp((y-geo.y)/geo.scale,0,self.imageHeight)};
   }
   function appendStroke(x,y){var p=point(x,y),last=pane.stroke[pane.stroke.length-1];if(!last||Math.hypot(p.x-last.x,p.y-last.y)*self.camera.scale>=2){pane.stroke.push(p);if(pane.stroke.length>2048)pane.stroke=pane.stroke.filter(function(p,i){return i%2===0;});}pane.update();}
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
      if(!pane.dragRecorded){self.recordEdit();pane.dragRecorded=true;}
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
      if(isMask || self.baseEnabled.checked)return;
      var index=nearest(x,y);
      if(index<0){for(var ri=self.regions.length-1;ri>=0;--ri){if(ri===self.activeRegion)continue;var region=self.regions[ri];if(region.selection.closed && PM_edgeAt(region.selection.points,x,y,geometry(),self.imageWidth,self.imageHeight)){self.switchRegion(ri);return;}}}
      if(self.drawMode.currentItem===1 && index<0){var geo=geometry();if(x<geo.x||y<geo.y||x>geo.x+self.imageWidth*geo.scale||y>geo.y+self.imageHeight*geo.scale)return;self.previewTimer.stop();self.refineTimer.stop();this.stroke=[];appendStroke(x,y);return;}
      if(index===0 && !self.selection.closed && self.selection.points.length>=3){self.finishPolygon();return;}
      if(index>=0){self.selected=index;this.drag=index;this.dragRecorded=false;self.syncCoordinates();this.update();return;}
      if(self.selection.closed)
      {
         var candidate=PM_edgeAt(self.selection.points,x,y,geometry(),self.imageWidth,self.imageHeight);
         if(candidate && self.selection.points.length<64){self.recordEdit();self.selection.points.splice(candidate.index+1,0,self.selection.point(candidate.point.x,candidate.point.y));self.selected=candidate.index+1;self.invalidate();}
         if(!candidate){for(var ri=self.regions.length-1;ri>=0;--ri){if(ri===self.activeRegion)continue;var region=self.regions[ri];if(region.selection.closed && PM_edgeAt(region.selection.points,x,y,geometry(),self.imageWidth,self.imageHeight)){self.switchRegion(ri);break;}}}
         return;
      }
      var geo=geometry();if(x<geo.x || y<geo.y || x>geo.x+self.imageWidth*geo.scale || y>geo.y+self.imageHeight*geo.scale)return;
      var p=point(x,y);
      try{if(self.selection.points.length>=64)throw new Error("Up to 64 vertices are supported.");self.recordEdit();self.selection.add(p.x,p.y);self.selected=self.selection.points.length-1;self.invalidate();}
      catch(e){self.status.text=String(e);}
   };
   pane.contextMenuEvents=!isMask;
   pane.onContextMenu=function(globalX,globalY,x,y)
   {
      if(self.busy || isMask)return;
      var index=nearest(x,y);if(index>=0){self.selected=index;self.syncCoordinates();self.repaintBoth();}
      self.buildContextMenu(index).execute(globalX,globalY);return true;
   };
   function panTo(x,y)
   {
      var v=self.viewport();self.camera.pan(x-pane.panDrag.x,y-pane.panDrag.y,v.width,v.height);
      pane.panDrag={x:x,y:y};self.repaintBoth();
   }
   pane.onMouseMove=function(x,y,buttons)
   {
      if(self.busy)return;
      if(!(buttons & MouseButton.Left)){var ended=this.drag!==null;this.drag=null;this.panDrag=null;if(ended)self.queueRefinement();return;}
      if(this.panDrag){panTo(x,y);return;}
      if(this.stroke){appendStroke(x,y);return;}
      if(!isMask && this.drag!==null)moveTo(this.drag,x,y);
   };
   pane.onMouseRelease=function(x,y,button)
   {
      if(button!==MouseButton.Left)return;
      if(this.stroke){var raw=this.stroke;appendStroke(x,y);this.stroke=null;try{var points=PM_simplifyStroke(raw,1.5/self.camera.scale);PM_polygon(points,self.imageWidth,self.imageHeight);self.recordEdit();self.selection=new PM_PolygonSelection(self.imageWidth,self.imageHeight);self.selection.points=points;self.selection.close();self.selected=-1;self.invalidate();}catch(e){self.status.text="Stroke not accepted: "+String(e);this.update();}return;}
      if(this.panDrag){if(!self.busy)panTo(x,y);this.panDrag=null;return;}
      if(!isMask && this.drag!==null){if(!self.busy)moveTo(this.drag,x,y);this.drag=null;self.queueRefinement();}
   };
   pane.onResize=function()
   {
      if(!self.detailPane || !self.maskPane)return;
      if(self.camera.fitted)self.fit();else{self.limitCamera();self.repaintBoth();}
   };
   return pane;
}
}


var PM_HELP = "POLYMASK ADVANCED 0.3.0-beta.17\nCopyright Carlos Rincón 2026\nRequires PixInsight 1.9.6. Local beta.\n\nSelect an already-open working image in the dropdown and choose Open editor.\nThis edition focuses on creating masks. The left sidebar has Shape, Selection\nand Output tabs. Both previews remain on the right. Combining existing masks is\ntemporarily hidden; its processing code is retained for future development.\nThe polygons you draw are still united into one mask.\nFit/100%/zoom and output actions remain in the sidebar.\nNormally use a stretched RGB or monochrome image. No astrometry is needed.\n\nDRAWING\nFreehand (default): hold the left mouse button and trace an area, then release\nto close it. The trace is simplified to at most 64 editable vertices. Crossing\ncontours are rejected and the previous polygon is preserved. Drawing away from\nvertices replaces the selected polygon; Undo restores it. Drag a vertex to refine.\nBy points: click to place vertices, then click the first point or Close polygon.\nClick a closed edge to insert a vertex; right click for contour actions.\nInvert region area is visible in Shape and selects the area outside the polygon\nbefore color and lightness filtering. Numeric vertex coordinates are under\nAdvanced region controls. Invert final mask appears only in Output and\ncomplements the entire filtered and blurred result, including excluded areas.\nAdd region creates another polygon. Name the selected region using the field\nbelow the dropdown. The sidebar and image caption show which region is being\nedited. Purple thick outlines and [EDITING] identify the active region; other\nregions are cyan. Click another region border or select it in the dropdown,\nincluding while Freehand mode is active. Region filters are kept independently.\nWheel zooms; Shift-drag pans.\n\nLIGHTNESS: Long Min and Max sliders choose a CIE L* interval (0–100); endpoints\ncannot cross. Each has a second Fine slider with 0.1 L* steps, ±1 L* around the\ncoarse value. Moving the coarse slider resets its fine adjustment; saved values\nretain one decimal place when switching regions. Transition softens the interval boundaries. Feather sigma softens\npolygon edges. Strength adjusts mask weight. STF affects display only.\n\nFINAL: Final blur is applied after region/color/lightness combination; final\ninversion follows blur. Geometry edits do not calculate the mask automatically.\nWhile drawing or moving vertices, only the contour changes. The previous mask\nremains visible with PREVIEW OUT OF DATE. Click Update Preview when ready to\ncompute the current full-resolution preview. No full refinement is queued.\nAutomatic selection preview updates color, lightness and final blur at reduced\nresolution only when the polygon preview is current. It never confirms edited\ngeometry. Disable it to update all changes manually with Update Preview.\nFinal inversion reuses a current mask and updates display bitmaps natively;\nif other changes are pending, update the preview first.\nCreate Mask always creates a full-resolution grayscale output; save it manually.\nApply Mask attaches a fresh output to the selected target image; it must share\nthe dimensions and registered grid. It replaces that target's mask attachment.\nCreate Separate Masks creates one output per polygon in drawing mode only.\n\nCOLOR MASKS\nSelect Red, Green, Blue, Cyan, Magenta or Yellow. If the contour is empty,\nselecting a color automatically creates a full-image region. Existing polygons\nare retained. Color selection is restricted to their area, or the outside area\nwhen Invert region area is enabled in Shape. Weight selects the author's\nE1 mode: Chrominance (CIEc, automatically normalized) or Lightness (CIEL, unchanged). Chrominance normalization preserves zero, uses the 99.5th percentile of positive sampled values, caps gain at 250 and does not boost a percentile below 0.001. It cannot distinguish genuine weak signal from noise; review the result. Color settings are kept\nindependently for each polygon. Full image region creates the color mask over the\nwhole working RGB image; other polygons restrict it to their selected area (inside or inverted outside).\nThe color mask is multiplied by polygon strength and optional L* selection.\nFormula constants and mtf arguments are preserved as supplied. E2 was declared\nbut unused in those equations; Mask strength (%) controls the region's intensity.\nColor masks require RGB input and produce grayscale outputs. Save created color masks manually in PixInsight.\nInvert final mask complements the completed combined result after final blur,\nincluding color and lightness restrictions: M becomes 1-M. Preview includes it.\n\nINSTALL: Keep icons/ and manuals/ beside PolyMask_EN.js. Use Script > Feature\nScripts > Add, select this folder, then Crinconlab > PolyMask Advanced (beta).\nAlternatively use Script > Execute Script File and choose PolyMask_EN.js.\nBack returns to image selection; created outputs remain open.\n\nPREVIEW SCOPE\nPreview active region only isolates the selected region for display. Other\nregion contours remain visible so you can identify and switch them. The right\ncaption explicitly marks ACTIVE REGION ONLY. Both draft and full-size preview\ncan be isolated. A complete final output requires all regions to be closed.\nCreate Mask and Apply Mask always calculate the complete result, even if the\nlast preview was isolated. After creation the right caption says Complete output\nmask; a subsequent edit resumes the selected preview scope.\n\nBOUNDARY SOFTNESS AND FINAL MASK BLUR\nBoundary softness smooths each polygon edge before regions are combined.\nFinal mask blur is in Output and is applied LAST to the combined polygon, color\nand lightness selections. It can spread gray into nearby excluded areas. Gray\nmeans partial processing, not an untouched or strictly excluded area. The lightness\ntransition also extends outside Min/Max, as before; it is not a hard exclusion.\nUse zero final blur to inspect the selection before spatial smoothing. Final inversion is applied last.\n\nEXISTING-MASK COMBINATION — TEMPORARILY HIDDEN\nThis local edition does not expose operations between existing masks. Projects\nsaved in Create mode remain compatible. A beta-7 project saved in Combine mode\nis rejected with an explanatory message, rather than loaded with altered meaning.\nUse beta 7 to continue that combination project.\n\nSAVE AND LOAD PROJECTS\nSave project writes a local .pmp.json file containing region names, contours,\nper-region selections and strengths, global blur/inversion and open-view\nidentifiers. Unfinished contours can be saved. It does not include image files,\noutput masks or undo history. Open the reference image in PixInsight before Load\nproject. Missing mask/target images are reported; the script does not open files\nautomatically or substitute another image.\n\nDimensions or channel-count differences prevent restoration: select the original\nreference. Different image names/paths or changed reference pixel samples require\nyour confirmation. Sparse pixel samples help detect changes; they are not proof\nthat images are registered or identical. No automatic scaling is performed.\nInvalid project data is rejected before replacing the current editor state.\nProject writes cannot target PixInsight installation/configuration directories.\n\nINSTALLATION NOTE\nKeep ProtectedPaths.jsh and PolyMaskProjects.jsh beside PolyMask_EN.js, together\nwith icons/ and manuals/. This is still a local beta and is not published.\n\nBETA 11 — LIVE PREVIEW, CHROMINANCE NORMALIZATION AND FINAL BLUR\nLive calculations use cached reduced geometry, color maps and lightness.\nUnchanged regions are reused. Only the latest requested settings are pending.\nFull-size preview and output are still calculated at original resolution.\nBoth-sides feather remains unchanged.\n\nBETA 10 — BOTH-SIDES FEATHER ONLY\nBoundary softness is always a symmetric Gaussian blur extending inside and\noutside each polygon. There is no direction selector. Zero softness keeps\nhard edges. Draft preview, full preview and output use this same rule.\nFinal mask blur remains a separate optional blur of the complete output.\nAn old project using inward feathering prompts for confirmation before its\nregions are converted to both-sides feathering. Review the changed boundaries.\n\nBETA 14 — FULL-RESOLUTION REFINEMENT CACHE\nUnchanged region geometry, color selections and filtered regions are reused\nbetween refinements. Changing lightness reuses the polygon and color map.\nThe first refinement and changed geometry still require native computation.\nFinal blur, inversion and output resolution are unchanged.\nThe cache retains up to 384 MiB of image samples, or one current mask when\nthat mask alone is larger. This is not a limit on total application memory.\nLeast-recently-used entries are discarded; project reload and editor close\nrelease the cache. Display rendering and overlay preparation still take time.\n\nBETA 15 — EXPLICIT GEOMETRY PREVIEW\nUpdate Preview is visible again. Editing polygons or region boundary softness\nmarks the display as stale and stops automatic preview timers. Selection\nchanges cannot accept pending geometry edits. Create Mask and Apply Mask still\ncompute complete current settings at full resolution, even if preview is stale.\nThe final inversion shortcut reuses the mask; geometry/color/lightness/blur are\nnot recalculated. The signed published beta 14 is unchanged.\n\nPENDING PREVIEW NOTICE\nA small red Preview out of date badge appears in the upper-right corner of\nthe mask panel when manual updating is required: edited geometry, or automatic selection preview\nturned off. Automatic color/lightness/blur updates do not show this warning.\nIt disappears after a successful update. This is display-only and is never\nembedded in the created mask or source image.\n";

function PM_help()
{
   var dialog=new Dialog;dialog.windowTitle="PolyMask · Help";
   var text=new TextBox(dialog);text.readOnly=true;text.text=PM_HELP;text.setScaledMinSize(640,440);
   var save=new PushButton(dialog);save.text="Save manual .txt";save.onClick=function(){try{var picker=new SaveFileDialog;picker.caption="Save PolyMask manual";picker.filters=[["Text file","*.txt"]];picker.initialPath="PolyMask_Manual_EN.txt";if(picker.execute())CR_writeUserText(picker.fileName,PM_HELP);}catch(e){new MessageBox(String(e),"PolyMask",StdIcon_Error,StdButton_Ok).execute();}};
   var close=new PushButton(dialog);close.text="Close";close.onClick=function(){dialog.ok();};
   var row=new HorizontalSizer;row.spacing=8;row.add(save);row.addStretch();row.add(close);
   dialog.sizer=new VerticalSizer;dialog.sizer.margin=12;dialog.sizer.spacing=8;dialog.sizer.add(text,100);dialog.sizer.add(row);dialog.adjustToContents();dialog.execute();
}
class PM_SetupDialog extends Dialog
{
constructor()
{
   super();var self=this;this.windowTitle="Crinconlab PolyMask · v0.3.0-beta.17";
   this.views=new ViewList(this);this.views.getMainViews();this.views.setScaledMinWidth(430);
   var active=ImageWindow.activeWindow;if(active && !active.isNull)this.views.currentView=active.mainView;
   var refresh=new PushButton(this);refresh.text="Refresh";refresh.onClick=function(){var previous=self.views.currentView;self.views.getMainViews();if(previous && !previous.isNull)self.views.currentView=previous;};
   var source=new HorizontalSizer;source.spacing=8;source.add(PM_label(this,"Working image:"));source.add(this.views,100);source.add(refresh);
   var next=new PushButton(this);next.text="Open editor";next.onClick=function(){try{PM_assertView(self.views.currentView,"Reference image");self.selectedView=self.views.currentView;self.ok();}catch(e){new MessageBox(String(e),"Select image",StdIcon_Warning,StdButton_Ok).execute();}};
   var help=new PushButton(this);help.text="Help";help.onClick=PM_help;
   var close=new PushButton(this);close.text="Close";close.onClick=function(){self.cancel();};
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(help);buttons.addStretch();buttons.add(next);buttons.add(close);
   this.sizer=new VerticalSizer;this.sizer.margin=14;this.sizer.spacing=10;
   this.sizer.add(PM_label(this,"Create masks from multiple independent polygon regions on one image. Select an open monochrome or RGB main image. No astrometry or second image is required. For linear images, set a display STF first."));
   this.sizer.add(source);this.sizer.add(PM_label(this,"Draw and edit vertices, preview feathered edges, then create a full-resolution mask. Original image pixels remain unchanged."));this.sizer.add(buttons);this.sizer.add(PM_copyright(this));
   this.setScaledMinWidth(660);this.adjustToContents();
}
}
function PM_main()
{
   console.hide();var setup=new PM_SetupDialog;
   while(setup.execute())
   {
      var editor=null;
      try{editor=new PM_MaskDialog(setup.selectedView,16);editor.execute();}
      catch(e){new MessageBox(String(e),"PolyMask",StdIcon_Error,StdButton_Ok).execute();}
      finally{if(editor)editor.dispose();}
   }
}
#ifndef POLYMASK_LIBRARY
try{PM_main();}catch(e){new MessageBox(String(e),"PolyMask",StdIcon_Error,StdButton_Ok).execute();}
#endif
