#engine v8
#define RGB_DUAL_LIBRARY
#define POLYMASK_LIBRARY
#include "../src/scripts/crinconlab/RGB_Ha_Blend.js"
#include "../src/scripts/crinconlab/PolyMask_EN.js"
var setup=new RD_Dialog;setup.execute();
// Construct only: this UI test never reads or writes the real suppression preference.
var news=new PM_WhatsNewDialog;news.execute();
