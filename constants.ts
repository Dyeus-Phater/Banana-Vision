

import type { AppSettings, GitHubSettings, CustomThemeColors, ResolvedThemeColors, ThemeKey } from './types';

const DEFAULT_SAMPLE_BYTE_MAP_STRING = `A=1\nB=1\nC=1\nD=1\nE=1\nF=1\nG=1\nH=1\nI=1\nJ=1\nK=1\nL=1\nM=1\nN=1\nO=1\nP=1\nQ=1\nR=1\nS=1\nT=1\nU=1\nV=1\nW=1\nX=1\nY=1\nZ=1\na=1\nb=1\nc=1\nd=1\ne=1\nf=1\ng=1\nh=1\ni=1\nj=1\nk=1\nl=1\nm=1\nn=1\no=1\np=1\nq=1\nr=1\ns=1\nt=1\nu=1\nv=1\nw=1\nx=1\ny=1\nz=1\n0=1\n1=1\n2=1\n3=1\n4=1\n5=1\n6=1\n7=1\n8=1\n9=1\n =1\n.=1\n,=1\n!=1\n?=1\n(=1\n)=1\n[=1\n]=1\n{=1\n}=1\n<=1\n>=1\n/=1\n\\=1\n-=1\n_=1\n+=1\n*=1\n&=1\n^=1\n%=1\n$=1\n#=1\n@=1\n~=1\n\`=1\n'=1\n"=1\n:=1\n;=1\n|=1\n€=3\n£=2\n¥=2\n©=2\n®=2`;

// Default AppSettings
export const DEFAULT_SETTINGS: AppSettings = {
  text: "Welcome to Banana Vision!\nUpload a script or type here to begin.\n\nThis is the first block if no script is loaded.",
  previewWidth: 320,
  previewHeight: 240,
  backgroundColor: '#FFFFFF', 
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
  imageTags: [], 
  useCustomLineBreakTags: false, 
  customLineBreakTags: [], 
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
  // New byte/bit counting defaults
  customByteMapString: DEFAULT_SAMPLE_BYTE_MAP_STRING,
  defaultCharacterByteValue: 1,
  enableByteRestrictionInComparisonMode: false, // Changed default to false
};


export const DEFAULT_GITHUB_SETTINGS: GitHubSettings = {
  pat: '',
  repoFullName: '',
  branch: 'main',
  filePath: 'script.txt',
};


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


export const DEFAULT_LIGHT_THEME_COLORS: ResolvedThemeColors = {
  pageBackground: '#f3f4f6', 
  elementBackground: '#ffffff', 
  elementBackgroundSecondary: '#f9fafb', 
  textPrimary: '#1f2937', 
  textSecondary: '#6b7280', 
  accentPrimary: '#fde047', 
  accentPrimaryContent: '#422006', 
  accentSecondary: '#3b82f6', 
  accentSecondaryContent: '#ffffff', 
  borderColor: '#d1d5db', 
  borderColorLight: '#e5e7eb', 
  toolbarBackground: '#ffffff', 
  toolbarText: '#ca8a04', 
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
  pageBackground: '#1f2937', 
  elementBackground: '#374151', 
  elementBackgroundSecondary: '#4b5563', 
  textPrimary: '#f3f4f6', 
  textSecondary: '#9ca3af', 
  accentPrimary: '#fde047', 
  accentPrimaryContent: '#422006', 
  accentSecondary: '#60a5fa', 
  accentSecondaryContent: '#ffffff', 
  borderColor: '#4b5563', 
  borderColorLight: '#374151', 
  toolbarBackground: '#111827', 
  toolbarText: '#fde047', 
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
  pageBackground: '#fef3c7', 
  elementBackground: '#fef9c3', 
  elementBackgroundSecondary: '#fef08a', 
  textPrimary: '#78350f', 
  textSecondary: '#92400e', 
  accentPrimary: '#facc15', 
  accentPrimaryContent: '#ffffff', 
  accentSecondary: '#fbbf24', 
  accentSecondaryContent: '#422006', 
  borderColor: '#fde047', 
  borderColorLight: '#fef3c7', 
  toolbarBackground: '#fde047', 
  toolbarText: '#78350f', 
  inputBackground: '#fef9e7', 
  inputText: '#78350f',
  inputBorder: '#fcd34d',
  inputFocusRing: '#facc15',
  scrollbarTrack: '#fef3c7',
  scrollbarThumb: '#fde047',
  scrollbarThumbHover: '#facc15',
  modalBackground: '#fef9e7', 
  modalText: '#78350f',
};


export const DEFAULT_CUSTOM_THEME_TEMPLATE: ResolvedThemeColors = {
  ...DEFAULT_BANANA_THEME_COLORS, 
  pageBackground: '#FFFBEB', 
  elementBackground: '#FEFDF2',
};

export const ALL_THEME_DEFINITIONS: Record<Exclude<ThemeKey, 'custom'>, ResolvedThemeColors> = {
  light: DEFAULT_LIGHT_THEME_COLORS,
  dark: DEFAULT_DARK_THEME_COLORS,
  banana: DEFAULT_BANANA_THEME_COLORS,
};