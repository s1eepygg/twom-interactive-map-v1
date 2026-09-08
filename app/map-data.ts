export type MarkerCategory = 'npc' | 'monster' | 'portal' | 'custom';
export type ItemMode = 'drops' | 'sells' | 'crafts';
export type MonsterRank = 'normal' | 'mini-boss' | 'boss' | 'raid-boss';

export type MapDefinition = {
  id: string;
  name: string;
  zone: string;
  image: string;
  width: number;
  height: number;
};

export type ItemRecord = {
  id: string;
  name: string;
  image?: string;
  custom?: boolean;
};

export type MapMarker = {
  id: string;
  mapId: string;
  name: string;
  category: MarkerCategory;
  x: number;
  y: number;
  summary: string;
  details: string[];
  image?: string;
  spawnTime?: string;
  level?: string;
  hp?: string;
  monsterRank?: MonsterRank;
  itemIds?: string[];
  itemMode?: ItemMode;
  custom?: boolean;
};

export const maps: MapDefinition[] = [
  { id: 'zone1', name: '木林村莊', zone: '1', image: './maps/zone1-skyreach.png', width: 6528, height: 7680 },
  { id: 'zone2', name: '蘑菇湿地', zone: '2', image: './maps/zone2.png', width: 3840, height: 4608 },
  { id: 'zone3', name: '木林森', zone: '3', image: './maps/zone3.png', width: 3840, height: 3840 },
];

export const categoryMeta: Record<MarkerCategory, { label: string; icon: string; color: string }> = {
  npc: { label: 'NPC', icon: '✦', color: '#ffd166' },
  monster: { label: '怪物', icon: '◆', color: '#ff6577' },
  portal: { label: '傳送門', icon: '↟', color: '#b69cff' },
  custom: { label: '其他', icon: '●', color: '#62d8ff' },
};

export const monsterRankMeta: Record<MonsterRank, { label: string; color: string }> = {
  normal: { label: 'Monster', color: '#ff6577' },
  'mini-boss': { label: 'Mini Boss', color: '#ffc857' },
  boss: { label: 'Boss', color: '#ff8a5b' },
  'raid-boss': { label: 'Raid Boss', color: '#dca6ff' },
};

// Coordinates are percentages measured from each image's top-left corner.
export const starterMarkers: MapMarker[] = [
  // {
  //   id: 'aurelia', mapId: 'zone1', name: 'Aurelia, Skykeeper', category: 'npc', x: 54.8, y: 53.8,
  //   summary: 'Main quest guide beside the winged fountain.',
  //   details: ['Role: Quest NPC', 'Available: All day'], itemMode: 'crafts', itemIds: ['wind-sigil'],
  // },
  // {
  //   id: 'pippin', mapId: 'zone1', name: 'Pippin the Trader', category: 'npc', x: 69.7, y: 61.8,
  //   summary: 'Sells travel supplies and island keepsakes.',
  //   details: ['Role: Merchant', 'Restock: Every 30 min'], itemMode: 'sells', itemIds: ['cloud-jelly'],
  // },
  // {
  //   id: 'cloud-slime', mapId: 'zone1', name: 'Cloud Slime', category: 'monster', x: 40.5, y: 72.4,
  //   summary: 'A playful creature that gathers near flower fields.',
  //   details: ['Level: 8–10'], spawnTime: '90 seconds', itemMode: 'drops', itemIds: ['cloud-jelly'],
  // },
  // {
  //   id: 'sunspore', mapId: 'zone1', name: 'Sunspore Sprout', category: 'monster', x: 77.2, y: 69.8,
  //   summary: 'Appears among the southern terraces after sunrise.',
  //   details: ['Level: 12', 'Element: Nature'], spawnTime: '3 minutes', itemMode: 'drops', itemIds: ['bright-seed'],
  // },
  // {
  //   id: 'moon-ladder', mapId: 'zone1', name: 'Moon Ladder', category: 'portal', x: 54.9, y: 18.1,
  //   summary: 'A hidden ascent through the crown of the great tree.', details: ['Destination: Upper Canopy', 'One-way passage'],
  // },
  {
      "mapId": "zone1",
      "name": "黑市",
      "category": "npc",
      "x": 49.17685028472619,
      "y": 58.75010031787022,
      "summary": "用於出售與購買物品，王國帝國互通。某些伺服器享有【世界交易】功能，可跨服出售和收購物品。",
      "image": "data:image/webp;base64,UklGRnwEAABXRUJQVlA4WAoAAAAwAAAAGQAAIAAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBITgAAAAEPMP8REcJNbdtOdMglEpCCsVgiCylPwisnn8kaIvofTMCjYLPjsCccSEfSlZP+rNz0U9wc+V65KbsdhxXxN6042f1UX2lBWJF/41ZAAFZQOCA4AgAAsAsAnQEqGgAhAD5VJIxEo6IhFVYAOAVEswBftbqKBwANsxdkG8azCz65SgLdlSxnpI5lnn7/h+4F/JP6N/o+ur+1XsRfqeJpABqWI987+C9wTXW++DyQxFX8CzUFMXdae/HDg0mAAP73f1wcVo9SYUb9JWBAeOtNFqrajOW1ZqYUGcfYc6Dy/Li8ftT4LUGe0b+8afXdiUEA8v+ns3F86h8Hc9RRwBFQvgxISrgKO76lzJ6efh5F7PkbVPE/wc9ULJ/w5rBVHag9HefExzOn+EGp+8T418CpLZIOcCis0Y4C5uRvsOBwKlmNfNJJ4At7CRy9vlT2td0O//rB6FYyEMkiZmzudq3oSvldcv4BqLD4mNlYdgHgu4c+X9GJ6ev+Xs8Az//ivjUPNje/PdQT4uRb+dOk0lW+xhyykKzR79ME6wIFgofqNtwIOLOm1RJnvQ1KR9ynZ1/DXMNUKnI9xn5XxKxTjIkuBmr0cBLvwjV3kFtpxe1N1/49+d93W9u0weGv/xMfu8eocTU5X7HtHMQgJm8KJvrFv7f6lfWh0ivnOpDWgPyHb1DoSHtVjPDLPnAl+ndk1nMOjwgdEM7/2rGqWJwyo+Dnfs3BCv4q/0uNvMBZefk5OH2dkdWlDD/C66d1Iz0/yqHGFPt215Qs/KqIX4JoLobq35tU7ORuppe9Wzd3n80AjNSzp50hmiJxvyBP5MFqgHo09xBi9Pv1uhEFQ/5j/kdTPZHikmtH9/SU+7wskAAAAA==",
      "itemIds": [],
      "itemMode": "crafts",
      "id": "custom-1788789276479-0yy7t",
      "details": ["任何玩家都可以在黑市上購買物品，但若要將物品出售在黑市需要先開通【黑市使用捲】"
      ],
      "custom": true
    },
    {
      "mapId": "zone3",
      "name": "Kooii",
      "category": "monster",
      "x": 65.03909247788765,
      "y": 21.120608411905128,
      "summary": "Fake kooii monster!",
      "image": "data:image/webp;base64,UklGRnoEAABXRUJQVlA4WAoAAAAwAAAAFAAAHAAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIQwAAAAEPMP8REYJxbdusrjyjBKUojdKUogRDP8pqiOi/kCCh2dwBjeAQPVJFrqRUtlDvruxyJevYIf5qarW12mWP7XssVQAAVlA4IEACAAAwDACdASoVAB0APlUijUQjoiEYBAA4BUS2AE6Zcb01agkAbgDbM+sg9ADyyPYj/cX0iLtEqkPUliIab3zGf7fyL/N3/I9wb+Sfzv/R8A1+o4yz6nXtxsPzarUoeebAMVANgUjeA+3+34MAAP0e0eZ4YFLgh9tS9zjT5B1vyhWjrcWHnM+EIAnZIlypkYR39vk9ZmK5K28wn31J0IKGZO1zkvVTsapAWwkt+P+a/398WfcVrsXJqOwzkzhH1+aDDMRK+Lrio4h3lf+7mInfXd3/zWo3IRwUEbD8p12L4u+71HV2RI+n2QDTKU0fEF98lUDVTYAydQ4CGX60cGx6n/8Gtp5HiOb6f5l55iGeFhznMzCthJDdDA/ljKB/tWqcRbtHuAy+gbi5+etSV3uZpevUk+NKSnS17UQ44X2bIC03sExz/qY7kf20KzL10fYhtrrUy8iC6CV67qy5yZ7m+6/8mMpuZY02VrMSRuvsxbAPKfijRSsw9dOEezkwU97HThKHbeyi78oPv77PHMg9kx5n/WGqFf/JUh9Hhfz/i+03yNjtHAw7jN//CcxQ37bxG//AfgQfXS9uCkrpJ5NLbn8V2yV8B11kf+HQ3+2Acj+SX5zTyf4JldDgPF/S8I7o1tRm3f0aeOzH/Az3ePWRD9+168Pha+dsFY/eDuxEMV8b0phYnRT7/wWP3+xhd9m3yzyCO4nX/8YzZvTbIICoT4ULASiokUZvYB/cAXcjO80ucv9+ODHn7wVRt301EEcIAAA=",
      "spawnTime": "0.5",
      "itemIds": [
        "cloud-leaf"
      ],
      "itemMode": "drops",
      "id": "custom-1788792310958-e17s4",
      "details": [
        "Added in Marker Studio",
        "Saved on this device"
      ],
      "custom": true
    },
    {
      "mapId": "zone3",
      "name": "Woody Weedy Village",
      "category": "portal",
      "x": 49.29317267541957,
      "y": 10.897987389917152,
      "summary": "Go to vill",
      "itemIds": [],
      "itemMode": "sells",
      "id": "custom-1788792389163-xydna",
      "details": [
        "Added in Marker Studio",
        "Saved on this device"
      ],
      "custom": true
    },
];
