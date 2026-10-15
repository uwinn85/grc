import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { NfcTagEntity, ProductType } from '@/types/nfc';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { TableHubPortal } from '@/components/hub/TableHubPortal';
import { TagActivationWizard, type PlaceSuggestion } from '@/components/hub/TagActivationWizard';
import { parseMapsUrl } from '@/lib/utils';


export default function PublicHandler() {
  const { tagId } = useParams<{ tagId: string }>();
  const [tag, setTag] = useState<NfcTagEntity | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [pin, setPin] = useState('');
  const [selectedType, setSelectedType] = useState<ProductType>('DIRECT_REVIEW');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Location Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (tagId) {
      resolveTag(tagId);
    }
  }, [tagId]);

  async function resolveTag(id: string) {
    try {
      const { data, error } = await supabase
        .from('nfc_tags')
        .select('id, type, business_name, google_place_id, is_active, total_taps, hub_config, created_at, updated_at')
        .eq('id', id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const currentTag = data as NfcTagEntity;
      setTag(currentTag);

      if (currentTag.is_active) {
        // Catat tap secara non-blocking
        void supabase.rpc('record_tag_tap', { p_tag_id: id });

        if (currentTag.type === 'DIRECT_REVIEW') {
          const pid = currentTag.google_place_id || '';
          let targetUrl = pid.startsWith('URL:')
            ? pid.replace('URL:', '')
            : pid.startsWith('OSM-') || pid.startsWith('NAME-')
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTag.business_name || '')}`
            : `https://search.google.com/local/writereview?placeid=${pid}`;

          // ponytail: double-check jika targetUrl masih link google maps biasa, konversi instan ke writereview
          const parsed = parseMapsUrl(targetUrl);
          if (parsed?.rawUrl && parsed.rawUrl.includes('writereview')) {
            targetUrl = parsed.rawUrl;
          }

          // Langsung redirect seketika
          window.location.replace(targetUrl);
          return;
        }
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  // Generate Suggestions: Photon + Nominatim untuk akurasi bisnis maksimal
  useEffect(() => {
    const raw = searchQuery.trim();
    if (!raw) {
      setSuggestions([]);
      return;
    }

    const parsedUrl = parseMapsUrl(raw);
    if (parsedUrl) {
      setSuggestions([{
        place_id: `URL:${parsedUrl.rawUrl}`,
        name: businessName || parsedUrl.name,
        address: parsedUrl.address,
        category: 'Google Maps Link',
        source: 'url',
        direct_url: parsedUrl.rawUrl
      }]);
      return;
    }

    const directGoogleOption: PlaceSuggestion = {
      place_id: `NAME-${encodeURIComponent(raw)}`,
      name: raw,
      address: `Cari langsung di Google Maps: "${raw}"`,
      category: 'Google Maps',
      source: 'google',
      direct_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`
    };

    setSuggestions([directGoogleOption]);

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // ponytail: Photon + Nominatim combo, Photon lebih akurat untuk nama bisnis
        const [photonRes, nominatimRes] = await Promise.allSettled([
          fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(raw)}&limit=8&lat=-6.2&lon=106.8`),
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(raw)}&addressdetails=1&limit=3&countrycodes=id`, {
            headers: { 'Accept-Language': 'id', 'User-Agent': 'NFC-Review-SmartStand/1.0' }
          })
        ]);

        const results: PlaceSuggestion[] = [];
        const seenNames = new Set<string>();

        if (photonRes.status === 'fulfilled') {
          const photonData = await photonRes.value.json();
          for (const f of (photonData.features || [])) {
            const props = f.properties || {};
            if (props.countrycode && props.countrycode !== 'ID') continue;
            const name = props.name || '';
            const city = props.city || props.county || '';
            const street = props.street || '';
            const state = props.state || '';
            const district = props.district || '';
            const address = [street, district, city, state].filter(Boolean).join(', ') || props.country || '';
            const key = `${name}-${city}`.toLowerCase();

            if (name && !seenNames.has(key)) {
              seenNames.add(key);
              results.push({
                place_id: `PHOTON-${props.osm_id || results.length}`,
                name,
                address: address || 'Indonesia',
                category: (props.osm_value || props.type || '').replace(/_/g, ' ') || 'Lokasi',
                source: 'osm',
                direct_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`
              });
            }
          }
        }

        if (nominatimRes.status === 'fulfilled') {
          const nomData = await nominatimRes.value.json();
          for (const item of nomData) {
            const name = item.name || item.display_name.split(',')[0];
            const key = `${name}-${(item.address?.city || '')}`.toLowerCase();
            if (!seenNames.has(key)) {
              seenNames.add(key);
              results.push({
                place_id: `OSM-${item.place_id}`,
                name,
                address: item.display_name,
                category: item.type ? item.type.replace(/_/g, ' ') : 'Lokasi',
                source: 'osm',
                direct_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
              });
            }
          }
        }

        setSuggestions([directGoogleOption, ...results]);
      } catch {
        // Fallback ke directGoogleOption
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, businessName]);

  function handleSelectPlace(item: PlaceSuggestion) {
    setSelectedPlace(item);
    setPlaceId(item.place_id);
    setSearchQuery(item.name);
    setBusinessName(item.name);
    setIsInputFocused(false);
    toast.success(`Profil "${item.name}" terpilih!`);
  }

  async function handleActivateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagId) return;

    if (!businessName.trim()) {
      toast.error('Masukkan nama bisnis Anda.');
      return;
    }

    const effectivePlaceId = placeId || `NAME-${encodeURIComponent(businessName)}`;

    if (pin.length < 4) {
      toast.error('PIN minimal 4 digit numerik.');
      return;
    }

    setIsSubmitting(true);
    const { data: success, error } = await supabase.rpc('activate_nfc_tag', {
      p_tag_id: tagId,
      p_type: selectedType,
      p_business_name: businessName,
      p_place_id: effectivePlaceId,
      p_pin: pin
    });

    setIsSubmitting(false);

    if (!error && success) {
      toast.success('Unit berhasil diaktivasi!');
      if (selectedType === 'DIRECT_REVIEW') {
        const targetUrl = effectivePlaceId.startsWith('URL:')
          ? effectivePlaceId.replace('URL:', '')
          : effectivePlaceId.startsWith('OSM-') || effectivePlaceId.startsWith('NAME-')
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}`
          : `https://search.google.com/local/writereview?placeid=${effectivePlaceId}`;

        setTimeout(() => window.location.replace(targetUrl), 500);
      } else {
        setTimeout(() => window.location.reload(), 500);
      }
    } else {
      toast.error(error ? `Gagal aktivasi: ${error.message}` : 'Aktivasi unit gagal atau unit sudah terdaftar.');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-black p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-black" />
        </div>
        <p className="mt-4 text-xs font-mono tracking-widest text-slate-500 uppercase">
          Menghubungkan ke Smart Unit...
        </p>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-black border border-slate-200 mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-black">ID Tag Tidak Ditemukan</h2>
          <p className="mt-2 text-xs text-slate-500">
            Unit fisik ini belum terdaftar di sistem inventaris pabrik.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center text-xs font-semibold text-black hover:underline underline-offset-4"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Tampilan Type 2: Table Hub (Candour & Linktree Style Meja - Gambar 4)
  if (tag.is_active && tag.type === 'TABLE_HUB') {
    const pid = tag.google_place_id || '';
    const reviewUrl = pid.startsWith('URL:')
      ? pid.replace('URL:', '')
      : pid.startsWith('OSM-') || pid.startsWith('NAME-')
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tag.business_name || '')}`
      : `https://search.google.com/local/writereview?placeid=${pid}`;

    return <TableHubPortal tag={tag} reviewUrl={reviewUrl} />;
  }

  // Tampilan jika Direct Review sedang diarahkan
  if (tag.is_active && tag.type === 'DIRECT_REVIEW') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-black p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-black" />
        </div>
        <p className="mt-4 text-xs font-mono tracking-widest text-slate-500 uppercase">
          Membuka Google Review {tag.business_name}...
        </p>
      </div>
    );
  }

  // Tampilan Form Aktivasi Awal
  return (
    <TagActivationWizard
      tagId={tag.id}
      selectedType={selectedType}
      setSelectedType={setSelectedType}
      businessName={businessName}
      setBusinessName={setBusinessName}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      suggestions={suggestions}
      selectedPlace={selectedPlace}
      isSearching={isSearching}
      isInputFocused={isInputFocused}
      setIsInputFocused={setIsInputFocused}
      onSelectPlace={handleSelectPlace}
      pin={pin}
      setPin={setPin}
      isSubmitting={isSubmitting}
      onSubmit={handleActivateTag}
    />
  );
}
