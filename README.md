# IronLog — gym tracker for Android

A web app (PWA) that installs on your phone and runs offline. Everything is in `index.html`; the other files are what Android needs to install it.

## Put it on your phone (free, about 5 minutes)

1. Create a GitHub repository, e.g. `ironlog`, and upload **everything in this folder** (`index.html`, `manifest.webmanifest`, `sw.js`, `icons/`).
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
3. After a minute, open `https://<your-username>.github.io/ironlog/` in **Chrome on Android**.
4. Tap **⋮ → Install app** (or **Add to Home screen**). IronLog gets its own icon, opens full screen and works with no signal in the gym.

Any static host works too (Netlify, Cloudflare Pages…). It has to be **https** for install and offline mode.

## Want a real APK?

Once the app is online, a PWA-to-Android packager such as PWABuilder (pwabuilder.com) can wrap the URL into an APK/AAB (a Trusted Web Activity) that you can sideload or publish on Google Play. Your data and code stay the same.

## Your data

- Stored on the phone (browser storage of the installed app). Nothing is sent anywhere.
- **Settings → Save backup** makes a `.json` file; **Import file** restores it. Do this before changing phones or clearing Chrome data.
- **Export CSV** opens in Excel / Google Sheets. CSV exports from the old IronLog can be imported too.

## Editing the code

The editable source is in `src/` (CSS, HTML, and the JavaScript split into modules). Run `python3 build.py` to rebuild `dist/index.html`. When you publish a new version, bump `VERSION` in `sw.js` so phones pick up the update.

## How it calculates things

- **Est. 1RM**: Epley formula, weight × (1 + reps ÷ 30).
- **Go-up hint**: if every set of an exercise reached the top of its rep range last time, the app suggests adding one weight jump (2.5 kg / 5 lb by default; change it in Settings).
- **PRs**: a session is a record when it beats your best est. 1RM or your heaviest set for that exercise. Bodyweight exercises count most reps. PRs start from your second session of an exercise.
- **Volume**: weight × reps of every ticked set.
