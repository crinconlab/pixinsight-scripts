CRINCONLAB POLYMASK — VERSION 0.1.0
Copyright © Carlos Rincón 2026

PURPOSE
Draw a polygon on one open monochrome or RGB image and create a full-resolution 32-bit grayscale mask. No astrometry, second reference, StarXTerminator or ImageSolver is required. The image can be linear or stretched. Alpha-channel images are not supported in this version.

WORKFLOW
Select a main image or Open image, then Open editor. The contour starts empty. Draw it on the left panel; the right panel shows the actual mask after Update Preview. Give the mask a unique image name, optionally enable Apply mask to the reference image, then Create Mask. The editor stays open for additional masks. Save the outputs manually.

MOUSE AND CONTOUR
Left click in an empty area adds a vertex while the contour is open. Drag a vertex to move it. Click the first vertex, or Close polygon, to close the contour. Click a closed edge to insert a vertex. Right click near a vertex for Delete vertex; the menu also provides Close polygon and Clear contour. Up to 64 vertices are supported. Duplicate points, self-intersections and zero-area contours cannot produce a mask.
Undo restores up to 50 contour edit snapshots, including deletion, insertion and dragging. Numeric vertex controls allow precise positioning. Coordinates refer to the full-resolution image; zoom never changes geometry.
Wheel: synchronized zoom around the pointer. Shift + left drag: pan both panels. Normal left drag edits vertices. Fit Image returns to the complete image; 100% shows one image pixel per display pixel.

FEATHERING AND INVERSION
Feather sigma is the Gaussian standard deviation in source-image pixels, from 0 to 256. It is not an exact transition width. Zero gives hard edges. Inward feathering softens inside the polygon and leaves every exterior pixel exactly black. Both sides uses a Gaussian transition extending inside and outside the contour. Invert mask exchanges white and black AFTER feathering.
The output includes the feathering shown in the preview. Create Mask copies the full-resolution cached mask after automatically refreshing stale calculations, so preview and output share the same float pixel values. The rendered screen preview is quantized for display; the output remains 32-bit floating point. Feathering occurs once.

DISPLAY
The reference's current STF is used by default, without changing its pixels or STF settings. For a linear image, activate an STF before opening the editor. Disable Use image STF for an unstretched display. Overlay color and opacity affect display only. Purple, cyan and red are available. White mask values receive the strongest overlay; black is transparent. The grayscale output is never stretched.

OUTPUT AND SAFETY
White allows processing, black protects and gray applies it partially. The mask has exactly the source width and height. If a source astrometric solution exists, it is copied to the output because the pixel grid is unchanged, but no solution is required. Original image pixels and selection are preserved.
Apply mask to the reference image is OFF by default. Enabling it attaches the new mask, replacing any current mask, and enables mask display. It does not alter image pixels. Previously attached mask images are never closed.
Create Mask retains a new image in the workspace, then suggests a free name for the next output. Duplicate or invalid names are blocked. Back discards the current contour and hidden preview, returning to image selection; previously created output masks remain open. Closing the editor also cleans only its own temporary preview. Nothing is saved automatically.

INSTALLATION
Keep PolyMask_EN.js with icons/polymask_orange.svg in the same package. In Script > Feature Scripts, add the folder containing the JavaScript file and click Done. Launch Script > Crinconlab > PolyMask. Help works before selecting an image; Save manual .txt exports these instructions.

LIMITS
This first version supports one polygon, up to 64 vertices, standard Gaussian edge transitions and grayscale/RGB main images without alpha. Multiple regions, holes and contour-file import/export are not included. Native processing can pause stage progress while busy; technical messages may still be written by PixInsight, but the script does not explicitly open the process console.
