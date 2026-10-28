# Andromeda Observatory
A full-screen cinematic astronomy instrument. WebGL particle galaxy: ivory-gold nucleus, dusty amber spirals, pale blue stars, deep black space. Artistic model, not a scientific reconstruction.
Typography: Poppins display/body and monospace instrument readouts. Oversized lightweight title and tracked uppercase labels. Colors: #07090d background, translucent #11151b panels, #f3f1ec text, #89919c secondary, #e8ba78 accent. Hairline borders, 14px corners.
Layout: masthead, editorial title top left, narrow observation controls right, galaxy dominating the center, floating bottom camera toolbar, footer provenance. On phones hide controls behind a settings toggle.
Interactions: orbit, pinch/wheel zoom, camera presets, animation pause, brightness, layer controls, reset, fullscreen, PNG capture. Accessible labeled controls. No new API routes or database tables. UI in pages/observatory.tsx and components/galaxy.tsx; index.tsx re-exports the page. Respect reduced motion.
