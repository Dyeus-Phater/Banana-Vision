

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

export interface AppSettings {
  text: string; // Represents content of the current block of the active script
  previewWidth: number;
  previewHeight: number;
  backgroundColor: string;
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
  overflowDetectionMode: 'pixel' | 'character';
  maxCharacters: number;
  maxPixelHeight: number;
  pixelOverflowMargins: PixelOverflowMargins;
  globalLineHeightFactor: number;
  previewZoom: number; 
  comparisonModeEnabled: boolean;
}

export type Theme = 'light' | 'dark' | 'banana';

// Helper type to get keys of T whose values are objects
export type ObjectKeys<T> = {
  [K in keyof T]: T[K] extends object ? K : never;
}[keyof T];

// Specific type for keys of AppSettings that point to nested objects
export type NestedAppSettingsObjectKeys = ObjectKeys<AppSettings>;