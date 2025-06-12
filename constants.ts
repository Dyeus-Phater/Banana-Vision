

import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  text: "Welcome to Banana Vision!\nUpload a script or type here to begin.\n\nThis is the first block if no script is loaded.",
  previewWidth: 320,
  previewHeight: 240,
  backgroundColor: '#FFFFFF', // White
  backgroundImageUrl: null,
  secondaryBackgroundImageUrl: null, 
  showSecondaryBackgroundImage: false, 
  systemFont: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fontWeight: 'normal',
    letterSpacing: 0,
    color: '#000000', // Black
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
    color: '#000000', // Tint color
    zoom: 1,
    enabled: false,
    enableTintColor: true,
    colorToRemove: '#000000', // Default color to remove (black)
    enableColorRemoval: false, // Default to color removal being disabled
    colorRemovalTolerance: 0, // Default tolerance to 0 (exact match)
    enablePixelScanning: false, // Default to pixel scanning being disabled
    spaceWidthOverride: 0, // Default to 0 (auto behavior)
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
  blockSeparators: ['<PAGE>', '<END>', '[NEXT]'], // Default custom separators
  hideTagsInPreview: true, // Hide tags by default
  tagPatternsToHide: ['<[^>]*>', '\\[[^\\]]*\\]', '\\{[^\\}]*\\}'], // Default patterns: <...>, [...], {...}
  overflowDetectionMode: 'pixel',
  maxCharacters: 150,
  maxPixelHeight: 200, // Default max content height for pixel-based auto-height mode
  pixelOverflowMargins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    enabled: false,
  },
  globalLineHeightFactor: 1.2,
  previewZoom: 1, 
  comparisonModeEnabled: false, // New default
};

export const AVAILABLE_FONTS: string[] = [
  'Arial, sans-serif',
  'Verdana, sans-serif',
  'Tahoma, sans-serif',
  'Georgia, serif',
  'Times New Roman, Times, serif',
  'Courier New, Courier, monospace',
  'Lucida Console, Monaco, monospace',
  'Comic Sans MS, cursive', // For the memes
];