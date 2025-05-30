
import React from 'react';
import { PreviewSettings } from '@/types/preview';
import BitmapFontRenderer from './BitmapFontRenderer';

interface TextProcessorProps {
  text: string;
  settings: PreviewSettings;
}

export const processText = (text: string, settings: PreviewSettings): React.ReactNode => {
  if (!text) return "";
  
  let processedText = text;

  // Apply replacement tags first
  settings.replacementTags.forEach(tag => {
    const regex = new RegExp(tag.pattern, "g");
    processedText = processedText.replace(regex, tag.replacement);
  });

  // Filter out lines that would be empty after tag removal if hideTags is enabled
  if (settings.hideTags) {
    processedText = processedText
      .split('\n')
      .filter(line => {
        let cleanLine = line;
        settings.tagPatterns.forEach(pattern => {
          cleanLine = cleanLine.replace(new RegExp(pattern, 'g'), '');
        });
        return cleanLine.trim() !== '';
      })
      .join('\n');
  }
  
  // Store color tag matches
  const colorMatches: { pattern: string; color: string; start: number; end: number; content?: string; type: 'enclosed' | 'free' }[] = [];
  
  settings.colorTags.forEach(tag => {
    if (tag.type === 'enclosed' && tag.openTag && tag.closeTag) {
      let currentPos = 0;
      
      while (currentPos < processedText.length) {
        const startTag = processedText.indexOf(tag.openTag, currentPos);
        if (startTag === -1) break;
        
        const endTag = processedText.indexOf(tag.closeTag, startTag + tag.openTag.length);
        if (endTag === -1) break;

        const textBetweenTags = processedText.substring(startTag, endTag + tag.closeTag.length);
        if (!textBetweenTags.includes('\n')) {
          colorMatches.push({
            pattern: textBetweenTags,
            color: tag.color,
            start: startTag,
            end: endTag + tag.closeTag.length,
            content: processedText.substring(startTag + tag.openTag.length, endTag),
            type: 'enclosed'
          });
        }
        
        currentPos = endTag + tag.closeTag.length;
      }
    } else if (tag.type === 'free') {
      const regex = new RegExp(tag.pattern, 'g');
      let match;
      while ((match = regex.exec(processedText)) !== null) {
        colorMatches.push({
          pattern: match[0],
          color: tag.color,
          start: match.index,
          end: match.index + match[0].length,
          type: 'free'
        });
      }
    }
  });

  // Remove tags if hideTags is enabled
  if (settings.hideTags) {
    // Remove regular tags
    settings.tagPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, "g");
      processedText = processedText.replace(regex, "");
    });
    
    // Also remove block separators if custom block separators are enabled
    if (settings.useCustomBlockSeparator && settings.blockSeparators.length > 0) {
      settings.blockSeparators.forEach(separator => {
        // Escape special characters in the separator string
        const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSeparator, "g");
        processedText = processedText.replace(regex, "");
      });
    }
  }

  // Apply color segments
  const segments: { text: string; color?: string }[] = [];
  let currentIndex = 0;

  colorMatches.sort((a, b) => a.start - b.start);

  colorMatches.forEach(match => {
    if (currentIndex < match.start) {
      segments.push({ text: processedText.slice(currentIndex, match.start) });
    }
    if (match.type === 'enclosed') {
      segments.push({ text: match.content || '', color: match.color });
    } else {
      segments.push({
        text: processedText.slice(match.start, match.end),
        color: match.color
      });
    }
    currentIndex = match.end;
  });

  if (currentIndex < processedText.length) {
    segments.push({ text: processedText.slice(currentIndex) });
  }

  if (segments.length === 0) {
    segments.push({ text: processedText });
  }

  return segments.map((segment, index) => {
    if (settings.bitmapFont.enabled && settings.bitmapFont.fontImage) {
      return (
        <BitmapFontRenderer 
          key={index} 
          text={segment.text} 
          settings={settings} 
          color={segment.color} 
        />
      );
    }
    
    return (
      <span key={index} style={{ color: segment.color || settings.textColor }}>
        {segment.text}
      </span>
    );
  });
};

const TextProcessor: React.FC<TextProcessorProps> = ({ text, settings }) => {
  return <>{processText(text, settings)}</>;
};

export default TextProcessor;
