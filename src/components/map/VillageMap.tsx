'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, MapPin, Eye, AlertCircle, Wrench, Building, ShieldAlert, Radio } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface MapPinItem {
  id: string;
  type: 'COMPLAINT' | 'RESOURCE' | 'FACILITY' | 'SOS';
  title: string;
  category?: string;
  priorityBand?: string;
  lat: number;
  lng: number;
  address?: string;
  status?: string;
  capacity?: string;
}

interface VillageMapProps {
  initialPins?: MapPinItem[];
  selectedZone?: string;
  onPinClick?: (pin: MapPinItem) => void;
  center?: [number, number];
  zoom?: number;
}

export default function VillageMap({
  initialPins = [],
  selectedZone,
  onPinClick,
  center = [18.3164, 73.8682],
  zoom = 15,
}: VillageMapProps) {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const [activeLayers, setActiveLayers] = useState<{
    issues: boolean;
    resources: boolean;
    facilities: boolean;
    sos: boolean;
  }>({
    issues: true,
    resources: true,
    facilities: true,
    sos: true,
  });

  const [pins, setPins] = useState<MapPinItem[]>(initialPins);
  const [selectedPin, setSelectedPin] = useState<MapPinItem | null>(null);

  // Default Facilities in Shivapur village
  const staticFacilities: MapPinItem[] = [
    {
      id: 'fac-1',
      type: 'FACILITY',
      title: 'Gram Panchayat Office & CSC Kendra',
      category: 'GOVERNMENT',
      lat: 18.3165,
      lng: 73.8681,
      address: 'Central Chowk',
    },
    {
      id: 'fac-2',
      type: 'FACILITY',
      title: 'Primary Health Centre (PHC)',
      category: 'HEALTH',
      lat: 18.3175,
      lng: 73.8695,
      address: 'North Road',
    },
    {
      id: 'fac-3',
      type: 'FACILITY',
      title: 'Zilla Parishad High School',
      category: 'EDUCATION',
      lat: 18.3188,
      lng: 73.8688,
      address: 'School Ward',
    },
    {
      id: 'fac-4',
      type: 'FACILITY',
      title: 'Public Overhead Water Tank & Booster',
      category: 'WATER',
      lat: 18.3195,
      lng: 73.8675,
      address: 'North Hill',
    },
    {
      id: 'fac-5',
      type: 'FACILITY',
      title: 'Deep Community Handpump #4',
      category: 'WATER',
      lat: 18.3142,
      lng: 73.8655,
      address: 'Zone C Vasti',
    },
  ];

  // Fetch complaints & resources pins if not provided
  useEffect(() => {
    if (initialPins.length > 0) return;

    Promise.all([
      fetch('/api/complaints').then((r) => r.json()).catch(() => ({ complaints: [] })),
      fetch('/api/resources').then((r) => r.json()).catch(() => ({ resources: [] })),
      fetch('/api/sos').then((r) => r.json()).catch(() => ({ alerts: [] })),
    ]).then(([complaintsData, resourcesData, sosData]) => {
      const all: MapPinItem[] = [];

      (complaintsData.complaints || []).forEach((c: any) => {
        all.push({
          id: c.id,
          type: 'COMPLAINT',
          title: `#${c.code}: ${c.title}`,
          category: c.category,
          priorityBand: c.priorityBand,
          lat: c.lat,
          lng: c.lng,
          address: c.address,
          status: c.status,
        });
      });

      (resourcesData.resources || []).forEach((r: any) => {
        all.push({
          id: r.id,
          type: 'RESOURCE',
          title: r.name,
          category: r.category,
          lat: r.lat,
          lng: r.lng,
          capacity: r.capacity,
          address: r.serviceArea,
        });
      });

      (sosData.alerts || []).filter((s: any) => s.status === 'ACTIVE').forEach((s: any) => {
        all.push({
          id: s.id,
          type: 'SOS',
          title: `ACTIVE SOS: ${s.senderName}`,
          category: 'WOMEN_SAFETY',
          priorityBand: 'CRITICAL',
          lat: s.lat,
          lng: s.lng,
          address: s.message,
        });
      });

      setPins([...staticFacilities, ...all]);
    });
  }, [initialPins]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Dynamically import Leaflet to support Next.js SSR
    let isSubscribed = true;

    import('leaflet').then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        const map = L.map(mapContainerRef.current, {
          center,
          zoom,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add village zone boundaries (visual polygon circles)
        L.circle([18.318, 73.868], {
          radius: 400,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map).bindTooltip('Zone A (North Ward)');

        L.circle([18.3164, 73.8682], {
          radius: 450,
          color: '#d97706',
          fillColor: '#d97706',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map).bindTooltip('Zone B (Central Bazaar)');

        L.circle([18.3135, 73.8655], {
          radius: 500,
          color: '#0284c7',
          fillColor: '#0284c7',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map).bindTooltip('Zone C (Farm Belts)');

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        leafletMapRef.current = map;
      }

      // Render pins onto layer
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();

        pins.forEach((pin) => {
          // Check active layer toggles
          if (pin.type === 'COMPLAINT' && !activeLayers.issues) return;
          if (pin.type === 'RESOURCE' && !activeLayers.resources) return;
          if (pin.type === 'FACILITY' && !activeLayers.facilities) return;
          if (pin.type === 'SOS' && !activeLayers.sos) return;

          let colorClass = 'bg-slate-700';
          let letter = '•';

          if (pin.type === 'SOS') {
            colorClass = 'bg-red-600 animate-bounce ring-4 ring-red-400';
            letter = 'SOS';
          } else if (pin.type === 'COMPLAINT') {
            if (pin.priorityBand === 'CRITICAL') colorClass = 'bg-red-600';
            else if (pin.priorityBand === 'HIGH') colorClass = 'bg-amber-600';
            else if (pin.priorityBand === 'MEDIUM') colorClass = 'bg-blue-600';
            else colorClass = 'bg-emerald-600';
            letter = '!';
          } else if (pin.type === 'RESOURCE') {
            colorClass = 'bg-purple-600';
            letter = 'R';
          } else if (pin.type === 'FACILITY') {
            colorClass = 'bg-green-700';
            letter = 'F';
          }

          const icon = L.divIcon({
            className: 'custom-leaflet-icon',
            html: `
              <div class="${colorClass} text-white font-extrabold text-[11px] rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-125">
                ${letter}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([pin.lat, pin.lng], { icon });
          marker.on('click', () => {
            setSelectedPin(pin);
            if (onPinClick) onPinClick(pin);
          });

          marker.bindTooltip(
            `<strong class="font-bold">${pin.title}</strong><br/><span class="text-xs opacity-80">${pin.type} (${pin.category || 'General'})</span>`,
            { direction: 'top', offset: [0, -16] }
          );

          marker.addTo(markersLayerRef.current);
        });
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [pins, activeLayers, center, zoom]);

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="relative w-full h-[550px] sm:h-[650px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900">
      {/* Leaflet CSS inline import to ensure zero broken styling */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Top Floating Layer Controls */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2 sm:p-3 shadow-lg border border-slate-200 dark:border-slate-800 max-w-xs text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-extrabold mb-2 uppercase text-[10px] tracking-wider">
          <Layers className="w-3.5 h-3.5 text-green-600" /> Map Layers
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => toggleLayer('issues')}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[11px] transition-all ${
              activeLayers.issues
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Grievances</span>
          </button>

          <button
            onClick={() => toggleLayer('resources')}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[11px] transition-all ${
              activeLayers.resources
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
            }`}
          >
            <Wrench className="w-3 h-3 text-purple-600" />
            <span>Resources</span>
          </button>

          <button
            onClick={() => toggleLayer('facilities')}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[11px] transition-all ${
              activeLayers.facilities
                ? 'bg-green-100 dark:bg-green-950/60 text-green-900 dark:text-green-200 border-green-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
            }`}
          >
            <Building className="w-3 h-3 text-green-600" />
            <span>Facilities</span>
          </button>

          <button
            onClick={() => toggleLayer('sos')}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[11px] transition-all ${
              activeLayers.sos
                ? 'bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-200 border-red-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-red-600" />
            <span>Active SOS</span>
          </button>
        </div>
      </div>

      {/* Selected Pin Details Overlay Card */}
      {selectedPin && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-green-600 animate-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {selectedPin.type} • {selectedPin.category || 'General'}
              </span>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                {selectedPin.title}
              </h4>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              ×
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            {selectedPin.address || 'Shivapur Village'}
          </p>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Coordinates: {selectedPin.lat.toFixed(4)}, {selectedPin.lng.toFixed(4)}</span>
            {selectedPin.status && (
              <span className="text-green-600 uppercase">{selectedPin.status}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
