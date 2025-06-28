


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
  spaceWidthOverride?: number; // New: Custom width for space character, 0 for auto/default
  customFontBase64?: string; // New: Base64 encoded custom font data
  customFontFileName?: string; // New: Original file name of the custom font
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
  spaceWidthOverride: number; // Existing: Custom width for space character, 0 for auto
  separationX: number; // New: Horizontal pixels separating tiles
  separationY: number; // New: Vertical pixels separating tiles
}

export interface LineMetricDetail {
  currentChars: number;
  currentBytes: number;
  originalChars?: number;
  originalBytes?: number;
  isOverLimit: boolean;
}

export interface Block {
  content: string;
  originalContent: string; 
  index: number; 
  isOverflowing: boolean;
  lineMetricDetails?: LineMetricDetail[]; // For displaying per-line byte/char counts in comparison
}

export interface ScriptFile {
  id: string; 
  name: string;
  blocks: Block[];
  rawText: string; 
  parsedWithCustomSeparators: boolean; 
  parsedWithLineAsBlock: boolean; 
  parsedWithEmptyLinesSeparator: boolean; // New: True if script was parsed with empty lines as separator
}

export interface TransformSettings {
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  origin: string;
}

export interface MarginSetting {
  value: number;
  breakLine: boolean;
}

export interface PixelOverflowMargins {
  top: MarginSetting;
  right: MarginSetting;
  bottom: MarginSetting;
  left: MarginSetting;
  enabled: boolean;
}

export interface GitHubSettings {
  pat: string;
  repoFullName: string; 
  branch: string;
  filePath: string; // Path for main scripts
  originalFilePath: string; // Path for original/reference scripts
  secondaryOriginalFilePath: string; // Path for the second original/reference script
}

export interface CustomColorTag {
  id: string;
  openingTag: string;
  closingTag: string;
  color: string; 
  enabled: boolean;
}

export interface ImageTag {
  id: string;
  tag: string; 
  imageUrl: string; 
  width: number; 
  height: number; 
  enabled: boolean;
}

export type GlossaryCategory = 'name' | 'term';

export interface GlossaryTerm {
  id: string;
  term: string;
  translation: string;
  category: GlossaryCategory;
}

export interface AppSettings {
  text: string; 
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
  useCustomBlockSeparator: boolean; 
  blockSeparators: string[]; 
  treatEachLineAsBlock: boolean; 
  useEmptyLinesAsSeparator: boolean; // New setting
  hideTagsInPreview: boolean;
  tagPatternsToHide: string[];
  customColorTags: CustomColorTag[]; 
  imageTags: ImageTag[]; 
  useCustomLineBreakTags: boolean; 
  customLineBreakTags: string[]; 
  overflowDetectionMode: 'pixel' | 'character';
  maxCharacters: number;
  maxPixelHeight: number;
  pixelOverflowMargins: PixelOverflowMargins;
  globalLineHeightFactor: number;
  previewZoom: number; 
  comparisonModeEnabled: boolean;

  // New settings for byte/bit counting and restrictions
  customByteMapString: string; // Raw string from textarea, e.g., "A=1\nB=1\n€=3"
  defaultCharacterByteValue: number; // Default byte value for chars not in the map
  enableByteRestrictionInComparisonMode: boolean; // Toggle for the new restriction
}


export type ObjectKeys<T> = {
  [K in keyof T]: T[K] extends object ? K : never;
}[keyof T];


export type NestedAppSettingsObjectKeys = ObjectKeys<AppSettings>;

export interface Profile {
  id: string;
  name: string;
  coverImageUrl: string | null;
  settings: AppSettings;
  gitHubSettings: GitHubSettings; 
}

export type MainViewMode = 'editor' | 'profilesGallery';


export type ThemeKey = 'light' | 'dark' | 'banana' | 'custom';

export interface CustomThemeColors {
  
  pageBackground: string;
  elementBackground: string; 
  elementBackgroundSecondary: string; 
  textPrimary: string;
  textSecondary: string; 
  accentPrimary: string; 
  accentPrimaryContent: string; 
  accentSecondary: string; 
  accentSecondaryContent: string; 
  borderColor: string; 
  borderColorLight: string; 


  toolbarBackground?: string;
  toolbarText?: string;
  toolbarButtonBackground?: string;
  toolbarButtonText?: string;
  toolbarButtonHoverBackground?: string;


  scrollbarTrack?: string;
  scrollbarThumb?: string;
  scrollbarThumbHover?: string;

  
  inputBackground?: string;
  inputText?: string;
  inputBorder?: string;
  inputFocusRing?: string;

  
  modalBackground?: string;
  modalText?: string;

  
}

export interface AppThemeSettings {
  activeThemeKey: ThemeKey;
  customColors: CustomThemeColors; 
  
}


export type ResolvedThemeColors = CustomThemeColors;

// For textMetricsService
export interface CharacterByteMapEntry {
  char: string;
  bytes: number;
}

export interface LineMetrics {
  chars: number;
  bytes: number;
}

export interface BlockMetrics {
  totalChars: number;
  totalBytes: number;
  totalBits: number;
  lineDetails: LineMetrics[];
}