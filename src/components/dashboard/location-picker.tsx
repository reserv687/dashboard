'use client';

import L from 'leaflet';
import { useRef, useEffect, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { Button } from "@/components/ui/button";
import { ExternalLink, Locate } from "lucide-react";
import dynamic from 'next/dynamic';

type LatLng = [number, number];

interface LocationPickerProps {
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  initialLocation?: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null;
  readOnly?: boolean;
  showDirectionsButton?: boolean;
}

const LocationPickerComponent = ({ 
  onLocationSelect,
  initialLocation,
  readOnly = false,
  showDirectionsButton = false
}: LocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const defaultPosition: LatLng = useMemo(() => [24.7136, 46.6753], []); // الرياض
  const [isLocating, setIsLocating] = useState(false);

  const handleOpenInGoogleMaps = () => {
    if (initialLocation) {
      // استخدم lat/lng إذا كانت موجودة، وإلا استخدم latitude/longitude
      const lat = initialLocation.lat || initialLocation.latitude;
      const lng = initialLocation.lng || initialLocation.longitude;

      if (typeof lat === 'number' && typeof lng === 'number') {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      alert('الموقع غير مدعوم في متصفحك');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        if (leafletMapRef.current && markerRef.current) {
          const newLatLng = [lat, lng] as [number, number];
          markerRef.current.setLatLng(newLatLng);
          leafletMapRef.current.setView(newLatLng, 15);
          onLocationSelect?.({ lat, lng });
        }
        
        setIsLocating(false);
      },
      () => {
        alert('حدث خطأ في تحديد موقعك');
        setIsLocating(false);
      }
    );
  };

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // تحديث تحويل الإحداثيات
    let position: [number, number];
    if (initialLocation) {
      const lat = initialLocation.lat || initialLocation.latitude;
      const lng = initialLocation.lng || initialLocation.longitude;
      
      if (typeof lat === 'number' && typeof lng === 'number') {
        position = [lat, lng];
      } else {
        position = defaultPosition;
      }
    } else {
      position = defaultPosition;
    }

    // تهيئة الخريطة
    const map = L.map(mapRef.current, {
      dragging: !readOnly,
      touchZoom: !readOnly,
      scrollWheelZoom: !readOnly,
      doubleClickZoom: !readOnly,
      // zIndex property is not supported in MapOptions type
    }).setView(position, 13);
    
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',  // إزالة النص في الأسفل
      zIndex: 0  // إضافة zIndex منخفض
    }).addTo(map);

    // تهيئة الأيقونة
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // إضافة العلامة
    const marker = L.marker(position, { 
      icon,
      draggable: !readOnly
    }).addTo(map);
    
    markerRef.current = marker;

    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onLocationSelect?.({ lat, lng });
      });
    }

    return () => {
      map.remove();
      leafletMapRef.current = null;
      markerRef.current = null;
    };
  }, [initialLocation, onLocationSelect, readOnly, defaultPosition]);

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="h-full w-full rounded-lg overflow-hidden border bg-gray-100 
          [&_.leaflet-pane]:!z-[1] 
          [&_.leaflet-control]:!z-[2] 
          [&_.leaflet-top]:!z-[2] 
          [&_.leaflet-bottom]:!z-[2] 
          [&_.leaflet-control-attribution]:!hidden
          [&_.leaflet-control-geocoder]:!z-[2]
          [&_.leaflet-popup]:!z-[2]
          [&_.leaflet-control-zoom]:!z-[2]"
        style={{ minHeight: "200px" }}
      />
      {/* زر فتح في خرائط جوجل - أعلى اليمين */}
      <div className="absolute top-2 right-2 z-[20]">
        {showDirectionsButton && initialLocation && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleOpenInGoogleMaps}
            className="bg-white shadow-md hover:bg-gray-100"
          >
            <ExternalLink className="h-4 w-4 ml-2" />
            فتح في خرائط جوجل
          </Button>
        )}
      </div>
      {/* زر تحديد موقعي - أسفل اليسار */}
      <div className="absolute bottom-2 left-2 z-[20]">
        {!readOnly && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleLocationRequest}
            disabled={isLocating}
            className="bg-white shadow-md hover:bg-gray-100"
          >
            <Locate className="h-4 w-4 ml-2" />
            {isLocating ? 'جاري التحديد...' : 'موقعي الحالي'}
          </Button>
        )}
      </div>
    </div>
  );
};

export const LocationPicker = dynamic(() => Promise.resolve(LocationPickerComponent), { ssr: false });
