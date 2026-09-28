# Orbit Atlas — Three.js / WebGL, version 2

A stationary Earth with multiple animated satellites, based on your uploaded
Earth GLB and the satellite model and texture images inside your RAR archive.

## What changed

- The Earth is loaded directly from `timeworx-world-4045.glb`, including its original geometry, UVs and embedded Earth image.
- The satellite uses the actual OBJ mesh and 15 matching base-color, normal and roughness texture images from `75-satellite.rar`.
- A bundled DejaVu Sans font replaces the previous system-font stack. All interface text uses this explicit local font, avoiding symbol-glyph substitutions from local font lookup.
- Earth has no animation. The view has no automatic rotation, dragging or satellite-follow translation. Scroll/pinch changes zoom only.
- Start with four satellites; use + and - to manage 0–24 satellites. Every satellite gets a different orbital radius, inclination, phase and plane orientation.
- Earth and satellite surface materials use opacity 1, transparency off, depth writing on, and no distance fog.
- Hover over a satellite or its name to see details. Click it or a Mission list entry to pin details. Close/Escape clears the pinned selection.
- Each information card shows a fictional name and country, mission, operator, rotation speed, orbital angular speed, orbital period, inclination, demo altitude, demo signal, launch date and operational status.
- The far-away Sun, Jupiter, Mars and Neptune are small and subdued, with distance haze. They do not move or affect the orbit model.
- Show/hide orbit paths, satellite names and distant bodies independently.
- Original, gold and white satellite texture maps remain selectable, preserving the lab's texture-change feature.

## 1. Install once

1. Install VS Code: https://code.visualstudio.com/
2. Install Node.js **24 LTS**: https://nodejs.org/en/download
3. Restart VS Code after installing Node.
4. Open Terminal → New Terminal and check:

```bash
node --version
npm --version
```

Both should print version numbers. No Python, backend, API key or VS Code
extension is required to run this project. Use a modern browser with WebGL2
and graphics acceleration enabled.

## 2. Run the downloaded project

1. Extract `Satellite-Orbit-ThreeJS.zip`.
2. In VS Code, File → Open Folder → choose the inner `satellite-orbit` folder
   containing `package.json`, `src` and **public**.
3. Open a terminal in that folder.
4. Install dependencies, then start Vite:

```bash
npm ci
npm run dev
```

5. Open **http://localhost:5173/** or the exact Local URL printed by Vite.
   If 5173 is occupied, use the next port printed by the terminal.
6. Keep the terminal running. Stop it with Ctrl+C.

Initial npm installation needs internet. After installation, model loading,
textures and fonts all come from the local project. Do not double-click
index.html, and do not use a file:// URL.

## 3. Replace the previous project

The easiest path is to extract this version into a **new folder** and run it.
That avoids mixing obsolete modules and assets with the new files.

If updating the old folder in place:

1. Stop its development server with Ctrl+C.
2. Replace `index.html`, `package.json`, `package-lock.json`, and the entire `src` folder.
3. Copy the entire **public** folder from the new ZIP. Do not omit the GLB, OBJ,
   texture images or bundled font files.
4. Replace README.md and docs if you want the updated explanations.
5. Delete only the obsolete old source files `src/satellite.js` and `src/textures.js`
   if they remain. Their functionality is now in assets.js, fleet.js and background.js.
6. Run `npm ci`, then `npm run dev`.
7. In the browser press Ctrl+Shift+R to reload all styles and scripts.

## 4. Initialize an empty VS Code project instead

Run:

```bash
mkdir satellite-orbit
cd satellite-orbit
npm init -y
code .
```

If code . is unavailable, open the folder through VS Code's File menu.

Then:

1. Replace the generated package.json with the complete version in docs/SOURCE_CODE.md.
2. Create every other source file listed in that document and paste its complete code.
3. Copy the **public** folder from the ZIP into the project root. The binary
   model, image and font assets cannot be recreated by pasting JavaScript.
4. Save everything and run:

```bash
npm install
npm run dev
```

This generates a package-lock.json. Keep it for future reproducible installs.

## 5. Controls

| Input | Result |
|---|---|
| + button / + keyboard key | Add one satellite on its own orbit |
| - button / - keyboard key | Remove the pinned satellite; otherwise remove the newest |
| Mouse wheel / two-finger pinch | Zoom toward or away from the fixed Earth |
| Hover satellite or visible name | Show that satellite's data |
| Click satellite, name or Mission list entry | Pin its details |
| Close button / Escape | Clear pinned details |
| Pause button / Space | Pause/resume satellite orbit and self-rotation |
| Speed slider | Change all simulation rates between 0.2x and 3x |
| Satellite surface selector / T | Switch original, gold and white maps |
| Visibility checkboxes | Toggle orbit paths, names and distant planets/Sun |
| Reset / R | Restore four satellites, original texture, 1x speed and initial zoom |

Reset preserves the three visibility checkbox choices. Adding a satellite also
respects the current texture and orbit-path visibility setting.

Keyboard shortcuts run when the scene/body has focus. After using a form control,
click an empty area of the 3D scene before pressing keyboard shortcuts. Focused
inputs/buttons retain their native keyboard behavior. At 24 satellites, the +
button is disabled; at zero satellites, - is disabled. Zoom out to fit a large fleet.

On a phone the control panel is scrollable. Tap a name or Mission list entry
for details, since touch devices do not provide normal mouse hover.

## 6. Files: what to keep and what to edit

| File/folder | Purpose | Keep? |
|---|---|---|
| index.html | Readable interface headings, labels, buttons | Required; edit text here |
| src/main.js | Camera, lights, event handling, tooltips and rendering loop | Required |
| src/assets.js | Loads uploaded GLB/OBJ and matching texture images | Required |
| src/fleet.js | Satellite creation/removal, orbit math and dummy data | Required; edit names/data here |
| src/shaders.js | Custom Earth GLSL vertex and fragment shaders | Required for shader requirement |
| src/background.js | Distant planets, Sun, stars and orbit texture | Required by current imports; toggle background via UI |
| src/style.css | Bundled font declarations and interface layout | Required |
| public/models/earth/ | Your unchanged Earth GLB | Required |
| public/models/satellite/satellite.obj | Satellite geometry from your archive | Required |
| public/models/satellite/textures/ | Satellite texture images | Required |
| public/models/satellite/reference.jpg | Original archive preview photo | Optional reference; not loaded at runtime |
| public/fonts/ | Readable UI fonts and license notice | Required for the font fix |
| package.json / package-lock.json | npm scripts and dependency versions | Required |
| docs/ | Explanation, source-code guide, validation and screenshots | Optional for running; useful for study |
| node_modules/ | Generated dependencies | Recreated with npm ci; do not submit |
| dist/ | Generated production build | Recreated with npm run build |

The UI uses normal English text, no icon font or symbolic font substitution.
The `.brand-mark` logo and small dots are CSS shapes, not text characters.

## 7. Build and preview

```bash
npm run build
npm run preview
```

Open the printed preview URL, usually http://localhost:4173/. Rebuild after edits.
The build copies the local models, textures and fonts into dist automatically.
A bundle-size advisory can appear because Three.js and model loaders are
included; this is not a build failure.

## 8. Troubleshooting

| Issue | Fix |
|---|---|
| Text still shows symbols | Use the complete new public/fonts folder and CSS; Ctrl+Shift+R. Check that DejaVuSans.ttf and DejaVuSans-Bold.ttf return HTTP 200 in F12 → Network. Disable a browser font-replacement extension if it still overrides the page. |
| Could not load scene / 404 | Verify public/models and public/fonts were copied intact and you are running Vite from the correct project folder. |
| npm is not recognized | Reinstall Node with PATH enabled and restart VS Code. |
| npm.ps1 cannot be loaded | Use Command Prompt as the VS Code terminal profile, or run npm.cmd ci and npm.cmd run dev. |
| Missing package.json | Open the inner satellite-orbit folder, not the parent extraction folder. |
| npm ci lockfile mismatch | Use both package.json and package-lock.json from this ZIP; for a manually initialized project use npm install once. |
| Port 5173 is used | Open Vite's printed port or run npm run dev -- --port 5174. |
| Earth seems still | Intended: only satellites animate; Earth has no rotation. |
| A satellite disappears behind Earth | Intended: Earth is opaque and occludes satellites on the far side. Its label is also hidden to prevent seeing through the globe. Use the Mission list to inspect any satellite. |
| Satellites outside the screen | Zoom out, especially with a large fleet. |
| Info closes when moving away | Click the satellite to pin its card. |
| Low FPS | Reduce satellite count; cap pixel ratio to 1 in both places in main.js. Hardware acceleration improves performance. |
| WebGL startup error | Enable graphics acceleration and use a recent Chrome, Edge or Firefox with WebGL2. |

## 9. Scope and project requirements

This uses **Three.js WebGLRenderer**, custom GLSL, lighting, perspective
projection, texture maps, animation, and mouse/keyboard interaction.

Your latest requested stationary camera/zoom-only interaction replaces the
original assignment's camera-orbit-around-the-satellite behavior. If that original
camera behavior remains mandatory for grading, discuss which behavior should be
submitted. It has intentionally been removed from this version to follow your
latest instruction.

Identity, country, operator, launch date, altitude and signal values are fictional
examples. Rotation/orbit rates and periods are calculated from the animation,
not real satellite telemetry. Altitudes are not used to derive scene radii.
Sizes, lighting and distances are illustrative; this is not a physics simulator.

The models and images were supplied by you. Their redistribution license was not
present in the archive; retain any source attribution/license you received with
them. The bundled font license is in public/fonts/LICENSE.txt. Follow your course's
originality and AI-assistance rules; understand the code before demonstrating it.
