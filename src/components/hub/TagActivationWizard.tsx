import React, { useRef } from 'react';
import type { ProductType } from '@/types/nfc';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Star,
  Utensils,
  MapPin,
  Search,
  CheckCircle2,
  Building2,
  KeyRound,
  Store,
  Navigation,
  Heart,
  Wifi,
  BookOpen,
  Gift,
  ArrowRight
} from 'lucide-react';

export interface PlaceSuggestion {
  place_id: string;
  name: string;
  address: string;
  category?: string;
  source: 'google' | 'osm' | 'url';
  direct_url?: string;
  image_url?: string;
  rating?: number;
}

interface TagActivationWizardProps {
  tagId: string;
  selectedType: ProductType;
  setSelectedType: (t: ProductType) => void;
  businessName: string;
  setBusinessName: (n: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  suggestions: PlaceSuggestion[];
  selectedPlace: PlaceSuggestion | null;
  isSearching: boolean;
  isInputFocused: boolean;
  setIsInputFocused: (f: boolean) => void;
  onSelectPlace: (p: PlaceSuggestion) => void;
  pin: string;
  setPin: (p: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function TagActivationWizard({
  tagId,
  selectedType,
  setSelectedType,
  businessName,
  setBusinessName,
  searchQuery,
  setSearchQuery,
  suggestions,
  selectedPlace,
  isSearching,
  isInputFocused,
  setIsInputFocused,
  onSelectPlace,
  pin,
  setPin,
  isSubmitting,
  onSubmit
}: TagActivationWizardProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-black selection:text-white">
      <Card className="relative w-full max-w-lg border border-slate-200 bg-white shadow-xl rounded-2xl overflow-visible">
        {/* Header Visual */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-black animate-pulse" />
              <span className="font-mono text-xs font-semibold text-slate-800">{tagId}</span>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700 text-[11px] font-mono">
              UNCLAIMED
            </Badge>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900 mt-3">
            Aktivasi Smart Stand
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Kaitkan unit akrilik / kartu NFC ini dengan profil bisnis & meja Anda.
          </CardDescription>
        </div>

        <form onSubmit={onSubmit}>
          <CardContent className="p-6 space-y-5">
            {/* Tipe Perangkat Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-slate-500" /> Mode Operasional Unit
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType('DIRECT_REVIEW')}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedType === 'DIRECT_REVIEW'
                      ? 'border-black bg-black text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      selectedType === 'DIRECT_REVIEW' ? 'fill-white text-white' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">Direct Review</div>
                    <div className="text-[10px] opacity-80">Meja Kasir / Receptionist</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('TABLE_HUB')}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedType === 'TABLE_HUB'
                      ? 'border-black bg-black text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  <Utensils
                    className={`h-5 w-5 ${
                      selectedType === 'TABLE_HUB' ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">Table Hub</div>
                    <div className="text-[10px] opacity-80">Meja Makan / Tamu</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Live Visual Preview saat memilih Table Hub */}
            {selectedType === 'TABLE_HUB' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5" /> Preview Tampilan Meja Tamu
                  </span>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                    Live Preview
                  </span>
                </div>


                {/* Mini Mockup Meja */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {businessName ? businessName.substring(0, 2).toUpperCase() : 'TH'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {businessName || 'Nama Toko Anda'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Great choice, awkward chat
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-black text-white text-[11px] font-semibold">
                      <span className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> Leave a Google Review
                      </span>
                      <span className="text-[10px] text-neutral-300">Bintang 5</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 font-medium">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-slate-600" /> View Menu
                      </span>
                      <span className="text-[10px] text-slate-400">PDF / Web</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 font-medium">
                      <span className="flex items-center gap-2">
                        <Wifi className="h-3.5 w-3.5 text-emerald-600" /> Connect to Wi-Fi
                      </span>
                      <span className="text-[10px] text-slate-400">Salin Sandi</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nama Bisnis */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" /> Nama Bisnis / Toko
              </label>
              <Input
                required
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (!searchQuery) setSearchQuery(e.target.value);
                }}
                placeholder="Contoh: coffee shop bsd"
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-black"
              />
            </div>

            {/* Input Lokasi / Dropdown Google Maps (Hanya untuk DIRECT_REVIEW) */}
            {selectedType === 'DIRECT_REVIEW' && (
              <div className="relative space-y-1.5" ref={dropdownRef}>
                <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" /> Lokasi / Link Google Maps
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ketik nama toko atau paste link</span>
                </label>

                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsInputFocused(true);
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    placeholder="Ketik 'coffee shop bsd' atau paste link Maps..."
                    className="h-11 pl-9 pr-9 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-black text-xs"
                  />
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-black" />
                  )}
                </div>

                {/* Autocomplete Suggestions */}
                {isInputFocused && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl p-1.5 text-left divide-y divide-slate-100">
                    {suggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onSelectPlace(item);
                        }}
                        className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                          {item.name ? item.name.substring(0, 2).toUpperCase() : 'GM'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.name}
                            </span>
                            <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              {item.source === 'google' ? 'Google Maps' : item.source === 'url' ? 'Tautan' : 'Lokasi Terdaftar'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.address}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPlace && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-black shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-black">Target Terpilih: </span>
                      <span className="text-slate-600">{selectedPlace.name}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notice / Pengaturan Tambahan Saat Memilih Mode Table Hub */}
            {selectedType === 'TABLE_HUB' && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2 text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Utensils className="h-4 w-4" />
                  <span>Fitur Table Hub (Portal Meja Tamu)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Setelah diaktivasi, tamu yang menyentuh NFC akan langsung melihat halaman <strong>Linktree Meja</strong> lengkap dengan tombol ulasan Google Maps, buku menu digital, Wi-Fi otomatis, reward, dan medsos. Anda dapat mengatur tautannya di CMS kapan saja!
                </p>
              </div>
            )}

            {/* PIN Keamanan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-slate-500" /> Buat PIN Pengelola (4-6 Digit)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Untuk login CMS</span>
              </label>
              <Input
                type="password"
                required
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Contoh: 123456"
                className="h-11 font-mono tracking-widest text-center text-sm rounded-xl border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              {selectedType === 'TABLE_HUB' ? 'Aktivasi Table Hub & Buka Portal' : 'Aktivasi Direct Review Sekarang'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
