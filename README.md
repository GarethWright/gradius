# Gradius · Star Command

An independent browser arcade tribute with original graphics and synthesized audio. Seven sectors, bosses, power-meter upgrades, following drones, shields, keyboard/touch controls, and the Konami code. Includes the mobile text-selection/callout fix.

## Development

Requires Node.js 22 or later.

```sh
npm install
npm run dev
```

## Cloudflare Workers deployment

Configured as a Worker with Static Assets. No server script or database is required. Only public/ is uploaded as web assets.

```sh
npx wrangler login
npm run check
npm run build
npm run deploy
```

Wrangler prints the live URL on success. For CI, set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID as environment secrets, never in source control.

## Repository and automatic deployments

Source: https://github.com/GarethWright/gradius

Connect this repository in Cloudflare Workers Builds and use `npm run deploy` as the deploy command. Application compilation is not required. Install dependencies with `npm ci`.

## Controls

Arrows/WASD: move. Space/Z: fire. X: upgrade. P/Escape: pause. M: sound. Enter: start/resume.

Mobile: use the direction pad and Fire, or drag the ship to move and fire.

Title screen or paused: Up Up Down Down Left Right Left Right B A grants full equipment and 30 ships. Mobile B/A buttons support the same code.

Fonts load from Google Fonts with local fallbacks. High scores are stored in browser localStorage.
