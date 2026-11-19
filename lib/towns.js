// The old Swahili towns you can step into in 3D: Stone Town and Mombasa Old Town.
// time is local hours (UTC+3). Stone Town faces west over its harbour; Mombasa's Old Town faces east over the Old Port.
export const PLACES = {
  stonetown: {
    title: 'Stone Town in 3D', seaWest: true,
    order: ['rooftop', 'forodhani', 'lanes'],
    moments: {
      rooftop: {
        name: 'Sunset from a rooftop', day: 'Day 1', time: 18.0, mode: 'view',
        where: 'A rooftop terrace above the harbour', what: 'A sundowner as the dhows come in',
        blurb: 'Stone Town faces west over the harbour, so the sun goes down over the sea. From the rooftops you look across rusted tin roofs and minarets to the dhows at anchor.',
        note: 'Many hotel rooftop bars welcome non-guests at sunset. Arrive early for a seat at the edge.',
      },
      forodhani: {
        name: 'Forodhani night market', day: 'Day 1', time: 19.3, mode: 'walk',
        where: 'Forodhani Gardens, on the waterfront', what: 'Dinner at the food stalls',
        blurb: 'Each evening the waterfront gardens beside the Old Fort fill with stalls grilling seafood and skewers under lanterns. Zanzibar pizza, a stuffed pancake cooked on a griddle, is the thing to try.',
        note: 'Agree prices before you order, and choose seafood that is grilled in front of you.',
      },
      lanes: {
        name: 'The old town lanes', day: 'Day 2', time: 10.4, mode: 'walk',
        where: 'Stone Town, Zanzibar City', what: 'A guided morning walk',
        blurb: 'The lanes are too narrow for cars: coral-stone houses of three and four storeys lean over paths a few metres wide, and many still keep their heavy carved wooden doors.',
        note: 'Doors with square tops are usually the older, Omani style. Rounded tops and brass studs came with craftsmen from India.',
      },
    },
  },
  mombasa: {
    title: 'Mombasa in 3D', seaWest: false,
    order: ['oldtown', 'fort', 'creek'],
    moments: {
      oldtown: {
        name: 'Old Town lanes', day: 'Day 1', time: 16.6, mode: 'walk',
        where: 'Mombasa Old Town', what: 'An afternoon walk',
        blurb: 'Behind the fort, the Old Town is a knot of narrow streets lined with Swahili houses, carved doors and overhanging wooden balconies, with spice shops and coffee sellers on the corners.',
        note: 'Street coffee sellers pour strong, spiced kahawa into tiny cups. Dress modestly in the Old Town.',
      },
      fort: {
        name: 'On the walls of Fort Jesus', day: 'Day 2', time: 9.2, mode: 'view',
        where: 'Fort Jesus, Mombasa Island', what: 'Looking out from a bastion',
        blurb: 'The Portuguese built Fort Jesus in the 1590s to guard the harbour, and it changed hands several times over the following centuries. Its thick walls and angled bastions, and the museum inside, are a UNESCO World Heritage Site.',
        note: 'Go early, before the heat and the tour groups. The bastions look straight out over the harbour entrance.',
      },
      creek: {
        name: 'Dhow dinner on the harbour', day: 'Day 2', time: 19.2, mode: 'sail',
        where: 'Mombasa harbour, below the Old Town', what: 'Evening dhow cruise',
        blurb: 'After dark a dhow carries you along the waterfront, past the floodlit walls of Fort Jesus and the lights of the Old Town, with dinner served on deck.',
        note: 'It can be breezy on the water after dark, so bring a light layer.',
      },
    },
  },
};

export const fmtTime = (h) => {
  const m = Math.round(h * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
