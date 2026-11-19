// The four moments of the Diani trip you can step into in 3D.
// time is local hours (Kenya, UTC+3, about 4° south: sunrise ~06:20, sunset ~18:35). Diani faces east, so the sun rises over the sea.
export const STOPS = {
  diani: {
    name: 'Sunrise on Diani Beach', day: 'Day 1', time: 6.9, mode: 'walk',
    where: 'Diani Beach, Kwale County', what: 'An early walk on the sand before the heat',
    blurb: 'Diani faces east across a lagoon sheltered by the fringing reef, so mornings start with the sun coming up out of the Indian Ocean. The sand is fine and white, and the beach runs for kilometres.',
    note: 'At low tide the lagoon drains back to the reef and you can walk far out over the sand flats. Wear reef shoes: sea urchins hide in the seagrass.',
  },
  kisite: {
    name: 'Dolphins at Kisite-Mpunguti', day: 'Day 2', time: 10.5, mode: 'swim',
    where: 'Kisite-Mpunguti Marine National Park, off Wasini Island', what: 'Snorkelling from the dhow on the Wasini tour',
    blurb: 'The Wasini tour leaves Shimoni by dhow for the marine park, where bottlenose dolphins are often seen on the way out. The boat anchors over coral gardens for snorkelling before lunch on Wasini.',
    note: 'Let the dolphins come to you: chasing them sends them off. Sightings are likely but never guaranteed.',
  },
  mappool: {
    name: 'The African Map Pool', day: 'Day 3', time: 9.6, mode: 'walk',
    where: 'Tiwi, north of the Kongo River', what: 'Low tide on the coral platform',
    blurb: 'At Tiwi a raised coral platform runs out from the beach, and in it sits a natural rock pool shaped like the African continent. Low tide exposes the platform so you can walk out and look down into it.',
    note: 'Go on a falling tide and check the tide table: the platform floods again quickly when the water turns.',
  },
  kongo: {
    name: 'Sunset at the Kongo River', day: 'Day 4', time: 18.05, mode: 'walk',
    where: 'Kongo River mouth, the north end of Diani', what: 'Evening at the river mouth by the old mosque',
    blurb: 'At the north end of Diani the Kongo River meets the sea. The sun sets inland, over the river, while the old Kongo Mosque stands among the trees on the bank.',
    note: 'The Kongo Mosque is one of the oldest on the coast. Dress modestly near it and ask before going in.',
  },
};

export const ORDER = ['diani', 'kisite', 'mappool', 'kongo'];

export const fmtTime = (h) => {
  const m = Math.round(h * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
