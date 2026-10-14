export interface RoofInputs {
  roofShape: 'gable' | 'shed';
  roofWidth: number;        // eave width (cm/m)
  roofLength: number;       // slope length (eave-to-ridge) (cm/m)
  roofPitch: number;        // slope angle (degrees)

  // Asymmetric Dual-Slope Gable Settings
  isAsymmetricGable?: boolean;
  slope1Length?: number;           // length of slope 1 in cm (e.g. 600)
  slope1Pitch?: number;            // pitch of slope 1 in deg (e.g. 20)
  slope1OffsetVertical?: number;   // vertical displacement of slope 1 in cm
  slope1OffsetHorizontal?: number; // horizontal displacement of slope 1 in cm
  slope2Length?: number;           // length of slope 2 in cm (e.g. 450)
  slope2Pitch?: number;            // pitch of slope 2 in deg (e.g. 15)
  slope2OffsetVertical?: number;   // vertical displacement of slope 2 in cm
  slope2OffsetHorizontal?: number; // horizontal displacement of slope 2 in cm
  
  panelType: 'corrugated' | 'standing_seam' | 'trapezoidal' | 'prr1' | 'custom';
  panelLength: number;      // nominal length of individual panel (m)
  panelWidth: number;       // nominal width of panel (m)
  verticalOverlap: number;  // end-lap (cm)
  horizontalOverlap: number;// side-lap (cm)
  sideLapRibIndex?: number; // crest rib overlap target (1 = 1st crest, 2 = 2nd crest)
  layoutDirection?: 'left_to_right' | 'right_to_left' | 'center_out'; // panel layout direction
  slopeAlignment?: 'bottom' | 'top' | 'center'; // overhang alignment along slope (bottom/eave, top/ridge, or centered)
  
  // Custom Panel Technical Profile
  panelThickness: number;   // thickness (mm, e.g. 0.5)
  ribHeight: number;        // rib/corrugation height (mm, e.g. 25)
  panelMaterial: 'steel' | 'aluminum' | 'copper';
  panelFinish: 'polyester' | 'pvdf' | 'matte';
  panelColor?: string;
  
  // 2D Custom Cross-Section Profile Points (Normalized 0 to 1 in X and Y)
  customProfilePoints: Array<[number, number]>;

  // Framing & Zirsazi Settings
  purlinSpacing: number;    // target purlin spacing (m)
  purlinMaterial: 'wood' | 'metal';
  purlinColor?: string;     // color of purlins/framing (e.g. #ffffff, #475569)
  framingOrientation: 'horizontal' | 'vertical' | 'grid' | 'diagonal';
  purlinSizeWidth: number;  // purlin profile width (mm, e.g. 40)
  purlinSizeHeight: number; // purlin profile height (mm, e.g. 40)

  // Fasteners & Screws
  fastenerPlacement?: 'crest' | 'valley'; // place screws on crests (peaks) or valleys (troughs)
  screwSpacingMode?: 'profile_pitch' | 'custom_spacing'; // profile pitch (default) vs custom equal spacing
  customScrewSpacing?: number; // custom equal spacing between screws in cm (e.g. 10.3, 15, 20)
  screwColor?: string;      // color of screw cap / EPDM washer (e.g. #10b981, #ffffff, #94a3b8)
  screwsPerCrossing?: number; // screws per sheet width at each purlin crossing (default 5 or 4)
  showScrews?: boolean;     // toggle screw visibility in 2D & 3D (default true)

  // Costing in Euros (€)
  pricingMode?: 'per_sheet' | 'per_meter';
  pricePerSheet?: number;    // cost per individual sheet panel (€)
  panelPrice: number;       // cost per meter of panel (€)
  purlinPrice: number;      // cost per meter of purlin (€)
  screwPrice: number;       // cost per screw (€)
}

export interface CalculationResults {
  totalArea: number;
  
  // Dual-Slope Breakdown
  isAsymmetric: boolean;
  slope1Length: number;
  slope1Pitch: number;
  slope1Area: number;
  slope1Panels: number;
  slope1PurlinRows: number;

  slope2Length: number;
  slope2Pitch: number;
  slope2Area: number;
  slope2Panels: number;
  slope2PurlinRows: number;

  // Panel details
  rowsPerSlope: number;      // panel rows across the width
  colsPerSlope: number;      // panel cols along the slope (splicing)
  panelsPerSlope: number;
  totalPanels: number;
  totalPanelLength: number;
  coveredWidth: number;
  coveredLength: number;
  
  // Weights
  sheetWeightSqm: number;    // kg/m²
  totalSheetWeight: number;  // kg
  purlinWeightMeter: number; // kg/m
  totalPurlinWeight: number; // kg
  
  // Purlin details
  purlinRowsPerSlope: number;
  purlinSpacingActual: number;
  purlinTotalLength: number;
  diagonalTotalLength: number;
  
  // Fasteners
  screwsCount: number;
  
  // Cost breakdown
  panelCost: number;
  purlinCost: number;
  screwCost: number;
  totalCost: number;
  
  // Waste
  wastePercent: number;      // percentage of material cut/wasted
  wasteArea: number;         // sqm of wasted panel area
  
  slopesCount: number;       // 1 for shed, 2 for gable, 4 for hip
}

export function toMeters(val: number | undefined, defaultMeters: number, cmThreshold: number = 5): number {
  if (!val || isNaN(val)) return defaultMeters;
  return val > cmThreshold ? val / 100 : val;
}

export function calculateRoof(inputs: RoofInputs): CalculationResults {
  const {
    roofShape,
    panelType,
    panelThickness,
    panelMaterial,
    purlinMaterial,
    framingOrientation,
    purlinSizeWidth,
    purlinSizeHeight,
    panelPrice,
    purlinPrice,
    screwPrice,
    pricePerSheet,
    pricingMode = 'per_sheet',
  } = inputs;

  // Convert inputs dynamically from cm to meters for physical math calculations
  const W = Math.max(0.5, toMeters(inputs.roofWidth, 12, 50));
  const baseL = Math.max(0.5, toMeters(inputs.roofLength, 6, 50));
  const pW = Math.max(0.1, toMeters(inputs.panelWidth, 0.449, 5));
  const pL = Math.max(0.1, toMeters(inputs.panelLength, 3.5, 15));

  const isAsymmetric = roofShape === 'gable' && Boolean(inputs.isAsymmetricGable);
  const L1 = isAsymmetric ? Math.max(0.5, toMeters(inputs.slope1Length, baseL, 50)) : baseL;
  const L2 = isAsymmetric 
    ? Math.max(0.5, toMeters(inputs.slope2Length, baseL, 50)) 
    : (roofShape === 'gable' ? baseL : 0);
  const pitch1 = isAsymmetric ? (inputs.slope1Pitch ?? inputs.roofPitch) : inputs.roofPitch;
  const pitch2 = isAsymmetric ? (inputs.slope2Pitch ?? inputs.roofPitch) : inputs.roofPitch;

  const ovV = panelType === 'standing_seam' ? 0 : Math.min(pL * 0.8, toMeters(inputs.verticalOverlap, 0.15, 2));
  const ovH = panelType === 'standing_seam' ? 0 : Math.min(pW * 0.8, toMeters(inputs.horizontalOverlap, 0.04, 2));
  const targetPurlinSpacing = Math.max(0.1, toMeters(inputs.purlinSpacing, 0.6, 5));

  // Determine slopes
  const slopesCount = roofShape === 'gable' ? 2 : 1;
  const slope1Area = W * L1;
  const slope2Area = roofShape === 'gable' ? (W * L2) : 0;
  const totalArea = slope1Area + slope2Area;

  // Horizontal Panel Layout (across width W)
  const effPanelWidth = Math.max(0.05, pW - ovH);
  let rowsPerSlope = 0;
  if (effPanelWidth > 0 && W > ovH) {
    rowsPerSlope = Math.ceil((W - ovH) / effPanelWidth);
  } else {
    rowsPerSlope = Math.ceil(W / pW);
  }

  // Vertical Panel Layout (along slope)
  const effPanelLength = Math.max(0.05, pL - ovV);
  
  // Slope 1 panels
  let cols1 = 1;
  if (L1 > pL) {
    cols1 = Math.ceil((L1 - ovV) / effPanelLength);
  }
  const slope1Panels = rowsPerSlope * cols1;

  // Slope 2 panels
  let cols2 = 1;
  let slope2Panels = 0;
  if (roofShape === 'gable') {
    if (L2 > pL) {
      cols2 = Math.ceil((L2 - ovV) / effPanelLength);
    }
    slope2Panels = rowsPerSlope * cols2;
  }

  const totalPanels = slope1Panels + slope2Panels;
  const colsPerSlope = Math.max(cols1, cols2);
  const panelsPerSlope = slope1Panels;

  // Covered dimensions
  const coveredWidth = rowsPerSlope * effPanelWidth + ovH;
  const coveredLength = colsPerSlope > 1 ? (colsPerSlope * effPanelLength + ovV) : Math.max(L1, L2);
  const totalPanelLength = totalPanels * pL;

  // --- Weights Calculation ---
  let density = 7850;
  if (panelMaterial === 'aluminum') {
    density = 2700;
  } else if (panelMaterial === 'copper') {
    density = 8960;
  }

  const sheetWeightSqm = (panelThickness / 1000) * density;
  const totalSheetWeight = totalPanels * pW * pL * sheetWeightSqm;

  // Framing (Zirsazi) weight calculation
  let purlinWeightMeter = 0;
  const w = purlinSizeWidth / 1000;
  const h = purlinSizeHeight / 1000;

  if (purlinMaterial === 'wood') {
    purlinWeightMeter = w * h * 550;
  } else {
    const steelArea = 2 * (w + h) * 0.002;
    purlinWeightMeter = steelArea * 7850;
  }

  // --- Purlin Rows for Slope 1 & Slope 2 ---
  const purlinSpaces1 = Math.max(1, Math.ceil(L1 / targetPurlinSpacing));
  const slope1PurlinRows = purlinSpaces1 + 1;
  const purlinSpacingActual1 = L1 / purlinSpaces1;

  let slope2PurlinRows = 0;
  let purlinSpacingActual2 = purlinSpacingActual1;
  if (roofShape === 'gable') {
    const purlinSpaces2 = Math.max(1, Math.ceil(L2 / targetPurlinSpacing));
    slope2PurlinRows = purlinSpaces2 + 1;
    purlinSpacingActual2 = L2 / purlinSpaces2;
  }

  const purlinRowsPerSlope = slope1PurlinRows;
  const purlinSpacingActual = (purlinSpacingActual1 + (roofShape === 'gable' ? purlinSpacingActual2 : purlinSpacingActual1)) / slopesCount;

  const horizPurlinLength = (slope1PurlinRows * W) + (slope2PurlinRows * W);
  
  const rafterSpacing = 0.8;
  const rafterSpaces = Math.ceil(W / rafterSpacing);
  const rafterRows = rafterSpaces + 1;
  const vertRafterLength = (rafterRows * L1) + (roofShape === 'gable' ? rafterRows * L2 : 0);

  const diag1 = Math.sqrt(W * W + L1 * L1);
  const diag2 = roofShape === 'gable' ? Math.sqrt(W * W + L2 * L2) : 0;
  const diagonalTotalLength = 2 * (diag1 + diag2);

  let purlinTotalLength = 0;
  if (framingOrientation === 'horizontal') {
    purlinTotalLength = horizPurlinLength;
  } else if (framingOrientation === 'vertical') {
    purlinTotalLength = vertRafterLength;
  } else if (framingOrientation === 'grid') {
    purlinTotalLength = horizPurlinLength + vertRafterLength;
  } else if (framingOrientation === 'diagonal') {
    purlinTotalLength = horizPurlinLength + diagonalTotalLength;
  }

  const totalPurlinWeight = purlinTotalLength * purlinWeightMeter;

  // --- Fasteners (EPDM Screws) ---
  let screwsPerRow = 5;
  if (inputs.screwSpacingMode === 'custom_spacing' && inputs.customScrewSpacing) {
    const pWidthCm = inputs.panelWidth || 100;
    const intervals = Math.max(1, Math.round(pWidthCm / Math.max(3, inputs.customScrewSpacing)));
    screwsPerRow = intervals + 1;
  } else if (inputs.screwsPerCrossing !== undefined) {
    screwsPerRow = Math.max(1, inputs.screwsPerCrossing);
  }
  const totalRows = (slope1PurlinRows * rowsPerSlope) + (slope2PurlinRows * rowsPerSlope);
  const screwsCount = Math.ceil(totalRows * screwsPerRow);

  // --- Financial Costing (€) ---
  const isPerSheet = pricingMode === 'per_sheet' && pricePerSheet !== undefined && pricePerSheet > 0;
  const panelCost = isPerSheet ? totalPanels * pricePerSheet : totalArea * panelPrice;
  const purlinCost = purlinTotalLength * purlinPrice;
  const screwCost = screwsCount * screwPrice;
  const totalCost = panelCost + purlinCost + screwCost;

  // --- Material Optimization & Waste ---
  const netRoofAreaCovered = totalArea;
  const totalPurchasedPanelArea = totalPanels * pW * pL;
  const wasteArea = Math.max(0, totalPurchasedPanelArea - netRoofAreaCovered);
  const wastePercent = totalPurchasedPanelArea > 0 ? (wasteArea / totalPurchasedPanelArea) * 100 : 0;

  return {
    totalArea,
    isAsymmetric,
    slope1Length: L1,
    slope1Pitch: pitch1,
    slope1Area,
    slope1Panels,
    slope1PurlinRows,
    slope2Length: L2,
    slope2Pitch: pitch2,
    slope2Area,
    slope2Panels,
    slope2PurlinRows,
    rowsPerSlope,
    colsPerSlope,
    panelsPerSlope,
    totalPanels,
    totalPanelLength,
    coveredWidth,
    coveredLength,
    sheetWeightSqm,
    totalSheetWeight,
    purlinWeightMeter,
    totalPurlinWeight,
    purlinRowsPerSlope,
    purlinSpacingActual,
    purlinTotalLength,
    diagonalTotalLength,
    screwsCount,
    panelCost,
    purlinCost,
    screwCost,
    totalCost,
    wastePercent,
    wasteArea,
    slopesCount,
  };
}
