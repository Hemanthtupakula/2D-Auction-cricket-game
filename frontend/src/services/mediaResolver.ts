/**
 * Auction XI — Universal Authoritative Media Resolver
 * Powered by ImageKit Free + Supabase Storage/Database
 *
 * Implements strict multi-tier fallback:
 *   1. VERIFIED_IMAGEKIT (with serverless image transformation)
 *   2. Approved Development Source Fallback (IPL / Wikimedia)
 *   3. Neutral Auction XI Silhouette Placeholder (/placeholder-cricketer.svg)
 *
 * Never returns null, undefined, or fabricated URLs.
 */

export type ImageVariant = 'thumbnail' | 'pool' | 'card' | 'hero' | 'mobile';

export interface ResolvedPhoto {
  url: string;
  source: 'IMAGEKIT' | 'SOURCE_FALLBACK' | 'PLACEHOLDER';
  isVerified: boolean;
  fileId?: string | null;
  filePath?: string | null;
  sourceName?: string | null;
  rightsStatus?: string | null;
}

const DEFAULT_IMAGEKIT_ENDPOINT = 'https://ik.imagekit.io/hemanthhkt';

function getImageKitEndpoint(): string {
  const envEndpoint =
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_IMAGEKIT_URL_ENDPOINT;
  return (envEndpoint || DEFAULT_IMAGEKIT_ENDPOINT).replace(/\/$/, '');
}

/**
 * Derives the optimal ImageKit transformation parameters based on the logical variant
 */
export function getImageKitTransform(variant: ImageVariant): string {
  switch (variant) {
    case 'thumbnail':
      return 'tr:w-100,h-100,c-maintain_ratio,f-webp';
    case 'pool':
      return 'tr:w-200,h-200,c-maintain_ratio,f-webp';
    case 'card':
      return 'tr:w-300,h-300,c-maintain_ratio,f-webp';
    case 'hero':
      return 'tr:w-600,h-600,c-maintain_ratio,f-webp';
    case 'mobile':
      return 'tr:w-250,h-250,c-maintain_ratio,f-webp';
    default:
      return 'tr:w-300,h-300,c-maintain_ratio,f-webp';
  }
}

/**
 * Universal Player Photo Resolver
 */
export function resolvePlayerPhoto(
  player: { id?: string; photoUrl?: string | null; media?: any } | null | undefined,
  variant: ImageVariant = 'card'
): ResolvedPhoto {
  if (!player) {
    return {
      url: '/placeholder-cricketer.svg',
      source: 'PLACEHOLDER',
      isVerified: false,
      rightsStatus: 'PUBLIC_DOMAIN',
      sourceName: 'Auction XI Silhouette',
    };
  }

  const media = player.media;
  const pid = player.id;
  const endpoint = getImageKitEndpoint();
  const status = media?.status;
  const fileId = media?.storageFileId;
  const deliveryUrl = media?.deliveryUrl || player.photoUrl;

  // 1. ImageKit Verified Delivery (Using URL transformation)
  const isImageKit =
    (status === 'VERIFIED_IMAGEKIT' && fileId) ||
    (deliveryUrl && typeof deliveryUrl === 'string' && deliveryUrl.includes('ik.imagekit.io'));

  if (isImageKit) {
    const transform = getImageKitTransform(variant);
    const resolvedUrl = `${endpoint}/${transform}/auction-xi/players/${pid}.webp`;
    return {
      url: resolvedUrl,
      source: 'IMAGEKIT',
      isVerified: true,
      fileId,
      filePath: media?.storagePath || `/auction-xi/players/${pid}.webp`,
      sourceName: media?.sourceName || 'ImageKit CDN',
      rightsStatus: media?.rightsStatus || 'VERIFIED_IMAGEKIT',
    };
  }

  // 2. Approved Source Fallback (IPL / Wikimedia)
  const fallbackUrl = media?.sourceUrl || player.photoUrl;
  if (
    fallbackUrl &&
    typeof fallbackUrl === 'string' &&
    fallbackUrl.trim() !== '' &&
    !fallbackUrl.toLowerCase().includes('silhouette') &&
    !fallbackUrl.toLowerCase().includes('placeholder')
  ) {
    return {
      url: fallbackUrl,
      source: 'SOURCE_FALLBACK',
      isVerified: false,
      fileId: null,
      filePath: null,
      sourceName: media?.sourceName || 'Official Source Fallback',
      rightsStatus: media?.rightsStatus || 'DEV_FALLBACK_FAIR_USE',
    };
  }

  // 3. Neutral Silhouette Placeholder
  return {
    url: '/placeholder-cricketer.svg',
    source: 'PLACEHOLDER',
    isVerified: false,
    fileId: null,
    filePath: null,
    rightsStatus: 'PUBLIC_DOMAIN',
    sourceName: 'Auction XI Silhouette',
  };
}

/**
 * Universal Franchise Team Logo Resolver
 */
export function resolveTeamLogo(teamCode: string, size: number = 100): string {
  if (!teamCode) return '/placeholder-cricketer.svg';
  const cleanCode = teamCode.trim().toUpperCase();
  const endpoint = getImageKitEndpoint();
  return `${endpoint}/tr:w-${size},h-${size},c-maintain_ratio,f-webp/auction-xi/teams/${cleanCode}.webp`;
}

/**
 * Universal image error handler to prevent broken image icons in UI
 */
export function handleImageFallback(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string
) {
  const target = e.currentTarget;
  const defaultPlaceholder = '/placeholder-cricketer.svg';

  // If already at placeholder, do nothing to prevent infinite loop
  if (target.src.endsWith(defaultPlaceholder)) {
    return;
  }

  // If a secondary fallback exists and hasn't been tried yet, try it
  if (fallbackUrl && target.src !== fallbackUrl) {
    target.src = fallbackUrl;
  } else {
    target.src = defaultPlaceholder;
  }
}
