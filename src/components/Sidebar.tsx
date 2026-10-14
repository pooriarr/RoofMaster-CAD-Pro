import React from 'react';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';
import type { RoofInputs } from '../utils/calculator';
import { calculateRoof } from '../utils/calculator';
import { generateMultiRibPoints } from './CADProfileDesigner';
import { getProfileCrestsAndValleys, getEqualSpacingScrewCounts, getActiveFastenerPositions, getProfilePitchCm } from '../utils/fastenerPattern';
import { Layers, Settings, Shield, DollarSign, ChevronRight, ChevronLeft, Hammer, Ruler, ArrowDown, ArrowUp, ArrowLeftRight, Mountain, Waves } from 'lucide-react';

interface SidebarProps {
  inputs: RoofInputs;
  setInputs: React.Dispatch<React.SetStateAction<RoofInputs>>;
  language: Language;
  setLanguage?: (lang: Language) => void;
  panelColor: string;
  setPanelColor: (color: string) => void;
  currentStep: 1 | 2 | 3 | 4;
  setCurrentStep: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
  activeTab: '3d' | '2d' | 'guide' | 'report' | 'cad';
  setActiveTab: (tab: '3d' | '2d' | 'guide' | 'report' | 'cad') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  inputs,
  setInputs,
  language,
  panelColor,
  setPanelColor,
  currentStep,
  setCurrentStep,
  setActiveTab,
}) => {
  const t = translations[language];
  const results = calculateRoof(inputs);
  const isRtl = language === 'fa' || language === 'ar';

  const panelColors = [
    { name: t.colorPureWhite, value: '#ffffff', border: '1px solid #94a3b8' },
    { name: t.colorSilverMetallic, value: '#94a3b8' },
    { name: t.colorSlateGrey, value: '#334155' },
    { name: t.colorCopperBronze, value: '#b45309' },
    { name: t.colorForestGreen, value: '#166534' },
    { name: t.colorCobaltBlue, value: '#1e3a8a' },
    { name: t.colorCharcoalBlack, value: '#1e293b' },
  ];

  const purlinColors = [
    { name: t.colorPureWhite, value: '#ffffff', border: '1px solid #94a3b8' },
    { name: t.colorGalvanizedSilver, value: '#cbd5e1' },
    { name: t.colorSlateGrey, value: '#475569' },
    { name: t.colorIndustrialBlack, value: '#1e293b' },
    { name: t.colorOxideRed, value: '#c2410c' },
    { name: t.colorSafetyYellow, value: '#eab308' },
    { name: t.colorWoodBrown, value: '#854d0e' },
  ];

  const updateInput = (key: keyof RoofInputs, value: any) => {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };
      
      // Auto-adjust default overlaps if panel profile changes
      if (key === 'panelType') {
        if (value === 'standing_seam') {
          next.horizontalOverlap = 0;
          next.verticalOverlap = 0;
        } else if (value === 'corrugated') {
          next.panelWidth = 85;
          next.horizontalOverlap = 8;
          next.verticalOverlap = 15;
        } else if (value === 'trapezoidal') {
          next.panelWidth = 100;
          next.horizontalOverlap = 5;
          next.verticalOverlap = 20;
        } else if (value === 'prr1') {
          next.panelWidth = 44.9;
          next.ribHeight = 22;
          next.horizontalOverlap = 4;
          next.verticalOverlap = 15;
          next.customProfilePoints = generateMultiRibPoints(5, 4, 37, 66, 22, 1, 3, 10, 'v_groove');
        }
      }

      // Auto-adjust characteristic metal color
      if (key === 'panelMaterial') {
        if (value === 'copper') {
          setPanelColor('#b45309');
          next.panelColor = '#b45309';
        } else if (value === 'aluminum') {
          setPanelColor('#cbd5e1');
          next.panelColor = '#cbd5e1';
        } else if (value === 'steel') {
          setPanelColor('#94a3b8');
          next.panelColor = '#94a3b8';
        }
      }

      // Auto-adjust purlin color if default
      if (key === 'purlinMaterial') {
        if (value === 'wood') {
          next.purlinColor = '#854d0e';
        } else if (value === 'metal' && (!prev.purlinColor || prev.purlinColor === '#854d0e')) {
          next.purlinColor = '#475569';
        }
      }
      return next;
    });
  };

  const shapes: Array<{ id: 'shed' | 'gable'; label: string }> = [
    { id: 'shed', label: t.roofShapeShed },
    { id: 'gable', label: t.roofShapeGable },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  return (
    <aside className="sidebar" style={{ justifyContent: 'space-between', paddingBottom: '1.5rem' }}>
      {/* Top Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Brand header */}
        <div className="sidebar-header">
          <h1 className="brand-gradient" style={{ fontSize: '1.4rem' }}>RoofMaster CAD Pro</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.tagline}</p>
        </div>

        {/* Stepper Wizard Progress Indicators (Vertical on Sidebar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          {[
            { step: 1, title: t.step1Name, desc: t.step1Desc },
            { step: 2, title: t.step2Name, desc: t.step2Desc },
            { step: 3, title: t.step3Name, desc: t.step3Desc },
            { step: 4, title: t.step4Name, desc: t.step4Desc },
          ].map((s) => (
            <div 
              key={s.step}
              onClick={() => setCurrentStep(s.step as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                opacity: currentStep === s.step ? 1 : 0.45,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              <div 
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: currentStep === s.step 
                    ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${currentStep === s.step ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  boxShadow: currentStep === s.step ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none',
                }}
              >
                {isRtl ? (s.step === 1 ? '۱' : s.step === 2 ? '۲' : s.step === 3 ? '۳' : '۴') : s.step}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: currentStep === s.step ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {s.title}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* STEP 1: Roof Structure Geometry */}
        {currentStep === 1 && (
          <div className="input-section">
            <h2 className="section-title">
              <Settings size={18} color="var(--accent-primary)" />
              {t.roofSettings}
            </h2>

            {/* Shape Cards */}
            <div className="control-group">
              <label>{t.roofShape}</label>
              <div className="shape-selector">
                {shapes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`shape-card ${inputs.roofShape === s.id ? 'active' : ''}`}
                    onClick={() => updateInput('roofShape', s.id)}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Width */}
            <div className="control-group">
              <div className="control-header">
                <label>{t.roofWidth}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="number"
                    step="1"
                    min="100"
                    max="5000"
                    style={{ width: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                    value={inputs.roofWidth}
                    onChange={(e) => updateInput('roofWidth', parseFloat(e.target.value) || 0)}
                  />
                  <span className="control-value">{t.unitCm}</span>
                </div>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="10"
                value={inputs.roofWidth}
                onChange={(e) => updateInput('roofWidth', parseFloat(e.target.value))}
              />
            </div>

            {/* Symmetry Mode Switcher for Gable Roof */}
            {inputs.roofShape === 'gable' && (
              <div className="control-group" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={`shape-card ${!inputs.isAsymmetricGable ? 'active' : ''}`}
                    onClick={() => {
                      setInputs((prev) => ({
                        ...prev,
                        isAsymmetricGable: false,
                        slope1Length: prev.roofLength,
                        slope2Length: prev.roofLength,
                        slope1Pitch: prev.roofPitch,
                        slope2Pitch: prev.roofPitch,
                      }));
                    }}
                    style={{ padding: '0.45rem', fontSize: '0.74rem', textAlign: 'center' }}
                  >
                    <span>{t.symmetricSlopes || 'Symmetrical (Linked)'}</span>
                  </button>
                  <button
                    type="button"
                    className={`shape-card ${inputs.isAsymmetricGable ? 'active' : ''}`}
                    onClick={() => {
                      setInputs((prev) => ({
                        ...prev,
                        isAsymmetricGable: true,
                        slope1Length: prev.slope1Length || prev.roofLength || 600,
                        slope2Length: prev.slope2Length || Math.round((prev.roofLength || 600) * 0.75),
                        slope1Pitch: prev.slope1Pitch || prev.roofPitch || 25,
                        slope2Pitch: prev.slope2Pitch || Math.max(10, (prev.roofPitch || 25) - 5),
                      }));
                    }}
                    style={{ padding: '0.45rem', fontSize: '0.74rem', textAlign: 'center' }}
                  >
                    <span>⚡ {t.asymmetricSlopes || 'Independent (Asymmetric)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Symmetrical Mode (Single Length & Pitch) or Shed */}
            {(!inputs.isAsymmetricGable || inputs.roofShape === 'shed') ? (
              <>
                {/* Slope Length */}
                <div className="control-group">
                  <div className="control-header">
                    <label>{t.roofLength}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="number"
                        step="1"
                        min="50"
                        max="3000"
                        style={{ width: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                        value={inputs.roofLength}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateInput('roofLength', val);
                          updateInput('slope1Length', val);
                          updateInput('slope2Length', val);
                        }}
                      />
                      <span className="control-value">{t.unitCm}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="3000"
                    step="10"
                    value={inputs.roofLength}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateInput('roofLength', val);
                      updateInput('slope1Length', val);
                      updateInput('slope2Length', val);
                    }}
                  />
                </div>

                {/* Pitch */}
                <div className="control-group">
                  <div className="control-header">
                    <label>{t.roofPitch}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="number"
                        min="1"
                        max="75"
                        style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                        value={inputs.roofPitch}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          updateInput('roofPitch', val);
                          updateInput('slope1Pitch', val);
                          updateInput('slope2Pitch', val);
                        }}
                      />
                      <span className="control-value">{t.unitDegree}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={inputs.roofPitch}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateInput('roofPitch', val);
                      updateInput('slope1Pitch', val);
                      updateInput('slope2Pitch', val);
                    }}
                  />
                </div>
              </>
            ) : (
              /* Asymmetrical Independent Slopes Section */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Slope 1 Card */}
                <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '10px', padding: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                    {t.slope1Settings || 'Slope 1 (Front / Left)'}
                  </h4>

                  {/* Slope 1 Length */}
                  <div className="control-group" style={{ marginBottom: '0.75rem' }}>
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.slope1Length || 'Slope 1 Length'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          step="1"
                          min="50"
                          max="3000"
                          style={{ width: '75px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.78rem' }}
                          value={inputs.slope1Length ?? inputs.roofLength}
                          onChange={(e) => updateInput('slope1Length', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="3000"
                      step="10"
                      value={inputs.slope1Length ?? inputs.roofLength}
                      onChange={(e) => updateInput('slope1Length', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Slope 1 Pitch */}
                  <div className="control-group" style={{ marginBottom: '0.75rem' }}>
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.slope1Pitch || 'Slope 1 Pitch'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="75"
                          style={{ width: '65px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.78rem' }}
                          value={inputs.slope1Pitch ?? inputs.roofPitch}
                          onChange={(e) => updateInput('slope1Pitch', parseInt(e.target.value, 10) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitDegree}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="1"
                      value={inputs.slope1Pitch ?? inputs.roofPitch}
                      onChange={(e) => updateInput('slope1Pitch', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* Slope 1 Vertical Offset */}
                  <div className="control-group" style={{ marginBottom: '0.75rem' }}>
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.verticalOffset || 'Vertical Offset'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          step="5"
                          min="-400"
                          max="400"
                          style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.78rem' }}
                          value={inputs.slope1OffsetVertical ?? 0}
                          onChange={(e) => updateInput('slope1OffsetVertical', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-250"
                      max="250"
                      step="5"
                      value={inputs.slope1OffsetVertical ?? 0}
                      onChange={(e) => updateInput('slope1OffsetVertical', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Slope 1 Horizontal Offset */}
                  <div className="control-group">
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.horizontalOffset || 'Horizontal Offset'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          step="5"
                          min="-400"
                          max="400"
                          style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.78rem' }}
                          value={inputs.slope1OffsetHorizontal ?? 0}
                          onChange={(e) => updateInput('slope1OffsetHorizontal', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-250"
                      max="250"
                      step="5"
                      value={inputs.slope1OffsetHorizontal ?? 0}
                      onChange={(e) => updateInput('slope1OffsetHorizontal', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {/* Slope 2 Card */}
                <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '10px', padding: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }} />
                    {t.slope2Settings || 'Slope 2 (Back / Right)'}
                  </h4>

                  {/* Slope 2 Length */}
                  <div className="control-group" style={{ marginBottom: '0.75rem' }}>
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.slope2Length || 'Slope 2 Length'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          step="1"
                          min="50"
                          max="3000"
                          style={{ width: '75px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.78rem' }}
                          value={inputs.slope2Length ?? inputs.roofLength}
                          onChange={(e) => updateInput('slope2Length', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="3000"
                      step="10"
                      value={inputs.slope2Length ?? inputs.roofLength}
                      onChange={(e) => updateInput('slope2Length', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Slope 2 Pitch */}
                  <div className="control-group" style={{ marginBottom: '0.75rem' }}>
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.slope2Pitch || 'Slope 2 Pitch'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="75"
                          style={{ width: '65px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.78rem' }}
                          value={inputs.slope2Pitch ?? inputs.roofPitch}
                          onChange={(e) => updateInput('slope2Pitch', parseInt(e.target.value, 10) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitDegree}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="1"
                      value={inputs.slope2Pitch ?? inputs.roofPitch}
                      onChange={(e) => updateInput('slope2Pitch', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* Slope 2 Vertical Offset */}
                  <div className="control-group" style={{ marginBottom: '0.75rem' }}>
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.verticalOffset || 'Vertical Offset'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          step="5"
                          min="-400"
                          max="400"
                          style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.78rem' }}
                          value={inputs.slope2OffsetVertical ?? 0}
                          onChange={(e) => updateInput('slope2OffsetVertical', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-250"
                      max="250"
                      step="5"
                      value={inputs.slope2OffsetVertical ?? 0}
                      onChange={(e) => updateInput('slope2OffsetVertical', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Slope 2 Horizontal Offset */}
                  <div className="control-group">
                    <div className="control-header">
                      <label style={{ fontSize: '0.75rem' }}>{t.horizontalOffset || 'Horizontal Offset'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          step="5"
                          min="-400"
                          max="400"
                          style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.78rem' }}
                          value={inputs.slope2OffsetHorizontal ?? 0}
                          onChange={(e) => updateInput('slope2OffsetHorizontal', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value" style={{ fontSize: '0.7rem' }}>{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-250"
                      max="250"
                      step="5"
                      value={inputs.slope2OffsetHorizontal ?? 0}
                      onChange={(e) => updateInput('slope2OffsetHorizontal', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Underlayment & Framing Design (Zirsazi Environment) */}
        {currentStep === 2 && (
          <div className="input-section">
            <h2 className="section-title">
              <Hammer size={18} color="var(--accent-amber)" />
              {t.step2Name}
            </h2>

            {/* Framing Material */}
            <div className="control-group">
              <label>{t.framingMaterial}</label>
              <select
                value={inputs.purlinMaterial}
                onChange={(e) => updateInput('purlinMaterial', e.target.value)}
              >
                <option value="wood">{t.materialWood}</option>
                <option value="metal">{t.materialMetal}</option>
              </select>
            </div>

            {/* Framing & Tube Color Picker */}
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ margin: 0 }}>{t.framingColor}</label>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: inputs.purlinColor || '#475569', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                  {inputs.purlinColor || (inputs.purlinMaterial === 'wood' ? '#854d0e' : '#475569')}
                </span>
              </div>
              <div className="color-swatches" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                {purlinColors.map((color) => {
                  const currentColor = (inputs.purlinColor || (inputs.purlinMaterial === 'wood' ? '#854d0e' : '#475569')).toLowerCase();
                  const isSelected = currentColor === color.value.toLowerCase();
                  return (
                    <button
                      key={color.value}
                      type="button"
                      className={`color-swatch-btn ${isSelected ? 'active' : ''}`}
                      style={{
                        backgroundColor: color.value,
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid var(--accent-cyan)' : (color.border || '1px solid rgba(255,255,255,0.15)'),
                        cursor: 'pointer',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 8px rgba(6, 182, 212, 0.5)' : 'none',
                      }}
                      title={color.name}
                      onClick={() => updateInput('purlinColor', color.value)}
                    />
                  );
                })}
                {/* Custom Color Input */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} title={t.customColor}>
                  <input
                    type="color"
                    value={inputs.purlinColor || (inputs.purlinMaterial === 'wood' ? '#854d0e' : '#475569')}
                    onChange={(e) => updateInput('purlinColor', e.target.value)}
                    style={{
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      borderRadius: '6px',
                      border: '1px dashed var(--accent-cyan)',
                      cursor: 'pointer',
                      background: 'transparent',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Framing Orientation */}
            <div className="control-group">
              <label>{t.framingOrientation}</label>
              <select
                value={inputs.framingOrientation}
                onChange={(e) => updateInput('framingOrientation', e.target.value)}
              >
                <option value="horizontal">{t.framingHorizontal}</option>
                <option value="vertical">{t.framingVertical}</option>
                <option value="grid">{t.framingGrid}</option>
                <option value="diagonal">{t.framingDiagonal}</option>
              </select>
            </div>

            {/* Spacing input (purlins) - only if horizontal, grid or diagonal cross-braces */}
            {inputs.framingOrientation !== 'vertical' && (
              <div className="control-group">
                <div className="control-header">
                  <label>{t.purlinSpacing}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="200"
                      style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                      value={inputs.purlinSpacing}
                      onChange={(e) => updateInput('purlinSpacing', parseFloat(e.target.value) || 60)}
                    />
                    <span className="control-value">{t.unitCm}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="1"
                  value={inputs.purlinSpacing}
                  onChange={(e) => updateInput('purlinSpacing', parseFloat(e.target.value))}
                />
              </div>
            )}

            {/* Profile Size Width & Height */}
            <div className="control-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem' }}>{t.profileWidth}</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  style={{ padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                  value={inputs.purlinSizeWidth}
                  onChange={(e) => updateInput('purlinSizeWidth', parseInt(e.target.value, 10) || 40)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>{t.profileHeight}</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  style={{ padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                  value={inputs.purlinSizeHeight}
                  onChange={(e) => updateInput('purlinSizeHeight', parseInt(e.target.value, 10) || 40)}
                />
              </div>
            </div>

            {/* Feedback info box */}
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>{t.totalPurlinRows}:</span>
                <span className="bold-value">{results.purlinRowsPerSlope * results.slopesCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.totalPurlinLength}:</span>
                <span className="bold-value" style={{ color: 'var(--accent-cyan)' }}>
                  {results.purlinTotalLength.toFixed(1)} {t.unitMeter}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Panel Design & Selection */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Sheet dimension settings */}
            <div className="input-section">
              <h2 className="section-title">
                <Layers size={18} color="var(--accent-cyan)" />
                {t.panelSettings}
              </h2>

              <div className="control-group">
                <label>{t.panelType}</label>
                <select
                  value={inputs.panelType}
                  onChange={(e) => updateInput('panelType', e.target.value)}
                >
                  <option value="standing_seam">{t.panelTypeStandingSeam}</option>
                  <option value="corrugated">{t.panelTypeCorrugated}</option>
                  <option value="trapezoidal">{t.panelTypeTrapezoidal}</option>
                  <option value="prr1">{t.panelTypePRR1}</option>
                  <option value="custom">{t.panelTypeCustom}</option>
                </select>
              </div>

              {/* Panel Length */}
              <div className="control-group">
                <div className="control-header">
                  <label>{t.panelLength}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      step="1"
                      min="50"
                      max="1200"
                      style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                      value={inputs.panelLength}
                      onChange={(e) => updateInput('panelLength', parseFloat(e.target.value) || 0)}
                    />
                    <span className="control-value">{t.unitCm}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1200"
                  step="5"
                  value={inputs.panelLength}
                  onChange={(e) => updateInput('panelLength', parseFloat(e.target.value))}
                />
              </div>

              {/* Panel Width (Effective) */}
              <div className="control-group">
                <div className="control-header">
                  <label>{t.panelWidth}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="10"
                      max="200"
                      style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                      value={inputs.panelWidth}
                      onChange={(e) => updateInput('panelWidth', parseFloat(e.target.value) || 0)}
                    />
                    <span className="control-value">{t.unitCm}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="0.1"
                  value={inputs.panelWidth}
                  onChange={(e) => updateInput('panelWidth', parseFloat(e.target.value))}
                />
              </div>

              {/* Panel Layout & Substructure Alignment Section */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '10px',
                padding: '0.85rem',
                marginTop: '0.4rem',
                marginBottom: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}>
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-primary)', fontWeight: '700', fontSize: '0.85rem' }}>
                  <Ruler size={16} />
                  <span>{t.panelArrangement || 'Panel Layout & Alignment on Substructure'}</span>
                </div>

                {/* 1. Slope Overhang Position (Overhang off Substructure) */}
                <div className="control-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.45rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                      {t.slopeAlignment}
                    </label>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {t.slopeAlignmentSub}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    {[
                      {
                        id: 'bottom',
                        label: t.alignBottom,
                        sub: t.alignBottomSub,
                        icon: <ArrowDown size={15} color={(inputs.slopeAlignment || 'bottom') === 'bottom' ? '#06b6d4' : 'currentColor'} />,
                      },
                      {
                        id: 'center',
                        label: t.alignCenter,
                        sub: t.alignCenterSub,
                        icon: <ArrowLeftRight size={15} style={{ transform: 'rotate(90deg)' }} color={inputs.slopeAlignment === 'center' ? '#06b6d4' : 'currentColor'} />,
                      },
                      {
                        id: 'top',
                        label: t.alignTop,
                        sub: t.alignTopSub,
                        icon: <ArrowUp size={15} color={inputs.slopeAlignment === 'top' ? '#06b6d4' : 'currentColor'} />,
                      },
                    ].map((opt) => {
                      const isSelected = (inputs.slopeAlignment || 'bottom') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`shape-card ${isSelected ? 'active' : ''}`}
                          style={{
                            padding: '0.6rem 0.35rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
                            background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
                            boxShadow: isSelected ? '0 0 10px rgba(6, 182, 212, 0.25)' : 'none',
                          }}
                          onClick={() => updateInput('slopeAlignment', opt.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {opt.icon}
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: isSelected ? '700' : '500', color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                            {opt.label}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)', lineHeight: 1.1 }}>
                            {opt.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Horizontal Layout Sequence Direction */}
                <div className="control-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.45rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                      {t.layoutDirection}
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    {[
                      {
                        id: 'left_to_right',
                        label: t.layoutLeftRight,
                        icon: <ChevronRight size={15} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />,
                      },
                      {
                        id: 'center_out',
                        label: t.layoutCenterOut,
                        icon: <ArrowLeftRight size={15} />,
                      },
                      {
                        id: 'right_to_left',
                        label: t.layoutRightLeft,
                        icon: <ChevronLeft size={15} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />,
                      },
                    ].map((dirOpt) => {
                      const isSelected = (inputs.layoutDirection || 'left_to_right') === dirOpt.id;
                      return (
                        <button
                          key={dirOpt.id}
                          type="button"
                          className={`shape-card ${isSelected ? 'active' : ''}`}
                          style={{
                            padding: '0.55rem 0.35rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                            background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                            boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.25)' : 'none',
                          }}
                          onClick={() => updateInput('layoutDirection', dirOpt.id)}
                        >
                          <div style={{ color: isSelected ? 'var(--accent-primary)' : 'currentColor' }}>
                            {dirOpt.icon}
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: isSelected ? '700' : '500', color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                            {dirOpt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {inputs.panelType !== 'standing_seam' && (
                <>
                  {/* Vertical End Lap */}
                  <div className="control-group">
                    <div className="control-header">
                      <label>{t.verticalOverlap}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                          value={inputs.verticalOverlap}
                          onChange={(e) => updateInput('verticalOverlap', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value">{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={inputs.verticalOverlap}
                      onChange={(e) => updateInput('verticalOverlap', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Crest-Based Side-Lap Target Selector */}
                  <div className="control-group">
                    <label>{t.sideLapRibTarget}</label>
                    <select
                      value={inputs.sideLapRibIndex || 1}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10) || 1;
                        const ribW = 37;
                        const valW = 66;
                        const overlapMm = idx === 1 ? ribW : (ribW + valW + ribW);
                        const overlapCm = overlapMm / 10;

                        setInputs((prev) => ({
                          ...prev,
                          sideLapRibIndex: idx,
                          horizontalOverlap: overlapCm,
                        }));
                      }}
                    >
                      <option value={1}>{t.sideLap1stCrest}</option>
                      <option value={2}>{t.sideLap2ndCrest}</option>
                    </select>
                  </div>

                  {/* Millimeter Overlap Readout Badge */}
                  <div style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}>
                    <span>{t.sideLapOverlapAmount}</span>
                    <strong style={{ fontSize: '0.85rem' }}>
                      {Math.round((inputs.horizontalOverlap || 3.7) * 10)} {t.unitMm} ({(inputs.horizontalOverlap || 3.7).toFixed(1)} {t.unitCm})
                    </strong>
                  </div>

                  {/* Manual Horizontal Side Lap Slider */}
                  <div className="control-group">
                    <div className="control-header">
                      <label>{t.horizontalOverlap}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                          value={inputs.horizontalOverlap}
                          onChange={(e) => updateInput('horizontalOverlap', parseFloat(e.target.value) || 0)}
                        />
                        <span className="control-value">{t.unitCm}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="0.5"
                      value={inputs.horizontalOverlap}
                      onChange={(e) => updateInput('horizontalOverlap', parseFloat(e.target.value))}
                    />
                  </div>
                </>
              )}

              {/* Color dot swatches */}
              <div className="control-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ margin: 0 }}>{t.materialColor || t.panelColor}</label>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: panelColor, background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                    {panelColor}
                  </span>
                </div>
                <div className="color-picker-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                  {panelColors.map((color) => {
                    const isSelected = panelColor.toLowerCase() === color.value.toLowerCase();
                    return (
                      <button
                        key={color.value}
                        type="button"
                        className={`color-dot ${isSelected ? 'active' : ''}`}
                        style={{
                          backgroundColor: color.value,
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid var(--accent-cyan)' : (color.border || '1px solid rgba(255,255,255,0.15)'),
                          cursor: 'pointer',
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 8px rgba(6, 182, 212, 0.5)' : 'none',
                        }}
                        title={color.name}
                        onClick={() => {
                          setPanelColor(color.value);
                          updateInput('panelColor', color.value);
                        }}
                      />
                    );
                  })}
                  {/* Custom Color Input */}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} title={t.customColor}>
                    <input
                      type="color"
                      value={panelColor}
                      onChange={(e) => {
                        setPanelColor(e.target.value);
                        updateInput('panelColor', e.target.value);
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        borderRadius: '6px',
                        border: '1px dashed var(--accent-cyan)',
                        cursor: 'pointer',
                        background: 'transparent',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FASTENERS & EPDM SCREWS CONTROL CARD */}
            {(() => {
              const profileInfo = getProfileCrestsAndValleys(inputs);
              const currentPlacement = inputs.fastenerPlacement || 'crest';
              const targetPositions = currentPlacement === 'crest' ? profileInfo.crests : profileInfo.valleys;
              const maxPositions = Math.max(1, targetPositions.length);
              const equalCounts = getEqualSpacingScrewCounts(maxPositions);
              const naturalPitchCm = getProfilePitchCm(inputs);
              const isCustomSpacing = inputs.screwSpacingMode === 'custom_spacing';
              
              const fastenerData = getActiveFastenerPositions(inputs);
              const activeCount = fastenerData.selectedCount;
              const activePositions = fastenerData.xFractions;
              const currentSpacingCm = fastenerData.actualSpacingCm;

              return (
                <div className="input-section" style={{
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 className="section-title" style={{ margin: 0, color: 'var(--accent-emerald, #10b981)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Shield size={17} color="#10b981" />
                        {t.fastenersTitle}
                      </h2>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.3 }}>
                        {t.fastenersDesc}
                      </p>
                    </div>

                    {/* Show/Hide Toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={inputs.showScrews !== false}
                        onChange={(e) => updateInput('showScrews', e.target.checked)}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      <span>{t.showScrews}</span>
                    </label>
                  </div>

                  {/* 1. Fastener Target Zone Switcher (Crests vs Valleys) */}
                  <div className="control-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.35rem', display: 'block' }}>
                      {t.fastenerLocation}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {/* Crests Option */}
                      <button
                        type="button"
                        className={`shape-card ${currentPlacement === 'crest' ? 'active' : ''}`}
                        style={{
                          padding: '0.6rem 0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          border: currentPlacement === 'crest' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: currentPlacement === 'crest' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255,255,255,0.02)',
                          boxShadow: currentPlacement === 'crest' ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none',
                        }}
                        onClick={() => {
                          const newMax = Math.max(1, profileInfo.crests.length);
                          setInputs((prev) => ({
                            ...prev,
                            fastenerPlacement: 'crest',
                            screwsPerCrossing: Math.min(prev.screwsPerCrossing || newMax, newMax),
                          }));
                        }}
                      >
                        <Mountain size={18} color={currentPlacement === 'crest' ? '#10b981' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '0.74rem', fontWeight: 'bold', color: currentPlacement === 'crest' ? '#ffffff' : 'var(--text-secondary)' }}>
                          {t.placementCrests}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: 'var(--accent-cyan)' }}>
                          {profileInfo.crests.length} {t.crestsMax || 'Crests (Max)'}
                        </span>
                      </button>

                      {/* Valleys Option */}
                      <button
                        type="button"
                        className={`shape-card ${currentPlacement === 'valley' ? 'active' : ''}`}
                        style={{
                          padding: '0.6rem 0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          border: currentPlacement === 'valley' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: currentPlacement === 'valley' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255,255,255,0.02)',
                          boxShadow: currentPlacement === 'valley' ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none',
                        }}
                        onClick={() => {
                          const newMax = Math.max(1, profileInfo.valleys.length);
                          setInputs((prev) => ({
                            ...prev,
                            fastenerPlacement: 'valley',
                            screwsPerCrossing: Math.min(prev.screwsPerCrossing || newMax, newMax),
                          }));
                        }}
                      >
                        <Waves size={18} color={currentPlacement === 'valley' ? '#10b981' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '0.74rem', fontWeight: 'bold', color: currentPlacement === 'valley' ? '#ffffff' : 'var(--text-secondary)' }}>
                          {t.placementValleys}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: 'var(--accent-cyan)' }}>
                          {profileInfo.valleys.length} {t.valleysMax || 'Valleys (Max)'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Spacing Mode Selector (Profile Pitch vs Custom Spacing) */}
                  <div className="control-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: '600', margin: 0 }}>
                        {t.screwSpacingMode}
                      </label>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>
                        {currentSpacingCm} cm ({t.equalSpacing || 'Equal'})
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <button
                        type="button"
                        className={`shape-card ${!isCustomSpacing ? 'active' : ''}`}
                        style={{
                          padding: '0.45rem 0.3rem',
                          fontSize: '0.68rem',
                          border: !isCustomSpacing ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: !isCustomSpacing ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.02)',
                          color: !isCustomSpacing ? '#ffffff' : 'var(--text-secondary)',
                          boxShadow: !isCustomSpacing ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none',
                        }}
                        onClick={() => updateInput('screwSpacingMode', 'profile_pitch')}
                      >
                        {t.spacingModeProfile}
                      </button>

                      <button
                        type="button"
                        className={`shape-card ${isCustomSpacing ? 'active' : ''}`}
                        style={{
                          padding: '0.45rem 0.3rem',
                          fontSize: '0.68rem',
                          border: isCustomSpacing ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: isCustomSpacing ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.02)',
                          color: isCustomSpacing ? '#ffffff' : 'var(--text-secondary)',
                          boxShadow: isCustomSpacing ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none',
                        }}
                        onClick={() => {
                          setInputs((prev) => ({
                            ...prev,
                            screwSpacingMode: 'custom_spacing',
                            customScrewSpacing: prev.customScrewSpacing || naturalPitchCm,
                          }));
                        }}
                      >
                        {t.spacingModeCustom}
                      </button>
                    </div>

                    {/* Mode A: Profile Pitch Mode (Default: Center of Crests/Valleys) */}
                    {!isCustomSpacing ? (
                      <div>
                        <div className="control-header">
                          <label style={{ fontSize: '0.76rem', fontWeight: '600' }}>
                            {t.screwsPerCrossing}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => updateInput('screwsPerCrossing', Math.max(1, activeCount - 1))}
                              disabled={activeCount <= 1}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: activeCount <= 1 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.3)',
                                color: activeCount <= 1 ? 'rgba(255,255,255,0.2)' : '#fff',
                                cursor: activeCount <= 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              max={maxPositions}
                              style={{
                                width: '46px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-color)',
                                padding: '0.2rem 0.3rem',
                                borderRadius: '4px',
                                textAlign: 'center',
                                color: '#10b981',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                              }}
                              value={activeCount}
                              onChange={(e) => updateInput('screwsPerCrossing', Math.max(1, Math.min(maxPositions, parseInt(e.target.value, 10) || 1)))}
                            />
                            <button
                              type="button"
                              onClick={() => updateInput('screwsPerCrossing', Math.min(maxPositions, activeCount + 1))}
                              disabled={activeCount >= maxPositions}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: activeCount >= maxPositions ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.3)',
                                color: activeCount >= maxPositions ? 'rgba(255,255,255,0.2)' : '#fff',
                                cursor: activeCount >= maxPositions ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Range Slider 1 to Max */}
                        <input
                          type="range"
                          min="1"
                          max={maxPositions}
                          step="1"
                          value={activeCount}
                          onChange={(e) => updateInput('screwsPerCrossing', parseInt(e.target.value, 10))}
                          style={{ accentColor: '#10b981', width: '100%', marginTop: '0.2rem' }}
                        />

                        {/* Equal Spacing Preset Quick Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(equalCounts.length, 4)}, 1fr)`, gap: '0.35rem', marginTop: '0.35rem' }}>
                          {equalCounts.map((count) => {
                            const isSelected = activeCount === count;
                            let subLabel = '';
                            if (count === maxPositions) {
                              subLabel = t.allPoints || 'All (1x)';
                            } else if (count === 1) {
                              subLabel = t.exactCenter || 'Center';
                            } else {
                              subLabel = t.equalSpace || 'Equal Space';
                            }

                            return (
                              <button
                                key={count}
                                type="button"
                                className={`shape-card ${isSelected ? 'active' : ''}`}
                                style={{
                                  padding: '0.45rem 0.2rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.15rem',
                                  border: isSelected ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                  background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.02)',
                                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                  boxShadow: isSelected ? '0 0 8px rgba(16, 185, 129, 0.35)' : 'none',
                                }}
                                onClick={() => updateInput('screwsPerCrossing', count)}
                              >
                                <strong style={{ fontSize: '0.82rem', color: isSelected ? '#10b981' : '#ffffff' }}>
                                  {count} {t.unitPcs || 'pcs'}
                                </strong>
                                <span style={{ fontSize: '0.6rem', color: isSelected ? '#ffffff' : 'var(--text-muted)' }}>
                                  {subLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Mode B: Custom Equal Spacing Distance Slider & Input */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div className="control-header">
                          <label style={{ fontSize: '0.76rem', fontWeight: '600' }}>
                            {t.screwSpacingCm}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <input
                              type="number"
                              step="0.5"
                              min="3"
                              max="60"
                              style={{
                                width: '60px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-color)',
                                padding: '0.2rem 0.3rem',
                                borderRadius: '4px',
                                textAlign: 'center',
                                color: '#10b981',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                              }}
                              value={inputs.customScrewSpacing || naturalPitchCm}
                              onChange={(e) => updateInput('customScrewSpacing', Math.max(3, parseFloat(e.target.value) || naturalPitchCm))}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>cm</span>
                          </div>
                        </div>

                        <input
                          type="range"
                          min="4"
                          max="40"
                          step="0.5"
                          value={inputs.customScrewSpacing || naturalPitchCm}
                          onChange={(e) => updateInput('customScrewSpacing', parseFloat(e.target.value))}
                          style={{ accentColor: '#10b981', width: '100%' }}
                        />

                        {/* Reset to Profile Natural Pitch Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setInputs((prev) => ({
                              ...prev,
                              screwSpacingMode: 'profile_pitch',
                              customScrewSpacing: naturalPitchCm,
                              screwsPerCrossing: profileInfo.crests.length,
                            }));
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px dashed rgba(16, 185, 129, 0.4)',
                            color: '#10b981',
                            fontSize: '0.68rem',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            marginTop: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          ↺ {t.resetToProfilePitch} ({naturalPitchCm} cm)
                        </button>
                      </div>
                    )}

                    {/* Spacing & Symmetry Readout */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.7rem',
                      color: 'var(--accent-cyan)',
                      marginTop: '0.45rem',
                      background: 'rgba(6, 182, 212, 0.08)',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(6, 182, 212, 0.18)',
                    }}>
                      <span>
                        {t.equalSpacingLabel || 'Equal Spacing:'} <strong>{currentSpacingCm} cm</strong>
                      </span>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        ({activeCount} {t.screwsPerSheetWidth || 'screws per width'})
                      </span>
                    </div>

                    {/* Miniature Cross-Section Visual Pattern Indicator */}
                    <div style={{
                      marginTop: '0.45rem',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      height: '26px',
                    }}>
                      {/* Base cross-section line */}
                      <div style={{
                        position: 'absolute',
                        left: '12px',
                        right: '12px',
                        top: '50%',
                        height: '2px',
                        background: 'rgba(255, 255, 255, 0.15)',
                        transform: 'translateY(-50%)',
                      }} />
                      {activePositions.map((xPos, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'absolute',
                            left: `calc(12px + (100% - 24px) * ${xPos})`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '13px',
                            height: '13px',
                            borderRadius: '50%',
                            backgroundColor: inputs.screwColor || '#10b981',
                            border: '1.5px solid #ffffff',
                            boxShadow: `0 0 7px ${inputs.screwColor || '#10b981'}`,
                            transition: 'all 0.2s ease',
                            zIndex: 2,
                          }}
                          title={`Fastener #${idx + 1} (${(xPos * 100).toFixed(1)}%)`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 3. Screw Cap Color Picker */}
                  <div className="control-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ margin: 0, fontSize: '0.78rem' }}>{t.screwColor}</label>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: inputs.screwColor || '#10b981', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                        {inputs.screwColor || '#10b981'}
                      </span>
                    </div>
                    <div className="color-picker-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      {[
                        { name: 'White Zinc', value: '#ffffff', border: '1px solid #94a3b8' },
                        { name: 'Galvanized Silver', value: '#94a3b8' },
                        { name: 'Emerald Green', value: '#10b981' },
                        { name: 'Cyan Tech', value: '#06b6d4' },
                        { name: 'Amber Brass', value: '#f59e0b' },
                        { name: 'Crimson Red', value: '#ef4444' },
                        { name: 'Slate Grey', value: '#475569' },
                        { name: 'Charcoal Black', value: '#1e293b' },
                      ].map((color) => {
                        const curScrewColor = (inputs.screwColor || '#10b981').toLowerCase();
                        const isSelected = curScrewColor === color.value.toLowerCase();
                        return (
                          <button
                            key={color.value}
                            type="button"
                            className={`color-dot ${isSelected ? 'active' : ''}`}
                            style={{
                              backgroundColor: color.value,
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: isSelected ? '2px solid #10b981' : (color.border || '1px solid rgba(255,255,255,0.15)'),
                              cursor: 'pointer',
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                            }}
                            title={color.name}
                            onClick={() => updateInput('screwColor', color.value)}
                          />
                        );
                      })}
                      {/* Custom Color Input */}
                      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} title={t.customColor}>
                        <input
                          type="color"
                          value={inputs.screwColor || '#10b981'}
                          onChange={(e) => updateInput('screwColor', e.target.value)}
                          style={{
                            width: '26px',
                            height: '26px',
                            padding: 0,
                            borderRadius: '6px',
                            border: '1px dashed #10b981',
                            cursor: 'pointer',
                            background: 'transparent',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Fasteners Summary Readout Badge */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>
                      {t.screwsCount || 'Total Screws'}: <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>{results.screwsCount}</strong> {t.unitPcs || 'pcs'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ({(results.screwsCount / Math.max(0.1, results.totalArea)).toFixed(1)} pcs/m²) • €{results.screwCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Redirect notice to CAD tab for custom profile */}
            {(inputs.panelType === 'custom' || inputs.panelType === 'prr1') && (
              <div className="input-section" style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Ruler size={16} />
                  {t.tabCAD}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {t.openCadWorkspaceDesc}
                </p>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ fontSize: '0.8rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: 'pointer' }}
                  onClick={() => setActiveTab('cad')}
                >
                  {t.openCadWorkspace}
                </button>
              </div>
            )}

            {/* Technical profile designer sub-section */}
            <div className="input-section">
              <h2 className="section-title">
                <Ruler size={18} color="var(--accent-cyan)" />
                {t.panelDesigner}
              </h2>

              {/* Sheet Thickness */}
              <div className="control-group">
                <div className="control-header">
                  <label>{t.panelThickness}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      max="2.0"
                      style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                      value={inputs.panelThickness}
                      onChange={(e) => updateInput('panelThickness', parseFloat(e.target.value) || 0.4)}
                    />
                    <span className="control-value">{t.unitMm}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.2"
                  step="0.05"
                  value={inputs.panelThickness}
                  onChange={(e) => updateInput('panelThickness', parseFloat(e.target.value))}
                />
              </div>

              {/* Rib Height */}
              <div className="control-group">
                <div className="control-header">
                  <label>{t.ribHeight}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      style={{ width: '70px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}
                      value={inputs.ribHeight}
                      onChange={(e) => updateInput('ribHeight', parseInt(e.target.value, 10) || 10)}
                    />
                    <span className="control-value">{t.unitMm}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="1"
                  value={inputs.ribHeight}
                  onChange={(e) => updateInput('ribHeight', parseInt(e.target.value, 10))}
                />
              </div>

              {/* Base Metal Alloy */}
              <div className="control-group">
                <label>{t.materialType}</label>
                <select
                  value={inputs.panelMaterial}
                  onChange={(e) => updateInput('panelMaterial', e.target.value)}
                >
                  <option value="steel">{t.materialSteel}</option>
                  <option value="aluminum">{t.materialAluminum}</option>
                  <option value="copper">{t.materialCopper}</option>
                </select>
              </div>

              {/* Coating Finish */}
              <div className="control-group">
                <label>{t.finishType}</label>
                <select
                  value={inputs.panelFinish}
                  onChange={(e) => updateInput('panelFinish', e.target.value)}
                >
                  <option value="polyester">{t.finishPolyester}</option>
                  <option value="pvdf">{t.finishPVDF}</option>
                  <option value="matte">{t.finishMatte}</option>
                </select>
              </div>

              {/* Unit Weight Feedback */}
              <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.1)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>{t.panelWeight}:</span>
                  <span className="bold-value" style={{ color: 'var(--accent-cyan)' }}>
                    {results.sheetWeightSqm.toFixed(2)} {t.unitKg}/m²
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Takeoff invoice and print report */}
        {currentStep === 4 && (
          <div className="input-section">
            <h2 className="section-title">
              <DollarSign size={18} color="var(--accent-emerald)" />
              {t.costSettings}
            </h2>

            {/* Pricing Mode Toggle */}
            <div className="control-group">
              <label>{t.panelPricingMode}</label>
              <select
                value={inputs.pricingMode || 'per_sheet'}
                onChange={(e) => updateInput('pricingMode', e.target.value)}
              >
                <option value="per_sheet">{t.pricePerSheetPanel}</option>
                <option value="per_meter">{t.pricePerMeterPanel}</option>
              </select>
            </div>

            {/* Price Per Sheet Panel (€) */}
            {inputs.pricingMode !== 'per_meter' ? (
              <div className="control-group">
                <label>{t.pricePerSheetPanel}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold', fontSize: '1rem' }}>€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={inputs.pricePerSheet ?? 0}
                    onChange={(e) => updateInput('pricePerSheet', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="control-group">
                <label>{t.pricePerMeterPanel}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold', fontSize: '1rem' }}>€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={inputs.panelPrice}
                    onChange={(e) => updateInput('panelPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}

            {/* Purlins unit cost */}
            <div className="control-group">
              <label>{t.purlinPricePerMeter}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold', fontSize: '1rem' }}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={inputs.purlinPrice}
                  onChange={(e) => updateInput('purlinPrice', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Screws unit cost */}
            <div className="control-group">
              <label>{t.screwPricePerPiece}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold', fontSize: '1rem' }}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputs.screwPrice}
                  onChange={(e) => updateInput('screwPrice', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Stepper Wizard Nav Buttons */}
      <div 
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          background: 'var(--bg-surface)',
          zIndex: 11,
        }}
      >
        {currentStep > 1 && (
          <button
            type="button"
            className="overlay-btn"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.7rem',
              fontWeight: '600',
            }}
            onClick={handleBack}
          >
            {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {t.backStep}
          </button>
        )}
        
        {currentStep < 4 ? (
          <button
            type="button"
            className="report-btn"
            style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.7rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
            }}
            onClick={handleNext}
          >
            {t.nextStep}
            {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div style={{ flex: 2, opacity: 0.6, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
            <Shield size={14} />
            <span>{t.readyForPrinting}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
