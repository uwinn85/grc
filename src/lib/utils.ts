import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Konversi CID / Data Hex Google Maps ke Place ID (ChIJ...)
export function convertHexToPlaceId(hex1Str: string, hex2Str: string): string | null {
  try {
    const h1 = BigInt(hex1Str);
    const h2 = BigInt(hex2Str);

    const buf = new Uint8Array(21);
    buf[0] = 0x0a; // protobuf tag: string field 1
    buf[1] = 0x12; // length: 18 bytes
    buf[2] = 0x09; // tag 1: fixed64

    // pack h1 little-endian (8 bytes)
    let temp1 = h1;
    for (let i = 0; i < 8; i++) {
      buf[3 + i] = Number(temp1 & 0xffn);
      temp1 >>= 8n;
    }

    buf[11] = 0x11; // tag 2: fixed64

    // pack h2 little-endian (8 bytes)
    let temp2 = h2;
    for (let i = 0; i < 8; i++) {
      buf[12 + i] = Number(temp2 & 0xffn);
      temp2 >>= 8n;
    }

    // binary string to base64url
    let binary = '';
    for (let i = 0; i < 20; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return b64;
  } catch {
    return null;
  }
}

// Ekstrak nama dan alamat dari URL Google Maps / Google Review
export function parseMapsUrl(input: string): { name: string; address: string; rawUrl: string } | null {
  const trimmed = input.trim();
  const isMapsUrl = 
    trimmed.includes('google.com/maps') || 
    trimmed.includes('maps.app.goo.gl') || 
    trimmed.includes('goo.gl/maps') ||
    trimmed.includes('maps.google.') ||
    (trimmed.includes('google.com/search') && trimmed.includes('#lrd=')) ||
    trimmed.includes('search.google.com/local/writereview');

  if (!isMapsUrl) {
    return null;
  }

  // Bersihkan karakter aneh di ujung
  const cleanUrl = trimmed.replace(/[.,;!?]+$/, '');

  let address = '';
  let name = '';
  let directReviewUrl = cleanUrl;

  try {
    // Cek apakah URL mengandung pola hex Google Maps: 0x...:0x... (baik di URL Maps, ftid, maupun #lrd)
    const hexMatch = cleanUrl.match(/(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (hexMatch && hexMatch[1] && hexMatch[2]) {
      const computedPlaceId = convertHexToPlaceId(hexMatch[1], hexMatch[2]);
      if (computedPlaceId) {
        directReviewUrl = `https://search.google.com/local/writereview?placeid=${computedPlaceId}`;
      }
    }

    // Untuk google.com/search#lrd= — ambil nama dari parameter q
    if (cleanUrl.includes('google.com/search') && cleanUrl.includes('#lrd=')) {
      const url = new URL(cleanUrl);
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      if (q) {
        const decoded = decodeURIComponent(q).replace(/\+/g, ' ');
        name = decoded.split(',')[0].trim();
        address = `Buka form review - ${name}`;
      }
      return {
        name: name || 'Google Review',
        address: address || 'Langsung ke form tulis review',
        rawUrl: directReviewUrl
      };
    }

    const url = new URL(cleanUrl);

    // Ambil nama dari parameter q / query (misal maps.google.com?q=Nama+Toko&ftid=...)
    const q = url.searchParams.get('q') || url.searchParams.get('query');
    if (q) {
      const decoded = decodeURIComponent(q).replace(/\+/g, ' ');
      address = decoded;
      name = decoded.split(',')[0].trim();
    }

    const daddr = url.searchParams.get('daddr');
    if (daddr && !name) {
      const decoded = decodeURIComponent(daddr).replace(/\+/g, ' ');
      address = decoded;
      name = decoded.split(',')[0].trim();
    }

    const pathParts = url.pathname.split('/');
    const placeIdx = pathParts.indexOf('place');
    if (placeIdx !== -1 && pathParts[placeIdx + 1] && !name) {
      const decoded = decodeURIComponent(pathParts[placeIdx + 1]).replace(/\+/g, ' ');
      name = decoded.split(',')[0].trim();
      address = decoded;
    }
  } catch {
    const daddrMatch = input.match(/[?&]daddr=([^&]+)/);
    if (daddrMatch && daddrMatch[1]) {
      const decoded = decodeURIComponent(daddrMatch[1]).replace(/\+/g, ' ');
      address = decoded;
      name = decoded.split(',')[0].trim();
    }
  }

  return {
    name: name || 'Profil Google Bisnis',
    address: address || 'Lokasi terverifikasi via Google Maps',
    rawUrl: directReviewUrl
  };
}

// Unshorten link maps.app.goo.gl via unshorten API dan ekstrak writereview URL
export async function resolveMapsUrlAsync(inputUrl: string): Promise<{ name: string; rawUrl: string } | null> {
  const trimmed = inputUrl.trim().replace(/[.,;!?]+$/, '');

  // 1. Jika sudah mengandung format hex atau writereview langsung
  const syncParsed = parseMapsUrl(trimmed);
  if (syncParsed?.rawUrl && syncParsed.rawUrl.includes('writereview')) {
    return { name: syncParsed.name, rawUrl: syncParsed.rawUrl };
  }

  // 2. Jika link pendek maps.app.goo.gl atau goo.gl/maps
  if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps')) {
    try {
      const res = await fetch(`https://unshorten.me/json/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const resolved = data.resolved_url || '';
        if (resolved) {
          let targetResolved = resolved;
          try {
            const resUrlObj = new URL(resolved);
            const cont = resUrlObj.searchParams.get('continue');
            if (cont) {
              targetResolved = cont;
            }
          } catch {
            // Abaikan
          }

          const decodedResolved = decodeURIComponent(targetResolved);
          const parsed = parseMapsUrl(decodedResolved);
          if (parsed?.rawUrl && parsed.rawUrl.includes('writereview')) {
            return { name: parsed.name, rawUrl: parsed.rawUrl };
          }
        }
      }
    } catch {
      // Abaikan jika offline / rate limited
    }
  }

  return syncParsed ? { name: syncParsed.name, rawUrl: syncParsed.rawUrl } : null;
}

