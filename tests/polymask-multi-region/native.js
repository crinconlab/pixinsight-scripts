#engine v8
#define POLYMASK_LIBRARY
#include "../../src/scripts/crinconlab/PolyMask_EN.js"
var out=File.systemTempDirectory+"/Crinconlab_MultiRegion_Tests/";if(!File.directoryExists(out))File.createDirectory(out);
var checks=[],owned=[],editors=[];
function check(v,t){if(!v)throw new Error(t);checks.push(t);}
function own(w){owned.push(w);return w;}
function screen(d,p){return{x:d.detailPane.width/2+(p.x-d.camera.x)*d.camera.scale,y:d.detailPane.height/2+(p.y-d.camera.y)*d.camera.scale};}
function click(d,p){var q=screen(d,p);d.detailPane.onMousePress(q.x,q.y,MouseButton.Left,MouseButton.Left,0);d.detailPane.onMouseRelease(q.x,q.y,MouseButton.Left);}
try{
var w=own(new ImageWindow(128,128,3,32,true,true,PM_availableId('PolyMask_TestReference')));w.mainView.beginProcess();w.mainView.image.fill(.2);w.mainView.endProcess();
w.mainView.stf=[[.25,0,1,0,1],[.25,0,1,0,1],[.25,0,1,0,1],[.5,0,1,0,1]];
w.mainView.image.selectedRect=new Rect(5,6,70,80);w.mainView.image.selectedChannel=1;
var d=new PM_MaskDialog(w.mainView,6);editors.push(d);var view=w.mainView.image;
check(view.selectedChannel===1 && view.selectedRect.x0===5 && view.selectedRect.y0===6,'Source channel and ROI selections are preserved');
[{x:20,y:20},{x:108,y:20},{x:108,y:108},{x:20,y:108},{x:20,y:20}].forEach(function(p){click(d,p);});
check(d.selection.closed && d.selection.points.length===4,'Left clicks add vertices and the first vertex closes the polygon');
check(d.calculate() && d.cachedMask && d.overlayBitmap,'Native full-resolution mask and overlay render');
var m=d.cachedMask.mainView.image;
check(m.numberOfNominalChannels===1 && m.width===128 && m.height===128,'Mask has one channel and matches the source grid');
check(m.sample(10,64)===0 && m.sample(64,64)>.99 && m.sample(21,64)>0 && m.sample(21,64)<.9,'Inward feathering protects exterior exactly and softens the interior edge');
File.writeTextFile(out+'overlay-debug.json',JSON.stringify({outside:d.overlayBitmap.pixel(10,64)>>>0,inside:d.overlayBitmap.pixel(64,64)>>>0,maskOutside:d.maskBitmap.pixel(10,64)>>>0,maskInside:d.maskBitmap.pixel(64,64)>>>0}));
check((d.overlayBitmap.pixel(10,64)>>>24)===0 && (d.overlayBitmap.pixel(64,64)>>>24)===255,'Overlay alpha follows mask intensity rather than covering the full image');
d.render().save(out+'PolyMask_Editor_Inward.png');
// Display controls do not invalidate the mask.
var cached=d.cachedMask;d.opacity.value=65;d.opacity.onValueUpdated(65);d.overlayColor.currentItem=1;d.overlayColor.onItemSelected(1);check(d.cachedMask.mainView.id===cached.mainView.id,'Overlay color/opacity do not recompute or alter mask pixels');
// Insert on a closed edge, undo, delete by context menu and restore.
click(d,{x:64,y:20});check(d.selection.points.length===5 && d.cachedMask===null,'Clicking a closed edge inserts a point and invalidates preview');
d.undoEdit();check(d.selection.points.length===4 && d.selection.closed,'Undo restores edge insertion');
var menu=d.buildContextMenu(1);check(menu.deleteVertex.enabled,'Right-click menu exposes Delete vertex');menu.deleteVertex.onTrigger(false);check(d.selection.points.length===3,'Context-menu deletion removes the selected vertex');d.undoEdit();check(d.selection.points.length===4,'Undo restores deleted vertices');
// The context-menu event supplies global and local positions separately.
var build=d.buildContextMenu,captured=-1,placed=null;d.buildContextMenu=function(index){captured=index;return{execute:function(gx,gy){placed=[gx,gy];}};};
var vertexScreen=screen(d,d.selection.points[0]);d.detailPane.onContextMenu(900,700,vertexScreen.x,vertexScreen.y);d.buildContextMenu=build;
check(d.detailPane.contextMenuEvents && captured===0 && placed[0]===900 && placed[1]===700,'Right click uses local hit testing and global menu placement');
// Native zoom/pan gestures preserve geometry.
d.camera.scale=4;d.camera.fitted=false;var points=JSON.stringify(d.selection.points),q=screen(d,{x:60,y:60}),ix=d.camera.x+(q.x-d.detailPane.width/2)/d.camera.scale;
d.detailPane.onMouseWheel(q.x,q.y,120);var ix2=d.camera.x+(q.x-d.detailPane.width/2)/d.camera.scale;check(Math.abs(ix-ix2)<1e-7,'Wheel zoom preserves the image point under the pointer');
d.oneButton.onClick();d.camera.scale=4;d.camera.fitted=false;d.detailPane.onMousePress(180,150,MouseButton.Left,MouseButton.Left,KeyModifier_Shift);d.detailPane.onMouseMove(195,160,MouseButton.Left);d.detailPane.onMouseRelease(195,160,MouseButton.Left);check(JSON.stringify(d.selection.points)===points,'Shift drag pans without editing vertices');
// Both-side transition and inversion.
d.mode.currentItem=1;d.mode.onItemSelected(1);check(d.calculate(),'Both-side Gaussian transition calculates');var symmetric=d.cachedMask.mainView.image.sample(17,64);check(symmetric>0 && symmetric<.5,'Both-side feathering extends outside the polygon');
d.invert.checked=true;d.invert.onCheck(true);check(d.calculate(),'Mask inversion calculates');check(Math.abs(d.cachedMask.mainView.image.sample(17,64)+symmetric-1)<1e-6,'Inversion is applied after feathering');
// Create uses exact cached pixels; applying changes only the mask attachment.
d.outputName.text=PM_availableId('PolyMask_NativeOutput');d.applyMask.checked=true;var output=d.createOutput();own(output);
check(output && output.mainView.image.sample(17,64)===d.cachedMask.mainView.image.sample(17,64),'Created mask has the exact feathered preview pixels');
check(w.mask.mainView.id===output.mainView.id && w.maskEnabled,'Optional application attaches the generated mask');
check(view.sample(90,90,0)===Math.fround(.2) && view.selectedChannel===1 && view.selectedRect.x0===5,'Creating/applying masks preserves original pixels and selections');
var preview=d.cachedMask;d.dispose();check(preview.isNull && !output.isNull,'Closing the editor removes only its preview and keeps output masks');
// Crossed contours are rejected. Deleting a triangle vertex reopens it.
var hard=own(PM_makeMask(w.mainView,[{x:20,y:20},{x:108,y:20},{x:108,y:108},{x:20,y:108}],0,0,false));check(hard.mainView.image.sample(20,64)===1 && hard.mainView.image.sample(19,64)===0,'Zero feathering creates exact binary pixel-center coverage');
var error=false;try{PM_makeMask(w.mainView,[{x:10,y:10},{x:80,y:80},{x:10,y:80},{x:80,y:10}],3,0,false);}catch(e){error=true;}check(error,'Self-intersecting polygons are rejected');
d.applyMask.checked=false;d.invert.checked=false;d.invalidate();d.calculate();var oldMask=w.mask.mainView.id;d.outputName.text=PM_availableId('PolyMask_Second');var second=d.createOutput();own(second);check(second && w.mask.mainView.id===oldMask,'Application off preserves the previously attached mask');

var multi=new PM_MaskDialog(w.mainView,0);editors.push(multi);
function rectangle(d,x0,y0,x1,y1){d.selection.points=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];d.selection.close();d.feather.value=0;d.invalidate();}
rectangle(multi,10,10,60,60);multi.strength.value=40;multi.invalidate();multi.addRegion();
check(multi.regions.length===2 && !multi.selection.closed && !multi.allValid(),'Adding an unfinished region blocks combined outputs');
rectangle(multi,40,40,100,100);multi.strength.value=80;multi.invalidate();
check(multi.calculate(),'Two independent regions compute');
var mm=multi.cachedMask.mainView.image;
check(Math.abs(mm.sample(20,20)-.4)<1e-6 && Math.abs(mm.sample(80,80)-.8)<1e-6,'Each disjoint zone retains its own mask strength');
check(Math.abs(mm.sample(50,50)-.8)<1e-6 && mm.sample(110,110)===0,'Overlap uses maximum and exterior stays protected');
multi.switchRegion(0);check(multi.strength.value===40 && multi.feather.value===0,'Switching restores region settings');
multi.feather.value=5;multi.mode.currentItem=1;multi.invalidate();multi.switchRegion(1);multi.switchRegion(0);
check(multi.feather.value===5 && multi.mode.currentItem===1 && multi.strength.value===40,'Feather mode and sigma persist independently');
multi.deleteRegion();check(multi.regions.length===1,'Delete removes only the selected region');multi.undoEdit();check(multi.regions.length===2 && multi.feather.value===5,'Undo restores deleted region and settings');
var before=multi.createdMasks.length;multi.outputName.text=PM_availableId('MultiSeparate');multi.createSeparate();
check(multi.createdMasks.length===before+2,'Separate output creates one mask per region');multi.createdMasks.slice(before).forEach(own);
check(Math.abs(multi.createdMasks[before+1].mainView.image.sample(80,80)-.8)<1e-6 && multi.createdMasks[before+1].mainView.image.sample(20,20)===0,'Separate masks isolate regions and preserve strengths');
multi.render().save(out+'MultiRegion_Editor.png');
var setup=new PM_SetupDialog;setup.render().save(out+'PolyMask_Setup.png');

File.writeTextFile(out+'native-results.json',JSON.stringify({ok:true,checks:checks},null,2));
}catch(e){File.writeTextFile(out+'native-results.json',JSON.stringify({ok:false,error:String(e),checks:checks},null,2));throw e;}
finally{editors.forEach(function(e){e.dispose();});owned.forEach(PM_close);}
