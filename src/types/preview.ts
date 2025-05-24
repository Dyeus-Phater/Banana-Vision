
export interface TextBlock {
  content: string;
  index: number;
}

export interface ColorTag {
  pattern: string;
  color: string;
  type: 'enclosed' | 'free';
  openTag?: string;
  closeTag?: string;
}

export interface ReplacementTag {
  pattern: string;
  replacement: string;
}

export interface TextShadowSettings {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface BitmapFontSettings {
  enabled: boolean;
  fontImage: string | null;
  characters: string;
  tileWidth: number;
  tileHeight: number;
  offsetX: number;
  offsetY: number;
  separationX: number;
  separationY: number;
  baselineX: number;
  baselineY: number;
  spacing: number;
  fontColor: string;
  colorTolerance: number;
  zoomFactor: number;
  sampleText?: string;
  backgroundColor?: string;
}

export interface PreviewSettings {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textX: number;
  textY: number;
  scaleX: number;
  scaleY: number;
  hideTags: boolean;
  tagPatterns: string[];
  backgroundImage: string | null;
  previewImage?: string | null;
  fontFamily: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'center' | 'bottom';
  displayMode: 'single' | 'all';
  isConfigMinimized: boolean;
  isPresetsMinimized: boolean;
  textWrapWidth: number;
  colorTags: ColorTag[];
  replacementTags: ReplacementTag[];
  textShadow: TextShadowSettings;
  textStrokeWidth: number;
  textStrokeColor: string;
  isBold: boolean;
  useCustomBlockSeparator?: boolean;
  blockSeparators: string[];
  bitmapFont: BitmapFontSettings;
}

export const defaultSettings: PreviewSettings = {
  fontSize: 16,
  lineHeight: 1.5,
  letterSpacing: 0,
  textX: 0,
  textY: 0,
  scaleX: 1,
  scaleY: 1,
  hideTags: false,
  tagPatterns: ["\\{[^}]*\\}", "<[^>]*>", "\\[[^\\]]*\\]"],
  backgroundImage: null,
  previewImage: null,
  fontFamily: "monospace",
  textColor: "#FFFFFF",
  textAlign: 'left',
  verticalAlign: 'top',
  displayMode: 'single',
  isConfigMinimized: false,
  isPresetsMinimized: true,
  textWrapWidth: 300,
  colorTags: [
    {
      pattern: "\\[red\\](.*?)\\[/red\\]",
      color: "#FF0000",
      type: 'enclosed',
      openTag: "[red]",
      closeTag: "[/red]"
    },
    {
      pattern: "\\[blue\\].*",
      color: "#0000FF",
      type: 'free'
    }
  ],
  replacementTags: [
    {
      pattern: "<nome>",
      replacement: "jogador"
    }
  ],
  textShadow: {
    offsetX: 0,
    offsetY: 0,
    blur: 0,
    color: "#000000"
  },
  textStrokeWidth: 0,
  textStrokeColor: "#000000",
  isBold: false,
  useCustomBlockSeparator: false,
  blockSeparators: ["\n\s*\n"],
  bitmapFont: {
    colorTolerance: 0,
    enabled: false,
    fontImage: null,
    characters: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~∎",
    tileWidth: 8,
    tileHeight: 8,
    offsetX: 0,
    offsetY: 0,
    separationX: 0,
    separationY: 0,
    baselineX: 0,
    baselineY: 0,
    spacing: 1,
    fontColor: "#FFFFFF",
    zoomFactor: 1,
    backgroundColor: "#333333"
  }
};
