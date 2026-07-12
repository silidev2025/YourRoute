# YourRoute - CITU Room Finder

A web app to help CITU students find rooms on campus. "Asa sa CIT ang \_\_\_?" Finally answered.

## Features

- Search rooms by name, building, college, division
- Filter rooms by Building, College, or Division
- View room schedules with visual timetable display
- Building information with directions and OpenStreetMap integration
- Room-specific directions for commonly asked-about rooms
- Mobile-responsive design with accessibility features
- Offline support in cases where data is not accessible

## Data

Course and room listings are maintained for CITU students and updated each term; they currently reflect January 2026 data.

## Development/Contribution

To run locally, install [Bun.js](https://bun.sh/), install dependencies, then start Astro:

```sh
bun install
bun run dev
```

The app normally opens at `http://localhost:4321`. If that port is already busy, Astro will choose another port.

### Test On Your Phone

Use the mobile dev script to expose the Astro server to other devices on the same Wi-Fi network:

```sh
bun run dev:mobile
```

If Bun is not installed, use npm:

```sh
npm run dev:mobile
```

Find your computer's local IPv4 address:

```powershell
ipconfig
```

On your phone, connect to the same Wi-Fi network and open:

```text
http://YOUR_IPV4_ADDRESS:4321
```

For example, if your IPv4 address is `192.168.1.25`, open `http://192.168.1.25:4321`.

If the page does not load, allow Node.js/Bun through Windows Firewall for private networks, then restart `bun run dev:mobile`.

### Test On Your Phone With Mobile Data

If your phone cannot connect to the same Wi-Fi, use the production preview when testing PWA/offline behavior. Dev mode does not serve the generated service worker.

```sh
npm run preview:pwa:mobile
```

Then open a temporary Cloudflare tunnel in another terminal:

```sh
npm run tunnel:cloudflare
```

Copy the generated `https://...trycloudflare.com` URL and open it on your phone. Keep both terminal processes running while you test.

After the app says it is ready to work offline, keep the exact same tunnel URL open or install it to your home screen before turning off internet. Offline caching is tied to the exact URL where the service worker was installed.

If an offline refresh shows unstyled text instead of the full app, the phone is still using an old or incomplete service worker cache. Turn internet back on, refresh until the app shows normally and says it is ready to work offline, then test offline again. If it still happens, clear site data for the tunnel URL or uninstall the installed PWA, then open the URL online and install it again.

## Edit From Another Computer

This repository includes a GitHub Codespaces setup, so you can edit the project even when you are not on your laptop.

1. Open `https://github.com/manciafrancisdave/YourRoute`.
2. Click `Code`.
3. Open the `Codespaces` tab.
4. Click `Create codespace on main`.
5. Wait for setup to finish.
6. In the Codespaces terminal, run:

```sh
bun run dev -- --host 0.0.0.0
```

7. Open the forwarded Astro port, usually `4321`.

When you finish editing from another computer:

```sh
git status
git add .
git commit -m "Describe your change"
git push origin main
```

When you return to your laptop, run:

```sh
git pull origin main
```

The data is stored in the info.db file, and may be accessed using sqlite. If you are not familiar with using SQL, you may run the following command to open up drizzle studio and start correcting data:

```sh
bunx drizzle-kit studio
```

After that, you may open a pull request and describe the changes.

## Project structure

This project uses [Astro](https://astro.build), and may have the following folders:

- `/public` - All the static assets that can be requested by the route
- `/src/routes` - All of the routes used by the website
- `/src/components` - All of the frontend components used by the website
- `/src/assets` - All other internal assets used by the program
- `/src/lib` - where helper Typescript functions are located

## GitHub Checks

Every push to `main` runs a GitHub Actions build check. The check installs dependencies with Bun and runs:

```sh
bun run build
```

## License

[MIT License](LICENSE)

### Third-party assets

- [Oiiaioooooiai Cat](https://sketchfab.com/3d-models/oiiaioooooiai-cat-30d27bf7fb224849b76e208a6eccdb36) by [Zhuier](https://sketchfab.com/Zhuier), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The model is used as the indoor navigation guide.
- [Low Poly Dog](https://sketchfab.com/3d-models/low-poly-dog-335f2250195c407bac91695fbdd193e1) by [Rodesqa](https://sketchfab.com/rodesqa), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Low Poly Bird (Animated)](https://sketchfab.com/3d-models/low-poly-bird-animated-82ada91f0ac64ab595fbc3dc994a3590) by [Charlie Tinley](https://sketchfab.com/Tnkii), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Low poly rigged character](https://sketchfab.com/3d-models/low-poly-rigged-character-free-9dba83ce8a3e4a9ab13bd991e7276621) by [Legend](https://sketchfab.com/Legend_01), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Hulk](https://sketchfab.com/3d-models/hulk-96274605878d4a4e9c2b964fd5bd9ee1) by [shreyhaldkar0](https://sketchfab.com/shreyhaldkar0), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Developer

Developed by Francis Dave P. Mancia
