/**
 * Profile domain type definitions.
 *
 * This file defines all strongly-typed data models used by the profile system,
 * including media slots, video libraries, name/contact display rules, public
 * snapshots, and shareable profile links.
 *
 * These types are shared across:
 * - Profile state management (profile.store)
 * - Video library & recovery flows
 * - Public profile snapshot rendering (/p/* routes)
 * - Backend ↔ frontend data mapping
 *
 * ⚠️ Changes here impact multiple screens and backend mappings.
 */

/**
 * A single profile media slot (fixed-position on profile).
 * These are derived from the active video library and displayed on the profile.
 */
export type OpenRole = {
  id: string;
  title: string;
  salary: string;
  location: string;
  postedAt: string; // ISO date string, e.g. "2024-03-22"
  skills: string[]; // this will be populated by a dropdown
  postUrl: string;
  workType: string;
  isRelocationCovered: boolean; //this basically asks, does the employee have to relocation - will be a button option check, yes/no
};

export type MediaItem = {
  id: string;
  imageUri: string;
  videoUri: string;
  caption: string;
};

export type LibraryVideo = {
  id: string;
  url: string; // CloudFront URL
  s3Key: string; // REQUIRED for backend
  slot?: number | null; // profile slot assignment (0 avatar, 1-5 media, null = library-only)
  thumbnailUrl: string; // REQUIRED for UI consistency after refresh
  thumbnailS3Key: string; // REQUIRED for backend
  caption: string; // REQUIRED ("" allowed for camera-roll uploads)
  source: "recording-studio" | "camera-roll";
  createdAt: number; // epoch ms
};

/**
 * Controls how a user's name is displayed publicly.
 * Supports preferred/legal names and toggle priority.
 */
export type NameDisplaySettings = {
  showCompanyName: boolean;
};

export type ContactDisplaySettings = {
  showEmail: boolean;
  showPhoneNumber: boolean;
  showUrl1?: boolean;
  showUrl2?: boolean;
};

export type Profile = {
  headquarters: any;
  companyName: string;

  missionStatement: string;
  
  companyCulture: string;

  coreValues: string[]; //corevalues

  /**
   * leaving this as avatar naming but this is COMPANY LOGO image placeholder
   */
  avatarImageUri: string;
  avatarVideoUri: string;

  media: MediaItem[];

 /**
 * Canonical video representation used by the video library system.
 * This type is used for:
 * - Active library videos
 * - Soft-deleted videos (recovery flow)
 * - Backend operations (recover / delete forever)
 */
  videoLibrary: LibraryVideo[];

  /**
   * ✅ Soft-deleted videos (visible in Recovery screen)
   * - deleting moves videoLibrary -> deletedVideoLibrary
   * - recovery moves deletedVideoLibrary -> videoLibrary
   */
  deletedVideoLibrary: LibraryVideo[];

  nameDisplaySettings: NameDisplaySettings;

  //linkedinUrl: string; this may not apply here
  contactUrl1?: string;
  contactUrl2?: string;
  contactUrl1Label?: string;
  contactUrl2Label?: string;

  workType?: string;
  businessAge: string;

  /**
   * Locations that the business is located in
   */
  locations: string[];
  currentEmployees: string [];

  //adding industry as array
  industry: string;

  openRoles: OpenRole[];


  benefitsSummary: string;

  customBackgroundColor: string;

  contactDisplaySettings: ContactDisplaySettings;

  companyEmail: string;
  companyPhone: string;

};
