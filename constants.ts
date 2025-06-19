


import type { AppSettings, GitHubSettings, CustomThemeColors, ResolvedThemeColors, ThemeKey, GlossaryTerm } from './types';

const DEFAULT_SAMPLE_BYTE_MAP_STRING = `A=1
B=1
C=1
D=1
E=1
F=1
G=1
H=1
I=1
J=1
K=1
L=1
M=1
N=1
O=1
P=1
Q=1
R=1
S=1
T=1
U=1
V=1
W=1
X=1
Y=1
Z=1
a=1
b=1
c=1
d=1
e=1
f=1
g=1
h=1
i=1
j=1
k=1
l=1
m=1
n=1
o=1
p=1
q=1
r=1
s=1
t=1
u=1
v=1
w=1
x=1
y=1
z=1
0=1
1=1
2=1
3=1
4=1
5=1
6=1
7=1
8=1
9=1
 =1
.=1
,=1
!=1
?=1
(=1
)=1
[=1
]=1
{=1
}=1
<=1
>=1
/=1
\\=1
-=1
_=1
+=1
*=1
&=1
^=1
%=1
$=1
#=1
@=1
~=1
\`=1
'=1
"=1
:=1
;=1
|=1
€=3
£=2
¥=2
©=2
®=2`;

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
    spaceWidthOverride: 0, // Default to 0 (auto)
    customFontBase64: undefined,
    customFontFileName: undefined,
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
    separationX: 0, // New default
    separationY: 0, // New default
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
  treatEachLineAsBlock: false, 
  useEmptyLinesAsSeparator: false, // New default
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
    top: { value: 10, breakLine: false },
    right: { value: 10, breakLine: false },
    bottom: { value: 10, breakLine: false },
    left: { value: 10, breakLine: false },
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
  originalFilePath: 'original_script.txt',
};

export const DEFAULT_GLOSSARY_TERMS: GlossaryTerm[] = [];


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