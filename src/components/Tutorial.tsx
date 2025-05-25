import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
}

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Banana Vision!',
    content: 'Hi there! I\'m your friendly banana guide. Let me show you how to create amazing text previews with this tool!',
    position: 'center'
  },
  {
    id: 'dialog-separator',
    title: 'Custom Dialog Separator',
    content: 'If your text file uses a specific tag or character sequence to separate dialogue lines, you can define it here. This helps the tool process your text correctly. Do this process before opening any script, or the script will not open correctly, right?',
    targetSelector: '[data-tutorial="dialog-separator-checkbox"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'background',
    title: 'Customize Background',
    content: 'Upload a background image or choose a solid color to see how your text will look in different contexts.',
    targetSelector: '[data-tutorial="font-settings"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'text-input',
    title: 'Enter Your Text',
    content: 'Start by opening your script in "Text File" or typing the text you want to preview in the text area. You can enter multiple lines and see them rendered in real-time!',
    targetSelector: 'textarea',
    position: 'left',
    highlight: true
  },

  {
    id: 'font-settings',
    title: 'Configure Font Settings',
    content: 'Upload your TTF font or bitmap font image and adjust settings like character width, height, and spacing to match your font specifications.',
    targetSelector: '[data-tutorial="font-settings"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'character-sequence',
    title: 'Set Character Sequence',
    content: 'Define the order of characters in your bitmap font. This tells the tool how to map each character in your text to the correct position in the font image.',
    targetSelector: '[data-tutorial="font-settings"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'preview',
    title: 'Live Preview',
    content: 'Watch your text come to life! The preview updates automatically as you make changes. You can see exactly how your text preview will look.',
    targetSelector: '[data-tutorial="preview"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'profiles',
    title: 'Save Your Work',
    content: 'Create profiles to save your favorite configurations. You can quickly switch between different font setups and share your creations!',
    targetSelector: '[data-tutorial="profiles"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    content: 'Congratulations! You now know how to use Banana Vision. Start creating beautiful text previews and have fun experimenting!',
    position: 'center'
  }
];

const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = tutorialSteps[currentStep];

  useEffect(() => {
    if (!isOpen) return;

    const updateTooltipPosition = () => {
      if (step.position === 'center') {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        setTooltipPosition({ x: centerX, y: centerY });
        return;
      }

      if (step.targetSelector) {
        const target = document.querySelector(step.targetSelector) as HTMLElement;
        if (target) {
          const rect = target.getBoundingClientRect();
          let x = 0, y = 0;

          switch (step.position) {
            case 'top':
              x = rect.left + rect.width / 2;
              y = rect.top - 20;
              break;
            case 'bottom':
              x = rect.left + rect.width / 2;
              y = rect.bottom + 20;
              break;
            case 'left':
              x = rect.left - 20;
              y = rect.top + rect.height / 2;
              break;
            case 'right':
              x = rect.right + 20;
              y = rect.top + rect.height / 2;
              break;
          }

          // Calculate potential tooltip position
          let finalX = x;
          let finalY = y;

          // Get tooltip dimensions (approximate or measure after render)
          const tooltipWidth = tooltipRef.current?.offsetWidth || 320; // Use max-width as fallback
          const tooltipHeight = tooltipRef.current?.offsetHeight || 200; // Estimate height

          // Adjust position if it goes off-screen
          if (step.position === 'top') {
            if (finalY - tooltipHeight < 0) { // If top edge is above viewport
              finalY = rect.bottom + 20; // Move to bottom
            }
          } else if (step.position === 'bottom') {
            if (finalY + tooltipHeight > window.innerHeight) { // If bottom edge is below viewport
              finalY = rect.top - 20; // Move to top
            }
          } else if (step.position === 'left') {
            if (finalX - tooltipWidth < 0) { // If left edge is left of viewport
              finalX = rect.right + 20; // Move to right
            }
          } else if (step.position === 'right') {
            if (finalX + tooltipWidth > window.innerWidth) { // If right edge is right of viewport
              finalX = rect.left - 20; // Move to left
            }
          }

          // Ensure it's not off-screen horizontally if moved vertically
          if (finalX - tooltipWidth / 2 < 0) {
              finalX = tooltipWidth / 2 + 10; // Add some padding
          } else if (finalX + tooltipWidth / 2 > window.innerWidth) {
              finalX = window.innerWidth - tooltipWidth / 2 - 10; // Add some padding
          }

          // Ensure it's not off-screen vertically if moved horizontally
           if (finalY - tooltipHeight / 2 < 0) {
              finalY = tooltipHeight / 2 + 10; // Add some padding
          } else if (finalY + tooltipHeight / 2 > window.innerHeight) {
              finalY = window.innerHeight - tooltipHeight / 2 - 10; // Add some padding
          }

          setTooltipPosition({ x: finalX, y: finalY });

          // Highlight target element
          if (step.highlight && target) {
            target.style.position = 'relative';
            target.style.zIndex = '1001';
            target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
            target.style.borderRadius = '8px';
            target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            target.style.transition = 'all 0.3s ease-in-out';
            
            // Scroll to the target element
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    };

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
      
      // Remove highlights
      if (step.targetSelector && step.highlight) {
        const target = document.querySelector(step.targetSelector) as HTMLElement;
        if (target) {
          target.style.position = '';
          target.style.zIndex = '';
          target.style.boxShadow = '';
          target.style.borderRadius = '';
          target.style.backgroundColor = '';
          target.style.transition = '';
        }
      }
    };
  }, [currentStep, isOpen, step]);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  const handleClose = () => {
    // Remove any remaining highlights
    tutorialSteps.forEach(step => {
      if (step.targetSelector && step.highlight) {
        const target = document.querySelector(step.targetSelector) as HTMLElement;
        if (target) {
          target.style.position = '';
          target.style.zIndex = '';
          target.style.boxShadow = '';
          target.style.borderRadius = '';
          target.style.backgroundColor = '';
          target.style.transition = '';
        }
      }
    });
    onClose();
  };

  const restartTutorial = () => {
    setCurrentStep(0);
  };

  if (!isOpen) return null;

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: step.position === 'center' ? '50%' : tooltipPosition.x,
    top: step.position === 'center' ? '50%' : tooltipPosition.y,
    transform: step.position === 'center' ? 'translate(-50%, -50%)' : 
               step.position === 'top' ? 'translate(-50%, -100%)' :
               step.position === 'bottom' ? 'translate(-50%, 0%)' :
               step.position === 'left' ? 'translate(-100%, -50%)' :
               'translate(0%, -50%)',
    zIndex: 1002,
    maxWidth: '320px',
    minWidth: '280px'
  };

  return (
    <>
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 z-1000"
        onClick={handleClose}
      />
      
      {/* Tutorial Tooltip */}
      <div ref={tooltipRef} style={tooltipStyle}>
        <Card className="p-4 shadow-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
          {/* Header with Banana Mascot */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0">
              <img 
                src="/dancing-banana-happy.gif" 
                alt="Banana Mascot" 
                className="w-12 h-12 rounded-full border-2 border-yellow-400"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800">{step.title}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClose}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed">{step.content}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
              <span>{Math.round(((currentStep + 1) / tutorialSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={prevStep}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Previous
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={restartTutorial}
                className="flex items-center gap-1 text-gray-600"
              >
                <RotateCcw className="h-3 w-3" />
                Restart
              </Button>
            </div>

            <Button 
              onClick={nextStep}
              size="sm"
              className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white flex items-center gap-1"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < tutorialSteps.length - 1 && <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
};

export default Tutorial;