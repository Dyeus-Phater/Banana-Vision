import React, { useEffect, useState } from 'react';
import { PreviewSettings } from '@/types/preview';

interface BitmapFontRendererProps {
  text: string;
  settings: PreviewSettings;
  color?: string;
}

const BitmapFontRenderer: React.FC<BitmapFontRendererProps> = ({ text, settings, color }) => {
  const { bitmapFont } = settings;
  const [fontImageElement, setFontImageElement] = useState<HTMLImageElement | null>(null);
  
  useEffect(() => {
    if (bitmapFont.fontImage) {
      const img = new Image();
      img.src = bitmapFont.fontImage;
      img.onload = () => setFontImageElement(img);
    }
  }, [bitmapFont.fontImage]);
  
  if (!fontImageElement || !text) return null;
  
  // Calculate zoom factor (default to 1 if not set)
  const zoomFactor = bitmapFont.zoomFactor || 1;
  
  const renderCharacters = () => {
    return (
      <div className="bitmap-font-container" style={{ display: 'inline-flex', color: color || settings.textColor }}>
        {Array.from(text).map((char, index) => {
          const charIndex = bitmapFont.characters.indexOf(char);
          if (charIndex === -1) return <span key={index}>{char}</span>;
          
          // Calculate position in the sprite sheet
          const charsPerRow = Math.floor((fontImageElement.width - bitmapFont.offsetX) / 
            (bitmapFont.tileWidth + bitmapFont.separationX));
          const row = Math.floor(charIndex / charsPerRow);
          const col = charIndex % charsPerRow;
          
          const left = bitmapFont.offsetX + col * (bitmapFont.tileWidth + bitmapFont.separationX);
          const top = bitmapFont.offsetY + row * (bitmapFont.tileHeight + bitmapFont.separationY);
          
          // Create CSS filter for font color
          let fontColorFilter = 'none';
          
          // Apply font color if specified
          if (bitmapFont.fontColor && bitmapFont.fontColor !== '#FFFFFF') {
            const fontRgbColor = (() => {
              const hex = bitmapFont.fontColor.charAt(0) === '#' ? bitmapFont.fontColor.substring(1) : bitmapFont.fontColor;
              const r = parseInt(hex.substring(0, 2), 16) / 255;
              const g = parseInt(hex.substring(2, 4), 16) / 255;
              const b = parseInt(hex.substring(4, 6), 16) / 255;
              return { r, g, b };
            })();
            
            // Create a color matrix that applies the font color
            const svgFilter = `
              <svg xmlns="http://www.w3.org/2000/svg">
                <filter id="fontColor">
                  <feColorMatrix type="matrix" values="
                    0 0 0 0 ${fontRgbColor.r}
                    0 0 0 0 ${fontRgbColor.g}
                    0 0 0 0 ${fontRgbColor.b}
                    0 0 0 1 0
                  "/>
                </filter>
              </svg>
            `.trim();
            fontColorFilter = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgFilter)}#fontColor")`;
          }
          
          // Apply zoom factor to width, height and spacing
          const scaledWidth = bitmapFont.tileWidth * zoomFactor;
          const scaledHeight = bitmapFont.tileHeight * zoomFactor;
          const scaledSpacing = bitmapFont.spacing * zoomFactor;
          const scaledBaselineX = bitmapFont.baselineX * zoomFactor;
          const scaledBaselineY = bitmapFont.baselineY * zoomFactor;
          
          return (
            <div 
              key={index} 
              style={{
                display: 'inline-block',
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                backgroundImage: `url(${bitmapFont.fontImage})`,
                backgroundPosition: `-${left * zoomFactor}px -${top * zoomFactor}px`,
                backgroundSize: `${fontImageElement.width * zoomFactor}px ${fontImageElement.height * zoomFactor}px`,
                marginRight: `${scaledSpacing}px`,
                transform: `translate(${scaledBaselineX}px, ${scaledBaselineY}px)`,
                transformOrigin: 'top left',
                imageRendering: 'pixelated',
                filter: `${fontColorFilter}`,
                transition: 'width 0.2s, height 0.2s, transform 0.2s' // Smooth transitions between zoom levels
              }}
            />
          );
        })}
      </div>
    );
  };
  
  return renderCharacters();
};

export default BitmapFontRenderer;