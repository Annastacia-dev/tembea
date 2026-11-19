// Sample trips. Prices and itineraries are demo content.
export const TRIPS = {
  safari: {
    name: 'Serengeti Migration Safari', short: 'Serengeti safari', kick: 'Safari · Tanzania',
    days: 7, price: 3450, best: 'Jun–Oct', good: [1, 2, 6, 7, 8, 9, 10],
    blurb: 'Seven days following the herds from Tarangire’s baobabs to the central Serengeti, finishing on the floor of Ngorongoro Crater. Open-roof vehicles, never more than six guests.',
    plan: [
      ['Day 1', 'Arrive in Arusha, garden lodge on the slopes of Mount Meru'],
      ['Day 2', 'Tarangire: elephant herds among the baobabs'],
      ['Days 3–5', 'Serengeti tented camp that moves with the migration'],
      ['Day 6', 'Ngorongoro Crater floor, black rhino country'],
      ['Day 7', 'Coffee farm lunch in Karatu, fly home'],
    ],
    inc: ['Park and crater fees', 'Full board', 'Private guide-driver', 'Airstrip transfers', 'Medical evacuation cover'],
  },
  kili: {
    name: 'Kilimanjaro via the Lemosho Route', short: 'Kilimanjaro climb', kick: 'Mountain climbing · Tanzania',
    days: 8, price: 4190, best: 'Jan–Mar, Jun–Oct', good: [1, 2, 3, 6, 7, 8, 9, 10],
    blurb: 'The quieter western route, with an extra day on the Shira Plateau so your body can acclimatise before the summit night to Uhuru Peak, 5,895 m.',
    plan: [
      ['Day 1', 'Lemosho Gate through rainforest to Mti Mkubwa camp'],
      ['Days 2–3', 'Shira Plateau, acclimatisation walk to Shira Cathedral'],
      ['Day 4', 'Climb high to Lava Tower (4,630 m), sleep low at Barranco'],
      ['Days 5–6', 'Barranco Wall and Karanga to Barafu base camp'],
      ['Day 7', 'Midnight start, sunrise on Uhuru Peak, down to Mweka'],
      ['Day 8', 'Out through the forest, certificates and lunch'],
    ],
    inc: ['Licensed mountain guides', 'Fairly paid porters', 'Park and rescue fees', 'Twice-daily health checks', 'Hotel nights either side'],
  },
  zanzibar: {
    name: 'Zanzibar Coast & Stone Town', short: 'Zanzibar beach', kick: 'Beach · Zanzibar',
    days: 5, price: 1980, best: 'Jun–Oct, Dec–Feb', good: [1, 2, 6, 7, 8, 9, 10, 12],
    blurb: 'Slow days on the white sand of the northern coast, a morning snorkelling Mnemba atoll from a wooden dhow, and an evening among the carved doorways of Stone Town.',
    plan: [
      ['Day 1', 'Stone Town on foot, dinner at Forodhani night market'],
      ['Day 2', 'Spice farm, then north to Nungwi beach'],
      ['Day 3', 'Dhow to Mnemba atoll, snorkelling with turtles'],
      ['Day 4', 'Beach day, sunset dhow cruise'],
      ['Day 5', 'Transfer to the airport'],
    ],
    inc: ['Beachfront boutique hotel', 'Breakfast and two dinners', 'Dhow and snorkel gear', 'All transfers'],
  },
  arc: { name: 'The full arc', short: 'Full arc (all three)', days: 18, price: 8990, good: [1, 2, 6, 7, 8, 9, 10] },
};

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');

// Shared pricing rules, used by the booking form and the enquiry API.
export function quote({ trip, pax, single }) {
  const t = TRIPS[trip];
  const base = t.price * pax;
  const disc = pax >= 4 ? base * 0.05 : 0;
  const sup = single ? 95 * (t.days - 1) * pax : 0;
  return { base, disc, sup, total: base - disc + sup };
}
