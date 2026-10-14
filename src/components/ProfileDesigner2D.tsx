import React, { useRef, useEffect, useState } from 'react';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';
import { RefreshCw } from 'lucide-react';

interface ProfileDesigner2DProps {
  points: Array<[number, number]>;
  setPoints: (points: Array<[number, number]>) => void;
  language: Language;
  ribHeight: number;
}

export const ProfileDesigner2D: React.FC<ProfileDesigner2DProps> = ({
  points,
  setPoints,
  language,
  ribHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const t = translations[language];
  const [activeNodeIdx, setActiveNodeIdx] = useState<number | null>(null);

  // Canvas size constants
  const cWidth = 320;
  const cHeight = 140;
  const paddingX = 20;
  const paddingY = 20;

  // Preset definitions (Normalized 0 to 1)
  const presets: Record<string, Array<[number, number]>> = {
    sine: [
      [0.0, 0.5],
      [0.25, 1.0],
      [0.5, 0.5],
      [0.75, 0.0],
      [1.0, 0.5],
    ],
    trapezoid: [
      [0.0, 0.0],
      [0.2, 0.0],
      [0.35, 1.0],
      [0.65, 1.0],
      [0.8, 0.0],
      [1.0, 0.0],
    ],
    standing: [
      [0.0, 0.0],
      [0.46, 0.0],
      [0.48, 1.0],
      [0.52, 1.0],
      [0.54, 0.0],
      [1.0, 0.0],
    ],
    zigzag: [
      [0.0, 0.0],
      [0.25, 1.0],
      [0.5, 0.0],
      [0.75, 1.0],
      [1.0, 0.0],
    ],
  };

  const handleApplyPreset = (key: string) => {
    if (presets[key]) {
      setPoints([...presets[key]]);
    }
  };

  // Convert normalized coordinate to canvas pixels
  const toCanvasCoords = (pt: [number, number]): { x: number; y: number } => {
    const x = paddingX + pt[0] * (cWidth - paddingX * 2);
    // Y=0 is valley (bottom of canvas), Y=1 is crest (top of canvas)
    const y = cHeight - paddingY - pt[1] * (cHeight - paddingY * 2);
    return { x, y };
  };

  // Convert canvas pixels back to normalized coords
  const toNormalizedCoords = (cx: number, cy: number): { x: number; y: number } => {
    const normX = (cx - paddingX) / (cWidth - paddingX * 2);
    const normY = (cHeight - paddingY - cy) / (cHeight - paddingY * 2);
    return {
      x: Math.max(0, Math.min(1, normX)),
      y: Math.max(0, Math.min(1, normY)),
    };
  };

  // Redraw the 2D grid and nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, cWidth, cHeight);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = paddingX; x <= cWidth - paddingX; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, paddingY);
      ctx.lineTo(x, cHeight - paddingY);
      ctx.stroke();
    }
    for (let y = paddingY; y <= cHeight - paddingY; y += 25) {
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(cWidth - paddingX, y);
      ctx.stroke();
    }

    // Draw reference envelope lines (Min/Max boundaries)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(paddingX, paddingY);
    ctx.lineTo(cWidth - paddingX, paddingY);
    ctx.moveTo(paddingX, cHeight - paddingY);
    ctx.lineTo(cWidth - paddingX, cHeight - paddingY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Profile Lines connecting nodes
    ctx.strokeStyle = 'var(--accent-primary)';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'var(--accent-primary)';
    ctx.beginPath();

    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Draw nodes (draggable dots)
    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      
      const isActive = activeNodeIdx === idx;

      // Glow halo
      ctx.fillStyle = isActive ? 'rgba(6, 182, 212, 0.4)' : 'rgba(139, 92, 246, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 10 : 7, 0, Math.PI * 2);
      ctx.fill();

      // Solid center dot
      ctx.fillStyle = isActive ? 'var(--accent-cyan)' : 'var(--text-primary)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [points, activeNodeIdx]);

  // Handle Dragging Events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find if clicked near any node (within 10 pixels radius)
    let clickedNodeIdx: number | null = null;
    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (dist < 12) {
        clickedNodeIdx = idx;
      }
    });

    if (clickedNodeIdx !== null) {
      setActiveNodeIdx(clickedNodeIdx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeNodeIdx === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const norm = toNormalizedCoords(mx, my);

    // Update the active node coordinate
    setPoints(
      points.map((pt, idx) => {
        if (idx !== activeNodeIdx) return pt;

        // Constraint rules:
        // - Start node (index 0) must stay at X = 0
        // - End node (index length - 1) must stay at X = 1
        // - Intermediate nodes must stay between neighbors to prevent self-overlap geometry crash
        let targetX = norm.x;
        if (idx === 0) {
          targetX = 0;
        } else if (idx === points.length - 1) {
          targetX = 1;
        } else {
          const minX = points[idx - 1][0] + 0.02;
          const maxX = points[idx + 1][0] - 0.02;
          targetX = Math.max(minX, Math.min(maxX, norm.x));
        }

        return [targetX, norm.y];
      })
    );
  };

  const handleMouseUp = () => {
    setActiveNodeIdx(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="control-header">
        <label style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.85rem' }}>{t.customProfileTitle}</label>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{t.customProfileDesc}</p>

      {/* 2D Interactive Vector Canvas */}
      <canvas
        ref={canvasRef}
        width={cWidth}
        height={cHeight}
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          cursor: activeNodeIdx !== null ? 'grabbing' : 'grab',
          alignSelf: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Dimension markers overlay values */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>X: 0m</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{t.ribDepth || 'Rib Depth'}: {ribHeight} {t.unitMm || 'mm'}</span>
        <span>X: 1m</span>
      </div>

      {/* Preset triggers grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button
          type="button"
          className="overlay-btn"
          style={{ fontSize: '0.75rem', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
          onClick={() => handleApplyPreset('sine')}
        >
          <RefreshCw size={12} />
          {t.presetSine}
        </button>
        <button
          type="button"
          className="overlay-btn"
          style={{ fontSize: '0.75rem', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
          onClick={() => handleApplyPreset('trapezoid')}
        >
          <RefreshCw size={12} />
          {t.presetTrapezoid}
        </button>
        <button
          type="button"
          className="overlay-btn"
          style={{ fontSize: '0.75rem', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
          onClick={() => handleApplyPreset('zigzag')}
        >
          <RefreshCw size={12} />
          {t.presetZigZag}
        </button>
        <button
          type="button"
          className="overlay-btn"
          style={{ fontSize: '0.75rem', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
          onClick={() => handleApplyPreset('standing')}
        >
          <RefreshCw size={12} />
          {t.presetStandingSeam}
        </button>
      </div>
    </div>
  );
};
