# Patience — The Art of Becoming

Patience is a mobile-first, installable tracker for life goals, daily check-ins, and reflection. Patience measures how you felt on a 0–100 scale. Discipline measures the share of recorded disciplined actions among disciplined actions and reactive decisions. A check-in can record impatience and disciplined behavior at the same time.

## Run locally

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

To test installation and offline use, run `npm run build` and `npm run preview`. The service worker is only registered in the production build.

## Records and backups

Personal and demo records live in separate IndexedDB profiles. Each browser profile and each website's origin has its own data. To move records between devices or between GitHub Pages and Netlify, export a JSON backup in Settings and import it at the destination. The CSV export contains check-in history.

## Deployment

- **GitHub Pages** uses the GitHub Actions publishing source. The included workflow builds and publishes `dist` on pushes to `main`.
- **Netlify** uses `netlify.toml` to build and publish `dist`. To publish a local production build from a linked Netlify project, run `npm run build` and `netlify deploy --prod --dir=dist`.
