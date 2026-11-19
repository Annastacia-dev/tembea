// Kilimanjaro waypoints: name, x km east and z km south of Kibo (model space), published altitude in m, note.
export const WP = {
  lg: ['Londorossi–Lemosho Gate', -17, 3, 2100, 'A remote western start in thick forest, where elephant and buffalo sometimes cross the track.'],
  mti: ['Mti Mkubwa Camp', -14.4, 2.6, 2650, '"Big tree" camp, deep in the forest under curtains of old man\'s beard moss. Colobus monkeys call at dawn.'],
  sh1: ['Shira 1 Camp', -10.6, 1.6, 3505, 'Out of the trees onto the Shira Plateau, an ancient collapsed caldera with Kibo in full view to the east.'],
  sh2: ['Shira 2 Camp', -6.8, 2.1, 3850, 'Moorland camp on the plateau\'s eastern edge. Sunsets over Mount Meru, frost on the tent by morning.'],
  lava: ['Lava Tower', -3.3, 2, 4630, 'A 90 m volcanic plug. Lunch here is the climb-high, sleep-low test: mild headaches are normal.'],
  bar: ['Barranco Camp', -1.9, 4.4, 3960, 'A valley of giant groundsels under the 257 m Barranco Wall, tomorrow\'s hands-on scramble.'],
  kar: ['Karanga Camp', 0.7, 4.6, 3995, 'After the Barranco Wall and the "kissing rock". The last water point before the summit.'],
  baf: ['Barafu Camp', 2.6, 3.1, 4673, '"Barafu" means ice in Swahili. A rocky, wind-blown ridge: early dinner, sleep until about 11 pm.'],
  stel: ['Stella Point', 0.75, 0.35, 5756, 'The crater rim, usually reached around sunrise after six hours of switchbacks on frozen scree.'],
  uhu: ['Uhuru Peak', -0.3, 0.45, 5895, 'The highest point in Africa, between the crater and the Southern Icefields.'],
  mwc: ['Mweka Camp', 3.8, 9.3, 3100, 'Back at the edge of the forest. Thick air and the first deep sleep in days.'],
  mwg: ['Mweka Gate', 5, 15, 1640, 'Certificates, a cold drink and the crew\'s farewell song.'],
  mag: ['Machame Gate', -10, 13, 1800, 'Registration under the trees, then straight into dripping montane rainforest.'],
  mac: ['Machame Camp', -8.4, 7.8, 3000, 'Camp at the top of the forest, where the giant heathers begin.'],
  umg: ['Umbwe Gate', -4, 15, 1640, 'The steepest, most direct way up, along a narrow forest ridge.'],
  umc: ['Umbwe Cave Camp', -3.1, 9, 2850, 'Camp under rock overhangs high on the ridge, with drops on both sides.'],
  mrg: ['Marangu Gate', 14, 14, 1860, 'The oldest route on the mountain, with huts instead of tents all the way.'],
  man: ['Mandara Hut', 12, 10, 2700, 'A-frame huts at the forest\'s upper edge, with a short side walk to Maundi Crater.'],
  hor: ['Horombo Hut', 8.4, 5.4, 3720, 'A busy hut village on the moorland where climbers going up meet those coming down.'],
  zeb: ['Zebra Rocks', 7.3, 3.9, 4020, 'An acclimatisation walk to striped black-and-white cliffs, then back down to sleep.'],
  kib: ['Kibo Hut', 4.3, -0.7, 4703, 'A stone hut on the bare, lunar Saddle between Kibo and Mawenzi.'],
  gil: ['Gilman\'s Point', 1.25, -0.45, 5685, 'Top of the long scree wall onto the crater rim. Another 1.5 hours along the rim to Uhuru.'],
  rog: ['Rongai Gate', 12, -17, 1950, 'Near the Kenyan border on the drier northern side, among pine plantations and farms.'],
  sim: ['Simba Camp', 10.3, -13, 2600, 'At the edge of the moorland on the quiet north slope.'],
  sec: ['Second Cave', 9.2, -9, 3450, 'Lava caves and wide views back over the plains of Kenya.'],
  kik: ['Kikelewa Camp', 11.3, -5.8, 3600, 'A sheltered camp in a valley of giant groundsels.'],
  mwt: ['Mawenzi Tarn', 8.6, -2.4, 4330, 'A small lake under the jagged spires of Mawenzi, the mountain\'s second peak.'],
};

// Step: [from, to, walking hours, km, start rule]
// start rule: n = next morning 08:00, l = after a 1 h lunch, c = straight on, b = after a 2 h brunch, s = summit night 23:30
const SUM = [['baf', 'stel', 6, 4, 's'], ['stel', 'uhu', 1, 1, 'c'], ['uhu', 'baf', 2.5, 5, 'c'], ['baf', 'mwc', 3.5, 8, 'b'], ['mwc', 'mwg', 3.5, 10, 'n']];
const NSUM = [['kib', 'gil', 6, 5, 's'], ['gil', 'uhu', 1.5, 2, 'c'], ['uhu', 'gil', 1, 2, 'c'], ['gil', 'kib', 2, 4.5, 'c'], ['kib', 'hor', 3, 9.5, 'b'], ['hor', 'man', 3.5, 11, 'n'], ['man', 'mrg', 2.5, 7.5, 'l']];

export const ROUTES = {
  lemosho: {
    name: 'Lemosho', col: '#ff6a3d', start: 'Londorossi Gate, west', sleep: 'Barafu, 4,673 m', feel: 'Remote, scenic, gradual',
    blurb: 'Starts in remote western rainforest, crosses the whole Shira Plateau, then joins the southern circuit. Its slow gain gives the gentlest acclimatisation of the camping routes.',
    steps: [['lg', 'mti', 3, 6, 'n'], ['mti', 'sh1', 5.5, 8, 'n'], ['sh1', 'sh2', 5, 10, 'n'], ['sh2', 'lava', 4, 7, 'n'], ['lava', 'bar', 2, 3, 'l'], ['bar', 'kar', 4, 5, 'n'], ['kar', 'baf', 3.5, 4, 'n'], ...SUM],
  },
  machame: {
    name: 'Machame', col: '#ffd08a', start: 'Machame Gate, southwest', sleep: 'Barafu, 4,673 m', feel: 'Popular, steep, varied',
    blurb: 'Nicknamed the "Whiskey route": tougher than Marangu, with the best scenery-to-days ratio. Busy in peak season.',
    steps: [['mag', 'mac', 6, 11, 'n'], ['mac', 'sh2', 5, 5, 'n'], ['sh2', 'lava', 4, 7, 'n'], ['lava', 'bar', 2, 3, 'l'], ['bar', 'kar', 4, 5, 'n'], ['kar', 'baf', 3.5, 4, 'n'], ...SUM],
  },
  marangu: {
    name: 'Marangu', col: '#7cc4ff', start: 'Marangu Gate, southeast', sleep: 'Kibo Hut, 4,703 m', feel: 'Huts, gentle gradient, same way down',
    blurb: 'The "Coca-Cola route": sleep in huts, a steady gradient and a rest day at Horombo. The summit night up the scree to Gilman\'s Point is long.',
    steps: [['mrg', 'man', 4.5, 8, 'n'], ['man', 'hor', 6.5, 11, 'n'], ['hor', 'zeb', 1.5, 2.5, 'n'], ['zeb', 'hor', 1, 2.5, 'l'], ['hor', 'kib', 6.5, 9.5, 'n'], ...NSUM],
  },
  rongai: {
    name: 'Rongai', col: '#7fdca6', start: 'Rongai Gate, north', sleep: 'Kibo Hut, 4,703 m', feel: 'Quiet, dry, wilderness',
    blurb: 'The only route from the north. Drier and much quieter, with a night at Mawenzi Tarn under the second peak, then down the Marangu side.',
    steps: [['rog', 'sim', 3.5, 7, 'n'], ['sim', 'sec', 3.5, 6, 'n'], ['sec', 'kik', 3.5, 6, 'n'], ['kik', 'mwt', 3.5, 4, 'n'], ['mwt', 'kib', 4.5, 9, 'n'], ...NSUM],
  },
  umbwe: {
    name: 'Umbwe', col: '#e7a6ff', start: 'Umbwe Gate, south', sleep: 'Barafu, 4,673 m', feel: 'Steep, direct, for the experienced',
    blurb: 'The shortest and steepest way up: a hard forest ridge on day one, then the southern circuit. Little time to acclimatise.',
    steps: [['umg', 'umc', 6, 11, 'n'], ['umc', 'bar', 5, 6, 'n'], ['bar', 'kar', 4, 5, 'n'], ['kar', 'baf', 3.5, 4, 'n'], ...SUM],
  },
};

export const routeTotals = (k) => {
  const steps = ROUTES[k].steps;
  return { km: steps.reduce((s, x) => s + x[3], 0) };
};
