
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
  bitmapCharCache: BitmapCharCache | null; 
  bitmapCacheId: number; 
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
  rawText: string, 
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
  
  const sortedTags = [...enabledTags].sort((a,b) => 
    (b.openingTag.length + b.closingTag.length) - (a.openingTag.length + a.closingTag.length)
  );

  const tagParts: string[] = [];
  sortedTags.forEach(tag => {
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
    if (!part) continue; 
    let isTag = false;
    for (const tag of sortedTags) { 
      if (part === tag.openingTag) {
        if (currentTextSegment) { 
          segments.push({ text: currentTextSegment, color: colorStack.length > 0 ? colorStack[colorStack.length - 1].color : defaultColor });
          currentTextSegment = "";
        }
        colorStack.push({ tagId: tag.id, color: tag.color, openingTag: tag.openingTag, closingTag: tag.closingTag });
        isTag = true;
        break;
      } else if (part === tag.closingTag) {
        if (currentTextSegment) { 
          segments.push({ text: currentTextSegment, color: colorStack.length > 0 ? colorStack[colorStack.length - 1].color : defaultColor });
          currentTextSegment = "";
        }
        // If it's a closing tag that matches the one on top of the stack, pop it.
        // Otherwise (orphaned or mismatched tag), it's still a tag and not text.
        if (colorStack.length > 0 && colorStack[colorStack.length - 1].closingTag === part) {
          colorStack.pop();
        }
        // Mark as a tag so it's not appended to currentTextSegment later.
        isTag = true; 
        break;
      }
    }
    if (!isTag) {
      currentTextSegment += part;
    }
  }
  if (currentTextSegment) { 
    segments.push({ text: currentTextSegment, color: colorStack.length > 0 ? colorStack[colorStack.length - 1].color : defaultColor });
  }
  return segments.filter(s => s.text.length > 0); 
};

const hideGeneralTagsFromText = (
  text: string,
  generalTagPatterns: string[],
  blockSeparatorsToHide: string[],
  useCustomBlockSeparator: boolean,
  activeCustomColorTags: CustomColorTag[],
  activeImageTags: ImageTag[]
): string => {
  let processedText = text;
  
  const customColorTagStrings = activeCustomColorTags.flatMap(t => [t.openingTag, t.closingTag]);
  const imageTagStrings = activeImageTags.map(t => t.tag);
  const doNotHideList = [...customColorTagStrings, ...imageTagStrings].filter(Boolean);

  if (generalTagPatterns.length > 0) {
    generalTagPatterns.forEach(patternStr => {
      const trimmedPattern = patternStr.trim();
      if (trimmedPattern.length === 0) return;
      try {
        const regex = new RegExp(trimmedPattern, 'g');
        processedText = processedText.replace(regex, (match) => {
          if (doNotHideList.includes(match)) {
            return match; // Don't hide this specific custom/image tag
          }
          return ''; // Hide other general tags
        });
      } catch (error) {
         console.warn(`Invalid RegEx pattern for general tag hiding: ${trimmedPattern}`, error);
      }
    });
  }

  if (useCustomBlockSeparator && blockSeparatorsToHide && blockSeparatorsToHide.length > 0) {
    blockSeparatorsToHide.forEach(separator => {
      if (separator.trim().length > 0) {
        // Only hide block separators if they are not also part of the doNotHideList
        // (though unlikely, it's a safeguard)
        if (doNotHideList.includes(separator)) return; 
        try {
          const escapedSeparator = separator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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

  if (settings.useCustomLineBreakTags && settings.customLineBreakTags.length > 0) {
    settings.customLineBreakTags.forEach(tag => {
      if (tag.trim()) { 
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
        try {
            currentWorkingText = currentWorkingText.replace(new RegExp(escapedTag, 'g'), '\n');
        } catch (e) {
            console.warn(`Error applying custom line break tag "${tag}":`, e);
        }
      }
    });
  }

  let textAfterGeneralHiding = currentWorkingText;
  if (settings.hideTagsInPreview) {
     textAfterGeneralHiding = hideGeneralTagsFromText(
        currentWorkingText,
        settings.tagPatternsToHide,
        settings.blockSeparators,
        settings.useCustomBlockSeparator,
        settings.customColorTags.filter(t => t.enabled), // Pass active custom color tags
        settings.imageTags.filter(t => t.enabled)        // Pass active image tags
    );
  }


  const enabledImageTags = settings.imageTags.filter(it => it.enabled && it.tag);
  const activeCustomColorTags = settings.customColorTags.filter(ct => ct.enabled);

  if (simplifiedRender || enabledImageTags.length === 0) {
    const colorSegments = parseTextWithCustomColorTags(
      textAfterGeneralHiding,
      activeCustomColorTags,
      settings.currentFontType === 'system' ? settings.systemFont.color : null
    );
    colorSegments.forEach(cs => {
      if (cs.text) { 
        finalSegments.push({ type: 'text', text: cs.text, color: cs.color });
      }
    });
    return finalSegments;
  }

  enabledImageTags.sort((a, b) => b.tag.length - a.tag.length); 
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
    } else { 
      const colorSegments = parseTextWithCustomColorTags(
        part,
        activeCustomColorTags,
        settings.currentFontType === 'system' ? settings.systemFont.color : null
      );
      colorSegments.forEach(cs => {
        if (cs.text) { 
          finalSegments.push({ type: 'text', text: cs.text, color: cs.color });
        }
      });
    }
  }
  return finalSegments;
};

const getCleanTextForCounting = (
  rawText: string,
  settings: AppSettings 
): string => {
  let cleanText = rawText;

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

  if (settings.useCustomBlockSeparator && settings.blockSeparators && settings.blockSeparators.length > 0) {
    settings.blockSeparators.forEach(separator => {
      const trimmedSeparator = separator.trim(); 
      if (trimmedSeparator.length > 0) {
        try {
          const escapedSeparator = trimmedSeparator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedSeparator, 'g');
          cleanText = cleanText.replace(regex, '');
        } catch (error) { /* console.warn for regex errors */ }
      }
    });
  }

  if (settings.useCustomLineBreakTags && settings.customLineBreakTags && settings.customLineBreakTags.length > 0) {
    settings.customLineBreakTags.forEach(tag => {
      if (tag.trim()) {
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
          cleanText = cleanText.replace(new RegExp(escapedTag, 'g'), ''); 
        } catch (e) {
          console.warn(`Error removing custom line break tag "${tag}" for counting:`, e);
        }
      }
    });
  }
  return cleanText;
};


const PreviewAreaInner = forwardRef<HTMLDivElement, PreviewAreaProps>(({ 
  baseSettings,
  textOverride,
  simplifiedRender = false,
  setIsOverflowing, 
  onNestedSettingsChange, 
  showPixelMarginGuides, 
  isReadOnlyPreview = false,
  activeThemeKey,
  bitmapCharCache, 
  bitmapCacheId    
}, ref) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const contentBoxRef = useRef<HTMLDivElement>(null); 

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
            
            if (settings.previewWidth > 0) {
              if (!pmLeft.breakLine && logicalTextLeft < pmLeft.value) hasOverflow = true;
              if (!pmRight.breakLine && logicalTextRight > (settings.previewWidth - pmRight.value)) hasOverflow = true;
            }
            if (settings.previewHeight > 0) {
              if (!pmTop.breakLine && logicalTextTop < pmTop.value) hasOverflow = true;
              if (!pmBottom.breakLine && logicalTextBottom > (settings.previewHeight - pmBottom.value)) hasOverflow = true;
            }
             
            if (!hasOverflow && textEl) {
                const effectiveScaleX = simplifiedRender ? 1 : settings.transform.scaleX;
                const effectiveScaleY = simplifiedRender ? 1 : settings.transform.scaleY;
                const widthOverflowOverall = settings.previewWidth > 0 && (textEl.scrollWidth * effectiveScaleX) > settings.previewWidth;
                let heightOverflowOverall = false;
                const scaledScrollHeightOverall = textEl.scrollHeight * effectiveScaleY;

                if (settings.previewHeight > 0) {
                    heightOverflowOverall = scaledScrollHeightOverall > settings.previewHeight;
                }
                if (widthOverflowOverall || heightOverflowOverall) {
                    hasOverflow = true;
                }
            }
          }
        }
      } else { 
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
    // Split finalDisplaySegments into lines for rendering
    const linesOfSegments: FinalDisplaySegment[][] = [];
    let currentLine: FinalDisplaySegment[] = [];
    finalDisplaySegments.forEach(segment => {
      if (segment.type === 'text') {
        const textLines = segment.text.replace(/\r/g, '').split('\n');
        textLines.forEach((lineText, index) => {
          currentLine.push({ ...segment, text: lineText });
          if (index < textLines.length - 1) {
            linesOfSegments.push(currentLine);
            currentLine = [];
          }
        });
      } else {
        currentLine.push(segment);
      }
    });
    if (currentLine.length > 0 || (finalDisplaySegments.length === 0 && settings.text.trim() === '')) {
      linesOfSegments.push(currentLine);
    }
    if (linesOfSegments.length === 0 && settings.text.trim() === '') {
       linesOfSegments.push([{type: 'text', text: '', color: settings.currentFontType === 'system' ? settings.systemFont.color : null}]);
    }

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
      if (!bitmapCharCache) { 
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
      
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: alignItems, justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start', padding: '8px', boxSizing: 'border-box' }} onMouseDown={handleMouseDown} role={isReadOnlyPreview ? undefined : "application"} aria-roledescription={isReadOnlyPreview ? undefined : "draggable text area"}>
          <div ref={textContainerRef} style={bitmapContainerStyle}>
            {linesOfSegments.map((lineContentSegments, lineIndex) => {
              const isBitmapLineVisuallyEmptyBasedOnText = lineContentSegments.every(seg => 
                seg.type === 'text' && seg.text.trim() === ''
              );

              let lineRendersAnyPixel = false;
              if (!isBitmapLineVisuallyEmptyBasedOnText && bitmapCharCache) {
                for (const segment of lineContentSegments) {
                  if (segment.type === 'image') {
                    lineRendersAnyPixel = true;
                    break;
                  }
                  if (segment.type === 'text') {
                    for (const char of segment.text) {
                      const cachedCharEntry = bitmapCharCache.get(char);
                      if (cachedCharEntry?.canvas && cachedCharEntry.canvas.width > 0 && cachedCharEntry.canvas.height > 0) {
                        lineRendersAnyPixel = true;
                        break;
                      }
                    }
                  }
                  if (lineRendersAnyPixel) break;
                }
              }
              const isEffectivelyEmpty = isBitmapLineVisuallyEmptyBasedOnText || !lineRendersAnyPixel;

              if (isEffectivelyEmpty) {
                return <div key={lineIndex} style={{ height: '0px', overflow: 'hidden' }} aria-hidden="true" />;
              }
              
              let maxElementHeightInLine = baseCharPixelHeight;
              lineContentSegments.forEach(seg => {
                if (seg.type === 'image') {
                  maxElementHeightInLine = Math.max(maxElementHeightInLine, seg.height * bitmapZoom);
                }
              });
              const actualLineHeightPx = Math.max(maxElementHeightInLine, baseCharPixelHeight * settings.globalLineHeightFactor);

              return (
                <div key={lineIndex} style={{ display: 'flex', height: `${actualLineHeightPx}px`, alignItems: 'center' }}>
                  {lineContentSegments.map((segment, segIdx) => {
                    if (segment.type === 'image') {
                      return <img key={`${lineIndex}-${segIdx}-img`} src={segment.imageUrl} alt={segment.altText} style={{ width: `${segment.width * bitmapZoom}px`, height: `${segment.height * bitmapZoom}px`, marginRight: `${effectiveSpacing}px`, imageRendering: 'pixelated', verticalAlign: 'middle' }} />;
                    }
                    
                    return segment.text.split('').map((char, charIndex) => {
                      const cachedCharEntry = bitmapCharCache.get(char); 

                      if (!cachedCharEntry || !cachedCharEntry.canvas) {
                        const emptyCharWidth = (char === ' ' && cachedCharEntry && cachedCharEntry.canvas) ? cachedCharEntry.canvas.width * bitmapZoom : 0;
                        return <div key={`${lineIndex}-${segIdx}-char${charIndex}`} style={{ width: `${emptyCharWidth}px`, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                      }
                      
                      let canvasToRenderFrom: HTMLCanvasElement = cachedCharEntry.canvas;
                      let finalDataURL = cachedCharEntry.dataURL; 

                      const { enableTintColor, color: globalBitmapTintColor } = settings.bitmapFont;
                      const tintToApply = segment.color || (enableTintColor ? globalBitmapTintColor : null);

                      if (tintToApply && canvasToRenderFrom.width > 0 && canvasToRenderFrom.height > 0) {
                        const tempTintCanvas = document.createElement('canvas');
                        tempTintCanvas.width = canvasToRenderFrom.width;
                        tempTintCanvas.height = canvasToRenderFrom.height;
                        const tempCtx = tempTintCanvas.getContext('2d');

                        if (tempCtx) {
                          tempCtx.drawImage(canvasToRenderFrom, 0, 0); 
                          tempCtx.globalCompositeOperation = 'source-in';
                          tempCtx.fillStyle = tintToApply;
                          tempCtx.fillRect(0, 0, tempTintCanvas.width, tempTintCanvas.height);
                          finalDataURL = tempTintCanvas.toDataURL(); 
                        }
                      }
                      
                      const displayWidth = canvasToRenderFrom.width * bitmapZoom; 
                      const displayHeight = canvasToRenderFrom.height * bitmapZoom; 
                      if (displayWidth === 0 && char !== ' ') return <div key={`${lineIndex}-${segIdx}-char${charIndex}`} style={{ width: 0, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                      
                      return <img key={`${lineIndex}-${segIdx}-char${charIndex}`} src={finalDataURL} alt={char} style={{ width: `${displayWidth}px`, height: `${displayHeight}px`, marginRight: `${effectiveSpacing}px`, imageRendering: 'pixelated' }} />;
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
        display: 'inline-block', 
        padding: `${effectivePaddingTop}px ${effectivePaddingRight}px ${effectivePaddingBottom}px ${effectivePaddingLeft}px`,
        boxSizing: 'border-box',
    };
    
    if (useHorizontalBreakLine && settings.previewWidth > 0) {
        measurableDivStyle.width = `${settings.previewWidth}px`; 
    } else {
        measurableDivStyle.width = 'auto'; 
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
    
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: alignItems, justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start', padding: '8px', boxSizing: 'border-box' }} onMouseDown={handleMouseDown} role={(isReadOnlyPreview || simplifiedRender) ? undefined : "application"} aria-roledescription={(isReadOnlyPreview || simplifiedRender) ? undefined : "draggable text area"} >
        <div ref={textContainerRef} style={measurableDivStyle}>
            <div style={{...baseTextSpanStyle, display: 'block' }}>
            {linesOfSegments.map((lineContentSegments, lineIdx) => {
              const isLineVisuallyEmpty = lineContentSegments.every(seg => seg.type === 'text' && seg.text.trim() === '');
              if (isLineVisuallyEmpty) {
                  return <div key={lineIdx} style={{ height: '0px', overflow: 'hidden' }} aria-hidden="true" />;
              }
              
              return (
              <div key={lineIdx} style={{ minHeight: `${settings.systemFont.fontSize * settings.globalLineHeightFactor}px`, display: 'flex', flexWrap: 'nowrap', alignItems: 'baseline' }}>
                {lineContentSegments.map((segment, segIdx) => {
                  if (segment.type === 'image') {
                    return <img key={`${lineIdx}-${segIdx}-img`} src={segment.imageUrl} alt={segment.altText} style={{ width: `${segment.width}px`, height: `${segment.height}px`, display: 'inline-block', verticalAlign: 'middle', margin: '0 1px', imageRendering: 'pixelated' }} />;
                  }
                  
                  const { spaceWidthOverride, color: defaultSysFontColor } = settings.systemFont;
                  const segmentColor = segment.color || defaultSysFontColor;
                  const textToRender = segment.text; 

                  if (spaceWidthOverride && spaceWidthOverride > 0 && textToRender.includes(' ')) {
                      const parts = textToRender.split(/(\s+)/); 
                      return parts.map((part, partIdx) => {
                          if (part.match(/^\s+$/)) { 
                              return part.split('').map((spaceChar, spaceIdx) => (
                                   <span key={`${lineIdx}-${segIdx}-part${partIdx}-space${spaceIdx}`} style={{ display: 'inline-block', width: `${spaceWidthOverride}px`}} aria-hidden="true">{'\u00A0'}</span>
                              ));
                          }
                          return <span key={`${lineIdx}-${segIdx}-part${partIdx}-text`} style={{ color: segmentColor }}>{part}</span>;
                      });
                  } else {
                      return <span key={`${lineIdx}-${segIdx}-text`} style={{ color: segmentColor }}>{textToRender}</span>;
                  }
                })}
              </div>
            );
            })}
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
          imageRendering: 'pixelated', 
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
