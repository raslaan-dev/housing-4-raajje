import type { BranchName } from './index.js';

/**
 * Demo listing photos, grouped by island so every listing shows its own island.
 * All files are from Wikimedia Commons. Credits are listed on the public /credits page
 * (CC BY / CC BY-SA require attribution), not on top of each photo.
 */
export type LibraryPhoto = {
  url: string;
  caption: string;
  author: string;
  license: string;
  sourceUrl: string;
};

// Same thumbnail links Wikimedia's API hands out (its thumbnail host expects these query parameters).
const thumb = (path: string) =>
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail`;

export const PHOTO_LIBRARY: Record<BranchName, LibraryPhoto[]> = {
  Male: [
    {
      url: thumb('f/f9/Male_street.jpg/1280px-Male_street.jpg'),
      caption: 'Residential street in Malé',
      author: 'Kalesh at Malayalam Wikipedia',
      license: 'Public domain',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Male_street.jpg'
    },
    {
      url: thumb('0/0d/MV-gasse-01.jpg/1280px-MV-gasse-01.jpg'),
      caption: 'Apartment buildings along a lane in Malé',
      author: 'Balou46',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:MV-gasse-01.jpg'
    },
    {
      url: thumb('c/cc/MV-gasse-02.jpg/1280px-MV-gasse-02.jpg'),
      caption: 'Narrow lane with homes and shops in Malé',
      author: 'Balou46',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:MV-gasse-02.jpg'
    },
    {
      url: thumb('2/24/Mal%C3%A9_-_55327882869.jpg/1280px-Mal%C3%A9_-_55327882869.jpg'),
      caption: 'Residential towers on the Malé waterfront',
      author: 'xiquinhosilva',
      license: 'CC BY 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mal%C3%A9_-_55327882869.jpg'
    }
  ],
  Hulhumale: [
    {
      url: thumb('c/c4/Apartment_Blocks_-_Hulhumale_-_Maldives_%2814111148798%29.jpg/1280px-Apartment_Blocks_-_Hulhumale_-_Maldives_%2814111148798%29.jpg'),
      caption: 'Apartment blocks in Hulhumalé',
      author: 'Adam Jones',
      license: 'CC BY-SA 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Apartment_Blocks_-_Hulhumale_-_Maldives_(14111148798).jpg'
    },
    {
      url: thumb('0/0f/Detail_of_Apartment_Blocks_-_Hulhumale_-_Maldives_%2814295828132%29.jpg/1280px-Detail_of_Apartment_Blocks_-_Hulhumale_-_Maldives_%2814295828132%29.jpg'),
      caption: 'Apartment buildings in Hulhumalé',
      author: 'Adam Jones',
      license: 'CC BY-SA 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Detail_of_Apartment_Blocks_-_Hulhumale_-_Maldives_(14295828132).jpg'
    },
    {
      url: thumb('a/a9/Architecture_-_Hulhumale_-_Maldives_%2814295830842%29.jpg/1280px-Architecture_-_Hulhumale_-_Maldives_%2814295830842%29.jpg'),
      caption: 'Housing and mosque in Hulhumalé',
      author: 'Adam Jones',
      license: 'CC BY-SA 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Architecture_-_Hulhumale_-_Maldives_(14295830842).jpg'
    },
    {
      url: thumb('f/f5/Street_Scene_-_Hulhumale_-_Maldives_-_02_%2814111223727%29.jpg/1280px-Street_Scene_-_Hulhumale_-_Maldives_-_02_%2814111223727%29.jpg'),
      caption: 'Residential street in Hulhumalé',
      author: 'Adam Jones',
      license: 'CC BY-SA 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Street_Scene_-_Hulhumale_-_Maldives_-_02_(14111223727).jpg'
    }
  ],
  Villingili: [
    {
      url: thumb('8/8c/Street_Scene_-_Viliggili_Island_-_Off_Male_-_Maldives_%2814272850796%29.jpg/1280px-Street_Scene_-_Viliggili_Island_-_Off_Male_-_Maldives_%2814272850796%29.jpg'),
      caption: 'Residential street in Villingili',
      author: 'Adam Jones',
      license: 'CC BY-SA 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Street_Scene_-_Viliggili_Island_-_Off_Male_-_Maldives_(14272850796).jpg'
    },
    {
      url: thumb('3/3e/Villingili_%28Mal%C3%A9%29.jpg/1280px-Villingili_%28Mal%C3%A9%29.jpg'),
      caption: 'Homes along the Villingili shore',
      author: 'Shahee Ilyas',
      license: 'CC BY 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Villingili_(Mal%C3%A9).jpg'
    },
    {
      url: thumb('4/42/Villingili_Mal%C3%A9_%28239296863%29.jpeg/1280px-Villingili_Mal%C3%A9_%28239296863%29.jpeg'),
      caption: 'Villingili island and its houses',
      author: 'Shahee Ilyas',
      license: 'CC BY 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Villingili_Mal%C3%A9_(239296863).jpeg'
    }
  ]
};

/** Sample apartment interiors served from apps/web/static/listings (supplied by the project team). */
export const INTERIOR_PHOTOS: { url: string; caption: string }[] = [
  { url: '/listings/interior-1.jpg', caption: 'Duplex living room with loft staircase' },
  { url: '/listings/interior-2.jpg', caption: 'Open-plan living and dining area' },
  { url: '/listings/interior-3.jpg', caption: 'Bright living room with balcony' },
  { url: '/listings/interior-4.jpg', caption: 'Fitted kitchen and dining table' },
  { url: '/listings/interior-5.jpg', caption: 'Bedroom with balcony door' },
  { url: '/listings/interior-6.jpg', caption: 'Living room with hallway to bedrooms' }
];

/** Interior for a listing that has no photo of its own (e.g. newly registered by an owner). */
export function interiorFor(key: string): { url: string; caption: string } {
  let h = 0x811c9dc5;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return INTERIOR_PHOTOS[h % INTERIOR_PHOTOS.length];
}

/**
 * Stable pick for a listing, keyed on its title so it survives a reseed: the same property
 * always leads with the same photo from its island (FNV-1a hash spreads neighbours apart).
 */
export function photosForListing(branch: BranchName, key: string): LibraryPhoto[] {
  const set = PHOTO_LIBRARY[branch];
  let h = 0x811c9dc5;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  const start = h % set.length;
  return [...set.slice(start), ...set.slice(0, start)];
}
