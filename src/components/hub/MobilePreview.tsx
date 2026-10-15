import React from 'react';
import type { CustomLink } from '@/types/nfc';
import { LinkIconBadge } from './LinkIconBadge';
import { Camera, Gift, Play, Music, Sparkles, ExternalLink } from 'lucide-react';

interface MobilePreviewProps {
  businessName: string;
  tagline: string;
  avatarUrl: string;
  coverUrl?: string;
  customLinks: CustomLink[];
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

export function MobilePreview({
  businessName,
  tagline,
  avatarUrl,
  coverUrl,
  customLinks,
  instagram,
  youtube,
  tiktok
}: MobilePreviewProps) {
  return (
    <div className="w-[340px] h-[680px] bg-black rounded-[48px] p-2.5 shadow-2xl border-4 border-slate-800 relative overflow-hidden flex flex-col">
      {/* Inside Phone Screen */}
      <div className="w-full h-full rounded-[40px] overflow-hidden bg-[#F0F2F5] text-slate-900 relative flex flex-col justify-between">
        {/* iOS Top Header: Status Bar + Floating Dynamic Island */}
        <div className="relative w-full pt-3 pb-2 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-800 bg-[#F0F2F5] select-none z-30">
          <span className="font-semibold tracking-tight">11:54</span>

          {/* Floating Pill Dynamic Island di Tengah Layar */}
          <div className="h-5 px-7 bg-black rounded-full flex items-center justify-center gap-1.5 shadow-xs">
            <div className="w-2 h-2 rounded-full bg-neutral-900" />
            <div className="w-3 h-1 rounded-full bg-neutral-900" />
          </div>

          {/* 5G & Battery Kanan */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold tracking-tight">5G</span>
            <div className="w-4 h-2 rounded-[3px] border border-slate-800 p-[1px] flex items-center">
              <div className="w-full h-full bg-slate-800 rounded-[1.5px]" />
            </div>
          </div>
        </div>

        {/* App Content Preview */}
        <div className="w-full flex-1 overflow-y-auto no-scrollbar relative flex flex-col px-3 pb-3">
          {/* Optional Cover Banner */}
          {coverUrl && (
            <div className="-mx-3 -mt-2 mb-3 h-24 relative overflow-hidden shrink-0">
              <img
                src={coverUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#F0F2F5] via-transparent to-transparent" />
            </div>
          )}

          {/* Business Header with Circular Avatar & Tagline */}
          <div className="px-1 py-1 flex items-center gap-3 relative z-10">

            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={businessName}
                className="w-13 h-13 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-neutral-900 text-white flex flex-col items-center justify-center text-center p-1 shadow-sm shrink-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300">
                  {businessName ? businessName.split(' ')[0] : 'ADALAHH'}
                </span>
                <span className="text-[6px] font-semibold tracking-widest text-slate-400 mt-0.5">
                  & FIELDS
                </span>
              </div>
            )}

            <div className="leading-tight min-w-0">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                {businessName || 'adalahh'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                {tagline || 'Great choice, awkward chat'}
              </p>
            </div>
          </div>

          {/* Link Cards List (Hanya yang enabled / aktif) */}
          <div className="space-y-2 flex-1 mt-5">
            {customLinks
              .filter((link) => link.enabled !== false)
              .map((link, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between w-full h-12 px-3 rounded-2xl transition-all shadow-xs ${
                    link.highlight
                      ? 'bg-neutral-900 text-white border border-slate-800'
                      : 'bg-white border border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="scale-80 origin-left">
                      <LinkIconBadge icon={link.icon} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${link.highlight ? 'text-white' : 'text-slate-900'}`}>
                          {link.title}
                        </span>
                        {link.icon === 'google' && (
                          <span className="text-amber-400 text-[10px]">★★★★★</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${link.highlight ? 'text-slate-400' : 'text-slate-400'}`} />
                </div>
              ))}
          </div>

          {/* Footer Social Icons */}
          <div className="pt-3 pb-1 flex items-center justify-center gap-2.5 mt-auto">
            {instagram && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs">
                <Camera className="h-3.5 w-3.5" />
              </div>
            )}
            {youtube && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
                <Play className="h-3 w-3 fill-white" />
              </div>
            )}
            {tiktok && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white shadow-xs">
                <Music className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>

        {/* iOS Home Indicator */}
        <div className="w-full py-1.5 bg-[#F0F2F5] flex justify-center shrink-0 z-20 pointer-events-none">
          <div className="w-24 h-1 bg-slate-400 rounded-full" />
        </div>
      </div>
    </div>
  );
}

