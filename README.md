# Skyreach interactive map

A static, GitHub Pages-ready Leaflet atlas using the supplied high-resolution Zone 1, Zone 2, and Zone 3 artwork.

Use Node.js 22 (the version used by the included GitHub Pages workflow).

## Run it locally

```bash
npm install
npm run dev
```

## Add permanent markers

Edit `app/map-data.ts` and add an object to `starterMarkers`. Marker coordinates are percentages from the top-left of the source image, so they remain accurate at every zoom level.

```ts
{
  id: 'forest-guardian',
  name: 'Forest Guardian',
  category: 'npc', // npc | monster | landmark | portal
  x: 42.5,
  y: 68.2,
  summary: 'Guards the southern orchard.',
  details: ['Level: 12', 'Quest: Old Roots'],
}
```

Use the built-in **Marker Studio** to click the map and discover the exact `x` and `y` percentage. Markers created there are stored only in that browser; copy their coordinates into `app/map-data.ts` to publish them for everyone.

## Admin mode

Normal visitors see a read-only atlas. Open the site with `?admin=1` to show the Item Library and Add Marker controls:

```text
http://localhost:3000/?admin=1
```

This is appropriate for a private local editing workflow, but it is not secure authentication: code hosted on GitHub Pages is public. For a genuinely protected online admin portal, connect the editor to an authenticated backend such as Supabase, Firebase, or Cloudflare.

To publish local admin changes, open **Item Library**, choose **Export publishing data**, and replace `public/data/atlas-data.json` with the downloaded file before rebuilding. Exports preserve existing published records and append your new browser-local records. Public visitors receive that data but never see the editing controls.

## Reusable items and uploaded images

- Create item records in **Item Library**. Each has a name and optional image.
- Select the same item from any monster, shop NPC, or crafting NPC.
- Monster markers support a spawn-time field and dropped items.
- NPC markers can list either items sold or items crafted.
- Uploaded NPC and monster images appear directly on the map as free-standing sprites.
- Portal markers use the supplied portal artwork automatically.
- The former Landmark category is now Custom; Custom markers require an uploaded picture and description.
- Uploaded marker and item images are resized before being stored in the browser.

Permanent starter items live in `app/item-data.ts`. Permanent maps and markers live in `app/map-data.ts`.

## Add more maps

Add the PNG to `public/maps/`, then add one record to the `maps` array in `app/map-data.ts` with its ID, display name, image path, width, and height. The map picker is generated automatically.

## Replace the map

1. Put the new image in `public/maps/`.
2. Change the image path in `app/map-explorer.tsx`.
3. Update `MAP_SIZE` in `app/map-data.ts` to the new pixel dimensions.
4. Update or replace the marker coordinates.

## Build for GitHub Pages

```bash
npm run build
```

The static site is written to `dist/client`. A ready-to-use GitHub Pages workflow is included in `.github/workflows/deploy-pages.yml`; enable **GitHub Actions** as the Pages source in your repository settings, then push to `main`.
