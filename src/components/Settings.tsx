import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ColorInput } from "@/components/ui/color-input";
import { PreviewSettings, defaultSettings } from '@/types/preview';
import { ChevronDown, ChevronRight, Pipette } from 'lucide-react';

interface SettingsProps {
  settings: PreviewSettings;
  onSettingsChange: (newSettings: PreviewSettings) => void;
  onFileUpload: {
    text: (e: React.ChangeEvent<HTMLInputElement>) => void;
    background: (e: React.ChangeEvent<HTMLInputElement>) => void;
    font: (e: React.ChangeEvent<HTMLInputElement>) => void;
    settings: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  onClearFiles: () => void;
  onExportSettings: () => void;
  onToggleMinimize: () => void;
}

const shadowColorPresets = [
  { name: "Black", color: "#000000" },
  { name: "Gray", color: "#8E9196" },
  { name: "Purple", color: "#9b87f5" },
  { name: "Blue", color: "#0EA5E9" },
  { name: "Red", color: "#ea384c" },
  { name: "Green", color: "#22C55E" }
];

const Settings: React.FC<SettingsProps> = ({
  settings,
  onSettingsChange,
  onFileUpload,
  onClearFiles,
  onExportSettings,
  onToggleMinimize
}) => {
  const textShadow = settings.textShadow || {
    offsetX: 0,
    offsetY: 0,
    blur: 0,
    color: "#000000"
  };

  const [isTextStylingExpanded, setIsTextStylingExpanded] = useState(false);
  const [isPositionScaleExpanded, setIsPositionScaleExpanded] = useState(false);
  const [isEffectsExpanded, setIsEffectsExpanded] = useState(false);
  const [isBitmapFontExpanded, setIsBitmapFontExpanded] = useState(false);
  const [fontImageLoadError, setFontImageLoadError] = useState<string | null>(null);
  const [isFontImageLoading, setIsFontImageLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Controls</h2>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={onClearFiles}
            className="text-sm"
          >
            Clear Files
          </Button>
          <Button 
            variant="outline" 
            onClick={onToggleMinimize}
            className="text-sm"
          >
            {settings.isConfigMinimized ? "Expand" : "Minimize"}
          </Button>
        </div>
      </div>

      <div className={`space-y-8 transition-all duration-300 ${settings.isConfigMinimized ? 'hidden' : ''}`}>
        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-lg font-medium">File Operations</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="textFile">Text File</Label>
              <Input
                id="textFile"
                type="file"
                accept=".txt"
                onChange={onFileUpload.text}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="backgroundImage">Background Image</Label>
              <Input
                id="backgroundImage"
                type="file"
                accept=".png"
                onChange={onFileUpload.background}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fontFile">Font File</Label>
              <Input
                id="fontFile"
                type="file"
                accept=".ttf,.otf"
                onChange={onFileUpload.font}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Configs</Label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={onFileUpload.settings}
                  className="mt-1"
                />
              </div>
              <Button onClick={onExportSettings}>
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-lg font-medium">Display Mode</h3>
          <div className="flex gap-2">
            <Button
              variant={settings.displayMode === 'single' ? "default" : "outline"}
              onClick={() => onSettingsChange({ ...settings, displayMode: 'single' })}
              className="flex-1"
            >
              Single Block
            </Button>
            <Button
              variant={settings.displayMode === 'all' ? "default" : "outline"}
              onClick={() => onSettingsChange({ ...settings, displayMode: 'all' })}
              className="flex-1"
            >
              All Blocks
            </Button>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <button
            onClick={() => setIsTextStylingExpanded(!isTextStylingExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isTextStylingExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">Text Styling</h3>
          </button>
          <div className={`space-y-4 ${isTextStylingExpanded ? '' : 'hidden'}`}>
            <div>
              <ColorInput
                id="textColor"
                label="Text Color"
                value={settings.textColor}
                onChange={(value) => onSettingsChange({ ...settings, textColor: value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Horizontal Alignment</Label>
              <div className="flex gap-2">
                <Button
                  variant={settings.textAlign === 'left' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, textAlign: 'left' })}
                  className="flex-1"
                >
                  Left
                </Button>
                <Button
                  variant={settings.textAlign === 'center' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, textAlign: 'center' })}
                  className="flex-1"
                >
                  Center
                </Button>
                <Button
                  variant={settings.textAlign === 'right' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, textAlign: 'right' })}
                  className="flex-1"
                >
                  Right
                </Button>
              </div>

              <Label className="mt-4">Vertical Alignment</Label>
              <div className="flex gap-2">
                <Button
                  variant={settings.verticalAlign === 'top' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, verticalAlign: 'top' })}
                  className="flex-1"
                >
                  Top
                </Button>
                <Button
                  variant={settings.verticalAlign === 'center' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, verticalAlign: 'center' })}
                  className="flex-1"
                >
                  Center
                </Button>
                <Button
                  variant={settings.verticalAlign === 'bottom' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, verticalAlign: 'bottom' })}
                  className="flex-1"
                >
                  Bottom
                </Button>
              </div>
            </div>

            <div>
              <Label>Font Size: {settings.fontSize}px</Label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={(value) => onSettingsChange({ ...settings, fontSize: value[0] })}
                min={8}
                max={32}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Line Height: {settings.lineHeight}</Label>
              <Slider
                value={[settings.lineHeight * 10]}
                onValueChange={(value) => onSettingsChange({ ...settings, lineHeight: value[0] / 10 })}
                min={10}
                max={30}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Letter Spacing: {settings.letterSpacing}px</Label>
              <Slider
                value={[settings.letterSpacing]}
                onValueChange={(value) => onSettingsChange({ ...settings, letterSpacing: value[0] })}
                min={-2}
                max={10}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Text Wrap Width: {settings.textWrapWidth}px</Label>
              <Slider
                value={[settings.textWrapWidth]}
                onValueChange={(value) => onSettingsChange({ ...settings, textWrapWidth: value[0] })}
                min={100}
                max={1000}
                step={10}
                className="mt-2"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Input
                type="checkbox"
                checked={settings.isBold}
                onChange={(e) => onSettingsChange({ ...settings, isBold: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>Bold Text</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Input
                type="checkbox"
                checked={settings.hideTags}
                onChange={(e) => onSettingsChange({ ...settings, hideTags: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>Hide Tags</Label>
            </div>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <button
            onClick={() => setIsPositionScaleExpanded(!isPositionScaleExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isPositionScaleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">Position & Scale</h3>
          </button>
          <div className={`space-y-4 ${isPositionScaleExpanded ? '' : 'hidden'}`}>
            <div>
              <Label>Text X Position: {settings.textX}px</Label>
              <Slider
                value={[settings.textX]}
                onValueChange={(value) => onSettingsChange({ ...settings, textX: value[0] })}
                min={-100}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Text Y Position: {settings.textY}px</Label>
              <Slider
                value={[settings.textY]}
                onValueChange={(value) => onSettingsChange({ ...settings, textY: value[0] })}
                min={-100}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Horizontal Scale: {settings.scaleX}x</Label>
              <Slider
                value={[settings.scaleX * 100]}
                onValueChange={(value) => onSettingsChange({ ...settings, scaleX: value[0] / 100 })}
                min={50}
                max={200}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Vertical Scale: {settings.scaleY}x</Label>
              <Slider
                value={[settings.scaleY * 100]}
                onValueChange={(value) => onSettingsChange({ ...settings, scaleY: value[0] / 100 })}
                min={50}
                max={200}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <button
            onClick={() => setIsEffectsExpanded(!isEffectsExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isEffectsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">Effects</h3>
          </button>
          <div className={`space-y-4 ${isEffectsExpanded ? '' : 'hidden'}`}>
            <div>
              <Label>Text Shadow</Label>
              <div className="space-y-4">
                <div>
                  <ColorInput
                    label="Shadow Color"
                    value={textShadow.color}
                    onChange={(value) => onSettingsChange({
                      ...settings,
                      textShadow: {
                        ...textShadow,
                        color: value
                      }
                    })}
                  />
                </div>
                <div>
                  <Label>Offset ({textShadow.offsetX}px)</Label>
                  <Slider
                    value={[textShadow.offsetX]}
                    onValueChange={(value) => onSettingsChange({
                      ...settings,
                      textShadow: {
                        ...textShadow,
                        offsetX: value[0],
                        offsetY: value[0]
                      }
                    })}
                    min={0}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Blur ({textShadow.blur}px)</Label>
                  <Slider
                    value={[textShadow.blur]}
                    onValueChange={(value) => onSettingsChange({
                      ...settings,
                      textShadow: {
                        ...textShadow,
                        blur: value[0]
                      }
                    })}
                    min={0}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Text Stroke</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ColorInput
                    label="Color"
                    value={settings.textStrokeColor}
                    onChange={(value) => onSettingsChange({
                      ...settings,
                      textStrokeColor: value
                    })}
                  />
                </div>
                <div>
                  <Label>Width ({settings.textStrokeWidth}px)</Label>
                  <Slider
                    value={[settings.textStrokeWidth]}
                    onValueChange={(value) => onSettingsChange({
                      ...settings,
                      textStrokeWidth: value[0]
                    })}
                    min={-5}
                    max={5}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4 border rounded-lg p-4">
          <button
            onClick={() => setIsBitmapFontExpanded(!isBitmapFontExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isBitmapFontExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">Bitmap Font</h3>
          </button>
          <div className={`space-y-4 ${isBitmapFontExpanded ? '' : 'hidden'}`}>
            <div className="flex items-center space-x-2 mb-2">
              <Input
                type="checkbox"
                checked={settings.bitmapFont.enabled}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    enabled: e.target.checked
                  }
                })}
                className="w-4 h-4"
              />
              <Label>Enable Bitmap Font</Label>
            </div>
            
            {fontImageLoadError && (
              <div className="text-red-500 text-sm">{fontImageLoadError}</div>
            )}
            
            {isFontImageLoading && (
              <div className="text-blue-500 text-sm">Loading font image...</div>
            )}
            
            <div>
              <Label htmlFor="bitmapFontImage">Bitmap Font Image</Label>
              <Input
                id="bitmapFontImage"
                type="file"
                accept=".png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsFontImageLoading(true);
                    setFontImageLoadError(null);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = () => {
                        onSettingsChange({
                          ...settings,
                          bitmapFont: {
                            ...settings.bitmapFont,
                            enabled: true,
                            fontImage: event.target?.result as string
                          }
                        });
                        setIsFontImageLoading(false);
                      };
                      img.onerror = () => {
                        setFontImageLoadError('Failed to load the image');
                        setIsFontImageLoading(false);
                      };
                      img.src = event.target?.result as string;
                    };
                    reader.onerror = () => {
                      setFontImageLoadError('Failed to read the file');
                      setIsFontImageLoading(false);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Character Sequence</Label>
              <Input
                value={settings.bitmapFont.characters}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    characters: e.target.value
                  }
                })}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tile Width: {settings.bitmapFont.tileWidth}px</Label>
                <Slider
                  value={[settings.bitmapFont.tileWidth]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      tileWidth: value[0]
                    }
                  })}
                  min={4}
                  max={64}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Tile Height: {settings.bitmapFont.tileHeight}px</Label>
                <Slider
                  value={[settings.bitmapFont.tileHeight]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      tileHeight: value[0]
                    }
                  })}
                  min={4}
                  max={64}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Offset X: {settings.bitmapFont.offsetX}px</Label>
                <Slider
                  value={[settings.bitmapFont.offsetX]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      offsetX: value[0]
                    }
                  })}
                  min={0}
                  max={32}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Offset Y: {settings.bitmapFont.offsetY}px</Label>
                <Slider
                  value={[settings.bitmapFont.offsetY]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      offsetY: value[0]
                    }
                  })}
                  min={0}
                  max={32}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Separation X: {settings.bitmapFont.separationX}px</Label>
                <Slider
                  value={[settings.bitmapFont.separationX]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      separationX: value[0]
                    }
                  })}
                  min={0}
                  max={16}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Separation Y: {settings.bitmapFont.separationY}px</Label>
                <Slider
                  value={[settings.bitmapFont.separationY]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      separationY: value[0]
                    }
                  })}
                  min={0}
                  max={16}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Baseline X: {settings.bitmapFont.baselineX}px</Label>
                <Slider
                  value={[settings.bitmapFont.baselineX]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      baselineX: value[0]
                    }
                  })}
                  min={-16}
                  max={16}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Baseline Y: {settings.bitmapFont.baselineY}px</Label>
                <Slider
                  value={[settings.bitmapFont.baselineY]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      baselineY: value[0]
                    }
                  })}
                  min={-16}
                  max={16}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div>
              <Label>Character Spacing: {settings.bitmapFont.spacing}px</Label>
              <Slider
                value={[settings.bitmapFont.spacing]}
                onValueChange={(value) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    spacing: value[0]
                  }
                })}
                min={0}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div className="space-y-4">
              <Label>Transparent Color</Label>
              <div className="flex items-center gap-2">
                <ColorInput
                  value={settings.bitmapFont.transparentColor}
                  onChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      transparentColor: value
                    }
                  })}
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="Pick color from image"
                  onClick={() => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                      
                      const handleImageClick = (e: MouseEvent) => {
                        const rect = canvas.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        const pixel = ctx?.getImageData(x, y, 1, 1).data;
                        if (pixel) {
                          const color = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
                          onSettingsChange({
                            ...settings,
                            bitmapFont: {
                              ...settings.bitmapFont,
                              transparentColor: color
                            }
                          });
                          canvas.removeEventListener('click', handleImageClick);
                          document.body.removeChild(canvas);
                        }
                      };
                      
                      canvas.style.position = 'fixed';
                      canvas.style.top = '50%';
                      canvas.style.left = '50%';
                      canvas.style.transform = 'translate(-50%, -50%)';
                      canvas.style.cursor = 'crosshair';
                      canvas.style.zIndex = '9999';
                      document.body.appendChild(canvas);
                      canvas.addEventListener('click', handleImageClick);
                    };
                    img.src = settings.bitmapFont.fontImage || '';
                  }}
                >
                  <Pipette className="h-4 w-4" />
                </Button>
              </div>
              
              <div>
                <Label>Color Tolerance: {settings.bitmapFont.colorTolerance || 0}</Label>
                <Slider
                  value={[settings.bitmapFont.colorTolerance || 0]}
                  onValueChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      colorTolerance: value[0]
                    }
                  })}
                  min={0}
                  max={255}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Zoom: {settings.bitmapFont.zoomFactor}x</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      zoomFactor: 1
                    }
                  })}
                  className="text-xs h-7 px-2"
                >
                  Reset to 1x
                </Button>
              </div>
              <Slider
                value={[settings.bitmapFont.zoomFactor * 100]}
                onValueChange={(value) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    zoomFactor: value[0] / 100
                  }
                })}
                min={50}
                max={400}
                step={10}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.5x</span>
                <span>4x</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Input
              type="checkbox"
              checked={settings.useCustomBlockSeparator}
              onChange={(e) => onSettingsChange({ ...settings, useCustomBlockSeparator: e.target.checked })}
              className="w-4 h-4"
            />
            <Label>Use Custom Block Separator</Label>
          </div>
          {settings.useCustomBlockSeparator && (
            <div>
              <Label>Block Separator</Label>
              <Input
                value={settings.blockSeparator}
                onChange={(e) => onSettingsChange({ ...settings, blockSeparator: e.target.value })}
                placeholder="Default: \n\s*\n"
                className="mt-2"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
