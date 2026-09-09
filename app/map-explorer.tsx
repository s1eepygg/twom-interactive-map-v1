'use client';

// User-uploaded data URLs are dynamic and intentionally use native image elements.
// oxlint-disable next/no-img-element

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { type LatLngBoundsExpression, type LeafletMouseEvent } from 'leaflet';
import {
  ArrowLeft,
  Copy,
  Crosshair,
  Database,
  Download,
  ImagePlus,
  LocateFixed,
  MapPinned,
  Package,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { starterItems } from './item-data';
import {
  categoryMeta,
  maps,
  monsterRankMeta,
  starterMarkers,
  type ItemMode,
  type ItemRecord,
  type MapDefinition,
  type MapMarker,
  type MarkerCategory,
  type MonsterRank,
} from './map-data';

const markerStorageKey = 'twom-custom-markers-v2';
const removedMarkerStorageKey = 'twom-removed-marker-ids-v1';
const itemStorageKey = 'twom-custom-items-v1';
const categories = Object.keys(categoryMeta) as MarkerCategory[];

function mergeUniqueById<T extends { id: string }>(...groups: T[][]): T[] {
  const records = new Map<string, T>();
  for (const group of groups) {
    for (const record of group) records.set(record.id, record);
  }
  return [...records.values()];
}

function normalizeItemName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

function npcNameLabel(category: MarkerCategory, name: string) {
  return category === 'npc' && name
    ? `<span class="map-marker-name map-marker-name--npc">${escapeHtml(name)}</span>`
    : '';
}

function mergeUniqueItems(...groups: ItemRecord[][]) {
  const itemsByName = new Map<string, ItemRecord>();
  const itemNameById = new Map<string, string>();

  for (const group of groups) {
    for (const item of group) {
      const nameKey = normalizeItemName(item.name) || `id:${item.id}`;
      const existing = itemsByName.get(nameKey);
      itemNameById.set(item.id, nameKey);
      itemsByName.set(nameKey, existing
        ? { ...existing, ...item, id: existing.id, custom: existing.custom || item.custom }
        : item);
    }
  }

  const canonicalIdById = new Map<string, string>();
  for (const [id, nameKey] of itemNameById) {
    canonicalIdById.set(id, itemsByName.get(nameKey)?.id || id);
  }

  return { items: [...itemsByName.values()], canonicalIdById };
}

function getBounds(map: MapDefinition): LatLngBoundsExpression {
  return [[0, 0], [map.height, map.width]];
}

function toLatLng(marker: Pick<MapMarker, 'x' | 'y'>, map: MapDefinition): [number, number] {
  return [map.height * (1 - marker.y / 100), map.width * (marker.x / 100)];
}

function toPercent(event: LeafletMouseEvent, map: MapDefinition) {
  return {
    x: Math.max(0, Math.min(100, (event.latlng.lng / map.width) * 100)),
    y: Math.max(0, Math.min(100, (1 - event.latlng.lat / map.height) * 100)),
  };
}

function markerIcon(category: MarkerCategory, image?: string, name = '') {
  const meta = categoryMeta[category];
  if (category === 'portal') {
    return L.divIcon({
      className: 'map-marker-shell',
      html: `<span class="portal-marker"><img src="./icons/portal.png" alt="" /><span class="portal-marker-name">${escapeHtml(name)}</span></span>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
      popupAnchor: [0, -18],
      tooltipAnchor: [0, -18],
    });
  }
  if (image) {
    return L.divIcon({
      className: 'map-marker-shell',
      html: `<span class="map-sprite-marker map-sprite-marker--${category}">${npcNameLabel(category, name)}<img src="${image}" alt="" /></span>`,
      iconSize: [68, 72],
      iconAnchor: [34, 66],
      popupAnchor: [0, -60],
      tooltipAnchor: [0, -56],
    });
  }
  return L.divIcon({
    className: 'map-marker-shell',
    html: `<span class="map-pin-with-name">${npcNameLabel(category, name)}<span class="map-marker map-marker--${category}" style="--marker-color:${meta.color}"><img src="./ui/marker-active.png" alt="" /><span>${meta.icon}</span></span></span>`,
    iconSize: [44, 50],
    iconAnchor: [22, 43],
    popupAnchor: [0, -39],
    tooltipAnchor: [0, -34],
  });
}

function MapCommands({ mapDefinition, resetSignal }: { mapDefinition: MapDefinition; resetSignal: number }) {
  const map = useMap();
  useEffect(() => {
    if (resetSignal > 0) map.fitBounds(getBounds(mapDefinition), { padding: [26, 26] });
  }, [map, mapDefinition, resetSignal]);
  return null;
}

function MarkerScaleController() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const referenceZoom = map.getZoom();
    const applyScale = (zoom = map.getZoom()) => {
      const growthZoom = Math.max(0, zoom - referenceZoom - 1.25);
      const scale = Math.min(1.8, 1 + growthZoom * 0.4);
      container.style.setProperty('--marker-zoom-scale', scale.toFixed(3));
    };
    const onZoom = () => applyScale();
    const onZoomAnimation = (event: L.ZoomAnimEvent) => applyScale(event.zoom);

    applyScale();
    map.on('zoom', onZoom);
    map.on('zoomanim', onZoomAnimation);
    return () => {
      map.off('zoom', onZoom);
      map.off('zoomanim', onZoomAnimation);
      container.style.removeProperty('--marker-zoom-scale');
    };
  }, [map]);

  return null;
}

function MarkerNameVisibilityController() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    // Keep the overview readable. Labels appear after the player zooms in
    // beyond the initial fit-to-map zoom level.
    const nameZoom = map.getZoom() + 0.75;
    const updateVisibility = (zoom = map.getZoom()) => {
      container.classList.toggle('show-marker-names', zoom >= nameZoom);
    };
    const onZoom = () => updateVisibility();
    const onZoomAnimation = (event: L.ZoomAnimEvent) => updateVisibility(event.zoom);

    updateVisibility();
    map.on('zoom', onZoom);
    map.on('zoomanim', onZoomAnimation);
    return () => {
      map.off('zoom', onZoom);
      map.off('zoomanim', onZoomAnimation);
      container.classList.remove('show-marker-names');
    };
  }, [map]);

  return null;
}

function MobileMapTap({ onMapTap }: { onMapTap: () => void }) {
  useMapEvents({ click: onMapTap });
  return null;
}

function PositionPicker({
  enabled,
  mapDefinition,
  onPick,
}: {
  enabled: boolean;
  mapDefinition: MapDefinition;
  onPick: (position: { x: number; y: number }) => void;
}) {
  useMapEvents({ click: (event) => enabled && onPick(toPercent(event, mapDefinition)) });
  return null;
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

async function resizeImage(file: File, maxSize = 180): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read this image.'));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = source;
  });
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (context) {
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  return canvas.toDataURL('image/webp', 0.84);
}

type DraftMarker = {
  name: string;
  category: MarkerCategory;
  summary: string;
  x: number | null;
  y: number | null;
  image?: string;
  spawnTime: string;
  level: string;
  hp: string;
  monsterRank: MonsterRank;
  coordinates: string;
  quests: string[];
  questInput: string;
  itemIds: string[];
  itemMode: ItemMode;
};

const blankDraft: DraftMarker = {
  name: '', category: 'npc', summary: '', x: null, y: null,
  spawnTime: '', level: '', hp: '', monsterRank: 'normal', coordinates: '', quests: [], questInput: '', itemIds: [], itemMode: 'sells',
};

export default function MapExplorer() {
  const [selectedMapId, setSelectedMapId] = useState(maps[0].id);
  const [visible, setVisible] = useState<Set<MarkerCategory>>(() => new Set(categories));
  const [customMarkers, setCustomMarkers] = useState<MapMarker[]>(() => {
    const records = loadStored<MapMarker[]>(markerStorageKey, []);
    return records.map((marker) => ({
      ...marker,
      mapId: marker.mapId || 'zone1',
      category: (marker.category as string) === 'landmark' ? 'custom' : marker.category,
    }));
  });
  const [customItems, setCustomItems] = useState<ItemRecord[]>(() => loadStored(itemStorageKey, []));
  const [publishedMarkers, setPublishedMarkers] = useState<MapMarker[]>([]);
  const [publishedItems, setPublishedItems] = useState<ItemRecord[]>([]);
  const [removedMarkerIds, setRemovedMarkerIds] = useState<Set<string>>(() => new Set(loadStored<string[]>(removedMarkerStorageKey, [])));
  const [panel, setPanel] = useState<'marker' | 'items' | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [draft, setDraft] = useState<DraftMarker>(blankDraft);
  const [newItemName, setNewItemName] = useState('');
  const [newItemImage, setNewItemImage] = useState<string>();
  const [itemSearch, setItemSearch] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [copyingMarker, setCopyingMarker] = useState<MapMarker | null>(null);
  const [isAdmin] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1');
  const [isTouchDevice, setIsTouchDevice] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileTopbarCollapsed, setMobileTopbarCollapsed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setIsTouchDevice(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => {
      setIsMobileViewport(media.matches);
      if (!media.matches) setMobileTopbarCollapsed(false);
    };
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const selectedMap = maps.find((map) => map.id === selectedMapId) || maps[0];
  const bounds = getBounds(selectedMap);
  // Records created on different devices have different IDs. Use the normalized
  // item name as their shared identity and retain aliases for existing marker links.
  const itemCatalog = useMemo(
    () => mergeUniqueItems(starterItems, publishedItems, customItems),
    [customItems, publishedItems],
  );
  const allItems = itemCatalog.items;
  const duplicateItemName = Boolean(newItemName.trim()) && allItems.some(
    (item) => normalizeItemName(item.name) === normalizeItemName(newItemName),
  );
  const allMarkers = useMemo(
    () => mergeUniqueById(starterMarkers, customMarkers, publishedMarkers).filter((marker) => !removedMarkerIds.has(marker.id)),
    [customMarkers, publishedMarkers, removedMarkerIds],
  );
  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLocaleLowerCase();
    return query ? allItems.filter((item) => item.name.toLocaleLowerCase().includes(query)) : allItems;
  }, [allItems, itemSearch]);
  const mapMarkers = allMarkers.filter((marker) => marker.mapId === selectedMap.id);
  const shownMarkers = mapMarkers.filter((marker) => visible.has(marker.category));

  useEffect(() => {
    let active = true;
    void fetch('./data/atlas-data.json')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No published data')))
      .then((data) => {
        if (!active) return;
        const content = data as { items?: ItemRecord[]; markers?: MapMarker[] };
        setPublishedItems(content.items || []);
        setPublishedMarkers((content.markers || []).map((marker) => ({
          ...marker,
          category: (marker.category as string) === 'landmark' ? 'custom' : marker.category,
        })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const addCustomMarker = useCallback((input: Omit<MapMarker, 'id' | 'custom'>) => {
    const marker: MapMarker = {
      ...input,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      custom: true,
    };
    setCustomMarkers((current) => {
      const next = [...current, marker];
      window.localStorage.setItem(markerStorageKey, JSON.stringify(next));
      return next;
    });
    setVisible((current) => new Set(current).add(input.category));
    return marker;
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    type ModelContext = { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'add_map_marker',
      title: 'Add map marker',
      description: 'Add a marker to one of the interactive maps and save it on this device.',
      inputSchema: {
        type: 'object',
        properties: {
          mapId: { type: 'string', enum: maps.map((map) => map.id) },
          name: { type: 'string', minLength: 1 },
          category: { type: 'string', enum: categories },
          x: { type: 'number', minimum: 0, maximum: 100 },
          y: { type: 'number', minimum: 0, maximum: 100 },
          summary: { type: 'string' },
          spawnTime: { type: 'string' },
          level: { type: 'string' },
          hp: { type: 'string' },
          monsterRank: { type: 'string', enum: ['normal', 'mini-boss', 'boss', 'raid-boss'] },
          coordinates: { type: 'string' },
          quests: { type: 'array', items: { type: 'string' } },
        },
        required: ['mapId', 'name', 'category', 'x', 'y'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(raw: unknown) {
        const input = raw as Partial<{ mapId: string; name: string; category: MarkerCategory; x: number; y: number; summary: string; spawnTime: string; level: string; hp: string; monsterRank: MonsterRank; coordinates: string; quests: string[] }>;
        if (!input.mapId || !maps.some((map) => map.id === input.mapId) || !input.name?.trim() || !input.category || !categories.includes(input.category) || typeof input.x !== 'number' || typeof input.y !== 'number' || input.x < 0 || input.x > 100 || input.y < 0 || input.y > 100) {
          throw new Error('Provide a valid map, name, category, and x/y percentages.');
        }
        const marker = addCustomMarker({
          mapId: input.mapId, name: input.name.trim(), category: input.category, x: input.x, y: input.y,
          summary: input.summary?.trim() || '', spawnTime: input.spawnTime,
          level: input.category === 'monster' ? input.level?.trim() : undefined,
          hp: input.category === 'monster' ? input.hp?.trim() : undefined,
          monsterRank: input.category === 'monster' ? input.monsterRank || 'normal' : undefined,
          coordinates: input.category === 'npc' ? input.coordinates?.trim() : undefined,
          quests: input.category === 'npc' ? (input.quests || []).map((quest) => quest.trim()).filter(Boolean) : undefined,
          itemIds: [], itemMode: input.category === 'monster' ? 'drops' : 'sells', details: [],
        });
        return { id: marker.id, mapId: marker.mapId, name: marker.name };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [addCustomMarker, isAdmin]);

  function toggleCategory(category: MarkerCategory) {
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  }

  function changeCategory(category: MarkerCategory) {
    setDraft((current) => ({
      ...current,
      category,
      itemMode: category === 'monster' ? 'drops' : category === 'npc' ? 'sells' : current.itemMode,
      itemIds: category === 'npc' || category === 'monster' ? current.itemIds : [],
    }));
  }

  function saveMarker() {
    if (!draft.name.trim() || draft.x === null || draft.y === null) return;
    if (draft.category === 'custom' && !draft.image) return;
    const marker = addCustomMarker({
      mapId: selectedMap.id,
      name: draft.name.trim(),
      category: draft.category,
      x: draft.x,
      y: draft.y,
      summary: draft.summary.trim(),
      image: draft.image,
      spawnTime: draft.category === 'monster' ? draft.spawnTime.trim() : undefined,
      level: draft.category === 'monster' ? draft.level.trim() : undefined,
      hp: draft.category === 'monster' ? draft.hp.trim() : undefined,
      monsterRank: draft.category === 'monster' ? draft.monsterRank : undefined,
      coordinates: draft.category === 'npc' ? draft.coordinates.trim() : undefined,
      quests: draft.category === 'npc' ? draft.quests : undefined,
      itemIds: draft.category === 'npc' || draft.category === 'monster' ? draft.itemIds : [],
      itemMode: draft.category === 'monster' ? 'drops' : draft.itemMode,
      details: [],
    });
    setDraft(blankDraft);
    setSavedMessage(`${marker.name} added to ${selectedMap.name}.`);
    window.setTimeout(() => setSavedMessage(''), 2800);
  }

  function beginCopyMarker(marker: MapMarker) {
    setCopyingMarker(marker);
    setPanel(null);
  }

  function pickMapPosition(position: { x: number; y: number }) {
    if (!copyingMarker) {
      setDraft((current) => ({ ...current, ...position }));
      return;
    }

    addCustomMarker({
      mapId: selectedMap.id,
      name: copyingMarker.name,
      category: copyingMarker.category,
      x: position.x,
      y: position.y,
      summary: copyingMarker.summary,
      details: [...(copyingMarker.details || [])],
      image: copyingMarker.image,
      spawnTime: copyingMarker.spawnTime,
      level: copyingMarker.level,
      hp: copyingMarker.hp,
      monsterRank: copyingMarker.monsterRank,
      coordinates: copyingMarker.coordinates,
      quests: copyingMarker.quests ? [...copyingMarker.quests] : undefined,
      itemIds: [...(copyingMarker.itemIds || [])],
      itemMode: copyingMarker.itemMode || (copyingMarker.category === 'monster' ? 'drops' : 'sells'),
    });
    setCopyingMarker(null);
  }

  function removeCustomMarker(id: string) {
    setCustomMarkers((current) => {
      const next = current.filter((marker) => marker.id !== id);
      window.localStorage.setItem(markerStorageKey, JSON.stringify(next));
      return next;
    });
    setRemovedMarkerIds((current) => {
      const next = new Set(current).add(id);
      window.localStorage.setItem(removedMarkerStorageKey, JSON.stringify([...next]));
      return next;
    });
  }

  function saveItem() {
    if (!newItemName.trim()) return;
    if (duplicateItemName) {
      setSavedMessage(`${newItemName.trim()} already exists in the Item Library.`);
      return;
    }
    const item: ItemRecord = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newItemName.trim(), image: newItemImage, custom: true,
    };
    setCustomItems((current) => {
      const next = [...current, item];
      window.localStorage.setItem(itemStorageKey, JSON.stringify(next));
      return next;
    });
    setNewItemName('');
    setNewItemImage(undefined);
  }

  function removeItem(id: string) {
    setCustomItems((current) => {
      const next = current.filter((item) => item.id !== id);
      window.localStorage.setItem(itemStorageKey, JSON.stringify(next));
      return next;
    });
    setDraft((current) => ({ ...current, itemIds: current.itemIds.filter((itemId) => itemId !== id) }));
  }

  function toggleDraftItem(id: string) {
    setDraft((current) => ({
      ...current,
      itemIds: current.itemIds.includes(id)
        ? current.itemIds.filter((itemId) => itemId !== id)
        : [...current.itemIds, id],
    }));
  }

  function addDraftQuest() {
    const quest = draft.questInput.trim();
    if (!quest) return;
    setDraft((current) => ({
      ...current,
      quests: current.quests.some((entry) => entry.toLocaleLowerCase() === quest.toLocaleLowerCase())
        ? current.quests
        : [...current.quests, quest],
      questInput: '',
    }));
  }

  function removeDraftQuest(quest: string) {
    setDraft((current) => ({ ...current, quests: current.quests.filter((entry) => entry !== quest) }));
  }

  function exportAdminData() {
    // Keep one canonical item per name and remap IDs created on other devices.
    const exportCatalog = mergeUniqueItems(starterItems, publishedItems, customItems);
    const starterItemIds = new Set(starterItems.map((item) => item.id));
    const items = exportCatalog.items.filter((item) => !starterItemIds.has(item.id));
    const markers = Array.from(new Map([...publishedMarkers, ...customMarkers].map((marker) => [marker.id, marker])).values())
      .filter((marker) => !removedMarkerIds.has(marker.id));
    const remappedMarkers = markers.map((marker) => ({
      ...marker,
      itemIds: [...new Set((marker.itemIds || []).map((id) => exportCatalog.canonicalIdById.get(id) || id))],
    }));
    const content = JSON.stringify({ version: 1, items, markers: remappedMarkers }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'atlas-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImage(file: File | undefined, target: 'marker' | 'item') {
    if (!file) return;
    const resized = await resizeImage(file);
    if (target === 'marker') setDraft((current) => ({ ...current, image: resized }));
    else setNewItemImage(resized);
  }

  return (
    <main className="map-app">
      <header className={`topbar ${mobileTopbarCollapsed ? 'is-collapsed' : ''}`}>
        <button type="button" className="mobile-topbar-toggle" onClick={() => setMobileTopbarCollapsed(false)} aria-label="Expand map controls"><img src="./ui/menu-map.png" alt="" /></button>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><img src="./ui/menu-map.png" alt="" /></span>
          <div><p className="eyebrow">TWOM World Atlas / {selectedMap.zone}</p><h1>{selectedMap.name}</h1></div>
        </div>
        <div className="top-actions">
          <label className="map-picker-label game-select">
            <span className="sr-only">Choose map</span>
            <img src="./ui/icon-position.png" alt="" aria-hidden="true" />
            <select value={selectedMap.id} onChange={(event) => { setSelectedMapId(event.target.value); setDraft(blankDraft); setCopyingMarker(null); setResetSignal((n) => n + 1); }}>
              {maps.map((map) => <option key={map.id} value={map.id}>{map.zone} · {map.name}</option>)}
            </select>
          </label>
          <span className="map-status"><i /> {mapMarkers.length} discoveries</span>
          <button className="game-menu-button" onClick={() => setResetSignal((n) => n + 1)} aria-label="Reset map view"><img src="./ui/menu-map.png" alt="" /><span>Reset map</span></button>
          <button className="game-menu-button" onClick={() => setLegendOpen((open) => !open)} aria-label="Toggle map layers"><img src="./ui/menu-quest.png" alt="" /><span>Layers</span></button>
          {isAdmin && (
            <>
              <span className="admin-badge"><ShieldCheck size={14} /> Admin</span>
              <button className="game-menu-button" onClick={() => setPanel('items')} aria-label="Open item library"><img src="./ui/menu-inventory.png" alt="" /><span>Items</span></button>
              <button className="button button--primary" onClick={() => setPanel('marker')}><Plus size={17} />Add marker</button>
            </>
          )}
        </div>
      </header>

      <section className="map-stage" aria-label={`Interactive ${selectedMap.name} map`}>
        <MapContainer
          key={selectedMap.id}
          crs={L.CRS.Simple}
          bounds={bounds}
          maxBounds={[[-1100, -1100], [selectedMap.height + 1100, selectedMap.width + 1100]]}
          minZoom={-3}
          maxZoom={2}
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={90}
          attributionControl={false}
          className={`leaflet-map ${panel === 'marker' || copyingMarker ? 'is-picking' : ''}`}
        >
          <ImageOverlay url={selectedMap.image} bounds={bounds} />
          <MapCommands mapDefinition={selectedMap} resetSignal={resetSignal} />
          <MarkerScaleController />
          <MarkerNameVisibilityController />
          {isMobileViewport && <MobileMapTap onMapTap={() => setMobileTopbarCollapsed(true)} />}
          <PositionPicker enabled={panel === 'marker' || Boolean(copyingMarker)} mapDefinition={selectedMap} onPick={pickMapPosition} />

          {shownMarkers.map((marker) => {
            const linkedItemIds = new Set((marker.itemIds || []).map((id) => itemCatalog.canonicalIdById.get(id) || id));
            const linkedItems = allItems.filter((item) => linkedItemIds.has(item.id));
            const visibleDetails = (marker.details || []).filter((detail) => detail !== 'Added in Marker Studio' && detail !== 'Saved on this device');
            const monsterRank = marker.monsterRank && monsterRankMeta[marker.monsterRank] ? marker.monsterRank : 'normal';
            return (
              <Marker key={marker.id} position={toLatLng(marker, selectedMap)} icon={markerIcon(marker.category, marker.image, marker.name)} title={marker.name} alt={`${marker.name}, ${categoryMeta[marker.category].label}`}>
                {!isTouchDevice && <Tooltip direction="top" opacity={1} className="marker-tooltip"><strong>{marker.name}</strong><span>{categoryMeta[marker.category].label}</span></Tooltip>}
                <Popup className={`marker-popup marker-popup--${marker.category === 'monster' ? monsterRank : 'normal'}`} maxWidth={320} minWidth={250}>
                  <div className="popup-content">
                    {marker.image && <img className={`popup-portrait popup-portrait--${marker.category}`} src={marker.image} alt="" />}
                    <p className={`popup-kicker popup-kicker--${marker.category}`}>{categoryMeta[marker.category].icon} {categoryMeta[marker.category].label}{marker.category === 'monster' && monsterRank !== 'normal' ? ` - ${monsterRankMeta[monsterRank].label}` : ''}</p>
                    <h2>{marker.name}</h2>
                    {marker.category === 'npc' && marker.coordinates && <p className="npc-coordinates">{marker.coordinates}</p>}
                    {marker.summary && <p>{marker.summary}</p>}
                    {marker.category === 'npc' && marker.quests && marker.quests.length > 0 && (
                      <div className="npc-quests">
                        <b>Quests</b>
                        <ul>{marker.quests.map((quest) => <li key={quest}>{quest}</li>)}</ul>
                      </div>
                    )}
                    {marker.category === 'monster' && (marker.level || marker.hp || (marker.monsterRank && marker.monsterRank !== 'normal')) && (
                      <div className="monster-stats">
                        {marker.level && <span><b>LV</b>{marker.level}</span>}
                        {marker.hp && <span><b>HP</b>{marker.hp}</span>}
                      </div>
                    )}
                    {marker.spawnTime && <div className="spawn-time"><b>復活時間</b><span>{marker.spawnTime}</span></div>}
                    {visibleDetails.length > 0 && <ul>{visibleDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
                    {linkedItems.length > 0 && (
                      <div className={`popup-items popup-items--${marker.itemMode || 'sells'}`}><b>{marker.itemMode === 'drops' ? 'Drops' : marker.itemMode === 'crafts' ? 'Crafts' : 'Sells'}</b>
                        <div>{linkedItems.map((item) => <span key={item.id}>{item.image ? <img src={item.image} alt="" /> : <Package size={17} />}<small>{item.name}</small></span>)}</div>
                      </div>
                    )}
                    {isAdmin && (marker.custom || marker.category === 'monster' || marker.category === 'npc') && (
                      <div className="popup-marker-actions">
                        {marker.custom && <button className="remove-marker-button" onClick={() => removeCustomMarker(marker.id)}>Remove this marker</button>}
                        {(marker.category === 'monster' || marker.category === 'npc') && <button className="copy-marker-button" onClick={() => beginCopyMarker(marker)}><Copy size={14} /> Copy {marker.category === 'npc' ? 'NPC' : 'monster'}</button>}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {panel === 'marker' && draft.x !== null && draft.y !== null && (
            <CircleMarker center={toLatLng({ x: draft.x, y: draft.y }, selectedMap)} radius={16} pathOptions={{ color: '#fff2a8', fillColor: '#ffd166', fillOpacity: 0.8, weight: 4 }} />
          )}
        </MapContainer>

        {copyingMarker && (
          <div className="copy-placement-banner" role="status">
            <Copy size={17} />
            <span>Copying <b>{copyingMarker.name}</b> — click the map to place it.</span>
            <button type="button" onClick={() => setCopyingMarker(null)}>Cancel</button>
          </div>
        )}

        <div className={`legend-card ${legendOpen ? '' : 'is-collapsed'}`}>
          <button className="legend-title" aria-expanded={legendOpen} onClick={() => setLegendOpen((open) => !open)}><span><img src="./ui/menu-quest.png" alt="" aria-hidden="true" /> Map layers</span><span className="legend-chevron">⌃</span></button>
          {legendOpen && <div className="legend-body"><p>Show or hide discoveries</p><div className="category-list">
            {categories.map((category) => {
              const meta = categoryMeta[category];
              const active = visible.has(category);
              return <button key={category} className={`category-row ${active ? 'is-active' : ''}`} onClick={() => toggleCategory(category)} aria-pressed={active}><span className={`category-symbol category-symbol--${category}`}>{meta.icon}</span><span>{meta.label}</span><b>{mapMarkers.filter((marker) => marker.category === category).length}</b><img className="category-toggle" src={active ? './ui/toggle-on.png' : './ui/toggle-off.png'} alt="" /></button>;
            })}
          </div><div className="hint-row"><LocateFixed size={15} /> Scroll to zoom · drag to explore</div></div>}
        </div>
        <div className="coordinate-chip" aria-hidden="true"><img src="./ui/icon-position.png" alt="" /> {selectedMap.width} × {selectedMap.height} px</div>
      </section>

      <aside className={`studio-panel ${panel ? 'is-open' : ''}`} aria-hidden={!panel}>
        {panel === 'marker' && (
          <>
            <div className="studio-head"><div><p className="eyebrow">Marker Studio</p><h2>Add a discovery</h2></div><button className="icon-button" onClick={() => setPanel(null)} aria-label="Close marker studio"><img src="./ui/close.png" alt="" /></button></div>
            <div className="studio-content">
              <div className="studio-step"><span>01</span><div><h3>Choose a location</h3><p>Click the visible map to place the marker.</p></div></div>
              <div className={`position-readout ${draft.x !== null ? 'has-position' : ''}`}><Crosshair size={18} />{draft.x === null ? <span>Waiting for a map click…</span> : <span>X {draft.x.toFixed(2)}% · Y {draft.y!.toFixed(2)}%</span>}</div>
              <div className="studio-step studio-step--form"><span>02</span><div><h3>Describe it</h3><p>Add an image and information for the popup.</p></div></div>

              {draft.category !== 'portal' && (
                <label className="image-upload">
                  {draft.image ? <img src={draft.image} alt="Marker preview" /> : <ImagePlus size={22} />}
                  <span>{draft.image ? 'Replace image' : draft.category === 'custom' ? 'Upload custom marker image (required)' : `Upload ${draft.category} sprite image`}</span>
                  <input type="file" accept="image/*" onChange={(event) => void handleImage(event.target.files?.[0], 'marker')} />
                </label>
              )}

              <label className="field-label" htmlFor="marker-name">Name</label>
              <input id="marker-name" className="text-input" placeholder="e.g. Forest Guardian" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              <fieldset><legend className="field-label">Category</legend><div className="category-picker">
                {categories.map((category) => <button type="button" key={category} className={draft.category === category ? 'is-selected' : ''} onClick={() => changeCategory(category)}><span className={`category-symbol category-symbol--${category}`}>{categoryMeta[category].icon}</span>{categoryMeta[category].label}</button>)}
              </div></fieldset>
              <label className="field-label" htmlFor="marker-notes">Short description</label>
              <textarea id="marker-notes" className="text-input text-area" placeholder="What should players know?" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />

              {draft.category === 'npc' && (
                <div className="npc-fields">
                  <label className="field-label" htmlFor="npc-coordinates">Coords</label>
                  <input id="npc-coordinates" className="text-input" inputMode="numeric" placeholder="e.g. 123, 456" value={draft.coordinates} onChange={(event) => setDraft((current) => ({ ...current, coordinates: event.target.value }))} />
                  <label className="field-label" htmlFor="npc-quest">Quests</label>
                  <div className="quest-create-row">
                    <input id="npc-quest" className="text-input" placeholder="Enter a quest name" value={draft.questInput} onChange={(event) => setDraft((current) => ({ ...current, questInput: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addDraftQuest(); } }} />
                    <button type="button" className="button button--primary" disabled={!draft.questInput.trim()} onClick={addDraftQuest}><Plus size={16} /> Add</button>
                  </div>
                  {draft.quests.length > 0 && <div className="quest-chip-list">{draft.quests.map((quest) => <span key={quest}>{quest}<button type="button" onClick={() => removeDraftQuest(quest)} aria-label={`Remove ${quest}`}>×</button></span>)}</div>}
                </div>
              )}

              {draft.category === 'monster' && <>
                <label className="field-label" htmlFor="monster-rank">Monster category</label>
                <select id="monster-rank" className="text-input monster-rank-select" value={draft.monsterRank} onChange={(event) => setDraft((current) => ({ ...current, monsterRank: event.target.value as MonsterRank }))}>
                  {(Object.keys(monsterRankMeta) as MonsterRank[]).map((rank) => <option key={rank} value={rank}>{monsterRankMeta[rank].label}</option>)}
                </select>
                <div className="monster-field-grid">
                  <label><span className="field-label">LV</span><input className="text-input" placeholder="e.g. 42" value={draft.level} onChange={(event) => setDraft((current) => ({ ...current, level: event.target.value }))} /></label>
                  <label><span className="field-label">HP</span><input className="text-input" placeholder="e.g. 12,500" value={draft.hp} onChange={(event) => setDraft((current) => ({ ...current, hp: event.target.value }))} /></label>
                </div>
                <label className="field-label" htmlFor="spawn-time">復活時間</label><input id="spawn-time" className="text-input" placeholder="e.g. 5 minutes" value={draft.spawnTime} onChange={(event) => setDraft((current) => ({ ...current, spawnTime: event.target.value }))} />
              </>}

              {(draft.category === 'monster' || draft.category === 'npc') && (
                <div className="linked-items-section">
                  <div className="linked-items-head"><div><span className="field-label">{draft.category === 'monster' ? 'Dropped items' : 'NPC items'}</span><small>Select reusable records from the Item Library.</small></div><button onClick={() => setPanel('items')}><Database size={14} /> Manage items</button></div>
                  {draft.category === 'npc' && <div className="relation-picker"><button className={draft.itemMode === 'sells' ? 'is-selected' : ''} onClick={() => setDraft((current) => ({ ...current, itemMode: 'sells' }))}>Sells</button><button className={draft.itemMode === 'crafts' ? 'is-selected' : ''} onClick={() => setDraft((current) => ({ ...current, itemMode: 'crafts' }))}>Crafts</button></div>}
                  <input className="text-input item-picker-search" type="search" placeholder="Search items..." aria-label="Search items" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
                  <div className="item-picker-grid">
                    {filteredItems.map((item) => <button type="button" key={item.id} className={draft.itemIds.includes(item.id) ? 'is-selected' : ''} onClick={() => toggleDraftItem(item.id)}>{item.image ? <img src={item.image} alt="" /> : <Package size={18} />}<span>{item.name}</span></button>)}
                    {filteredItems.length === 0 && <p className="item-picker-empty">No matching items.</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="studio-footer"><p>{savedMessage || 'NPCs and monsters appear as free-standing map sprites.'}</p><button className="button button--primary button--wide" disabled={!draft.name.trim() || draft.x === null || (draft.category === 'custom' && !draft.image)} onClick={saveMarker}><MapPinned size={17} /> Save marker</button></div>
          </>
        )}

        {panel === 'items' && (
          <>
            <div className="studio-head"><div><p className="eyebrow">Reusable database</p><h2>Item Library</h2></div><button className="icon-button" onClick={() => setPanel(null)} aria-label="Close item library"><img src="./ui/close.png" alt="" /></button></div>
            <div className="studio-content">
              <button className="back-to-marker" onClick={() => setPanel('marker')}><ArrowLeft size={15} /> Back to current marker</button>
              <div className="library-intro"><Database size={22} /><div><h3>Create items once</h3><p>Reuse them as monster drops, shop goods, or crafting results.</p></div></div>
              <button className="export-data-button" onClick={exportAdminData}><Download size={15} /><span><b>Export publishing data</b><small>Replace public/data/atlas-data.json with this file.</small></span></button>
              <label className="image-upload image-upload--item">
                {newItemImage ? <img src={newItemImage} alt="Item preview" /> : <ImagePlus size={22} />}
                <span>{newItemImage ? 'Replace item image' : 'Upload item image'}</span>
                <input type="file" accept="image/*" onChange={(event) => void handleImage(event.target.files?.[0], 'item')} />
              </label>
              <label className="field-label" htmlFor="item-name">Item name</label>
              <div className="item-create-row"><input id="item-name" className="text-input" placeholder="e.g. Ancient Leaf" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} /><button className="button button--primary" disabled={!newItemName.trim() || duplicateItemName} onClick={saveItem}><Plus size={16} /> Create</button></div>
              {duplicateItemName && <p className="duplicate-item-warning">An item with this name already exists.</p>}
              <div className="library-list">
                <p>{allItems.length} reusable items</p>
                {allItems.map((item) => <div className="library-item" key={item.id}>{item.image ? <img src={item.image} alt="" /> : <span><Package size={19} /></span>}<b>{item.name}</b>{item.custom && <button onClick={() => removeItem(item.id)}>Remove</button>}</div>)}
              </div>
            </div>
          </>
        )}
      </aside>
    </main>
  );
}
