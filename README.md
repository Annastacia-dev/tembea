# Tembea

An immersive East Africa travel site built with Next.js (App Router) and three.js.

- `/`: one continuous 3D landscape behind the page. As you scroll, the camera travels from a Serengeti sunrise through the safari, past Kilimanjaro, to a Zanzibar beach, Stone Town at dusk and the harbour at night. Includes the offers, the 18-day "full arc" bundle and a live price estimator.
- `/climb/[route]`: walk a Kilimanjaro route day by day on a 3D model of the mountain. Routes: `lemosho`, `machame`, `marangu`, `rongai`, `umbwe`.
- `/zanzibar/[stop]`: step into four moments of the Zanzibar trip at walking scale: `night` (bonfire and Milky Way), `mnemba` (snorkel the reef with a turtle), `nungwi` (walk the beach and wade the lagoon), `dhow` (sunset cruise). Time of day is adjustable; optional surf sound.
- `/safari/[moment]`: four moments of the safari on a modelled savanna: `tarangire` (morning drive among elephants and baobabs), `migration` (the herds at the river), `balloon` (sunrise flight), `camp` (night by the fire). Your guide drives the Land Cruiser and stops at sightings, or you take the wheel.
- `/diani/[stop]`: four moments on the Kenyan south coast, on the same beach engine: `diani` (sunrise walk), `kisite` (snorkel with dolphins at Kisite-Mpunguti on the Wasini tour), `mappool` (the African Map Pool at Tiwi at low tide), `kongo` (sunset at the Kongo River mouth by the old mosque).
- `/stonetown/[moment]`: `rooftop` (sundowner over the harbour), `forodhani` (the night food market), `lanes` (a morning walk past the carved doors).
- `/mombasa/[moment]`: `oldtown` (afternoon in the Old Town lanes), `fort` (on a bastion of Fort Jesus), `creek` (dhow dinner on the harbour).

Every trip card on the home page has an "Explore it in 3D" link into its experience.
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
| `lib/beachEngine.js` | Zanzibar and Diani coasts: lagoon water shader, reef, palms, dhows, walking/swimming/sailing; Diani adds the Kongo River, the mosque, the Tiwi coral platform with its map pool, and dolphins |
| `lib/diani.js` | The four Diani moments |
| `lib/towns.js` | The Stone Town and Mombasa moments |
| `lib/townEngine.js` | Old Swahili town at walking scale: generated lanes and coral-stone houses with carved doors and balconies, the Old Fort, Forodhani market, Fort Jesus, the waterfront and dhows |
| `lib/safari.js` | The four safari moments (text, times, modes) |
| `lib/safariEngine.js` | Savanna: GPU grass, acacias and baobabs, migration herd, elephants, giraffes, lions, game drive, balloon, camp |
| `lib/climbEngine.js` | Kilimanjaro terrain, vegetation, sky, day/night cycle and playback |
| `components/` | React components that mount the scenes and render the page |

Prices, itineraries and the company are sample content. The mountain is a stylised model with 1.5× vertical exaggeration; camp altitudes, distances and hiking times are typical published figures. The Zanzibar coast is a modelled impression of Nungwi, with the reef placed much closer to shore than Mnemba really is. Diani, Tiwi and Kisite-Mpunguti are drawn much closer together than they are, and the two towns are generated impressions, not maps.
