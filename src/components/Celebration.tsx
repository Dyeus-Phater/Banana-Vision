import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationProps {
  isActive: boolean;
}

const Celebration: React.FC<CelebrationProps> = ({ isActive }) => {
  useEffect(() => {
    if (isActive) {
      // Play celebration sound
      const audio = new Audio('/celebration.mp3');
      audio.play();

      // Launch confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6347']
        });

        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6347']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isActive]);

  return null;
};

export default Celebration;