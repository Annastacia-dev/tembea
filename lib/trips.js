// Sample trips. Prices and itineraries are demo content.
export const TRIPS = {
  safari: {
    cat: 'safari', name: 'Serengeti Migration Safari', short: 'Serengeti safari', kick: 'Safari · Tanzania',
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
    cat: 'mountain', name: 'Kilimanjaro via the Lemosho Route', short: 'Kilimanjaro climb', kick: 'Mountain climbing · Tanzania',
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
    cat: 'beach', place: 'Zanzibar', name: 'Zanzibar Coast & Stone Town', short: 'Zanzibar beach', kick: 'Beach · Zanzibar',
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
    acts: ['Mnemba atoll snorkelling', 'Sunset dhow cruise', 'Spice farm tour', 'Stone Town walk', 'Forodhani night market'],
  },
  diani: {
    cat: 'beach', place: 'Diani', name: 'Diani Beach & Wasini Island', short: 'Diani beach', kick: 'Beach · Kenya south coast',
    days: 5, price: 1760, best: 'Dec–Mar, Jul–Oct', good: [1, 2, 3, 7, 8, 9, 10, 12],
    blurb: 'Seventeen kilometres of white sand south of Mombasa, sheltered by a coral reef and backed by coastal forest. A full day by dhow to the Kisite-Mpunguti marine park and Wasini Island, and colobus monkeys in the trees behind the beach.',
    plan: [
      ['Day 1', 'Fly into Ukunda airstrip, beachfront hotel in Diani'],
      ['Day 2', 'Wasini Island tour: dhow from Shimoni, dolphins and snorkelling in Kisite-Mpunguti, Swahili seafood lunch on Wasini'],
      ['Day 3', 'Colobus Conservation walk and Kaya Kinondo sacred forest; low tide at the African Map Pool in Tiwi, a natural rock pool shaped like the continent'],
      ['Day 4', 'Beach day, optional kitesurf lesson; sunset where the Kongo River meets the sea, by the old Kongo Mosque'],
      ['Day 5', 'Transfer to Ukunda or Mombasa'],
    ],
    inc: ['Beachfront hotel', 'Breakfast and two dinners', 'Wasini day trip with park fees and lunch', 'Colobus walk', 'All transfers'],
    acts: ['Wasini Island tour', 'Dolphins at Kisite-Mpunguti', 'Reef snorkelling', 'Shimoni caves', 'African Map Pool, Tiwi', 'Kongo River sunset', 'Colobus monkey walk', 'Kaya Kinondo forest', 'Kitesurfing'],
  },
  stonetown: {
    cat: 'city', place: 'Stone Town', name: 'Stone Town Heritage', short: 'Stone Town city break', kick: 'City · Zanzibar',
    days: 3, price: 890, best: 'Jun–Oct, Dec–Feb', good: [1, 2, 6, 7, 8, 9, 10, 12],
    blurb: 'The old Swahili trading town on Zanzibar’s west coast, a UNESCO World Heritage Site: carved wooden doors, coral-stone houses, spice stalls, and food grilled on the waterfront at dusk.',
    plan: [
      ['Day 1', 'Arrive, rooftop dinner over the old town'],
      ['Day 2', 'Guided walk: Old Fort, Darajani market, the cathedral on the site of the last slave market; Forodhani night market'],
      ['Day 3', 'Boat to Prison Island’s giant tortoises, then the airport'],
    ],
    inc: ['Heritage hotel in the old town', 'Breakfast daily', 'Licensed local guide', 'Boat trip', 'All transfers'],
    acts: ['Old town walking tour', 'Darajani market', 'Forodhani night market', 'Prison Island tortoises', 'Rooftop sunsets'],
  },
  mombasa: {
    cat: 'city', place: 'Mombasa', name: 'Mombasa Old Town & Fort Jesus', short: 'Mombasa city break', kick: 'City · Kenya coast',
    days: 3, price: 790, best: 'Dec–Mar, Jul–Oct', good: [1, 2, 3, 7, 8, 9, 10, 12],
    blurb: 'Kenya’s oldest city: Fort Jesus, built by the Portuguese in the 1590s and now a UNESCO site, the narrow lanes and carved balconies of the Old Town, and dinner on a dhow in the creek. An easy add-on before Diani, about an hour south.',
    plan: [
      ['Day 1', 'Arrive, evening walk through the Old Town'],
      ['Day 2', 'Fort Jesus museum, Marikiti market, dhow dinner cruise on the creek'],
      ['Day 3', 'Free morning, then on to Diani or the airport'],
    ],
    inc: ['Boutique hotel', 'Breakfast daily, one dinner', 'Licensed local guide', 'Fort Jesus entry', 'All transfers'],
    acts: ['Fort Jesus', 'Old Town walk', 'Marikiti market', 'Dhow dinner cruise', 'Swahili street food'],
  },
  arc: { cat: 'combo', name: 'The full arc', short: 'Full arc (all three)', days: 18, price: 8990, good: [1, 2, 6, 7, 8, 9, 10] },
};

// Destination categories, in the order they appear on the page.
export const CATS = [
  { k: 'mountain', label: 'Mountain', trips: ['kili'] },
  { k: 'safari', label: 'Safari', trips: ['safari'] },
  { k: 'beach', label: 'Beach', trips: ['zanzibar', 'diani'] },
  { k: 'city', label: 'City', trips: ['stonetown', 'mombasa'] },
];

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
