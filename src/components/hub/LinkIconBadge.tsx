import React from 'react';
import type { LinkIconType } from '@/types/nfc';
import { Heart, Utensils, Wifi, MessageSquare, Gamepad2, Globe, Sparkles } from 'lucide-react';

interface LinkIconBadgeProps {
  icon?: LinkIconType;
}

export function LinkIconBadge({ icon }: LinkIconBadgeProps) {
  switch (icon) {
    case 'rewards':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 shadow-inner group-hover:scale-105 transition-transform">
          <Heart className="h-5 w-5 fill-rose-500" />
        </div>
      );
    case 'google':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-md group-hover:scale-105 transition-transform">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              fill="#4285F4"
            />
            <path
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              fill="#34A853"
            />
            <path
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              fill="#FBBC05"
            />
            <path
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              fill="#EA4335"
            />
          </svg>
        </div>
      );
    case 'menu':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-inner group-hover:scale-105 transition-transform">
          <Utensils className="h-5 w-5" />
        </div>
      );
    case 'wifi':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shadow-inner group-hover:scale-105 transition-transform">
          <Wifi className="h-5 w-5" />
        </div>
      );
    case 'feedback':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shadow-inner group-hover:scale-105 transition-transform">
          <MessageSquare className="h-5 w-5" />
        </div>
      );
    case 'game':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-inner group-hover:scale-105 transition-transform">
          <Gamepad2 className="h-5 w-5" />
        </div>
      );
    case 'whatsapp':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-inner group-hover:scale-105 transition-transform">
          <MessageSquare className="h-5 w-5" />
        </div>
      );
    default:
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-inner group-hover:scale-105 transition-transform">
          <Globe className="h-5 w-5" />
        </div>
      );
  }
}

