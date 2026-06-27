'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import type { TravelLocation, TravelCategory } from '@/setting/AboutSetting';
import { travelCategoryConfig } from '@/setting/AboutSetting';

// 修复 Leaflet 默认图标路径问题
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 按分类创建不同颜色的标记图标
const createCategoryIcon = (category: TravelCategory) => {
  const color = travelCategoryConfig[category].color;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 20px; height: 20px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
};

// 自适应视口组件
function FitBounds({ locations }: { locations: TravelLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;
    if (locations.length === 1) {
      map.setView(locations[0].coordinates, 10);
      return;
    }
    const bounds = L.latLngBounds(locations.map((l) => l.coordinates));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [locations, map]);

  return null;
}

// Popup 内容组件
function LocationPopup({ location }: { location: TravelLocation }) {
  const config = travelCategoryConfig[location.category];
  return (
    <div className="min-w-[160px]">
      <div className="mb-0.5">
        <h4 className="font-bold text-sm leading-tight text-gray-900 dark:text-white">
          {location.city}{location.province && <span className="font-normal text-xs text-gray-400 dark:text-gray-500 ml-1">{location.province}</span>}
        </h4>
      </div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500">
        <span>{location.date}</span>
      </div>
      {location.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-1.5 pt-1.5 border-t border-gray-100/80 dark:border-gray-700/50">
          {location.description}
        </p>
      )}
    </div>
  );
}

// 图例组件
function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        {(Object.entries(travelCategoryConfig) as [TravelCategory, { label: string; color: string }][]).map(
          ([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: config.color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-300">{config.label}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// 亮色地图
function TravelMapInner({ locations }: { locations: TravelLocation[] }) {
  const center: [number, number] = [35.8617, 104.1954];

  return (
    <MapContainer
      center={center}
      zoom={4}
      scrollWheelZoom={true}
      className="w-full h-full rounded-xl"
      style={{ background: '#e8e4df' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.amap.com/" target="_blank">高德地图</a>'
        url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
        subdomains="1234"
      />
      <FitBounds locations={locations} />
      {locations.map((loc) => (
        <Marker key={loc.id} position={loc.coordinates} icon={createCategoryIcon(loc.category)}>
          <Popup>
            <LocationPopup location={loc} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// 暗色地图
function TravelMapInnerDark({ locations }: { locations: TravelLocation[] }) {
  const center: [number, number] = [35.8617, 104.1954];

  return (
    <MapContainer
      center={center}
      zoom={4}
      scrollWheelZoom={true}
      className="w-full h-full rounded-xl"
      style={{ background: '#1a1a2e' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.amap.com/" target="_blank">高德地图</a>'
        url="https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=1&style=8&ltype=11&x={x}&y={y}&z={z}"
        subdomains="1234"
      />
      <FitBounds locations={locations} />
      {locations.map((loc) => (
        <Marker key={loc.id} position={loc.coordinates} icon={createCategoryIcon(loc.category)}>
          <Popup>
            <LocationPopup location={loc} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// 主组件
export default function TravelMap({
  locations,
}: {
  locations: TravelLocation[];
}) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!mounted || locations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative rounded-2xl border border-border overflow-hidden shadow-lg"
      style={{ height: '450px' }}
    >
      {isDark ? (
        <TravelMapInnerDark locations={locations} />
      ) : (
        <TravelMapInner locations={locations} />
      )}
      <MapLegend />
    </motion.div>
  );
}
