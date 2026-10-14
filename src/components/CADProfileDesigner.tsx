import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';
import type { RoofInputs } from '../utils/calculator';
import {
  Ruler,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Box,
  Layers,
  Download,
  RotateCcw,
  Undo2,
  Redo2,
  FlipHorizontal,
  Compass,
  FileCode,
  FileImage,
  Upload,
  ShieldCheck,
  Activity,
  Droplets,
  Scale,
  Eye,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sparkles,
  MousePointerClick,
  Columns3
} from 'lucide-react';

/* =========================================================================
   TYPE DEFINITIONS & HELPER PRESETS
   ========================================================================= */

export function generateMultiRibPoints(
  crestsCount: number = 5,
  valleysCount: number = 4,
  ribWidthMm: number = 37,
  valleyWidthMm: number = 66,
  ribHeightMm: number = 22,
  fluteCount: number = 1,
  fluteDepthMm: number = 3,
  fluteWidthMm: number = 10,
  fluteType: 'v_groove' | 'micro_rib' | 'box_groove' = 'v_groove'
): Array<[number, number]> {
  const totalW = crestsCount * ribWidthMm + valleysCount * valleyWidthMm;
  const wSlant = Math.min(ribWidthMm * 0.35, 12.5);
  const wTop = Math.max(1, ribWidthMm - 2 * wSlant);

  const ptsMm: Array<[number, number]> = [[0, 0]];
  let curX = 0;

  for (let i = 0; i < crestsCount; i++) {
    ptsMm.push([curX + wSlant, ribHeightMm]);
    ptsMm.push([curX + wSlant + wTop, ribHeightMm]);
    ptsMm.push([curX + ribWidthMm, 0]);
    curX += ribWidthMm;

    if (i < valleysCount) {
      if (fluteCount > 0) {
        const actualFluteW = Math.min(fluteWidthMm, valleyWidthMm / (fluteCount + 1));
        const spacing = (valleyWidthMm - fluteCount * actualFluteW) / (fluteCount + 1);

        let vCur = curX;
        for (let f = 0; f < fluteCount; f++) {
          vCur += spacing;
          ptsMm.push([vCur, 0]);

          if (fluteType === 'v_groove') {
            ptsMm.push([vCur + actualFluteW / 2, -fluteDepthMm]);
            ptsMm.push([vCur + actualFluteW, 0]);
          } else if (fluteType === 'micro_rib') {
            ptsMm.push([vCur + actualFluteW * 0.25, fluteDepthMm]);
            ptsMm.push([vCur + actualFluteW * 0.75, fluteDepthMm]);
            ptsMm.push([vCur + actualFluteW, 0]);
          } else {
            ptsMm.push([vCur + 1, -fluteDepthMm]);
            ptsMm.push([vCur + actualFluteW - 1, -fluteDepthMm]);
            ptsMm.push([vCur + actualFluteW, 0]);
          }
          vCur += actualFluteW;
        }
      }
      curX += valleyWidthMm;
      ptsMm.push([curX, 0]);
    }
  }

  const normalized: Array<[number, number]> = ptsMm.map((pt) => [
    Math.min(1, Math.max(0, pt[0] / totalW)),
    Math.min(1, Math.max(0, pt[1] / ribHeightMm))
  ]);
  normalized[0][0] = 0;
  normalized[normalized.length - 1][0] = 1;
  return normalized;
}

export type CADPresetKey = 'prr1' | 'trapezoid' | 'sine' | 'standing' | 'tile' | 'boxrib';

interface CADPresetConfig {
  nameKey: string;
  defaultPitchMm: number;
  defaultRibHeightMm: number;
  defaultCoverageWidthMm: number;
  points: Array<[number, number]>;
  description: string;
}

export const CAD_PRESETS: Record<CADPresetKey, CADPresetConfig> = {
  prr1: {
    nameKey: 'presetPRR1',
    defaultPitchMm: 449,
    defaultRibHeightMm: 22,
    defaultCoverageWidthMm: 449,
    points: generateMultiRibPoints(5, 4, 37, 66, 22, 1, 3, 10, 'v_groove'),
    description: 'PRR1 Industrial 5-Rib Trapezoidal Profile with micro-stiffener valley (449mm coverage)'
  },
  trapezoid: {
    nameKey: 'presetTrapezoid',
    defaultPitchMm: 1000,
    defaultRibHeightMm: 35,
    defaultCoverageWidthMm: 1000,
    points: generateMultiRibPoints(4, 3, 50, 150, 35, 1, 4, 15, 'v_groove'),
    description: 'Heavy Commercial 35/200 Trapezoidal Profile with high load-bearing capacity'
  },
  sine: {
    nameKey: 'presetSine',
    defaultPitchMm: 836,
    defaultRibHeightMm: 18,
    defaultCoverageWidthMm: 836,
    points: [
      [0.0, 0.5],
      [0.125, 0.85],
      [0.25, 1.0],
      [0.375, 0.85],
      [0.5, 0.5],
      [0.625, 0.15],
      [0.75, 0.0],
      [0.875, 0.15],
      [1.0, 0.5]
    ],
    description: 'Classic Corrugated Sinusoidal 18/76 Wave Profile'
  },
  standing: {
    nameKey: 'presetStanding',
    defaultPitchMm: 500,
    defaultRibHeightMm: 25,
    defaultCoverageWidthMm: 500,
    points: [
      [0.0, 0.0],
      [0.03, 1.0],
      [0.06, 1.0],
      [0.08, 0.0],
      [0.92, 0.0],
      [0.94, 1.0],
      [0.97, 1.0],
      [1.0, 0.0]
    ],
    description: 'Modern Architectural Standing Seam Snap-Lock (25/500mm hidden fasteners)'
  },
  tile: {
    nameKey: 'presetTile',
    defaultPitchMm: 1050,
    defaultRibHeightMm: 40,
    defaultCoverageWidthMm: 1050,
    points: [
      [0.0, 0.0],
      [0.1, 0.0],
      [0.2, 0.4],
      [0.4, 1.0],
      [0.6, 1.0],
      [0.75, 0.2],
      [0.85, 0.0],
      [1.0, 0.0]
    ],
    description: 'Decra Stepped Roman Tile Impression for residential luxury roofing'
  },
  boxrib: {
    nameKey: 'presetBoxRib',
    defaultPitchMm: 900,
    defaultRibHeightMm: 30,
    defaultCoverageWidthMm: 900,
    points: [
      [0.0, 0.0],
      [0.2, 0.0],
      [0.25, 1.0],
      [0.55, 1.0],
      [0.6, 0.0],
      [1.0, 0.0]
    ],
    description: 'Box Rib Architectural Wall & Roof Cladding with sharp shadow accents'
  }
};

/* =========================================================================
   SUB-COMPONENT 1: 2D Full Sheet Assembly Cross-Section Canvas
   ========================================================================= */
const SinglePanel2DCanvas: React.FC<{
  points: Array<[number, number]>;
  pitchMm: number;
  ribHeightMm: number;
  totalCoverageMm: number;
  sheetThicknessMm: number;
  language: Language;
}> = ({
  points,
  ribHeightMm,
  totalCoverageMm,
  sheetThicknessMm,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);

  const t = translations[language];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth || 780;
    const ch = 280;

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(panX, 0);

    const padX = 70;
    const padY = 65;
    const availW = (cw - padX * 2) * zoom;
    const availH = ch - padY * 2;

    const rHeight = Math.max(5, ribHeightMm);
    const safeTotalW = Math.max(50, totalCoverageMm);

    const toX = (mmX: number) => padX + (mmX / safeTotalW) * availW;
    const toY = (mmY: number) => ch - padY - (mmY / rHeight) * availH;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = padX; x <= padX + availW; x += Math.max(20, availW / 10)) {
      ctx.beginPath();
      ctx.moveTo(x, padY - 25);
      ctx.lineTo(x, ch - padY + 30);
      ctx.stroke();
    }

    // Purlin Baseline
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX - 20, toY(0));
    ctx.lineTo(padX + availW + 20, toY(0));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(t.purlinTop || 'PURLIN TOP (Y=0)', padX - 10, toY(0) + 3);

    // Full polyline represents the single complete sheet
    const fullPts: Array<[number, number]> = points.map((pt) => [
      pt[0] * safeTotalW,
      pt[1] * rHeight
    ]);

    if (fullPts.length > 0) {
      // Shaded fill
      ctx.beginPath();
      ctx.moveTo(toX(fullPts[0][0]), toY(0));
      fullPts.forEach((pt) => ctx.lineTo(toX(pt[0]), toY(pt[1])));
      ctx.lineTo(toX(fullPts[fullPts.length - 1][0]), toY(0));
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, padY, 0, ch - padY);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Top Sheet line
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(toX(fullPts[0][0]), toY(fullPts[0][1]));
      for (let i = 1; i < fullPts.length; i++) {
        ctx.lineTo(toX(fullPts[i][0]), toY(fullPts[i][1]));
      }
      ctx.stroke();

      // Thickness line
      const thPx = Math.max(1, (sheetThicknessMm / rHeight) * (availH * 0.15));
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1;
      ctx.moveTo(toX(fullPts[0][0]), toY(fullPts[0][1]) + thPx);
      for (let i = 1; i < fullPts.length; i++) {
        ctx.lineTo(toX(fullPts[i][0]), toY(fullPts[i][1]) + thPx);
      }
      ctx.stroke();

      // Underlap / Overlap Callouts
      const leftX = toX(0);
      const leftY = toY(fullPts[0][1]);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(leftX, leftY - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(t.underLapCallout || '◄ UNDER-LAP (Anti-Capillary)', leftX + 8, leftY - 6);

      const rightX = toX(safeTotalW);
      const rightY = toY(fullPts[fullPts.length - 1][1]);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(rightX, rightY - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'right';
      ctx.fillText(t.overLapCallout || 'OVER-LAP SEAM ►', rightX - 8, rightY - 6);

      // Width Dimension Line
      const dimYBottom = ch - padY + 28;
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(toX(0), dimYBottom);
      ctx.lineTo(toX(safeTotalW), dimYBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toX(0), dimYBottom - 5);
      ctx.lineTo(toX(0), dimYBottom + 5);
      ctx.moveTo(toX(safeTotalW), dimYBottom - 5);
      ctx.lineTo(toX(safeTotalW), dimYBottom + 5);
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Inter, sans-serif';
      const covCm = (safeTotalW / 10).toFixed(1);
      ctx.fillText(`${t.coverageWidth}: ${Math.round(safeTotalW)} mm (${covCm} cm)`, (toX(0) + toX(safeTotalW)) / 2, dimYBottom + 16);

      // Height Dimension
      const dimXLeft = padX - 35;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dimXLeft, toY(0));
      ctx.lineTo(dimXLeft, toY(rHeight));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(dimXLeft - 4, toY(0));
      ctx.lineTo(dimXLeft + 4, toY(0));
      ctx.moveTo(dimXLeft - 4, toY(rHeight));
      ctx.lineTo(dimXLeft + 4, toY(rHeight));
      ctx.stroke();

      ctx.save();
      ctx.translate(dimXLeft - 10, (toY(0) + toY(rHeight)) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.font = '10px monospace';
      ctx.fillText(`H: ${Math.round(rHeight)} mm`, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }, [points, ribHeightMm, totalCoverageMm, sheetThicknessMm, language, zoom, panX]);

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `cad_cross_section_${Date.now()}.png`;
    a.click();
  };

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden', background: '#0a0d16', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.3rem', zIndex: 10 }}>
        <button
          type="button"
          className="overlay-btn"
          title="Zoom In"
          style={{ width: '28px', height: '28px', padding: 0 }}
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          className="overlay-btn"
          title="Zoom Out"
          style={{ width: '28px', height: '28px', padding: 0 }}
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          className="overlay-btn"
          title="Reset View"
          style={{ width: '28px', height: '28px', padding: 0 }}
          onClick={() => { setZoom(1.0); setPanX(0); }}
        >
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          className="overlay-btn"
          title={t.exportPNG || 'Export Image'}
          style={{ padding: '0 0.5rem', height: '28px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          onClick={handleExportPNG}
        >
          <FileImage size={14} />
          PNG
        </button>
      </div>

      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '280px', cursor: 'grab' }}
        onMouseDown={(e) => {
          isDragging.current = true;
          dragStartX.current = e.clientX - panX;
        }}
        onMouseMove={(e) => {
          if (!isDragging.current) return;
          setPanX(e.clientX - dragStartX.current);
        }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
      />
    </div>
  );
};

/* =========================================================================
   SUB-COMPONENT 2: 3D Interactive WebGL Sheet Panel Canvas
   ========================================================================= */
const SinglePanel3DCanvas: React.FC<{
  inputs: RoofInputs;
  points: Array<[number, number]>;
  pitchMm: number;
  language: Language;
}> = ({ inputs, points, pitchMm, language }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [materialPreset, setMaterialPreset] = useState<'galvanized' | 'pvdf' | 'copper' | 'corten' | 'aluminum'>('pvdf');

  const t = translations[language];

  const handleSetView = (view: 'iso' | 'top' | 'side' | 'front') => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    if (view === 'iso') {
      camera.position.set(1.5, 1.8, 3.2);
      controls.target.set(0, 0, 0);
    } else if (view === 'top') {
      camera.position.set(0, 4.0, 0.01);
      controls.target.set(0, 0, 0);
    } else if (view === 'side') {
      camera.position.set(3.5, 0.1, 0);
      controls.target.set(0, 0, 0);
    } else if (view === 'front') {
      camera.position.set(0, 0.1, 3.5);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 780;
    const height = 340;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07090e');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
    camera.position.set(1.5, 1.8, 3.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const blueLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    blueLight.position.set(-5, 4, -4);
    scene.add(blueLight);

    const gridHelper = new THREE.GridHelper(8, 20, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.005;
    scene.add(gridHelper);

    let matColor = inputs.panelColor || '#475569';
    let metalness = 0.8;
    let roughness = 0.3;

    if (materialPreset === 'copper') {
      matColor = '#b45309';
      metalness = 0.9;
      roughness = 0.25;
    } else if (materialPreset === 'galvanized') {
      matColor = '#94a3b8';
      metalness = 0.95;
      roughness = 0.4;
    } else if (materialPreset === 'corten') {
      matColor = '#7c2d12';
      metalness = 0.3;
      roughness = 0.85;
    } else if (materialPreset === 'aluminum') {
      matColor = '#cbd5e1';
      metalness = 0.85;
      roughness = 0.2;
    }

    const panelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matColor),
      metalness,
      roughness,
      wireframe,
      side: THREE.DoubleSide,
    });

    const panelGroup = new THREE.Group();
    const pWidthM = Math.max(0.1, (inputs.panelWidth || 44.9) / 100);
    const pLengthM = Math.max(0.1, (inputs.panelLength || 350) / 100);
    const rHeightM = (inputs.ribHeight || 22) / 1000;
    const thicknessM = (inputs.panelThickness || 0.5) / 1000;

    const topPoints: Array<{ x: number; y: number }> = [];
    const bottomPoints: Array<{ x: number; y: number }> = [];

    // The CAD profile directly defines ONE single sheet cross-section
    points.forEach((pt) => {
      const x = -pWidthM / 2 + pt[0] * pWidthM;
      const y = pt[1] * rHeightM;
      topPoints.push({ x, y });
    });

    for (let i = topPoints.length - 1; i >= 0; i--) {
      const pt = topPoints[i];
      bottomPoints.push({ x: pt.x, y: pt.y - thicknessM });
    }

    const shape = new THREE.Shape();
    if (topPoints.length > 0) {
      shape.moveTo(topPoints[0].x, topPoints[0].y);
      for (let i = 1; i < topPoints.length; i++) {
        shape.lineTo(topPoints[i].x, topPoints[i].y);
      }
      for (let i = 0; i < bottomPoints.length; i++) {
        shape.lineTo(bottomPoints[i].x, bottomPoints[i].y);
      }
      shape.closePath();
    }

    const extrudeSettings = {
      depth: pLengthM,
      bevelEnabled: false,
      steps: 1,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geom, panelMaterial);
    mesh.position.z = -pLengthM / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    panelGroup.add(mesh);

    controls.target.set(0, rHeightM / 2, 0);
    scene.add(panelGroup);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [inputs, points, pitchMm, wireframe, materialPreset]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '340px', borderRadius: '10px', overflow: 'hidden', background: '#07090e', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.35rem', zIndex: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="overlay-btn"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          onClick={() => handleSetView('iso')}
        >
          <Box size={13} /> {t.viewIso || 'Iso'}
        </button>
        <button
          type="button"
          className="overlay-btn"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          onClick={() => handleSetView('top')}
        >
          <Eye size={13} /> {t.viewTop || 'Top'}
        </button>
        <button
          type="button"
          className="overlay-btn"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          onClick={() => handleSetView('side')}
        >
          <Layers size={13} /> {t.viewSide || 'Cross'}
        </button>
        <button
          type="button"
          className="overlay-btn"
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            background: wireframe ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            color: wireframe ? '#fff' : 'inherit'
          }}
          onClick={() => setWireframe(!wireframe)}
        >
          {t.wireframeMode || 'Wireframe'}
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '0.3rem', zIndex: 10, background: 'rgba(15,23,42,0.85)', padding: '0.3rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
        {(['pvdf', 'galvanized', 'aluminum', 'copper', 'corten'] as const).map((mat) => (
          <button
            key={mat}
            type="button"
            style={{
              background: materialPreset === mat ? 'var(--accent-cyan)' : 'transparent',
              color: materialPreset === mat ? '#000' : '#cbd5e1',
              border: 'none',
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: materialPreset === mat ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
            onClick={() => setMaterialPreset(mat)}
          >
            {mat.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        pointerEvents: 'none'
      }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', color: '#38bdf8', fontWeight: 'bold' }}>
          📐 {t.panelLength}: {inputs.panelLength || 350} cm
        </div>
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(244, 114, 182, 0.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', color: '#f472b6', fontWeight: 'bold' }}>
          📏 {t.coverageWidth}: {inputs.panelWidth || 44.9} cm
        </div>
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', color: '#c084fc', fontWeight: 'bold' }}>
          📊 {t.panelThickness}: {inputs.ribHeight || 22} mm
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   MAIN COMPONENT: CADProfileDesigner
   ========================================================================= */
interface CADProfileDesignerProps {
  inputs: RoofInputs;
  setInputs: React.Dispatch<React.SetStateAction<RoofInputs>>;
  language: Language;
}

export const CADProfileDesigner: React.FC<CADProfileDesignerProps> = ({
  inputs,
  setInputs,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const t = translations[language];

  // Active Selected Node & Drag State
  const [activeNodeIdx, setActiveNodeIdx] = useState<number | null>(null);
  const [hoverNodeIdx, setHoverNodeIdx] = useState<number | null>(null);
  const [singleViewMode, setSingleViewMode] = useState<'2d' | '3d'>('2d');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Pitch & Geometry State
  const [pitchMm, setPitchMm] = useState<number>((inputs.panelWidth || 44.9) * 10);
  const [ribHeightMm, setRibHeightMm] = useState<number>(inputs.ribHeight || 22);

  // --- FULL MULTI-RIB & MULTI-VALLEY PANEL BUILDER STATE (e.g. 5 crests + 4 valleys) ---
  const [panelCrestsCount, setPanelCrestsCount] = useState<number>(5);
  const [panelValleysCount, setPanelValleysCount] = useState<number>(4);
  const [panelRibWidthMm, setPanelRibWidthMm] = useState<number>(37);
  const [panelValleyWidthMm, setPanelValleyWidthMm] = useState<number>(66);
  const [valleyFluteCount, setValleyFluteCount] = useState<number>(1);
  const [valleyFluteDepthMm, setValleyFluteDepthMm] = useState<number>(3);
  const [valleyFluteWidthMm, setValleyFluteWidthMm] = useState<number>(10);
  const [valleyFluteType, setValleyFluteType] = useState<'v_groove' | 'micro_rib' | 'box_groove'>('v_groove');

  const computedMultiRibTotalWidthMm = panelCrestsCount * panelRibWidthMm + panelValleysCount * panelValleyWidthMm;
  const isMultiRibSymmetrical = panelCrestsCount === panelValleysCount + 1 || panelValleysCount === panelCrestsCount + 1;

  // Active Points normalized 0..1 in X, 0..1 in Y
  const points: Array<[number, number]> = inputs.customProfilePoints || [
    [0.0, 0.0],
    [0.1214, 1.0],
    [0.2379, 1.0],
    [0.3592, 0.0],
    [1.0, 0.0]
  ];

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Array<Array<[number, number]>>>([points]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  const pushHistory = useCallback((newPts: Array<[number, number]>) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIdx + 1);
      return [...sliced, newPts];
    });
    setHistoryIdx((prev) => prev + 1);
  }, [historyIdx]);

  const handleUndo = () => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      const restored = history[nextIdx];
      setInputs((prev) => ({ ...prev, customProfilePoints: restored }));
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      const restored = history[nextIdx];
      setInputs((prev) => ({ ...prev, customProfilePoints: restored }));
    }
  };

  // Switch Preset
  const handleApplyPreset = (key: CADPresetKey) => {
    const preset = CAD_PRESETS[key];
    if (!preset) return;

    setPitchMm(preset.defaultPitchMm);
    setRibHeightMm(preset.defaultRibHeightMm);

    const newPts = JSON.parse(JSON.stringify(preset.points));
    pushHistory(newPts);

    setInputs((prev) => ({
      ...prev,
      panelType: key === 'prr1' ? 'prr1' : 'custom',
      panelWidth: preset.defaultCoverageWidthMm / 10,
      ribHeight: preset.defaultRibHeightMm,
      customProfilePoints: newPts,
    }));
  };

  // Canvas Geometry Configuration
  const cWidth = 620;
  const cHeight = 310;
  const paddingX = 55;
  const paddingY = 55;

  const toCanvasCoords = (pt: [number, number]): { x: number; y: number } => {
    const x = paddingX + pt[0] * (cWidth - paddingX * 2);
    const y = cHeight - paddingY - pt[1] * (cHeight - paddingY * 2);
    return { x, y };
  };

  const toNormalizedCoords = (cx: number, cy: number): { x: number; y: number } => {
    let normX = (cx - paddingX) / (cWidth - paddingX * 2);
    let normY = (cHeight - paddingY - cy) / (cHeight - paddingY * 2);

    normX = Math.max(0, Math.min(1, normX));
    normY = Math.max(0, Math.min(1, normY));

    if (snapToGrid) {
      const stepX = 1 / Math.max(10, pitchMm);
      const stepY = 1 / Math.max(5, ribHeightMm);
      normX = Math.round(normX / stepX) * stepX;
      normY = Math.round(normY / stepY) * stepY;
    }

    return {
      x: Math.max(0, Math.min(1, normX)),
      y: Math.max(0, Math.min(1, normY)),
    };
  };

  // Calculations
  let cycleDevelopedWidthMm = 0;
  let maxFlankAngleDeg = 0;
  let valleyFlowAreaMm2 = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = (points[i][0] - points[i - 1][0]) * pitchMm;
    const dy = (points[i][1] - points[i - 1][1]) * ribHeightMm;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    cycleDevelopedWidthMm += segLen;

    if (Math.abs(dx) > 0.001) {
      const angle = (Math.atan(Math.abs(dy) / Math.abs(dx)) * 180) / Math.PI;
      if (angle > maxFlankAngleDeg) {
        maxFlankAngleDeg = angle;
      }
    } else if (Math.abs(dy) > 0.001) {
      maxFlankAngleDeg = 90;
    }

    const avgH = ((points[i][1] + points[i - 1][1]) / 2) * ribHeightMm;
    valleyFlowAreaMm2 += Math.abs(dx) * (ribHeightMm - avgH);
  }

  const totalCoverageMm = (inputs.panelWidth || 44.9) * 10;
  const isFullPanel = Math.abs(totalCoverageMm - pitchMm) < 5 || points.length > 10;
  const repeats = isFullPanel ? 1 : Math.max(1, Math.round(totalCoverageMm / Math.max(10, pitchMm)));
  const totalDevelopedWidthMm = cycleDevelopedWidthMm * repeats;
  const stretchRatio = cycleDevelopedWidthMm / Math.max(1, pitchMm);

  const thicknessMm = inputs.panelThickness || 0.5;
  const tCm = thicknessMm / 10;
  const hCm = ribHeightMm / 10;
  const approxIx = ((tCm * Math.pow(hCm, 3)) / 12 + tCm * Math.pow(hCm, 2) * 0.4) * (100 / (Math.max(10, pitchMm) / 10));
  const approxWx = approxIx / Math.max(0.1, hCm / 2);

  const standardCoilWidths = [1000, 1219, 1250, 1500];
  const matchedCoil = standardCoilWidths.find((cw) => cw >= totalDevelopedWidthMm) || standardCoilWidths[standardCoilWidths.length - 1];
  const coilScrapPercent = matchedCoil >= totalDevelopedWidthMm
    ? (((matchedCoil - totalDevelopedWidthMm) / matchedCoil) * 100).toFixed(1)
    : '0.0';

  // Draw 2D CAD Viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cWidth * dpr;
    canvas.height = cHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, cWidth, cHeight);

    const numTicksX = 10;
    const numTicksY = 5;
    const stepPxX = (cWidth - paddingX * 2) / numTicksX;
    const stepPxY = (cHeight - paddingY * 2) / numTicksY;

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = paddingX; x <= cWidth - paddingX; x += stepPxX / 2) {
      ctx.beginPath();
      ctx.moveTo(x, paddingY);
      ctx.lineTo(x, cHeight - paddingY);
      ctx.stroke();
    }
    for (let y = paddingY; y <= cHeight - paddingY; y += stepPxY / 2) {
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(cWidth - paddingX, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(paddingX, paddingY, cWidth - paddingX * 2, cHeight - paddingY * 2);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= numTicksX; i++) {
      const valMm = (i / numTicksX) * pitchMm;
      const x = paddingX + i * stepPxX;
      ctx.fillText(`${Math.round(valMm)}`, x, cHeight - paddingY + 16);

      ctx.beginPath();
      ctx.moveTo(x, cHeight - paddingY);
      ctx.lineTo(x, cHeight - paddingY + 5);
      ctx.stroke();
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= numTicksY; i++) {
      const valMm = (i / numTicksY) * ribHeightMm;
      const y = cHeight - paddingY - i * stepPxY;
      ctx.fillText(`${Math.round(valMm)}`, paddingX - 10, y);

      ctx.beginPath();
      ctx.moveTo(paddingX - 5, y);
      ctx.lineTo(paddingX, y);
      ctx.stroke();
    }

    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Y (mm)', paddingX - 10, paddingY - 16);
    ctx.textAlign = 'center';
    ctx.fillText(`X (${t.totalWidthCAD || t.totalWidth || 'Total Width'} = ${Math.round(pitchMm)} mm)`, cWidth / 2, cHeight - 12);

    // Shaded path
    ctx.beginPath();
    ctx.moveTo(toCanvasCoords(points[0]).x, toCanvasCoords([0, 0]).y);
    points.forEach((pt) => {
      const { x, y } = toCanvasCoords(pt);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(toCanvasCoords(points[points.length - 1]).x, toCanvasCoords([0, 0]).y);
    ctx.closePath();

    const polyGrad = ctx.createLinearGradient(0, paddingY, 0, cHeight - paddingY);
    polyGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    polyGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
    ctx.fillStyle = polyGrad;
    ctx.fill();

    // Main polyline
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Segment dimension tags
    ctx.lineWidth = 1;
    ctx.font = '8.5px monospace';
    for (let i = 1; i < points.length; i++) {
      const p1 = toCanvasCoords(points[i - 1]);
      const p2 = toCanvasCoords(points[i]);

      const dx = (points[i][0] - points[i - 1][0]) * pitchMm;
      const dy = (points[i][1] - points[i - 1][1]) * ribHeightMm;
      const len = Math.sqrt(dx * dx + dy * dy);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      ctx.beginPath();
      ctx.arc(midX, midY, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(len)}`, midX, midY);
    }

    // Draggable Nodes
    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      const isSelected = activeNodeIdx === idx;
      const isHovered = hoverNodeIdx === idx;

      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 14 : isHovered ? 11 : 8, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? 'rgba(244, 114, 182, 0.4)'
        : isHovered
        ? 'rgba(56, 189, 248, 0.35)'
        : 'rgba(6, 182, 212, 0.2)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#f472b6' : '#06b6d4';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${idx + 1}`, x, y - 10);
    });

  }, [points, activeNodeIdx, hoverNodeIdx, pitchMm, ribHeightMm, snapToGrid]);

  // Handle Mouse Events for Canvas Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let clickedIdx: number | null = null;
    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (dist < 18) {
        clickedIdx = idx;
      }
    });

    if (clickedIdx !== null) {
      setActiveNodeIdx(clickedIdx);
    }
  };

  // RIGHT-CLICK Handler: Add node at click position OR Delete if clicked on node
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let clickedNodeIdx: number | null = null;
    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (dist < 18) clickedNodeIdx = idx;
    });

    if (clickedNodeIdx !== null) {
      if (clickedNodeIdx > 0 && clickedNodeIdx < points.length - 1) {
        handleDeletePoint(clickedNodeIdx);
      }
      return;
    }

    const norm = toNormalizedCoords(mx, my);
    const clickX = Math.max(0.005, Math.min(0.995, norm.x));
    const clickY = Math.max(0, Math.min(1, norm.y));

    let insertIdx = 0;
    for (let i = 0; i < points.length - 1; i++) {
      if (clickX >= points[i][0] && clickX <= points[i + 1][0]) {
        insertIdx = i;
        break;
      }
    }

    const newPt: [number, number] = [clickX, clickY];
    const updated = [
      ...points.slice(0, insertIdx + 1),
      newPt,
      ...points.slice(insertIdx + 1),
    ];

    pushHistory(updated);
    setInputs((prev) => ({ ...prev, customProfilePoints: updated }));
    setActiveNodeIdx(insertIdx + 1);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hIdx: number | null = null;
    points.forEach((pt, idx) => {
      const { x, y } = toCanvasCoords(pt);
      const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (dist < 18) hIdx = idx;
    });
    setHoverNodeIdx(hIdx);

    if (activeNodeIdx === null) return;

    const norm = toNormalizedCoords(mx, my);
    let targetX = norm.x;

    if (activeNodeIdx === 0) {
      targetX = 0;
    } else if (activeNodeIdx === points.length - 1) {
      targetX = 1;
    } else {
      const minX = points[activeNodeIdx - 1][0] + 0.002;
      const maxX = points[activeNodeIdx + 1][0] - 0.002;
      targetX = Math.max(minX, Math.min(maxX, norm.x));
    }

    const updated = points.map((pt, idx) => {
      if (idx === activeNodeIdx) {
        return [targetX, norm.y] as [number, number];
      }
      return pt;
    });

    setInputs((prev) => ({ ...prev, customProfilePoints: updated }));
  };

  const handleMouseUp = () => {
    if (activeNodeIdx !== null) {
      pushHistory(points);
    }
    setActiveNodeIdx(null);
  };

  // Add Point
  const handleAddPoint = () => {
    if (points.length >= 48) return;
    const insertIdx = activeNodeIdx !== null && activeNodeIdx < points.length - 1
      ? activeNodeIdx
      : Math.floor(points.length / 2);

    const p1 = points[insertIdx];
    const p2 = points[insertIdx + 1];

    const newPt: [number, number] = [
      (p1[0] + p2[0]) / 2,
      (p1[1] + p2[1]) / 2
    ];

    const updated = [
      ...points.slice(0, insertIdx + 1),
      newPt,
      ...points.slice(insertIdx + 1)
    ];

    pushHistory(updated);
    setInputs((prev) => ({ ...prev, customProfilePoints: updated }));
    setActiveNodeIdx(insertIdx + 1);
  };

  // Delete Point
  const handleDeletePoint = (idx: number) => {
    if (points.length <= 3) return;
    if (idx === 0 || idx === points.length - 1) return;

    const updated = points.filter((_, i) => i !== idx);
    pushHistory(updated);
    setInputs((prev) => ({ ...prev, customProfilePoints: updated }));
    setActiveNodeIdx(null);
  };

  // Move Node Up or Down
  const handleMoveNode = (idx: number, dir: 'up' | 'down') => {
    if (idx <= 0 || idx >= points.length - 1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx <= 0 || targetIdx >= points.length - 1) return;

    const updated = [...points];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    pushHistory(updated);
    setInputs((prev) => ({ ...prev, customProfilePoints: updated }));
    setActiveNodeIdx(targetIdx);
  };

  // Sort Nodes Ascending by X
  const handleSortNodesByX = () => {
    if (points.length <= 2) return;
    const first = points[0];
    const last = points[points.length - 1];
    const middle = points.slice(1, points.length - 1);

    middle.sort((a, b) => a[0] - b[0]);

    const sorted = [first, ...middle, last];
    pushHistory(sorted);
    setInputs((prev) => ({ ...prev, customProfilePoints: sorted }));
  };

  // Symmetrize / Mirror Tool
  const handleMirrorSymmetry = () => {
    const halfLen = Math.ceil(points.length / 2);
    const leftHalf = points.slice(0, halfLen);

    const mirrored: Array<[number, number]> = [];
    leftHalf.forEach((pt) => {
      mirrored.push([pt[0] * 0.5, pt[1]]);
    });

    for (let i = leftHalf.length - 1; i >= 0; i--) {
      if (i === leftHalf.length - 1) continue;
      const pt = leftHalf[i];
      mirrored.push([1 - pt[0] * 0.5, pt[1]]);
    }

    mirrored[0][0] = 0;
    mirrored[mirrored.length - 1][0] = 1;

    pushHistory(mirrored);
    setInputs((prev) => ({ ...prev, customProfilePoints: mirrored }));
  };

  // Invert Profile
  const handleInvertProfile = () => {
    const inverted: Array<[number, number]> = points.map((pt) => [pt[0], 1 - pt[1]]);
    pushHistory(inverted);
    setInputs((prev) => ({ ...prev, customProfilePoints: inverted }));
  };

  // =========================================================================
  // MULTI-RIB & MULTI-VALLEY FULL PANEL GENERATOR ENGINE (e.g. 5 Crests + 4 Valleys)
  // =========================================================================
  const handleGenerateMultiRibPanel = (
    cCount: number = panelCrestsCount,
    vCount: number = panelValleysCount,
    rWidth: number = panelRibWidthMm,
    vWidth: number = panelValleyWidthMm,
    fluteNum: number = valleyFluteCount,
    fluteD: number = valleyFluteDepthMm,
    fluteW: number = valleyFluteWidthMm
  ) => {
    const rHeight = ribHeightMm || 22;
    const computedTotalWidth = cCount * rWidth + vCount * vWidth;

    const wSlant = Math.min(rWidth * 0.35, 12.5);
    const wTop = Math.max(1, rWidth - 2 * wSlant);

    const ptsMm: Array<[number, number]> = [[0, 0]];
    let curX = 0;

    for (let i = 0; i < cCount; i++) {
      // 1. Crest Peak
      ptsMm.push([curX + wSlant, rHeight]);
      ptsMm.push([curX + wSlant + wTop, rHeight]);
      ptsMm.push([curX + rWidth, 0]);
      curX += rWidth;

      // 2. Valley (if within count)
      if (i < vCount) {
        if (fluteNum > 0) {
          const actualFluteW = Math.min(fluteW, vWidth / (fluteNum + 1));
          const spacing = (vWidth - fluteNum * actualFluteW) / (fluteNum + 1);

          let vCur = curX;
          for (let f = 0; f < fluteNum; f++) {
            vCur += spacing;
            ptsMm.push([vCur, 0]);

            if (valleyFluteType === 'v_groove') {
              ptsMm.push([vCur + actualFluteW / 2, -fluteD]);
              ptsMm.push([vCur + actualFluteW, 0]);
            } else if (valleyFluteType === 'micro_rib') {
              ptsMm.push([vCur + actualFluteW * 0.25, fluteD]);
              ptsMm.push([vCur + actualFluteW * 0.75, fluteD]);
              ptsMm.push([vCur + actualFluteW, 0]);
            } else {
              ptsMm.push([vCur + 1, -fluteD]);
              ptsMm.push([vCur + actualFluteW - 1, -fluteD]);
              ptsMm.push([vCur + actualFluteW, 0]);
            }
            vCur += actualFluteW;
          }
        }
        curX += vWidth;
        ptsMm.push([curX, 0]);
      }
    }

    const normalizedPts: Array<[number, number]> = ptsMm.map((pt) => [
      Math.min(1, Math.max(0, pt[0] / computedTotalWidth)),
      Math.min(1, Math.max(0, pt[1] / rHeight)),
    ]);

    normalizedPts[0][0] = 0;
    normalizedPts[normalizedPts.length - 1][0] = 1;

    setPitchMm(computedTotalWidth);
    pushHistory(normalizedPts);

    setInputs((prev) => ({
      ...prev,
      panelType: 'custom',
      panelWidth: computedTotalWidth / 10,
      ribHeight: rHeight,
      customProfilePoints: normalizedPts,
    }));
  };

  // Export AutoCAD (.DXF)
  const handleExportDXF = () => {
    const thMm = inputs.panelThickness || 0.5;
    let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';

    dxf += '0\nPOLYLINE\n8\nPROFILE_TOP\n66\n1\n70\n0\n';
    points.forEach((pt) => {
      const x = pt[0] * pitchMm;
      const y = pt[1] * ribHeightMm;
      dxf += `0\nVERTEX\n8\nPROFILE_TOP\n10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}\n30\n0.0\n`;
    });
    dxf += '0\nSEQEND\n';

    dxf += '0\nPOLYLINE\n8\nPROFILE_BOTTOM\n66\n1\n70\n0\n';
    points.forEach((pt) => {
      const x = pt[0] * pitchMm;
      const y = pt[1] * ribHeightMm - thMm;
      dxf += `0\nVERTEX\n8\nPROFILE_BOTTOM\n10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}\n30\n0.0\n`;
    });
    dxf += '0\nSEQEND\n';

    dxf += '0\nENDSEC\n0\nEOF\n';

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roofmaster_profile_${panelCrestsCount}crests_${Math.round(pitchMm)}mm.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Vector (.SVG)
  const handleExportSVG = () => {
    const totalW = pitchMm;
    const svgW = totalW + 100;
    const svgH = ribHeightMm + 100;

    let pathD = `M 50 ${50 + ribHeightMm - points[0][1] * ribHeightMm}`;
    points.forEach((pt) => {
      const x = 50 + pt[0] * pitchMm;
      const y = 50 + ribHeightMm - pt[1] * ribHeightMm;
      pathD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    const svgContent = `<?xml version="1.0" standalone="no"?>
<svg width="${svgW}mm" height="${svgH}mm" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <rect width="100%" height="100%" fill="#0a0d16"/>
  <text x="50" y="30" fill="#06b6d4" font-family="sans-serif" font-size="14" font-weight="bold">RoofMaster CAD Pro - Multi-Rib Profile (${panelCrestsCount} Crests, ${totalW}mm)</text>
  <path d="${pathD}" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round"/>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roofmaster_profile_${pitchMm}mm.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save / Load JSON Profile Preset
  const handleSaveJSON = () => {
    const data = {
      version: '2.0',
      panelType: inputs.panelType,
      pitchMm,
      ribHeightMm,
      coverageWidthMm: totalCoverageMm,
      crestsCount: panelCrestsCount,
      valleysCount: panelValleysCount,
      thicknessMm,
      points,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_profile_${panelCrestsCount}C_${panelValleysCount}V.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.points && Array.isArray(parsed.points)) {
          if (parsed.pitchMm) setPitchMm(parsed.pitchMm);
          if (parsed.ribHeightMm) setRibHeightMm(parsed.ribHeightMm);
          if (parsed.crestsCount) setPanelCrestsCount(parsed.crestsCount);
          if (parsed.valleysCount) setPanelValleysCount(parsed.valleysCount);
          pushHistory(parsed.points);
          setInputs((prev) => ({
            ...prev,
            ribHeight: parsed.ribHeightMm || prev.ribHeight,
            panelWidth: parsed.coverageWidthMm ? parsed.coverageWidthMm / 10 : prev.panelWidth,
            customProfilePoints: parsed.points,
          }));
        }
      } catch (err) {
        alert('Invalid CAD Profile JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="cad-container" style={{ display: 'flex', flexGrow: 1, padding: '1.5rem 1.5rem', background: '#07090e', gap: '1.5rem', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
      
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleLoadJSON}
        style={{ display: 'none' }}
      />

      {/* LEFT COLUMN: Main CAD Viewport, Tools, and Single Panel Inspector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, overflowY: 'auto', paddingRight: '0.4rem' }}>
        
        {/* 1. Header & Presets Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
              <Ruler size={20} color="var(--accent-cyan)" />
              {t.cadStudioTitle}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {t.cadStudioDesc}
            </p>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={panelCrestsCount === 5 && panelValleysCount === 4 ? 'primary-btn' : 'overlay-btn'}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
              onClick={() => {
                setPanelCrestsCount(5);
                setPanelValleysCount(4);
                setPanelRibWidthMm(37);
                setPanelValleyWidthMm(66);
                handleGenerateMultiRibPanel(5, 4, 37, 66);
              }}
            >
              ⭐ {t.symmetryPreset5C4V || '5 Peaks & 4 Valleys (PRR-1)'}
            </button>

            <button
              type="button"
              className={panelCrestsCount === 4 && panelValleysCount === 3 ? 'primary-btn' : 'overlay-btn'}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
              onClick={() => {
                setPanelCrestsCount(4);
                setPanelValleysCount(3);
                setPanelRibWidthMm(50);
                setPanelValleyWidthMm(150);
                handleGenerateMultiRibPanel(4, 3, 50, 150);
              }}
            >
              {t.symmetryPreset4C3V || '4 Peaks & 3 Valleys'}
            </button>

            <button
              type="button"
              className={panelCrestsCount === 6 && panelValleysCount === 5 ? 'primary-btn' : 'overlay-btn'}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
              onClick={() => {
                setPanelCrestsCount(6);
                setPanelValleysCount(5);
                setPanelRibWidthMm(30);
                setPanelValleyWidthMm(50);
                handleGenerateMultiRibPanel(6, 5, 30, 50);
              }}
            >
              {t.symmetryPreset6C5V || '6 Peaks & 5 Valleys'}
            </button>

            {(Object.keys(CAD_PRESETS) as CADPresetKey[]).map((key) => {
              const p = CAD_PRESETS[key];
              return (
                <button
                  key={key}
                  type="button"
                  className="overlay-btn"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.55rem' }}
                  onClick={() => handleApplyPreset(key)}
                >
                  {t[p.nameKey] || key.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Interactive CAD Viewport Canvas */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          background: '#0a0d16',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '0.75rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
        }}>
          
          {/* Viewport Floating Toolbar */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '0.3rem 0.5rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 10
          }}>
            <button
              type="button"
              className="overlay-btn"
              title={t.addPoint || 'Add Node'}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleAddPoint}
              disabled={points.length >= 48}
            >
              <Plus size={13} /> {t.addPoint || 'Add'}
            </button>

            <button
              type="button"
              className="overlay-btn"
              title={t.deletePoint || 'Delete Selected'}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: activeNodeIdx !== null ? '#ef4444' : 'inherit' }}
              onClick={() => activeNodeIdx !== null && handleDeletePoint(activeNodeIdx)}
              disabled={activeNodeIdx === null || activeNodeIdx === 0 || activeNodeIdx === points.length - 1}
            >
              <Trash2 size={13} />
            </button>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 0.15rem' }} />

            <button
              type="button"
              className="overlay-btn"
              title={t.sortNodesX || 'Sort Left to Right'}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleSortNodesByX}
            >
              <ArrowUpDown size={13} /> Sort X
            </button>

            <button
              type="button"
              className="overlay-btn"
              title={t.snapToGrid || 'Snap 1mm'}
              style={{
                padding: '0.3rem 0.5rem',
                fontSize: '0.75rem',
                background: snapToGrid ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: snapToGrid ? 'var(--accent-cyan)' : 'inherit'
              }}
              onClick={() => setSnapToGrid(!snapToGrid)}
            >
              <Compass size={13} /> Snap
            </button>

            <button
              type="button"
              className="overlay-btn"
              title={t.mirrorProfile || 'Mirror Symmetry'}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleMirrorSymmetry}
            >
              <FlipHorizontal size={13} /> Mirror
            </button>

            <button
              type="button"
              className="overlay-btn"
              title={t.invertProfile || 'Invert Ribs'}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleInvertProfile}
            >
              <RotateCcw size={13} /> Invert
            </button>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 0.15rem' }} />

            <button
              type="button"
              className="overlay-btn"
              title={t.undo || 'Undo'}
              style={{ padding: '0.3rem 0.4rem' }}
              onClick={handleUndo}
              disabled={historyIdx <= 0}
            >
              <Undo2 size={13} />
            </button>

            <button
              type="button"
              className="overlay-btn"
              title={t.redo || 'Redo'}
              style={{ padding: '0.3rem 0.4rem' }}
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
            >
              <Redo2 size={13} />
            </button>
          </div>

          {/* Export Action Buttons */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            zIndex: 10
          }}>
            <button
              type="button"
              className="overlay-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={handleExportDXF}
            >
              <FileCode size={13} /> DXF
            </button>
            <button
              type="button"
              className="overlay-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={handleExportSVG}
            >
              <Download size={13} /> SVG
            </button>
            <button
              type="button"
              className="overlay-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={handleSaveJSON}
            >
              <Download size={13} /> JSON
            </button>
            <button
              type="button"
              className="overlay-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} />
            </button>
          </div>

          {/* Canvas Bottom Instruction Tip */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '6px',
            padding: '3px 10px',
            fontSize: '0.72rem',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            pointerEvents: 'none'
          }}>
            <MousePointerClick size={12} />
            {t.rightClickTip || 'Right-click canvas to add node | Right-click node to delete'}
          </div>

          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: `${cWidth}px`, height: `${cHeight}px`, cursor: activeNodeIdx !== null ? 'grabbing' : 'crosshair' }}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* 3. Engineering Feasibility & Structural Analytics Card */}
        <div className="report-card" style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={16} color="var(--accent-cyan)" />
              {t.engineeringAnalysis || 'Roll-Forming & Structural Feasibility'}
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: maxFlankAngleDeg <= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${maxFlankAngleDeg <= 80 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              color: maxFlankAngleDeg <= 80 ? '#10b981' : '#ef4444'
            }}>
              {maxFlankAngleDeg <= 80 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>{maxFlankAngleDeg <= 80 ? (t.rollFormFeasibility || 'Feasible for Roll-Forming') : (t.rollFormWarning || 'Warning: Steep Flank Angle (>80°)')}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.65rem', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>
                <Scale size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {t.flatCoilWidth || 'Developed Flat Width'}:
              </span>
              <strong style={{ color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                {Math.round(totalDevelopedWidthMm)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>mm</span>
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                {t.stretchRatio || 'Stretch'}: {stretchRatio.toFixed(2)}×
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.65rem', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>
                <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {t.momentOfInertia || 'Moment of Inertia (Ix)'}:
              </span>
              <strong style={{ color: 'var(--accent-cyan)', fontSize: '1.05rem' }}>
                {approxIx.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>cm⁴/m</span>
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                Wx: {approxWx.toFixed(2)} cm³/m
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.65rem', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>
                <Droplets size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {t.hydraulicCapacity || 'Valley Drainage Area'}:
              </span>
              <strong style={{ color: '#38bdf8', fontSize: '1.05rem' }}>
                {(valleyFlowAreaMm2 / 100).toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>cm²/m</span>
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                {t.antiPondingSafe || 'Anti-Ponding Safe'}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.65rem', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>
                {t.standardCoilFit || 'Coil Stock Fit'}:
              </span>
              <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>
                {matchedCoil} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>mm {t.coil || 'Coil'}</span>
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                {t.trimLoss || 'Trim Loss'}: {coilScrapPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* 4. Full Sheet Assembly Preview (2D Assembly or 3D WebGL) */}
        <div className="report-card" style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Maximize2 size={16} color="var(--accent-cyan)" />
                {t.singlePanelOverview}
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {t.singlePanelOverviewDesc}
              </p>
            </div>

            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.2rem' }}>
              <button
                type="button"
                style={{
                  background: singleViewMode === '2d' ? 'var(--accent-cyan)' : 'transparent',
                  color: singleViewMode === '2d' ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSingleViewMode('2d')}
              >
                <Layers size={14} />
                {t.view2DCrossSection}
              </button>
              <button
                type="button"
                style={{
                  background: singleViewMode === '3d' ? 'var(--accent-primary)' : 'transparent',
                  color: singleViewMode === '3d' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSingleViewMode('3d')}
              >
                <Box size={14} />
                {t.view3DSinglePanel}
              </button>
            </div>
          </div>

          {singleViewMode === '2d' ? (
            <SinglePanel2DCanvas
              points={points}
              pitchMm={pitchMm}
              ribHeightMm={ribHeightMm}
              totalCoverageMm={totalCoverageMm}
              sheetThicknessMm={thicknessMm}
              language={language}
            />
          ) : (
            <SinglePanel3DCanvas
              inputs={inputs}
              points={points}
              pitchMm={pitchMm}
              language={language}
            />
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Multi-Rib Panel Builder & Vertices Spreadsheet */}
      <div className="report-card" style={{ width: '400px', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--glass-shadow)', overflowY: 'auto' }}>
        
        {/* 1. FULL MULTI-RIB & MULTI-VALLEY PANEL BUILDER (5 Crests + 4 Valleys) */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Columns3 size={16} />
              {t.multiRibsValleysTitle || 'Full Panel Crests & Valleys Builder'}
            </h4>
          </div>

          {/* Symmetry Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.65rem',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            background: isMultiRibSymmetrical ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isMultiRibSymmetrical ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontSize: '0.72rem',
            color: isMultiRibSymmetrical ? '#10b981' : '#f59e0b',
          }}>
            {isMultiRibSymmetrical ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{isMultiRibSymmetrical ? t.symmetricalProfile : t.asymmetricalProfile} ({panelCrestsCount} {t.crestsCountLabel || 'Crests'} / {panelValleysCount} {t.valleysCountLabel || 'Valleys'})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {/* Crests and Valleys Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                  {t.crestsCount || 'Crests (Peaks) Count'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button
                    type="button"
                    className="overlay-btn"
                    style={{ width: '28px', height: '28px', padding: 0 }}
                    onClick={() => {
                      const nextC = Math.max(1, panelCrestsCount - 1);
                      setPanelCrestsCount(nextC);
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    className="sidebar-input"
                    style={{ textAlign: 'center', padding: '0.2rem' }}
                    value={panelCrestsCount}
                    onChange={(e) => setPanelCrestsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <button
                    type="button"
                    className="overlay-btn"
                    style={{ width: '28px', height: '28px', padding: 0 }}
                    onClick={() => setPanelCrestsCount(Math.min(20, panelCrestsCount + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                  {t.valleysCount || 'Valleys (Troughs) Count'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button
                    type="button"
                    className="overlay-btn"
                    style={{ width: '28px', height: '28px', padding: 0 }}
                    onClick={() => {
                      const nextV = Math.max(0, panelValleysCount - 1);
                      setPanelValleysCount(nextV);
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    className="sidebar-input"
                    style={{ textAlign: 'center', padding: '0.2rem' }}
                    value={panelValleysCount}
                    onChange={(e) => setPanelValleysCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                  <button
                    type="button"
                    className="overlay-btn"
                    style={{ width: '28px', height: '28px', padding: 0 }}
                    onClick={() => setPanelValleysCount(Math.min(20, panelValleysCount + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Rib Width & Valley Width */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                  {t.ribWidthMm || 'Crest Width (mm)'}
                </label>
                <input
                  type="number"
                  className="sidebar-input"
                  min="10"
                  max="250"
                  value={panelRibWidthMm}
                  onChange={(e) => setPanelRibWidthMm(Math.max(10, parseInt(e.target.value, 10) || 37))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                  {t.valleyWidthMm || 'Valley Width (mm)'}
                </label>
                <input
                  type="number"
                  className="sidebar-input"
                  min="0"
                  max="500"
                  value={panelValleyWidthMm}
                  onChange={(e) => setPanelValleyWidthMm(Math.max(0, parseInt(e.target.value, 10) || 66))}
                />
              </div>
            </div>

            {/* Valley Stiffeners / Micro-Grooves */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.35rem' }}>
              <div>
                <label style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>
                  {t.flutesPerValley || 'Grooves'}
                </label>
                <input
                  type="number"
                  className="sidebar-input"
                  min="0"
                  max="3"
                  value={valleyFluteCount}
                  onChange={(e) => setValleyFluteCount(Math.max(0, Math.min(3, parseInt(e.target.value, 10) || 0)))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>
                  {t.indentationDepth || 'Depth'}
                </label>
                <input
                  type="number"
                  className="sidebar-input"
                  min="1"
                  max="15"
                  value={valleyFluteDepthMm}
                  onChange={(e) => setValleyFluteDepthMm(Math.max(1, parseInt(e.target.value, 10) || 3))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>
                  {t.indentationWidth || 'Width'}
                </label>
                <input
                  type="number"
                  className="sidebar-input"
                  min="3"
                  max="40"
                  value={valleyFluteWidthMm}
                  onChange={(e) => setValleyFluteWidthMm(Math.max(3, parseInt(e.target.value, 10) || 10))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>
                  {t.indentationType || 'Form'}
                </label>
                <select
                  className="sidebar-input"
                  style={{ padding: '0.2rem', fontSize: '0.68rem' }}
                  value={valleyFluteType}
                  onChange={(e) => setValleyFluteType(e.target.value as any)}
                >
                  <option value="v_groove">{t.vFlute || 'V-Flute'}</option>
                  <option value="micro_rib">{t.microRib || 'Micro-Rib'}</option>
                  <option value="box_groove">{t.boxGroove || 'Box'}</option>
                </select>
              </div>
            </div>

            {/* Generate Button with computed total width */}
            <button
              type="button"
              className="primary-btn"
              style={{
                fontSize: '0.78rem',
                padding: '0.55rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
                marginTop: '0.3rem'
              }}
              onClick={() => handleGenerateMultiRibPanel(panelCrestsCount, panelValleysCount, panelRibWidthMm, panelValleyWidthMm, valleyFluteCount, valleyFluteDepthMm, valleyFluteWidthMm)}
            >
              <Sparkles size={14} />
              {(t.generatePanelDynamic || '⚡ Generate Panel ({crests} Peaks + {valleys} Valleys = {width} mm)')
                .replace('{crests}', String(panelCrestsCount))
                .replace('{valleys}', String(panelValleysCount))
                .replace('{width}', String(computedMultiRibTotalWidthMm))}
            </button>
          </div>
        </div>

        {/* 2. Vertices List Table with Node Reordering & Sorting */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              {(t.verticesTableNodes || 'Vertices Table ({count} Nodes)').replace('{count}', String(points.length))}
            </h3>
            
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                className="overlay-btn"
                title={t.sortNodesX || 'Sort by X'}
                style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                onClick={handleSortNodesByX}
              >
                <ArrowUpDown size={11} /> {t.sortX || 'Sort X'}
              </button>

              <button
                type="button"
                className="overlay-btn"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={handleAddPoint}
                disabled={points.length >= 48}
              >
                <Plus size={12} /> {t.addPoint || 'Add'}
              </button>
            </div>
          </div>

          <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '340px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '0.4rem' }}>#</th>
                  <th style={{ padding: '0.4rem' }}>X (mm)</th>
                  <th style={{ padding: '0.4rem' }}>Y (mm)</th>
                  <th style={{ padding: '0.4rem', textAlign: 'center' }}>{t.nodeOrder || 'Order'}</th>
                  <th style={{ padding: '0.4rem', textAlign: 'center' }}>{t.deletePoint || 'Del'}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((pt, idx) => {
                  const xMm = Math.round(pt[0] * pitchMm);
                  const yMm = Math.round(pt[1] * ribHeightMm);
                  const isBound = idx === 0 || idx === points.length - 1;
                  const isActive = activeNodeIdx === idx;

                  return (
                    <tr
                      key={idx}
                      style={{
                        background: isActive ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s',
                        height: '36px'
                      }}
                      onClick={() => setActiveNodeIdx(idx)}
                    >
                      <td style={{ padding: '0.35rem', fontSize: '0.75rem', fontWeight: 'bold', color: isActive ? 'var(--accent-cyan)' : 'inherit' }}>
                        {idx + 1}
                      </td>

                      {/* X Coord Cell */}
                      <td style={{ padding: '0.35rem' }}>
                        <input
                          type="number"
                          disabled={isBound}
                          style={{
                            width: '55px',
                            padding: '0.2rem',
                            background: isBound ? 'transparent' : 'rgba(255,255,255,0.04)',
                            border: isBound ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: isBound ? 'var(--text-muted)' : 'var(--text-primary)',
                          }}
                          value={xMm}
                          onChange={(e) => {
                            const valMm = parseInt(e.target.value, 10) || 0;
                            const nextNorm = Math.max(0, Math.min(pitchMm, valMm)) / pitchMm;
                            const updated = points.map((p, i) => {
                              if (i === idx) return [nextNorm, p[1]] as [number, number];
                              return p;
                            });
                            setInputs((prev) => ({ ...prev, customProfilePoints: updated }));
                          }}
                        />
                      </td>

                      {/* Y Coord Cell */}
                      <td style={{ padding: '0.35rem' }}>
                        <input
                          type="number"
                          style={{
                            width: '55px',
                            padding: '0.2rem',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)',
                          }}
                          value={yMm}
                          onChange={(e) => {
                            const valMm = parseInt(e.target.value, 10) || 0;
                            const nextNorm = Math.max(0, Math.min(ribHeightMm, valMm)) / ribHeightMm;
                            const updated = points.map((p, i) => {
                              if (i === idx) return [p[0], nextNorm] as [number, number];
                              return p;
                            });
                            setInputs((prev) => ({ ...prev, customProfilePoints: updated }));
                          }}
                        />
                      </td>

                      {/* Reordering Controls */}
                      <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.15rem' }}>
                          <button
                            type="button"
                            title={t.moveUp || 'Move Up'}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isBound || idx === 1 ? 'rgba(255,255,255,0.1)' : 'var(--accent-cyan)',
                              cursor: isBound || idx === 1 ? 'default' : 'pointer',
                              padding: '1px 3px'
                            }}
                            disabled={isBound || idx === 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveNode(idx, 'up');
                            }}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            title={t.moveDown || 'Move Down'}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isBound || idx === points.length - 2 ? 'rgba(255,255,255,0.1)' : 'var(--accent-cyan)',
                              cursor: isBound || idx === points.length - 2 ? 'default' : 'pointer',
                              padding: '1px 3px'
                            }}
                            disabled={isBound || idx === points.length - 2}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveNode(idx, 'down');
                            }}
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Delete Cell */}
                      <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isBound ? 'rgba(255,255,255,0.05)' : '#ef4444',
                            cursor: isBound ? 'default' : 'pointer',
                            padding: '2px',
                          }}
                          disabled={isBound || points.length <= 3}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePoint(idx);
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
