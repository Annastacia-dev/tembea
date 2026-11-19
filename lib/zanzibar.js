// The four moments of the Zanzibar trip you can step into in 3D.
// time is local hours (Zanzibar is UTC+3, close to the equator: sunrise ~06:20, sunset ~18:40 all year).
export const STOPS = {
  night: {
    name: 'First night on the beach', day: 'Day 2', time: 20.75, mode: 'walk',
    where: 'Nungwi, northern tip of Unguja', what: 'Barefoot walk, bonfire, stars',
    blurb: 'You arrive from the spice farm in the late afternoon. After dinner the hotel lights a fire on the sand; the Milky Way is bright enough to throw a faint glow on the water.',
    note: 'Away from the lanterns, give your eyes a few minutes: with no city glow to the north, the band of the Milky Way rises over the sea.',
  },
  mnemba: {
    name: 'Snorkelling the reef', day: 'Day 3', time: 10.5, mode: 'swim',
    where: 'Mnemba Atoll conservation area', what: 'Snorkel among coral heads, follow a green turtle',
    blurb: 'A dhow takes you out to the atoll in the morning, when the water is calmest. Coral heads rise from a sandy floor 6 to 9 m down, with reef fish in schools and green turtles grazing.',
    note: 'Sunlight ripples across the sand as moving caustics. Visibility is often 15–20 m, and the water is around 27 °C.',
  },
  nungwi: {
    name: 'Beach day', day: 'Day 4', time: 9.25, mode: 'walk',
    where: 'Nungwi beach', what: 'Walk the shoreline, wade in the lagoon',
    blurb: 'Fine white coral sand, palm-thatch parasols and ngalawa outrigger canoes pulled up above the tide line. The lagoon stays shallow and turquoise for a long way out.',
    note: 'Nungwi is one of the few Zanzibar beaches where the tide barely changes the swimming, so you can wade out at almost any hour.',
  },
  dhow: {
    name: 'Sunset dhow cruise', day: 'Day 4', time: 17.6, mode: 'sail',
    where: 'Off the west-facing shore', what: 'Sail under a lateen sail as the sun sets',
    blurb: 'A wooden dhow with a single triangular lateen sail, the design that has carried trade along this coast for centuries. You sail along the reef as the sun drops into the Indian Ocean.',
    note: 'The sun sets around 18:40 here all year round, and on the equator it goes down almost vertically, so dusk is short.',
  },
};

export const ORDER = ['night', 'mnemba', 'nungwi', 'dhow'];

export const fmtTime = (h) => {
  const m = Math.round(h * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
