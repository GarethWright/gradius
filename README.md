# Gradius · Star Command — Deep Space Edition

An independent Gradius-inspired shooter, rebuilt with Three.js. Real 3D ship and enemy models, metallic materials, lighting, engine plumes, bloom, animated boss machinery, explosions, planetary atmospheres, procedural nebulae, and scrolling terrain and debris. Combat stays on a fixed plane for accurate arcade controls.

All seven sectors, bosses, power-meter upgrades, following drones, shields, high scores, synthesized audio, keyboard/touch controls, and the Konami code are retained. Mobile text selection and callouts remain disabled on game controls.

## Development

Requires Node.js 22.12 or later and a WebGL 2-capable browser.

```sh
npm ci
npm run dev
```

Vite serves the game on port 4173. Three.js and its postprocessing modules are bundled locally; no runtime Three.js CDN is needed. Google Fonts has system-font fallbacks.

## Build and deploy

```sh
npm run check
npm test
npm run build
npx wrangler deploy --dry-run
npx wrangler login
npm run deploy
```

`npm run deploy` builds automatically before publishing. Cloudflare Worker Static Assets serves `dist/`; source and dependencies are not public assets.

For Cloudflare Workers Builds, connect https://github.com/GarethWright/gradius and set the deploy command to `npm run deploy`. A separate build command can be left empty because the deploy command builds. Keep account IDs and API tokens in the deployment environment, never in source control.

## Controls

- Arrows / WASD: move
- Space / Z: fire
- X: activate highlighted upgrade
- P / Escape: pause
- M: toggle audio
- Enter: start or resume
- Mobile: direction pad plus Fire, or drag the ship to move and fire

At the title screen or while paused: **Up Up Down Down Left Right Left Right B A** grants full equipment and 30 ships. Mobile B/A buttons support the code.

## Rendering and verification

The perspective camera maps the combat plane to the same coordinates as input and collision detection. Background objects occupy deeper layers. Pooled enemy meshes and instanced projectiles, particles, and debris limit allocations and draw calls; mobile pixel density is capped. Renderer resources are released when leaving the page. Unsupported WebGL shows a clear startup message.

The tests cover gameplay transitions, upgrades, the cheat code, boss progression, and Three.js scene construction/transforms across all sectors. Scene tests use the real Three.js geometry and object model with a mocked GPU renderer. They do not validate shaders or actual GPU performance. The available preview browser has WebGL disabled, so real-device graphics and performance verification remains outstanding.
