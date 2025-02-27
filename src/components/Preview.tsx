import React, { useRef, useEffect, useState } from 'react';
import { TextBlock, PreviewSettings } from '@/types/preview';
import TextProcessor from './TextProcessor';
import { AlertCircle } from 'lucide-react';
import { toast } from "sonner";

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
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [overflowInfo, setOverflowInfo] = useState<OverflowInfo | null>(null);
  const [lastOverflowText, setLastOverflowText] = useState<string>('');
  const measureRef = useRef<HTMLDivElement>(null);

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

      const measureText = (text: string): number => {
        measureContainer.textContent = text;
        return measureContainer.getBoundingClientRect().width;
      };

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
  }, [block?.content, settings.textWrapWidth, settings.fontSize, settings.textX, settings.scaleX, settings.hideTags, onOverflowChange, lastOverflowText]);

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
      <div className="relative bg-white rounded-lg overflow-hidden mb-4"
           style={{
             width: imageSize.width || '100%',
             height: imageSize.height || 'auto',
             maxWidth: '100%',
             display: 'flex',
             alignItems: verticalAlignStyles[settings.verticalAlign],
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
            textShadow: getTextShadowWithStroke()
          }}
        >
          {block && <TextProcessor text={block.content} settings={settings} />}
        </div>
        {isOverflowing && overflowInfo && (
          <div className="absolute top-2 right-2 text-red-500 flex items-center gap-2">
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              Overflow: {Math.round((overflowInfo.width / settings.textWrapWidth - 1) * 100)}%
            </span>
            <AlertCircle className="h-6 w-6" />
          </div>
        )}
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
