import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Visualizer3D } from './components/Visualizer3D';
import { Blueprint2D } from './components/Blueprint2D';
import { InstallationGuide } from './components/InstallationGuide';
import { ProjectReport } from './components/ProjectReport';
import { CADProfileDesigner, generateMultiRibPoints } from './components/CADProfileDesigner';
import { calculateRoof } from './utils/calculator';
import type { RoofInputs } from './utils/calculator';
import type { Language } from './utils/translations';
import { translations, languageList } from './utils/translations';
import { Box, Compass, FileText, PenTool, Folder, Save, FilePlus, Printer, RotateCcw, Globe, Layers, Shield, Mail, User, Sparkles } from 'lucide-react';
import appIcon from './assets/app-icon.png';

function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  useEffect(() => {
    const isRtlLang = language === 'fa' || language === 'ar';
    document.documentElement.dir = isRtlLang ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const [panelColor, setPanelColor] = useState<string>('#94a3b8');
  const [activeTab, setActiveTab] = useState<'3d' | '2d' | 'guide' | 'report' | 'cad'>('3d');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File menu dropdown states
  const [activeMenu, setActiveMenu] = useState<'file' | 'edit' | 'view' | 'language' | 'help' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  // Default engineered parametric inputs
  const [inputs, setInputs] = useState<RoofInputs>({
    roofShape: 'gable',
    roofWidth: 1200, // 12.00 meters
    roofLength: 600,  // 6.00 meters slope
    roofPitch: 18,    // degrees
    panelType: 'prr1',
    panelLength: 350, // 3.50 meters per sheet
    panelWidth: 44.9, // 44.9 cm effective pitch
    verticalOverlap: 15, // 15 cm end-lap
    horizontalOverlap: 4, // 4 cm side-lap
    sideLapRibIndex: 1,
    layoutDirection: 'left_to_right',
    slopeAlignment: 'bottom',
    panelThickness: 0.50,
    ribHeight: 22,
    panelMaterial: 'steel',
    panelFinish: 'polyester',
    customProfilePoints: generateMultiRibPoints(5, 4, 37, 66, 22, 1, 3, 10, 'v_groove'),
    purlinSpacing: 60,
    purlinMaterial: 'metal',
    purlinColor: '#475569',
    framingOrientation: 'grid',
    purlinSizeWidth: 40,
    purlinSizeHeight: 40,
    fastenerPlacement: 'crest',
    screwSpacingMode: 'profile_pitch',
    customScrewSpacing: 10.3,
    screwColor: '#10b981',
    screwsPerCrossing: 5,
    showScrews: true,
    pricingMode: 'per_sheet',
    pricePerSheet: 18.5,
    panelPrice: 5.5,
    purlinPrice: 3.2,
    screwPrice: 0.15,
  });

  const results = calculateRoof(inputs);
  const isRtl = language === 'fa' || language === 'ar';

  // Sync document title with localized app name
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = t.title || 'RoofMaster CAD Pro - 3D CAD & Metal Roofing Calculator';
    }
  }, [language, t.title]);

  // Handle auto-routing of tabs based on wizard step
  useEffect(() => {
    if (currentStep === 4) {
      setActiveTab('report');
    } else if (activeTab === 'report' && currentStep < 4) {
      setActiveTab('3d');
    }
  }, [currentStep]);

  // File Menu Actions
  const handleNewProject = () => {
    if (window.confirm(t.newProjectConfirm)) {
      setInputs({
        roofShape: 'gable',
        roofWidth: 1200,
        roofLength: 600,
        roofPitch: 18,
        panelType: 'prr1',
        panelLength: 350,
        panelWidth: 44.9,
        verticalOverlap: 15,
        horizontalOverlap: 4,
        sideLapRibIndex: 1,
        layoutDirection: 'left_to_right',
        slopeAlignment: 'bottom',
        panelThickness: 0.50,
        ribHeight: 22,
        panelMaterial: 'steel',
        panelFinish: 'polyester',
        customProfilePoints: generateMultiRibPoints(5, 4, 37, 66, 22, 1, 3, 10, 'v_groove'),
        purlinSpacing: 60,
        purlinMaterial: 'metal',
        purlinColor: '#475569',
        framingOrientation: 'grid',
        purlinSizeWidth: 40,
        purlinSizeHeight: 40,
        fastenerPlacement: 'crest',
        screwColor: '#10b981',
        screwsPerCrossing: 5,
        showScrews: true,
        pricingMode: 'per_sheet',
        pricePerSheet: 18.5,
        panelPrice: 5.5,
        purlinPrice: 3.2,
        screwPrice: 0.15,
      });
      setCurrentStep(1);
      setActiveTab('3d');
      setActiveMenu(null);
    }
  };

  const isMac = Boolean(
    window.electronAPI?.isMac ??
      (typeof navigator !== 'undefined' &&
        (navigator.platform?.toUpperCase().includes('MAC') ||
          navigator.userAgent?.toUpperCase().includes('MAC')))
  );

  const handleSaveProject = async () => {
    const projectData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      inputs,
      panelColor,
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    const defaultName = `roofmaster_${inputs.roofShape}_${new Date().toISOString().slice(0, 10)}.roof`;

    if (window.electronAPI?.saveFileDialog) {
      try {
        const res = await window.electronAPI.saveFileDialog(jsonStr, defaultName);
        if (res.success && res.filePath) {
          // Native file save succeeded
        }
      } catch (err) {
        console.error('Failed to save file:', err);
      }
    } else {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setActiveMenu(null);
  };

  const handleOpenClick = async () => {
    setActiveMenu(null);
    if (window.electronAPI?.openFileDialog) {
      try {
        const res = await window.electronAPI.openFileDialog();
        if (res.success && res.data) {
          const parsed = JSON.parse(res.data);
          if (parsed.inputs) {
            setInputs(parsed.inputs);
            if (parsed.panelColor) setPanelColor(parsed.panelColor);
            alert(t.projectLoadedSuccess || 'Project loaded successfully!');
          }
        }
        return;
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    }
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.inputs) {
          setInputs(parsed.inputs);
          if (parsed.panelColor) setPanelColor(parsed.panelColor);
          alert(t.projectLoadedSuccess || 'Project loaded successfully!');
        }
      } catch (err) {
        alert(t.invalidProjectFile || 'Invalid project file format.');
      }
    };
    reader.readAsText(file);
  };

  // Native macOS Menu & IPC Listener
  useEffect(() => {
    if (!window.electronAPI?.onAppAction) return;

    const cleanup = window.electronAPI.onAppAction((action: string) => {
      switch (action) {
        case 'new-project':
          handleNewProject();
          break;
        case 'open-project':
          handleOpenClick();
          break;
        case 'save-project':
        case 'save-project-as':
          handleSaveProject();
          break;
        case 'export-pdf':
          setActiveTab('report');
          setTimeout(() => window.print(), 350);
          break;
        case 'tab-3d':
          setActiveTab('3d');
          break;
        case 'tab-2d':
          setActiveTab('2d');
          break;
        case 'tab-cad':
          setActiveTab('cad');
          break;
        case 'tab-guide':
          setActiveTab('guide');
          break;
        case 'tab-report':
          setActiveTab('report');
          break;
        case 'open-about':
          setShowAboutModal(true);
          break;
        default:
          break;
      }
    });

    return cleanup;
  }, [inputs, panelColor, t]);

  // Global Keyboard Shortcuts (Cmd on macOS, Ctrl on Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSaveProject();
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleOpenClick();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNewProject();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setActiveTab('report');
        setTimeout(() => window.print(), 350);
      } else if (e.key === '1') {
        e.preventDefault();
        setActiveTab('3d');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveTab('2d');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveTab('cad');
      } else if (e.key === '4') {
        e.preventDefault();
        setActiveTab('guide');
      } else if (e.key === '5') {
        e.preventDefault();
        setActiveTab('report');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputs, panelColor]);

  // macOS Drag & Drop File Loader (.roof or .json)
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          if (parsed.inputs) {
            setInputs(parsed.inputs);
            if (parsed.panelColor) setPanelColor(parsed.panelColor);
            alert(t.projectLoadedSuccess || 'Project loaded successfully!');
          }
        } catch {
          alert(t.invalidProjectFile || 'Invalid project file format.');
        }
      };
      reader.readAsText(file);
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [t]);

  const formatNumber = (num: number) => {
    return isRtl ? num.toLocaleString('fa-IR') : num.toString();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case '3d':
        return (
          <Visualizer3D
            inputs={inputs}
            language={language}
            panelColor={panelColor}
            currentStep={currentStep}
          />
        );
      case 'cad':
        return (
          <CADProfileDesigner
            inputs={inputs}
            setInputs={setInputs}
            language={language}
          />
        );
      case '2d':
        return (
          <Blueprint2D
            inputs={inputs}
            language={language}
            panelColor={panelColor}
          />
        );
      case 'guide':
        return <InstallationGuide inputs={inputs} language={language} />;
      case 'report':
        return <ProjectReport inputs={inputs} language={language} panelColor={panelColor} />;
      default:
        return null;
    }
  };

  return (
    <div className={`app-layout ${isRtl ? 'rtl' : ''}`} onClick={() => activeMenu && setActiveMenu(null)}>
      {/* Background Glowing Orbs */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      {/* Hidden File Input for .roof Project Loading */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".roof,.json"
        onChange={handleImportFile}
      />

      {/* Top Desktop Application Software Menu Bar (macOS Native Titlebar) */}
      <header className="macos-titlebar">
        {/* Left / Right Menu Items */}
        <div className="macos-titlebar-left">
          {/* Dedicated safe zone for native macOS red/yellow/green traffic lights */}
          {isMac && <div className="macos-traffic-light-spacer" />}

          {/* App Brand Icon & Title */}
          <div className="macos-brand no-drag">
            <img
              src={appIcon}
              alt="RoofMaster Pro Icon"
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                marginRight: isRtl ? 0 : '0.35rem',
                marginLeft: isRtl ? '0.35rem' : 0,
                objectFit: 'cover'
              }}
            />
            <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', marginRight: isRtl ? 0 : '0.5rem', marginLeft: isRtl ? '0.5rem' : 0, fontSize: '0.82rem' }}>
              RoofMaster CAD Pro
            </span>
          </div>

            {/* File Menu */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="overlay-btn"
                style={{ border: 'none', padding: '0.2rem 0.5rem', background: activeMenu === 'file' ? 'rgba(255,255,255,0.1)' : 'transparent', fontSize: '0.75rem' }}
                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              >
                {t.menuFile}
              </button>
              {activeMenu === 'file' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: isRtl ? 'auto' : 0,
                  right: isRtl ? 0 : 'auto',
                  background: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '180px',
                  padding: '0.35rem 0',
                  zIndex: 30,
                }}>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleNewProject}>
                    <FilePlus size={14} /> {t.menuNew}
                  </button>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleOpenClick}>
                    <Folder size={14} /> {t.menuOpen}
                  </button>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleSaveProject}>
                    <Save size={14} /> {t.menuSave}
                  </button>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.25rem 0' }} />
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setActiveTab('report'); setTimeout(() => window.print(), 300); setActiveMenu(null); }}>
                    <Printer size={14} /> {t.menuExportPdf}
                  </button>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="overlay-btn"
                style={{ border: 'none', padding: '0.2rem 0.5rem', background: activeMenu === 'edit' ? 'rgba(255,255,255,0.1)' : 'transparent', fontSize: '0.75rem' }}
                onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
              >
                {t.menuEdit}
              </button>
              {activeMenu === 'edit' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: isRtl ? 'auto' : 0,
                  right: isRtl ? 0 : 'auto',
                  background: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '180px',
                  padding: '0.35rem 0',
                  zIndex: 30,
                }}>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleNewProject}>
                    <RotateCcw size={14} /> {t.menuReset}
                  </button>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="overlay-btn"
                style={{ border: 'none', padding: '0.2rem 0.5rem', background: activeMenu === 'view' ? 'rgba(255,255,255,0.1)' : 'transparent', fontSize: '0.75rem' }}
                onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
              >
                {t.menuView}
              </button>
              {activeMenu === 'view' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: isRtl ? 'auto' : 0,
                  right: isRtl ? 0 : 'auto',
                  background: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '180px',
                  padding: '0.35rem 0',
                  zIndex: 30,
                }}>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setActiveTab('3d'); setActiveMenu(null); }}>
                    <Box size={14} /> {t.tab3D}
                  </button>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setActiveTab('cad'); setActiveMenu(null); }}>
                    <PenTool size={14} /> {t.tabCAD}
                  </button>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setActiveTab('2d'); setActiveMenu(null); }}>
                    <Compass size={14} /> {t.tab2D}
                  </button>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setActiveTab('guide'); setActiveMenu(null); }}>
                    <Layers size={14} /> {t.tabGuide}
                  </button>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setActiveTab('report'); setActiveMenu(null); }}>
                    <FileText size={14} /> {t.tabReport}
                  </button>
                </div>
              )}
            </div>

            {/* Language Menu */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="overlay-btn"
                style={{
                  border: 'none',
                  padding: '0.2rem 0.5rem',
                  background: activeMenu === 'language' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onClick={() => setActiveMenu(activeMenu === 'language' ? null : 'language')}
              >
                <Globe size={13} color="var(--accent-cyan)" />
                <span>{languageList.find((l) => l.code === language)?.name || 'Language'}</span>
              </button>
              {activeMenu === 'language' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: isRtl ? 'auto' : 0,
                  right: isRtl ? 0 : 'auto',
                  background: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '190px',
                  padding: '0.35rem 0',
                  zIndex: 30,
                }}>
                  {languageList.map((lang) => {
                    const isSelected = lang.code === language;
                    return (
                      <button
                        key={lang.code}
                        className="overlay-btn"
                        style={{
                          width: '100%',
                          textAlign: isRtl ? 'right' : 'left',
                          border: 'none',
                          borderRadius: 0,
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          color: isSelected ? 'var(--accent-cyan)' : '#ffffff'
                        }}
                        onClick={() => {
                          setLanguage(lang.code);
                          setActiveMenu(null);
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                        {isSelected && <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="overlay-btn"
                style={{ border: 'none', padding: '0.2rem 0.5rem', background: activeMenu === 'help' ? 'rgba(255,255,255,0.1)' : 'transparent', fontSize: '0.75rem' }}
                onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
              >
                {t.menuHelp}
              </button>
              {activeMenu === 'help' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: isRtl ? 'auto' : 0,
                  right: isRtl ? 0 : 'auto',
                  background: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '180px',
                  padding: '0.35rem 0',
                  zIndex: 30,
                }}>
                  <button className="overlay-btn" style={{ width: '100%', textAlign: isRtl ? 'right' : 'left', border: 'none', borderRadius: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setShowAboutModal(true); setActiveMenu(null); }}>
                    <Shield size={14} /> {t.menuAbout}
                  </button>
                </div>
              )}
            </div>
        </div>

        {/* Center: Project Title Info */}
        <div className="macos-titlebar-center no-drag">
          <span>
            {inputs.roofShape.toUpperCase()} • {inputs.roofWidth / 100}m × {inputs.roofLength / 100}m ({inputs.roofPitch}°)
          </span>
        </div>

        {/* Right: macOS Status Badge */}
        <div className="no-drag macos-titlebar-right">
          <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.55rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 600 }}>
            ● macOS CAD Engine
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.55rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            v1.0.0
          </span>
        </div>
      </header>

      {/* Main Body: Split Sidebar & Content Viewport */}
      <div className={`app-body ${isRtl ? 'rtl' : ''}`}>
        {/* Stepper Guided Sidebar */}
        <Sidebar
          inputs={inputs}
          setInputs={setInputs}
          language={language}
          setLanguage={setLanguage}
          panelColor={panelColor}
          setPanelColor={setPanelColor}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Main Panel Viewport */}
        <main className="main-content">
          <header className="navbar">
          {/* Navigation Tabs */}
          <ul className="tabs-list">
            <li
              className={`tab-item ${activeTab === '3d' ? 'active' : ''}`}
              onClick={() => setActiveTab('3d')}
            >
              <Box size={16} />
              <span>{t.tab3D}</span>
            </li>
            <li
              className={`tab-item ${activeTab === 'cad' ? 'active' : ''}`}
              onClick={() => setActiveTab('cad')}
            >
              <PenTool size={16} />
              <span>{t.tabCAD}</span>
            </li>
            <li
              className={`tab-item ${activeTab === '2d' ? 'active' : ''}`}
              onClick={() => setActiveTab('2d')}
            >
              <Compass size={16} />
              <span>{t.tab2D}</span>
            </li>
            <li
              className={`tab-item ${activeTab === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              <Layers size={16} />
              <span>{t.tabGuide}</span>
            </li>
            <li
              className={`tab-item ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              <FileText size={16} />
              <span>{t.tabReport}</span>
            </li>
          </ul>

          {/* Quick Metrics Bar */}
          <div className="header-metrics">
            {activeTab !== 'guide' && (
              <div className="metric-pill">
                <span className="metric-pill-label">{t.panelQuantity}:</span>
                <span className="metric-pill-value" style={{ color: 'var(--accent-primary)' }}>
                  {formatNumber(results.totalPanels)} {t.unitPcs}
                </span>
              </div>
            )}

            <div className="metric-pill">
              <span className="metric-pill-label">{t.totalArea}:</span>
              <span className="metric-pill-value" style={{ color: 'var(--accent-emerald)' }}>
                {formatNumber(Math.round(results.totalArea))} {t.unitMeter}²
              </span>
            </div>

            <div className="metric-pill">
              <span className="metric-pill-label">{t.totalPurlinLength}:</span>
              <span className="metric-pill-value" style={{ color: 'var(--accent-cyan)' }}>
                {formatNumber(Math.round(results.purlinTotalLength))} {t.unitMeter}
              </span>
            </div>
          </div>
        </header>

        {/* Tab Content Rendering Viewport */}
        <div className="tab-content-panel">
          {renderTabContent()}
        </div>
      </main>
    </div>

      {/* About Modal Dialog */}
      {showAboutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid var(--border-color-glow)',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            position: 'relative',
            color: '#ffffff',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <img
                src={appIcon}
                alt="App Logo"
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '16px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  marginBottom: '0.75rem',
                  objectFit: 'cover'
                }}
              />
              <h2 className="brand-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>{t.aboutTitle || 'RoofMaster CAD Pro'}</h2>
              <span style={{ fontSize: '0.8rem', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '12px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                v1.0.0 (Windows & macOS Pro Edition)
              </span>
            </div>

            {/* Developer / Creator Credit Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t.developedBy || 'Created & Developed by:'}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>PooriaR</span>
                    <Sparkles size={14} style={{ color: '#fbbf24' }} />
                  </div>
                </div>
              </div>

              <a
                href="mailto:pooriar@gmail.com"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  color: 'var(--accent-cyan)',
                  textDecoration: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                target="_blank"
                rel="noreferrer"
                title="Send Email to PooriaR"
              >
                <Mail size={14} />
                <span>pooriar@gmail.com</span>
              </a>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.25rem', textAlign: 'center' }}>
              {t.aboutDesc}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.5rem' }}>
                {t.aboutKeyFeatures}
              </strong>
              <ul style={{ paddingLeft: isRtl ? 0 : '1.2rem', paddingRight: isRtl ? '1.2rem' : 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--text-muted)' }}>
                <li>{t.aboutFeature1}</li>
                <li>{t.aboutFeature2}</li>
                <li>{t.aboutFeature3}</li>
                <li>{t.aboutFeature4}</li>
                <li>{t.aboutFeature5}</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <span>{t.aboutBuildDate}</span>
              <button
                type="button"
                className="report-btn"
                onClick={() => setShowAboutModal(false)}
                style={{ padding: '0.4rem 1.2rem', fontSize: '0.8rem' }}
              >
                {t.aboutClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
