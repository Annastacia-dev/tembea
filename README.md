# Tembea

An immersive East Africa travel site built with Next.js (App Router) and three.js.

- `/`: three floating 3D islands (Serengeti safari, Kilimanjaro, Zanzibar). The camera flies between them as you scroll. Includes the offers, the 18-day "full arc" bundle and a live price estimator.
- `/climb/[route]`: walk a Kilimanjaro route day by day on a 3D model of the mountain. Routes: `lemosho`, `machame`, `marangu`, `rongai`, `umbwe`.
- `POST /api/enquiry`: validates booking requests and logs them on the server. Connect email or a CRM here to receive them.

## Run

```
npm install
npm run dev
```

Production: `npm run build`, then `npm start`.

## Where things live

| Path | What |
|---|---|
| `lib/trips.js` | Trip data and pricing rules (shared by the form and the API) |
| `lib/kili.js` | Kilimanjaro camps (published altitudes) and route itineraries |
| `lib/islandsScene.js` | Homepage three.js scene |
| `lib/climbEngine.js` | Kilimanjaro terrain, vegetation, sky, day/night cycle and playback |
| `components/` | React components that mount the scenes and render the page |

Prices, itineraries and the company are sample content. The mountain is a stylised model with 1.5× vertical exaggeration; camp altitudes, distances and hiking times are typical published figures.
