

import React, { CSSProperties, forwardRef, useLayoutEffect, useRef, useEffect, useState } from 'react';
import { AppSettings, NestedAppSettingsObjectKeys, ThemeKey, CustomColorTag } from '../types';

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
  activeThemeKey: ThemeKey; // Added to potentially influence non-content styling
}

// Represents a segment of text with an associated color from custom tags
interface ColorSegment {
  text: string;
  color: string | null; // Hex color string or null for default
}

// New function to parse text with custom color tags
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

  // Create a combined regex for all opening and closing tags
  // Sort tags by length (desc) to match longer tags first, helping with prefixes
  // e.g. <COLOR_RED> vs <COLOR>
  const sortedTags = [...enabledTags].sort((a,b) => 
    Math.max(b.openingTag.length, b.closingTag.length) - Math.max(a.openingTag.length, a.closingTag.length)
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
    for (const tag of enabledTags) {
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
        // Pop only if the closing tag matches the top of the stack's opening tag type
        if (colorStack.length > 0 && colorStack[colorStack.length - 1].closingTag === part) {
          colorStack.pop();
        } else {
          // Mismatched closing tag, treat as text or log warning
          // For now, treat as text if not matching the current open tag
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

  if (currentTextSegment) {
    segments.push({ text: currentTextSegment, color: colorStack.length > 0 ? colorStack[colorStack.length - 1].color : defaultColor });
  }
  
  // Handle unclosed tags: any remaining colors on stack apply to the rest of the text
  // This might not be desired, usually unclosed tags mean the color doesn't extend.
  // For simplicity now, if stack is not empty, last segment gets that color.
  // A more robust parser would handle unclosed tags by potentially reverting to default or erroring.
  // The current logic correctly applies color only to text between matched pairs due to segment creation timing.

  return segments.filter(s => s.text.length > 0); // Remove empty text segments
};


const processTextForPreview = (
  text: string,
  hideTags: boolean,
  tagPatterns: string[], // General tags to hide, NOT custom color tags
  blockSeparatorsToHide: string[],
  useCustomBlockSeparator: boolean
): string => {
  if (!hideTags) return text; // If not hiding general tags, return early

  let processedText = text;

  // Hide general tags first (e.g. <PAGE>, [CMD])
  if (tagPatterns.length > 0) {
    tagPatterns.forEach(patternStr => {
      const trimmedPattern = patternStr.trim();
      if (trimmedPattern.length === 0) return;

      try {
        const regex = new RegExp(trimmedPattern, 'g');
        processedText = processedText.replace(regex, '');
      } catch (error) {
        // console.warn for regex errors during typing is fine
      }
    });
  }
  
  // Hide block separators if applicable
  if (useCustomBlockSeparator && blockSeparatorsToHide && blockSeparatorsToHide.length > 0) {
    blockSeparatorsToHide.forEach(separator => {
      if (separator.trim().length > 0) {
        try {
          const escapedSeparator = separator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedSeparator, 'g');
          processedText = processedText.replace(regex, '');
        } catch (error) { /* console.warn for regex errors */ }
      }
    });
  }
  return processedText;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

const getCleanTextForCounting = (
  rawText: string,
  generalTagPatterns: string[], // General tags from settings.tagPatternsToHide
  customColorTags: CustomColorTag[], // User-defined color tags
  blockSeparators: string[],
  useCustomBlockSeparator: boolean
): string => {
  let cleanText = rawText;

  // 1. Strip custom color tags
  if (customColorTags && customColorTags.length > 0) {
    customColorTags.forEach(tagDef => {
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
  
  // 2. Strip general tag patterns
  if (generalTagPatterns && generalTagPatterns.length > 0) {
    generalTagPatterns.forEach(patternStr => {
      const trimmedPattern = patternStr.trim();
      if (trimmedPattern.length === 0) return;
      try {
        const regex = new RegExp(trimmedPattern, 'g'); 
        cleanText = cleanText.replace(regex, '');
      } catch (error) { /* console.warn for regex errors */ }
    });
  }

  // 3. Strip block separators
  if (useCustomBlockSeparator && blockSeparators && blockSeparators.length > 0) {
    blockSeparators.forEach(separator => {
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
  activeThemeKey // Consumed for potential non-content styling
}, ref) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const contentBoxRef = useRef<HTMLDivElement>(null); 
  const bitmapCharCache = useRef<Map<string, HTMLCanvasElement | null>>(new Map()); // Stores UNTINTED chars
  const [bitmapCacheId, setBitmapCacheId] = useState(0);

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

  // Parse text for color segments FIRST
  const colorSegments = parseTextWithCustomColorTags(
    settings.text,
    settings.customColorTags,
    settings.currentFontType === 'system' ? settings.systemFont.color : null // Pass default sys font color for sys font segments
  );

  // Then, process each segment's text for general tag hiding
  const finalSegmentsForRender = colorSegments.map(segment => ({
    ...segment,
    text: processTextForPreview(
      segment.text,
      settings.hideTagsInPreview,
      settings.tagPatternsToHide, // These are general tags, not color tags
      settings.blockSeparators,
      settings.useCustomBlockSeparator
    ),
  }));


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
          const textRect = textEl.getBoundingClientRect();
          const previewBoxEl = zoomWrapperEl.querySelector('.preview-box');
          if (previewBoxEl) {
            const previewBoxRect = previewBoxEl.getBoundingClientRect();
            const logicalTextLeft = (textRect.left - previewBoxRect.left) / currentPreviewZoom;
            const logicalTextRight = (textRect.right - previewBoxRect.left) / currentPreviewZoom;
            const logicalTextTop = (textRect.top - previewBoxRect.top) / currentPreviewZoom;
            const logicalTextBottom = (textRect.bottom - previewBoxRect.top) / currentPreviewZoom;
            
            if (settings.previewWidth > 0) {
              if (logicalTextLeft < settings.pixelOverflowMargins.left) hasOverflow = true;
              if (logicalTextRight > settings.previewWidth - settings.pixelOverflowMargins.right) hasOverflow = true;
            }
            if (settings.previewHeight > 0) {
              if (logicalTextTop < settings.pixelOverflowMargins.top) hasOverflow = true;
              if (logicalTextBottom > settings.previewHeight - settings.pixelOverflowMargins.bottom) hasOverflow = true;
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
        const textForCharCounting = getCleanTextForCounting(
          settings.text, // original text before any processing
          settings.tagPatternsToHide, // general tags
          settings.customColorTags,   // custom color tags
          settings.blockSeparators,
          settings.useCustomBlockSeparator
        );
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
      settings.text, settings.customColorTags,
      settings.systemFont, settings.bitmapFont, settings.currentFontType,
      settings.transform, settings.previewWidth, settings.previewHeight,
      settings.overflowDetectionMode, settings.maxCharacters, settings.hideTagsInPreview,
      settings.tagPatternsToHide, settings.blockSeparators, settings.useCustomBlockSeparator,
      settings.maxPixelHeight, settings.pixelOverflowMargins, settings.shadowEffect,
      settings.outlineEffect, settings.globalLineHeightFactor, settings.previewZoom,
      setIsOverflowing, ref, bitmapCacheId, currentPreviewZoom, isReadOnlyPreview, simplifiedRender 
    ]);


  useEffect(() => {
    // Bitmap cache now stores UNTINTED characters. Tinting happens at render time per segment.
    if (settings.currentFontType === 'bitmap' && settings.bitmapFont.enabled && settings.bitmapFont.imageUrl && !simplifiedRender) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = settings.bitmapFont.imageUrl;
        img.onload = () => {
            const newCache = new Map<string, HTMLCanvasElement | null>();
            const {
              charWidth, charHeight, charMap,
              colorToRemove, enableColorRemoval, colorRemovalTolerance,
              enablePixelScanning, spaceWidthOverride
            } = settings.bitmapFont;

            if (charWidth <= 0 || charHeight <= 0) {
                console.error("Bitmap font charWidth or charHeight is zero or negative.");
                bitmapCharCache.current.clear();
                setBitmapCacheId(id => id + 1);
                return;
            }

            const charsPerRow = Math.floor(img.width / charWidth);
            const targetRgb = enableColorRemoval ? hexToRgb(colorToRemove) : null;

            for (let i = 0; i < charMap.length; i++) {
                const char = charMap[i];
                let effectiveCharWidth = charWidth; 

                if (char === ' ') {
                    if (spaceWidthOverride > 0) {
                        effectiveCharWidth = spaceWidthOverride;
                    } else {
                        effectiveCharWidth = enablePixelScanning 
                            ? Math.max(1, Math.floor(charWidth / 4)) 
                            : charWidth;
                    }
                    // For spaces, cache an empty canvas of the correct width (it won't be tinted)
                    const spaceCanvas = document.createElement('canvas');
                    spaceCanvas.width = effectiveCharWidth;
                    spaceCanvas.height = charHeight;
                    newCache.set(char, spaceCanvas);
                    continue; 
                }

                const tileX = (i % charsPerRow) * charWidth;
                const tileY = Math.floor(i / charsPerRow) * charHeight;

                const baseCharCanvas = document.createElement('canvas'); // This will store the UNTINTED char
                baseCharCanvas.width = charWidth;
                baseCharCanvas.height = charHeight;
                const baseCtx = baseCharCanvas.getContext('2d', { willReadFrequently: true });
                if (!baseCtx) continue;
                baseCtx.drawImage(img, tileX, tileY, charWidth, charHeight, 0, 0, charWidth, charHeight);

                // Apply color removal if enabled
                if (enableColorRemoval && targetRgb) {
                    const imageData = baseCtx.getImageData(0, 0, charWidth, charHeight);
                    const data = imageData.data;
                    for (let p = 0; p < data.length; p += 4) {
                        const r = data[p]; const g = data[p + 1]; const b = data[p + 2];
                        if (Math.abs(r - targetRgb.r) <= colorRemovalTolerance &&
                            Math.abs(g - targetRgb.g) <= colorRemovalTolerance &&
                            Math.abs(b - targetRgb.b) <= colorRemovalTolerance) {
                            data[p + 3] = 0; 
                        }
                    }
                    baseCtx.putImageData(imageData, 0, 0);
                }
                // DO NOT apply global tint here. Stored char is base.

                if (enablePixelScanning) {
                    const imageData = baseCtx.getImageData(0, 0, charWidth, charHeight);
                    const data = imageData.data;
                    let rightmostPixel = -1;
                    for (let yPx = 0; yPx < charHeight; yPx++) {
                        for (let xPx = 0; xPx < charWidth; xPx++) {
                            const alphaIndex = (yPx * charWidth + xPx) * 4 + 3;
                            if (data[alphaIndex] > 10) { 
                                if (xPx > rightmostPixel) {
                                    rightmostPixel = xPx;
                                }
                            }
                        }
                    }
                    effectiveCharWidth = (rightmostPixel === -1) ? 0 : rightmostPixel + 1;
                }
                
                if (enablePixelScanning && effectiveCharWidth === 0) { 
                    newCache.set(char, null); // Represents a fully transparent character after processing
                } else {
                    // If pixel scanning changed width, create a new canvas of correct size
                    if (enablePixelScanning && effectiveCharWidth !== charWidth && effectiveCharWidth > 0) {
                        const finalScannedCanvas = document.createElement('canvas');
                        finalScannedCanvas.width = effectiveCharWidth;
                        finalScannedCanvas.height = charHeight;
                        const finalScannedCtx = finalScannedCanvas.getContext('2d');
                        if (finalScannedCtx) {
                           finalScannedCtx.drawImage(baseCharCanvas, 0, 0, effectiveCharWidth, charHeight, 0, 0, effectiveCharWidth, charHeight);
                           newCache.set(char, finalScannedCanvas);
                        } else {
                           newCache.set(char, baseCharCanvas); // Fallback if context fails
                        }
                    } else {
                         newCache.set(char, baseCharCanvas); // Store the processed (color-removed if applicable) base character
                    }
                }
            }
            bitmapCharCache.current = newCache;
            setBitmapCacheId(id => id + 1);
        };
        img.onerror = () => {
            console.error("Failed to load bitmap font image.");
            bitmapCharCache.current.clear();
            setBitmapCacheId(id => id + 1);
        }
    } else {
        bitmapCharCache.current.clear();
        if (settings.currentFontType === 'bitmap' || simplifiedRender) { 
             setBitmapCacheId(id => id + 1);
        }
    }
  }, [
      settings.bitmapFont.imageUrl, settings.bitmapFont.charWidth, settings.bitmapFont.charHeight,
      settings.bitmapFont.charMap, // Global tint color removed as dependency for cache generation
      settings.bitmapFont.enableColorRemoval, settings.bitmapFont.colorToRemove,
      settings.bitmapFont.colorRemovalTolerance, settings.bitmapFont.enablePixelScanning,
      settings.bitmapFont.spaceWidthOverride,
      settings.currentFontType, settings.bitmapFont.enabled,
      simplifiedRender
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
    if (simplifiedRender && settings.currentFontType === 'bitmap') {
        const simplifiedBitmapStyle: CSSProperties = {
            ...textTransformStyle,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%',
            fontFamily: 'Arial, sans-serif', fontSize: '12px', 
            color: 'var(--bv-text-secondary)', // Use CSS variable
            fontStyle: 'italic', padding: '10px', boxSizing: 'border-box',
            textAlign: 'center',
        };
        return (
             <div 
                style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: alignItems,
                    justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start',
                    padding: '8px', boxSizing: 'border-box',
                }}
            >
                <div ref={textContainerRef} style={simplifiedBitmapStyle}>Bitmap Preview Simplified</div>
            </div>
        );
    }


    if (settings.currentFontType === 'bitmap' && settings.bitmapFont.enabled && settings.bitmapFont.imageUrl && !simplifiedRender) {
      const { charHeight, spacing, zoom: bitmapZoom, enableTintColor, color: globalTintColor } = settings.bitmapFont;
      const baseCharPixelHeight = charHeight * bitmapZoom;
      const actualLineHeightPx = baseCharPixelHeight * settings.globalLineHeightFactor;
      const effectiveSpacing = spacing * bitmapZoom;
      
      const bitmapContainerStyle: CSSProperties = {
        ...textTransformStyle,
        width: 'auto', height: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start',
        padding: '2px', boxSizing: 'border-box', imageRendering: 'pixelated',
      };

      return (
        <div 
          style={{
            width: '100%', height: '100%', display: 'flex', alignItems: alignItems,
            justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start',
            padding: '8px', boxSizing: 'border-box',
          }}
          onMouseDown={handleMouseDown} 
          role={isReadOnlyPreview ? undefined : "application"}
          aria-roledescription={isReadOnlyPreview ? undefined : "draggable text area"}
        >
          <div ref={textContainerRef} style={bitmapContainerStyle}>
            {finalSegmentsForRender.map((segment, segmentIndex) => {
                const lines = trimLeadingAndTrailingEmptyLines(segment.text.replace(/\r/g, '')).split('\n');
                const segmentColor = segment.color; // This is the color from custom tag, or null

                return lines.map((line, lineIndex) => (
                    <div key={`${segmentIndex}-${lineIndex}`} style={{ display: 'flex', height: `${actualLineHeightPx}px`, alignItems: 'center' }}>
                    {line.split('').map((char, charIndex) => {
                        const baseCachedCanvas = bitmapCharCache.current.get(char);

                        if (baseCachedCanvas === null) { // Fully transparent char after processing
                            return <div key={charIndex} style={{ width: 0, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                        }
                        
                        if (baseCachedCanvas instanceof HTMLCanvasElement) {
                            let charToRenderCanvas = baseCachedCanvas;
                            
                            // Dynamic Tinting
                            if (enableTintColor) {
                                const tintToApply = segmentColor || globalTintColor; // Segment color takes precedence
                                if (tintToApply) {
                                    const tintedCanvas = document.createElement('canvas');
                                    tintedCanvas.width = baseCachedCanvas.width;
                                    tintedCanvas.height = baseCachedCanvas.height;
                                    const ctx = tintedCanvas.getContext('2d');
                                    if (ctx) {
                                        ctx.drawImage(baseCachedCanvas, 0, 0);
                                        ctx.globalCompositeOperation = 'source-in';
                                        ctx.fillStyle = tintToApply;
                                        ctx.fillRect(0, 0, tintedCanvas.width, tintedCanvas.height);
                                        charToRenderCanvas = tintedCanvas;
                                    }
                                }
                            }

                            const displayWidth = charToRenderCanvas.width * bitmapZoom; 
                            const displayHeight = charToRenderCanvas.height * bitmapZoom; 

                            if (displayWidth === 0 && char !== ' ') { 
                                return <div key={charIndex} style={{ width: 0, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                            }

                            return (
                            <img
                                key={charIndex}
                                src={charToRenderCanvas.toDataURL()}
                                alt={char}
                                style={{
                                width: `${displayWidth}px`,
                                height: `${displayHeight}px`, 
                                marginRight: `${effectiveSpacing}px`,
                                imageRendering: 'pixelated',
                                }}
                            />
                            );
                        }
                         if (char === '\r') return null; 
                        // Fallback for missing char in cache - should be rare
                        return <span key={charIndex} style={{width: `${settings.bitmapFont.charWidth * bitmapZoom}px`, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px`}}>{char === ' ' ? '\u00A0' : '?'}</span>;
                    })}
                    </div>
                ));
            })}
          </div>
        </div>
      );
    }

    // System Font Rendering with Custom Color Tags
    const measurableDivStyle: CSSProperties = {
        ...textTransformStyle, display: 'inline-block', maxWidth: '100%',
    };
    const baseTextSpanStyle: CSSProperties = {
        fontFamily: settings.systemFont.fontFamily, fontSize: `${settings.systemFont.fontSize}px`,
        fontWeight: settings.systemFont.fontWeight, lineHeight: settings.globalLineHeightFactor, 
        letterSpacing: `${settings.systemFont.letterSpacing}px`, 
        textAlign: settings.systemFont.textAlignHorizontal, whiteSpace: 'pre-wrap',
        wordBreak: 'break-word', overflowWrap: 'break-word', display: 'block', // Changed from inline-block to block for multi-span lines
        textShadow: textShadowValue !== 'none' ? textShadowValue : undefined,
    };
    
    return (
      <div 
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: alignItems,
          justifyContent: settings.systemFont.textAlignHorizontal === 'center' ? 'center' : settings.systemFont.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start',
          padding: '8px', boxSizing: 'border-box',
        }}
        onMouseDown={handleMouseDown}
        role={(isReadOnlyPreview || simplifiedRender) ? undefined : "application"}
        aria-roledescription={(isReadOnlyPreview || simplifiedRender) ? undefined : "draggable text area"}
      >
        <div ref={textContainerRef} style={measurableDivStyle}>
            <div style={{...baseTextSpanStyle, display: 'block' /* Ensure outer div respects block layout for alignment*/ }}>
            {finalSegmentsForRender.map((segment, index) => {
                const lines = trimLeadingAndTrailingEmptyLines(segment.text).split('\n');
                return lines.map((line, lineIndex) => (
                    <React.Fragment key={`${index}-${lineIndex}`}>
                        <span style={{ color: segment.color || settings.systemFont.color }}>
                            {line}
                        </span>
                        {lineIndex < lines.length - 1 && <br />} 
                    </React.Fragment>
                ));
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
    if (settings.previewWidth > 0) {
      guideLines.push(<div key="guide-left" className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500 opacity-75" style={{ left: `${settings.pixelOverflowMargins.left}px`, zIndex: 1 }} aria-hidden="true" />);
      guideLines.push(<div key="guide-right" className="absolute top-0 bottom-0 border-r-2 border-dashed border-red-500 opacity-75" style={{ right: `${settings.pixelOverflowMargins.right}px`, zIndex: 1 }} aria-hidden="true" />);
    }
    if (settings.previewHeight > 0) {
      guideLines.push(<div key="guide-top" className="absolute left-0 right-0 border-t-2 border-dashed border-red-500 opacity-75" style={{ top: `${settings.pixelOverflowMargins.top}px`, zIndex: 1 }} aria-hidden="true" />);
      guideLines.push(<div key="guide-bottom" className="absolute left-0 right-0 border-b-2 border-dashed border-red-500 opacity-75" style={{ bottom: `${settings.pixelOverflowMargins.bottom}px`, zIndex: 1 }} aria-hidden="true" />);
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

  const previewBoxBackgroundColor = baseSettings.backgroundColor; // Use the direct setting for preview box, not the theme's page bg

  return (
    <div
      {...outerDivProps} 
      style={{
        transform: `scale(${currentPreviewZoom})`,
        transformOrigin: 'center', 
      }}
      aria-live="polite" 
      aria-label={isReadOnlyPreview ? "Static original text preview area" : "Zoomable interactive text preview area"}
    >
      <div
        ref={contentBoxRef} 
        className="preview-box border-2 border-dashed border-[var(--bv-accent-primary,var(--bv-border-color))] relative" // Fallback to general border color
        style={{
          width: settings.previewWidth > 0 ? `${settings.previewWidth}px` : 'auto',
          height: settings.previewHeight > 0 ? `${settings.previewHeight}px` : 'auto',
          minWidth: settings.previewWidth === 0 ? '150px': undefined,
          minHeight: settings.previewHeight === 0 ? '100px': undefined,
          backgroundColor: previewBoxBackgroundColor, // Use specific setting from AppSettings
          backgroundImage: currentBackgroundImage ? `url(${currentBackgroundImage})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden',
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