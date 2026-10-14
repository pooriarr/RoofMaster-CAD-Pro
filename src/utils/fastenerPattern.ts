import type { RoofInputs } from './calculator';

export interface FastenerProfileInfo {
  crests: number[]; // normalized X coordinates (0 to 1) of all crest centers (peaks)
  valleys: number[]; // normalized X coordinates (0 to 1) of all valley centers (troughs)
  crestHeightMm: number; // height of crest in mm
}

/**
 * Extracts exact normalized X coordinates for every crest and valley center
 * based on the active panel profile.
 * Every coordinate represents the exact geometric midpoint of the crest flat or valley flat.
 */
export function getProfileCrestsAndValleys(inputs: RoofInputs): FastenerProfileInfo {
  const panelType = inputs.panelType || 'prr1';
  const ribHeightMm = inputs.ribHeight || 22;

  if (panelType === 'custom' || panelType === 'prr1') {
    // If it's the standard PRR1 or multi-rib profile, use the exact mathematical centers
    const crestsCount = 5;
    const valleysCount = 4;
    const ribWidthMm = 37;
    const valleyWidthMm = 66;
    const totalW = crestsCount * ribWidthMm + valleysCount * valleyWidthMm; // 449 mm

    if (!inputs.customProfilePoints || panelType === 'prr1') {
      const crests: number[] = [];
      for (let i = 0; i < crestsCount; i++) {
        const centerMm = i * (ribWidthMm + valleyWidthMm) + ribWidthMm / 2;
        crests.push(centerMm / totalW);
      }

      const valleys: number[] = [];
      for (let i = 0; i < valleysCount; i++) {
        const centerMm = i * (ribWidthMm + valleyWidthMm) + ribWidthMm + valleyWidthMm / 2;
        valleys.push(centerMm / totalW);
      }

      return {
        crests,
        valleys,
        crestHeightMm: ribHeightMm,
      };
    }

    // Dynamic parsing from customProfilePoints
    const pts = inputs.customProfilePoints;
    const crests: number[] = [];
    const valleys: number[] = [];

    let inCrest = false;
    let crestStart = 0;
    let crestEnd = 0;

    let inValley = false;
    let valleyStart = 0;
    let valleyEnd = 0;

    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const isHigh = y >= 0.75;
      const isLow = y <= 0.25;

      if (isHigh) {
        if (!inCrest) {
          inCrest = true;
          crestStart = x;
        }
        crestEnd = x;
      } else {
        if (inCrest) {
          inCrest = false;
          crests.push((crestStart + crestEnd) / 2);
        }
      }

      if (isLow) {
        if (!inValley) {
          inValley = true;
          valleyStart = x;
        }
        valleyEnd = x;
      } else {
        if (inValley) {
          inValley = false;
          valleys.push((valleyStart + valleyEnd) / 2);
        }
      }
    }

    if (inCrest) {
      crests.push((crestStart + crestEnd) / 2);
    }
    if (inValley) {
      valleys.push((valleyStart + valleyEnd) / 2);
    }

    // Fallbacks if no plateau was detected
    if (crests.length === 0) {
      for (let i = 0; i < 5; i++) {
        crests.push((i * 103 + 18.5) / 449);
      }
    }
    if (valleys.length === 0) {
      for (let i = 0; i < 4; i++) {
        valleys.push((i * 103 + 70) / 449);
      }
    }

    return {
      crests: Array.from(new Set(crests)).sort((a, b) => a - b),
      valleys: Array.from(new Set(valleys)).sort((a, b) => a - b),
      crestHeightMm: ribHeightMm,
    };
  }

  if (panelType === 'corrugated') {
    // 7 sinusoidal crests and 6 valleys across panel width
    const waveCount = 7;
    const crests: number[] = [];
    for (let i = 0; i < waveCount; i++) {
      crests.push(i / (waveCount - 1));
    }
    const valleys: number[] = [];
    for (let i = 0; i < waveCount - 1; i++) {
      valleys.push((i + 0.5) / (waveCount - 1));
    }
    return { crests, valleys, crestHeightMm: ribHeightMm || 25 };
  }

  if (panelType === 'trapezoidal') {
    // 4 trapezoidal ribs and 3 broad valleys
    const ribCount = 4;
    const crests: number[] = [];
    for (let i = 0; i < ribCount; i++) {
      crests.push(i / (ribCount - 1));
    }
    const valleys: number[] = [];
    for (let i = 0; i < ribCount - 1; i++) {
      valleys.push((i + 0.5) / (ribCount - 1));
    }
    return { crests, valleys, crestHeightMm: ribHeightMm || 35 };
  }

  if (panelType === 'standing_seam') {
    // 2 standing seams (crests) and broad flat valley pan
    return {
      crests: [0.03, 0.97],
      valleys: [0.35, 0.65],
      crestHeightMm: ribHeightMm || 25,
    };
  }

  return {
    crests: [0.0412, 0.2706, 0.5, 0.7294, 0.9588],
    valleys: [0.1559, 0.3853, 0.6147, 0.8441],
    crestHeightMm: ribHeightMm || 22,
  };
}

/**
 * Returns available preset counts for equal-spacing / symmetric options.
 * E.g., for 5 crests: [5, 3, 1] (and allows any integer between 1 and 5).
 */
export function getEqualSpacingScrewCounts(totalPositions: number): number[] {
  if (totalPositions <= 0) return [1];
  if (totalPositions === 1) return [1];

  const counts: number[] = [];
  const isOdd = totalPositions % 2 !== 0;

  let current = totalPositions;
  while (current >= (isOdd ? 1 : 2)) {
    counts.push(current);
    current -= 2;
  }

  return counts;
}

/**
 * Selects K positions from the array of N positions such that:
 * 1. Every screw is placed EXACTLY at a crest/valley center.
 * 2. The spacing between screws is completely symmetric and equally spaced.
 */
export function selectSymmetricPositions(allPositions: number[], count: number): number[] {
  const N = allPositions.length;
  if (N === 0) return [];
  if (count >= N) return [...allPositions];
  if (count <= 1) {
    const centerIdx = Math.floor((N - 1) / 2);
    return [allPositions[centerIdx]];
  }

  const selectedIndices: number[] = [];
  for (let j = 0; j < count; j++) {
    const idx = Math.round((j * (N - 1)) / (count - 1));
    if (!selectedIndices.includes(idx)) {
      selectedIndices.push(idx);
    }
  }

  // Ensure count is satisfied
  if (selectedIndices.length < count) {
    for (let i = 0; i < N && selectedIndices.length < count; i++) {
      if (!selectedIndices.includes(i)) {
        selectedIndices.push(i);
      }
    }
  }

  return selectedIndices
    .sort((a, b) => a - b)
    .map((idx) => allPositions[idx]);
}

/**
 * Calculates the exact natural pitch between adjacent crests or valleys in cm.
 */
export function getProfilePitchCm(inputs: RoofInputs): number {
  const info = getProfileCrestsAndValleys(inputs);
  const targetList = (inputs.fastenerPlacement || 'crest') === 'crest' ? info.crests : info.valleys;
  const pWidthCm = inputs.panelWidth || 100;

  if (targetList.length <= 1) return pWidthCm;
  const rawPitch = (targetList[1] - targetList[0]) * pWidthCm;
  return Math.round(rawPitch * 10) / 10;
}

/**
 * Calculates the exact normalized X positions (0 to 1) for screws across a panel width.
 * - In 'profile_pitch' mode (DEFAULT): Every screw is centered EXACTLY on the crests (or valleys) with equal spacing.
 * - In 'custom_spacing' mode: Screws are distributed across the panel width with STRICTLY EQUAL spacing.
 */
export function getActiveFastenerPositions(inputs: RoofInputs): {
  xFractions: number[];
  isCrest: boolean;
  zOffsetMm: number;
  totalPositions: number;
  equalSpacingCounts: number[];
  selectedCount: number;
  actualSpacingCm: number;
  isCustomSpacing: boolean;
} {
  const placement = inputs.fastenerPlacement || 'crest';
  const isCrest = placement === 'crest';
  const info = getProfileCrestsAndValleys(inputs);
  const pWidthCm = inputs.panelWidth || 100;
  const zOffsetMm = isCrest ? info.crestHeightMm : 0;

  // 1. Custom Equal Spacing Mode
  if (inputs.screwSpacingMode === 'custom_spacing' && inputs.customScrewSpacing) {
    const desiredSpacingCm = Math.max(3, inputs.customScrewSpacing);
    const intervals = Math.max(1, Math.round(pWidthCm / desiredSpacingCm));
    const count = intervals + 1;
    const actualSpacingCm = Math.round((pWidthCm / intervals) * 10) / 10;

    const xFractions: number[] = [];
    for (let i = 0; i < count; i++) {
      xFractions.push(i / intervals);
    }

    return {
      xFractions,
      isCrest,
      zOffsetMm,
      totalPositions: count,
      equalSpacingCounts: [count],
      selectedCount: count,
      actualSpacingCm,
      isCustomSpacing: true,
    };
  }

  // 2. Profile Pitch Mode (DEFAULT: EXACT CENTER OF CRESTS / VALLEYS)
  const targetList = isCrest ? info.crests : info.valleys;
  const totalPositions = targetList.length;
  const equalSpacingCounts = getEqualSpacingScrewCounts(totalPositions);

  // Clamp selected count between 1 and totalPositions
  let count = inputs.screwsPerCrossing !== undefined ? inputs.screwsPerCrossing : totalPositions;
  count = Math.max(1, Math.min(totalPositions, count));

  const xFractions = selectSymmetricPositions(targetList, count);
  const actualSpacingCm = xFractions.length > 1
    ? Math.round(((xFractions[xFractions.length - 1] - xFractions[0]) / (xFractions.length - 1) * pWidthCm) * 10) / 10
    : Math.round((pWidthCm / 2) * 10) / 10;

  return {
    xFractions,
    isCrest,
    zOffsetMm,
    totalPositions,
    equalSpacingCounts,
    selectedCount: count,
    actualSpacingCm,
    isCustomSpacing: false,
  };
}
