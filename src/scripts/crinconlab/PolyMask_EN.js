// Copyright © Carlos Rincón 2026
#feature-id CrinconlabPolyMask : Crinconlab > PolyMask
#feature-icon icons/polymask_orange.svg
#feature-info Interactive polygon masks with editable vertices, synchronized zoom, full-resolution feathering and optional application. Version 0.1.0. Copyright &copy; Carlos Rinc&oacute;n 2026.
#engine v8
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/ButtonCodes.jsh>
CoreApplication.ensureMinimumVersion(1,9,5);
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
   PM_identitySTF(result.mainView);
   return result;
}
function PM_blur(window, sigma, work, tag)
{
   if (sigma === 0) return window;
   var result = PM_clone(window.mainView, work, tag), p = new Convolution;
   p.mode = Convolution.Parametric;
   p.sigma = sigma;
   p.shape = 2;
   p.aspectRatio = 1;
   p.rotationAngle = 0;
   if (!p.executeOn(result.mainView)) throw new Error("Could not smooth " + tag + ".");
   return result;
}
function PM_polygon(vertices,width,height)
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
function PM_polygonMask(reference,vertices,work)
{
   PM_assertView(reference,"Reference image");
   var points=PM_polygon(vertices,reference.image.width,reference.image.height),inside="0";
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
function PM_makeMask(view,vertices,sigma,mode,invert,progress)
{
   PM_assertView(view,"Reference image");sigma=PM_number(sigma,"Feather sigma",0,256);
   var points=PM_polygon(vertices,view.image.width,view.image.height),work=new PM_Work;
   function step(p,text){if(progress)progress(p,text);}
   try
   {
      var canvas=work.own(new ImageWindow(view.image.width,view.image.height,1,32,true,false,PM_unique("Canvas")));
      step(20,"Rasterizing polygon…");var support=PM_polygonMask(canvas.mainView,points,work),mask=support;
      if(sigma>0)
      {
         step(50,"Computing feathered edges…");var blurred=PM_blur(support,sigma,work,"Feather");
         mask=mode===1?PM_math("min(1,max(0,"+blurred.mainView.id+"))",support.mainView,work,"Symmetric",false):PM_math(support.mainView.id+"*min(1,max(0,("+blurred.mainView.id+"-0.5)*2))",support.mainView,work,"Inward",false);
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
   this.windowTitle="Crinconlab PolyMask · v0.1.0 · "+this.background.id;
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
   this.feather=new SpinBox(this); this.feather.minValue=0; this.feather.maxValue=256; this.feather.value=feather===undefined?16:feather;
   this.feather.toolTip="Gaussian sigma in source-image pixels. Zero creates hard edges. Inward keeps the exterior exactly black; Both sides spreads the transition outside and inside.";
   this.feather.onValueUpdated=function() { self.invalidate(); };
   var coordinates=new HorizontalSizer; coordinates.spacing=6;
   coordinates.add(PM_label(this,"Vertex:")); coordinates.add(this.vertex);
   coordinates.add(PM_label(this,"x:")); coordinates.add(this.vertexX);
   coordinates.add(PM_label(this,"y:")); coordinates.add(this.vertexY);
   coordinates.addStretch(); coordinates.add(PM_label(this,"Feather sigma (px):")); coordinates.add(this.feather);
   this.closePolygon=new PushButton(this); this.closePolygon.text="Close polygon";this.closePolygon.toolTip="Connect the last vertex to the first so the mask can be previewed or created.";
   this.closePolygon.onClick=function() { self.finishPolygon(); };
   this.undo=new PushButton(this); this.undo.text="Undo";this.undo.toolTip="Reopen a closed polygon; otherwise remove its last vertex.";
   this.undo.onClick=function(){self.undoEdit();};
   this.undo.toolTip="Undo the last contour edit, including moving, inserting or deleting vertices.";
   this.clear=new PushButton(this);this.clear.text="Clear contour";this.clear.toolTip="Remove all vertices. Undo can restore the previous contour.";
   this.clear.onClick=function(){self.clearContour();};
   var tools=new HorizontalSizer; tools.spacing=8;
   tools.add(this.closePolygon); tools.add(this.undo); tools.add(this.clear); tools.addStretch();
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
   var navigation=new HorizontalSizer;navigation.spacing=8;navigation.add(this.fitButton);navigation.add(this.oneButton);navigation.add(this.minusButton);navigation.add(this.plusButton);navigation.add(this.zoomLabel);navigation.addStretch();
   var left=new VerticalSizer; left.spacing=4;
   left.add(PM_label(this,"Reference image · editable polygon and mask overlay")); left.add(this.detailPane,100);
   var right=new VerticalSizer; right.spacing=4;
   right.add(PM_label(this,"Output mask · white allows processing, black protects")); right.add(this.maskPane,100);
   var columns=new HorizontalSizer; columns.spacing=8; columns.add(left,100); columns.add(right,100);
   this.status=PM_taskLabel(this,"");this.progressBar=new PM_Progress(this);
   this.preview=new PushButton(this); this.preview.text="Update Preview";this.preview.toolTip="Compute the full-resolution mask and overlay. Preview and output use the same pixel values.";
   this.preview.onClick=function() { self.calculate(); };
   this.mode=new ComboBox(this);this.mode.addItem("Inward");this.mode.addItem("Both sides");
   this.mode.toolTip="Inward protects every pixel outside the polygon. Both sides uses a Gaussian transition across the contour.";
   this.invert=new CheckBox(this);this.invert.text="Invert mask";this.invert.toolTip="Exchange white and black after feathering.";
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
   var options=new HorizontalSizer;options.spacing=6;options.add(PM_label(this,"Feather:"));options.add(this.mode);options.add(this.invert);options.addStretch();options.add(this.useSTF);options.add(this.overlayColor);options.add(PM_label(this,"Overlay:"));options.add(this.opacity);
   this.outputName=new Edit(this);this.outputName.text=PM_availableId("PolyMask");
   this.outputName.toolTip="New mask image identifier. Use ASCII letters, digits and underscores; begin with a letter or underscore.";
   this.applyMask=new CheckBox(this);this.applyMask.text="Apply mask to the reference image";this.applyMask.checked=false;
   this.applyMask.toolTip="Attach the new mask to the reference, replacing its current mask. This does not edit image pixels.";
   var outputRow=new HorizontalSizer;outputRow.spacing=8;outputRow.add(PM_label(this,"Mask name:"));outputRow.add(this.outputName,100);outputRow.add(this.applyMask);
   this.create=new PushButton(this);this.create.text="Create Mask";this.create.toolTip="Create a full-resolution 32-bit grayscale mask. Stay in the editor to create more masks.";
   this.create.onClick=function(){self.createOutput();};
   var cancel=this.backButton=new PushButton(this);cancel.text="Back";cancel.toolTip="Return to image selection. Discard this contour and temporary preview, but keep masks already created.";
   cancel.onClick=function(){if(!self.busy)self.cancel();};
   var help=new PushButton(this);help.text="Help";help.onClick=PM_help;
   var buttons=new HorizontalSizer; buttons.spacing=8;
   buttons.add(help);buttons.add(this.preview); buttons.addStretch(); buttons.add(this.create); buttons.add(cancel);
   this.sizer=new VerticalSizer; this.sizer.margin=12; this.sizer.spacing=8;
   this.sizer.add(PM_label(this,"Left click to add vertices; click the first vertex or Close polygon to finish. Drag vertices to move them. Click a closed edge to insert a point. Right click for contour actions."));
   this.sizer.add(navigation);this.sizer.add(columns,100); this.sizer.add(tools); this.sizer.add(coordinates);
   this.sizer.add(PM_label(this,"Wheel: zoom at the pointer. Shift + left drag: pan both panels. Normal left drag: move a vertex. Fit Image: return to the full field."));
   this.sizer.add(PM_label(this,"Edit vertex coordinates numerically if needed. The generated mask includes exactly the feathering shown in the preview."));
   this.sizer.add(options);this.sizer.add(outputRow);
   this.sizer.add(this.status);this.sizer.add(this.progressBar); this.sizer.add(buttons);this.sizer.add(PM_copyright(this));
   this.onClose=function(){return !self.busy;};
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
      this.selected=n?PM_clamp(this.selected,0,n-1):-1;
      this.vertex.maxValue=Math.max(1,n); this.vertex.value=this.selected+1 || 1;
      this.vertex.enabled=this.vertexX.enabled=this.vertexY.enabled=n>0 && !this.busy;
      this.vertexX.value=n?points[this.selected].x:0; this.vertexY.value=n?points[this.selected].y:0;
   }
   finally { this.syncing=false; }
}
invalidate()
{
   PM_close(this.cachedMask);this.cachedMask=null;this.maskBitmap=null;this.overlayBitmap=null;if(this.progressBar)this.progressBar.setValue(0);this.syncCoordinates();
   var valid=false;
   if (!this.selection.closed)
      this.status.text=this.selection.points.length+" vertices · add points and close the polygon to continue.";
   else
   {
      try { this.selection.polygon(); valid=true; this.status.text="Contour closed. Click Update Preview or Create Mask."; }
      catch (e) { this.status.text=String(e); }
   }
   this.preview.enabled=this.create.enabled=valid && !this.busy;
   this.closePolygon.enabled=!this.selection.closed && this.selection.points.length>=3 && !this.busy;
   this.undo.enabled=this.history.length>0 && !this.busy;this.clear.enabled=this.selection.points.length>0 && !this.busy;
   this.detailPane.update(); this.maskPane.update();
}
recordEdit()
{
   this.history.push({points:this.selection.points.map(function(p){return{x:p.x,y:p.y};}),closed:this.selection.closed,selected:this.selected});
   if(this.history.length>50)this.history.shift();
}
undoEdit()
{
   if(this.busy || !this.history.length)return;
   var previous=this.history.pop();this.selection.points=previous.points;this.selection.closed=previous.closed;this.selected=previous.selected;this.invalidate();
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
   var bitmap=new Bitmap(this.imageWidth,this.imageHeight),target=new BitmapIterator(bitmap).data,source=new BitmapIterator(this.maskBitmap).data,color=colors[this.overlayColor.currentItem]&0xffffff;
   // Copy grayscale intensity into alpha explicitly. Native setAlpha(Bitmap)
   // copies the source alpha, which is opaque in rendered grayscale masks.
   for(var i=0;i<target.length;++i)target[i]=((source[i]&255)<<24)|color;
   this.overlayBitmap=bitmap;
}
calculate()
{
   if(this.busy)return false;this.busy=true;this.preview.enabled=this.create.enabled=false;
   this.status.text="Computing the full-resolution polygon mask…";this.status.repaint();this.progressBar.setValue(0);
   var candidate=null;
   try
   {
      var self=this;candidate=PM_makeMask(this.reference,this.selection.polygon(),this.feather.value,this.mode.currentItem,this.invert.checked,function(p,text){self.status.text=text;self.status.repaint();self.progressBar.setValue(p);});
      var bitmap=candidate.mainView.image.render();PM_close(this.cachedMask);this.cachedMask=candidate;candidate=null;this.maskBitmap=bitmap;this.rebuildOverlay();
      this.progressBar.setValue(100);this.status.text="Preview ready. White allows processing; black protects. The output includes this feathering.";return true;
   }
   catch(e){this.status.text="Error: "+String(e);return false;}
   finally{PM_close(candidate);this.busy=false;this.preview.enabled=this.create.enabled=this.selection.closed;this.repaintBoth();console.hide();}
}
createOutput()
{
   if(this.busy)return null;
   var output=null;
   try
   {
      var id=this.outputName.text.trim();PM_validId(id);if(!ImageWindow.windowById(id).isNull)throw new Error("An image already exists with that name.");
      if(!this.cachedMask && !this.calculate())return null;
      var work=new PM_Work;
      try{output=PM_clone(this.cachedMask.mainView,work,"Output");output.mainView.id=id;if(this.reference.window.hasAstrometricSolution)output.copyAstrometricSolution(this.reference.window);work.release(output);}finally{work.dispose();}
      if(this.applyMask.checked){this.reference.window.setMask(output,false);this.reference.window.maskEnabled=true;this.reference.window.maskVisible=true;}
      output.show();this.createdMasks.push(output);this.status.text="Created "+id+". Save the mask manually. You can create another mask or go Back.";
      this.outputName.text=PM_availableId(id);return output;
   }catch(e){PM_close(output);this.status.text="Error: "+String(e);return null;}
}
dispose()
{
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
         if (!bitmap) return;
         var geo=geometry(),s=geo.scale,ox=geo.x,oy=geo.y;
         var x0=Math.max(0,Math.floor(-ox/s)),y0=Math.max(0,Math.floor(-oy/s));
         var x1=Math.min(bitmap.width,Math.ceil((this.width-ox)/s)),y1=Math.min(bitmap.height,Math.ceil((this.height-oy)/s));
         if(x1>x0 && y1>y0)
         {
            g.smoothInterpolation=s<1;
            g.drawScaledBitmapRect(ox+x0*s,oy+y0*s,ox+x1*s,oy+y1*s,bitmap,x0,y0,x1,y1);
         }
         if(!isMask && self.overlayBitmap)
         {
            g.opacity=self.opacity.value/100;
            if(x1>x0 && y1>y0)g.drawScaledBitmapRect(ox+x0*s,oy+y0*s,ox+x1*s,oy+y1*s,self.overlayBitmap,x0,y0,x1,y1);
            g.opacity=1;
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
      var geo=geometry();return {x:PM_clamp((x-geo.x)/geo.scale,0,self.imageWidth),y:PM_clamp((y-geo.y)/geo.scale,0,self.imageHeight)};
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
      if(isMask)return;
      var index=nearest(x,y);
      if(index===0 && !self.selection.closed && self.selection.points.length>=3){self.finishPolygon();return;}
      if(index>=0){self.selected=index;this.drag=index;this.dragRecorded=false;self.syncCoordinates();this.update();return;}
      if(self.selection.closed)
      {
         var candidate=PM_edgeAt(self.selection.points,x,y,geometry(),self.imageWidth,self.imageHeight);
         if(candidate && self.selection.points.length<64){self.recordEdit();self.selection.points.splice(candidate.index+1,0,self.selection.point(candidate.point.x,candidate.point.y));self.selected=candidate.index+1;self.invalidate();}
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


var PM_HELP = [
"CRINCONLAB POLYMASK — VERSION 0.1.0",
"Copyright © Carlos Rincón 2026",
"",
"PURPOSE",
"Draw a polygon on one open monochrome or RGB image and create a full-resolution 32-bit grayscale mask. No astrometry, second reference, StarXTerminator or ImageSolver is required. The image can be linear or stretched. Alpha-channel images are not supported in this version.",
"",
"WORKFLOW",
"Select a main image or Open image, then Open editor. The contour starts empty. Draw it on the left panel; the right panel shows the actual mask after Update Preview. Give the mask a unique image name, optionally enable Apply mask to the reference image, then Create Mask. The editor stays open for additional masks. Save the outputs manually.",
"",
"MOUSE AND CONTOUR",
"Left click in an empty area adds a vertex while the contour is open. Drag a vertex to move it. Click the first vertex, or Close polygon, to close the contour. Click a closed edge to insert a vertex. Right click near a vertex for Delete vertex; the menu also provides Close polygon and Clear contour. Up to 64 vertices are supported. Duplicate points, self-intersections and zero-area contours cannot produce a mask.",
"Undo restores up to 50 contour edit snapshots, including deletion, insertion and dragging. Numeric vertex controls allow precise positioning. Coordinates refer to the full-resolution image; zoom never changes geometry.",
"Wheel: synchronized zoom around the pointer. Shift + left drag: pan both panels. Normal left drag edits vertices. Fit Image returns to the complete image; 100% shows one image pixel per display pixel.",
"",
"FEATHERING AND INVERSION",
"Feather sigma is the Gaussian standard deviation in source-image pixels, from 0 to 256. It is not an exact transition width. Zero gives hard edges. Inward feathering softens inside the polygon and leaves every exterior pixel exactly black. Both sides uses a Gaussian transition extending inside and outside the contour. Invert mask exchanges white and black AFTER feathering.",
"The output includes the feathering shown in the preview. Create Mask copies the full-resolution cached mask after automatically refreshing stale calculations, so preview and output share the same float pixel values. The rendered screen preview is quantized for display; the output remains 32-bit floating point. Feathering occurs once.",
"",
"DISPLAY",
"The reference's current STF is used by default, without changing its pixels or STF settings. For a linear image, activate an STF before opening the editor. Disable Use image STF for an unstretched display. Overlay color and opacity affect display only. Purple, cyan and red are available. White mask values receive the strongest overlay; black is transparent. The grayscale output is never stretched.",
"",
"OUTPUT AND SAFETY",
"White allows processing, black protects and gray applies it partially. The mask has exactly the source width and height. If a source astrometric solution exists, it is copied to the output because the pixel grid is unchanged, but no solution is required. Original image pixels and selection are preserved.",
"Apply mask to the reference image is OFF by default. Enabling it attaches the new mask, replacing any current mask, and enables mask display. It does not alter image pixels. Previously attached mask images are never closed.",
"Create Mask retains a new image in the workspace, then suggests a free name for the next output. Duplicate or invalid names are blocked. Back discards the current contour and hidden preview, returning to image selection; previously created output masks remain open. Closing the editor also cleans only its own temporary preview. Nothing is saved automatically.",
"",
"INSTALLATION",
"Keep PolyMask_EN.js with icons/polymask_orange.svg in the same package. In Script > Feature Scripts, add the folder containing the JavaScript file and click Done. Launch Script > Crinconlab > PolyMask. Help works before selecting an image; Save manual .txt exports these instructions.",
"",
"LIMITS",
"This first version supports one polygon, up to 64 vertices, standard Gaussian edge transitions and grayscale/RGB main images without alpha. Multiple regions, holes and contour-file import/export are not included. Native processing can pause stage progress while busy; technical messages may still be written by PixInsight, but the script does not explicitly open the process console."
].join("\n");
function PM_help()
{
   var dialog=new Dialog;dialog.windowTitle="PolyMask · Help";
   var text=new TextBox(dialog);text.readOnly=true;text.text=PM_HELP;text.setScaledMinSize(640,440);
   var save=new PushButton(dialog);save.text="Save manual .txt";save.onClick=function(){try{var picker=new SaveFileDialog;picker.caption="Save PolyMask manual";picker.filters=[["Text file","*.txt"]];picker.initialPath="PolyMask_Manual_EN.txt";if(picker.execute())File.writeTextFile(picker.fileName,PM_HELP);}catch(e){new MessageBox(String(e),"PolyMask",StdIcon_Error,StdButton_Ok).execute();}};
   var close=new PushButton(dialog);close.text="Close";close.onClick=function(){dialog.ok();};
   var row=new HorizontalSizer;row.spacing=8;row.add(save);row.addStretch();row.add(close);
   dialog.sizer=new VerticalSizer;dialog.sizer.margin=12;dialog.sizer.spacing=8;dialog.sizer.add(text,100);dialog.sizer.add(row);dialog.adjustToContents();dialog.execute();
}
class PM_SetupDialog extends Dialog
{
constructor()
{
   super();var self=this;this.windowTitle="Crinconlab PolyMask · v0.1.0";
   this.views=new ViewList(this);this.views.getMainViews();this.views.setScaledMinWidth(430);
   var active=ImageWindow.activeWindow;if(active && !active.isNull)this.views.currentView=active.mainView;
   var open=new PushButton(this);open.text="Open image…";open.onClick=function()
   {
      var picker=new OpenFileDialog;picker.multipleSelections=false;picker.caption="Open reference image";
      if(!picker.execute())return;
      try{var windows=ImageWindow.open(picker.fileName);if(!windows.length)throw new Error("No image was opened.");windows[0].show();self.views.getMainViews();self.views.currentView=windows[0].mainView;}
      catch(e){new MessageBox(String(e),"PolyMask",StdIcon_Error,StdButton_Ok).execute();}
   };
   var refresh=new PushButton(this);refresh.text="Refresh";refresh.onClick=function(){var previous=self.views.currentView;self.views.getMainViews();if(previous && !previous.isNull)self.views.currentView=previous;};
   var source=new HorizontalSizer;source.spacing=8;source.add(this.views,100);source.add(open);source.add(refresh);
   var next=new PushButton(this);next.text="Open editor";next.onClick=function(){try{PM_assertView(self.views.currentView,"Reference image");self.selectedView=self.views.currentView;self.ok();}catch(e){new MessageBox(String(e),"Select image",StdIcon_Warning,StdButton_Ok).execute();}};
   var help=new PushButton(this);help.text="Help";help.onClick=PM_help;
   var close=new PushButton(this);close.text="Close";close.onClick=function(){self.cancel();};
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(help);buttons.addStretch();buttons.add(next);buttons.add(close);
   this.sizer=new VerticalSizer;this.sizer.margin=14;this.sizer.spacing=10;
   this.sizer.add(PM_label(this,"Create a polygon mask from one image. Select an open monochrome or RGB main image. No astrometry or second image is required. For linear images, set a display STF first."));
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
