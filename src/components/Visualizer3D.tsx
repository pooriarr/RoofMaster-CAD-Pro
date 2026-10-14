import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { toMeters, type RoofInputs } from '../utils/calculator';
import { getActiveFastenerPositions } from '../utils/fastenerPattern';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';
import { RotateCw, Eye } from 'lucide-react';

interface Visualizer3DProps {
  inputs: RoofInputs;
  language: Language;
  panelColor: string;
  currentStep: number;
}

export const Visualizer3D: React.FC<Visualizer3DProps> = ({
  inputs,
  language,
  panelColor,
  currentStep,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  // Overlay states
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showPurlins, setShowPurlins] = useState<boolean>(true);
  const [showStrokes, setShowStrokes] = useState<boolean>(true);
  const [showScrews, setShowScrews] = useState<boolean>(true);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  
  // Keep refs of latest props to access them inside the stable Three.js loop
  const inputsRef = useRef<RoofInputs>(inputs);
  const panelColorRef = useRef<string>(panelColor);
  const showWireframeRef = useRef<boolean>(showWireframe);
  const showPurlinsRef = useRef<boolean>(showPurlins);
  const showStrokesRef = useRef<boolean>(showStrokes);
  const showScrewsRef = useRef<boolean>(showScrews);
  const currentStepRef = useRef<number>(currentStep);

  // Sync refs synchronously on EVERY render before any rebuild/effects run
  inputsRef.current = inputs;
  panelColorRef.current = panelColor;
  showWireframeRef.current = showWireframe;
  showPurlinsRef.current = showPurlins;
  showStrokesRef.current = showStrokes;
  showScrewsRef.current = showScrews;
  currentStepRef.current = currentStep;

  // Refs for OrbitControls and camera to allow camera resetting
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Ref to trigger geometries rebuilding
  const rebuildRef = useRef<(() => void) | null>(null);

  // 1. Scene Initialization (Runs EXACTLY ONCE on mount)
  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const width = mountRef.current.clientWidth || (window.innerWidth > 360 ? window.innerWidth - 360 : 600);
    const height = mountRef.current.clientHeight || (window.innerHeight > 70 ? window.innerHeight - 70 : 500);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d0f17');

    // Fog for premium depth
    scene.fog = new THREE.FogExp2('#0d0f17', 0.015);

    // --- Camera ---
    const initL = Math.max(2, toMeters(inputsRef.current.roofLength, 6, 50));
    const initW = Math.max(2, toMeters(inputsRef.current.roofWidth, 12, 50));
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(initW * 0.7 + 2, Math.max(initW, initL) * 0.6 + 2, initL * 0.9 + 3);
    cameraRef.current = camera;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'auto'; // Capture clicks/drags for rotation
    renderer.domElement.style.touchAction = 'none';
    mountRef.current.appendChild(renderer.domElement);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.3);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    const d = 40;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#a78bfa', 0.4);
    fillLight.position.set(-20, 20, -20);
    scene.add(fillLight);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 2;
    controls.maxDistance = 150;
    controlsRef.current = controls;

    // --- Ground Grid Helper ---
    const gridHelper = new THREE.GridHelper(100, 50, '#2e1065', '#1e1b4b');
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Persistent mesh group
    const roofGroup = new THREE.Group();
    scene.add(roofGroup);

    // --- Single Panel Builder ---
    const createMetalPanelMesh = (pWidth: number, pLength: number, currentPanelColor: string, currentInputs: RoofInputs) => {
      const panelGroup = new THREE.Group();
      
      // Material setup
      const panelMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(currentPanelColor),
        metalness: currentInputs.panelMaterial === 'aluminum' ? 0.9 : currentInputs.panelMaterial === 'copper' ? 0.75 : 0.8,
        roughness: currentInputs.panelFinish === 'matte' ? 0.6 : currentInputs.panelFinish === 'pvdf' ? 0.25 : 0.4,
        side: THREE.DoubleSide,
        wireframe: showWireframeRef.current,
      });

      const ribHeight = (currentInputs.ribHeight || 25) / 1000;
      const ribWidth = 0.015;

      if (currentInputs.panelType === 'standing_seam') {
        const sheetGeo = new THREE.PlaneGeometry(pWidth, pLength);
        const sheet = new THREE.Mesh(sheetGeo, panelMaterial);
        sheet.rotation.x = -Math.PI / 2;
        sheet.receiveShadow = true;
        sheet.castShadow = true;
        panelGroup.add(sheet);

        const seamGeo = new THREE.BoxGeometry(0.008, ribHeight, pLength);
        
        const leftSeam = new THREE.Mesh(seamGeo, panelMaterial);
        leftSeam.position.set(-pWidth / 2 + 0.004, ribHeight / 2, 0);
        leftSeam.castShadow = true;
        panelGroup.add(leftSeam);

        const rightSeam = new THREE.Mesh(seamGeo, panelMaterial);
        rightSeam.position.set(pWidth / 2 - 0.004, ribHeight / 2, 0);
        rightSeam.castShadow = true;
        panelGroup.add(rightSeam);
      } else if (currentInputs.panelType === 'corrugated') {
        const sheetGeo = new THREE.PlaneGeometry(pWidth, pLength);
        const sheet = new THREE.Mesh(sheetGeo, panelMaterial);
        sheet.rotation.x = -Math.PI / 2;
        sheet.receiveShadow = true;
        sheet.castShadow = true;
        panelGroup.add(sheet);

        const waveCount = 7;
        for (let i = 0; i < waveCount; i++) {
          const x = -pWidth / 2 + (pWidth / (waveCount - 1)) * i;
          const waveGeo = new THREE.BoxGeometry(ribWidth * 1.2, ribHeight, pLength);
          const wave = new THREE.Mesh(waveGeo, panelMaterial);
          wave.position.set(x, ribHeight / 2, 0);
          wave.castShadow = true;
          panelGroup.add(wave);
        }
      } else if (currentInputs.panelType === 'trapezoidal') {
        const sheetGeo = new THREE.PlaneGeometry(pWidth, pLength);
        const sheet = new THREE.Mesh(sheetGeo, panelMaterial);
        sheet.rotation.x = -Math.PI / 2;
        sheet.receiveShadow = true;
        sheet.castShadow = true;
        panelGroup.add(sheet);

        const ribCount = 4;
        const trapezoidRibGeo = new THREE.BoxGeometry(0.035, ribHeight, pLength);
        for (let i = 0; i < ribCount; i++) {
          const x = -pWidth / 2 + (pWidth / (ribCount - 1)) * i;
          const rib = new THREE.Mesh(trapezoidRibGeo, panelMaterial);
          rib.position.set(x, ribHeight / 2, 0);
          rib.castShadow = true;
          panelGroup.add(rib);
        }
      } else if (currentInputs.panelType === 'custom' || currentInputs.panelType === 'prr1') {
        const thickness = (currentInputs.panelThickness || 0.5) / 1000;
        const rHeight = (currentInputs.ribHeight || 22) / 1000;
        const profilePoints = currentInputs.customProfilePoints || [
          [0.0, 0.0],
          [0.1214, 1.0],
          [0.2379, 1.0],
          [0.3592, 0.0],
          [1.0, 0.0]
        ];

        const topPoints: Array<{ x: number; y: number }> = [];
        const bottomPoints: Array<{ x: number; y: number }> = [];

        // The CAD profile directly defines the full cross-section of ONE single sheet across pWidth
        profilePoints.forEach((pt) => {
          const x = -pWidth / 2 + pt[0] * pWidth;
          const y = pt[1] * rHeight;
          topPoints.push({ x, y });
        });

        for (let i = topPoints.length - 1; i >= 0; i--) {
          const pt = topPoints[i];
          bottomPoints.push({ x: pt.x, y: pt.y - thickness });
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
          depth: pLength,
          bevelEnabled: false,
          steps: 1,
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mesh = new THREE.Mesh(geom, panelMaterial);
        mesh.position.z = -pLength / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        panelGroup.add(mesh);
      }

      // Add panel edge strokes (EdgesGeometry) if enabled
      if (showStrokesRef.current) {
        const meshesToOutline: THREE.Mesh[] = [];
        panelGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            meshesToOutline.push(child);
          }
        });

        meshesToOutline.forEach((mesh) => {
          const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 15);
          const lineMat = new THREE.LineBasicMaterial({
            color: new THREE.Color('#ffffff'),
            transparent: true,
            opacity: 0.45,
          });
          const line = new THREE.LineSegments(edgesGeo, lineMat);
          line.position.copy(mesh.position);
          line.rotation.copy(mesh.rotation);
          line.scale.copy(mesh.scale);
          panelGroup.add(line);
        });
      }

      return panelGroup;
    };

    // --- Build Roof Structure ---
    const buildRoof = () => {
      // Reset roofGroup transform to origin before rebuilding
      roofGroup.position.set(0, 0, 0);
      roofGroup.rotation.set(0, 0, 0);

      // Clear previous meshes
      while (roofGroup.children.length > 0) {
        const obj = roofGroup.children[0];
        roofGroup.remove(obj);
      }

      const curInputs = inputsRef.current;
      const curColor = curInputs.panelColor || panelColorRef.current || '#94a3b8';
      const curStep = currentStepRef.current;

      const W = Math.max(0.5, toMeters(curInputs.roofWidth, 12, 50));
      const baseL = Math.max(0.5, toMeters(curInputs.roofLength, 6, 50));
      const isAsymmetric = curInputs.roofShape === 'gable' && Boolean(curInputs.isAsymmetricGable);

      const L1 = isAsymmetric ? Math.max(0.5, toMeters(curInputs.slope1Length, baseL, 50)) : baseL;
      const L2 = isAsymmetric 
        ? Math.max(0.5, toMeters(curInputs.slope2Length, baseL, 50)) 
        : (curInputs.roofShape === 'gable' ? baseL : 0);

      const pitch1Rad = (((isAsymmetric ? (curInputs.slope1Pitch ?? curInputs.roofPitch) : curInputs.roofPitch)) * Math.PI) / 180;
      const pitch2Rad = (((isAsymmetric ? (curInputs.slope2Pitch ?? curInputs.roofPitch) : curInputs.roofPitch)) * Math.PI) / 180;

      const pW = Math.max(0.1, toMeters(curInputs.panelWidth, 0.449, 5));
      const pL = Math.max(0.1, toMeters(curInputs.panelLength, 3.5, 15));
      
      const ovV = curInputs.panelType === 'standing_seam' ? 0 : Math.min(pL * 0.8, toMeters(curInputs.verticalOverlap, 0.15, 2));
      const ovH = curInputs.panelType === 'standing_seam' ? 0 : Math.min(pW * 0.8, toMeters(curInputs.horizontalOverlap, 0.04, 2));
      
      const effPW = Math.max(0.05, pW - ovH);
      const effPL = Math.max(0.05, pL - ovV);

      // Define slope groups specifications: { currentWidth, currentLength, position, rotation }
      const slopeSpecs: Array<{
        width: number;
        length: number;
        posX: number;
        posY: number;
        posZ: number;
        rotX: number;
        rotY: number;
        isHipSide?: boolean;
      }> = [];

      if (curInputs.roofShape === 'shed') {
        slopeSpecs.push({
          width: W,
          length: L1,
          posX: 0,
          posY: 0,
          posZ: -(L1 * Math.cos(pitch1Rad)) / 2,
          rotX: pitch1Rad,
          rotY: 0,
        });
      } else if (curInputs.roofShape === 'gable') {
        const offV1 = isAsymmetric ? ((curInputs.slope1OffsetVertical || 0) / 100) : 0;
        const offH1 = isAsymmetric ? ((curInputs.slope1OffsetHorizontal || 0) / 100) : 0;

        const offV2 = isAsymmetric ? ((curInputs.slope2OffsetVertical || 0) / 100) : 0;
        const offH2 = isAsymmetric ? ((curInputs.slope2OffsetHorizontal || 0) / 100) : 0;

        const H_base1 = L1 * Math.sin(pitch1Rad);
        const H_base2 = L2 * Math.sin(pitch2Rad);

        // Ridge top apex points for both slopes
        const ridgeY1 = H_base1 + offV1;
        const ridgeZ1 = offH1;

        const ridgeY2 = H_base2 + offV2;
        const ridgeZ2 = -offH2;

        // Center of Slope 1 (Front / positive Z direction)
        const posZ1 = ridgeZ1 + (L1 * Math.cos(pitch1Rad)) / 2;
        const posY1 = ridgeY1 - (L1 * Math.sin(pitch1Rad)) / 2;

        // Center of Slope 2 (Back / negative Z direction)
        const posZ2 = ridgeZ2 - (L2 * Math.cos(pitch2Rad)) / 2;
        const posY2 = ridgeY2 - (L2 * Math.sin(pitch2Rad)) / 2;

        // Slope 1 (Front / Left)
        slopeSpecs.push({
          width: W,
          length: L1,
          posX: 0,
          posY: posY1,
          posZ: posZ1,
          rotX: pitch1Rad,
          rotY: 0,
        });

        // Slope 2 (Back / Right)
        slopeSpecs.push({
          width: W,
          length: L2,
          posX: 0,
          posY: posY2,
          posZ: posZ2,
          rotX: -pitch2Rad,
          rotY: 0,
        });

        // If there is vertical/horizontal offset between the ridges, add connecting clerestory wall/frame
        const deltaY = Math.abs(ridgeY1 - ridgeY2);
        const deltaZ = Math.abs(ridgeZ1 - ridgeZ2);

        if (deltaY > 0.02 || deltaZ > 0.05) {
          const stepHeight = Math.max(0.1, deltaY);
          const wallThick = Math.max(0.08, deltaZ);
          const stepGeo = new THREE.BoxGeometry(W, stepHeight, wallThick);
          const stepMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(curInputs.purlinMaterial === 'wood' ? '#78350f' : '#334155'),
            roughness: 0.7,
            metalness: 0.3,
          });
          const stepMesh = new THREE.Mesh(stepGeo, stepMaterial);
          const stepY = Math.min(ridgeY1, ridgeY2) + stepHeight / 2;
          const stepZ = (ridgeZ1 + ridgeZ2) / 2;
          stepMesh.position.set(0, stepY, stepZ);
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          roofGroup.add(stepMesh);
        }
      }

      // Materials for structure
      const defaultPColor = curInputs.purlinMaterial === 'wood' ? '#854d0e' : '#475569';
      const actualPColor = curInputs.purlinColor || defaultPColor;
      const isPurlinWhite = actualPColor.toLowerCase() === '#ffffff';

      const purlinMaterial = curInputs.purlinMaterial === 'wood'
        ? new THREE.MeshStandardMaterial({
            color: new THREE.Color(actualPColor),
            roughness: 0.85,
          })
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color(actualPColor),
            metalness: isPurlinWhite ? 0.2 : 0.85,
            roughness: isPurlinWhite ? 0.35 : 0.2,
          });

      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#3b82f6'),
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });

      const baseRoofMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e293b'),
        roughness: 0.9,
        transparent: true,
        opacity: 0.95,
      });

      const pProfileW = Math.max(0.01, (curInputs.purlinSizeWidth || 40) / 1000);
      const pProfileH = Math.max(0.01, (curInputs.purlinSizeHeight || 40) / 1000);
      const safePurlinSpacing = Math.max(0.1, (curInputs.purlinSpacing || 60) / 100);

      slopeSpecs.forEach((spec) => {
        const slope = new THREE.Group();
        slope.position.set(spec.posX, spec.posY, spec.posZ);
        if (spec.rotY !== 0) slope.rotation.y = spec.rotY;
        slope.rotation.x = spec.rotX;

        const currentWidth = spec.width;
        const currentLength = spec.length;

        // --- STEP 1: Render base roof concrete slab only ---
        if (curStep === 1) {
          const slabGeo = new THREE.BoxGeometry(currentWidth, 0.12, currentLength);
          const slab = new THREE.Mesh(slabGeo, baseRoofMaterial);
          slab.position.set(0, -0.06, 0);
          slab.receiveShadow = true;
          slope.add(slab);

          const wireMesh = new THREE.Mesh(slabGeo, wireframeMaterial);
          wireMesh.position.set(0, -0.06, 0);
          slope.add(wireMesh);
          
          roofGroup.add(slope);
          return;
        }

        // --- STEP 2, 3, 4: Render Underlayment Framing (Zirsazi) ---
        if (showPurlinsRef.current) {
          // A: Horizontal Purlins
          if (curInputs.framingOrientation === 'horizontal' || curInputs.framingOrientation === 'grid' || curInputs.framingOrientation === 'diagonal') {
            const purlinSpaces = Math.min(100, Math.max(1, Math.ceil(currentLength / safePurlinSpacing)));
            const purlinCount = purlinSpaces + 1;
            const actualSpacing = currentLength / purlinSpaces;

            for (let i = 0; i < purlinCount; i++) {
              const purlinGeo = new THREE.BoxGeometry(currentWidth, pProfileH, pProfileW);
              const purlin = new THREE.Mesh(purlinGeo, purlinMaterial);
              const yPos = -currentLength / 2 + i * actualSpacing;
              
              purlin.position.set(0, -pProfileH / 2, yPos);
              purlin.castShadow = true;
              purlin.receiveShadow = true;
              slope.add(purlin);
            }
          }

          // B: Vertical Rafters
          if (curInputs.framingOrientation === 'vertical' || curInputs.framingOrientation === 'grid') {
            const rafterSpacing = 0.8;
            const rafterCount = Math.min(100, Math.max(2, Math.ceil(currentWidth / rafterSpacing) + 1));
            const actualRafterSpacing = currentWidth / (rafterCount - 1);

            const rafterThickness = 0.05;
            const rafterDepth = 0.08;
            const yOffset = curInputs.framingOrientation === 'grid' ? -pProfileH - rafterDepth / 2 : -rafterDepth / 2;

            for (let i = 0; i < rafterCount; i++) {
              const xPos = -currentWidth / 2 + i * actualRafterSpacing;
              const rafterGeo = new THREE.BoxGeometry(rafterThickness, rafterDepth, currentLength);
              const rafter = new THREE.Mesh(rafterGeo, purlinMaterial);
              
              rafter.position.set(xPos, yOffset, 0);
              rafter.castShadow = true;
              rafter.receiveShadow = true;
              slope.add(rafter);
            }
          }

          // C: Diagonal Wind Bracing (X-Bracing)
          if (curInputs.framingOrientation === 'diagonal') {
            const diagLength = Math.sqrt(currentWidth * currentWidth + currentLength * currentLength);
            const angle = Math.atan2(currentWidth, currentLength);

            const brace1Geo = new THREE.BoxGeometry(pProfileW, pProfileH, diagLength);
            const brace1 = new THREE.Mesh(brace1Geo, purlinMaterial);
            brace1.rotation.y = angle;
            brace1.position.set(0, -pProfileH * 1.5, 0);
            brace1.castShadow = true;
            brace1.receiveShadow = true;
            slope.add(brace1);

            const brace2Geo = new THREE.BoxGeometry(pProfileW, pProfileH, diagLength);
            const brace2 = new THREE.Mesh(brace2Geo, purlinMaterial);
            brace2.rotation.y = -angle;
            brace2.position.set(0, -pProfileH * 1.6, 0);
            brace2.castShadow = true;
            brace2.receiveShadow = true;
            slope.add(brace2);
          }
        }

        // Structural Outline
        const frameGeo = new THREE.BoxGeometry(currentWidth, 0.02, currentLength);
        const frameMesh = new THREE.Mesh(frameGeo, wireframeMaterial);
        frameMesh.position.set(0, -0.05, 0);
        slope.add(frameMesh);

        // --- STEP 3 & 4: Render Panels on top
        if (curStep >= 3) {
          const rows = Math.min(80, Math.max(1, Math.ceil(currentWidth / effPW)));
          const cols = Math.min(80, Math.max(1, Math.ceil(currentLength / effPL)));

          const totalCoveredWidth = (rows - 1) * effPW + pW;
          const startX = -totalCoveredWidth / 2 + pW / 2;

          // Determine which local Z direction corresponds to the EAVE (lowest edge of slope)
          // When rotX >= 0: Local +Z is Eave (lowest point), Local -Z is Ridge (highest point)
          // When rotX < 0: Local -Z is Eave (lowest point), Local +Z is Ridge (highest point)
          const isEavePositiveZ = spec.rotX >= 0;

          const slopeAlign = curInputs.slopeAlignment || 'bottom';
          const totalPanelLengthAlongSlope = (cols - 1) * effPL + pL;
          const extraLength = Math.max(0, totalPanelLengthAlongSlope - currentLength);

          let eaveOverhang = 0;
          if (slopeAlign === 'bottom') {
            eaveOverhang = extraLength;
          } else if (slopeAlign === 'top') {
            eaveOverhang = 0;
          } else if (slopeAlign === 'center') {
            eaveOverhang = extraLength / 2;
          }

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const xPos = startX + r * effPW;
              
              // c = 0 is always Row 1 at the lowest part of the slope (EAVE)
              // c = 1, 2, ... advance upwards towards the RIDGE (apex)
              let zPos: number;
              if (isEavePositiveZ) {
                // Starts at lowest point (+currentLength/2 - pL/2 + eaveOverhang) and moves towards ridge (-currentLength/2)
                zPos = (currentLength / 2 - pL / 2 + eaveOverhang) - c * effPL;
              } else {
                // Starts at lowest point (-currentLength/2 + pL/2 - eaveOverhang) and moves towards ridge (+currentLength/2)
                zPos = (-currentLength / 2 + pL / 2 - eaveOverhang) + c * effPL;
              }

              // Water-Shedding Stacking Rule:
              // Sheets higher up on the slope (larger c) MUST overlap ON TOP of sheets lower down (smaller c)!
              // Therefore, higher c receives a higher positive yOffset (resting on top of lower sheets)
              const yOffset = c * 0.003 + r * 0.0005;

              const panel = createMetalPanelMesh(pW, pL, curColor, curInputs);
              panel.position.set(xPos, yOffset, zPos);
              
              if (spec.isHipSide) {
                const relativeZ = (zPos + currentLength / 2) / currentLength;
                const allowedWidth = currentWidth * (1 - relativeZ);
                if (Math.abs(xPos) > allowedWidth / 2 + pW / 2) {
                  continue;
                }
              }

              slope.add(panel);
            }
          }

          // Photorealistic 3D Screws & EPDM Fasteners
          const shouldRenderScrews = curStep >= 3 && showScrewsRef.current && (curInputs.showScrews !== false);
          if (shouldRenderScrews) {
            const { xFractions, isCrest, zOffsetMm } = getActiveFastenerPositions(curInputs);
            const screwMatrices: THREE.Matrix4[] = [];
            const purlinSpaces = Math.min(100, Math.max(1, Math.ceil(currentLength / safePurlinSpacing)));
            const purlinCount = purlinSpaces + 1;
            const actualSpacing = currentLength / purlinSpaces;
            const crestOffsetM = isCrest ? Math.max(0.015, zOffsetMm / 1000) : 0.001;

            for (let r = 0; r < rows; r++) {
              const xPos = startX + r * effPW;
              for (let c = 0; c < cols; c++) {
                let zPos: number;
                if (isEavePositiveZ) {
                  zPos = (currentLength / 2 - pL / 2 + eaveOverhang) - c * effPL;
                } else {
                  zPos = (-currentLength / 2 + pL / 2 - eaveOverhang) + c * effPL;
                }

                const panelMinZ = zPos - pL / 2;
                const panelMaxZ = zPos + pL / 2;
                const yOffset = c * 0.003 + r * 0.0005;

                for (let i = 0; i < purlinCount; i++) {
                  const purlinZ = isEavePositiveZ
                    ? (currentLength / 2 - i * actualSpacing)
                    : (-currentLength / 2 + i * actualSpacing);

                  if (purlinZ >= panelMinZ - 0.02 && purlinZ <= panelMaxZ + 0.02) {
                    xFractions.forEach((xFrac) => {
                      const screwX = xPos - pW / 2 + pW * xFrac;
                      const screwY = yOffset + crestOffsetM + 0.003;

                      const mat = new THREE.Matrix4();
                      mat.compose(
                        new THREE.Vector3(screwX, screwY, purlinZ),
                        new THREE.Quaternion(),
                        new THREE.Vector3(1, 1, 1)
                      );
                      screwMatrices.push(mat);
                    });
                  }
                }
              }
            }

            if (screwMatrices.length > 0) {
              const curScrewColor = curInputs.screwColor || '#10b981';

              // 1. Dark EPDM Rubber Washer Base
              const washerGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.003, 8);
              const washerMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                roughness: 0.9,
                metalness: 0.1,
              });
              const washerInstanced = new THREE.InstancedMesh(washerGeo, washerMat, screwMatrices.length);
              washerInstanced.castShadow = true;

              // 2. Colored Hex Screw Head
              const capGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.006, 6);
              const capMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(curScrewColor),
                metalness: 0.8,
                roughness: 0.25,
              });
              const capInstanced = new THREE.InstancedMesh(capGeo, capMat, screwMatrices.length);
              capInstanced.castShadow = true;

              const washerOffset = new THREE.Matrix4().makeTranslation(0, -0.002, 0);
              for (let idx = 0; idx < screwMatrices.length; idx++) {
                const baseMat = screwMatrices[idx];
                capInstanced.setMatrixAt(idx, baseMat);
                const wMat = baseMat.clone().multiply(washerOffset);
                washerInstanced.setMatrixAt(idx, wMat);
              }

              washerInstanced.instanceMatrix.needsUpdate = true;
              capInstanced.instanceMatrix.needsUpdate = true;

              slope.add(washerInstanced);
              slope.add(capInstanced);
            }
          }
        }

        roofGroup.add(slope);
      });

      // Reset position first to ensure unbiased bounding box computation
      roofGroup.position.set(0, 0, 0);
      const box = new THREE.Box3().setFromObject(roofGroup);
      if (!box.isEmpty()) {
        // Align lowest point of roof structure directly to Y = 0 (Ground level)
        roofGroup.position.y = -box.min.y;
      }
    };

    // Save buildRoof to ref so the reactive useEffect can call it
    rebuildRef.current = buildRoof;
    
    // Initial build
    buildRoof();

    // --- Animation Loop ---
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Auto-recover from any NaN values in camera or target
      if (isNaN(camera.position.x) || isNaN(camera.position.y) || isNaN(camera.position.z)) {
        const safeL = Math.max(2, toMeters(inputsRef.current?.roofLength, 6, 50));
        const safeW = Math.max(2, toMeters(inputsRef.current?.roofWidth, 12, 50));
        camera.position.set(safeW * 0.7 + 2, Math.max(safeW, safeL) * 0.6 + 2, safeL * 0.9 + 3);
      }
      if (isNaN(controls.target.x) || isNaN(controls.target.y) || isNaN(controls.target.z)) {
        controls.target.set(0, 0, 0);
      }

      // Update 3D View Cube Rotation Sync directly via DOM transform (zero React re-renders)
      if (cameraRef.current && cubeRef.current) {
        const euler = new THREE.Euler().setFromQuaternion(cameraRef.current.quaternion, 'YXZ');
        const rx = Math.round((euler.x * 180) / Math.PI);
        const ry = Math.round((euler.y * 180) / Math.PI);
        cubeRef.current.style.transform = `rotateX(${-rx}deg) rotateY(${ry}deg)`;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- ResizeObserver (Locks sizing to actual DOM element container) ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        const safeW = Math.max(300, w || mountRef.current?.clientWidth || window.innerWidth - 360);
        const safeH = Math.max(300, h || mountRef.current?.clientHeight || window.innerHeight - 70);

        camera.aspect = safeW / safeH;
        camera.updateProjectionMatrix();
        renderer.setSize(safeW, safeH);
      }
    });
    resizeObserver.observe(mountRef.current);

    // --- Clean Up ---
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []); // Run ONLY ONCE on mount!

  // 2. Reactive Update Effect: Triggers mesh updates when inputs/colors/strokes change
  useEffect(() => {
    inputsRef.current = inputs;
    panelColorRef.current = panelColor;
    showWireframeRef.current = showWireframe;
    showPurlinsRef.current = showPurlins;
    showStrokesRef.current = showStrokes;
    currentStepRef.current = currentStep;

    if (rebuildRef.current) {
      rebuildRef.current();
    }
  }, [
    inputs,
    inputs.roofShape,
    inputs.isAsymmetricGable,
    inputs.slope1Length,
    inputs.slope1Pitch,
    inputs.slope1OffsetVertical,
    inputs.slope1OffsetHorizontal,
    inputs.slope2Length,
    inputs.slope2Pitch,
    inputs.slope2OffsetVertical,
    inputs.slope2OffsetHorizontal,
    inputs.roofLength,
    inputs.roofPitch,
    inputs.roofWidth,
    inputs.panelType,
    inputs.panelLength,
    inputs.panelWidth,
    inputs.verticalOverlap,
    inputs.horizontalOverlap,
    inputs.purlinSpacing,
    inputs.purlinMaterial,
    inputs.purlinColor,
    inputs.framingOrientation,
    inputs.layoutDirection,
    inputs.slopeAlignment,
    inputs.screwColor,
    inputs.screwsPerCrossing,
    inputs.showScrews,
    inputs.fastenerPlacement,
    inputs.customProfilePoints,
    panelColor,
    showWireframe,
    showPurlins,
    showStrokes,
    showScrews,
    currentStep,
  ]);

  const handleOrbit = (deltaAzimuth: number, deltaPolar: number) => {
    if (!controlsRef.current || !cameraRef.current) return;
    const azimuth = controlsRef.current.getAzimuthalAngle();
    const polar = controlsRef.current.getPolarAngle();
    
    const radius = controlsRef.current.getDistance();
    const newAzimuth = azimuth + (deltaAzimuth * Math.PI) / 180;
    const newPolar = Math.max(0.1, Math.min(Math.PI - 0.1, polar + (deltaPolar * Math.PI) / 180));
    
    cameraRef.current.position.x = controlsRef.current.target.x + radius * Math.sin(newPolar) * Math.sin(newAzimuth);
    cameraRef.current.position.y = controlsRef.current.target.y + radius * Math.cos(newPolar);
    cameraRef.current.position.z = controlsRef.current.target.z + radius * Math.sin(newPolar) * Math.cos(newAzimuth);
    controlsRef.current.update();
  };

  const handleSnapCamera = (view: 'TOP' | 'FRONT' | 'RIGHT' | 'LEFT' | 'BACK' | 'BOTTOM' | 'RESET') => {
    if (!controlsRef.current || !cameraRef.current) return;

    const W = Math.max(2, toMeters(inputs.roofWidth, 12, 50));
    const L = Math.max(2, toMeters(inputs.roofLength, 6, 50));
    const dist = Math.max(W, L) * 1.4;

    controlsRef.current.target.set(0, 0, 0);

    switch (view) {
      case 'TOP':
        cameraRef.current.position.set(0, dist, 0.001);
        break;
      case 'BOTTOM':
        cameraRef.current.position.set(0, -dist, 0.001);
        break;
      case 'FRONT':
        cameraRef.current.position.set(0, dist * 0.3, dist);
        break;
      case 'BACK':
        cameraRef.current.position.set(0, dist * 0.3, -dist);
        break;
      case 'RIGHT':
        cameraRef.current.position.set(dist, dist * 0.3, 0);
        break;
      case 'LEFT':
        cameraRef.current.position.set(-dist, dist * 0.3, 0);
        break;
      case 'RESET':
      default:
        cameraRef.current.position.set(W * 0.7 + 2, Math.max(W, L) * 0.6 + 2, L * 0.9 + 3);
        break;
    }
    controlsRef.current.update();
  };

  return (
    <div className="visualizer-3d-wrapper" style={{ pointerEvents: 'auto' }}>
      <div ref={mountRef} className="canvas-container" style={{ pointerEvents: 'auto' }} />

      {/* 3D Scene Controls Overlay */}
      <div className="visualizer-overlay-controls" style={{ pointerEvents: 'auto' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Eye size={16} color="var(--accent-cyan)" />
          {t.tab3D}
        </h4>
        
        {/* Toggle Wireframe */}
        <label className="overlay-control-item">
          <input
            type="checkbox"
            className="overlay-checkbox"
            checked={showWireframe}
            onChange={(e) => setShowWireframe(e.target.checked)}
          />
          <span>{t.viewWireframe}</span>
        </label>

        {/* Toggle Purlins */}
        {currentStep >= 2 && (
          <label className="overlay-control-item">
            <input
              type="checkbox"
              className="overlay-checkbox"
              checked={showPurlins}
              onChange={(e) => setShowPurlins(e.target.checked)}
            />
            <span>{t.viewUnderlayment}</span>
          </label>
        )}

        {/* Toggle Panel Edge Outlines / Strokes */}
        {currentStep >= 3 && (
          <label className="overlay-control-item">
            <input
              type="checkbox"
              className="overlay-checkbox"
              checked={showStrokes}
              onChange={(e) => setShowStrokes(e.target.checked)}
            />
            <span>{t.viewPanelStrokes}</span>
          </label>
        )}

        {/* Toggle Fastener Screws */}
        {currentStep >= 3 && (
          <label className="overlay-control-item">
            <input
              type="checkbox"
              className="overlay-checkbox"
              checked={showScrews}
              onChange={(e) => setShowScrews(e.target.checked)}
            />
            <span>{t.fastenersTitle}</span>
          </label>
        )}

        {/* Reset Camera */}
        <button className="overlay-btn" onClick={() => handleSnapCamera('RESET')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <RotateCw size={14} />
          {t.resetCamera}
        </button>
      </div>

      {/* FreeCAD-Style View Navigation Gizmo Box */}
      <div className="freecad-gizmo-box">
        {/* Cardinal Orbit Arrows */}
        <button type="button" className="freecad-arrow-btn arrow-top" onClick={() => handleOrbit(0, -25)} title={t.orbitTiltUp || 'Tilt Up'}>▲</button>
        <button type="button" className="freecad-arrow-btn arrow-bottom" onClick={() => handleOrbit(0, 25)} title={t.orbitTiltDown || 'Tilt Down'}>▼</button>
        <button type="button" className="freecad-arrow-btn arrow-left" onClick={() => handleOrbit(-30, 0)} title={t.orbitLeft || 'Orbit Left'}>◄</button>
        <button type="button" className="freecad-arrow-btn arrow-right" onClick={() => handleOrbit(30, 0)} title={t.orbitRight || 'Orbit Right'}>►</button>

        {/* Curved Roll Arrows */}
        <button type="button" className="freecad-arrow-btn roll-ccw" onClick={() => handleOrbit(-45, 0)} title={t.orbitRollCcw || 'Roll Counter-Clockwise'}>↺</button>
        <button type="button" className="freecad-arrow-btn roll-cw" onClick={() => handleOrbit(45, 0)} title={t.orbitRollCw || 'Roll Clockwise'}>↻</button>

        {/* Minimal Textless Geometric 3D View Cube */}
        <div className="view-cube-wrapper" style={{ transform: 'scale(0.85)' }}>
          <div ref={cubeRef} className="view-cube" style={{ transform: 'rotateX(-18deg) rotateY(30deg)' }}>
            <div className="cube-face face-front" onClick={() => handleSnapCamera('FRONT')} title={t.viewFront || 'FRONT'} />
            <div className="cube-face face-back" onClick={() => handleSnapCamera('BACK')} title={t.viewBack || 'BACK'} />
            <div className="cube-face face-right" onClick={() => handleSnapCamera('RIGHT')} title={t.viewRight || 'RIGHT'} />
            <div className="cube-face face-left" onClick={() => handleSnapCamera('LEFT')} title={t.viewLeft || 'LEFT'} />
            <div className="cube-face face-top" onClick={() => handleSnapCamera('TOP')} title={t.viewTop || 'TOP'} />
            <div className="cube-face face-bottom" onClick={() => handleSnapCamera('BOTTOM')} title={t.viewBottom || 'BOTTOM'} />
          </div>
        </div>

        {/* RGB Axis Tripod */}
        <div className="freecad-tripod" title="XYZ Coordinate Axes">
          <div className="axis-line axis-x" title="X Axis (Red)" />
          <div className="axis-line axis-y" title="Y Axis (Green)" />
          <div className="axis-line axis-z" title="Z Axis (Blue)" />
        </div>
      </div>

      {/* Legend */}
      <div className="legend-3d" style={{ pointerEvents: 'none' }}>
        {currentStep >= 3 && (
          <div className="legend-item">
            <div className="legend-color-box" style={{ backgroundColor: panelColor, border: '1px solid rgba(255,255,255,0.2)' }} />
            <span>{inputs.panelType === 'standing_seam' ? t.panelTypeStandingSeam : inputs.panelType === 'corrugated' ? t.panelTypeCorrugated : t.panelTypeTrapezoidal}</span>
          </div>
        )}
        {showPurlins && currentStep >= 2 && (
          <div className="legend-item">
            <div className="legend-color-box" style={{ backgroundColor: inputs.purlinColor || (inputs.purlinMaterial === 'wood' ? '#854d0e' : '#475569') }} />
            <span>
              {inputs.purlinMaterial === 'wood' ? t.materialWood : t.materialMetal}
              {inputs.framingOrientation !== 'vertical' && ` (${Math.round(inputs.purlinSpacing)} ${t.unitCm})`}
            </span>
          </div>
        )}
        {showScrews && currentStep >= 3 && (inputs.showScrews !== false) && (
          <div className="legend-item">
            <div className="legend-color-box" style={{ backgroundColor: inputs.screwColor || '#10b981', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)' }} />
            <span>
              {t.fastenersTitle} ({inputs.screwsPerCrossing || 4}x {inputs.fastenerPlacement === 'valley' ? (t.placementValley || 'Valley') : (t.placementCrest || 'Crest')})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
