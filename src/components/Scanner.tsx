import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, Loader2, Type, CheckCircle, RotateCcw, TrendingUp, Syringe } from 'lucide-react';
import { analyzeImageWithGemini, analyzeTextWithGemini } from '../lib/gemini';
import type { GeminiResult, GlycemicIndex } from '../lib/gemini';
import { compressImage, MAX_FILE_SIZE } from '../lib/imageUtils';
import { detectCategory, CATEGORY_CONFIG } from '../lib/categories';
import type { MealCategory } from '../lib/categories';
import type { InsulinSettings } from '../App';
import { useToastContext } from '../contexts/ToastContext';

interface ScannerProps {
  apiKey: string | null;
  onScanResult: (carbs: number, details: string, glycemicIndex: GlycemicIndex, category: MealCategory) => void;
  insulinSettings: InsulinSettings;
}

const GI_COLORS: Record<GlycemicIndex, string> = {
  'Bas':   '#10B981',
  'Moyen': '#F59E0B',
  'Élevé': '#EF4444',
};
const GI_LABELS: Record<GlycemicIndex, string> = {
  'Bas':   'Index Glycémique Bas',
  'Moyen': 'Index Glycémique Moyen',
  'Élevé': 'Index Glycémique Élevé',
};

const CATEGORIES: MealCategory[] = ['petit-déjeuner', 'déjeuner', 'dîner', 'collation'];
const MIN_CALL_INTERVAL_MS = 2000;

function calcInsulin(carbs: number, currentGlucose: number, s: InsulinSettings): number {
  return Math.max(0, Math.round((carbs / s.insulinRatio + (currentGlucose - s.targetGlucose) / s.correctionFactor) * 10) / 10);
}

const Scanner: React.FC<ScannerProps> = ({ apiKey, onScanResult, insulinSettings }) => {
  const addToast = useToastContext();

  const [mode, setMode]               = useState<'image' | 'text'>('image');
  const [loading, setLoading]         = useState(false);
  const [textInput, setTextInput]     = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult]   = useState<GeminiResult | null>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [category, setCategory]       = useState<MealCategory>('collation');
  const [currentGlucose, setCurrentGlucose] = useState('');

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const lastCallRef   = useRef<number>(0);
  const previewUrlRef = useRef<string | null>(null); // object URL pour le preview

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastCallRef.current < MIN_CALL_INTERVAL_MS) {
      addToast('Patientez quelques secondes avant une nouvelle analyse.', 'warning');
      return false;
    }
    lastCallRef.current = now;
    return true;
  }, [addToast]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('Format non supporté. Utilisez une image (JPG, PNG, WEBP).', 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addToast('Image trop grande (max 10 Mo). Compressez-la avant d\'analyser.', 'warning');
      return;
    }
    if (!checkRateLimit()) return;

    // Utiliser un object URL pour le preview (évite de stocker du base64 en state)
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const objUrl = URL.createObjectURL(file);
    previewUrlRef.current = objUrl;
    setImagePreview(objUrl);

    setLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror   = () => reject(new Error('Lecture du fichier échouée'));
        reader.readAsDataURL(file);
      });

      // Compression avant envoi à l'API
      const { data: compressed, mimeType } = await compressImage(base64);

      const result = await analyzeImageWithGemini(compressed, mimeType, apiKey!);
      setScanResult(result);
      setCategory(detectCategory(new Date()));
      setCurrentGlucose('');
    } catch (err) {
      addToast('Analyse échouée. Vérifiez votre clé API et votre connexion.', 'error');
      setImagePreview(null);
      if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    } finally {
      setLoading(false);
    }
  }, [apiKey, addToast, checkRateLimit]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const runTextAnalysis = async () => {
    if (!apiKey || !textInput.trim()) return;
    if (!checkRateLimit()) return;
    setLoading(true);
    try {
      const result = await analyzeTextWithGemini(textInput, apiKey);
      setScanResult(result);
      setCategory(detectCategory(new Date()));
      setCurrentGlucose('');
    } catch {
      addToast('Analyse échouée. Vérifiez votre clé API et votre connexion.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!scanResult) return;
    onScanResult(scanResult.totalCarbs, scanResult.details, scanResult.glycemicIndex, category);
  };

  const handleReset = () => {
    setScanResult(null);
    setTextInput('');
    setCurrentGlucose('');
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── VUE RÉSULTAT ── */
  if (scanResult) {
    const giColor    = GI_COLORS[scanResult.glycemicIndex];
    const glucoseVal = parseFloat(currentGlucose);
    const insulinDose = insulinSettings.enabled && !isNaN(glucoseVal) && glucoseVal > 0
      ? calcInsulin(scanResult.totalCarbs, glucoseVal, insulinSettings)
      : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem', display: 'block' }} />
          <h2 style={{ color: 'var(--primary)', marginBottom: '0.25rem' }}>Analyse terminée</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Vérifiez les résultats avant de sauvegarder
          </p>

          <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '0.875rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '3.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{scanResult.totalCarbs}g</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>de glucides estimés</div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '24px', background: `${giColor}18`, border: `1px solid ${giColor}44`, color: giColor, fontWeight: 700, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            <TrendingUp size={16} />{GI_LABELS[scanResult.glycemicIndex]}
          </div>

          <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Détail des ingrédients</p>
            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{scanResult.details}</p>
          </div>
        </div>

        {/* Catégorie */}
        <div className="glass-panel">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 Catégorie du repas</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const isActive = cat === category;
              return (
                <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '0.45rem 0.875rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${isActive ? cfg.color : 'var(--glass-border)'}`, background: isActive ? `${cfg.color}22` : 'transparent', color: isActive ? cfg.color : 'var(--text-muted)', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Détecté automatiquement selon l'heure — modifiable.</p>
        </div>

        {/* Calculateur insuline */}
        {insulinSettings.enabled && (
          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Syringe size={18} style={{ color: 'var(--primary)' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Calculateur de dose</p>
            </div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.375rem' }}>Glycémie actuelle (mmol/L)</label>
            <input type="number" className="input-base" placeholder={`Cible : ${insulinSettings.targetGlucose}`} value={currentGlucose} onChange={e => setCurrentGlucose(e.target.value)} min="1" max="30" step="0.1" style={{ marginBottom: '0.875rem' }} />
            {insulinDose !== null ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{insulinDose}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>unité{insulinDose !== 1 ? 's' : ''} suggérée{insulinDose !== 1 ? 's' : ''}</div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Entrez votre glycémie pour calculer la dose.</p>
            )}
            <p style={{ color: '#F59E0B', fontSize: '0.73rem', marginTop: '0.75rem', lineHeight: 1.4 }}>⚠️ Estimation indicative uniquement — consultez votre équipe médicale.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" style={{ flex: 1 }} onClick={handleReset}><RotateCcw size={17} /> Recommencer</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm}>Sauvegarder</button>
        </div>
      </div>
    );
  }

  /* ── VUE SCANNER ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className={`btn${mode === 'image' ? ' btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setMode('image')}><Camera size={18} /> Photo</button>
        <button className={`btn${mode === 'text' ? ' btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setMode('text')}><Type size={18} /> Texte</button>
      </div>

      <div className="glass-panel" style={{ textAlign: 'center' }}>
        {mode === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
            {imagePreview ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <img src={imagePreview} alt="Aperçu" style={{ width: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover', maxHeight: '260px' }} />
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.58)', borderRadius: 'var(--radius-md)', gap: '0.75rem' }}>
                    <Loader2 size={44} style={{ color: 'white' }} className="spin" />
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>Analyse en cours...</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} style={{ width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDragging ? 'rgba(16,185,129,0.12)' : 'var(--glass-bg)', border: `2px dashed ${isDragging ? 'var(--primary-dark)' : 'var(--primary)'}`, cursor: 'pointer', transition: 'var(--transition)', transform: isDragging ? 'scale(1.06)' : 'scale(1)' }}>
                  <ImagePlus size={44} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 style={{ color: 'var(--primary)', margin: 0 }}>Photo ou Glisser-Déposer</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Faites glisser une image ici ou cliquez pour choisir</p>
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}><Camera size={17} /> Choisir une photo</button>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageCapture} />
              </>
            )}
          </div>
        )}

        {mode === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', textAlign: 'left', margin: 0 }}>Décrivez votre repas</h3>
            <textarea
              className="input-base"
              placeholder="Ex: 200g de riz blanc, une pomme, un yaourt nature..."
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              disabled={loading}
              maxLength={500}
              style={{ minHeight: '120px' }}
            />
            <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-0.5rem' }}>
              {textInput.length}/500
            </div>
            <button className="btn btn-primary" disabled={!textInput.trim() || loading || !apiKey} onClick={runTextAnalysis}>
              {loading ? <><Loader2 size={18} className="spin" /> Analyse en cours...</> : 'Calculer les glucides'}
            </button>
          </div>
        )}

        {!apiKey && (
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.875rem' }}>
            Veuillez configurer votre clé API dans les paramètres pour utiliser le scanner.
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
