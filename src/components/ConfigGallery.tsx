
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreviewSettings } from '@/types/preview';
import default1 from '../data/gallery-configs/default1.json';
import default2 from '../data/gallery-configs/default2.json';
import nine_text_box_style from '../data/gallery-configs/nine_text_box_style.json';
import fragile_box from '../data/gallery-configs/fragile_box.json';
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

const presets: ConfigPreset[] = [
  default1 as ConfigPreset,
  default2 as ConfigPreset,
  nine_text_box_style as ConfigPreset,
  fragile_box as ConfigPreset,
];

const ConfigGallery: React.FC<ConfigGalleryProps> = ({ onSelectConfig, settings, onSettingsChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxVisiblePresets = 3;
  const hasNextPresets = currentIndex + maxVisiblePresets < presets.length;
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
              {presets.map((preset, index) => (
                <div 
                  key={index} 
                  className="flex-none w-1/3 px-2"
                >
                  <Card className="p-3 flex flex-col gap-2 h-full">
                    {preset.thumbnail && (
                      <div className="relative aspect-video overflow-hidden rounded-md">
                        <img
                          src={preset.thumbnail}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
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
