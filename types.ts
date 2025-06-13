

export interface ShadowEffect {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  enabled: boolean;
}

export interface OutlineEffect {
  width: number;
  color: string;
  enabled: boolean;
}

export interface SystemFontSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  letterSpacing: number;
  color: string;
  textAlignHorizontal: 'left' | 'center' | 'right';
  textAlignVertical: 'top' | 'middle' | 'bottom';
}

export interface BitmapFontSettings {
  imageUrl: string | null;
  charWidth: number;
  charHeight: number;
  charMap: string; // e.g., "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?"
  spacing: number;
  color: string; // Tint color
  zoom: number;
  enabled: boolean;
  enableTintColor: boolean;
  colorToRemove: string; // Color to make transparent
  enableColorRemoval: boolean; // Toggle for color removal
  colorRemovalTolerance: number; // Tolerance for color removal (0-255, or a scaled range)
  enablePixelScanning: boolean; // Dynamically adjust character width based on pixels
  spaceWidthOverride: number; // New: Custom width for space character, 0 for auto
}

export interface Block {
  content: string;
  originalContent: string; // New: To store the original content of the block
  index: number; // Index within its parent ScriptFile's blocks array
  isOverflowing: boolean;
}

export interface ScriptFile {
  id: string; // Unique ID, e.g., timestamp + name, for React keys
  name: string;
  blocks: Block[];
  rawText: string; // Original raw text content of the file
  parsedWithCustomSeparators: boolean; // Indicates if settings.useCustomBlockSeparator was true when THIS file was parsed
}

export interface TransformSettings {
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  origin: string;
}

export interface PixelOverflowMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
  enabled: boolean;
}

export interface GitHubSettings {
  pat: string;
  repoFullName: string; // "owner/repo"
  branch: string;
  filePath: string;
}

export interface CustomColorTag {
  id: string;
  openingTag: string;
  closingTag: string;
  color: string; // Hex color string e.g. #FF0000
  enabled: boolean;
}

export interface AppSettings {
  text: string; // Represents content of the current block of the active script
  previewWidth: number;
  previewHeight: number;
  backgroundColor: string; // Will be mapped to a CSS var or used if custom theme doesn't override preview specifics
  backgroundImageUrl: string | null;
  secondaryBackgroundImageUrl: string | null; 
  showSecondaryBackgroundImage: boolean; 
  systemFont: SystemFontSettings;
  shadowEffect: ShadowEffect;
  outlineEffect: OutlineEffect;
  bitmapFont: BitmapFontSettings;
  transform: TransformSettings;
  currentFontType: 'system' | 'bitmap';
  useCustomBlockSeparator: boolean; // This is a global setting for NEW uploads
  blockSeparators: string[]; // Array of custom separator strings
  hideTagsInPreview: boolean;
  tagPatternsToHide: string[];
  customColorTags: CustomColorTag[]; // New: For user-defined color tags
  overflowDetectionMode: 'pixel' | 'character';
  maxCharacters: number;
  maxPixelHeight: number;
  pixelOverflowMargins: PixelOverflowMargins;
  globalLineHeightFactor: number;
  previewZoom: number; 
  comparisonModeEnabled: boolean;
}

// OLD Theme type, will be replaced by ThemeKey
// export type Theme = 'light' | 'dark' | 'banana';

// Helper type to get keys of T whose values are objects
export type ObjectKeys<T> = {
  [K in keyof T]: T[K] extends object ? K : never;
}[keyof T];

// Specific type for keys of AppSettings that point to nested objects
export type NestedAppSettingsObjectKeys = ObjectKeys<AppSettings>;

export interface Profile {
  id: string;
  name: string;
  coverImageUrl: string | null;
  settings: AppSettings;
}

export type MainViewMode = 'editor' | 'profilesGallery';

// New Theme System Types
export type ThemeKey = 'light' | 'dark' | 'banana' | 'custom';

export interface CustomThemeColors {
  // General UI
  pageBackground: string;
  elementBackground: string; // For primary elements like cards, main content area
  elementBackgroundSecondary: string; // For secondary elements like control panel sections, headers
  textPrimary: string;
  textSecondary: string; // For less prominent text, subText
  accentPrimary: string; // Main interactive color (e.g., banana yellow)
  accentPrimaryContent: string; // Text/icon color on accentPrimary background
  accentSecondary: string; // Another accent, e.g., for different button types or highlights
  accentSecondaryContent: string; // Text/icon color on accentSecondary background
  borderColor: string; // Main border color
  borderColorLight: string; // Lighter borders or dividers

  // Toolbar specific (optional, can fallback to general if not provided)
  toolbarBackground?: string;
  toolbarText?: string;
  toolbarButtonBackground?: string;
  toolbarButtonText?: string;
  toolbarButtonHoverBackground?: string;

  // Scrollbar (optional, as these are harder to style consistently with CSS vars)
  scrollbarTrack?: string;
  scrollbarThumb?: string;
  scrollbarThumbHover?: string;

  // Input elements
  inputBackground?: string;
  inputText?: string;
  inputBorder?: string;
  inputFocusRing?: string;

  // Special settings menu colors (optional, can derive)
  modalBackground?: string;
  modalText?: string;

  // Specific components if needed, e.g.
  // previewAreaBorder: string; (if different from general borderColor)
  // controlsPanelBackground: string;
}

export interface AppThemeSettings {
  activeThemeKey: ThemeKey;
  customColors: CustomThemeColors; // Stores the user's custom definitions
  // Potentially: lastActivePredefinedTheme: 'light' | 'dark' | 'banana';
}

// Represents the full set of color definitions for any given theme
export type ResolvedThemeColors = CustomThemeColors;