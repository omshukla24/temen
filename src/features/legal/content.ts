// Privacy policy, terms and help, as the app shows them (About → …).
// PRIVACY.md and TERMS.md at the repo root carry the same text for the store
// listing's policy URL; change both together.

export interface LegalDoc {
  updated: string;
  sections: { title: string; body: string[] }[];
}

/** Where people write to. Set EXPO_PUBLIC_SUPPORT_EMAIL for store builds; the issue tracker otherwise. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || null;
export const ISSUES_URL = 'https://github.com/omshukla24/temen/issues';
export const SOURCE_URL = 'https://github.com/omshukla24/temen';
export const contactLine = () => (SUPPORT_EMAIL ? `Write to ${SUPPORT_EMAIL}.` : `Open an issue at ${ISSUES_URL}.`);

export const PRIVACY: LegalDoc = {
  updated: '2026-09-27',
  sections: [
    {
      title: 'In one paragraph',
      body: [
        'Temen reads public satellite and survey records for a point on Earth. It has no ads and no analytics or tracking SDKs, and it does not sell or share personal data. An account is optional; without one, everything stays on your phone.',
      ],
    },
    {
      title: 'Your location',
      body: [
        'Temen asks for location permission only to check the ground where you stand and to show your position on Home. It never reads location in the background.',
        'To read a place, the app sends its coordinates (not who you are) to the public data services listed under Data sources: JRC Global Surface Water and AWS Terrain Tiles (map tiles), NASA POWER, USGS, ISRIC SoilGrids, MET Norway, GDACS, Photon by komoot (place names), OpenFreeMap (the map) and Google Earth Timelapse. Each of these receives the request like any web request, including your IP address.',
        'Auto light uses where the phone last was, rounded to about 1 km, stored only on the phone, to know when the sun rises and sets.',
      ],
    },
    {
      title: 'What stays on your phone',
      body: [
        'Checked places (cores), saved places, site-visit photos and your preferences are stored on the phone. Site-visit photos never leave it unless you share a PDF report yourself.',
      ],
    },
    {
      title: 'If you create an account',
      body: [
        'Signing in (Google or a one-time email code) is optional. It stores your email address, your name if you give one or Google provides it, and the places you check and save (coordinates, place name, readings, saved mark), so they come back on another phone.',
        'Accounts are hosted by Supabase in the Mumbai region (ap-south-1). Every stored row is readable only by its owner.',
      ],
    },
    {
      title: 'Purchases',
      body: [
        'Payments are handled by the app store. Temen uses RevenueCat to know what you have bought; RevenueCat receives the purchase receipt and an app user id (a random id, or your account id when you are signed in). Temen never sees card details.',
      ],
    },
    {
      title: 'Deleting your data',
      body: [
        'Account → Delete account removes your account and everything synced to it, straight away. Places on the phone can be deleted one by one in Places, or all at once in Preferences → Delete data on this phone. Uninstalling the app removes everything stored on the phone.',
      ],
    },
    {
      title: 'Children',
      body: ['Temen is not directed at children under 13 and does not knowingly collect their data.'],
    },
    {
      title: 'Contact',
      body: ['Questions about privacy: ' + contactLine()],
    },
  ],
};

export const TERMS: LegalDoc = {
  updated: '2026-09-27',
  sections: [
    {
      title: 'What Temen is',
      body: [
        'Temen shows what public records say about a point on Earth: water seen by satellites since 1984, the shape of the ground, the heaviest rain on record, earthquakes and soil. It is a starting point for questions, not a survey, a legal document or professional advice.',
      ],
    },
    {
      title: 'What Temen is not',
      body: [
        'Temen does not judge whether a place is fit to buy, build on or live in, and never predicts floods. It does not show official boundaries such as lake full-tank lines or buffer zones. Readings come from open datasets with limited resolution (about 30 m for water) and years; every reading names its source, and each result lists what it cannot see.',
        'Before you sign anything, check land records, approvals and flood maps with the local authority, and ask a qualified engineer or surveyor.',
      ],
    },
    {
      title: 'Purchases',
      body: [
        'A single report unlocks the full reading, questions and PDF for one place. Pro unlocks every place, compare, Monsoon Watch and offline places for as long as the subscription is active. Subscriptions renew until you cancel them in your store account. Refunds follow the store’s rules.',
      ],
    },
    {
      title: 'Your account',
      body: [
        'Keep your sign-in to yourself. You can delete your account at any time from Account → Delete account.',
      ],
    },
    {
      title: 'Data and credits',
      body: [
        'Temen’s analysis is open source (MIT licence). Data belongs to its providers and is used under their licences, credited under Data sources.',
      ],
    },
    {
      title: 'Liability',
      body: [
        'Temen is provided as is. To the extent the law allows, the makers of Temen are not liable for decisions made from its readings.',
      ],
    },
    {
      title: 'Contact',
      body: [contactLine()],
    },
  ],
};

export const HELP: { q: string; a: string }[] = [
  {
    q: 'How do I check a place?',
    a: 'On Home, tap Core this ground to read where you stand, search a place or paste a Maps link, or tap Drop a pin and move the map under the crosshair.',
  },
  {
    q: 'Can I check a pin someone sent me on WhatsApp?',
    a: 'Yes. Open the location in WhatsApp, tap Share and choose Temen. Google Maps links, coordinates and plus codes all work.',
  },
  {
    q: 'What does a reading mean?',
    a: 'Each band of the core is one record: water seen by satellites since 1984, how low the ground sits against its surroundings, the heaviest day of rain since 1981, earthquakes within 300 km, and soil. Tap a band for the numbers and the source.',
  },
  {
    q: 'Why does it never say a place is good or bad?',
    a: 'Because open satellite data cannot know that. Temen shows what the records say and the questions worth asking the builder or the authority.',
  },
  {
    q: 'What is free and what is Pro?',
    a: 'Every check is free with the first two readings, the Rising and the time machine. A single report unlocks one place in full with its PDF. Pro unlocks every place, compare, Monsoon Watch and offline places.',
  },
  {
    q: 'I bought something on another phone.',
    a: 'Sign in with the same account, or go to Account → Restore purchases.',
  },
  {
    q: 'The voice keeps talking.',
    a: 'Tap the speaker on the check screen again to stop it. Turn spoken results off in Preferences.',
  },
  {
    q: 'Can I turn off animations?',
    a: 'Preferences → Reduce motion. The app also follows your phone’s accessibility setting.',
  },
];
