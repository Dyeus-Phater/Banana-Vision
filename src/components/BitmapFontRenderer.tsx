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
    // Split text by newline characters
    const lines = text.split('\n');
    
    // Calculate line height based on tile height and zoom factor
    const lineHeight = bitmapFont.tileHeight * zoomFactor;
    const lineSpacing = (bitmapFont.lineSpacing || 2) * zoomFactor; // Default line spacing of 2px if not specified
    
    return (
      <div className="bitmap-font-container" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        color: color || settings.textColor,
        gap: `${lineSpacing}px`, // Add spacing between lines
        imageRendering: 'pixelated', // Apply pixel-perfect rendering to the container
        WebkitFontSmoothing: 'none', // Disable font smoothing in WebKit browsers
        MozOsxFontSmoothing: 'never', // Disable font smoothing in Firefox
        fontSmooth: 'never', // Disable font smoothing in other browsers
        position: 'relative' // Ensure proper positioning context
      }}>
        {lines.map((line, lineIndex) => (
          <div key={`line-${lineIndex}`} className="bitmap-font-line" style={{ 
            display: 'flex',
            position: 'relative',
            lineHeight: `${lineHeight}px`,
            imageRendering: 'pixelated'
          }}>
            {Array.from(line).map((char, idx) => {
              const charIndex = bitmapFont.characters.indexOf(char);
              if (charIndex === -1) return <span key={`${lineIndex}-${idx}`}>{char}</span>;
              
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
              // Ensure all dimensions are properly scaled with the zoom factor
              const scaledWidth = bitmapFont.tileWidth * zoomFactor;
              const scaledHeight = bitmapFont.tileHeight * zoomFactor;
              const scaledSpacing = bitmapFont.spacing * zoomFactor;
              const scaledBaselineX = bitmapFont.baselineX * zoomFactor;
              const scaledBaselineY = bitmapFont.baselineY * zoomFactor;
              
              // Calculate the exact background size to ensure proper scaling
              const bgWidth = fontImageElement.width * zoomFactor;
              const bgHeight = fontImageElement.height * zoomFactor;
              
              // Calculate the exact background position to ensure proper alignment
              const bgPosX = left * zoomFactor;
              const bgPosY = top * zoomFactor;
              
              return (
                <div 
                  key={`${lineIndex}-${idx}`} 
                  style={{
                    display: 'inline-block',
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    backgroundImage: `url(${bitmapFont.fontImage})`,
                    backgroundPosition: `-${bgPosX}px -${bgPosY}px`,
                    backgroundSize: `${bgWidth}px ${bgHeight}px`,
                    marginRight: `${scaledSpacing}px`,
                    transform: `translate(${scaledBaselineX}px, ${scaledBaselineY}px)`,
                    transformOrigin: 'top left',
                    imageRendering: 'pixelated',
                    filter: `${fontColorFilter}`,
                    transition: 'width 0.2s, height 0.2s, background-size 0.2s, background-position 0.2s, transform 0.2s, margin-right 0.2s',
                    overflow: 'visible', // Ensure characters aren't cut off
                    boxSizing: 'content-box', // Ensure dimensions don't include padding/border
                    WebkitFontSmoothing: 'none', // Disable font smoothing in WebKit browsers
                    MozOsxFontSmoothing: 'never', // Disable font smoothing in Firefox
                    fontSmooth: 'never' // Disable font smoothing in other browsers
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };
  
  return renderCharacters();
};

export default BitmapFontRenderer;