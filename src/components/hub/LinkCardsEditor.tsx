import React, { useState, useEffect, useRef } from 'react';
import type { CustomLink } from '@/types/nfc';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Sparkles, MapPin, Search, Loader2, CheckCircle2, Navigation, FileText, Upload, Link as LinkIcon, FileCheck, ExternalLink } from 'lucide-react';
import { parseMapsUrl, resolveMapsUrlAsync } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PlaceSuggestion {
  place_id: string;
  name: string;
  address: string;
  category?: string;
  source: 'google' | 'osm' | 'url';
  direct_url?: string;
}

interface LinkCardsEditorProps {
  tagId?: string;
  customLinks: CustomLink[];
  onAddLink: (preset?: Partial<CustomLink>) => void;
  onRemoveLink: (id: string) => void;
  onLinkChange: (index: number, field: keyof CustomLink, value: any) => void;
}

export function LinkCardsEditor({
  tagId,
  customLinks,
  onAddLink,
  onRemoveLink,
  onLinkChange
}: LinkCardsEditorProps) {
  // State upload PDF untuk tombol Menu
  const [uploadingPdfIdx, setUploadingPdfIdx] = useState<number | null>(null);

  // State untuk pencarian Google Maps pada kartu review
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Live search: Photon (Komoot) + Nominatim fallback untuk akurasi bisnis maksimal
  useEffect(() => {
    const raw = searchQuery.trim();
    if (!raw) {
      setSuggestions([]);
      return;
    }

    // Jika paste link Google Maps langsung
    const parsedUrl = parseMapsUrl(raw);
    if (parsedUrl) {
      setSuggestions([{
        place_id: `URL:${parsedUrl.rawUrl}`,
        name: parsedUrl.name,
        address: parsedUrl.address,
        category: 'Google Maps Link',
        source: 'url',
        direct_url: parsedUrl.rawUrl
      }]);

      // Jika link pendek, coba unshorten asinkron untuk dapatkan form writereview
      if ((raw.includes('maps.app.goo.gl') || raw.includes('goo.gl/maps')) && !parsedUrl.rawUrl.includes('writereview')) {
        void resolveMapsUrlAsync(raw).then((resolved) => {
          if (resolved?.rawUrl && resolved.rawUrl.includes('writereview')) {
            setSuggestions([{
              place_id: `URL:${resolved.rawUrl}`,
              name: resolved.name || parsedUrl.name,
              address: 'Form ulasan bintang 5 langsung (Write Review)',
              category: 'Google Review',
              source: 'url',
              direct_url: resolved.rawUrl
            }]);
          }
        });
      }
      return;
    }

    // Opsi pencarian langsung di Google Maps (selalu ditampilkan pertama)
    const directGoogleOption: PlaceSuggestion = {
      place_id: `NAME-${encodeURIComponent(raw)}`,
      name: raw,
      address: `Buka Google Maps untuk cari "${raw}" lalu copy link-nya`,
      category: 'Google Maps',
      source: 'google',
      direct_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`
    };

    setSuggestions([directGoogleOption]);

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // ponytail: Photon (Komoot) jauh lebih akurat untuk nama bisnis/POI daripada Nominatim
        // Bias lokasi Indonesia (Jakarta) agar hasil lebih relevan
        const [photonRes, nominatimRes] = await Promise.allSettled([
          fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(raw)}&limit=8&lat=-6.2&lon=106.8`),
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(raw)}&addressdetails=1&limit=3&countrycodes=id`, {
            headers: { 'Accept-Language': 'id', 'User-Agent': 'NFC-Review-SmartStand/1.0' }
          })
        ]);

        const results: PlaceSuggestion[] = [];
        const seenNames = new Set<string>();

        // Parse Photon results (biasanya lebih akurat untuk nama bisnis)
        if (photonRes.status === 'fulfilled') {
          const photonData = await photonRes.value.json();
          const features = photonData.features || [];
          for (const f of features) {
            const props = f.properties || {};
            // Filter hanya hasil Indonesia
            if (props.countrycode && props.countrycode !== 'ID') continue;
            const name = props.name || '';
            const city = props.city || props.county || '';
            const street = props.street || '';
            const state = props.state || '';
            const district = props.district || '';
            const address = [street, district, city, state].filter(Boolean).join(', ') || props.country || '';
            const osmType = props.osm_value || props.type || '';
            const key = `${name}-${city}`.toLowerCase();

            if (name && !seenNames.has(key)) {
              seenNames.add(key);
              results.push({
                place_id: `PHOTON-${props.osm_id || results.length}`,
                name,
                address: address || 'Indonesia',
                category: osmType.replace(/_/g, ' ') || 'Lokasi',
                source: 'osm',
                direct_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`
              });
            }
          }
        }

        // Parse Nominatim results (fallback, bagus untuk alamat)
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
        // Gunakan directGoogleOption saja
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPlace = (idx: number, place: PlaceSuggestion) => {
    const directUrl = place.direct_url
      ? place.direct_url
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
    
    onLinkChange(idx, 'url', directUrl);
    setActiveSearchIdx(null);
    setSearchQuery('');
    setSuggestions([]);
    toast.success(`Lokasi "${place.name}" berhasil dihubungkan ke Google Maps!`);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, linkIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error('File harus berupa dokumen PDF (.pdf)');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Ukuran PDF maksimal 25 MB');
      return;
    }

    setUploadingPdfIdx(linkIdx);
    try {
      const folderPrefix = tagId || 'public-menus';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${folderPrefix}/menu-${Date.now()}-${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('nfc')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicData } = supabase.storage.from('nfc').getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl || '';

      onLinkChange(linkIdx, 'url', publicUrl);
      toast.success(`File PDF Menu "${file.name}" berhasil diunggah!`);
    } catch (err: any) {
      toast.error(`Gagal mengunggah PDF: ${err.message || 'Cek koneksi internet'}`);
    } finally {
      setUploadingPdfIdx(null);
      e.target.value = '';
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-xs rounded-3xl">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-black" />
            Tombol Tautan &amp; Call-to-Action Meja
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Kelola tombol interaktif seperti Review Google (Search Maps), Menu, Wi-Fi, Reward, dan Mini Games.
          </CardDescription>
        </div>

        {/* Preset Cepat */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddLink({
              title: 'Leave a Google Review',
              icon: 'google',
              url: 'https://search.google.com/local/writereview',
              highlight: true
            })}
            className="text-[10px] h-7 px-2.5 rounded-lg border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100"
          >
            + Review
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddLink({
              title: 'Connect to Wi-Fi',
              icon: 'wifi',
              url: '#wifi',
              highlight: false
            })}
            className="text-[10px] h-7 px-2.5 rounded-lg border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100"
          >
            + Wi-Fi
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddLink({
              title: 'Play UNO No Mercy',
              icon: 'game',
              url: 'https://unonomercy.in/',
              highlight: false
            })}
            className="text-[10px] h-7 px-2.5 rounded-lg border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100"
          >
            + Game (UNO)
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onAddLink()}
            className="text-[10px] h-7 px-2.5 rounded-lg bg-black text-white font-bold"
          >
            <Plus className="h-3 w-3 mr-1" /> Tambah Kartu
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3.5">
        {customLinks.map((link, idx) => (
          <div
            key={link.id || idx}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-50/50 flex flex-col gap-2.5 sm:gap-3 transition-all hover:border-slate-300 relative"
          >
            {/* Header Item: Nomor Urut, Judul, Toggle Aktif/Nonaktif & Hapus */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                <span className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                  link.enabled !== false ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {idx + 1}
                </span>
                <Input
                  value={link.title}
                  onChange={(e) => onLinkChange(idx, 'title', e.target.value)}
                  placeholder="Judul Tombol"
                  className="h-7 sm:h-8 text-[11px] sm:text-xs font-bold bg-white rounded-lg border-slate-200"
                />
              </div>

              {/* Toggle Aktif / Nonaktif Switch Button */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onLinkChange(idx, 'enabled', link.enabled === false ? true : false)}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer ${
                    link.enabled !== false
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300'
                  }`}
                  title="Klik untuk aktifkan / sembunyikan tombol dari tampilan tamu"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${link.enabled !== false ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{link.enabled !== false ? 'Aktif' : 'Nonaktif'}</span>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveLink(link.id)}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 cursor-pointer"
                  title="Hapus tombol"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Contextual Action / URL Section */}
            <div className={`space-y-1.5 transition-opacity ${link.enabled === false ? 'opacity-50' : 'opacity-100'}`}>
              {/* Jika tipe tombol adalah Wi-Fi */}
              {link.icon === 'wifi' || link.url === '#wifi' ? (
                <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between text-xs text-teal-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="font-semibold text-[11px]">
                      Aksi Sistem: Otomatis Menampilkan Dialog Wi-Fi &amp; Salin Sandi
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                    Target: Pengaturan Wi-Fi Meja
                  </span>
                </div>
              ) : link.icon === 'feedback' || link.url === '#feedback' ? (
                /* Jika tipe tombol adalah Feedback */
                <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-center justify-between text-xs text-sky-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span className="font-semibold text-[11px]">
                      Aksi Sistem: Buka Form Kritik &amp; Saran Masuk Meja {idx + 1}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Target: Kotak Masuk CMS
                  </span>
                </div>
              ) : link.icon === 'menu' || link.title.toLowerCase().includes('menu') ? (
                /* Khusus Menu: 2 Opsi (Link Web / Upload Dokumen PDF) */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-600" /> Sumber Menu:
                    </label>
                    <span className="text-[9px] text-slate-400">Pilih Upload PDF atau Link Website</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/90 space-y-2">
                    {/* Mode Selector */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          disabled={uploadingPdfIdx === idx}
                          onChange={(e) => handlePdfUpload(e, idx)}
                        />
                        <div className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-lg border text-[11px] sm:text-xs font-bold transition-all ${
                          link.url && link.url.includes('.pdf')
                            ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {uploadingPdfIdx === idx ? (
                            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-amber-600" />
                          ) : link.url && link.url.includes('.pdf') ? (
                            <FileCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                          ) : (
                            <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                          )}
                          <span className="text-[11px] sm:text-xs">{uploadingPdfIdx === idx ? 'Mengunggah...' : link.url && link.url.includes('.pdf') ? 'Ganti File PDF' : 'Upload File PDF'}</span>
                        </div>
                      </label>

                      <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">atau</div>

                      <div className="flex-1">
                        <div className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-lg border text-[11px] sm:text-xs font-bold ${
                          !link.url || !link.url.includes('.pdf')
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                          <LinkIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="text-[11px] sm:text-xs">Link Web / Drive</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Info jika PDF aktif */}
                    {link.url && link.url.includes('.pdf') && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[10px] sm:text-[11px] text-amber-900">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="font-medium truncate">Dokumen PDF Menu Aktif</span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline shrink-0 ml-1"
                        >
                          Lihat PDF
                        </a>
                      </div>
                    )}

                    {/* Input URL link */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">
                          {link.url && link.url.includes('.pdf') ? 'URL Berkas PDF Terunggah:' : 'Tautan / Link Website Menu (Drive, Website, GoFood dll):'}
                        </span>
                      </div>
                      <Input
                        value={link.url}
                        onChange={(e) => onLinkChange(idx, 'url', e.target.value)}
                        placeholder="https://menu.online atau upload PDF..."
                        className="h-7 sm:h-8 text-[11px] sm:text-xs bg-slate-50/50 rounded-lg border-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Jika tipe tombol adalah link URL biasa atau Google Review */
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-700">
                      {link.icon === 'google' ? 'Tautan Ulasan Google Maps:' : 'Tautan / URL Tujuan:'}
                    </label>
                    {link.icon === 'google' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeSearchIdx === idx) {
                            setActiveSearchIdx(null);
                          } else {
                            setActiveSearchIdx(idx);
                            setSearchQuery('');
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                      >
                        <Search className="w-3 h-3" />
                        {activeSearchIdx === idx ? 'Tutup Pencarian' : 'Cari di Google Maps'}
                      </button>
                    )}
                  </div>

                  {/* Pencarian Lokasi Google Maps jika dibuka */}
                  {activeSearchIdx === idx && (
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2 mb-2 relative" ref={searchDropdownRef}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-900 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-600" /> Cari Lokasi Bisnis
                        </span>
                        <span className="text-[9px] text-blue-600">Ketik nama toko atau paste link maps</span>
                      </div>
                      <div className="relative">
                        <Input
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Ketik nama bisnis atau paste link Google Maps..."
                          className="h-8 pl-8 pr-8 text-xs bg-white rounded-lg border-blue-300 focus-visible:ring-blue-600"
                        />
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-500" />
                        {isSearching && (
                          <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-blue-600" />
                        )}
                      </div>

                      {/* Dropdown Suggestions */}
                      {suggestions.length > 0 && (
                        <div className="rounded-xl border border-blue-200 bg-white shadow-lg overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {suggestions.map((item, sIdx) => (
                            item.source === 'google' ? (
                              /* Opsi Google Maps: buka di tab baru, lalu user paste link kembali */
                              <a
                                key={sIdx}
                                href={item.direct_url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full text-left p-2.5 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 transition-colors flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
                                  <Search className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-blue-900">
                                    Cari "{item.name}" di Google Maps
                                  </span>
                                  <p className="text-[10px] text-blue-600 leading-snug">
                                    Buka Google Maps → Copy link bisnis → Paste di sini
                                  </p>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              </a>
                            ) : (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleSelectPlace(idx, item)}
                                className="w-full text-left p-2 hover:bg-blue-50/70 transition-colors flex items-start gap-2 cursor-pointer"
                              >
                                <div className="p-1 rounded-md bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                                  {item.source === 'url' ? (
                                    <Navigation className="h-3.5 w-3.5" />
                                  ) : (
                                    <MapPin className="h-3.5 w-3.5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {item.name}
                                    </span>
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                      {item.category || item.source}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate leading-snug">
                                    {item.address}
                                  </p>
                                </div>
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 self-center" />
                              </button>
                            )
                          ))}
                        </div>
                      )}

                      {/* Petunjuk paste link */}
                      <div className="text-[9px] text-blue-700/70 text-center pt-1">
                        Tip: Buka Google Maps di browser, cari bisnis Anda, lalu copy & paste link-nya di kolom di atas
                      </div>
                    </div>
                  )}

                  <Input
                    value={link.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      // ponytail: auto-convert jika paste link google maps langsung ke input manual
                      const parsed = parseMapsUrl(val);
                      if (parsed?.rawUrl && parsed.rawUrl.includes('writereview')) {
                        onLinkChange(idx, 'url', parsed.rawUrl);
                        toast.success('Otomatis diubah menjadi link langsung ke form ulasan bintang!');
                      } else {
                        onLinkChange(idx, 'url', val);
                      }
                    }}
                    placeholder="https://... atau paste link Google Maps"
                    className="h-8 text-xs bg-white rounded-lg border-slate-200 font-mono"
                  />
                </>
              )}
            </div>


            {/* Konfigurasi Icon & Highlight Style */}
            <div className={`grid grid-cols-2 gap-3 pt-1 transition-opacity ${link.enabled === false ? 'opacity-50' : 'opacity-100'}`}>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1">Pilihan Icon:</label>
                <select
                  value={link.icon || 'link'}
                  onChange={(e) => onLinkChange(idx, 'icon', e.target.value)}
                  className="w-full text-xs h-8 rounded-lg bg-white border border-slate-200 px-2 text-slate-800"
                >
                  <option value="rewards">Heart / Rewards (Gift)</option>
                  <option value="google">Google Review (Star)</option>
                  <option value="menu">View Menu (Utensils)</option>
                  <option value="wifi">Connect to Wi-Fi</option>
                  <option value="feedback">Anonymous Feedback (Chat)</option>
                  <option value="game">Play Games (Gamepad)</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="link">Tautan Web Biasa (Globe)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1">Aksen Tampilan:</label>
                <select
                  value={link.highlight ? 'true' : 'false'}
                  onChange={(e) => onLinkChange(idx, 'highlight', e.target.value === 'true')}
                  className="w-full text-xs h-8 rounded-lg bg-white border border-slate-200 px-2 text-slate-800"
                >
                  <option value="false">Standar (Sleek Clean Card)</option>
                  <option value="true">Highlight (Dark Bold CTA)</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

