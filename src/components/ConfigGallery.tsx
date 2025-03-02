
import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreviewSettings } from '@/types/preview';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ConfigPreset {
  name: string;
  description: string;
  thumbnail: string;
  settings: PreviewSettings;
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
  const maxVisiblePresets = 3;
  const hasNextPresets = currentIndex + maxVisiblePresets < presets.length;
  const hasPrevPresets = currentIndex > 0;

  const getRandomPlaceholderImage = () => {
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEEAD', 'D4A5A5', 'A8E6CF', 'FFD3B6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return `https://via.placeholder.com/400x225/${randomColor}/FFFFFF`;
  };

  const presetsWithThumbnails = useMemo(() => {
    return presets.map(preset => ({
      ...preset,
      thumbnail: preset.thumbnail || getRandomPlaceholderImage()
    }));
  }, []);

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
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Style Presets</h2>
        <Button 
          variant="outline" 
          onClick={() => onSettingsChange({ ...settings, isPresetsMinimized: !settings.isPresetsMinimized })}
          className="text-sm"
        >
          {settings.isPresetsMinimized ? "Expand" : "Minimize"}
        </Button>
      </div>

      <div className={`transition-all duration-300 ${settings.isPresetsMinimized ? 'hidden' : ''}`}>
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-in-out" 
              style={{ transform: `translateX(-${currentIndex * (100 / maxVisiblePresets)}%)` }}
            >
              {presetsWithThumbnails.map((preset, index) => (
                <div 
                  key={index} 
                  className="flex-none w-1/3 px-2"
                >
                  <Card className="p-3 flex flex-col gap-2 h-full">
                    <div className="relative aspect-video overflow-hidden rounded-md">
                      <img
                        src={preset.thumbnail}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-sm">{preset.name}</h3>
                    <p className="text-xs text-gray-500">{preset.description}</p>
                    <Button 
                      onClick={() => onSelectConfig(preset.settings)}
                      className="mt-auto text-sm"
                      size="sm"
                    >
                      Use This Style
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
    </Card>
  );
};

export default ConfigGallery;
