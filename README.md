# Tembea

An immersive East Africa travel site built with Next.js (App Router) and three.js.

- `/`: one continuous 3D landscape behind the page. As you scroll, the camera travels from a Serengeti sunrise through the safari, past Kilimanjaro, to a Zanzibar beach, Stone Town at dusk and the harbour at night. Includes the offers, the 18-day "full arc" bundle and a live price estimator.
- `/climb/[route]`: walk a Kilimanjaro route day by day on a 3D model of the mountain. Routes: `lemosho`, `machame`, `marangu`, `rongai`, `umbwe`.
- `/zanzibar/[stop]`: step into four moments of the Zanzibar trip at walking scale: `night` (bonfire and Milky Way), `mnemba` (snorkel the reef with a turtle), `nungwi` (walk the beach and wade the lagoon), `dhow` (sunset cruise). Time of day is adjustable; optional surf sound.
- `/safari/[moment]`: four moments of the safari on a modelled savanna: `tarangire` (morning drive among elephants and baobabs), `migration` (the herds at the river), `balloon` (sunrise flight), `camp` (night by the fire). Your guide drives the Land Cruiser and stops at sightings, or you take the wheel.
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
| `lib/landingScene.js` | Homepage landscape and scroll camera |
| `lib/zanzibar.js` | The four Zanzibar moments (text, times, modes) |
| `lib/beachEngine.js` | Zanzibar coast: lagoon water shader, reef, palms, dhows, walking/swimming/sailing |
| `lib/safari.js` | The four safari moments (text, times, modes) |
| `lib/safariEngine.js` | Savanna: GPU grass, acacias and baobabs, migration herd, elephants, giraffes, lions, game drive, balloon, camp |
| `lib/climbEngine.js` | Kilimanjaro terrain, vegetation, sky, day/night cycle and playback |
| `components/` | React components that mount the scenes and render the page |

Prices, itineraries and the company are sample content. The mountain is a stylised model with 1.5× vertical exaggeration; camp altitudes, distances and hiking times are typical published figures. The Zanzibar coast is a modelled impression of Nungwi, with the reef placed much closer to shore than Mnemba really is.
