import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { NfcTagEntity, FeedbackItem } from '@/types/nfc';
import { LinkIconBadge } from './LinkIconBadge';
import { ExternalLink, Camera, Settings2, Gift, Play, Music, Sparkles, Wifi as WifiIcon, Copy, X, Check, QrCode, MessageSquare, Send, Star, Loader2, MessageCircle, CornerDownRight, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { parseMapsUrl } from '@/lib/utils';

interface TableHubPortalProps {
  tag: NfcTagEntity;
  reviewUrl: string;
}

export function TableHubPortal({ tag, reviewUrl }: TableHubPortalProps) {
  const cfg = tag.hub_config || {};
  const tagline = cfg.tagline || 'Great choice, awkward chat';
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // State untuk Anonymous Feedback Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbacksList, setFeedbacksList] = useState<FeedbackItem[]>(cfg.feedbacks || []);

  // Supabase Realtime: dengarkan perubahan baris tag ini secara live
  useEffect(() => {
    if (!tag?.id) return;

    const channel = supabase
      .channel(`realtime-tag-${tag.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nfc_tags',
          filter: `id=eq.${tag.id}`
        },
        (payload) => {
          const updatedTag = payload.new as NfcTagEntity;
          if (updatedTag?.hub_config?.feedbacks) {
            setFeedbacksList(updatedTag.hub_config.feedbacks);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tag?.id]);

  // State untuk balas komentar di portal
  const [activeReplyFbId, setActiveReplyFbId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ name: string; text: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const linksToRender = (cfg.custom_links && cfg.custom_links.length > 0
    ? cfg.custom_links
    : [
      { id: '1', title: 'Leave a Google Review', url: reviewUrl, icon: 'google' as const, highlight: true },
      { id: '2', title: 'View Menu', url: cfg.menu_url || '#menu', icon: 'menu' as const },
      { id: '3', title: 'Connect to Wi-Fi', url: '#wifi', icon: 'wifi' as const },
      { id: '4', title: 'Leave Anonymous Feedback', url: '#feedback', icon: 'feedback' as const },
      { id: '5', title: 'Play UNO No Mercy', url: 'https://unonomercy.in/', icon: 'game' as const }
    ]).filter((link) => link.enabled !== false);


  const handleLinkClick = (link: typeof linksToRender[0], e: React.MouseEvent) => {
    if (link.url === '#wifi' || link.icon === 'wifi') {
      e.preventDefault();
      if (cfg.wifi_pass) {
        navigator.clipboard?.writeText(cfg.wifi_pass);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        toast.success(`Password Wi-Fi disalin otomatis!`, {
          description: `SSID: ${cfg.wifi_ssid || 'Toko'}`
        });
      }
      setWifiModalOpen(true);
      return;
    }

    if (link.url === '#feedback' || link.icon === 'feedback' || link.title.toLowerCase().includes('feedback')) {
      e.preventDefault();
      setFeedbackModalOpen(true);
      return;
    }
  };

  const copyWifiPassword = () => {
    if (cfg.wifi_pass) {
      navigator.clipboard?.writeText(cfg.wifi_pass);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success(`Password disalin: ${cfg.wifi_pass}`);
    } else {
      toast.info('Jaringan ini tidak memerlukan sandi.');
    }
  };

  // Kirim feedback tamu ke Supabase khusus tag ini
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      toast.error('Tuliskan komentar atau masukan Anda terlebih dahulu.');
      return;
    }

    setSubmittingFeedback(true);
    const newFeedback: FeedbackItem = {
      id: `fb-${Date.now()}`,
      sender_name: guestName.trim() || 'Tamu Meja',
      comment: commentText.trim(),
      rating,
      created_at: new Date().toISOString(),
      replies: []
    };

    const updatedFeedbacks = [newFeedback, ...feedbacksList];

    try {
      const { data: currentData } = await supabase
        .from('nfc_tags')
        .select('hub_config')
        .eq('id', tag.id)
        .single();

      const latestCfg = currentData?.hub_config || cfg;
      const mergedConfig = {
        ...latestCfg,
        feedbacks: updatedFeedbacks
      };

      const { error } = await supabase
        .from('nfc_tags')
        .update({ hub_config: mergedConfig, updated_at: new Date().toISOString() })
        .eq('id', tag.id);

      if (!error) {
        setFeedbacksList(updatedFeedbacks);
        setCommentText('');
        toast.success('Terima kasih! Masukan Anda berhasil dikirim.');
      } else {
        toast.error(`Gagal mengirim masukan: ${error.message}`);
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat mengirim.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Balas komentar dari tamu di portal
  const handleSendReply = async (feedbackId: string) => {
    if (!replyText.trim()) {
      toast.error('Tuliskan balasan Anda terlebih dahulu.');
      return;
    }

    setSubmittingReply(true);
    const updated = feedbacksList.map((fb) => {
      if (fb.id === feedbackId) {
        const currentReplies = fb.replies || [];
        return {
          ...fb,
          replies: [
            ...currentReplies,
            {
              id: `rep-${Date.now()}`,
              sender: 'guest' as const,
              sender_name: guestName.trim() || 'Tamu',
              message: replyText.trim(),
              created_at: new Date().toISOString(),
              reply_to_name: replyTarget?.name,
              reply_to_text: replyTarget?.text
            }
          ]
        };
      }
      return fb;
    });

    try {
      const { data: currentData } = await supabase
        .from('nfc_tags')
        .select('hub_config')
        .eq('id', tag.id)
        .single();

      const latestCfg = currentData?.hub_config || cfg;
      const mergedConfig = {
        ...latestCfg,
        feedbacks: updated
      };

      const { error } = await supabase
        .from('nfc_tags')
        .update({ hub_config: mergedConfig, updated_at: new Date().toISOString() })
        .eq('id', tag.id);

      if (!error) {
        setFeedbacksList(updated);
        setReplyText('');
        setActiveReplyFbId(null);
        setReplyTarget(null);
        toast.success('Balasan terkirim!');
      } else {
        toast.error(`Gagal mengirim balasan: ${error.message}`);
      }
    } catch {
      toast.error('Terjadi kesalahan saat membalas.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Format QR Code Wi-Fi standar (WIFI:S:ssid;T:WPA;P:password;;)
  const wifiQrData = encodeURIComponent(
    `WIFI:S:${cfg.wifi_ssid || ''};T:WPA;P:${cfg.wifi_pass || ''};;`
  );
  const wifiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${wifiQrData}&margin=10`;



  return (
    <div className="bg-[#F0F2F5] text-slate-800 font-sans min-h-screen antialiased flex flex-col justify-between selection:bg-rose-100 selection:text-rose-900">
      <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-12 flex-1 flex flex-col items-center justify-center">
        {/* Desktop Split / Mobile Centered Container */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center max-w-5xl">

          {/* Venue Info Sidebar (Visible on LG screens, matches Stitch layout) */}
          <aside className="lg:col-span-5 hidden lg:flex flex-col gap-5 lg:sticky lg:top-8 order-2 lg:order-1">
            {/* Cafe Brand Identity Card */}
            <section className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {cfg.avatar_url ? (
                  <img
                    src={cfg.avatar_url}
                    alt={tag.business_name || ''}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex flex-col items-center justify-center text-center p-1 text-white shadow-md select-none shrink-0">
                    <span className="text-[11px] font-extrabold tracking-wider leading-none uppercase text-amber-300">
                      {tag.business_name ? tag.business_name.split(' ')[0] : 'ADALAHH'}
                    </span>
                    <span className="text-[8px] font-semibold tracking-widest text-slate-300 mt-0.5">
                      & FIELDS
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                      {tag.business_name || 'adalahh'}
                    </h1>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                      Open
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium italic mt-0.5">“{tagline}”</p>
                </div>
              </div>

              {/* Table Identifier Chip */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-auto h-8 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center font-bold text-xs font-mono">
                    #{tag.id.replace('TAG', '') || '01'}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Tag {tag.id} • Table Service
                    </p>
                    <p className="text-[11px] text-slate-500">Service: Direct Table Hub Active</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400">Verified Tag</span>
              </div>

              {cfg.bio && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {cfg.bio}
                </p>
              )}
            </section>

            {/* Quick Wi-Fi Card on Desktop */}
            {cfg.wifi_ssid && (
              <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <WifiIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Wi-Fi Cepat Tamu</p>
                      <p className="text-xs text-slate-500 font-mono">SSID: {cfg.wifi_ssid}</p>
                    </div>
                  </div>
                  <button
                    onClick={copyWifiPassword}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Salin Sandi"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Salin Sandi
                  </button>
                </div>
              </section>
            )}
          </aside>

          {/* Interactive Mobile Portal / Right Column */}
          <section className="lg:col-span-7 w-full max-w-md mx-auto order-1 lg:order-2">
            <div className="bg-white/20 backdrop-blur-5xl rounded-[32px] p-5 sm:p-6 border border-white/80 transition-all duration-300 relative overflow-hidden">

              {/* Optional Cover Banner */}
              {cfg.cover_url && (
                <div className="-mx-6 -mt-6 mb-4 h-32 w-[calc(100%+3rem)] relative overflow-hidden">
                  <img
                    src={cfg.cover_url}
                    alt="Venue Banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent" />
                </div>
              )}

              {/* Mobile Only Venue Avatar and Subtitle */}
              <div className="flex items-center gap-3.5 mb-6 px-1 relative z-10">
                {cfg.avatar_url ? (
                  <img
                    src={cfg.avatar_url}
                    alt={tag.business_name || ''}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex flex-col items-center justify-center text-center p-1 text-white shadow-sm shrink-0">

                    <span className="text-[10px] font-extrabold tracking-wider leading-none uppercase text-amber-300">
                      {tag.business_name ? tag.business_name.split(' ')[0] : 'ADALAHH'}
                    </span>
                    <span className="text-[7px] font-semibold tracking-widest text-slate-400 mt-0.5">
                      & FIELDS
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {tag.business_name || 'adalahh'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{tagline}</p>
                </div>
              </div>

              {/* Action Link Tiles List */}
              <nav aria-label="Guest Actions" className="flex flex-col gap-3">
                {linksToRender.map((link, idx) => {
                  // ponytail: jika link adalah google review atau google maps, pastikan direct writereview
                  let hrefUrl = link.url === '#wifi' ? undefined : (link.icon === 'google' && !link.url ? reviewUrl : link.url);
                  if (hrefUrl && link.icon === 'google') {
                    const parsed = parseMapsUrl(hrefUrl);
                    if (parsed?.rawUrl && parsed.rawUrl.includes('writereview')) {
                      hrefUrl = parsed.rawUrl;
                    }
                  }

                  return (
                  <a
                    key={link.id || idx}
                    href={hrefUrl}
                    target={link.url === '#wifi' ? undefined : '_blank'}
                    rel="noreferrer"
                    onClick={(e) => handleLinkClick(link, e)}
                    className={`group block relative rounded-2xl p-3 sm:p-4 transition-all duration-200 active:scale-[0.99] cursor-pointer ${link.highlight
                        ? 'bg-neutral-900 hover:bg-black text-white border border-slate-800 shadow-md'
                        : 'bg-white hover:bg-slate-50/80 border border-slate-200/90 text-slate-800 shadow-xs hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <LinkIconBadge icon={link.icon} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs sm:text-sm font-bold truncate ${link.highlight ? 'text-white' : 'text-slate-900'}`}>
                              {link.title}
                            </span>
                            {link.icon === 'rewards' && (
                              <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full uppercase">
                                Perk
                              </span>
                            )}
                            {link.icon === 'google' && (
                              <span className="text-amber-400 text-[10px] sm:text-xs font-bold tracking-tight">★★★★★</span>
                            )}
                          </div>
                          {link.icon === 'rewards' && (
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium truncate">
                              Kumpulkan poin untuk reward menu
                            </p>
                          )}
                          {link.icon === 'google' && (
                            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 font-normal truncate">
                              Bantu dengan ulasan & foto momen Anda
                            </p>
                          )}
                          {link.icon === 'wifi' && (
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium truncate">
                              {cfg.wifi_ssid ? `${cfg.wifi_ssid} • Tap untuk salin` : 'Tap untuk salin password'}
                            </p>
                          )}
                          {link.icon === 'menu' && (
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium truncate">
                              {link.url && link.url.includes('.pdf') ? 'Dokumen PDF • Buka Buku Menu' : 'Daftar menu & harga'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`transition-colors shrink-0 ml-2 ${link.highlight ? 'text-slate-400 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-700'}`}>
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                  </a>
                  );
                })}
              </nav>

              {/* Social Icons Row if available */}
              {(cfg.instagram || cfg.youtube || cfg.tiktok) && (
                <div className="mt-6 pt-4 flex items-center justify-center gap-3 border-t border-slate-100">
                  {cfg.instagram && (
                    <a
                      href={`https://instagram.com/${cfg.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs transition-transform hover:scale-105"
                      title="Instagram"
                    >
                      <Camera className="h-4 w-4" />
                    </a>
                  )}
                  {cfg.youtube && (
                    <a
                      href={cfg.youtube.startsWith('http') ? cfg.youtube : `https://youtube.com/${cfg.youtube}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs transition-transform hover:scale-105"
                      title="YouTube"
                    >
                      <Play className="h-4 w-4 fill-white" />
                    </a>
                  )}
                  {cfg.tiktok && (
                    <a
                      href={`https://tiktok.com/@${cfg.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-xs transition-transform hover:scale-105"
                      title="TikTok"
                    >
                      <Music className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Bottom Owner Config and Info */}
              <footer className="mt-8 pt-4 border-t border-slate-100 flex flex-col items-center justify-center gap-2.5">
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                  <span className="text-slate-800 font-semibold">ID</span>
                  <span>•</span>
                  <span>{tag.id}</span>
                </div>
              </footer>
            </div>
          </section>
        </div>
      </main>

      {/* Subdued Bottom Branding */}
      <footer className="py-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {tag.business_name || 'Table Hub'}. Powered by <span className="font-semibold text-slate-600">Smart Stand</span> OS.</p>
      </footer>


      {/* Wi-Fi Connection Modal Popup */}
      {wifiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setWifiModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon Header */}
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner mb-3">
              <WifiIcon className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Sambungkan ke Wi-Fi Tamu
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sandi otomatis disalin ke papan klip Anda.
            </p>

            {/* Wi-Fi Credentials Box */}
            <div className="w-full mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nama Wi-Fi (SSID)
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {cfg.wifi_ssid || 'Wi-Fi Tamu'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Kata Sandi
                  </span>
                  <span className="text-sm font-bold text-teal-600 font-mono tracking-wide">
                    {cfg.wifi_pass || '(Tanpa Sandi)'}
                  </span>
                </div>
                {cfg.wifi_pass && (
                  <button
                    type="button"
                    onClick={copyWifiPassword}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-xs transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-teal-600">Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* QR Code Quick Join Option */}
            {cfg.wifi_ssid && (
              <div className="w-full mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <QrCode className="w-3 h-3" /> Pindai untuk Gabung Otomatis
                </span>
                <img
                  src={wifiQrUrl}
                  alt="Wi-Fi QR Code"
                  className="w-36 h-36 rounded-xl border border-white shadow-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1.5 text-center">
                  Arahkan kamera HP ke QR ini untuk langsung tersambung
                </span>
              </div>
            )}

            {/* Done Action Button */}
            <button
              type="button"
              onClick={() => setWifiModalOpen(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Tutup &amp; Buka Pengaturan Wi-Fi
            </button>
          </div>
        </div>
      )}

      {/* Anonymous Feedback Modal Popup */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md max-h-[85vh] rounded-[28px] bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => {
                setFeedbackModalOpen(false);
                setActiveReplyFbId(null);
                setReplyText('');
              }}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-3 shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Kritik, Saran &amp; Obrolan Meja
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Saling balas pesan langsung dengan pemilik restoran ({tag.id})
                </p>
              </div>
            </div>

            {/* Scrollable Container: Daftar Komentar & Balasan */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 my-2 divide-y divide-slate-100">
              {feedbacksList.length === 0 ? (
                <div className="py-8 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 px-4">
                  <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">Belum ada obrolan di meja ini</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Jadilah yang pertama menulis masukan atau sapaan untuk resto!
                  </p>
                </div>
              ) : (
                feedbacksList.map((fb) => (
                  <div key={fb.id} className="pt-3 first:pt-0 space-y-2">
                    {/* Pesan Utama Tamu */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-left space-y-1.5 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">
                            {fb.sender_name || 'Tamu Meja'}
                          </span>
                          {fb.rating && (
                            <div className="flex items-center text-amber-400 text-[10px]">
                              {Array.from({ length: fb.rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400" />
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(fb.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {fb.comment}
                      </p>

                      {/* Tombol Balas Pesan Ini */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (activeReplyFbId === fb.id) {
                              setActiveReplyFbId(null);
                            } else {
                              setActiveReplyFbId(fb.id);
                              setReplyText('');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>{activeReplyFbId === fb.id ? 'Batal Balas' : 'Balas'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Thread Balasan (Admin & Tamu) */}
                    {fb.replies && fb.replies.length > 0 && (
                      <div className="pl-4 space-y-2 border-l-2 border-slate-200 pb-2">
                        {fb.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className={`p-2.5 rounded-xl text-left text-xs ${rep.sender === 'admin'
                                ? 'bg-amber-50/80 border border-amber-200/90 text-amber-950'
                                : 'bg-slate-100 text-slate-800'
                              }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[11px] flex items-center gap-1">
                                {rep.sender === 'admin' ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{rep.sender_name || 'Admin / Pengelola'}</span>
                                    <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">Resmi</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3 h-3 text-slate-500" />
                                    <span>{rep.sender_name || 'Tamu'}</span>
                                  </>
                                )}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(rep.created_at).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {/* Quote Box jika membalas pesan tertentu */}
                            {rep.reply_to_name && (
                              <div className="mb-1.5 px-2 py-1 rounded bg-black/5 border-l-2 border-slate-400 text-[10px] text-slate-600 line-clamp-1 italic">
                                Membalas <span className="font-bold text-slate-800">{rep.reply_to_name}</span>: "{rep.reply_to_text}"
                              </div>
                            )}

                            <p className="leading-snug">{rep.message}</p>

                            {/* Tombol Balas Chat Ini */}
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReplyFbId(fb.id);
                                  setReplyTarget({
                                    name: rep.sender_name || (rep.sender === 'admin' ? 'Admin' : 'Tamu'),
                                    text: rep.message
                                  });
                                  setReplyText('');
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                <CornerDownRight className="w-2.5 h-2.5" />
                                <span>Balas</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input Balasan Cepat jika aktif */}
                    {activeReplyFbId === fb.id && (
                      <div className="pl-4 pt-1 space-y-1.5 animate-in fade-in duration-150">
                        {/* Quote Indicator saat mengetik balasan */}
                        {replyTarget && (
                          <div className="flex items-center justify-between px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-lg text-[10px] text-sky-900">
                            <span className="truncate">
                              Membalas <strong>{replyTarget.name}</strong>: "{replyTarget.text}"
                            </span>
                            <button
                              type="button"
                              onClick={() => setReplyTarget(null)}
                              className="text-sky-600 hover:text-sky-900 font-bold ml-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={replyTarget ? `Balas @${replyTarget.name}...` : "Tulis balasan Anda..."}
                            className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply(fb.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={submittingReply}
                            onClick={() => handleSendReply(fb.id)}
                            className="px-3 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            {submittingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Form Buat Masukan / Komentar Baru */}
            <form onSubmit={handleSubmitFeedback} className="pt-3 border-t border-slate-100 space-y-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nama / Inisial Anda (opsional)"
                  className="w-1/2 text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50"
                />
                {/* Rating Bintang */}
                <div className="flex-1 flex items-center justify-end gap-1 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-0.5 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <textarea
                  required
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Tulis masukan, kritik, atau pesan untuk meja ini..."
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-black bg-slate-50/50 resize-none"
                />
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-4 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {submittingFeedback ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="text-[10px]">Kirim</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



