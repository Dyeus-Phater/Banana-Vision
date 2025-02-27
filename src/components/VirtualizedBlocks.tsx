import React, { useEffect, useRef, useState } from 'react';
import { TextBlock, PreviewSettings } from '@/types/preview';
import Preview from './Preview';
import { Textarea } from './ui/textarea';

interface VirtualizedBlocksProps {
  blocks: TextBlock[];
  settings: PreviewSettings;
  backgroundImage: string;
  imageSize: { width: number; height: number };
  onOverflowChange: (blockIndex: number, isOverflowing: boolean) => void;
  onTextChange: (newContent: string, blockIndex: number) => void;
}

const BLOCK_HEIGHT = 400; // Reduced from 500 to 400 for more compact layout
const BUFFER_SIZE = 3;

const VirtualizedBlocks: React.FC<VirtualizedBlocksProps> = ({
  blocks,
  settings,
  backgroundImage,
  imageSize,
  onOverflowChange,
  onTextChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: blocks.length });

  useEffect(() => {
    const updateVisibleBlocks = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // When showing all blocks, use virtualization
      if (blocks.length > 10) {
        const startIndex = Math.max(0, Math.floor(scrollTop / BLOCK_HEIGHT) - BUFFER_SIZE);
        const endIndex = Math.min(
          blocks.length,
          Math.ceil((scrollTop + containerHeight) / BLOCK_HEIGHT) + BUFFER_SIZE
        );
        setVisibleRange({ start: startIndex, end: endIndex });
      } else {
        // When showing only overflowing blocks or few blocks, show all of them
        setVisibleRange({ start: 0, end: blocks.length });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateVisibleBlocks);
      window.addEventListener('resize', updateVisibleBlocks);
      updateVisibleBlocks();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', updateVisibleBlocks);
        window.removeEventListener('resize', updateVisibleBlocks);
      }
    };
  }, [blocks.length]);

  return (
    <div
      ref={containerRef}
      className="space-y-2 overflow-y-auto"
      style={{
        height: blocks.length <= 10 ? 'auto' : 'calc(100vh - 2px)',
        maxHeight: 'calc(100vh - 2px)',
        padding: '0.25rem'
      }}
    >
      <div
        style={{
          height: blocks.length <= 10 ? 'auto' : blocks.length * BLOCK_HEIGHT,
          position: 'relative',
        }}
      >
        {blocks.slice(visibleRange.start, visibleRange.end).map((block) => (
          <div
            key={block.index}
            className="space-y-1"
            style={{
              position: blocks.length <= 10 ? 'relative' : 'absolute',
              top: blocks.length <= 10 ? 'auto' : block.index * BLOCK_HEIGHT,
              left: 0,
              right: 0,
              padding: '0.5rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              margin: '0.125rem 0'
            }}
          >
            <Preview
              block={block}
              settings={settings}
              backgroundImage={backgroundImage}
              imageSize={imageSize}
              onOverflowChange={(isOverflowing) =>
                onOverflowChange(block.index, isOverflowing)
              }
            />
            <Textarea
              value={block.content}
              onChange={(e) => onTextChange(e.target.value, block.index)}
              className="min-h-[100px] font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualizedBlocks;