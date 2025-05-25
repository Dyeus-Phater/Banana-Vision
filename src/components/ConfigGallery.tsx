
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreviewSettings } from '@/types/preview';
import { ChevronLeft, ChevronRight, Plus, Save, User } from 'lucide-react';

interface ConfigPreset {
  name: string;
  description: string;
  thumbnail: string;
  settings: PreviewSettings;
  isUserProfile?: boolean;
  createdAt?: string;
}

interface SavedProfile {
  name: string;
  settings: PreviewSettings;
  createdAt: string;
}

interface ConfigGalleryProps {
  onSelectConfig: (settings: PreviewSettings) => void;
  settings: PreviewSettings;
  onSettingsChange: (settings: PreviewSettings) => void;
}

// Import all preset files
const presetModules = import.meta.glob('../data/gallery-configs/*.json', { eager: true });
const presets: ConfigPreset[] = Object.values(presetModules).map(module => (module as any).default);

const ConfigGallery: React.FC<ConfigGalleryProps> = ({ onSelectConfig, settings, onSettingsChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  
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
      return;
    }
    
    const newProfile: SavedProfile = {
      name: profileName,
      settings: { 
        ...settings,
        backgroundImage: settings.backgroundImage,
        bitmapFont: { 
          ...settings.bitmapFont,
          fontImage: settings.bitmapFont.fontImage
        }
      },
      createdAt: new Date().toISOString()
    };
    
    const updatedProfiles = savedProfiles.map(p => p.name === profileName ? newProfile : p);
    if (!updatedProfiles.find(p => p.name === profileName)) {
      updatedProfiles.push(newProfile);
    }
    
    localStorage.setItem('banana-vision-profiles', JSON.stringify(updatedProfiles));
    setSavedProfiles(updatedProfiles);
    setProfileName('');
    setShowSaveForm(false);
  };
  
  const loadProfile = (profile: SavedProfile) => {
    onSelectConfig(profile.settings);
  };
  
  const deleteProfile = (profileName: string) => {
    const updatedProfiles = savedProfiles.filter(p => p.name !== profileName);
    localStorage.setItem('banana-vision-profiles', JSON.stringify(updatedProfiles));
    setSavedProfiles(updatedProfiles);
  };

  const getRandomPlaceholderImage = (isUserProfile: boolean = false) => {
    if (isUserProfile) {
      return '/Banana.png';
    }
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEEAD', 'D4A5A5', 'A8E6CF', 'FFD3B6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return `https://via.placeholder.com/400x225/${randomColor}/FFFFFF`;
  };

  // Combinar presets do sistema com perfis salvos pelo usuário
  const allPresets = useMemo(() => {
    // Converter perfis salvos para o formato de preset
    const userPresets = savedProfiles.map(profile => ({
      name: profile.name,
      description: `User profile created on ${new Date(profile.createdAt).toLocaleDateString()}`,
      thumbnail: profile.settings.previewImage || getRandomPlaceholderImage(true),
      settings: profile.settings,
      isUserProfile: true,
      createdAt: profile.createdAt
    }));
    
    // Adicionar presets do sistema com thumbnail padrão se necessário
    const systemPresets = presets.map(preset => ({
      ...preset,
      thumbnail: preset.thumbnail === '/Banana.png' ? '/Banana.png' : (preset.thumbnail || getRandomPlaceholderImage(false)),
      isUserProfile: false,
      createdAt: new Date().toISOString()
    }));
    
    // Combinar ambos, colocando perfis do usuário primeiro
    return [...userPresets, ...systemPresets];
  }, [savedProfiles, presets]);

  const maxVisiblePresets = 3;
  const hasNextPresets = currentIndex + maxVisiblePresets < allPresets.length;
  const hasPrevPresets = currentIndex > 0;

  const handleNext = () => {
    if (hasNextPresets) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (hasPrevPresets) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <Card className="p-4 space-y-6">
      {/* Seção de Style Presets */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Style Presets</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Save Profile
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onSettingsChange({ ...settings, isPresetsMinimized: !settings.isPresetsMinimized })}
              className="text-sm"
            >
              {settings.isPresetsMinimized ? "Expand" : "Minimize"}
            </Button>
          </div>
        </div>

        {/* Formulário para salvar perfil */}
        {showSaveForm && (
          <div className="mb-4 p-3 border rounded-md bg-muted/20">
            <div className="flex gap-2">
              <Input
                placeholder="Profile name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={saveProfile}>Save</Button>
              <Button variant="outline" onClick={() => {
                setShowSaveForm(false);
                setProfileName('');
              }}>Cancel</Button>
            </div>
          </div>
        )}

        <div className={`transition-all duration-300 ${settings.isPresetsMinimized ? 'hidden' : ''}`}>
          <div className="relative">
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out" 
                style={{ transform: `translateX(-${currentIndex * (100 / maxVisiblePresets)}%)` }}
              >
                {allPresets.map((preset, index) => (
                  <div 
                    key={index} 
                    className="flex-none w-1/3 px-2"
                  >
                    <Card className={`p-3 flex flex-col gap-2 h-full ${preset.isUserProfile ? 'border-primary/50' : ''}`}>
                      <div className="relative aspect-video overflow-hidden rounded-md">
                        {preset.isUserProfile && (
                          <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-1 rounded-bl-md z-10">
                            <User className="w-3 h-3" />
                          </div>
                        )}
                        <img
                          src={preset.thumbnail}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-sm">{preset.name}</h3>
                        {preset.isUserProfile && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProfile(preset.name);
                            }}
                          >
                            <span className="sr-only">Excluir</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{preset.description}</p>
                      <Button 
                        onClick={() => preset.isUserProfile ? loadProfile({
                          name: preset.name,
                          settings: preset.settings,
                          createdAt: preset.createdAt
                        }) : onSelectConfig(preset.settings)}
                        className="mt-auto text-sm"
                        size="sm"
                      >
                        Select Profile
                      </Button>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {hasPrevPresets && (
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-background shadow-md z-10"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {hasNextPresets && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full bg-background shadow-md z-10"
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ConfigGallery;
