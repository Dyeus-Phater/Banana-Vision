
import React from 'react';
import BartyBanana from './BartyBanana';
import { Button } from './ControlsPanel'; // Re-use styled Button

interface TutorialStepContent {
  title: string;
  speech: React.ReactNode; // Can include JSX for emphasis or links
}

const TUTORIAL_STEPS: TutorialStepContent[] = [
  {
    title: "Welcome to Banana Vision!",
    speech: (
      <>
        Hey there, pixel pioneer! I'm <strong className="text-[var(--bv-accent-primary)]">Barty</strong>, your guide to Banana Vision!
        Ready to make some text-tastic magic? Let's peel back the layers of this app!
        Banana Vision helps you preview how your text will look in games or other projects.
      </>
    ),
  },
  {
    title: "Loading Your Scripts",
    speech: (
      <>
        First things first, let's get your script loaded! Head over to the{' '}
        <strong className="text-[var(--bv-accent-primary)]">Controls Panel</strong> on the left.
        Under <strong className="text-[var(--bv-accent-secondary)]">"Script Management"</strong>, click{' '}
        <strong className="text-[var(--bv-accent-secondary)]">"Load Main Script(s)"</strong> to pick your text file(s).
        This is where your editable text will live! You can also load <strong className="text-[var(--bv-accent-secondary)]">"Original Script(s)"</strong> if you want to compare versions.
        <br /><br />
        <strong>Pro Tip:</strong> Before uploading, you can choose how your script is divided into blocks: by <strong className="text-[var(--bv-accent-primary)]">treating each line as a block</strong>, using <strong className="text-[var(--bv-accent-primary)]">custom block separators</strong> (like <code>&lt;PAGE&gt;</code>), or the default double newline. Also, define <strong className="text-[var(--bv-accent-primary)]">custom line break tags</strong> (like <code>&lt;br&gt;</code>) that will automatically turn into newlines in your preview!
      </>
    ),
  },
  {
    title: "Active Script & Blocks",
    speech: (
      <>
        See your loaded script(s) in the <strong className="text-[var(--bv-accent-secondary)]">"Loaded Main Scripts"</strong> list? Click one to make it active!
        If you're in <strong className="text-[var(--bv-accent-primary)]">"Single Block View"</strong> (check under Script Management), you'll see its blocks under{' '}
        <strong className="text-[var(--bv-accent-secondary)]">"Block Navigation"</strong>. Click a block there to edit its content in the text area below the main preview.
      </>
    ),
  },
  {
    title: "The Preview Area",
    speech: (
      <>
        Look right! That central area is the <strong className="text-[var(--bv-accent-primary)]">Preview Area</strong>.
        What you type in the <strong className="text-[var(--bv-accent-secondary)]">"Current Block Content"</strong> box (in Single View) or in a block's specific text area (in "All Blocks View") shows up here, styled just how you set it!
      </>
    ),
  },
  {
    title: "Font Fun: System Fonts",
    speech: (
      <>
        Let's talk fonts! In the <strong className="text-[var(--bv-accent-secondary)]">"Font Type & Styling"</strong> section, choose <strong className="text-[var(--bv-accent-primary)]">"System Font"</strong>.
        Pick a font family, adjust its size, color, and spacing.
        Need precise control over spaces? Use the <strong className="text-[var(--bv-accent-primary)]">"Space Width Override"</strong>.
        Feeling fancy? Select <strong className="text-[var(--bv-accent-secondary)]">"Custom..."</strong> to load your own .ttf or .otf font file!
      </>
    ),
  },
  {
    title: "Font Fun: Bitmap Fonts",
    speech: (
      <>
        Or, feeling retro? Select <strong className="text-[var(--bv-accent-primary)]">"Bitmap Font"</strong>!
        You'll need to upload your font image, define character width & height, and type out the characters in your image into the <strong className="text-[var(--bv-accent-secondary)]">"Character Map"</strong> field.
        If your font sheet has gaps between tiles, use <strong className="text-[var(--bv-accent-primary)]">"Tile Separation X/Y"</strong>.
        <br /><br />
        Explore advanced options like <strong className="text-[var(--bv-accent-primary)]">"Pixel Scanning"</strong> for variable width characters, <strong className="text-[var(--bv-accent-primary)]">"Color Removal"</strong> to make parts of your font transparent, applying a <strong className="text-[var(--bv-accent-primary)]">"Tint Color"</strong>, or setting a custom <strong className="text-[var(--bv-accent-primary)]">"Space Width Override"</strong>. It's like a tiny pixel puzzle!
      </>
    ),
  },
  {
    title: "Position & Scale",
    speech: (
      <>
        Want to nudge your text around or make it <strong className="text-[var(--bv-accent-primary)]">BIGGER</strong>? The <strong className="text-[var(--bv-accent-secondary)]">"Text Position & Scale"</strong> section is your friend.
        Adjust X/Y for position, Scale X/Y for size. You can even drag the text directly in the preview area if it's not read-only!
      </>
    ),
  },
  {
    title: "Awesome Effects",
    speech: (
      <>
        Need some <strong className="text-[var(--bv-accent-primary)]">POP</strong>? In the <strong className="text-[var(--bv-accent-secondary)]">"Effects"</strong> section, toggle <strong className="text-[var(--bv-accent-secondary)]">"Shadow Enabled"</strong> or <strong className="text-[var(--bv-accent-secondary)]">"Outline Enabled"</strong> to add depth.
        Adjust offsets, blur, and colors to get it just right!
      </>
    ),
  },
   {
    title: "Overflow Control",
    speech: (
      <>
        Text not fitting? The <strong className="text-[var(--bv-accent-secondary)]">"Overflow Settings"</strong> section helps you detect when your text is too big for the preview box.
        This can be based on <strong className="text-[var(--bv-accent-primary)]">character count</strong> (too many letters on a line?) or <strong className="text-[var(--bv-accent-primary)]">pixel dimensions</strong>.
        For pixel-based, you can enable <strong className="text-[var(--bv-accent-primary)]">"Margin-Based Overflow"</strong>. Here, you can set top, right, bottom, and left margins. For each margin, you can even choose <strong className="text-[var(--bv-accent-primary)]">"Auto Line Break"</strong>; if checked, text will wrap at that margin without flagging an overflow for crossing it. If unchecked, crossing that margin flags an overflow.
        A red <strong className="text-red-500">"Overflow!"</strong> badge will appear on blocks that exceed limits.
      </>
    ),
  },
  {
    title: "Tag, You're It!",
    speech: (
      <>
        Got special tags like <code>&lt;PLAYER&gt;</code> or <code>[ITEM]</code> in your script?
        In <strong className="text-[var(--bv-accent-secondary)]">"Tag Handling & Colorization"</strong>, you can add RegEx patterns to hide these general tags from the preview.
        For colored text, use <strong className="text-[var(--bv-accent-primary)]">"Custom Color Tags"</strong> to define tags like <code>&lt;RED_TEXT&gt;</code>...<code>&lt;/RED_TEXT&gt;</code> and make your text shine!
        Want to insert small images like icons or emojis? Use the <strong className="text-[var(--bv-accent-primary)]">"Image Tags"</strong> feature to define a text tag (e.g., <code>[COIN]</code>) and associate it with an uploaded image.
      </>
    ),
  },
  {
    title: "Byte & Bit Power!",
    speech: (
      <>
        Working with strict memory limits, like in older game consoles? The <strong className="text-[var(--bv-accent-secondary)]">"Byte/Bit Counting & Restrictions"</strong> section is your ally!
        Define <strong className="text-[var(--bv-accent-primary)]">custom byte values</strong> for each character (e.g., 'A'=1 byte, '€'=2 bytes). Characters not in your map use a default value.
        In <strong className="text-[var(--bv-accent-primary)]">Comparison Mode</strong>, you can even <strong className="text-[var(--bv-accent-primary)]">enable byte restrictions</strong> to prevent your edited lines from exceeding the byte count of the original lines! The editor will show detailed byte counts per line.
      </>
    ),
  },
  {
    title: "Find, Replace, Conquer!",
    speech: (
      <>
        Need to make bulk changes? Open the <strong className="text-[var(--bv-accent-primary)]">"Find and Replace"</strong> panel!
        Search for text in the current block, active script, or all loaded scripts. You can specify case sensitivity and whole word matching.
        Replace found text one by one or all at once. The summary list helps you navigate through results quickly!
      </>
    ),
  },
  {
    title: "GitHub Sync Magic!",
    speech: (
      <>
        Keep your scripts in a GitHub repository? The <strong className="text-[var(--bv-accent-secondary)]">"GitHub Folder Sync"</strong> section is for you!
        Enter your Personal Access Token (PAT), repo details, and file/folder path. Then, you can <strong className="text-[var(--bv-accent-primary)]">load single files</strong> or <strong className="text-[var(--bv-accent-primary)]">all text files from a folder</strong> directly from GitHub.
        Made changes? <strong className="text-[var(--bv-accent-primary)]">Save your active script</strong> or <strong className="text-[var(--bv-accent-primary)]">all modified scripts</strong> back to your repository. Remember to use PATs with limited scope and expiration for security!
      </>
    ),
  },
  {
    title: "Saving Your Masterpiece",
    speech: (
      <>
        Made something awesome? Don't lose it! Use the <strong className="text-[var(--bv-accent-primary)]">"Script Menu"</strong> in the top toolbar.
        <strong className="text-[var(--bv-accent-secondary)]">"Save Active Script"</strong> saves the current one, and <strong className="text-[var(--bv-accent-secondary)]">"Save All Changed"</strong> zips up any scripts you've modified.
      </>
    ),
  },
  {
    title: "Exporting Goodies",
    speech: (
      <>
        Want to show off your preview? Click <strong className="text-[var(--bv-accent-primary)]">"Export PNG"</strong> in the toolbar.
        To save all your current styling settings (colors, fonts, sizes, etc.), use the <strong className="text-[var(--bv-accent-secondary)]">"JSON Menu"</strong> to <strong className="text-[var(--bv-accent-primary)]">"Export JSON"</strong>. You can <strong className="text-[var(--bv-accent-primary)]">"Import JSON"</strong> later to quickly get back to your favorite setup!
      </>
    ),
  },
  {
    title: "Themes & Special Settings",
    speech: (
      <>
        Feeling the vibe? Click the <strong className="text-[var(--bv-accent-primary)]">Gear icon (⚙️)</strong> in the header to open <strong className="text-[var(--bv-accent-secondary)]">"Special Settings"</strong>.
        Here you can cycle through built-in themes or even create your very own <strong className="text-[var(--bv-accent-primary)]">"Custom"</strong> theme by tweaking all the UI colors! You'll also find a link to the GitHub repo and a way to support the app if you're feeling generous.
      </>
    ),
  },
  {
    title: "Profile Power!",
    speech: (
      <>
        Got a specific set of preview settings you love? Save it as a <strong className="text-[var(--bv-accent-primary)]">Profile</strong>!
        Click the <strong className="text-[var(--bv-accent-secondary)]">"🖼️ Gallery"</strong> button in the toolbar. In the gallery, you can save your current editor settings with a name, and load them back with one click anytime!
      </>
    ),
  },
  {
    title: "You're a Pro!",
    speech: (
      <>
        And that's the grand tour! You're now a Banana Vision virtuoso! Go forth and create some a-peel-ing text.
        If you ever need a refresher, just click the <strong className="text-[var(--bv-accent-primary)]">Question Mark (?)</strong> button in the toolbar. Happy 'hacking!
      </>
    ),
  },
];


interface TutorialModalProps {
  isOpen: boolean;
  currentStep: number;
  onClose: (markAsCompleted: boolean) => void;
  onSetStep: (step: number) => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, currentStep, onClose, onSetStep }) => {
  if (!isOpen) return null;

  const totalSteps = TUTORIAL_STEPS.length;
  const currentContent = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      onSetStep(currentStep + 1);
    } else {
      onClose(true); // Mark completed on finishing last step
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      onSetStep(currentStep - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => onClose(currentStep === totalSteps - 1)} // Mark completed if closing on last step
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-speech"
    >
      <div
        className="bg-[var(--bv-modal-background,var(--bv-element-background))] text-[var(--bv-modal-text,var(--bv-text-primary))]
                   rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <BartyBanana className="w-16 h-16 mr-3 flex-shrink-0" />
            <div>
              <h2 id="tutorial-title" className="text-xl font-bold text-[var(--bv-accent-primary)]">
                {currentContent.title}
              </h2>
              <p className="text-sm text-[var(--bv-text-secondary)]">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose(currentStep === totalSteps - 1)}
            className="p-1.5 rounded-full hover:bg-[var(--bv-element-background-secondary)] text-[var(--bv-text-secondary)]"
            aria-label="Close Tutorial"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div id="tutorial-speech" className="text-sm space-y-2 mb-6 overflow-y-auto flex-grow pr-2 leading-relaxed">
          {currentContent.speech}
        </div>

        <div className="mt-auto flex justify-between items-center pt-4 border-t border-[var(--bv-border-color-light)]">
          <Button
            onClick={() => onClose(false)} // Don't mark completed if skipping
            className="!bg-[var(--bv-accent-secondary)] !text-[var(--bv-accent-secondary-content)]"
          >
            End Tutorial
          </Button>
          <div className="space-x-2">
            <Button onClick={handlePrev} disabled={currentStep === 0}>
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
