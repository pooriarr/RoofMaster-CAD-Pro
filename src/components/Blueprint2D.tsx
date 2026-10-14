import React, { useEffect, useRef, useState, useMemo } from 'react';
import { calculateRoof, toMeters } from '../utils/calculator';
import type { RoofInputs } from '../utils/calculator';
import { getActiveFastenerPositions } from '../utils/fastenerPattern';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';
import {
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Printer,
} from 'lucide-react';

interface Blueprint2DProps {
  inputs: RoofInputs;
  language: Language;
  panelColor: string;
}

interface SelectedPanelInfo {
  slopeIdx: number;
  row: number;
  col: number;
  sheetNum: number;
  length: number;
  width: number;
  effLength: number;
  effWidth: number;
  netArea: number;
  screwCount: number;
  weightKg: number;
  isStart: boolean;
  xStart: number;
  yStart: number;
  drawLen: number;
}

export const Blueprint2D: React.FC<Blueprint2DProps> = ({
  inputs,
  language,
  panelColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const t = translations[language];
  const results = calculateRoof(inputs);
  const isRtl = language === 'fa' || language === 'ar';

  // Active slope selection for Gable roofs (1 = Slope 1, 2 = Slope 2)
  const [activeSlopeTab, setActiveSlopeTab] = useState<1 | 2>(1);

  // Interactive Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive Selection State
  const [selectedPanel, setSelectedPanel] = useState<SelectedPanelInfo | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<SelectedPanelInfo | null>(null);

  // Current active slope dimensions
  const isGable = inputs.roofShape === 'gable';
  const currentSlopeLength = activeSlopeTab === 1 ? results.slope1Length : results.slope2Length;
  const currentSlopePitch = activeSlopeTab === 1 ? results.slope1Pitch : results.slope2Pitch;

  const W = Math.max(0.5, toMeters(inputs.roofWidth, 12, 50));
  const L = Math.max(0.5, currentSlopeLength);

  const pW = Math.max(0.1, toMeters(inputs.panelWidth, 0.449, 5));
  const pL = Math.max(0.1, toMeters(inputs.panelLength, 3.5, 15));
  const ovH = inputs.panelType === 'standing_seam' ? 0 : Math.min(pW * 0.8, toMeters(inputs.horizontalOverlap, 0.04, 2));
  const ovV = inputs.panelType === 'standing_seam' ? 0 : Math.min(pL * 0.8, toMeters(inputs.verticalOverlap, 0.15, 2));

  const effPW = Math.max(0.05, pW - ovH);
  const effPL = Math.max(0.05, pL - ovV);

  const rows = results.rowsPerSlope;
  const cols = Math.max(1, L > pL ? Math.ceil((L - ovV) / effPL) : 1);
  const dir = inputs.layoutDirection || 'left_to_right';
  const slopeAlign = inputs.slopeAlignment || 'bottom';

  const totalPanelL = (cols - 1) * effPL + pL;
  const extraL = Math.max(0, totalPanelL - L);

  let yBottom0 = L;
  if (slopeAlign === 'bottom') {
    yBottom0 = L + extraL;
  } else if (slopeAlign === 'top') {
    yBottom0 = L;
  } else if (slopeAlign === 'center') {
    yBottom0 = L + extraL / 2;
  }

  const minY = Math.min(0, yBottom0 - totalPanelL);
  const maxY = Math.max(L, yBottom0);

  // Calculate Sheet Installation Sequence Matrix (EAVE-FIRST: bottom row c=0 at Eave is Row 1)
  const seqMatrix = useMemo(() => {
    const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    let counter = 1;
    for (let c = 0; c < cols; c++) {
      if (dir === 'right_to_left') {
        for (let r = rows - 1; r >= 0; r--) {
          matrix[r][c] = counter++;
        }
      } else if (dir === 'center_out') {
        const centerR = Math.floor(rows / 2);
        const rowOrder: number[] = [centerR];
        for (let delta = 1; delta < rows; delta++) {
          if (centerR - delta >= 0) rowOrder.push(centerR - delta);
          if (centerR + delta < rows) rowOrder.push(centerR + delta);
        }
        rowOrder.forEach((r) => {
          matrix[r][c] = counter++;
        });
      } else {
        // Default left_to_right
        for (let r = 0; r < rows; r++) {
          matrix[r][c] = counter++;
        }
      }
    }
    return matrix;
  }, [rows, cols, dir]);

  // Panel layout geometries list for hit-testing and rendering
  const panelsList = useMemo(() => {
    const list: SelectedPanelInfo[] = [];
    const density = inputs.panelMaterial === 'aluminum' ? 2700 : inputs.panelMaterial === 'copper' ? 8960 : 7850;
    const unitWeight = (inputs.panelThickness / 1000) * density;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const xStart = r * effPW;
        
        // Dynamic slope overhang positioning based on slopeAlignment
        const yBottom = yBottom0 - c * effPL;
        const yTop = yBottom - pL;
        const yStart = yTop;
        const drawLen = pL;
        const sheetNum = seqMatrix[r][c];

        // Dynamic intersecting purlin count for this panel
        let intersectingPurlinCount = 0;
        const safePurlinSpacing = Math.max(0.1, toMeters(inputs.purlinSpacing, 0.6, 5));
        const purlinSpaces = Math.max(1, Math.ceil(L / safePurlinSpacing));
        const purlinCount = purlinSpaces + 1;
        const actualPurlinSpacing = L / purlinSpaces;
        for (let pi = 0; pi < purlinCount; pi++) {
          const py = pi * actualPurlinSpacing;
          if (py >= yStart && py <= yStart + drawLen) {
            intersectingPurlinCount++;
          }
        }
        const fastenerInfo = getActiveFastenerPositions(inputs);
        const screwsPerX = fastenerInfo.xFractions.length;
        const screwCount = intersectingPurlinCount * screwsPerX;
        const netArea = pW * drawLen;
        const weightKg = Math.round(netArea * unitWeight * 10) / 10;

        list.push({
          slopeIdx: activeSlopeTab,
          row: r + 1,
          col: c + 1,
          sheetNum,
          length: pL,
          width: pW,
          effLength: effPL,
          effWidth: effPW,
          netArea: Math.round(netArea * 100) / 100,
          screwCount,
          weightKg,
          isStart: sheetNum === 1,
          xStart,
          yStart,
          drawLen,
        });
      }
    }
    return list;
  }, [rows, cols, effPW, effPL, pW, pL, yBottom0, seqMatrix, activeSlopeTab, inputs.panelMaterial, inputs.panelThickness, inputs.panelType, inputs.purlinSpacing, inputs.screwsPerCrossing, inputs.fastenerPlacement, inputs.customProfilePoints, L]);

  const handleZoomIn = () => setZoom((prev) => Math.min(3.0, prev + 0.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, prev - 0.2));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedPanel(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.max(0.5, Math.min(3.0, prev + zoomDelta)));
  };

  const getCanvasMouseCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);

    const marginX = 90;
    const marginY = 95;
    const availW = cw - marginX * 2;
    const availH = ch - marginY * 2;
    const spanY = Math.max(0.1, maxY - minY);
    const scale = Math.min(availW / W, availH / spanY);

    const offsetX = marginX + (availW - W * scale) / 2;
    const offsetY = marginY + (availH - spanY * scale) / 2 - minY * scale;

    // Invert zoom and pan transform
    const centerX = cw / 2;
    const centerY = ch / 2;

    const unzoomedX = (clientX - pan.x - centerX) / zoom + centerX;
    const unzoomedY = (clientY - pan.y - centerY) / zoom + centerY;

    const modelX = (unzoomedX - offsetX) / scale;
    const modelY = (unzoomedY - offsetY) / scale;

    return { modelX, modelY };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasMouseCoords(e);
    if (!coords) return;

    // Find clicked panel
    const clicked = panelsList.find((p) => {
      return (
        coords.modelX >= p.xStart &&
        coords.modelX <= p.xStart + pW &&
        coords.modelY >= p.yStart &&
        coords.modelY <= p.yStart + p.drawLen
      );
    });

    if (clicked) {
      setSelectedPanel(clicked);
    } else {
      setSelectedPanel(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }

    const coords = getCanvasMouseCoords(e);
    if (!coords) return;

    const hovered = panelsList.find((p) => {
      return (
        coords.modelX >= p.xStart &&
        coords.modelX <= p.xStart + pW &&
        coords.modelY >= p.yStart &&
        coords.modelY <= p.yStart + p.drawLen
      );
    });

    setHoveredPanel(hovered || null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Export Blueprint to High-Res PNG Image
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `roofmaster_blueprint_slope${activeSlopeTab}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Main 2D Drawing Engine ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width || 1000;
    const ch = rect.height || 620;

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    // Deep Blueprint CAD Background
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, cw, ch);

    // Subtle CAD Grid Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < cw; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y < ch; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    ctx.save();

    // Pan & Zoom Transforms
    ctx.translate(pan.x, pan.y);
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cw / 2, -ch / 2);

    // Dynamic Margins
    const marginX = 90;
    const marginY = 95;
    const availW = cw - marginX * 2;
    const availH = ch - marginY * 2;

    const spanY = Math.max(0.1, maxY - minY);
    const scale = Math.min(availW / W, availH / spanY);

    // Centered offsets
    const offsetX = marginX + (availW - W * scale) / 2;
    const offsetY = marginY + (availH - spanY * scale) / 2 - minY * scale;

    const toCanvasX = (x: number) => offsetX + x * scale;
    const toCanvasY = (y: number) => offsetY + y * scale;
    const toCanvasDist = (d: number) => d * scale;

    // Roof Slope Boundary Fill (Concrete / Framing Base)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(toCanvasX(0), toCanvasY(0), toCanvasDist(W), toCanvasDist(L));
    ctx.strokeRect(toCanvasX(0), toCanvasY(0), toCanvasDist(W), toCanvasDist(L));

    // 1. Draw Purlins (Underlayment battens)
    const safePurlinSpacing = Math.max(0.1, toMeters(inputs.purlinSpacing, 0.6, 5));
    const purlinSpaces = Math.max(1, Math.ceil(L / safePurlinSpacing));
    const purlinCount = purlinSpaces + 1;
    const actualPurlinSpacing = L / purlinSpaces;

    ctx.strokeStyle = inputs.purlinColor || 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i < purlinCount; i++) {
      const yVal = i * actualPurlinSpacing;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(0), toCanvasY(yVal));
      ctx.lineTo(toCanvasX(W), toCanvasY(yVal));
      ctx.stroke();

      // Purlin label
      ctx.fillStyle = '#64748b';
      ctx.font = '8.5px Vazirmatn, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`P${i + 1}`, toCanvasX(0) - 8, toCanvasY(yVal) + 3);
    }
    ctx.setLineDash([]);

    // 2. Draw Interactive Panels
    panelsList.forEach((panel) => {
      const isSelected = selectedPanel?.sheetNum === panel.sheetNum;
      const isHovered = hoveredPanel?.sheetNum === panel.sheetNum;
      const isStart = panel.isStart;

      const px = toCanvasX(panel.xStart);
      const py = toCanvasY(panel.yStart);
      const pw = toCanvasDist(pW);
      const ph = toCanvasDist(panel.drawLen);

      // Panel Fill
      if (isSelected) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      } else if (isStart) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      } else {
        ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
      }

      ctx.fillRect(px, py, pw, ph);

      // Panel Border
      if (isSelected) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
      } else if (isHovered) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
      } else if (isStart) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = panelColor || '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
      }

      ctx.strokeRect(px, py, pw, ph);
      ctx.shadowBlur = 0;

      // Sheet Numbering Circular Badge (#1..N)
      // Dynamically scale badge radius so it never overflows when rows count is high
      const badgeRadius = Math.max(6, Math.min(13, pw * 0.38));
      const badgeFontSize = Math.max(7, Math.min(11, badgeRadius * 0.95));

      const cx = px + pw / 2;
      const cy = py + ph / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, isSelected ? badgeRadius + 2 : badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? '#f43f5e'
        : isHovered
        ? '#0284c7'
        : isStart
        ? '#10b981'
        : '#7c3aed';
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${badgeFontSize}px Vazirmatn, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${panel.sheetNum}`, cx, cy);
    });

    // 3. Fastener Screw Head & EPDM Washer Symbols
    if (inputs.showScrews !== false) {
      const sColor = inputs.screwColor || '#10b981';
      const { xFractions } = getActiveFastenerPositions(inputs);

      panelsList.forEach((panel) => {
        for (let i = 0; i < purlinCount; i++) {
          const purlinY = i * actualPurlinSpacing;
          if (purlinY >= panel.yStart && purlinY <= panel.yStart + panel.drawLen) {
            xFractions.forEach((xFrac) => {
              const sx = toCanvasX(panel.xStart + pW * xFrac);
              const sy = toCanvasY(purlinY);

              // 1. Black EPDM Rubber Gasket Base Ring
              ctx.beginPath();
              ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
              ctx.fillStyle = '#0f172a';
              ctx.fill();
              ctx.strokeStyle = 'rgba(255,255,255,0.45)';
              ctx.lineWidth = 0.6;
              ctx.stroke();

              // 2. Colored Hex / Dome Screw Head
              ctx.beginPath();
              ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
              ctx.fillStyle = sColor;
              ctx.fill();

              // 3. Fastener Center Cross/Hex Slot Detail
              ctx.strokeStyle = sColor.toLowerCase() === '#ffffff' ? '#1e293b' : '#ffffff';
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(sx - 1.2, sy);
              ctx.lineTo(sx + 1.2, sy);
              ctx.moveTo(sx, sy - 1.2);
              ctx.lineTo(sx, sy + 1.2);
              ctx.stroke();
            });
          }
        }
      });
    }

    // 4. Boundary Callouts: Ridge (Top) vs Eave (Bottom)
    ctx.font = 'bold 12px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';

    // Ridge Boundary Callout (TOP)
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`▲ ${t.ridgeBoundary || 'RIDGE BOUNDARY (TOP)'}`, toCanvasX(W / 2), toCanvasY(Math.min(-0.18, minY - 0.18)));

    // Eave Boundary Callout (BOTTOM)
    ctx.fillStyle = '#10b981';
    ctx.fillText(`▼ ${t.eaveBoundary || 'EAVE GUTTER LINE (BOTTOM)'}`, toCanvasX(W / 2), toCanvasY(Math.max(L + 0.28, maxY + 0.28)));

    // Overhang Indicator Callout
    if (extraL > 0.01) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px Vazirmatn, sans-serif';
      ctx.textAlign = 'left';
      const overhangCm = (extraL * 100).toFixed(0);
      const overhangAlign = slopeAlign === 'bottom'
        ? (t.alignBottomEave || 'Eave')
        : slopeAlign === 'top'
        ? (t.alignTopRidge || 'Ridge')
        : (t.alignCentered || 'Centered');
      const overhangLabel = `${t.panelOverhang || 'Panel Overhang'}: ${overhangCm} cm (${overhangAlign})`;
      ctx.fillText(`📏 ${overhangLabel}`, toCanvasX(0), toCanvasY(Math.min(-0.38, minY - 0.38)));
    }

    // 5. Water Flow & Slope Direction Arrow (DOWNWARDS FROM RIDGE TO EAVE)
    const arrowX = toCanvasX(W + 0.35);
    const arrowStartY = toCanvasY(minY + 0.15);
    const arrowEndY = toCanvasY(maxY - 0.15);

    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowStartY);
    ctx.lineTo(arrowX, arrowEndY);
    ctx.stroke();

    // Arrowhead pointing down to eave
    ctx.beginPath();
    ctx.moveTo(arrowX - 6, arrowEndY - 12);
    ctx.lineTo(arrowX + 6, arrowEndY - 12);
    ctx.lineTo(arrowX, arrowEndY + 2);
    ctx.fill();

    // Arrow label with pitch angle
    ctx.save();
    ctx.translate(arrowX + 18, (arrowStartY + arrowEndY) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 11px Vazirmatn, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`⬇ ${t.waterFlowDirection || 'Water Flow Direction'} (${currentSlopePitch}°)`, 0, 0);
    ctx.restore();

    // 6. Dimension Callouts
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.font = '11px Vazirmatn, sans-serif';

    // Width (Span) Dimension Line at bottom
    const dimY = Math.max(L + 0.58, maxY + 0.58);
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(dimY));
    ctx.lineTo(toCanvasX(W), toCanvasY(dimY));
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillText(`${t.roofWidth}: ${(W * 100).toFixed(0)} cm`, toCanvasX(W / 2), toCanvasY(dimY) + 16);

    // Length Dimension Line on Left
    const dimX = -0.35;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(dimX), toCanvasY(0));
    ctx.lineTo(toCanvasX(dimX), toCanvasY(L));
    ctx.stroke();

    ctx.save();
    ctx.translate(toCanvasX(dimX) - 16, toCanvasY(L / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(`${t.roofLength}: ${(L * 100).toFixed(0)} cm`, 0, 0);
    ctx.restore();

    // 7. START #1 Badge Indicator
    const startPanel = panelsList.find((p) => p.isStart);
    if (startPanel) {
      const sbX = toCanvasX(startPanel.xStart + pW / 2);
      const sbY = toCanvasY(maxY + 0.12);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(sbX - 65, sbY - 10, 130, 22, 5);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🚀 ${t.startLayout || 'START #1'}`, sbX, sbY + 1);
    }

    ctx.restore();
  }, [
    W,
    L,
    pW,
    pL,
    minY,
    maxY,
    extraL,
    slopeAlign,
    panelsList,
    selectedPanel,
    hoveredPanel,
    zoom,
    pan,
    panelColor,
    inputs.purlinColor,
    inputs.purlinSpacing,
    inputs.slopeAlignment,
    inputs.screwColor,
    inputs.screwsPerCrossing,
    inputs.showScrews,
    inputs.fastenerPlacement,
    inputs.customProfilePoints,
    currentSlopePitch,
    language,
    isRtl,
    t,
  ]);

  return (
    <div className="blueprint-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem', position: 'relative' }}>
      {/* Top Header & Prominent Slope Switcher */}
      <div className="blueprint-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Compass size={20} color="var(--accent-primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t.tab2D}
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
              {t.clickToInspect || 'Click any sheet to inspect technical specifications.'}
            </p>
          </div>
        </div>

        {/* Prominent High-Contrast Slope Switcher Capsule */}
        {isGable && (
          <div style={{
            display: 'inline-flex',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
            gap: '4px',
          }}>
            <button
              type="button"
              onClick={() => {
                setActiveSlopeTab(1);
                setSelectedPanel(null);
              }}
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.45rem 1rem',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeSlopeTab === 1 ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'transparent',
                color: activeSlopeTab === 1 ? '#ffffff' : '#94a3b8',
                boxShadow: activeSlopeTab === 1 ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeSlopeTab === 1 ? '#ffffff' : '#8b5cf6' }} />
              <span>{t.slope1Tab || 'Slope 1'}</span>
              <span style={{ opacity: 0.9, fontSize: '0.74rem', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', color: '#ffffff' }}>
                {(results.slope1Length * 100).toFixed(0)} cm
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSlopeTab(2);
                setSelectedPanel(null);
              }}
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.45rem 1rem',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeSlopeTab === 2 ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                color: activeSlopeTab === 2 ? '#ffffff' : '#94a3b8',
                boxShadow: activeSlopeTab === 2 ? '0 0 12px rgba(6, 182, 212, 0.5)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeSlopeTab === 2 ? '#ffffff' : '#06b6d4' }} />
              <span>{t.slope2Tab || 'Slope 2'}</span>
              <span style={{ opacity: 0.9, fontSize: '0.74rem', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', color: '#ffffff' }}>
                {(results.slope2Length * 100).toFixed(0)} cm
              </span>
            </button>
          </div>
        )}

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="overlay-btn" onClick={handleExportPNG} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <Download size={14} />
            {t.downloadPng}
          </button>
          <button className="overlay-btn" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <Printer size={14} />
            {t.printReport}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Container */}
      <div
        ref={containerRef}
        className="canvas-container"
        style={{
          flex: 1,
          minHeight: '480px',
          height: 'calc(100vh - 220px)',
          position: 'relative',
          cursor: hoveredPanel ? 'pointer' : 'grab',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleCanvasMouseMove as unknown as React.MouseEventHandler<HTMLDivElement>}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Floating Zoom & Reset Toolbar */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: isRtl ? 'auto' : '16px',
          left: isRtl ? '16px' : 'auto',
          display: 'flex',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '6px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          zIndex: 10,
        }}>
          <button className="overlay-btn" onClick={handleZoomIn} title="Zoom In"><ZoomIn size={16} /></button>
          <button className="overlay-btn" onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={16} /></button>
          <button className="overlay-btn" onClick={handleResetZoom} title="Reset View"><RotateCcw size={16} /></button>
        </div>

        {/* Interactive Selected Panel Inspector Card (Bottom-Left / Right) */}
        {selectedPanel && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: isRtl ? 'auto' : '16px',
            left: isRtl ? '16px' : 'auto',
            width: '280px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--accent-secondary)',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            zIndex: 15,
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-secondary)' }} />
                <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                  {t.sheetNumber || 'Sheet'} #{selectedPanel.sheetNum}
                </strong>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                {selectedPanel.slopeIdx === 1 ? (t.slope1Tab || 'Slope 1') : (t.slope2Tab || 'Slope 2')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.matrixPosition || 'Matrix Position'}:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{t.rowLabel || 'Row'} {selectedPanel.row}, {t.colLabel || 'Col'} {selectedPanel.col}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.sheetDimensions || 'Dimensions'}:</span>
                <strong style={{ color: 'var(--accent-emerald)' }}>{(selectedPanel.length * 100).toFixed(0)} × {(selectedPanel.width * 100).toFixed(0)} cm</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.grossArea || 'Gross Area'}:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedPanel.netArea} m²</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.sheetFasteners || 'Fasteners'}:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{selectedPanel.screwCount} {t.unitPcs || 'pcs'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.approxWeight || 'Weight'}:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedPanel.weightKg} {t.unitKg || 'kg'}</strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedPanel(null)}
              style={{
                marginTop: '0.75rem',
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                padding: '0.35rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {t.closeDetails || 'Close'} ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
