// Copyright © Carlos Rincón 2026
#feature-id CrinconlabAstrometricCopyEN : Crinconlab > Astrometric Solution Copy
#feature-icon icons/astrometric_copy_orange_v2.svg
#feature-info Copy an existing astrometric solution to registered images. Version 1.1. English edition. Copyright &copy; Carlos Rinc&oacute;n 2026.
#engine v8
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>
CoreApplication.ensureMinimumVersion(1,9,5);

var ASC_HELP = "CRINCONLAB — ASTROMETRIC SOLUTION COPY — VERSION 1.1\nCopyright © Carlos Rincón 2026\n\nPURPOSE AND REQUIREMENTS\nCopy an existing native PixInsight astrometric solution from a solved reference\nto other open main images. RGB and monochrome images are supported.\nRequires PixInsight 1.9.5. The script does not require the RGB/Dual Band script\nor Image Solver libraries. It does not register, resample, calibrate, save or\noverwrite image files. Pixel data and input selections are preserved.\n\nThe reference must represent the final registered pixel grid. Targets must\nshare its dimensions, orientation, scale, crop and alignment. Matching image\nsizes alone is insufficient. Solve the reference before running the script.\n\nWORKFLOW\n1. Open the solved reference and target images in PixInsight. Choose the\n   reference in Solved reference; only images with a valid solution appear.\n2. Check the target images, or click Select compatible. This button selects\n   same-size images eligible under the current existing-solution policy;\n   it does not mean that registration has already been verified.\n3. Leave Replace existing solutions unchecked to preserve target solutions.\n   Enable it only when you want to replace those solutions.\n4. Click Check registration. The script detects stars and compares their\n   full-resolution positions across the field.\n5. Review the Registration column. Select a row to read its details.\n6. For an Unable to verify target, select its row. A checkbox appears:\n   I confirm that this image is registered to the reference.\n   It is initially unchecked and applies to that target only. Check it only\n   if you know the image has been registered to this reference grid.\n   Repeat separately for other unverified targets you wish to authorize.\n7. Click Copy solution. The script checks registration again using current\n   pixels, then copies only to permitted targets. Review the summary and\n   console. Save the target images yourself to keep the metadata on disk.\n\nTHREE REGISTRATION STATES\nAligned: enough common stars agree in their pixel positions and cover the\nfield. Copying is allowed without manual confirmation.\n\nNot aligned: dimensions differ, or robust star correspondences demonstrate\na non-identity geometric transformation. Copying is blocked. There is no\nmanual override for this state. Register the image correctly before retrying.\n\nUnable to verify: too few reliable stars, insufficient field coverage, no\nreliable common pattern, borderline offsets, or a star-analysis error.\nCopying is blocked unless this specific target has been manually confirmed.\nSelecting or confirming one target does not authorize other targets.\nA failed verification does not prove that an image is aligned or misaligned.\n\nCHANGES AND RECHECKING\nCopy solution always repeats the star analysis. A manual confirmation is\nretained only while the same target/reference pair remains Unable to verify.\nAn Aligned result needs no override. A new Not aligned result blocks copying,\neven if the image was previously confirmed. Changing the reference or refreshing\nthe image list clears checks and manual confirmations. Refresh after opening\nor closing images. A target changed outside this workflow should be refreshed\nand checked again before confirming it.\n\nWHAT THE CHECK MEASURES\nThe detector works on a full-image temporary copy, using the intensity of RGB\nimages. Up to 30 detections per cell of a 4×4 grid are retained to avoid a dense\ncentral region dominating the comparison. Source channel/ROI selections are\nrestored and the actual image pixels are not modified.\n\nVerification requires at least 20 matched stars, at least 30% of the smaller\nsampled catalog, and broad coverage: six cells of a 3×3 grid (at least five outer\ncells), spanning at least 65% of both image dimensions. Aligned requires a median\npositional difference no greater than 0.35 pixels and a 90th-percentile difference\nno greater than 0.75 pixels. These are initial fixed tolerances, not user controls.\n\nTranslation candidates and bounded triangle-pattern matching are used to seek\ncommon stars under shift, rotation and scale changes. Consistent non-identity\ngeometry can produce Not aligned. An inconclusive search produces Unable to\nverify, rather than guessing that the image is aligned.\n\nThis is a statistical check, not a proof of perfect registration at every pixel.\nDifferent filters, crowded fields, saturation, distorted stars, low signal,\nuneven coverage or local distortions can make the result inconclusive. Images\nwithout stars normally require manual confirmation. The check does not verify\nthat the reference's existing astrometric solution is scientifically correct.\n\nCOPYING, STOPPING AND ERRORS\nThe native solution and its available distortion model are transferred; unrelated\nacquisition metadata are not copied. Existing target solutions are skipped by\ndefault. The reference itself is excluded, and size mismatches are always skipped.\nUnchecked or unauthorized targets cannot receive a solution through the copy\nroutine. Different-size targets cannot be manually authorized.\n\nStop requests are handled between images. Completed copies remain applied.\nA copying error is reported per target and other targets continue. Review any\nfailed target before saving; the script does not promise rollback of a failed\nnative transfer. No image files are saved automatically.\n\nHELP AND LOCAL INSTALLATION\nHelp displays this manual without needing any images.\nKeep Astrometric_Solution_Copy_EN.js and icons/astrometric_copy.svg together.\nPlace them alongside your other Crinconlab scripts, merging the icons folder\nso that header_editor.svg and rgb_dualband.svg remain available.\nAdd the folder through Script → Feature Scripts… → Add….\nFind the script at Script → Crinconlab → Astrometric Solution Copy.\nTo update an already registered copy, replace its .js file in the same folder.\n\nTESTING AND LIMITS\nTests exercise native star detection on synthetic stellar images in PixInsight,\naligned RGB/monochrome comparisons with brightness/PSF differences, shifted and\nrotated fields, blank fields, different dimensions, native WCS transfer, blocked\nmisaligned targets, per-image manual authorization, preserved pixels/selections,\nand UI controls. Pure matching tests also cover scale changes and 180° rotation.\nThese checks are a starting point; behavior with real fields and your filters\nstill needs validation. The full-resolution analysis adds processing time.\n";

function ASC_validWindow(w){return !!w && !w.isNull;}
function ASC_compatible(a,b)
{
   return ASC_validWindow(a) && ASC_validWindow(b) && a.mainView.image.width==b.mainView.image.width && a.mainView.image.height==b.mainView.image.height;
}
// All coordinates and tolerances below are in full-resolution pixels.
function ASC_median(a){a=a.slice().sort(function(x,y){return x-y;});return a.length?a[Math.floor(a.length/2)]:Infinity;}
function ASC_grid(stars,cell)
{
   var bins={};stars.forEach(function(s,i){var k=Math.floor(s.x/cell)+","+Math.floor(s.y/cell);(bins[k]||(bins[k]=[])).push(i);});
   return {nearest:function(x,y,r){var best=-1,d=r*r;for(var yy=Math.floor((y-r)/cell);yy<=Math.floor((y+r)/cell);++yy)for(var xx=Math.floor((x-r)/cell);xx<=Math.floor((x+r)/cell);++xx){var b=bins[xx+","+yy]||[];for(var j=0;j<b.length;++j){var s=stars[b[j]],dd=(s.x-x)*(s.x-x)+(s.y-y)*(s.y-y);if(dd<d){d=dd;best=b[j];}}}return best;}};
}
function ASC_pairs(a,b,grid,t,r)
{
   var used={},pairs=[];
   for(var i=0;i<a.length;++i){var x=t.a*a[i].x-t.b*a[i].y+t.x,y=t.b*a[i].x+t.a*a[i].y+t.y,j=grid.nearest(x,y,r);if(j<0)continue;var d=Math.hypot(b[j].x-x,b[j].y-y);if(used[j]!==undefined){if(pairs[used[j]].d<=d)continue;pairs[used[j]]={i:i,j:j,d:d};}else{used[j]=pairs.length;pairs.push({i:i,j:j,d:d});}}
   return pairs;
}
function ASC_coverage(pairs,a,w,h)
{
   var cells={},outer={},xmin=w,xmax=0,ymin=h,ymax=0;
   pairs.forEach(function(p){var s=a[p.i],x=Math.min(2,Math.max(0,Math.floor(3*s.x/w))),y=Math.min(2,Math.max(0,Math.floor(3*s.y/h)));cells[x+","+y]=1;if(x!=1||y!=1)outer[x+","+y]=1;xmin=Math.min(xmin,s.x);xmax=Math.max(xmax,s.x);ymin=Math.min(ymin,s.y);ymax=Math.max(ymax,s.y);});
   return Object.keys(cells).length>=6 && Object.keys(outer).length>=5 && xmax-xmin>=0.65*w && ymax-ymin>=0.65*h;
}
function ASC_fit(a,b,pairs)
{
   var ax=0,ay=0,bx=0,by=0; pairs.forEach(function(p){ax+=a[p.i].x;ay+=a[p.i].y;bx+=b[p.j].x;by+=b[p.j].y;});var n=pairs.length;ax/=n;ay/=n;bx/=n;by/=n;
   var re=0,im=0,den=0;pairs.forEach(function(p){var x=a[p.i].x-ax,y=a[p.i].y-ay,u=b[p.j].x-bx,v=b[p.j].y-by;re+=x*u+y*v;im+=x*v-y*u;den+=x*x+y*y;});
   if(den<=0)return null;var aa=re/den,bb=im/den;return {a:aa,b:bb,x:bx-aa*ax+bb*ay,y:by-bb*ax-aa*ay};
}
function ASC_triangles(stars)
{
   var s=stars.slice(0,32),out=[];
   function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
   for(var i=0;i<s.length-2;++i)for(var j=i+1;j<s.length-1;++j)for(var k=j+1;k<s.length;++k){var v=[{p:s[i],d:d(s[j],s[k])},{p:s[j],d:d(s[i],s[k])},{p:s[k],d:d(s[i],s[j])}].sort(function(a,b){return a.d-b.d;});var l=v[2].d;if(l<20 || v[0].d/l<0.12 || (v[2].d-v[1].d)/l<0.008 || (v[1].d-v[0].d)/l<0.008)continue;out.push({u:v[0].d/l,v:v[1].d/l,p:v.map(function(q){return q.p;})});}
   return out;
}
function ASC_compareStars(a,b,w,h)
{
   function result(status,reason,extra){var r=extra||{};r.status=status;r.reason=reason;return r;}
   if(a.length<20 || b.length<20)return result("Unable to verify","Too few reliable stars (at least 20 per image)");
   var grid=ASC_grid(b,8),identity={a:1,b:0,x:0,y:0},near=ASC_pairs(a,b,grid,identity,3);
   function stats(pairs){var d=pairs.map(function(p){return Math.hypot(a[p.i].x-b[p.j].x,a[p.i].y-b[p.j].y);}).sort(function(x,y){return x-y;});return {matches:pairs.length,median:d.length?d[Math.floor(d.length/2)]:Infinity,p90:d.length?d[Math.floor(0.9*(d.length-1))]:Infinity};}
   function adequate(pairs){return pairs.length>=20 && pairs.length>=0.30*Math.min(a.length,b.length) && ASC_coverage(pairs,a,w,h);}
   if(adequate(near))
   {
      var st=stats(near);
      // Also reject any coherent non-identity transform detectable near the identity.
      if(st.median<=0.35 && st.p90<=0.75)return result("Aligned","Star positions agree across the field",st);
   }
   var best=near,bestT=identity;
   function consider(t)
   {
      if(!t || !isFinite(t.a+t.b+t.x+t.y))return;
      var scale=Math.hypot(t.a,t.b);if(scale<0.4 || scale>2.5)return;
      var pairs=ASC_pairs(a,b,grid,t,2);
      if(pairs.length>best.length){best=pairs;bestT=t;}
   }
   // Coherent translation candidates, including shifts far from the identity.
   var votes={};a.slice(0,100).forEach(function(p){b.slice(0,100).forEach(function(q){var dx=q.x-p.x,dy=q.y-p.y,key=Math.round(dx/4)+","+Math.round(dy/4),v=votes[key]||(votes[key]={n:0,x:0,y:0});++v.n;v.x+=dx;v.y+=dy;});});
   Object.keys(votes).map(function(k){return votes[k];}).sort(function(a,b){return b.n-a.n;}).slice(0,12).forEach(function(v){consider({a:1,b:0,x:v.x/v.n,y:v.y/v.n});});
   // Scale/rotation-invariant triangles provide a bounded pattern search.
   if(best.length<0.65*Math.min(a.length,b.length))
   {
      var ta=ASC_triangles(a),tb=ASC_triangles(b),bins={},step=0.003;
      tb.forEach(function(t){var k=Math.floor(t.u/step)+","+Math.floor(t.v/step);(bins[k]||(bins[k]=[])).push(t);});
      var trials=0;
      outer:for(var i=0;i<ta.length;++i){var t=ta[i],u=Math.floor(t.u/step),v=Math.floor(t.v/step);for(var x=-1;x<=1;++x)for(var y=-1;y<=1;++y){var bucket=bins[(u+x)+","+(v+y)]||[];for(var j=0;j<bucket.length;++j){var z=bucket[j];if(Math.abs(t.u-z.u)>0.002 || Math.abs(t.v-z.v)>0.002)continue;var aa=t.p[0],ab=t.p[1],ba=z.p[0],bb=z.p[1],dx=ab.x-aa.x,dy=ab.y-aa.y,du=bb.x-ba.x,dv=bb.y-ba.y,den=dx*dx+dy*dy,ar=(dx*du+dy*dv)/den,bi=(dx*dv-dy*du)/den;consider({a:ar,b:bi,x:ba.x-ar*aa.x+bi*aa.y,y:ba.y-bi*aa.x-ar*aa.y});if(++trials>=1800 || best.length>=0.80*Math.min(a.length,b.length))break outer;}}}
   }
   for(var it=0;it<3 && best.length>=6;++it){var fit=ASC_fit(a,b,best);if(!fit)break;var p=ASC_pairs(a,b,grid,fit,1.5);if(p.length<6)break;best=p;bestT=fit;}
   if(adequate(best))
   {
      var st=stats(best);st.scale=Math.hypot(bestT.a,bestT.b);st.rotation=Math.atan2(bestT.b,bestT.a)*180/Math.PI;
      if(st.median<=0.35 && st.p90<=0.75)return result("Aligned","Star positions agree across the field",st);
      // A robust geometric correspondence is evidence of misregistration.
      var residual=best.map(function(p){var s=a[p.i],q=b[p.j];return Math.hypot(bestT.a*s.x-bestT.b*s.y+bestT.x-q.x,bestT.b*s.x+bestT.a*s.y+bestT.y-q.y);});
      if(ASC_median(residual)<=0.7 && st.median>0.75)return result("Not aligned","Matching stars require a geometric transformation",st);
      return result("Unable to verify","Borderline positional differences or uncertain geometry",st);
   }
   return result("Unable to verify","Insufficient common stars or field coverage",stats(best));
}
function ASC_detectStars(window)
{
   var source=window.mainView.image,image;
   source.pushSelections();try{source.resetSelections();image=new Image(source);}finally{source.popSelections();}
   try
   {
      var detector=new StarDetector;detector.sensitivity=0.5;detector.hotPixelFilterRadius=1;detector.noiseReductionFilterRadius=0;detector.allowClusteredSources=false;
      var found=detector.stars(image),cells={},stars=[],w=image.width,h=image.height;
      // Uniform sampling prevents a dense central cluster from dominating the check.
      found.forEach(function(s){var k=Math.min(3,Math.floor(s.pos.x/w*4))+","+Math.min(3,Math.floor(s.pos.y/h*4));if((cells[k]||0)>=30)return;cells[k]=(cells[k]||0)+1;stars.push({x:s.pos.x,y:s.pos.y,flux:s.flux});});
      return stars;
   }
   finally{image.free();}
}
function ASC_check(source,target,referenceStars)
{
   if(!ASC_compatible(source,target))return {status:"Not aligned",reason:"Dimensions differ from the reference"};
   try{return ASC_compareStars(referenceStars||ASC_detectStars(source),ASC_detectStars(target),source.mainView.image.width,source.mainView.image.height);}
   catch(e){return {status:"Unable to verify",reason:"Star analysis failed: "+String(e)};}
}
function ASC_registrationAllows(entry){return !!entry && (entry.status=="Aligned" || (entry.status=="Unable to verify" && entry.manualConfirmed===true));}

function ASC_copy(source,targets,replace,progress,registration)
{
   if(!ASC_validWindow(source) || !source.hasAstrometricSolution)throw new Error("Choose an open reference image with an astrometric solution.");
   if(!targets.length)throw new Error("Select at least one target image.");
   var report={copied:0,skipped:0,errors:0,canceled:false,items:[]};
   for(var i=0;i<targets.length;++i)
   {
      if(progress && progress(i,targets.length)===false){report.canceled=true;break;}
      var w=targets[i],id=ASC_validWindow(w)?w.mainView.id:"Closed image";
      var reason=null;
      if(!ASC_validWindow(w))reason="Image is no longer open";
      else if(w.mainView.id==source.mainView.id)reason="Reference image cannot be a target";
      else if(!ASC_compatible(source,w))reason="Dimensions differ from the reference";
      else if(w.hasAstrometricSolution && !replace)reason="Existing solution retained";
      else if(!registration || !registration[id] || registration[id].source!==source || !ASC_registrationAllows(registration[id]))reason=registration && registration[id] && registration[id].status=="Not aligned"?"Not aligned — copying blocked":"Registration not verified or manual confirmation missing";
      if(reason){++report.skipped;report.items.push({image:id,status:"skipped",reason:reason});console.writeln("SKIP "+id+": "+reason);continue;}
      try
      {
         w.copyAstrometricSolution(source);
         if(!w.hasAstrometricSolution)throw new Error("The target has no valid astrometric solution after copying.");
         ++report.copied;report.items.push({image:id,status:"copied"});console.writeln("COPIED "+source.mainView.id+" → "+id);
      }
      catch(e){++report.errors;report.items.push({image:id,status:"error",reason:String(e)});console.warningln("ERROR "+id+": "+String(e));}
   }
   console.writeln("ASTROMETRIC COPY SUMMARY "+JSON.stringify(report));return report;
}
class ASC_HelpDialog extends Dialog
{
   constructor()
   {
      super();this.windowTitle="Help · Astrometric Solution Copy";
      var text=new TextBox(this);text.readOnly=true;text.text=ASC_HELP;text.setScaledMinSize(680,420);
      var close=new PushButton(this);close.text="Close";close.onClick=()=>this.ok();
      this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(text,100);this.sizer.add(close);this.adjustToContents();
   }
}
class ASC_Dialog extends Dialog
{
   constructor()
   {
      super();var self=this;this.windowTitle="Crinconlab · Astrometric Solution Copy · v1.1";this.sources=[];this.running=false;this.cancelRequested=false;
      function label(text){var l=new Label(self);l.text=text;l.wordWrapping=true;return l;}
      this.reference=new ComboBox(this);this.reference.toolTip="Open main images with a valid astrometric solution.";
      this.refresh=new PushButton(this);this.refresh.text="Refresh images";this.refresh.onClick=function(){self.reload();};
      var sourceRow=new HorizontalSizer;sourceRow.spacing=8;sourceRow.add(label("1. Solved reference:"));sourceRow.add(this.reference,100);sourceRow.add(this.refresh);
      this.targets=new TreeBox(this);this.targets.numberOfColumns=4;this.targets.headerVisible=true;this.targets.rootDecoration=false;this.targets.alternateRowColor=true;
      ["2. Target images","Dimensions","Astrometry","Registration"].forEach(function(t,i){self.targets.setHeaderText(i,t);});this.targets.setScaledMinSize(800,230);
      this.selectAll=new PushButton(this);this.selectAll.text="Select compatible";this.selectAll.onClick=function(){self.selectCompatible();};
      this.selectNone=new PushButton(this);this.selectNone.text="Select none";this.selectNone.onClick=function(){for(var i=0;i<self.targets.numberOfChildren;++i)self.targets.child(i).checked=false;};
      var selection=new HorizontalSizer;selection.spacing=8;selection.add(this.selectAll);selection.add(this.selectNone);selection.addStretch();
      this.replace=new CheckBox(this);this.replace.text="3. Replace existing solutions";this.replace.checked=false;this.replace.onCheck=function(){self.updateStatuses();};
      this.checkButton=new PushButton(this);this.checkButton.text="4. Check registration";this.checkButton.onClick=function(){self.runCheck();};
      this.detail=label("Select a target row to see its registration result.");
      this.manualTarget=label("");this.manual=new CheckBox(this);this.manual.text="I confirm that this image is registered to the reference.";this.manual.checked=false;this.manual.visible=false;this.manualTarget.visible=false;
      this.manual.onCheck=function(){var n=self.targets.currentNode;if(n && n.registration && n.registration.status=="Unable to verify"){n.registration.manualConfirmed=self.manual.checked;self.updateStatuses();}};
      this.targets.onCurrentNodeUpdated=function(){self.showDetails();};
      this.status=label("Check registration before copying. No files are saved automatically.");
      this.copyButton=new PushButton(this);this.copyButton.text="5. Copy solution";this.copyButton.onClick=function(){self.runCopy();};
      this.help=new PushButton(this);this.help.text="Help";this.help.onClick=function(){(new ASC_HelpDialog).execute();};
      this.closeButton=new PushButton(this);this.closeButton.text="Close";this.closeButton.onClick=function(){if(self.running){self.cancelRequested=true;self.status.text="Stopping after the current image…";}else self.ok();};
      var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.help);buttons.addStretch();buttons.add(this.copyButton);buttons.add(this.closeButton);
      this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;
      this.sizer.add(label("Copy astrometry to registered RGB or monochrome images. Star positions are checked across the field; same dimensions alone do not prove registration."));
      [sourceRow,this.targets,selection,this.replace,this.checkButton,this.detail,this.manualTarget,this.manual,this.status,buttons,label("Copyright © Carlos Rincón 2026")].forEach(function(c){self.sizer.add(c);});
      this.reference.onItemSelected=function(){self.loadTargets();};this.onClose=function(){if(self.running){self.cancelRequested=true;return false;}return true;};this.reload();this.adjustToContents();
   }
   source(){return this.sources[this.reference.currentItem] || null;}
   reload()
   {
      var old=this.source(),oldId=ASC_validWindow(old)?old.mainView.id:"";this.reference.clear();this.sources=[];
      ImageWindow.windows.forEach((w)=>{if(ASC_validWindow(w) && w.hasAstrometricSolution){this.sources.push(w);this.reference.addItem(w.mainView.id);}});
      for(var j=0;j<this.sources.length;++j)if(this.sources[j].mainView.id==oldId)this.reference.currentItem=j;
      this.loadTargets();this.status.text=this.sources.length?"Select targets, then click Check registration.":"No solved reference is open. Solve one image, then click Refresh images.";
   }
   loadTargets()
   {
      this.targets.clear();var source=this.source();
      ImageWindow.windows.forEach((w)=>{if(!ASC_validWindow(w) || (source && w.mainView.id==source.mainView.id))return;var n=new TreeBoxNode(this.targets);n.targetWindow=w;n.registration=null;n.checkable=true;n.checked=false;n.setText(0,w.mainView.id);n.setText(1,w.mainView.image.width+" × "+w.mainView.image.height);});
      this.updateStatuses();this.showDetails();
   }
   updateStatuses()
   {
      var source=this.source();
      for(var i=0;i<this.targets.numberOfChildren;++i){var n=this.targets.child(i),w=n.targetWindow;n.setText(2,!ASC_validWindow(w)?"Closed":w.hasAstrometricSolution?(this.replace.checked?"Replace existing":"Keep existing"):"No solution");n.setText(3,!source?"Choose reference":!ASC_compatible(source,w)?"Not aligned — dimensions":n.registration?n.registration.status+(n.registration.status=="Unable to verify" && n.registration.manualConfirmed?" (confirmed)":""):"Not checked");}
      for(var j=0;j<4;++j)this.targets.adjustColumnWidthToContents(j);
   }
   showDetails()
   {
      var n=this.targets.currentNode,r=n?n.registration:null;
      var show=!!r && r.status=="Unable to verify",resize=this.manualShown!==show;this.manualShown=show;
      this.manual.visible=this.manualTarget.visible=show;
      this.manual.checked=!!r && r.manualConfirmed===true;this.manual.enabled=!this.running;
      this.manualTarget.text=n?"Manual confirmation for: "+n.text(0):"";
      this.detail.text=r?r.status+": "+r.reason+(r.matches!==undefined?" · Matches: "+r.matches:"")+(isFinite(r.median)?" · Median offset: "+r.median.toFixed(2)+" px · P90: "+r.p90.toFixed(2)+" px":""):"Select a checked target row to see details. Unable to verify requires confirmation for that image only.";
      if(resize)this.adjustToContents();
   }
   selectCompatible()
   {
      var source=this.source();for(var i=0;i<this.targets.numberOfChildren;++i){var n=this.targets.child(i);n.checked=ASC_compatible(source,n.targetWindow) && (this.replace.checked || !n.targetWindow.hasAstrometricSolution);}
   }
   selectedNodes(){var a=[];for(var i=0;i<this.targets.numberOfChildren;++i)if(this.targets.child(i).checked)a.push(this.targets.child(i));return a;}
   setBusy(busy)
   {
      this.running=busy;if(busy)this.cancelRequested=false;this.closeButton.text=busy?"Stop":"Close";
      [this.reference,this.refresh,this.targets,this.selectAll,this.selectNone,this.replace,this.checkButton,this.copyButton,this.help,this.manual].forEach(function(c){c.enabled=!busy;});
   }
   performChecks(nodes)
   {
      var source=this.source();if(!ASC_validWindow(source) || !source.hasAstrometricSolution)throw new Error("Choose an open reference image with an astrometric solution.");if(!nodes.length)throw new Error("Select at least one target image.");
      var refStars=null,refError=null;try{refStars=ASC_detectStars(source);}catch(e){refError=String(e);}
      for(var i=0;i<nodes.length;++i)
      {
         this.status.text="Checking registration: "+(i+1)+" / "+nodes.length;CoreApplication.processEvents();if(this.cancelRequested)return;
         var n=nodes[i],previous=n.registration,result;
         if(!ASC_compatible(source,n.targetWindow))result={status:"Not aligned",reason:"Image closed or dimensions differ"};
         else if(refError)result={status:"Unable to verify",reason:"Reference star analysis failed: "+refError};
         else result=ASC_check(source,n.targetWindow,refStars);
         result.manualConfirmed=!!previous && previous.status=="Unable to verify" && result.status=="Unable to verify" && previous.source===source && previous.manualConfirmed===true;result.source=source;n.registration=result;
         console.writeln("REGISTRATION "+n.text(0)+": "+result.status+" — "+result.reason);
      }
      this.updateStatuses();this.showDetails();
   }
   runCheck()
   {
      try{this.setBusy(true);console.hide();this.performChecks(this.selectedNodes());this.status.text=this.cancelRequested?"Check stopped.":"Check complete. Select an Unable to verify row to confirm that image manually, if appropriate.";}
      catch(e){new MessageBox(String(e),"Registration check",StdIcon_Warning,StdButton_Ok).execute();}
      finally{this.setBusy(false);this.updateStatuses();this.showDetails();}
   }
   runCopy()
   {
      try
      {
         this.setBusy(true);console.hide();var nodes=this.selectedNodes();this.performChecks(nodes);if(this.cancelRequested)return;
         var decisions={};nodes.forEach(function(n){decisions[n.targetWindow.mainView.id]=n.registration;});
         this.lastReport=ASC_copy(this.source(),nodes.map(function(n){return n.targetWindow;}),this.replace.checked,(i,total)=>{this.status.text="Copying astrometry: "+(i+1)+" / "+total;CoreApplication.processEvents();return !this.cancelRequested;},decisions);
         var r=this.lastReport;this.status.text=(r.canceled?"Stopped. ":"Finished. ")+"Copied: "+r.copied+" · Skipped: "+r.skipped+" · Errors: "+r.errors+". Save targets to keep changes. Unverified targets need individual confirmation.";
      }
      catch(e){new MessageBox(String(e),"Astrometric Solution Copy",StdIcon_Warning,StdButton_Ok).execute();}
      finally{this.setBusy(false);this.updateStatuses();this.showDetails();}
   }
}
#ifndef ASTROMETRIC_COPY_LIBRARY
try{(new ASC_Dialog).execute();}
catch(e){new MessageBox(String(e),"Astrometric Solution Copy",StdIcon_Error,StdButton_Ok).execute();}
#endif
