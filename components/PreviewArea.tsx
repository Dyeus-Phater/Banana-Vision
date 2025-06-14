

import React, { CSSProperties, forwardRef, useLayoutEffect, useRef, useEffect, useState } from 'react';
import { AppSettings, NestedAppSettingsObjectKeys, ThemeKey, CustomColorTag, ImageTag } from '../types';

// For global bitmap cache type, if needed here or imported
type BitmapCharCache = Map<string, { canvas: HTMLCanvasElement | null; dataURL?: string }>;

export interface PreviewAreaProps {
  baseSettings: AppSettings;
  textOverride?: string;
  simplifiedRender?: boolean;
  setIsOverflowing: (isOverflowing: boolean) => void;
  onNestedSettingsChange: <
    ParentK extends NestedAppSettingsObjectKeys,
    ChildK extends keyof AppSettings[ParentK],
    V extends AppSettings[ParentK][ChildK]
  >(
    parentKey: ParentK,
    childKey: ChildK,
    value: V
  ) => void;
  showPixelMarginGuides: boolean; 
  isReadOnlyPreview?: boolean;
  activeThemeKey: ThemeKey; 
  bitmapCharCache: BitmapCharCache | null; // Added prop for shared cache
  bitmapCacheId: number; // Added prop for cache refresh
}

interface ColorSegment {
  text: string;
  color: string | null; 
}

interface FinalTextSegment {
  type: 'text';
  text: string;
  color: string | null; 
}

interface FinalImageSegment {
  type: 'image';
  imageUrl: string;
  width: number;
  height: number;
  altText: string; 
}

type FinalDisplaySegment = FinalTextSegment | FinalImageSegment;


const parseTextWithCustomColorTags = (
  rawText: string, // This text should ALREADY have general tags hidden if applicable
  customColorTags: CustomColorTag[],
  defaultColor: string | null = null
): ColorSegment[] => {
  if (!customColorTags || customColorTags.length === 0) {
    return [{ text: rawText, color: defaultColor }];
  }

  const enabledTags = customColorTags.filter(tag => tag.enabled && tag.openingTag && tag.closingTag);
  if (enabledTags.length === 0) {
    return [{ text: rawText, color: defaultColor }];
  }
  
  // Sort by combined length of opening and closing tags to handle nesting: longer tags first.
  // This helps prevent a shorter tag from prematurely matching part of a longer tag.
  const sortedTags = [...enabledTags].sort((a,b) => 
    (b.openingTag.length + b.closingTag.length) - (a.openingTag.length + a.closingTag.length)
  );

  const tagParts: string[] = [];
  sortedTags.forEach(tag => {
    // Escape regex special characters in tags
    tagParts.push(tag.openingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    tagParts.push(tag.closingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  });
  
  if (tagParts.length === 0) return [{ text: rawText, color: defaultColor }];

  const regex = new RegExp(`(${tagParts.join('|')})`, 'g');
  const splitText = rawText.split(regex);

  const segments: ColorSegment[] = [];
  const colorStack: Array<{ tagId: string; color: string; openingTag: string; closingTag: string }> = [];
  let currentTextSegment = "";

  for (const part of splitText) {
    if (!part) continue; // Skip empty strings from split
    let isTag = false;
    for (const tag of sortedTags) { // Check against sorted tags
      if (part === tag.openingTag) {
        if (currentTextSegment) { // Push preceding text
          segments.push({ text: currentTextSegment, color: colorStack.length > 0 ? colorStack[colorStack.length - 1].color : defaultColor });
          currentTextSegment = "";
        }
        colorStack.push({ tagId: tag.id, color: tag.color, openingTag: tag.openingTag, closingTag: tag.closingTag });
        isTag = true;
        break;
      } else if (part === tag.closingTag) {
        if (currentTextSegment) { // Push preceding text
          segments.push({ text: currentTextSegment, color: colorStack.length > 0 ? colorStack[colorStack.length - 1].color : defaultColor });
          currentTextSegment = "";
        }
        // Pop only if the closing tag matches the top of the stack
        if (colorStack.length > 0 && colorStack[colorStack.length - 1].closingTag === part) {
          colorStack.pop();
        } else {
          // This case means a closing tag was found without a matching opening tag on stack (or wrong order)
          // Treat it as literal text instead of a valid closing tag for current context
           currentTextSegment += part;
        }
        isTag = true;
        break;
      }
    }
    if (!isTag) {
      currentTextSegment += part;
    }
  }
  if (currentTextSegment) { // Push any remaining text
    segments.push({ text: currentTextSegment, color: colorStack.length > 0 ? colorStack[colorStack.length - 1].color : defaultColor });
  }
  return segments.filter(s => s.text.length > 0); // Filter out segments that became empty
};

const hideGeneralTagsFromText = (
  text: string,
  hideTags: boolean, // This is settings.hideTagsInPreview
  tagPatterns: string[], 
  blockSeparatorsToHide: string[],
  useCustomBlockSeparator: boolean
): string => {
  if (!hideTags) return text; // Only proceed if hideTagsInPreview is true
  
  let processedText = text;

  // Hide general tag patterns
  if (tagPatterns.length > 0) {
    tagPatterns.forEach(patternStr => {
      const trimmedPattern = patternStr.trim();
      if (trimmedPattern.length === 0) return;
      try {
        const regex = new RegExp(trimmedPattern, 'g');
        processedText = processedText.replace(regex, '');
      } catch (error) {
         console.warn(`Invalid RegEx pattern for general tag hiding: ${trimmedPattern}`, error);
      }
    });
  }

  // Hide block separators if custom ones are used and hideTags is on
  if (useCustomBlockSeparator && blockSeparatorsToHide && blockSeparatorsToHide.length > 0) {
    blockSeparatorsToHide.forEach(separator => {
      if (separator.trim().length > 0) {
        try {
          const escapedSeparator = separator.replace(/[-\/\\^$*+?.()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedSeparator, 'g');
          processedText = processedText.replace(regex, '');
        } catch (error) {
          console.warn(`Invalid RegEx pattern for block separator hiding: ${separator}`, error);
        }
      }
    });
  }
  return processedText;
};

const generateDisplaySegments = (
  rawText: string,
  settings: AppSettings,
  simplifiedRender: boolean
): FinalDisplaySegment[] => {
  const finalSegments: FinalDisplaySegment[] = [];
  
  let currentWorkingText = rawText;

  // 1. Apply Custom Line Breaks
  if (settings.useCustomLineBreakTags && settings.customLineBreakTags.length > 0) {
    settings.customLineBreakTags.forEach(tag => {
      if (tag.trim()) { // Ensure tag is not just whitespace
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape for RegExp
        try {
            currentWorkingText = currentWorkingText.replace(new RegExp(escapedTag, 'g'), '\n');
        } catch (e) {
            console.warn(`Error applying custom line break tag "${tag}":`, e);
        }
      }
    });
  }

  // 2. Apply General Tag Hiding (if enabled)
  // This function internally checks settings.hideTagsInPreview but we pass it for clarity.
  // It also hides block separators if settings.hideTagsInPreview and settings.useCustomBlockSeparator are true.
  let textAfterGeneralHiding = currentWorkingText;
  if (settings.hideTagsInPreview) {
     textAfterGeneralHiding = hideGeneralTagsFromText(
        currentWorkingText,
        settings.hideTagsInPreview,
        settings.tagPatternsToHide,
        settings.blockSeparators,
        settings.useCustomBlockSeparator
    );
  }


  // 3. Image Tag and Color Tag Processing
  const enabledImageTags = settings.imageTags.filter(it => it.enabled && it.tag);

  if (simplifiedRender || enabledImageTags.length === 0) {
    // No image tags, or simplified render: process the whole text for color
    const colorSegments = parseTextWithCustomColorTags(
      textAfterGeneralHiding,
      settings.customColorTags,
      settings.currentFontType === 'system' ? settings.systemFont.color : null
    );
    colorSegments.forEach(cs => {
      if (cs.text) { // Ensure segment text is not empty after all processing
        finalSegments.push({ type: 'text', text: cs.text, color: cs.color });
      }
    });
    return finalSegments;
  }

  // Has image tags, process in parts
  enabledImageTags.sort((a, b) => b.tag.length - a.tag.length); // Process longer tags first
  const imageTagPatternParts = enabledImageTags.map(it => it.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const splitRegex = new RegExp(`(${imageTagPatternParts.join('|')})`);
  
  const parts = textAfterGeneralHiding.split(splitRegex).filter(part => part !== undefined && part !== '');

  for (const part of parts) {
    const matchedImageTag = enabledImageTags.find(it => it.tag === part);
    if (matchedImageTag) {
      finalSegments.push({
        type: 'image',
        imageUrl: matchedImageTag.imageUrl,
        width: matchedImageTag.width,
        height: matchedImageTag.height,
        altText: matchedImageTag.tag,
      });
    } else { // It's a text part
      const colorSegments = parseTextWithCustomColorTags(
        part,
        settings.customColorTags,
        settings.currentFontType === 'system' ? settings.systemFont.color : null
      );
      colorSegments.forEach(cs => {
        if (cs.text) { // Ensure segment text is not empty
          finalSegments.push({ type: 'text', text: cs.text, color: cs.color });
        }
      });
    }
  }
  return finalSegments;
};

const getCleanTextForCounting = (
  rawText: string,
  settings: AppSettings // Pass full settings object
): string => {
  let cleanText = rawText;

  // Remove image tags
  if (settings.imageTags && settings.imageTags.length > 0) {
    settings.imageTags.forEach(imgTag => {
      if (imgTag.enabled && imgTag.tag) {
        try {
          const escapedTag = imgTag.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          cleanText = cleanText.replace(new RegExp(escapedTag, 'g'), '');
        } catch (e) { /* ignore regex error during typing */ }
      }
    });
  }
  
  // Remove custom color tags
  if (settings.customColorTags && settings.customColorTags.length > 0) {
    settings.customColorTags.forEach(tagDef => {
      if (tagDef.enabled && tagDef.openingTag) {
        try {
          const escapedOpening = tagDef.openingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          cleanText = cleanText.replace(new RegExp(escapedOpening, 'g'), '');
        } catch (e) {/* ignore regex error during typing */ }
      }
      if (tagDef.enabled && tagDef.closingTag) {
         try {
            const escapedClosing = tagDef.closingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanText = cleanText.replace(new RegExp(escapedClosing, 'g'), '');
         } catch (e) {/* ignore regex error during typing */ }
      }
    });
  }
  
  // Remove general tag patterns
  if (settings.tagPatternsToHide && settings.tagPatternsToHide.length > 0) {
    settings.tagPatternsToHide.forEach(patternStr => {
      const trimmedPattern = patternStr.trim();
      if (trimmedPattern.length === 0) return;
      try {
        const regex = new RegExp(trimmedPattern, 'g'); 
        cleanText = cleanText.replace(regex, '');
      } catch (error) { /* console.warn for regex errors */ }
    });
  }

  // Remove block separators
  if (settings.useCustomBlockSeparator && settings.blockSeparators && settings.blockSeparators.length > 0) {
    settings.blockSeparators.forEach(separator => {
      const trimmedSeparator = separator.trim(); 
      if (trimmedSeparator.length > 0) {
        try {
          const escapedSeparator = trimmedSeparator.replace(/[-\/\\^$*+?.()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedSeparator, 'g');
          cleanText = cleanText.replace(regex, '');
        } catch (error) { /* console.warn for regex errors */ }
      }
    });
  }

  // Remove custom line break tags (new)
  if (settings.useCustomLineBreakTags && settings.customLineBreakTags && settings.customLineBreakTags.length > 0) {
    settings.customLineBreakTags.forEach(tag => {
      if (tag.trim()) {
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
          cleanText = cleanText.replace(new RegExp(escapedTag, 'g'), ''); // Remove, not replace with \n
        } catch (e) {
          console.warn(`Error removing custom line break tag "${tag}" for counting:`, e);
        }
      }
    });
  }
  return cleanText;
};

function trimLeadingAndTrailingEmptyLines(text: string): string {
  if (!text) return ''; 
  if (!text.trim()) return ''; 

  const lines = text.split('\n');
  let firstNonEmptyLine = -1;
  let lastNonEmptyLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      firstNonEmptyLine = i;
      break;
    }
  }

  if (firstNonEmptyLine === -1) {
    return ''; 
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== '') {
      lastNonEmptyLine = i;
      break;
    }
  }
  
  const slicedLines = lines.slice(firstNonEmptyLine, lastNonEmptyLine + 1);
  return slicedLines.join('\n');
}


const PreviewAreaInner = forwardRef<HTMLDivElement, PreviewAreaProps>(({ 
  baseSettings,
  textOverride,
  simplifiedRender = false,
  setIsOverflowing, 
  onNestedSettingsChange, 
  showPixelMarginGuides, 
  isReadOnlyPreview = false,
  activeThemeKey,
  bitmapCharCache, // Use passed-in cache
  bitmapCacheId    // Use passed-in cache ID (might be used as part of key for re-renders)
}, ref) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const contentBoxRef = useRef<HTMLDivElement>(null); 
  // Removed local bitmapCharCache ref and bitmapCacheId state

  const [isDragging, setIsDragging] = useState(false);
  const dragStartCoords = useRef({ x: 0, y: 0 });
  const initialTextPosition = useRef({ x: 0, y: 0 });

  const effectiveText = textOverride !== undefined ? textOverride : baseSettings.text;
  const settings: AppSettings = { 
      ...baseSettings,
      text: effectiveText,
  };

  const { positionX, positionY, scaleX, scaleY, origin: transformOrigin } = settings.transform;
  const currentPreviewZoom = settings.previewZoom || 1;

  const finalDisplaySegments = generateDisplaySegments(settings.text, settings, simplifiedRender);

  const textTransformStyle: CSSProperties = simplifiedRender ? {
    cursor: isReadOnlyPreview ? 'default' : (isDragging ? 'grabbing' : 'grab'),
  } : {
    transform: `translate(${positionX}px, ${positionY}px) scale(${scaleX}, ${scaleY})`,
    transformOrigin: transformOrigin,
    cursor: isReadOnlyPreview ? 'default' : (isDragging ? 'grabbing' : 'grab'),
  };

  let textShadowValue = 'none';
  if (settings.shadowEffect.enabled && !simplifiedRender) {
    textShadowValue = `${settings.shadowEffect.offsetX}px ${settings.shadowEffect.offsetY}px ${settings.shadowEffect.blur}px ${settings.shadowEffect.color}`;
  }
  if (settings.outlineEffect.enabled && !simplifiedRender) {
    const { width, color } = settings.outlineEffect;
    const createOutlinePart = (x: number, y: number) => `${x * width}px ${y * width}px 0 ${color}`;
    const outlineShadows = [
      createOutlinePart(-1, -1), createOutlinePart(1, -1), createOutlinePart(-1, 1), createOutlinePart(1, 1),
      createOutlinePart(-1, 0), createOutlinePart(1, 0), createOutlinePart(0, -1), createOutlinePart(0, 1)
    ];
    textShadowValue = textShadowValue === 'none' ? outlineShadows.join(', ') : `${textShadowValue}, ${outlineShadows.join(', ')}`;
  }

  let alignItems = 'flex-start'; 
  if (settings.systemFont.textAlignVertical === 'middle') alignItems = 'center';
  if (settings.systemFont.textAlignVertical === 'bottom') alignItems = 'flex-end';

  useLayoutEffect(() => {
    if (isReadOnlyPreview) { 
        setIsOverflowing(false);
        return;
    }

    let hasOverflow = false;
    const textEl = textContainerRef.current;
    const zoomWrapperEl = (ref as React.RefObject<HTMLDivElement>)?.current; 

    if (settings.overflowDetectionMode === 'pixel') {
      if (settings.pixelOverflowMargins.enabled) {
        if (textEl && zoomWrapperEl) {
          const { top: pmTop, right: pmRight, bottom: pmBottom, left: pmLeft } = settings.pixelOverflowMargins;
          const previewBoxEl = zoomWrapperEl.querySelector('.preview-box');
          if (previewBoxEl) {
            const previewBoxRect = previewBoxEl.getBoundingClientRect();
            const textRect = textEl.getBoundingClientRect();
            
            const logicalTextLeft = (textRect.left - previewBoxRect.left) / currentPreviewZoom;
            const logicalTextRight = (textRect.right - previewBoxRect.left) / currentPreviewZoom;
            const logicalTextTop = (textRect.top - previewBoxRect.top) / currentPreviewZoom;
            const logicalTextBottom = (textRect.bottom - previewBoxRect.top) / currentPreviewZoom;
            
            // Check non-breakLine margins first
            if (settings.previewWidth > 0) {
              if (!pmLeft.breakLine && logicalTextLeft < pmLeft.value) hasOverflow = true;
              if (!pmRight.breakLine && logicalTextRight > (settings.previewWidth - pmRight.value)) hasOverflow = true;
            }
            if (settings.previewHeight > 0) {
              if (!pmTop.breakLine && logicalTextTop < pmTop.value) hasOverflow = true;
              if (!pmBottom.breakLine && logicalTextBottom > (settings.previewHeight - pmBottom.value)) hasOverflow = true;
            }
             
            // Check overall dimensions if not already overflowing by non-breakLine margins
            if (!hasOverflow && textEl) {
                const effectiveScaleX = simplifiedRender ? 1 : settings.transform.scaleX;
                const effectiveScaleY = simplifiedRender ? 1 : settings.transform.scaleY;
                const widthOverflowOverall = settings.previewWidth > 0 && (textEl.scrollWidth * effectiveScaleX) > settings.previewWidth;
                let heightOverflowOverall = false;
                const scaledScrollHeightOverall = textEl.scrollHeight * effectiveScaleY;

                if (settings.previewHeight > 0) {
                    heightOverflowOverall = scaledScrollHeightOverall > settings.previewHeight;
                }
                // When pixelOverflowMargins are enabled, maxPixelHeight is ignored for auto height scenarios
                if (widthOverflowOverall || heightOverflowOverall) {
                    hasOverflow = true;
                }
            }
          }
        }
      } else { // Margins not enabled, use original logic
        if (textEl) {
          const effectiveScaleX = simplifiedRender ? 1 : settings.transform.scaleX;
          const effectiveScaleY = simplifiedRender ? 1 : settings.transform.scaleY;

          const widthOverflow = settings.previewWidth > 0 && textEl.scrollWidth * effectiveScaleX > settings.previewWidth;
          let heightOverflow = false;
          const scaledScrollHeight = textEl.scrollHeight * effectiveScaleY;

          if (settings.previewHeight > 0) {
            heightOverflow = scaledScrollHeight > settings.previewHeight;
          } else { 
            heightOverflow = settings.maxPixelHeight > 0 && scaledScrollHeight > settings.maxPixelHeight;
          }
          hasOverflow = heightOverflow || widthOverflow;
        }
      }
    } else if (settings.overflowDetectionMode === 'character') {
      if (settings.maxCharacters > 0) {
        const textForCharCounting = getCleanTextForCounting(settings.text, settings);
        const lines = textForCharCounting.split('\n');
        for (const line of lines) {
          if (line.length > settings.maxCharacters) {
            hasOverflow = true;
            break;
          }
        }
      } else {
        hasOverflow = false;
      }
    }
    setIsOverflowing(hasOverflow);
  }, [
      settings.text, settings.customColorTags, settings.imageTags, settings.tagPatternsToHide,
      settings.blockSeparators, settings.useCustomBlockSeparator, settings.customLineBreakTags, settings.useCustomLineBreakTags,
      settings.systemFont, settings.bitmapFont, settings.currentFontType,
      settings.transform, settings.previewWidth, settings.previewHeight,
      settings.overflowDetectionMode, settings.maxCharacters, settings.hideTagsInPreview,
      settings.maxPixelHeight, settings.pixelOverflowMargins, settings.shadowEffect,
      settings.outlineEffect, settings.globalLineHeightFactor, settings.previewZoom,
      setIsOverflowing, ref, bitmapCacheId, currentPreviewZoom, isReadOnlyPreview, simplifiedRender 
    ]);


  // Removed the local useEffect for bitmapCharCache generation.
  // It's now handled by App.tsx and passed via props.

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnlyPreview || event.button !== 0 || simplifiedRender) return; 

    const targetIsDraggable = event.target === textContainerRef.current || 
                              (textContainerRef.current && textContainerRef.current.contains(event.target as Node));
    if (!targetIsDraggable) return;

    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
    dragStartCoords.current = { x: event.clientX, y: event.clientY };
    initialTextPosition.current = { x: settings.transform.positionX, y: settings.transform.positionY };
  };

  useEffect(() => {
    if (isReadOnlyPreview || simplifiedRender) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = event.clientX - dragStartCoords.current.x;
      const deltaY = event.clientY - dragStartCoords.current.y;
      
      const safePreviewZoom = currentPreviewZoom === 0 ? 1 : currentPreviewZoom;
      const safeTransformScaleX = settings.transform.scaleX === 0 ? 1 : settings.transform.scaleX;
      const safeTransformScaleY = settings.transform.scaleY === 0 ? 1 : settings.transform.scaleY;

      const newX = initialTextPosition.current.x + (deltaX / (safePreviewZoom * safeTransformScaleX));
      const newY = initialTextPosition.current.y + (deltaY / (safePreviewZoom * safeTransformScaleY));
      
      onNestedSettingsChange('transform', 'positionX', parseFloat(newX.toFixed(2)));
      onNestedSettingsChange('transform', 'positionY', parseFloat(newY.toFixed(2)));
    };
    const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onNestedSettingsChange, settings.transform.scaleX, settings.transform.scaleY, currentPreviewZoom, isReadOnlyPreview, simplifiedRender, baseSettings]);


  const renderContent = () => {
    if (simplifiedRender && settings.currentFontType === 'bitmap') {
        const simplifiedBitmapStyle: CSSProperties = {
            ...textTransformStyle, display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', fontFamily: 'Arial, sans-serif', fontSize: '12px', 
            color: 'var(--bv-text-secondary)', fontStyle: 'italic', padding: '10px', boxSizing: 'border-box',
            textAlign: 'center',
        };
        return (
             <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: alignItems, justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start', padding: '8px', boxSizing: 'border-box' }}>
                <div ref={textContainerRef} style={simplifiedBitmapStyle}>Bitmap Preview Simplified</div>
            </div>
        );
    }

    if (settings.currentFontType === 'bitmap' && settings.bitmapFont.enabled && settings.bitmapFont.imageUrl && !simplifiedRender) {
      if (!bitmapCharCache) { // Cache might not be ready or failed to load
        const placeholderStyle: CSSProperties = {
            ...textTransformStyle, display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', fontFamily: 'Arial, sans-serif', fontSize: '12px',
            color: 'var(--bv-text-secondary)', fontStyle: 'italic', padding: '10px', boxSizing: 'border-box',
            textAlign: 'center',
        };
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: alignItems, justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start', padding: '8px', boxSizing: 'border-box' }}>
                <div ref={textContainerRef} style={placeholderStyle}>Bitmap font cache loading...</div>
            </div>
        );
      }
      
      const { charHeight, spacing, zoom: bitmapZoom } = settings.bitmapFont;
      const baseCharPixelHeight = charHeight * bitmapZoom;
      const effectiveSpacing = spacing * bitmapZoom;
      
      const bitmapContainerStyle: CSSProperties = {
        ...textTransformStyle, width: 'auto', height: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start',
        padding: '2px', boxSizing: 'border-box', imageRendering: 'pixelated',
      };

      const linesOfSegments: FinalDisplaySegment[][] = [];
      let currentLine: FinalDisplaySegment[] = [];
      finalDisplaySegments.forEach(segment => {
        if (segment.type === 'text') {
          const textLines = trimLeadingAndTrailingEmptyLines(segment.text.replace(/\r/g, '')).split('\n');
          textLines.forEach((lineText, index) => {
            if (lineText || textLines.length === 1) { 
                 currentLine.push({ ...segment, text: lineText });
            }
            if (index < textLines.length - 1) {
              linesOfSegments.push(currentLine);
              currentLine = [];
            }
          });
        } else { 
          currentLine.push(segment);
        }
      });
      if (currentLine.length > 0) linesOfSegments.push(currentLine);
      
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: alignItems, justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start', padding: '8px', boxSizing: 'border-box' }} onMouseDown={handleMouseDown} role={isReadOnlyPreview ? undefined : "application"} aria-roledescription={isReadOnlyPreview ? undefined : "draggable text area"}>
          <div ref={textContainerRef} style={bitmapContainerStyle}>
            {linesOfSegments.map((lineSegments, lineIndex) => {
              let maxElementHeightInLine = baseCharPixelHeight;
              lineSegments.forEach(seg => {
                if (seg.type === 'image') {
                  maxElementHeightInLine = Math.max(maxElementHeightInLine, seg.height * bitmapZoom);
                }
              });
              const actualLineHeightPx = Math.max(maxElementHeightInLine, baseCharPixelHeight * settings.globalLineHeightFactor);

              return (
                <div key={lineIndex} style={{ display: 'flex', height: `${actualLineHeightPx}px`, alignItems: 'center' }}>
                  {lineSegments.map((segment, segIdx) => {
                    if (segment.type === 'image') {
                      return <img key={segIdx} src={segment.imageUrl} alt={segment.altText} style={{ width: `${segment.width * bitmapZoom}px`, height: `${segment.height * bitmapZoom}px`, marginRight: `${effectiveSpacing}px`, imageRendering: 'pixelated', verticalAlign: 'middle' }} />;
                    }
                    
                    return segment.text.split('').map((char, charIndex) => {
                      const cachedCharData = bitmapCharCache.get(char); // Use global cache
                      if (!cachedCharData || !cachedCharData.canvas) { 
                        const emptyCharWidth = (char === ' ' && cachedCharData && cachedCharData.canvas) ? cachedCharData.canvas.width * bitmapZoom : 0;
                        return <div key={charIndex} style={{ width: `${emptyCharWidth}px`, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                      }
                      
                      const finalCachedCanvas = cachedCharData.canvas;
                      const dataURL = cachedCharData.dataURL;

                      if (!dataURL) { 
                          return <span key={charIndex} style={{width: `${settings.bitmapFont.charWidth * bitmapZoom}px`, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px`}}>{char === ' ' ? '\u00A0' : '?'}</span>;
                      }

                      const displayWidth = finalCachedCanvas.width * bitmapZoom; 
                      const displayHeight = finalCachedCanvas.height * bitmapZoom; 
                      if (displayWidth === 0 && char !== ' ') return <div key={charIndex} style={{ width: 0, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                      
                      return <img key={charIndex} src={dataURL} alt={char} style={{ width: `${displayWidth}px`, height: `${displayHeight}px`, marginRight: `${effectiveSpacing}px`, imageRendering: 'pixelated' }} />;
                    });
                  })}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const { top: pmTop, right: pmRight, bottom: pmBottom, left: pmLeft } = settings.pixelOverflowMargins;
    const marginsEnabled = settings.pixelOverflowMargins.enabled;

    const useHorizontalBreakLine = marginsEnabled && (pmLeft.breakLine || pmRight.breakLine);
    const effectiveWhiteSpace = useHorizontalBreakLine ? 'pre-wrap' : 'pre';

    const effectivePaddingTop = marginsEnabled && pmTop.breakLine ? pmTop.value : 0;
    const effectivePaddingRight = marginsEnabled && pmRight.breakLine ? pmRight.value : 0;
    const effectivePaddingBottom = marginsEnabled && pmBottom.breakLine ? pmBottom.value : 0;
    const effectivePaddingLeft = marginsEnabled && pmLeft.breakLine ? pmLeft.value : 0;

    const measurableDivStyle: CSSProperties = {
        ...textTransformStyle,
        display: 'inline-block', // Important for scrollWidth/Height calculation based on content
        padding: `${effectivePaddingTop}px ${effectivePaddingRight}px ${effectivePaddingBottom}px ${effectivePaddingLeft}px`,
        boxSizing: 'border-box',
    };
    
    // If using pre-wrap due to horizontal breakLine margins, constrain the width of the text container
    // for wrapping to occur. The container itself takes full preview width, padding makes inner space.
    if (useHorizontalBreakLine && settings.previewWidth > 0) {
        measurableDivStyle.width = `${settings.previewWidth}px`; 
    } else {
        measurableDivStyle.width = 'auto'; // Let inline-block size it
    }


    const baseTextSpanStyle: CSSProperties = {
        fontFamily: settings.systemFont.fontFamily, fontSize: `${settings.systemFont.fontSize}px`,
        fontWeight: settings.systemFont.fontWeight, lineHeight: settings.globalLineHeightFactor, 
        letterSpacing: `${settings.systemFont.letterSpacing}px`, 
        textAlign: settings.systemFont.textAlignHorizontal, 
        whiteSpace: effectiveWhiteSpace, 
        display: 'block',
        textShadow: textShadowValue !== 'none' ? textShadowValue : undefined,
    };

    if (useHorizontalBreakLine) {
        baseTextSpanStyle.wordBreak = 'break-word';
    } else {
        baseTextSpanStyle.wordBreak = 'normal';
    }
    
    const linesOfSystemSegments: (FinalTextSegment | FinalImageSegment)[][] = [];
    let currentSystemLine: (FinalTextSegment | FinalImageSegment)[] = [];

    finalDisplaySegments.forEach(segment => {
      if (segment.type === 'text') {
        const textLines = trimLeadingAndTrailingEmptyLines(segment.text).split('\n');
        textLines.forEach((lineText, i) => {
          if (lineText || textLines.length === 1 && currentSystemLine.length === 0 && i === 0 && segment.text.trim() === '') { 
             currentSystemLine.push({ ...segment, text: lineText });
          } else if (lineText) {
             currentSystemLine.push({ ...segment, text: lineText });
          }

          if (i < textLines.length - 1) {
            linesOfSystemSegments.push(currentSystemLine);
            currentSystemLine = [];
          }
        });
      } else { 
        currentSystemLine.push(segment);
      }
    });
    if (currentSystemLine.length > 0) linesOfSystemSegments.push(currentSystemLine);
    if (finalDisplaySegments.length === 0 && settings.text.trim() === '') { 
        linesOfSystemSegments.push([{type: 'text', text: '', color: settings.systemFont.color}]);
    }


    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: alignItems, justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start', padding: '8px', boxSizing: 'border-box' }} onMouseDown={handleMouseDown} role={(isReadOnlyPreview || simplifiedRender) ? undefined : "application"} aria-roledescription={(isReadOnlyPreview || simplifiedRender) ? undefined : "draggable text area"} >
        <div ref={textContainerRef} style={measurableDivStyle}>
            <div style={{...baseTextSpanStyle, display: 'block' }}> {/* This inner div may not be necessary if measurableDivStyle has display:block */}
            {linesOfSystemSegments.map((lineSegments, lineIdx) => (
              <div key={lineIdx} style={{ minHeight: `${settings.systemFont.fontSize * settings.globalLineHeightFactor}px` }}>
                {lineSegments.map((segment, segIdx) => {
                  if (segment.type === 'image') {
                    return <img key={`${lineIdx}-${segIdx}-img`} src={segment.imageUrl} alt={segment.altText} style={{ width: `${segment.width}px`, height: `${segment.height}px`, display: 'inline-block', verticalAlign: 'middle', margin: '0 1px', imageRendering: 'pixelated' }} />;
                  }
                  
                  // Text segment with potential space override
                  const { spaceWidthOverride, color: defaultSysFontColor } = settings.systemFont;
                  const segmentColor = segment.color || defaultSysFontColor;

                  if (spaceWidthOverride && spaceWidthOverride > 0) {
                      const parts = segment.text.split(' '); // Split by single space
                      return parts.map((word, wordIdx) => (
                          <React.Fragment key={`${lineIdx}-${segIdx}-word${wordIdx}`}>
                              <span style={{ color: segmentColor }}>{word}</span>
                              {wordIdx < parts.length - 1 && ( // Add a custom space after each word except the last
                                  <span style={{ display: 'inline-block', width: `${spaceWidthOverride}px`}} aria-hidden="true">{'\u00A0'}</span>
                              )}
                          </React.Fragment>
                      ));
                  } else {
                      // Original rendering for system font text segment
                      return <span key={`${lineIdx}-${segIdx}-text`} style={{ color: segmentColor }}>{segment.text === '' && lineSegments.length === 1 ? '\u00A0' : segment.text }</span>;
                  }
                })}
              </div>
            ))}
            </div>
        </div>
      </div>
    );
  };

  const guideLines = [];
  const renderPixelMarginGuides = settings.overflowDetectionMode === 'pixel' &&
                                settings.pixelOverflowMargins.enabled &&
                                showPixelMarginGuides && !simplifiedRender; 

  if (renderPixelMarginGuides) {
    const { top, right, bottom, left } = settings.pixelOverflowMargins;
    if (settings.previewWidth > 0) {
      guideLines.push(<div key="guide-left" className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500 opacity-75" style={{ left: `${left.value}px`, zIndex: 1 }} aria-hidden="true" />);
      guideLines.push(<div key="guide-right" className="absolute top-0 bottom-0 border-r-2 border-dashed border-red-500 opacity-75" style={{ right: `${right.value}px`, zIndex: 1 }} aria-hidden="true" />);
    }
    if (settings.previewHeight > 0) {
       guideLines.push(<div key="guide-top" className="absolute left-0 right-0 border-t-2 border-dashed border-red-500 opacity-75" style={{ top: `${top.value}px`, zIndex: 1 }} aria-hidden="true" />);
       guideLines.push(<div key="guide-bottom" className="absolute left-0 right-0 border-b-2 border-dashed border-red-500 opacity-75" style={{ bottom: `${bottom.value}px`, zIndex: 1 }} aria-hidden="true" />);
    }
  } else if (!isReadOnlyPreview && !simplifiedRender && (settings.overflowDetectionMode === 'pixel' || (settings.overflowDetectionMode === 'character' && settings.previewHeight > 0))) {
    if (settings.overflowDetectionMode === 'pixel' && !settings.pixelOverflowMargins.enabled) {
        if (settings.previewWidth > 0) {
            guideLines.push(<div key="guide-v" className="absolute top-0 bottom-0 border-r-2 border-dashed border-red-500 opacity-75" style={{ left: `${settings.previewWidth - 2}px`, zIndex: 1 }} aria-hidden="true"/>);
        }
        let horizontalGuidePosition = 0;
        let showHorizontalGuide = false;
        if (settings.previewHeight > 0) {
            showHorizontalGuide = true; horizontalGuidePosition = settings.previewHeight;
        } else if (settings.maxPixelHeight > 0 && !settings.pixelOverflowMargins.enabled) {
            showHorizontalGuide = true; horizontalGuidePosition = settings.maxPixelHeight;
        }
        if (showHorizontalGuide && horizontalGuidePosition > 0) {
            guideLines.push(<div key="guide-h" className="absolute left-0 right-0 border-b-2 border-dashed border-red-500 opacity-75" style={{ top: `${Math.max(0, horizontalGuidePosition - 2)}px`, zIndex: 1 }} aria-hidden="true"/>);
        }
    } else if (settings.overflowDetectionMode === 'character' && settings.previewHeight > 0) {
        guideLines.push(<div key="guide-h" className="absolute left-0 right-0 border-b-2 border-dashed border-red-500 opacity-75" style={{ top: `${Math.max(0, settings.previewHeight - 2)}px`, zIndex: 1 }} aria-hidden="true"/>);
    }
  }

  const currentBackgroundImage = settings.showSecondaryBackgroundImage && settings.secondaryBackgroundImageUrl
    ? settings.secondaryBackgroundImageUrl
    : settings.backgroundImageUrl;

  const outerDivProps = isReadOnlyPreview ? {} : { ref };

  const previewBoxBackgroundColor = baseSettings.backgroundColor; 

  return (
    <div
      {...outerDivProps} 
      style={{ transform: `scale(${currentPreviewZoom})`, transformOrigin: 'center' }}
      aria-live="polite" 
      aria-label={isReadOnlyPreview ? "Static original text preview area" : "Zoomable interactive text preview area"}
    >
      <div
        ref={contentBoxRef} 
        className="preview-box border-2 border-dashed border-[var(--bv-accent-primary,var(--bv-border-color))] relative" 
        style={{
          width: settings.previewWidth > 0 ? `${settings.previewWidth}px` : 'auto',
          height: settings.previewHeight > 0 ? `${settings.previewHeight}px` : 'auto',
          minWidth: settings.previewWidth === 0 ? '150px': undefined,
          minHeight: settings.previewHeight === 0 ? '100px': undefined,
          backgroundColor: previewBoxBackgroundColor, 
          backgroundImage: currentBackgroundImage ? `url(${currentBackgroundImage})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden',
          imageRendering: 'pixelated', // Apply to background images
        }}
      >
        {!isReadOnlyPreview && !simplifiedRender && guideLines}
        <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
           {renderContent()}
        </div>
      </div>
    </div>
  );
});

PreviewAreaInner.displayName = 'PreviewAreaInner';

const PreviewArea = React.memo(PreviewAreaInner);
PreviewArea.displayName = 'PreviewArea';

export default PreviewArea;
