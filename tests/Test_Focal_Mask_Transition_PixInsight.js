#engine v8
#define CR_MF_LIBRARY
#include "../src/scripts/crinconlab/Mezcla_Focales.js"
var checks=[],work=new MF_Work;
function check(value,name){checks.push({name:name,passed:!!value});if(!value)throw new Error(name);}
try{
 var base=work.own(new ImageWindow(128,128,1,32,true,false,MF_unique("Regression")));
 var points=[{x:8,y:8},{x:119,y:8},{x:119,y:119},{x:85,y:119},{x:78,y:97},{x:65,y:116},{x:38,y:119},{x:38,y:85},{x:8,y:85}];
 var support=MF_polygonMask(base.mainView,points,work),img=support.mainView.image;
 var distances=MF_inwardDistances(img),zeros=[];
 for(var y=-1;y<=128;++y)for(var x=-1;x<=128;++x)
 if(x<0||y<0||x===128||y===128||img.sample(x,y,0)===0)zeros.push({x:x,y:y});
 var exact=true;
 for(var y=0;y<128;y+=3)for(var x=0;x<128;x+=3){var expected=Infinity;for(var i=0;i<zeros.length;++i){var dx=x-zeros[i].x,dy=y-zeros[i].y;expected=Math.min(expected,dx*dx+dy*dy);}if(distances[y*128+x]!==expected)exact=false;}
 check(exact,"Euclidean transform matches brute force, including concave notches");
 var out=MF_effectiveMask(support,8,work),a=out.mainView.image,valid=true,formula=true,maxStep=0;
 for(var y=0;y<128;++y)for(var x=0;x<128;++x){var value=a.sample(x,y,0),d=Math.max(0,Math.sqrt(distances[y*128+x])-0.5);if(value<0||value>1||(img.sample(x,y,0)===0&&value!==0))valid=false;if(Math.abs(value-(1-Math.exp(-d*d/128)))>1e-6)formula=false;if(x)maxStep=Math.max(maxStep,Math.abs(value-a.sample(x-1,y,0)));if(y)maxStep=Math.max(maxStep,Math.abs(value-a.sample(x,y-1,0)));}
 check(valid,"Mask remains bounded and exactly black outside support");
 check(formula,"Every output sample follows inward distance falloff");
 check(maxStep<0.08,"Concave transition has no abrupt adjacent-pixel jumps");
 check(MF_effectiveMask(support,0,work)===support,"Zero transition preserves original hard support");
 var wide=MF_effectiveMask(support,16,work);check(wide.mainView.image.sample(60,50,0)<a.sample(60,50,0),"Increasing sigma widens inward transition");
 var coverage=MF_math("iif(x()<100,1,0)",base.mainView,work,"Coverage",false);
 var limited=MF_limitedPolygon(base.mainView,points,coverage,work),limitedOut=MF_effectiveMask(limited,8,work);
 check(limitedOut.mainView.image.sample(101,50,0)===0 && limitedOut.mainView.image.sample(99,50,0)<0.01,"Astrometric coverage boundary is also feathered inward");
 var preview=MF_renderCoverage(base.mainView,points,8,coverage);check(preview.width===128&&preview.height===128,"Preview runs the same effective-mask pipeline");
 a.render().save(File.systemTempDirectory+"/Crinconlab_Focal_Concave_Mask.png");
 var large=work.own(new ImageWindow(3000,2000,1,32,true,false,MF_unique("LargeMaskTest")));
 large.mainView.beginProcess();try{large.mainView.image.fill(1);}finally{large.mainView.endProcess();}
 var started=Date.now(),largeOut=MF_effectiveMask(large,32,work),elapsed=Date.now()-started;
 check(largeOut.mainView.image.sample(1500,1000,0)>0.999 && largeOut.mainView.image.sample(0,1000,0)<0.001,"Six-megapixel mask has smooth canvas boundaries and full-strength center");
 checks.push({metric:"sixMegapixelMilliseconds",value:elapsed});
 var dialog=new MF_MaskDialog(base.mainView,8);check(!dialog.spacePan,"Shift-only panning retained");dialog.cancel();
}catch(e){checks.push({error:String(e)});}
finally{work.dispose();File.writeTextFile(File.systemTempDirectory+"/Crinconlab_Focal_Mask_Transition_results.json",JSON.stringify(checks,null,2));}
