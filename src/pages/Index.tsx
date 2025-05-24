import { useState, useEffect, useMemo } from "react";
import defaultScript from "@/data/default-script/default script.txt?raw";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Preview from "@/components/Preview";
import Settings from "@/components/Settings";
import { TextBlock, PreviewSettings, defaultSettings } from "@/types/preview";
import ConfigGallery from "@/components/ConfigGallery";
import { SunIcon, MoonIcon, ArrowUpIcon, FilterIcon, HelpCircle } from "lucide-react";
import { ThemeProvider, useTheme } from 'next-themes';
import VirtualizedBlocks from '@/components/VirtualizedBlocks';
import Celebration from '@/components/Celebration';
import { QRCodeSVG } from 'qrcode.react';
import Tutorial from "@/components/Tutorial";

const BananaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
    <path d="M12 3c-1.5 0-2.625.75-3.75 1.875C7.125 6 6 7.5 6 9c0 1.875.75 3.375 2.25 4.5 1.125.75 2.25 1.125 3.375 1.125 1.5 0 2.625-.375 3.75-1.125C16.875 12.375 18 10.875 18 9c0-1.5-1.125-3-2.25-4.125C14.625 3.75 13.5 3 12 3z" fill="currentColor"/>
  </svg>
);

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return isVisible ? (
    <Button
      className="fixed bottom-4 right-4 rounded-full p-2"
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <ArrowUpIcon className="h-4 w-4" />
    </Button>
  ) : null;
};

const HelpButton = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-20"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About & Support</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">GitHub Repository</h4>
            <a 
              href="https://github.com/Dyeus-Phater/Banana-Vision" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              https://github.com/Dyeus-Phater/Banana-Vision
            </a>
          </div>
          <div>
            <h4 className="font-medium mb-2">Support via Lightning Network</h4>
            <div className="flex justify-center">
              <QRCodeSVG 
                value="lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhhgctdv4exjcmgv9exgdek8pvr5f"
                size={200}
              />
            </div>
            <p className="mt-2 text-sm text-center text-muted-foreground break-all">
            lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhhgctdv4exjcmgv9exgdek8pvr5f
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('banana');
    else setTheme('light');
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      className="fixed top-4 right-4"
    >
      {theme === 'light' && <SunIcon className="h-4 w-4" />}
      {theme === 'dark' && <MoonIcon className="h-4 w-4" />}
      {theme === 'banana' && <BananaIcon />}
    </Button>
  );
};

const BLOCKS_PER_PAGE = 5;

const Index = () => {
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [currentBlock, setCurrentBlock] = useState<TextBlock | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [originalFilename, setOriginalFilename] = useState<string>("modified_text.txt");
  const [settings, setSettings] = useState<PreviewSettings>(() => ({
    ...defaultSettings,
    textShadow: {
      offsetX: 0,
      offsetY: 0,
      blur: 0,
      color: "#000000"
    }
  }));
  const [showOnlyOverflow, setShowOnlyOverflow] = useState(false);
  const [overflowingBlocks, setOverflowingBlocks] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadDefaultScript = async () => {
      try {
        const content = defaultScript;
        let blocks: string[] = [content];
        
        if (settings.useCustomBlockSeparator && settings.blockSeparators.length > 0) {
          // Apply each separator in sequence, but preserve the separators
          for (const separator of settings.blockSeparators) {
            const regex = new RegExp(`(${separator})`);
            blocks = blocks.flatMap(block => {
              const parts = block.split(regex);
              // Recombine parts to preserve separators
              const result: string[] = [];
              for (let i = 0; i < parts.length; i++) {
                if (i % 2 === 0) { // Content part
                  if (parts[i].trim() !== '') {
                    result.push(parts[i]);
                  }
                } else { // Separator part
                  // Add separator to the previous block if it exists
                  if (result.length > 0) {
                    result[result.length - 1] += parts[i] + '\n'; // Add newline after separator
                  } else if (parts[i].trim() !== '') {
                    // If there's no previous block, create a new one with just the separator
                    result.push(parts[i] + '\n'); // Add newline after separator
                  }
                }
              }
              return result;
            });
          }
        } else {
          blocks = content.split(/\n\s*\n/);
        }
        
        const textBlocks: TextBlock[] = blocks
          .filter(block => block.trim() !== "")
          .map((block, index) => ({
            content: block.trim(),
            index,
          }));
        setTextBlocks(textBlocks);
        setCurrentBlock(textBlocks[0] || null);
      } catch (error) {
        console.error('Error loading default script:', error);
      }
    };

    if (textBlocks.length === 0) {
      loadDefaultScript();
    }
  }, []);

  const blocksToShow = useMemo(() => {
    return showOnlyOverflow
      ? textBlocks.filter(block => overflowingBlocks.has(block.index)).sort((a, b) => a.index - b.index)
      : textBlocks;
  }, [textBlocks, showOnlyOverflow, overflowingBlocks]);

  const totalPages = useMemo(() => {
    const filteredBlocks = showOnlyOverflow
      ? textBlocks.filter(block => overflowingBlocks.has(block.index))
      : textBlocks;
    return Math.ceil(filteredBlocks.length / BLOCKS_PER_PAGE);
  }, [textBlocks, showOnlyOverflow, overflowingBlocks]);

  const handleOverflowChange = (blockIndex: number, isOverflowing: boolean) => {
    setOverflowingBlocks(prev => {
      const newSet = new Set(prev);
      if (isOverflowing) {
        newSet.add(blockIndex);
      } else {
        newSet.delete(blockIndex);
      }
      return newSet;
    });
  };

  const allOverflowsFixed = overflowingBlocks.size === 0 && textBlocks.length > 0 && showOnlyOverflow;

  const handleClearFiles = () => {
    setBackgroundImage("");
    setImageSize({ width: 0, height: 0 });
    setTextBlocks([]);
    setCurrentBlock(null);
    setSettings(prev => ({
      ...defaultSettings,
      isConfigMinimized: prev.isConfigMinimized
    }));
    toast("All files cleared");
  };

  const handleTextFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setOriginalFilename(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      let content: string;
      let encodingUsed = "UTF-8";
      
      try {
        // First try UTF-8
        const utf8Decoder = new TextDecoder('utf-8');
        content = utf8Decoder.decode(e.target?.result as ArrayBuffer);
        
        // Check if UTF-8 decoding produced valid results
        if (content.includes('�')) {
          throw new Error("UTF-8 decoding produced replacement characters");
        }
      } catch (error) {
        try {
          // Try ANSI (Windows-1252) if UTF-8 fails
          const ansiDecoder = new TextDecoder('windows-1252');
          const ansiContent = ansiDecoder.decode(e.target?.result as ArrayBuffer);
          const encoder = new TextEncoder();
          const decoder = new TextDecoder('utf-8');
          content = decoder.decode(encoder.encode(ansiContent));
          encodingUsed = "ANSI (Windows-1252)";
        } catch (ansiError) {
          // Fallback to string conversion as last resort
          content = e.target?.result as string;
          encodingUsed = "Unknown";
        }
      }
      
      let blocks = [content];
      
      if (settings.useCustomBlockSeparator && settings.blockSeparators.length > 0) {
        // Apply each separator in sequence, but preserve the separators
        for (const separator of settings.blockSeparators) {
          const regex = new RegExp(`(${separator})`);
          blocks = blocks.flatMap(block => {
            const parts = block.split(regex);
            // Recombine parts to preserve separators
            const result = [];
            for (let i = 0; i < parts.length; i++) {
              if (i % 2 === 0) { // Content part
                if (parts[i].trim() !== '') {
                  result.push(parts[i]);
                }
              } else { // Separator part
                // Add separator to the previous block if it exists
                if (result.length > 0) {
                  result[result.length - 1] += parts[i] + '\n'; // Add newline after separator
                } else if (parts[i].trim() !== '') {
                  // If there's no previous block, create a new one with just the separator
                  result.push(parts[i] + '\n'); // Add newline after separator
                }
              }
            }
            return result;
          });
        }
      } else {
        blocks = content.split(/\n\s*\n/);
      }
      
      const textBlocks = blocks
        .filter(block => block.trim() !== "")
        .map((block, index) => ({
          content: block.trim(),
          index,
        }));
      setTextBlocks(textBlocks);
      setCurrentBlock(textBlocks[0] || null);
      toast("Text file loaded successfully");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBackgroundImage(dataUrl);
      setSettings(prev => ({ ...prev, backgroundImage: dataUrl }));

      const img = new Image();
      img.onload = () => {
        setImageSize({
          width: img.width,
          height: img.height,
        });
      };
      img.src = dataUrl;
      toast("Background image loaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleFontUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fontFace = new FontFace("CustomGameFont", e.target?.result as ArrayBuffer);
      fontFace.load().then((loadedFace) => {
        document.fonts.add(loadedFace);
        setSettings(prev => ({ ...prev, fontFamily: "CustomGameFont" }));
        toast("Font loaded successfully");
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings({
          ...defaultSettings,
          ...importedSettings,
          textShadow: {
            offsetX: importedSettings.textShadow?.offsetX ?? 0,
            offsetY: importedSettings.textShadow?.offsetY ?? 0,
            blur: importedSettings.textShadow?.blur ?? 0,
            color: importedSettings.textShadow?.color ?? "#000000"
          }
        });
        if (importedSettings.backgroundImage) {
          setBackgroundImage(importedSettings.backgroundImage);
          const img = new Image();
          img.onload = () => {
            setImageSize({
              width: img.width,
              height: img.height,
            });
          };
          img.src = importedSettings.backgroundImage;
        }
        toast("Settings imported successfully");
      } catch (error) {
        toast("Error importing settings");
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (newContent: string, blockIndex: number) => {
    const updatedBlocks = textBlocks.map((block) =>
      block.index === blockIndex
        ? { ...block, content: newContent }
        : block
    );
    setTextBlocks(updatedBlocks);
    
    if (settings.displayMode === 'single' && currentBlock?.index === blockIndex) {
      setCurrentBlock({ ...currentBlock, content: newContent });
    }
  };

  const handleSave = () => {
    let content;
    
    if (settings.useCustomBlockSeparator && settings.blockSeparators.length > 0) {
      // When using custom separators, we need to ensure each block ends with a newline
      // to preserve formatting after separators
      content = textBlocks.map((block) => block.content.endsWith('\n') ? block.content : block.content + '\n').join("");
    } else {
      // Default behavior: join blocks with double newlines
      content = textBlocks.map((block) => block.content).join("\n\n");
    }
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = originalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("File saved successfully");
  };

  const exportSettings = () => {
    const exportData = {
      ...settings,
      backgroundImage: backgroundImage || null,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "preview_settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Settings exported successfully");
  };

  const handleNextBlock = () => {
    if (currentBlock && textBlocks.length > 0) {
      const currentIndex = currentBlock.index;
      const nextBlock = textBlocks.find(block => block.index > currentIndex);
      if (nextBlock) {
        setCurrentBlock(nextBlock);
      }
    }
  };

  const handlePreviousBlock = () => {
    if (currentBlock && textBlocks.length > 0) {
      const currentIndex = currentBlock.index;
      const previousBlocks = textBlocks.filter(block => block.index < currentIndex);
      if (previousBlocks.length > 0) {
        setCurrentBlock(previousBlocks[previousBlocks.length - 1]);
      }
    }
  };

  return (
    <ThemeProvider themes={['light', 'dark', 'banana']}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <Celebration isActive={allOverflowsFixed} />
        <div className="p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">🍌Banana Vision</h1>
              <div className="flex gap-2">
                <HelpButton />
                <ThemeToggle />
              </div>
            </div>

            <div data-tutorial="profiles">
              <ConfigGallery 
              onSelectConfig={(newSettings) => {
                setSettings(prev => ({
                  ...newSettings,
                  isConfigMinimized: prev.isConfigMinimized,
                  isPresetsMinimized: prev.isPresetsMinimized
                }));
                if (newSettings.backgroundImage) {
                  setBackgroundImage(newSettings.backgroundImage);
                  const img = new Image();
                  img.onload = () => {
                    setImageSize({
                      width: img.width,
                      height: img.height,
                    });
                  };
                  img.src = newSettings.backgroundImage;
                }
                toast("Style preset applied successfully");
              }}
              settings={settings}
              onSettingsChange={setSettings}
            />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-300" style={{
              gridTemplateColumns: settings.isConfigMinimized ? "80px 1fr" : "1fr 1fr"
            }}>
              <Card className={`p-6 transition-all duration-300 overflow-hidden ${settings.isConfigMinimized ? "minimized-config" : ""}`} data-tutorial="font-settings">
                <Settings
                  settings={settings}
                  onSettingsChange={setSettings}
                  onFileUpload={{
                    text: handleTextFileUpload,
                    background: handleBackgroundUpload,
                    font: handleFontUpload,
                    settings: importSettings
                  }}
                  onClearFiles={handleClearFiles}
                  onExportSettings={exportSettings}
                  onToggleMinimize={() => setSettings(prev => ({ ...prev, isConfigMinimized: !prev.isConfigMinimized }))}
                />
              </Card>

              <Card className="p-6 space-y-6 transition-all duration-300" data-tutorial="preview">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">Text Preview</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowOnlyOverflow(!showOnlyOverflow)}
                      className={showOnlyOverflow ? "bg-primary text-primary-foreground" : ""}
                      title={showOnlyOverflow ? "Show all blocks" : "Show only overflowing blocks"}
                    >
                      <FilterIcon className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                </div>
                
                {settings.displayMode === 'single' ? (
                  <>
                    <Preview
                      block={currentBlock}
                      settings={settings}
                      backgroundImage={backgroundImage}
                      imageSize={imageSize}
                      onOverflowChange={isOverflowing => 
                        currentBlock && handleOverflowChange(currentBlock.index, isOverflowing)
                      }
                    />
                    <div className="space-y-4">
                      <Textarea
                        value={currentBlock?.content || ""}
                        onChange={(e) => handleTextChange(e.target.value, currentBlock?.index || 0)}
                        placeholder="No text block selected"
                        className="min-h-[200px] font-mono"
                        disabled={!currentBlock}
                      />
                      <div className="flex justify-between">
                        <Button
                          onClick={handlePreviousBlock}
                          disabled={!currentBlock || currentBlock.index === textBlocks[0]?.index}
                        >
                          Previous Block
                        </Button>
                        <Button
                          onClick={handleNextBlock}
                          disabled={!currentBlock || currentBlock.index === textBlocks[textBlocks.length - 1]?.index}
                        >
                          Next Block
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <VirtualizedBlocks
                    blocks={blocksToShow}
                    settings={settings}
                    backgroundImage={backgroundImage}
                    imageSize={imageSize}
                    onOverflowChange={handleOverflowChange}
                    onTextChange={handleTextChange}
                  />
                )}
              </Card>
            </div>
          </div>
        </div>
        <ScrollToTop />
        <Tutorial 
          isOpen={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
          onComplete={() => setIsTutorialOpen(false)}
        />
      </div>
    </ThemeProvider>
  );
};

export default Index;
