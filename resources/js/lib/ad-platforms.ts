export type AdPlatform = 'facebook' | 'tiktok' | 'facebook_tiktok' | 'autre';

/** Where an ad runs, as the merchant reads it. */
export const adPlatformLabels: Record<AdPlatform, string> = {
    facebook: 'Facebook',
    tiktok: 'TikTok',
    facebook_tiktok: 'Facebook et TikTok',
    autre: 'Autre',
};

export function adPlatformLabel(platform: string | null): string {
    return platform === null ? 'Non notée' : (adPlatformLabels[platform as AdPlatform] ?? platform);
}
