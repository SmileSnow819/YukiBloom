/** Public response shapes from docs/api-cache/openapi/全部.json. */
export interface PublicPost {
  id: string;
  locale: string;
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  status: string;
  categories: string[];
  tags: string[];
  version: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  displayDate?: string;
  coverMediaId?: string;
  coverUrl?: string;
  extra?: Record<string, unknown>;
}

/** The list endpoint omits article bodies; fetch a detail for Markdown. */
export type PublicPostSummary = Omit<PublicPost, 'bodyMarkdown'> & { bodyMarkdown: '' };

export interface PublicPostPage {
  items: PublicPostSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface PublicPostQuery {
  locale?: string;
  category?: string;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface PublicPage {
  id: string;
  locale: string;
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  status: string;
  updatedAt: string;
  version: number;
}

export interface PublicLocation {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  icon: string;
  sortOrder: number;
}

export interface PublicStay {
  id: string;
  locationId: string;
  title: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  isPresent: boolean;
  sortOrder: number;
}

export interface PublicRoute {
  id: string;
  from: string;
  to: string;
  date: string;
  label: string;
  transport: string;
  description: string;
  images: string[];
  sortOrder: number;
}

export interface PublicFootprints {
  locations: PublicLocation[];
  stays: PublicStay[];
  routes: PublicRoute[];
  version: number;
}

export interface PublicInternship {
  id: string;
  startDate: string;
  endDate: string;
  isPresent: boolean;
  company: string;
  icon: string;
  iconColor: string;
  position: string;
  description: string;
  sortOrder: number;
}

export interface PublicTimeline {
  items: PublicInternship[];
  version: number;
}

export interface PublicAnnouncementLink {
  text: string;
  url: string;
  external: boolean;
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  color: string;
  enabled: boolean;
  priority: number;
  publishDate: string;
  startDate: string;
  endDate: string;
  link?: PublicAnnouncementLink;
}

export interface PublicBackgroundTrack {
  id: string;
  title: string;
  url: string;
  enabled: boolean;
}

export interface PublicCategoryMapping {
  name: string;
  slug: string;
}

export interface PublicFeaturedCategory {
  label: string;
  description: string;
  image: string;
  link: string;
  enabled: boolean;
}

export interface PublicFeaturedSeries {
  slug: string;
  categoryName: string;
  fullName: string;
  label: string;
  description: string;
  cover: string;
  icon: string;
  links: Record<string, string>;
  enabled: boolean;
  highlightOnHome: boolean;
}

export interface PublicFriendLink {
  id: string;
  site: string;
  url: string;
  owner: string;
  description: string;
  image: string;
  color: string;
  status: string;
}

export interface PublicFriendSettings {
  title: string;
  subtitle: string;
  applyTitle: string;
  applyDesc: string;
  exampleYaml: string;
}

export interface PublicMusicLink {
  id: string;
  title: string;
  url: string;
}

export interface PublicMusicGroup {
  id: string;
  title: string;
  enabled: boolean;
  links: PublicMusicLink[];
}

export interface PublicNavigationItem {
  id: string;
  name: string;
  nameKey: string;
  path: string;
  icon: string;
  children: PublicNavigationItem[];
}

export interface PublicProfile {
  name: string;
  title: string;
  subtitle: string;
  alternate: string;
  author: string;
  avatar: string;
  defaultOgImage: string;
  description: string;
  keywords: string[];
  showLogo: boolean;
  startYear: number;
  timezone: string;
  url: string;
}

export interface PublicSocialLink {
  platform: string;
  url: string;
  icon: string;
  color: string;
  enabled: boolean;
}

export interface PublicTranslation {
  locale: string;
  entityType: string;
  entityKey: string;
  label: string;
  fullName: string;
  description: string;
}

export interface PublicSiteContent {
  announcements: PublicAnnouncement[];
  backgroundMusic: PublicBackgroundTrack[];
  categoryMappings: PublicCategoryMapping[];
  featuredCategories: PublicFeaturedCategory[];
  featuredSeries: PublicFeaturedSeries[];
  friendLinks: PublicFriendLink[];
  friendSettings: PublicFriendSettings;
  musicGroups: PublicMusicGroup[];
  navigation: PublicNavigationItem[];
  profile: PublicProfile;
  socialLinks: PublicSocialLink[];
  translations: PublicTranslation[];
  version: number;
}
