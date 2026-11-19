// The four moments of the safari you can step into in 3D.
// time is local hours (Tanzania, UTC+3, 2–4° south: sunrise ~06:35, sunset ~18:50).
export const MOMENTS = {
  tarangire: {
    name: 'Elephants among the baobabs', day: 'Day 2', time: 7.6, mode: 'drive',
    where: 'Tarangire National Park', what: 'Morning game drive in a pop-top Land Cruiser',
    blurb: 'In the dry season Tarangire holds one of the densest elephant populations in Tanzania. Families move between ancient baobabs to the river, and the light is soft for the first two hours after sunrise.',
    note: 'Baobabs here can be well over a thousand years old. Elephants strip their bark for water in the driest months, which is why many trunks look scarred.',
  },
  migration: {
    name: 'The migration at the river', day: 'Day 3', time: 16.2, mode: 'drive',
    where: 'Northern Serengeti', what: 'Afternoon drive to a crossing point',
    blurb: 'Over a million wildebeest, with zebra among them, follow the rains in a loop through the Serengeti. From July to October the herds bunch up at the rivers before plunging across.',
    note: 'Guides park well back from the bank and wait with the engine off: a crossing can start in seconds, or not at all, after hours of hesitation.',
  },
  balloon: {
    name: 'Balloon at sunrise', day: 'Day 4 · optional', time: 6.65, mode: 'fly',
    where: 'Central Serengeti', what: 'Dawn balloon flight drifting over the herds',
    blurb: 'Lift-off is just before sunrise. For about an hour the balloon drifts with the morning wind, sometimes low enough to hear the herds, sometimes a few hundred metres up over the plains.',
    note: 'Pilots steer only by changing height: different layers of air move in different directions, so climbing or sinking changes your course.',
  },
  camp: {
    name: 'Night in a tented camp', day: 'Day 4', time: 20.6, mode: 'walk',
    where: 'Mobile camp beside a kopje', what: 'Campfire, stars and the sounds of the bush',
    blurb: 'The camp moves with the migration, so you sleep close to the herds. After dinner there is a fire under a sky with no light pollution; an askari walks you to your tent.',
    note: 'Look out past the lanterns: eyeshine at the edge of the light is usually hyena or jackal. A lion’s roar carries for kilometres on a still night.',
  },
};

export const ORDER = ['tarangire', 'migration', 'balloon', 'camp'];

export const fmtTime = (h) => {
  const m = Math.round(h * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
