import React, { useRef, useEffect, useState } from 'react';
import { TextBlock, PreviewSettings } from '@/types/preview';
import TextProcessor from './TextProcessor';
import { AlertCircle, Download } from 'lucide-react';
import { toast } from "sonner";
import html2canvas from 'html2canvas';

interface PreviewProps {
  block: TextBlock | null;
  settings: PreviewSettings;
  backgroundImage: string;
  imageSize: { width: number; height: number };
  onOverflowChange?: (isOverflowing: boolean, overflowInfo?: { text: string; width: number }) => void;
}

interface OverflowInfo {
  text: string;
  width: number;
}

const Preview: React.FC<PreviewProps> = ({ 
  block, 
  settings, 
  backgroundImage, 
  imageSize,
  onOverflowChange 
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [overflowInfo, setOverflowInfo] = useState<OverflowInfo | null>(null);
  const [lastOverflowText, setLastOverflowText] = useState<string>('');
  const measureRef = useRef<HTMLDivElement>(null);

  const handleSaveImage = async () => {
    if (!previewRef.current) return;
    try {
      // Apply specific settings to ensure the exported image matches what's displayed
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: null,
        width: imageSize.width,
        height: imageSize.height,
        scale: 1, // Use scale 1 to maintain exact dimensions
        logging: false,
        useCORS: true,
        allowTaint: true,
        // Ensure all transforms are properly captured
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-preview-container]');
          if (clonedElement) {
            // Set exact dimensions on the cloned element
            (clonedElement as HTMLElement).style.width = `${imageSize.width}px`;
            (clonedElement as HTMLElement).style.height = `${imageSize.height}px`;
            
            // Make sure all computed styles are properly applied to the clone
            const styles = window.getComputedStyle(previewRef.current!);
            Object.values(styles).forEach(key => {
              try {
                // @ts-ignore
                clonedElement.style[key] = styles.getPropertyValue(key);
              } catch (e) {}
            });
          }
          
          // Ensure text element styles are preserved
          const originalTextElement = textRef.current;
          const clonedTextElement = clonedDoc.querySelector('[data-text-container]');
          
          if (originalTextElement && clonedTextElement) {
            const textStyles = window.getComputedStyle(originalTextElement);
            // Explicitly copy transform to ensure position is preserved
            clonedTextElement.setAttribute('style', originalTextElement.getAttribute('style') || '');
            
            // Double-check the transform is applied correctly
            const transform = `translate(${settings.textX}px, ${settings.textY}px) scale(${settings.scaleX}, ${settings.scaleY})`;
            (clonedTextElement as HTMLElement).style.transform = transform;
          }
        }
      });
      
      // Create a new canvas with exact dimensions
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = imageSize.width;
      finalCanvas.height = imageSize.height;
      const ctx = finalCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, imageSize.width, imageSize.height);
      }
      const dataUrl = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `preview-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast('Preview saved as PNG');
    } catch (error) {
      toast('Failed to save preview');
      console.error('Error saving preview:', error);
    }
  };

  const removeTags = (text: string): string => {
    let cleanText = text;
    settings.tagPatterns.forEach(pattern => {
      cleanText = cleanText.replace(new RegExp(pattern, 'g'), '');
    });
    return cleanText;
  };

  useEffect(() => {
    if (textRef.current && block && measureRef.current) {
      const container = textRef.current;
      const measureContainer = measureRef.current;
      const maxWidth = settings.textWrapWidth;
      const { bitmapFont } = settings;
      const isBitmapFontActive = bitmapFont.enabled && bitmapFont.fontImage;

      // Função para medir texto com fonte bitmap
      const measureBitmapText = (text: string): number => {
        // Calcula a largura total baseada nas configurações da fonte bitmap
        const zoomFactor = bitmapFont.zoomFactor || 1;
        const charWidth = bitmapFont.tileWidth * zoomFactor;
        const charSpacing = bitmapFont.spacing * zoomFactor;
        
        // Calcula a largura total somando a largura de cada caractere
        let totalWidth = 0;
        for (let i = 0; i < text.length; i++) {
          // Verifica se o caractere existe na fonte bitmap
          if (bitmapFont.characters.includes(text[i])) {
            totalWidth += charWidth + charSpacing;
          } else {
            // Para caracteres não encontrados, usa uma largura padrão
            totalWidth += charWidth;
          }
        }
        
        // Subtrai o espaçamento extra do último caractere
        if (text.length > 0) {
          totalWidth -= charSpacing;
        }
        
        return totalWidth;
      };

      // Função para medir texto com fonte normal
      const measureNormalText = (text: string): number => {
        measureContainer.textContent = text;
        return measureContainer.getBoundingClientRect().width;
      };

      // Escolhe a função de medição apropriada
      const measureText = isBitmapFontActive ? measureBitmapText : measureNormalText;

      const strings = block.content.split('\n').map(str => removeTags(str));
      let hasOverflow = false;
      let overflowingText = '';
      let overflowWidth = 0;

      for (const string of strings) {
        const stringWidth = measureText(string);
        
        if (stringWidth > maxWidth) {
          hasOverflow = true;
          overflowingText = string;
          overflowWidth = stringWidth;
          break;
        }
      }

      setIsOverflowing(hasOverflow);
      if (hasOverflow && overflowingText !== lastOverflowText) {
        setOverflowInfo({ text: overflowingText, width: overflowWidth });
        onOverflowChange?.(true, { text: overflowingText, width: overflowWidth });
        setLastOverflowText(overflowingText);
      } else if (!hasOverflow) {
        setOverflowInfo(null);
        onOverflowChange?.(false);
        setLastOverflowText('');
      }
    }
  }, [block?.content, settings.textWrapWidth, settings.fontSize, settings.textX, settings.scaleX, settings.hideTags, settings.bitmapFont, onOverflowChange, lastOverflowText]);

  const textShadow = settings.textShadow || {
    offsetX: 2,
    offsetY: 2,
    blur: 2,
    color: "#000000"
  };

  const textShadowStyle = textShadow.offsetX === 0 ? 'none' : 
    `${textShadow.offsetX}px ${textShadow.offsetY}px ${textShadow.blur}px ${textShadow.color}`;

  const verticalAlignStyles = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end"
  };

  const getTextStrokeStyle = () => {
    if (settings.textStrokeWidth === 0) return 'none';
    
    const strokeWidth = Math.abs(settings.textStrokeWidth);
    const direction = settings.textStrokeWidth < 0 ? -1 : 1;
    return `${direction * strokeWidth}px ${settings.textStrokeColor}`;
  };

  const getTextShadowWithStroke = () => {
    if (settings.textStrokeWidth === 0) return textShadowStyle;

    const strokeWidth = Math.abs(settings.textStrokeWidth);
    const strokeColor = settings.textStrokeColor;
    const baseShadow = textShadowStyle === 'none' ? '' : `${textShadowStyle}, `;
    
    return `${baseShadow}
      ${-strokeWidth}px ${-strokeWidth}px 0 ${strokeColor},
      ${strokeWidth}px ${-strokeWidth}px 0 ${strokeColor},
      ${-strokeWidth}px ${strokeWidth}px 0 ${strokeColor},
      ${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`;
  };

  return (
    <>
      <div className="relative bg-white rounded-lg mb-4"
           ref={previewRef}
           data-preview-container // Added for html2canvas
           style={{
             width: imageSize.width ? `${imageSize.width}px` : '100%', // Use fixed width if available
             height: imageSize.height ? `${imageSize.height}px` : 'auto', // Use fixed height if available
             aspectRatio: imageSize.width && imageSize.height ? `${imageSize.width} / ${imageSize.height}` : undefined, // Maintain aspect ratio
             maxWidth: '100%', // Ensure it doesn't overflow parent
             display: 'flex',
             alignItems: verticalAlignStyles[settings.verticalAlign],
             overflow: 'hidden', // Prevent content from expanding the container
           }}>
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Text box background"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        <div
          ref={textRef}
          data-text-container
          className="relative whitespace-pre-wrap w-full"
          style={{
            fontFamily: settings.fontFamily,
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            letterSpacing: `${settings.letterSpacing}px`,
            transform: `translate(${settings.textX}px, ${settings.textY}px) scale(${settings.scaleX}, ${settings.scaleY})`,
            transformOrigin: "0 0",
            padding: "4px",
            color: settings.textColor,
            textAlign: settings.textAlign,
            maxWidth: `${settings.textWrapWidth}px`,
            margin: '0 auto',
            fontWeight: settings.isBold ? 'bold' : 'normal',
            WebkitTextStroke: getTextStrokeStyle(),
            textShadow: getTextShadowWithStroke(),
            overflow: 'hidden' // Prevent text from expanding beyond container
          }}
        >
          {block && <TextProcessor text={block.content} settings={settings} />}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            onClick={handleSaveImage}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Save as PNG"
          >
            <Download className="h-4 w-4 text-gray-600" />
          </button>
          {isOverflowing && overflowInfo && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
              Overflow: {Math.round((overflowInfo.width / settings.textWrapWidth - 1) * 100)}%
              <AlertCircle className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 0,
          width: 'auto',
          whiteSpace: 'nowrap',
          fontFamily: settings.fontFamily,
          fontSize: `${settings.fontSize}px`,
          letterSpacing: `${settings.letterSpacing}px`,
          fontWeight: settings.isBold ? 'bold' : 'normal'
        }}
      />
    </>
  );
};

export default Preview;
