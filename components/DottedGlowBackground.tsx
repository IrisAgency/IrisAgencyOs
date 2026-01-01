import React, { useEffect, useRef } from 'react';

interface DottedGlowBackgroundProps {
  gap?: number;
  radius?: number;
  color?: string;
  glowColor?: string;
  speedScale?: number;
}

const DottedGlowBackground: React.FC<DottedGlowBackgroundProps> = ({
  gap = 24,
  radius = 1.5,
  color = 'rgba(255, 255, 255, 0.02)',
  glowColor = 'rgba(255, 255, 255, 0.15)',
  speedScale = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01 * speedScale;

      const cols = Math.ceil(canvas.width / gap);
      const rows = Math.ceil(canvas.height / gap);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * gap;
          const y = j * gap;

          // Simple wave effect for glow
          const dist = Math.sqrt(Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2));
          const wave = Math.sin(dist * 0.005 - time) * 0.5 + 0.5;
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          
          // Base color
          ctx.fillStyle = color;
          ctx.fill();

          // Glow effect
          if (wave > 0.8) {
            ctx.beginPath();
            ctx.arc(x, y, radius * (1 + wave), 0, Math.PI * 2);
            ctx.fillStyle = glowColor;
            ctx.globalAlpha = (wave - 0.8) * 2; // Fade in/out
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gap, radius, color, glowColor, speedScale]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default DottedGlowBackground;
