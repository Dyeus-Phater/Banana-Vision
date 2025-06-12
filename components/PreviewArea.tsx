
import React, { CSSProperties, forwardRef, useLayoutEffect, useRef, useEffect, useState } from 'react';
import { AppSettings, NestedAppSettingsObjectKeys } from '../types';

export interface PreviewAreaProps {
  baseSettings: AppSettings;
  textOverride?: string;
  simplifiedRender?: boolean; // If true, render a much simpler version
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
}

const processTextForPreview = (
  text: string,
  hideTags: boolean,
  tagPatterns: string[],
  blockSeparatorsToHide: string[],
  useCustomBlockSeparator: boolean
): string => {
  if (!hideTags && (!useCustomBlockSeparator || !blockSeparatorsToHide || blockSeparatorsToHide.length === 0)) {
    return text;
  }

  let processedText = text;

  if (hideTags && tagPatterns.length > 0) {
    tagPatterns.forEach(patternStr => {
      try {
        const regex = new RegExp(patternStr, 'g');
        processedText = processedText.replace(regex, '');
      } catch (error) {
        console.error(`Invalid regex pattern for tags: ${patternStr}`, error);
      }
    });
  }

  if (hideTags && useCustomBlockSeparator && blockSeparatorsToHide.length > 0) {
    blockSeparatorsToHide.forEach(separator => {
      if (separator.trim().length > 0) {
        try {
          const escapedSeparator = separator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedSeparator, 'g');
          processedText = processedText.replace(regex, '');
        } catch (error) {
          console.error(`Invalid regex pattern for block separator: ${separator}`, error);
        }
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
  tagPatterns: string[],
  blockSeparators: string[],
  useCustomBlockSeparator: boolean
): string => {
  let cleanText = rawText;

  if (tagPatterns && tagPatterns.length > 0) {
    tagPatterns.forEach(patternStr => {
      if (patternStr.trim().length === 0) return;
      try {
        const regex = new RegExp(patternStr, 'g');
        cleanText = cleanText.replace(regex, '');
      } catch (error) {
        console.warn(`Invalid regex pattern during char count (tags): ${patternStr}`, error);
      }
    });
  }

  if (useCustomBlockSeparator && blockSeparators && blockSeparators.length > 0) {
    blockSeparators.forEach(separator => {
      if (separator.trim().length > 0) {
        try {
          const escapedSeparator = separator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedSeparator, 'g');
          cleanText = cleanText.replace(regex, '');
        } catch (error) {
          console.warn(`Invalid regex for block separator during char count: ${separator}`, error);
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
  simplifiedRender = false, // Default to false if not provided
  setIsOverflowing, 
  onNestedSettingsChange, 
  showPixelMarginGuides, 
  isReadOnlyPreview = false 
}, ref) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const contentBoxRef = useRef<HTMLDivElement>(null); 
  const bitmapCharCache = useRef<Map<string, HTMLCanvasElement | null>>(new Map());
  const [bitmapCacheId, setBitmapCacheId] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartCoords = useRef({ x: 0, y: 0 });
  const initialTextPosition = useRef({ x: 0, y: 0 });

  const effectiveText = textOverride !== undefined ? textOverride : baseSettings.text;
  // Create effectiveSettings for internal use
  const settings: AppSettings = {
      ...baseSettings,
      text: effectiveText,
  };

  const { positionX, positionY, scaleX, scaleY, origin: transformOrigin } = settings.transform;
  const currentPreviewZoom = settings.previewZoom || 1;


  const processedTextForLogic = processTextForPreview(
    settings.text,
    settings.hideTagsInPreview,
    settings.tagPatternsToHide,
    settings.blockSeparators,
    settings.useCustomBlockSeparator
  );

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
          // For simplified render, scrollWidth/Height might be less accurate if transforms are off.
          // This is an accepted trade-off for performance as per prior design.
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
          settings.text, 
          settings.tagPatternsToHide,
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
      settings.text, // derived from effectiveText
      settings.systemFont, settings.bitmapFont, settings.currentFontType,
      settings.transform, settings.previewWidth, settings.previewHeight,
      settings.overflowDetectionMode, settings.maxCharacters, settings.hideTagsInPreview,
      settings.tagPatternsToHide, settings.blockSeparators, settings.useCustomBlockSeparator,
      settings.maxPixelHeight, settings.pixelOverflowMargins, settings.shadowEffect,
      settings.outlineEffect, settings.globalLineHeightFactor, settings.previewZoom,
      setIsOverflowing, ref, bitmapCacheId, currentPreviewZoom, isReadOnlyPreview, simplifiedRender 
    ]);


  useEffect(() => {
    if (settings.currentFontType === 'bitmap' && settings.bitmapFont.enabled && settings.bitmapFont.imageUrl && !simplifiedRender) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = settings.bitmapFont.imageUrl;
        img.onload = () => {
            const newCache = new Map<string, HTMLCanvasElement | null>();
            const {
              charWidth, charHeight, charMap,
              color: tintColor, enableTintColor,
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
                    const displayCharCanvas = document.createElement('canvas');
                    displayCharCanvas.width = effectiveCharWidth;
                    displayCharCanvas.height = charHeight;
                    newCache.set(char, displayCharCanvas);
                    continue; 
                }

                const tileX = (i % charsPerRow) * charWidth;
                const tileY = Math.floor(i / charsPerRow) * charHeight;

                const sourceCharCanvas = document.createElement('canvas');
                sourceCharCanvas.width = charWidth;
                sourceCharCanvas.height = charHeight;
                const sourceCtx = sourceCharCanvas.getContext('2d', { willReadFrequently: true });
                if (!sourceCtx) continue;
                sourceCtx.drawImage(img, tileX, tileY, charWidth, charHeight, 0, 0, charWidth, charHeight);

                if (enableColorRemoval && targetRgb) {
                    const imageData = sourceCtx.getImageData(0, 0, charWidth, charHeight);
                    const data = imageData.data;
                    for (let p = 0; p < data.length; p += 4) {
                        const r = data[p]; const g = data[p + 1]; const b = data[p + 2];
                        if (Math.abs(r - targetRgb.r) <= colorRemovalTolerance &&
                            Math.abs(g - targetRgb.g) <= colorRemovalTolerance &&
                            Math.abs(b - targetRgb.b) <= colorRemovalTolerance) {
                            data[p + 3] = 0; 
                        }
                    }
                    sourceCtx.putImageData(imageData, 0, 0);
                }
                if (enableTintColor) {
                    sourceCtx.globalCompositeOperation = 'source-in';
                    sourceCtx.fillStyle = tintColor;
                    sourceCtx.fillRect(0, 0, charWidth, charHeight);
                    sourceCtx.globalCompositeOperation = 'source-over'; 
                }

                if (enablePixelScanning) {
                    const imageData = sourceCtx.getImageData(0, 0, charWidth, charHeight);
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
                    newCache.set(char, null); 
                } else {
                    const displayCharCanvas = document.createElement('canvas');
                    displayCharCanvas.width = effectiveCharWidth;
                    displayCharCanvas.height = charHeight;
                    const displayCtx = displayCharCanvas.getContext('2d');
                    if (displayCtx && effectiveCharWidth > 0) { 
                        displayCtx.drawImage(sourceCharCanvas, 0, 0, effectiveCharWidth, charHeight, 0, 0, effectiveCharWidth, charHeight);
                    }
                    newCache.set(char, displayCharCanvas);
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
             setBitmapCacheId(id => id + 1); // Rerender to clear if switching to simplified or disabling bitmap
        }
    }
  }, [
      settings.bitmapFont.imageUrl, settings.bitmapFont.charWidth, settings.bitmapFont.charHeight,
      settings.bitmapFont.charMap, settings.bitmapFont.color, settings.bitmapFont.enableTintColor,
      settings.bitmapFont.colorToRemove, settings.bitmapFont.enableColorRemoval,
      settings.bitmapFont.colorRemovalTolerance, settings.bitmapFont.enablePixelScanning,
      settings.bitmapFont.spaceWidthOverride,
      settings.currentFontType, settings.bitmapFont.enabled,
      simplifiedRender // Add simplifiedRender as a dependency
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
      
      // Use onNestedSettingsChange from baseSettings context for updates
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
    const textForVisualProcessing = processTextForPreview(
        settings.text,
        settings.hideTagsInPreview,
        settings.tagPatternsToHide,
        settings.blockSeparators,
        settings.useCustomBlockSeparator
    );

    if (simplifiedRender && settings.currentFontType === 'bitmap') {
        // Simplified placeholder for bitmap fonts when simplifiedRender is true
        const simplifiedBitmapStyle: CSSProperties = {
            ...textTransformStyle, // Includes cursor, but no actual transform
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%',
            fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#888',
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
      const { charHeight, spacing, zoom } = settings.bitmapFont;
      const baseCharPixelHeight = charHeight * zoom;
      const actualLineHeightPx = baseCharPixelHeight * settings.globalLineHeightFactor;
      const effectiveSpacing = spacing * zoom;
      
      const bitmapTextContent = trimLeadingAndTrailingEmptyLines(textForVisualProcessing.replace(/\r/g, ''));
      const lines = bitmapTextContent.split('\n');


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
          <div 
            ref={textContainerRef} style={bitmapContainerStyle}
          >
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} style={{ display: 'flex', height: `${actualLineHeightPx}px`, alignItems: 'center' }}>
                {line.split('').map((char, charIndex) => {
                  const cachedAsset = bitmapCharCache.current.get(char);

                  if (cachedAsset === null) { 
                    return <div key={charIndex} style={{ width: 0, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                  }
                  
                  if (cachedAsset instanceof HTMLCanvasElement) {
                    const displayCanvas = cachedAsset;
                    const displayWidth = displayCanvas.width * zoom; 
                    const displayHeight = displayCanvas.height * zoom; 

                    if (displayWidth === 0 && displayHeight === 0 && char !== ' ') { 
                         return <div key={charIndex} style={{ width: 0, height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                    }
                    if (displayWidth === 0 && displayHeight > 0 && char !== ' ') { 
                         return <div key={charIndex} style={{ width: 0, height: `${displayHeight}px`, marginRight: `${effectiveSpacing}px` }} />;
                    }

                    return (
                      <img
                        key={charIndex}
                        src={displayCanvas.toDataURL()}
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
                  if (char === '\r') {
                      return null; 
                  }
                  const fallbackColor = settings.bitmapFont.enableTintColor ? settings.bitmapFont.color : '#000000';
                  return (
                    <span key={charIndex} style={{
                        width: `${settings.bitmapFont.charWidth * zoom}px`, 
                        height: `${baseCharPixelHeight}px`, marginRight: `${effectiveSpacing}px`, display: 'inline-block',
                        color: fallbackColor, fontFamily: 'monospace', fontSize: `${baseCharPixelHeight*0.8}px`,
                        lineHeight: `${baseCharPixelHeight}px`, textAlign: 'center', overflow: 'hidden'
                      }} >
                      {char === ' ' ? '\u00A0' : '?'} 
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default to System Font rendering if not bitmap or if bitmap is simplified (unless handled above)
    const systemTextContent = trimLeadingAndTrailingEmptyLines(textForVisualProcessing);

    const measurableDivStyle: CSSProperties = {
        ...textTransformStyle, display: 'inline-block', maxWidth: '100%',
    };
    const textSpanStyle: CSSProperties = {
        fontFamily: settings.systemFont.fontFamily, fontSize: `${settings.systemFont.fontSize}px`,
        fontWeight: settings.systemFont.fontWeight, lineHeight: settings.globalLineHeightFactor, 
        letterSpacing: `${settings.systemFont.letterSpacing}px`, color: settings.systemFont.color,
        textAlign: settings.systemFont.textAlignHorizontal, whiteSpace: 'pre-wrap',
        wordBreak: 'break-word', overflowWrap: 'break-word', display: 'block',
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
        <div 
          ref={textContainerRef} style={measurableDivStyle}
        >
          <span style={textSpanStyle}>{systemTextContent}</span>
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
        className="preview-box border-2 border-dashed border-yellow-500 dark:border-yellow-700 relative"
        style={{
          width: settings.previewWidth > 0 ? `${settings.previewWidth}px` : 'auto',
          height: settings.previewHeight > 0 ? `${settings.previewHeight}px` : 'auto',
          minWidth: settings.previewWidth === 0 ? '150px': undefined,
          minHeight: settings.previewHeight === 0 ? '100px': undefined,
          backgroundColor: settings.backgroundColor,
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

// Memoize PreviewArea for performance.
// A custom comparison function might be needed if deep comparison of settings is too slow,
// but for now, React.memo with the refactored props should be a good improvement.
const PreviewArea = React.memo(PreviewAreaInner);
PreviewArea.displayName = 'PreviewArea';

export default PreviewArea;
