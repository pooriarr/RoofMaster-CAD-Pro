import React, { useState, useEffect, useRef, useMemo } from 'react';
import { calculateRoof, toMeters } from '../utils/calculator';
import type { RoofInputs } from '../utils/calculator';
import { getActiveFastenerPositions } from '../utils/fastenerPattern';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';
import {
  Printer,
  Calculator,
  ShieldCheck,
  Award,
  FileCheck,
  Building2,
  MapPin,
  UserCheck,
  Calendar,
  Layers,
  Compass,
  CheckCircle2,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProjectReportProps {
  inputs: RoofInputs;
  language: Language;
  panelColor?: string;
}

export const ProjectReport: React.FC<ProjectReportProps> = ({
  inputs,
  language,
  panelColor = '#3b82f6',
}) => {
  const t = translations[language] || translations.en;
  const results = calculateRoof(inputs);
  const isRtl = language === 'fa' || language === 'ar';
  const blueprintCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active slope selection for Gable roofs (1 = Slope 1, 2 = Slope 2)
  const isGable = inputs.roofShape === 'gable';
  const [activeSlopeTab, setActiveSlopeTab] = useState<1 | 2>(1);

  // Editable Client & Invoice Metadata State (synced with language defaults)
  const [clientName, setClientName] = useState<string>(t.defaultClientName || 'Aria Construction & Engineering Group');
  const [engineerName, setEngineerName] = useState<string>(t.defaultEngineerName || 'Senior Structural CAD Engineer');
  const [projectLocation, setProjectLocation] = useState<string>(t.defaultProjectLocation || 'Munich / Berlin - Project Zone A4');
  const [invoiceNo] = useState<string>(`RFM-${Math.floor(100000 + Math.random() * 900000)}`);
  const issueDate = new Date().toLocaleDateString(isRtl ? 'fa-IR' : (language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-US'));

  // Update default names on language change if untouched
  useEffect(() => {
    setClientName(t.defaultClientName || 'Aria Construction & Engineering Group');
    setEngineerName(t.defaultEngineerName || 'Senior Structural CAD Engineer');
    setProjectLocation(t.defaultProjectLocation || 'Munich / Berlin - Project Zone A4');
  }, [language]);

  const triggerPrint = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#8b5cf6', '#ec4899', '#06b6d4'],
    });

    setTimeout(() => {
      window.print();
    }, 400);
  };

  const formatNumber = (val: number) => {
    return isRtl ? val.toLocaleString('fa-IR') : val.toString();
  };

  // Financial Cost Calculations
  const panelUnitPrice = inputs.pricingMode === 'per_meter' ? (inputs.panelPrice || 0) : (inputs.pricePerSheet || 0);
  const panelCost = inputs.pricingMode === 'per_meter'
    ? results.totalArea * panelUnitPrice
    : results.totalPanels * panelUnitPrice;

  const purlinUnitPrice = inputs.purlinPrice || 0;
  const purlinCost = results.purlinTotalLength * purlinUnitPrice;

  const screwUnitPrice = inputs.screwPrice || 0;
  const screwCost = results.screwsCount * screwUnitPrice;

  const grandTotalCost = panelCost + purlinCost + screwCost;

  const renderPriceBadge = (price: number, suffix: string = '') => {
    if (!price || price <= 0) {
      return <span style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{t.notCalculated}</span>;
    }
    return `€ ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  };

  const renderSubtotalBadge = (subtotal: number, unitPrice: number) => {
    if (!unitPrice || unitPrice <= 0 || !subtotal || subtotal <= 0) {
      return <span style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{t.notCalculated}</span>;
    }
    return `€ ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Dimensional parameters for the active slope
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

  // Sequence matrix for panel numbering (Eave-first)
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

  // Compute full accurate panel list
  const panelsList = useMemo(() => {
    const list = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const xStart = r * effPW;
        const yBottom = yBottom0 - c * effPL;
        const yTop = yBottom - pL;
        const yStart = yTop;
        const drawLen = pL;
        const sheetNum = seqMatrix[r][c];

        list.push({
          sheetNum,
          row: r + 1,
          col: c + 1,
          xStart,
          yStart,
          drawLen,
          isStart: sheetNum === 1,
        });
      }
    }
    return list;
  }, [rows, cols, effPW, effPL, pL, yBottom0, seqMatrix]);

  // Draw 2D Blueprint Schematic on Canvas with complete parameters
  useEffect(() => {
    const canvas = blueprintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cWidth = 840;
    const cHeight = 400;
    canvas.width = cWidth * dpr;
    canvas.height = cHeight * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, cWidth, cHeight);

    // Subtle CAD Grid Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 25;
    for (let x = 0; x <= cWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= cHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cWidth, y);
      ctx.stroke();
    }

    const marginX = 85;
    const marginY = 65;
    const availW = cWidth - marginX * 2;
    const availH = cHeight - marginY * 2;
    const spanY = Math.max(0.1, maxY - minY);

    const scale = Math.min(availW / W, availH / spanY);
    const offsetX = marginX + (availW - W * scale) / 2;
    const offsetY = marginY + (availH - spanY * scale) / 2 - minY * scale;

    const toX = (x: number) => offsetX + x * scale;
    const toY = (y: number) => offsetY + y * scale;
    const toDist = (d: number) => d * scale;

    // 1. Roof Slope Substructure Framing Boundary Fill
    ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(toX(0), toY(0), toDist(W), toDist(L));
    ctx.strokeRect(toX(0), toY(0), toDist(W), toDist(L));

    // 2. Draw Purlins (Battens) based on Framing Orientation
    const safePurlinSpacing = Math.max(0.1, toMeters(inputs.purlinSpacing, 0.6, 5));
    const purlinSpaces = Math.max(1, Math.ceil(L / safePurlinSpacing));
    const purlinCount = purlinSpaces + 1;
    const actualPurlinSpacing = L / purlinSpaces;

    ctx.strokeStyle = inputs.purlinColor || 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);

    const orientation = inputs.framingOrientation || 'horizontal';

    // Horizontal Battens
    if (orientation === 'horizontal' || orientation === 'grid' || orientation === 'diagonal') {
      for (let i = 0; i < purlinCount; i++) {
        const yVal = i * actualPurlinSpacing;
        ctx.beginPath();
        ctx.moveTo(toX(0), toY(yVal));
        ctx.lineTo(toX(W), toY(yVal));
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '8px Vazirmatn, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`P${i + 1}`, toX(0) - 6, toY(yVal) + 3);
      }
    }

    // Vertical Rafters
    if (orientation === 'vertical' || orientation === 'grid' || orientation === 'diagonal') {
      const rafterCount = Math.max(2, Math.floor(W / safePurlinSpacing) + 1);
      const rafterSpacing = W / (rafterCount - 1);
      for (let i = 0; i < rafterCount; i++) {
        const xVal = i * rafterSpacing;
        ctx.beginPath();
        ctx.moveTo(toX(xVal), toY(0));
        ctx.lineTo(toX(xVal), toY(L));
        ctx.stroke();
      }
    }

    // Diagonal Bracing
    if (orientation === 'diagonal') {
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(0));
      ctx.lineTo(toX(W), toY(L));
      ctx.moveTo(toX(W), toY(0));
      ctx.lineTo(toX(0), toY(L));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Draw Accurate Stacked Panels with Badges and Fasteners
    const fastenerInfo = getActiveFastenerPositions(inputs);
    const sColor = inputs.screwColor || '#10b981';

    panelsList.forEach((panel) => {
      const px = toX(panel.xStart);
      const py = toY(panel.yStart);
      const pw = toDist(pW);
      const ph = toDist(panel.drawLen);
      const isStart = panel.isStart;

      // Panel body
      ctx.fillStyle = isStart ? 'rgba(16, 185, 129, 0.25)' : 'rgba(139, 92, 246, 0.12)';
      ctx.strokeStyle = isStart ? '#10b981' : (panelColor || '#8b5cf6');
      ctx.lineWidth = isStart ? 2 : 1;

      ctx.fillRect(px, py, pw, ph);
      ctx.strokeRect(px, py, pw, ph);

      // Panel Center Number Badge (#1..N)
      const cx = px + pw / 2;
      const cy = py + ph / 2;
      const badgeR = Math.max(6, Math.min(11, pw * 0.35));

      ctx.beginPath();
      ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = isStart ? '#10b981' : '#8b5cf6';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${panel.sheetNum}`, cx, cy);

      // Fastener dots at purlin crossings
      if (inputs.showScrews !== false) {
        ctx.fillStyle = sColor;
        for (let pi = 0; pi < purlinCount; pi++) {
          const pyVal = pi * actualPurlinSpacing;
          if (pyVal >= panel.yStart && pyVal <= panel.yStart + panel.drawLen) {
            fastenerInfo.xFractions.forEach((xFrac) => {
              ctx.beginPath();
              ctx.arc(toX(panel.xStart + pW * xFrac), toY(pyVal), 2, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      }
    });

    // 4. Boundary Callouts: Ridge (Top) & Eave (Bottom)
    ctx.font = 'bold 10px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';

    // Ridge Boundary Callout (TOP)
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`▲ ${t.ridgeBoundary || 'RIDGE BOUNDARY (TOP)'}`, toX(W / 2), toY(Math.min(-0.12, minY - 0.12)));

    // Eave Boundary Callout (BOTTOM)
    ctx.fillStyle = '#10b981';
    ctx.fillText(`▼ ${t.eaveBoundary || 'EAVE GUTTER LINE (BOTTOM)'}`, toX(W / 2), toY(Math.max(L + 0.22, maxY + 0.22)));

    // Overhang Indicator Callout
    if (extraL > 0.01) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px Vazirmatn, sans-serif';
      ctx.textAlign = 'left';
      const overhangCm = (extraL * 100).toFixed(0);
      const overhangAlign = slopeAlign === 'bottom'
        ? (t.alignBottomEave || 'Eave')
        : slopeAlign === 'top'
        ? (t.alignTopRidge || 'Ridge')
        : (t.alignCentered || 'Centered');
      const overhangLabel = `${t.panelOverhang || 'Panel Overhang'}: ${overhangCm} cm (${overhangAlign})`;
      ctx.fillText(`📏 ${overhangLabel}`, toX(0), toY(Math.min(-0.28, minY - 0.28)));
    }

    // 5. Water Flow & Slope Direction Arrow
    const arrowX = toX(W + 0.22);
    const arrowStartY = toY(minY + 0.1);
    const arrowEndY = toY(maxY - 0.1);

    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowStartY);
    ctx.lineTo(arrowX, arrowEndY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(arrowX - 4, arrowEndY - 8);
    ctx.lineTo(arrowX + 4, arrowEndY - 8);
    ctx.lineTo(arrowX, arrowEndY);
    ctx.fill();

    // Water flow label
    ctx.save();
    ctx.translate(arrowX + 12, (arrowStartY + arrowEndY) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 8.5px Vazirmatn, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`⬇ ${t.waterFlowDirection || 'Water Flow'} (${currentSlopePitch.toFixed(1)}°)`, 0, 0);
    ctx.restore();

    // 6. Dimension Lines
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.font = '9px Vazirmatn, sans-serif';

    // Width (Span)
    const dimY = Math.max(L + 0.42, maxY + 0.42);
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(dimY));
    ctx.lineTo(toX(W), toY(dimY));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(`${t.roofWidth}: ${(W * 100).toFixed(0)} cm`, toX(W / 2), toY(dimY) + 12);

    // Length (Slope)
    const dimX = -0.22;
    ctx.beginPath();
    ctx.moveTo(toX(dimX), toY(0));
    ctx.lineTo(toX(dimX), toY(L));
    ctx.stroke();

    ctx.save();
    ctx.translate(toX(dimX) - 10, toY(L / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(`${t.roofLength}: ${(L * 100).toFixed(0)} cm`, 0, 0);
    ctx.restore();

    // 7. START #1 Badge
    const startPanel = panelsList.find((p) => p.isStart);
    if (startPanel) {
      const sbX = toX(startPanel.xStart + pW / 2);
      const sbY = toY(maxY + 0.1);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(sbX - 50, sbY - 8, 100, 18, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🚀 ${t.startInstallation || 'START #1'}`, sbX, sbY + 1);
    }

  }, [
    W,
    L,
    pW,
    pL,
    minY,
    maxY,
    extraL,
    slopeAlign,
    dir,
    panelsList,
    panelColor,
    inputs.framingOrientation,
    inputs.purlinColor,
    inputs.purlinSpacing,
    inputs.screwColor,
    inputs.showScrews,
    inputs.screwsPerCrossing,
    inputs.fastenerPlacement,
    language,
    activeSlopeTab,
    t
  ]);

  // Translate framing orientation dynamically
  const framingOrientationLabel = inputs.framingOrientation === 'vertical'
    ? (t.framingVertical || 'Vertical Rafters')
    : inputs.framingOrientation === 'grid'
    ? (t.framingGrid || 'Cross-Grid Framing')
    : inputs.framingOrientation === 'diagonal'
    ? (t.framingDiagonal || 'Diagonal Cross-Bracing')
    : (t.framingHorizontal || 'Horizontal Battens');

  // Translate panel profile dynamically
  const panelProfileLabel = inputs.panelType === 'prr1'
    ? (t.presetPRR1 || 'PRR1 (5-Rib Profile)')
    : inputs.panelType === 'standing_seam'
    ? (t.panelTypeStandingSeam || 'Standing Seam')
    : inputs.panelType === 'corrugated'
    ? (t.panelTypeCorrugated || 'Corrugated')
    : inputs.panelType === 'custom'
    ? (t.panelTypeCustom || 'Custom Profile')
    : (t.panelTypeTrapezoidal || 'Trapezoidal');

  return (
    <div className="report-container" style={{ maxWidth: '1020px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* 1. Executive Top Header & Print Bar */}
      <div className="report-header" style={{
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
        padding: '1.5rem 2rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color-glow)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <Award size={28} color="var(--accent-cyan)" />
            <h2 className="brand-gradient" style={{ fontSize: '1.6rem', margin: 0 }}>
              {t.bomReportTitle || 'Bill of Materials & Engineering Takeoff'}
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span>{t.invoiceRef}: <strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{invoiceNo}</strong></span>
            <span>|</span>
            <span><Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t.projectDate}: <strong>{issueDate}</strong></span>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', border: '1px solid rgba(16,185,129,0.3)' }}>
              ✓ {t.invoiceWatermarkOfficial || 'OFFICIAL TECHNICAL SPECIFICATION'}
            </span>
          </p>
        </div>
        <button
          className="report-btn"
          onClick={triggerPrint}
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
            border: 'none',
            padding: '0.7rem 1.4rem',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
            cursor: 'pointer',
            borderRadius: '8px'
          }}
        >
          <Printer size={18} />
          {t.printReport}
        </button>
      </div>

      {/* 2. Client & Project Metadata Letterhead */}
      <div className="report-card" style={{
        marginBottom: '1.5rem',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem'
      }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileCheck size={18} />
          {t.projectClientInfo}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
              <Building2 size={13} /> {t.clientName}
            </label>
            <input
              type="text"
              className="sidebar-input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
              <UserCheck size={13} /> {t.engineerName}
            </label>
            <input
              type="text"
              className="sidebar-input"
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
              <MapPin size={13} /> {t.projectLocation}
            </label>
            <input
              type="text"
              className="sidebar-input"
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
            />
          </div>
        </div>
      </div>

      {/* 3. KPI Key Metrics Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="report-card" style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t.totalArea}</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff' }}>
            {formatNumber(Math.round(results.totalArea * 100) / 100)} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-secondary)' }}>{t.unitMeter}²</span>
          </span>
        </div>

        <div className="report-card" style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t.panelQuantity}</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
            {formatNumber(results.totalPanels)} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-secondary)' }}>{t.unitPcs}</span>
          </span>
        </div>

        <div className="report-card" style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t.totalPurlinLength}</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
            {formatNumber(Math.round(results.purlinTotalLength))} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-secondary)' }}>{t.unitMeter}</span>
          </span>
        </div>

        <div className="report-card" style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t.totalWeight}</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-amber)' }}>
            {formatNumber(Math.round(results.totalSheetWeight + results.totalPurlinWeight))} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-secondary)' }}>{t.unitKg}</span>
          </span>
        </div>

        <div className="report-card" style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t.totalAmount}</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: grandTotalCost > 0 ? 'var(--accent-emerald)' : '#f87171' }}>
            {renderSubtotalBadge(grandTotalCost, grandTotalCost)}
          </span>
        </div>
      </div>

      {/* 4. EMBEDDED 2D INSTALLATION SCHEMATIC BLUEPRINT */}
      <div className="report-card" style={{
        marginBottom: '1.5rem',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid var(--border-color-glow)',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Compass size={18} color="var(--accent-primary)" />
              {t.blueprintLayoutSchematic || '2D Installation Layout Schematic'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              {t.blueprintLayoutDesc || 'Sequential sheet laying matrix, purlin framing grid, and fastener placement map.'}
            </p>
          </div>

          {/* Gable Slope Selector Capsule & Schematic Badges */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isGable && (
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  type="button"
                  onClick={() => setActiveSlopeTab(1)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeSlopeTab === 1 ? 'var(--accent-primary)' : 'transparent',
                    color: activeSlopeTab === 1 ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {t.slope1Tab || 'Slope 1'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlopeTab(2)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeSlopeTab === 2 ? 'var(--accent-cyan)' : 'transparent',
                    color: activeSlopeTab === 2 ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {t.slope2Tab || 'Slope 2'}
                </button>
              </div>
            )}

            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', color: '#10b981', fontSize: '0.72rem' }}>
              <CheckCircle2 size={12} /> {t.startInstallation || 'START #1'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: '4px', color: '#c084fc', fontSize: '0.72rem' }}>
              <Layers size={12} /> {t.panelQuantity}: {results.totalPanels} {t.unitPcs}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '2px 8px', borderRadius: '4px', color: 'var(--accent-cyan)', fontSize: '0.72rem' }}>
              {t.purlinSpacing}: {inputs.purlinSpacing} cm
            </span>
          </div>
        </div>

        {/* Blueprint Canvas Container */}
        <div style={{
          background: '#0a0d16',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0.5rem'
        }}>
          <canvas
            ref={blueprintCanvasRef}
            style={{ width: '100%', maxWidth: '840px', height: '400px', display: 'block', borderRadius: '6px' }}
          />
        </div>
      </div>

      {/* 5. Detailed Bill of Materials (BOM) Itemized Table */}
      <div className="report-card" style={{
        marginBottom: '1.5rem',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem'
      }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', fontSize: '1.05rem' }}>
          <Calculator size={18} color="var(--accent-primary)" />
          {t.bomTitle || 'Itemized Bill of Materials & Quantities'}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-color)', textAlign: isRtl ? 'right' : 'left' }}>
                <th style={{ padding: '0.75rem', color: 'var(--accent-cyan)' }}>{t.tableItemSpecs}</th>
                <th style={{ padding: '0.75rem', color: 'var(--accent-cyan)' }}>{t.tableUnitSpec}</th>
                <th style={{ padding: '0.75rem', color: 'var(--accent-cyan)' }}>{t.tableQty}</th>
                <th style={{ padding: '0.75rem', color: 'var(--accent-cyan)' }}>{t.tableUnitPrice}</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-cyan)' }}>{t.tableSubtotal}</th>
              </tr>
            </thead>
            <tbody>
              {/* Sheet Panels Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: panelColor, border: '1px solid rgba(255,255,255,0.3)' }} />
                    <strong style={{ color: '#ffffff' }}>
                      {panelProfileLabel}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {t.panelMaterial}: {inputs.panelMaterial === 'steel' ? t.materialSteel : inputs.panelMaterial === 'aluminum' ? t.materialAluminum : t.materialCopper} | {t.panelThickness}: {inputs.panelThickness} mm | {t.panelFinish}: {inputs.panelFinish === 'polyester' ? t.finishPolyester : inputs.panelFinish === 'pvdf' ? t.finishPVDF : t.finishMatte}
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>{formatNumber(inputs.panelLength)} cm × {formatNumber(inputs.panelWidth)} cm</td>
                <td style={{ padding: '0.75rem' }}>{formatNumber(results.totalPanels)} {t.unitPcs}</td>
                <td style={{ padding: '0.75rem' }}>{renderPriceBadge(panelUnitPrice)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{renderSubtotalBadge(panelCost, panelUnitPrice)}</td>
              </tr>

              {/* Framing / Purlins Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {inputs.purlinColor && (
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: inputs.purlinColor, border: '1px solid rgba(255,255,255,0.3)' }} />
                    )}
                    <strong style={{ color: '#ffffff' }}>
                      {t.purlinLineItem} ({inputs.purlinMaterial === 'wood' ? t.materialWood : t.materialMetal})
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    <span>{inputs.purlinSizeWidth}×{inputs.purlinSizeHeight} mm | {t.purlinSpacing}: {inputs.purlinSpacing} cm | {t.framingOrientation}: {framingOrientationLabel}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>{formatNumber(Math.round(results.purlinTotalLength))} {t.unitMeter}</td>
                <td style={{ padding: '0.75rem' }}>{formatNumber(results.purlinRowsPerSlope * results.slopesCount)} {t.unitRows || 'rows'}</td>
                <td style={{ padding: '0.75rem' }}>{renderPriceBadge(purlinUnitPrice, ' / m')}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{renderSubtotalBadge(purlinCost, purlinUnitPrice)}</td>
              </tr>

              {/* EPDM Screws Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem' }}>
                  <strong style={{ color: '#ffffff' }}>{t.epdmScrewLineItem}</strong>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {t.epdmCoating}
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>50 mm</td>
                <td style={{ padding: '0.75rem' }}>{formatNumber(results.screwsCount)} {t.unitPcs}</td>
                <td style={{ padding: '0.75rem' }}>{renderPriceBadge(screwUnitPrice)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{renderSubtotalBadge(screwCost, screwUnitPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Invoice Financial Summary & Terms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Structural Specs Card */}
        <div className="report-card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={18} />
            {t.engineeringSpecs}
          </h4>
          <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingLeft: isRtl ? 0 : '1.2rem', paddingRight: isRtl ? '1.2rem' : 0 }}>
            <li>{t.windLoadSpec}</li>
            <li>{t.waterConductSpec}</li>
            <li>{t.wastePercentSpec} {formatNumber(Math.round(results.wastePercent * 10) / 10)}%</li>
            <li>{t.totalWeightSpec} {formatNumber(Math.round(results.totalSheetWeight + results.totalPurlinWeight))} {t.unitKg}</li>
          </ul>
        </div>

        {/* Financial Summary Card */}
        <div className="report-card" style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid var(--border-color-glow)',
          borderRadius: '14px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Coins size={16} color="var(--accent-emerald)" />
              {t.finalFinancialSummary}
            </h4>
            <div className="cost-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>{t.panelQuantity} ({results.totalPanels} {t.unitPcs})</span>
                <span style={{ fontWeight: '600', color: '#fff' }}>{renderSubtotalBadge(panelCost, panelUnitPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>{t.purlinLineItem} ({Math.round(results.purlinTotalLength)} m)</span>
                <span style={{ fontWeight: '600', color: '#fff' }}>{renderSubtotalBadge(purlinCost, purlinUnitPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>{t.epdmScrewLineItem} ({results.screwsCount} {t.unitPcs})</span>
                <span style={{ fontWeight: '600', color: '#fff' }}>{renderSubtotalBadge(screwCost, screwUnitPrice)}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.6rem', marginTop: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#ffffff' }}>{t.totalAmount}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: grandTotalCost > 0 ? 'var(--accent-emerald)' : '#f87171' }}>
                  {renderSubtotalBadge(grandTotalCost, grandTotalCost)}
                </span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>
            * {t.invoiceTaxNote || 'Net subtotal excludes regional VAT and local jobsite delivery charges.'}
          </p>
        </div>
      </div>

      {/* 7. Official Engineering Sign-Off Approval Block */}
      <div className="report-card" style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed var(--border-color-glow)',
        borderRadius: '14px',
        padding: '1.5rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <h4 style={{ fontSize: '0.88rem', color: 'var(--accent-cyan)', marginBottom: '1.25rem', textAlign: 'center' }}>
          {t.approvalSignOff}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>{t.engineerSeal}</span>
            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(6, 182, 212, 0.4)', fontStyle: 'italic', fontSize: '0.75rem' }}>
              {t.engineerStampBox || '[ Structural Engineer Stamp & Signature Box ]'}
            </div>
            <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>{engineerName}</strong>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>{t.clientSeal}</span>
            <div style={{ height: '40px', display: 'center', alignItems: 'center', justifyContent: 'center', color: 'rgba(139, 92, 246, 0.4)', fontStyle: 'italic', fontSize: '0.75rem' }}>
              {t.clientStampBox || '[ Client Approval & Acceptance Stamp ]'}
            </div>
            <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>{clientName}</strong>
          </div>
        </div>
      </div>

    </div>
  );
};
