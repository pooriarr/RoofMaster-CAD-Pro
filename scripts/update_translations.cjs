const fs = require('fs');
const path = require('path');

const additionalKeys = {
  en: {
    invoiceTaxNote: 'Net subtotal excludes regional VAT and local jobsite delivery charges.',
    engineerStampBox: '[ Structural Engineer Stamp & Signature Box ]',
    clientStampBox: '[ Client Approval & Acceptance Stamp ]',
    defaultClientName: 'Aria Construction & Engineering Group',
    defaultEngineerName: 'Senior Structural CAD Engineer',
    defaultProjectLocation: 'Munich / Berlin - Project Zone A4',
    invoiceWatermarkOfficial: 'OFFICIAL TECHNICAL SPECIFICATION',
    blueprintLayoutSchematic: '2D Installation Layout Schematic',
    blueprintLayoutDesc: 'Sequential sheet laying matrix, purlin framing grid, and fastener placement map.',
    startInstallation: 'START #1',
  },
  fa: {
    invoiceTaxNote: 'مبالغ فوق خالص بوده و شامل مالیات بر ارزش افزوده و هزینه حمل کارگاهی نمی‌باشد.',
    engineerStampBox: '[ محل مهر نظام مهندسی و امضای ناظر ]',
    clientStampBox: '[ محل تایید، امضا و مهر کارفرما ]',
    defaultClientName: 'شرکت ساختمانی و توسعه سازه آریا',
    defaultEngineerName: 'مهندس محاسب و ناظر ارشد سازه',
    defaultProjectLocation: 'تهران، لواسان، پروژه ویلایی کد ۱۰۲',
    invoiceWatermarkOfficial: 'مشخصات فنی و اجرایی رسمی',
    blueprintLayoutSchematic: 'نقشه اجرایی و چیدمان دوبعدی (Installation Blueprint)',
    blueprintLayoutDesc: 'ماتریس شماره‌گذاری ترتیبی ورق‌ها، شبکه قوطی‌کشی زیرسازی و نقشه توزیع پیچ‌ها.',
    startInstallation: 'شروع چیدمان #۱',
  },
  de: {
    invoiceTaxNote: 'Nettobetrag exkl. regionaler MwSt. und Baustellen-Lieferkosten.',
    engineerStampBox: '[ Stempel- & Unterschriftsfeld Tragwerksplaner ]',
    clientStampBox: '[ Stempel- & Unterschriftsfeld Bauherr/Auftraggeber ]',
    defaultClientName: 'Aria Bau- und Ingenieurgruppe GmbH',
    defaultEngineerName: 'Leitender Tragwerksplaner CAD',
    defaultProjectLocation: 'München / Berlin - Gewerbepark Zone B',
    invoiceWatermarkOfficial: 'OFFIZIELLE TECHNISCHE SPEZIFIKATION',
    blueprintLayoutSchematic: '2D-Verlegeplan & Montageschema',
    blueprintLayoutDesc: 'Sequenzielle Plattenverlegematrix, Pfettengitter und Schraubenverteilung.',
    startInstallation: 'VERLEGEBEGINN #1',
  },
  fr: {
    invoiceTaxNote: 'Montant net hors TVA régionale et frais de livraison sur chantier.',
    engineerStampBox: '[ Cadre pour Sceau et Signature de l’Ingénieur ]',
    clientStampBox: '[ Cadre pour Approbation et Visa du Client ]',
    defaultClientName: 'Groupe Aria Bâtiment et Ingénierie',
    defaultEngineerName: 'Ingénieur Structure & Calcul CAD Senior',
    defaultProjectLocation: 'Paris / Lyon - Parc d’Activités Zone B',
    invoiceWatermarkOfficial: 'SPÉCIFICATION TECHNIQUE OFFICIELLE',
    blueprintLayoutSchematic: 'Schéma 2D d’Implantation et de Pose',
    blueprintLayoutDesc: 'Matrice de pose séquentielle des tôles, quadrillage des pannes et plan de vissage.',
    startInstallation: 'DÉBUT DE POSE #1',
  },
  es: {
    invoiceTaxNote: 'Importe neto sin IVA regional ni gastos de entrega en obra.',
    engineerStampBox: '[ Espacio para Sello y Firma del Ingeniero ]',
    clientStampBox: '[ Espacio para Conformidad y Firma del Cliente ]',
    defaultClientName: 'Grupo de Construcción e Ingeniería Aria',
    defaultEngineerName: 'Ingeniero Estructural CAD Senior',
    defaultProjectLocation: 'Madrid / Barcelona - Parque Industrial Zona B',
    invoiceWatermarkOfficial: 'ESPECIFICACIÓN TÉCNICA OFICIAL',
    blueprintLayoutSchematic: 'Esquema de Montaje y Colocación 2D',
    blueprintLayoutDesc: 'Matriz secuencial de colocación de paneles, red de correas y mapa de tornillería.',
    startInstallation: 'INICIO DE MONTAJE #1',
  },
  it: {
    invoiceTaxNote: 'Importo netto escluso IVA regionale e spese di trasporto in cantiere.',
    engineerStampBox: '[ Spazio Timbro e Firma dell’Ingegnere ]',
    clientStampBox: '[ Spazio Approvazione e Timbro del Cliente ]',
    defaultClientName: 'Gruppo Aria Edilizia e Ingegneria',
    defaultEngineerName: 'Ingegnere Strutturista Senior CAD',
    defaultProjectLocation: 'Milano / Roma - Polo Industriale Zona B',
    invoiceWatermarkOfficial: 'SPECIFICA TECNICA UFFICIALE',
    blueprintLayoutSchematic: 'Schema 2D di Posa e Montaggio',
    blueprintLayoutDesc: 'Matrice sequenziale di posa lamiere, griglia arcarecci e mappa fissaggi.',
    startInstallation: 'INIZIO POSA #1',
  },
  tr: {
    invoiceTaxNote: 'Net tutar bölgesel KDV ve şantiye nakliye ücretlerini içermez.',
    engineerStampBox: '[ Statik Proje Mühendisi Kaşe ve İmza Alanı ]',
    clientStampBox: '[ İşveren Onay ve İmza Alanı ]',
    defaultClientName: 'Aria İnşaat ve Mühendislik Grubu',
    defaultEngineerName: 'Kıdemli Statik CAD Proje Mühendisi',
    defaultProjectLocation: 'İstanbul / Ankara - Sanayi Bölgesi B Blok',
    invoiceWatermarkOfficial: 'RESMİ TEKNİK ŞARTNAME',
    blueprintLayoutSchematic: '2D Panel Dizilim ve Montaj Planı',
    blueprintLayoutDesc: 'Sıralı levha dizilim matrisi, aşık karkas ağı ve vida dağıtım haritası.',
    startInstallation: 'DİZİLİM BAŞLANGICI #1',
  },
  ar: {
    invoiceTaxNote: 'المبالغ الصافية لا تشمل ضريبة القيمة المضافة الإقليمية وتكاليف التوصيل للموقع.',
    engineerStampBox: '[ موضع ختم المهندس الإنشائي والتوقيع ]',
    clientStampBox: '[ موضع موافقة وختم العميل / المالك ]',
    defaultClientName: 'مجموعة آريا للإنشاءات الهندسية',
    defaultEngineerName: 'مهندس الحسابات الإنشائية والتصميم الأول',
    defaultProjectLocation: 'دبي / الرياض - المنطقة الصناعية والمستودعات',
    invoiceWatermarkOfficial: 'المواصفات الفنية المعتمدة رسميًا',
    blueprintLayoutSchematic: 'مخطط التركيب والتوزيع ثنائي الأبعاد',
    blueprintLayoutDesc: 'مصفوفة الترتيب التسلسلي للألواح، شبكة المدادات، ومخطط توزيع براغي التثبيت.',
    startInstallation: 'بداية التركيب #١',
  }
};

const scriptPath = path.join(__dirname, 'build_full_translations.cjs');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

const langs = ['en', 'fa', 'de', 'fr', 'es', 'it', 'tr', 'ar'];

for (let i = 0; i < langs.length; i++) {
  const lang = langs[i];
  const keys = additionalKeys[lang];
  const nextLang = langs[i + 1];

  let pattern;
  if (nextLang) {
    pattern = new RegExp(`const ${lang} = \\{([\\s\\S]*?)\\n\\};\\s*\\n\\s*const ${nextLang}`, 'm');
  } else {
    pattern = new RegExp(`const ${lang} = \\{([\\s\\S]*?)\\n\\};\\s*\\n\\s*const fullTranslations`, 'm');
  }

  const match = scriptContent.match(pattern);
  if (match) {
    let body = match[1];
    let addedEntries = [];
    for (const [k, v] of Object.entries(keys)) {
      const sanitized = v.replace(/'/g, "\\'");
      addedEntries.push(`  ${k}: '${sanitized}',`);
    }
    const newBody = body + '\n' + addedEntries.join('\n');
    if (nextLang) {
      scriptContent = scriptContent.replace(pattern, `const ${lang} = {${newBody}\n};\n\nconst ${nextLang}`);
    } else {
      scriptContent = scriptContent.replace(pattern, `const ${lang} = {${newBody}\n};\n\nconst fullTranslations`);
    }
  }
}

fs.writeFileSync(scriptPath, scriptContent, 'utf8');
console.log('Injected report keys to build_full_translations.cjs');
require(scriptPath);
