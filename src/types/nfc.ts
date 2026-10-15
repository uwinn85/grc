export type ProductType = 'DIRECT_REVIEW' | 'TABLE_HUB';

export type LinkIconType = 
  | 'google'
  | 'menu'
  | 'wifi'
  | 'feedback'
  | 'game'
  | 'rewards'
  | 'whatsapp'
  | 'instagram'
  | 'link';

export interface CustomLink {
  id: string;
  title: string;
  url: string;
  subtitle?: string;
  icon?: LinkIconType;
  highlight?: boolean;
  enabled?: boolean; // Toggle aktif / nonaktif tombol
}

export interface FeedbackReply {
  id: string;
  sender: 'admin' | 'guest';
  sender_name?: string;
  message: string;
  created_at: string;
  reply_to_name?: string;
  reply_to_text?: string;
}

export interface FeedbackItem {
  id: string;
  sender_name?: string;
  comment: string;
  rating?: number; // 1-5 bintang opsional
  created_at: string;
  replies?: FeedbackReply[];
}

export interface HubConfiguration {
  bio?: string;
  tagline?: string;
  avatar_url?: string;
  cover_url?: string;
  menu_url?: string;
  wifi_ssid?: string;
  wifi_pass?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
  custom_links?: CustomLink[];
  feedbacks?: FeedbackItem[];
}


export interface NfcTagEntity {
  id: string;
  type: ProductType;
  business_name: string | null;
  google_place_id: string | null;
  is_active: boolean;
  total_taps: number;
  hub_config: HubConfiguration | null;
  created_at: string;
  updated_at: string;
}

declare global {
  interface Window {
    google?: any;
  }
}
