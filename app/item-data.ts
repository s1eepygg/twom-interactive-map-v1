import type { ItemRecord } from './map-data';

// One reusable item database for every map, monster, shop, and crafting NPC.
// Custom items created in Admin mode are stored beside these in the browser.
export const starterItems: ItemRecord[] = [
  { id: 'cloud-leaf', name: 'Clover Leaf', image: './items/clover.png' },
];
