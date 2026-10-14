import React from 'react';
import { calculateRoof } from '../utils/calculator';
import type { RoofInputs } from '../utils/calculator';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';
import { ShieldCheck, Anchor, Scissors, HardHat, Layers, Wrench, CheckCircle2 } from 'lucide-react';

interface InstallationGuideProps {
  inputs: RoofInputs;
  language: Language;
}

export const InstallationGuide: React.FC<InstallationGuideProps> = ({
  inputs,
  language,
}) => {
  const t = translations[language];
  const results = calculateRoof(inputs);
  const isRtl = language === 'fa' || language === 'ar';

  const formatNumber = (val: number) => {
    return isRtl ? val.toLocaleString('fa-IR') : val.toString();
  };

  const purlinSpacingCm = Math.round(results.purlinSpacingActual * 100);
  const purlinRows = results.purlinRowsPerSlope * results.slopesCount;

  // Custom Tools list with exact calculated quantities localized in all 8 languages
  const tools = [
    {
      name: t.guideTool1Name,
      desc: t.guideTool1Desc,
    },
    {
      name: t.guideTool2Name.replace('{count}', formatNumber(results.screwsCount)),
      desc: t.guideTool2Desc,
    },
    {
      name: t.guideTool3Name.replace('{length}', formatNumber(Math.round(results.purlinTotalLength))),
      desc: t.guideTool3Desc
        .replace('{width}', String(inputs.purlinSizeWidth || 40))
        .replace('{height}', String(inputs.purlinSizeHeight || 40))
        .replace('{spacing}', formatNumber(purlinSpacingCm)),
    },
    {
      name: t.guideTool4Name.replace('{count}', formatNumber(results.totalPanels)),
      desc: t.guideTool4Desc
        .replace('{length}', formatNumber(inputs.panelLength || 350))
        .replace('{width}', formatNumber(inputs.panelWidth || 44.9))
        .replace('{thickness}', String(inputs.panelThickness || 0.5)),
    },
    {
      name: t.guideTool5Name,
      desc: t.guideTool5Desc,
    },
    {
      name: t.guideTool6Name,
      desc: t.guideTool6Desc,
    },
  ];

  // Dynamic Project-Specific Installation Steps
  const steps = [
    {
      num: 1,
      icon: <HardHat size={22} color="var(--accent-secondary)" />,
      title: t.guideStep1Title,
      desc: t.guideStep1Desc
        .replace('{rows}', formatNumber(purlinRows))
        .replace('{width}', String(inputs.purlinSizeWidth || 40))
        .replace('{height}', String(inputs.purlinSizeHeight || 40))
        .replace('{spacing}', formatNumber(purlinSpacingCm)),
      badge: `${purlinSpacingCm} cm C-to-C`,
    },
    {
      num: 2,
      icon: <Anchor size={22} color="var(--accent-emerald)" />,
      title: t.guideStep2Title,
      desc: t.guideStep2Desc,
      badge: t.startInstallation || 'START #1',
    },
    {
      num: 3,
      icon: <Layers size={22} color="var(--accent-cyan)" />,
      title: t.guideStep3Title,
      desc: t.guideStep3Desc
        .replace('{sideLap}', formatNumber(inputs.horizontalOverlap || 4))
        .replace('{endLap}', formatNumber(inputs.verticalOverlap || 15)),
      badge: `${inputs.horizontalOverlap || 4}cm / ${inputs.verticalOverlap || 15}cm`,
    },
    {
      num: 4,
      icon: <Wrench size={22} color="var(--accent-amber)" />,
      title: t.guideStep4Title,
      desc: t.guideStep4Desc.replace('{screws}', formatNumber(results.screwsCount)),
      badge: `${formatNumber(results.screwsCount)} ${t.unitPcs}`,
    },
    {
      num: 5,
      icon: <ShieldCheck size={22} color="var(--accent-primary)" />,
      title: t.guideStep5Title,
      desc: t.guideStep5Desc.replace('{span}', formatNumber(inputs.roofWidth || 1200)),
      badge: '100% Weatherproof',
    },
  ];

  return (
    <div className="guide-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* 1. Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Scissors size={24} color="var(--accent-primary)" />
          {t.guideTitle}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '650px', margin: '0 auto' }}>
          {t.guideSubtitle}
        </p>
      </div>

      {/* 2. Live Roof Parameters KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="report-card" style={{ padding: '0.9rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>
            {t.panelQuantity}
          </span>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
            {formatNumber(results.totalPanels)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{t.unitPcs}</span>
          </span>
        </div>

        <div className="report-card" style={{ padding: '0.9rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>
            {t.purlinSpacing}
          </span>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
            {formatNumber(purlinSpacingCm)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{t.unitCm}</span>
          </span>
        </div>

        <div className="report-card" style={{ padding: '0.9rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>
            {t.screwsCount}
          </span>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-amber)' }}>
            {formatNumber(results.screwsCount)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{t.unitPcs}</span>
          </span>
        </div>

        <div className="report-card" style={{ padding: '0.9rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>
            {t.startInstallation}
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <CheckCircle2 size={16} />
            {t.eaveBoundary}
          </span>
        </div>
      </div>

      {/* 3. Required Tools & Material Quantities Table */}
      <div className="report-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wrench size={18} color="var(--accent-cyan)" />
          {t.guideToolsTitle}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem' }}>
          {tools.map((tool, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ color: 'var(--accent-primary)', marginTop: '2px' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>{tool.name}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tool.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Project-Tailored Step-by-Step Installation Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {steps.map((step) => (
          <div key={step.num} className="guide-step-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="guide-step-number" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
              {step.num}
            </div>
            <div className="guide-step-content" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {step.icon}
                  {step.title}
                </h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', padding: '0.2rem 0.6rem', borderRadius: '20px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                  {step.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
