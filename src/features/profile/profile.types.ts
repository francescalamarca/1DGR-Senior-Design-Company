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
 * Higher education entry attached to a profile.
 * Displayed in the About section (max entries enforced in UI).
 */
export type HigherEdEntry = {
  unitid: string;
  label: string; // "[School], [City], [State], USA"
  degrees: string[]; // e.g. ["Bachelor", "Master"]
};

/**
 * Controls how a user's name is displayed publicly.
 * Supports preferred/legal names and toggle priority.
 */
export type NameDisplaySettings = {
  showPreferredName: boolean;
  showLegalName: boolean;
  firstWhenBothOn: "preferred" | "legal";
};

export type ContactDisplaySettings = {
  showEmail: boolean;
  showPhoneNumber: boolean;
  showUrl1?: boolean;
  showUrl2?: boolean;
};

export type ValueSummaryItem = {
  key: string;
  label: string;
  value: string;
};

export type Profile = {
  name: string;

  bio: string;

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

  legalFirstName: string;
  legalLastName: string;
  legalMiddleName: string;
  preferredName: string;

  nameDisplaySettings: NameDisplaySettings;

  dateOfBirth: string;

  phoneNumber: string;
  email: string;
  linkedinUrl: string;
  contactUrl1?: string;
  contactUrl2?: string;
  contactUrl1Label?: string;
  contactUrl2Label?: string;

  residencyStatus: string;
  workType?: string;
  workPreference?: string;
  industryInterests: string[];
  industryExperience: string;
  geographicLocation: string;
  highestEducationCompleted: string;

  /**
   * Higher Education (up to 8 entries enforced in UI)
   */
  higherEducation: HigherEdEntry[];

  additionalDetails: string;
  valuesSummary?: ValueSummaryItem[];

  contactDisplaySettings: ContactDisplaySettings;

};
