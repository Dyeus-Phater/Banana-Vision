import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ColorInput } from "@/components/ui/color-input";
import { PreviewSettings, defaultSettings } from '@/types/preview';
import { ChevronDown, ChevronRight, Pipette } from 'lucide-react';
import BitmapFontRenderer from './BitmapFontRenderer';
import { useTranslation } from 'react-i18next';

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

// Interface para os perfis salvos no localStorage
interface SavedProfile {
  name: string;
  settings: PreviewSettings;
  createdAt: string;
}

const Settings: React.FC<SettingsProps> = ({
  settings,
  onSettingsChange,
  onFileUpload,
  onClearFiles,
  onExportSettings,
  onToggleMinimize
}) => {
  const { t } = useTranslation();
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
  const [isFileOperationsExpanded, setIsFileOperationsExpanded] = useState(true);
  const [isUserProfilesExpanded, setIsUserProfilesExpanded] = useState(true);
  const [fontImageLoadError, setFontImageLoadError] = useState<string | null>(null);
  const [isFontImageLoading, setIsFontImageLoading] = useState(false);
  
  // Estado para gerenciar perfis salvos
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [profileName, setProfileName] = useState('');
  
  // Carregar perfis salvos do localStorage ao iniciar
  useEffect(() => {
    const loadSavedProfiles = () => {
      const savedProfilesJson = localStorage.getItem('banana-vision-profiles');
      if (savedProfilesJson) {
        try {
          const profiles = JSON.parse(savedProfilesJson) as SavedProfile[];
          setSavedProfiles(profiles);
        } catch (error) {
          console.error('Erro ao carregar perfis salvos:', error);
        }
      }
    };
    
    loadSavedProfiles();
  }, []);
  
  // Função para salvar um novo perfil
  const saveProfile = () => {
    if (!profileName.trim()) {
      alert('Por favor, insira um nome para o perfil');
      return;
    }
    
    // Verificar se já existe um perfil com este nome
    const profileExists = savedProfiles.some(profile => profile.name === profileName);
    if (profileExists) {
      if (!confirm(`Já existe um perfil com o nome "${profileName}". Deseja substituí-lo?`)) {
        return;
      }
    }
    
    // Criamos uma cópia completa das configurações, garantindo que a imagem de fundo e a fonte bitmap sejam incluídas
    const newProfile: SavedProfile = {
      name: profileName,
      settings: { 
        ...settings,
        // Garantimos que a imagem de fundo seja incluída
        backgroundImage: settings.backgroundImage,
        // Garantimos que todas as configurações de fonte bitmap sejam incluídas
        bitmapFont: { 
          ...settings.bitmapFont,
          fontImage: settings.bitmapFont.fontImage
        }
      },
      createdAt: new Date().toISOString()
    };
    
    // Atualizar a lista de perfis (substituindo se já existir)
    const updatedProfiles = profileExists
      ? savedProfiles.map(p => p.name === profileName ? newProfile : p)
      : [...savedProfiles, newProfile];
    
    // Salvar no localStorage
    localStorage.setItem('banana-vision-profiles', JSON.stringify(updatedProfiles));
    setSavedProfiles(updatedProfiles);
    setProfileName('');
    alert(`Perfil "${profileName}" salvo com sucesso!`);
  };
  
  // Função para carregar um perfil
  const loadProfile = (profile: SavedProfile) => {
    if (confirm(`Deseja carregar o perfil "${profile.name}"? Isso substituirá suas configurações atuais.`)) {
      onSettingsChange(profile.settings);
    }
  };
  
  // Função para excluir um perfil
  const deleteProfile = (profileName: string) => {
    if (confirm(`Tem certeza que deseja excluir o perfil "${profileName}"?`)) {
      const updatedProfiles = savedProfiles.filter(p => p.name !== profileName);
      localStorage.setItem('banana-vision-profiles', JSON.stringify(updatedProfiles));
      setSavedProfiles(updatedProfiles);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center relative">
        <h2 className="text-2xl font-semibold">{t('controls')}</h2>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={onClearFiles}
            className={`text-sm ${settings.isConfigMinimized ? 'hidden' : ''}`}
          >
            {t('clearAllFiles')}
          </Button>
          <Button 
            variant="outline" 
            onClick={onToggleMinimize}
            className="text-sm transition-opacity duration-300"
            aria-label={settings.isConfigMinimized ? t("expand") : t("minimize")}
            size={settings.isConfigMinimized ? "icon" : "default"}
          >
            {settings.isConfigMinimized ? <ChevronRight className="h-4 w-4" /> : t("minimize")}
          </Button>
        </div>
      </div>

      <div className={`space-y-4 transition-all duration-300 ${settings.isConfigMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="space-y-4 border rounded-lg p-2 md:p-4">
          <h3 className="text-lg font-medium">{t('displayMode')}</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={settings.displayMode === 'single' ? "default" : "outline"}
              onClick={() => onSettingsChange({ ...settings, displayMode: 'single' })}
              className="flex-1 min-w-[120px]"
            >
              {t('singleBlock')}
            </Button>
            <Button
              variant={settings.displayMode === 'all' ? "default" : "outline"}
              onClick={() => onSettingsChange({ ...settings, displayMode: 'all' })}
              className="flex-1 min-w-[120px]"
            >
              {t('allBlocks')}
            </Button>
          </div>
        </div>


        
        <div className="space-y-4 border rounded-lg p-2 md:p-4">
          <button
            onClick={() => setIsFileOperationsExpanded(!isFileOperationsExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isFileOperationsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            {t('fileOperations')}
          </button>
          {isFileOperationsExpanded && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="text-file">{t('textFileInputLabel')}</Label>
                  <Input id="text-file" type="file" onChange={onFileUpload.text} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-file">{t('fontFileInputLabel')}</Label>
                  <Input id="font-file" type="file" onChange={onFileUpload.font} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background-image">{t('backgroundImageInputLabel')}</Label>
                  <Input id="background-image" type="file" onChange={onFileUpload.background} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-file">{t('importSettings')}</Label>
                  <Input id="settings-file" type="file" onChange={onFileUpload.settings} accept=".json" />
                </div>
              </div>
              <Button onClick={onExportSettings} className="w-full md:w-auto">{t('exportButtonLabel')}</Button>
            </div>
          )}
        </div>

        <div className="space-y-4 border rounded-lg p-2 md:p-4">
          <button
            onClick={() => setIsTextStylingExpanded(!isTextStylingExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isTextStylingExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">{t('textStyling')}</h3>
          </button>
          <div className={`space-y-4 ${isTextStylingExpanded ? '' : 'hidden'}`}>
            <div>
              <ColorInput
                id="textColor"
                label={t('textColor')}
                value={settings.textColor}
                onChange={(value) => onSettingsChange({ ...settings, textColor: value })}
              />
            </div>

            <div className="space-y-2">
              <Label title={t('horizontalAlignmentTitle')}>{t('horizontalAlignmentTitle')}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={settings.textAlign === 'left' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, textAlign: 'left' })}
                  className="flex-1 min-w-[70px]"
                >
                  {t('left')}
                </Button>
                <Button
                  variant={settings.textAlign === 'center' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, textAlign: 'center' })}
                  className="flex-1 min-w-[70px]"
                >
                  {t('center')}
                </Button>
                <Button
                  variant={settings.textAlign === 'right' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, textAlign: 'right' })}
                  className="flex-1 min-w-[70px]"
                >
                  {t('right')}
                </Button>
              </div>

              <Label className="mt-4" title={t('verticalAlignmentTitle')}>{t('verticalAlignmentTitle')}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={settings.verticalAlign === 'top' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, verticalAlign: 'top' })}
                  className="flex-1 min-w-[70px]"
                >
                  {t('top')}
                </Button>
                <Button
                  variant={settings.verticalAlign === 'center' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, verticalAlign: 'center' })}
                  className="flex-1 min-w-[70px]"
                >
                  {t('center')}
                </Button>
                <Button
                  variant={settings.verticalAlign === 'bottom' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, verticalAlign: 'bottom' })}
                  className="flex-1 min-w-[70px]"
                >
                  {t('bottom')}
                </Button>
              </div>
            </div>

            <div>
              <Label title={t('fontSizeDescription')}>{t('fontSize')}: {settings.fontSize}px</Label>
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
              <Label title={t('lineHeightDescription')}>{t('lineHeight')}: {settings.lineHeight}</Label>
              <Slider
                value={[settings.lineHeight * 10]}
                onValueChange={(value) => onSettingsChange({ ...settings, lineHeight: value[0] / 10 })}
                min={-10}
                max={30}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label title={t('letterSpacingDescription')}>{t('letterSpacing')}: {settings.letterSpacing}px</Label>
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
              <Label title={t('textWrapWidthDescription')}>{t('textWrapWidth')}: {settings.textWrapWidth}px</Label>
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
              <Label title={t('boldTextLabel')}>{t('boldTextLabel')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Input
                type="checkbox"
                checked={settings.hideTags}
                onChange={(e) => onSettingsChange({ ...settings, hideTags: e.target.checked })}
                className="w-4 h-4"
              />
              <Label title={t('hideTagsLabel')}>{t('hideTagsLabel')}</Label>
            </div>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-2 md:p-4">
          <button
            onClick={() => setIsPositionScaleExpanded(!isPositionScaleExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isPositionScaleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">{t('positionScale')}</h3>
          </button>
          <div className={`space-y-4 ${isPositionScaleExpanded ? '' : 'hidden'}`}>
            <div>
              <Label title={t('textX')}>{t('textX')}: {settings.textX}px</Label>
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
              <Label title={t('textY')}>{t('textY')}: {settings.textY}px</Label>
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
              <Label title={t('scaleX')}>{t('scaleX')}: {settings.scaleX}x</Label>
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
              <Label title={t('scaleY')}>{t('scaleY')}: {settings.scaleY}x</Label>
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

        <div className="space-y-4 border rounded-lg p-2 md:p-4">
          <button
            onClick={() => setIsEffectsExpanded(!isEffectsExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isEffectsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">{t('effects')}</h3>
          </button>
          <div className={`space-y-4 ${isEffectsExpanded ? '' : 'hidden'}`}>
            <div>
              <Label title={t('textShadowDescription')}>{t('textShadow')}</Label>
              <div className="space-y-4">
                <div>
                  <ColorInput
                    label={t('shadowColorLabel')}
                    title={t('shadowColorLabel')}
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
                  <Label title={t('offsetDescription')}>{t('offset')} ({textShadow.offsetX}px)</Label>
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
                  <Label title={t('blurDescription')}>{t('blur')} ({textShadow.blur}px)</Label>
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
              <Label title={t('textStrokeDescription')}>{t('textStroke')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <ColorInput
                    label={t('strokeColorLabel')}
                    title={t('strokeColorLabel')}
                    value={settings.textStrokeColor}
                    onChange={(value) => onSettingsChange({
                      ...settings,
                      textStrokeColor: value
                    })}
                  />
                </div>
                <div>
                  <Label title={t('strokeWidthLabel')}>{t('strokeWidthLabel')} ({settings.textStrokeWidth}px)</Label>
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
        <div className="space-y-4 border rounded-lg p-2 md:p-4">
          <button
            onClick={() => setIsBitmapFontExpanded(!isBitmapFontExpanded)}
            className="flex items-center w-full text-left"
          >
            <span className="mr-2">
              {isBitmapFontExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <h3 className="text-lg font-medium">{t('bitmapFont')}</h3>
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
              <Label title={t('Enable Bitmap Font')}>{t('Enable Bitmap Font')}</Label>
            </div>
            
            {fontImageLoadError && (
              <div className="text-red-500 text-sm">{fontImageLoadError}</div>
            )}
            
            {isFontImageLoading && (
              <div className="text-blue-500 text-sm">{t('loadingFontImage')}</div>
            )}
            
            <div>
              <Label htmlFor="Bitmap Font Image" title={t('Bitmap Font Image')}>{t('Bitmap Font Image')}</Label>
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
              <Label title={t('Character Sequence')}>{t('Character Sequence')}</Label>
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
            
            <div>
              <Label title={t('Tile Width')}>{t('Tile Width')} ({settings.bitmapFont.tileWidth}px)</Label>
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
              <Label title={t('Tile Height')}>{t('Tile Height')} ({settings.bitmapFont.tileHeight}px)</Label>
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
            
            <div>
              <Label title={t('Bitmap Offset X')}>{t('Bitmap Offset X')} ({settings.bitmapFont.offsetX}px)</Label>
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
              <Label title={t('Bitmap Offset Y')}>{t('Bitmap Offset Y')} ({settings.bitmapFont.offsetY}px)</Label>
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
            
            <div>
              <Label title={t('Separation X')}>{t('Separation X')} ({settings.bitmapFont.separationX}px)</Label>
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
                max={32}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label title={t('Separation Y')}>{t('Separation Y')} ({settings.bitmapFont.separationY}px)</Label>
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
                max={32}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label title={t('Baseline X')}>{t('Baseline X')} ({settings.bitmapFont.baselineX}px)</Label>
              <Slider
                value={[settings.bitmapFont.baselineX]}
                onValueChange={(value) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    baselineX: value[0]
                  }
                })}
                min={-32}
                max={32}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label title={t('Baseline Y')}>{t('Baseline Y')} ({settings.bitmapFont.baselineY}px)</Label>
              <Slider
                value={[settings.bitmapFont.baselineY]}
                onValueChange={(value) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    baselineY: value[0]
                  }
                })}
                min={-32}
                max={32}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label title={t('Spacing')}>{t('Spacing')} ({settings.bitmapFont.spacing}px)</Label>
              <Slider
                value={[settings.bitmapFont.spacing]}
                onValueChange={(value) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    spacing: value[0]
                  }
                })}
                min={-6}
                max={32}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label title={t('bitmapFontColorLabel')}>{t('bitmapFontColorLabel')}</Label>
              <ColorInput
                value={settings.bitmapFont.fontColor}
                onChange={(value) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    fontColor: value
                  }
                })}
              />
            </div>
            
            <div>
              <Label title={t('Zoom Factor')}>{t('Zoom Factor')} ({settings.bitmapFont.zoomFactor}x)</Label>
              <Slider
                value={[settings.bitmapFont.zoomFactor]}
                onValueChange={(value) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    zoomFactor: value[0]
                  }
                })}
                min={1}
                max={8}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div className="space-y-2">
              <Label title={t('Sample Text Preview')}>{t('Sample Text Preview')}</Label>
              <Input
                type="text"
                placeholder={t('typeSomeTextToPreview')}
                value={settings.bitmapFont.sampleText || ''}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  bitmapFont: {
                    ...settings.bitmapFont,
                    sampleText: e.target.value
                  }
                })}
                className="mt-1"
              />
              <div>
                <Label title={t('Background Color')}>{t('Background Color')}</Label>
                <ColorInput
                  value={settings.bitmapFont.backgroundColor || '#333333'}
                  onChange={(value) => onSettingsChange({
                    ...settings,
                    bitmapFont: {
                      ...settings.bitmapFont,
                      backgroundColor: value
                    }
                  })}
                />
              </div>
              <div 
                className="mt-2 p-4 rounded-lg min-h-[50px] flex items-center justify-center"
                style={{ backgroundColor: settings.bitmapFont.backgroundColor || '#333333' }}
              >
                {settings.bitmapFont.enabled && settings.bitmapFont.fontImage ? (
                  <BitmapFontRenderer
                    text={settings.bitmapFont.sampleText || 'Preview Text'}
                    settings={settings}
                  />
                ) : (
                  <span className="text-gray-500">{t('Enable Bitmap Font And Upload Image Preview')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4 border rounded-lg p-2 md:p-4" data-tutorial="dialog-separator-checkbox">
          <div className="flex items-center space-x-2 mb-2">
            <Input
              type="checkbox"
              checked={settings.useCustomBlockSeparator}
              onChange={(e) => onSettingsChange({ ...settings, useCustomBlockSeparator: e.target.checked })}
              className="w-4 h-4"
            />
            <Label>{t('useCustomDialogSeparator')}</Label>
          </div>
          {settings.useCustomBlockSeparator && (
            <div className="space-y-4" data-tutorial="dialog-separator">
              <Label>{t('dialogSeparators')}</Label>
              {settings.blockSeparators.map((separator, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={separator}
                    onChange={(e) => {
                      const newSeparators = [...settings.blockSeparators];
                      newSeparators[index] = e.target.value;
                      onSettingsChange({ ...settings, blockSeparators: newSeparators });
                    }}
                    placeholder={t('enterSeparatorPattern')}
                    className="flex-1"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const newSeparators = settings.blockSeparators.filter((_, i) => i !== index);
                      onSettingsChange({ ...settings, blockSeparators: newSeparators });
                    }}
                  >
                    {t('remove')}
                  </Button>
                </div>
              ))}
              <Button
                onClick={() => {
                  const newSeparators = [...settings.blockSeparators, "\\n\\s*\\n"];
                  onSettingsChange({ ...settings, blockSeparators: newSeparators });
                }}
                className="w-full"
              >
                {t('addSeparator')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
