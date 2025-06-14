

import type { AppSettings, GitHubSettings, CustomThemeColors, ResolvedThemeColors, ThemeKey } from './types';

// Default AppSettings
export const DEFAULT_SETTINGS: AppSettings = {
  text: "Welcome to Banana Vision!\nUpload a script or type here to begin.\n\nThis is the first block if no script is loaded.",
  previewWidth: 320,
  previewHeight: 240,
  backgroundColor: '#FFFFFF', // Initial background for preview, can be overridden by theme
  backgroundImageUrl: null,
  secondaryBackgroundImageUrl: null, 
  showSecondaryBackgroundImage: false, 
  systemFont: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fontWeight: 'normal',
    letterSpacing: 0,
    color: '#000000', 
    textAlignHorizontal: 'left',
    textAlignVertical: 'top',
  },
  shadowEffect: {
    offsetX: 2,
    offsetY: 2,
    blur: 2,
    color: 'rgba(0,0,0,0.5)',
    enabled: false,
  },
  outlineEffect: {
    width: 1,
    color: '#000000',
    enabled: false,
  },
  bitmapFont: {
    imageUrl: null,
    charWidth: 8,
    charHeight: 8,
    charMap: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?",
    spacing: 1,
    color: '#000000', 
    zoom: 1,
    enabled: false,
    enableTintColor: true,
    colorToRemove: '#000000',
    enableColorRemoval: false,
    colorRemovalTolerance: 0,
    enablePixelScanning: false,
    spaceWidthOverride: 0,
  },
  transform: {
    positionX: 13,
    positionY: 14,
    scaleX: 1,
    scaleY: 1,
    origin: 'top left',
  },
  currentFontType: 'system',
  useCustomBlockSeparator: false,
  blockSeparators: ['<PAGE>', '<END>', '[NEXT]'],
  hideTagsInPreview: true,
  tagPatternsToHide: ['<[^>]*>', '\\[[^\\]]*\\]', '\\{[^\\}]*\\}'],
  customColorTags: [],
  imageTags: [], // Initialize image tags
  overflowDetectionMode: 'pixel',
  maxCharacters: 150,
  maxPixelHeight: 200,
  pixelOverflowMargins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    enabled: false,
  },
  globalLineHeightFactor: 1.2,
  previewZoom: 1, 
  comparisonModeEnabled: false,
};

// Default GitHub Settings
export const DEFAULT_GITHUB_SETTINGS: GitHubSettings = {
  pat: '',
  repoFullName: '',
  branch: 'main',
  filePath: 'script.txt',
};

// Available System Fonts
export const AVAILABLE_FONTS: string[] = [
  'Arial, sans-serif',
  'Verdana, sans-serif',
  'Tahoma, sans-serif',
  'Georgia, serif',
  'Times New Roman, Times, serif',
  'Courier New, Courier, monospace',
  'Lucida Console, Monaco, monospace',
  'Comic Sans MS, cursive',
];

// Theme Color Definitions
export const DEFAULT_LIGHT_THEME_COLORS: ResolvedThemeColors = {
  pageBackground: '#f3f4f6', // gray-100
  elementBackground: '#ffffff', // white
  elementBackgroundSecondary: '#f9fafb', // gray-50 (e.g. for section headers)
  textPrimary: '#1f2937', // gray-800
  textSecondary: '#6b7280', // gray-500
  accentPrimary: '#fde047', // yellow-400 (banana-like)
  accentPrimaryContent: '#422006', // dark brown/yellow-900 (for text on banana)
  accentSecondary: '#3b82f6', // blue-500
  accentSecondaryContent: '#ffffff', // white
  borderColor: '#d1d5db', // gray-300
  borderColorLight: '#e5e7eb', // gray-200
  toolbarBackground: '#ffffff', // white
  toolbarText: '#ca8a04', // yellow-600
  inputBackground: '#ffffff',
  inputText: '#1f2937',
  inputBorder: '#d1d5db',
  inputFocusRing: '#fde047',
  scrollbarTrack: '#f1f1f1',
  scrollbarThumb: '#fde047',
  scrollbarThumbHover: '#facc15',
  modalBackground: '#ffffff',
  modalText: '#1f2937',
};

export const DEFAULT_DARK_THEME_COLORS: ResolvedThemeColors = {
  pageBackground: '#1f2937', // gray-800
  elementBackground: '#374151', // gray-700
  elementBackgroundSecondary: '#4b5563', // gray-600
  textPrimary: '#f3f4f6', // gray-100
  textSecondary: '#9ca3af', // gray-400
  accentPrimary: '#fde047', // yellow-400 (banana-like)
  accentPrimaryContent: '#422006', // dark brown for text on banana
  accentSecondary: '#60a5fa', // blue-400
  accentSecondaryContent: '#ffffff', // white
  borderColor: '#4b5563', // gray-600
  borderColorLight: '#374151', // gray-700
  toolbarBackground: '#111827', // gray-900
  toolbarText: '#fde047', // yellow-400
  inputBackground: '#4b5563',
  inputText: '#f3f4f6',
  inputBorder: '#6b7280',
  inputFocusRing: '#fde047',
  scrollbarTrack: '#374151',
  scrollbarThumb: '#fde047',
  scrollbarThumbHover: '#facc15',
  modalBackground: '#374151',
  modalText: '#f3f4f6',
};

export const DEFAULT_BANANA_THEME_COLORS: ResolvedThemeColors = {
  pageBackground: '#fef3c7', // yellow-100 (banana scheme page bg)
  elementBackground: '#fef9c3', // yellow-200/80 with blur (main elements)
  elementBackgroundSecondary: '#fef08a', // yellow-300 (section headers)
  textPrimary: '#78350f', // yellow-900 (main text)
  textSecondary: '#92400e', // yellow-800 (secondary text)
  accentPrimary: '#facc15', // yellow-500 (main banana accent)
  accentPrimaryContent: '#ffffff', // white (text on main accent)
  accentSecondary: '#fbbf24', // amber-400
  accentSecondaryContent: '#422006', // dark brown
  borderColor: '#fde047', // yellow-400
  borderColorLight: '#fef3c7', // yellow-100
  toolbarBackground: '#fde047', // yellow-400
  toolbarText: '#78350f', // yellow-900
  inputBackground: '#fef9e7', // lighter yellow for inputs
  inputText: '#78350f',
  inputBorder: '#fcd34d',
  inputFocusRing: '#facc15',
  scrollbarTrack: '#fef3c7',
  scrollbarThumb: '#fde047',
  scrollbarThumbHover: '#facc15',
  modalBackground: '#fef9e7', // yellow-50ish
  modalText: '#78350f',
};

// This will be the starting point for user's custom theme if they haven't saved one
export const DEFAULT_CUSTOM_THEME_TEMPLATE: ResolvedThemeColors = {
  ...DEFAULT_BANANA_THEME_COLORS, // Start custom theme based on banana
  pageBackground: '#FFFBEB', // A slightly off-white yellow for custom default
  elementBackground: '#FEFDF2',
};

export const ALL_THEME_DEFINITIONS: Record<Exclude<ThemeKey, 'custom'>, ResolvedThemeColors> = {
  light: DEFAULT_LIGHT_THEME_COLORS,
  dark: DEFAULT_DARK_THEME_COLORS,
  banana: DEFAULT_BANANA_THEME_COLORS,
};