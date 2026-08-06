/** User-facing module copy for Marketplace vs Classifieds (listing_type storage values). */

export type ListingModuleKey = 'service' | 'classified' | 'community';

export type ListingModuleIntro = {
  tag: string;
  title: string;
  body: string;
  icon: 'briefcase-outline' | 'bag-handle-outline' | 'newspaper-outline';
  accentBg: string;
  accentColor: string;
};

export const LISTING_MODULE_INTRO: Record<ListingModuleKey, ListingModuleIntro> = {
  service: {
    tag: 'Professional Services',
    title: 'Hire Skilled Pros or Offer Your Expertise',
    body: 'Browse specialized freelance services, compare top-rated talent, and order custom projects directly—or list your own professional services to grow your client base.',
    icon: 'briefcase-outline',
    accentBg: '#F3E8FF',
    accentColor: '#7C3AED',
  },
  classified: {
    tag: 'Marketplace',
    title: 'Your Local Buy & Sell Hub',
    body: 'Easily list pre-loved goods, browse deals nearby, and chat directly with buyers and sellers in your community to make quick, easy transactions.',
    icon: 'bag-handle-outline',
    accentBg: '#E8F4FD',
    accentColor: '#1D4ED8',
  },
  community: {
    tag: 'Classifieds',
    title: 'Post & Discover Local Community Needs',
    body: 'Connect with your community to find or offer housing, roommates, job opportunities, babysitters, and community announcements.',
    icon: 'newspaper-outline',
    accentBg: '#FEF3C7',
    accentColor: '#B45309',
  },
};

export function listingTypeLabel(listingType: string): string {
  if (listingType === 'service') return 'Professional services';
  if (listingType === 'classified') return 'Marketplace';
  if (listingType === 'community') return 'Classifieds';
  return listingType || 'Listing';
}
