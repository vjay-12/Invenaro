import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Product } from '../../types/inventory';
import {
  Camera,
  Barcode,
  X,
  AlertCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Plus,
  RefreshCw,
} from 'lucide-react';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
  title = 'Scan Product Barcode',
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>('');
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    barcode?: string;
    productName?: string;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scannedSessionCount, setScannedSessionCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const isCoolingDownRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string>('');
  const feedbackTimeoutRef = useRef<any>(null);

  // Synthesize a POS beep using Web Audio API
  const playBeep = useCallback((success: boolean = true) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 880 : 220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.12 : 0.2));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.12 : 0.2));
    } catch {
      // Audio context may be restricted before user gesture
    }
  }, [soundEnabled]);

  // Handle barcode match logic and quantity increment
  const handleBarcodeProcess = useCallback((rawCode: string) => {
    const cleanCode = (rawCode || '').trim();
    if (!cleanCode) return;

    // Prevent same barcode from being processed repeatedly within frame bursts
    if (isCoolingDownRef.current && lastScannedCodeRef.current.toLowerCase() === cleanCode.toLowerCase()) {
      return;
    }

    // Activate cooldown debounce
    isCoolingDownRef.current = true;
    lastScannedCodeRef.current = cleanCode;
    setDetectedBarcode(cleanCode);

    // Cooldown window of 1500ms before same code can be re-scanned
    setTimeout(() => {
      isCoolingDownRef.current = false;
    }, 1500);

    // Product lookup using product barcode field, SKU, or id
    const target = cleanCode.toLowerCase();
    const matched = products.find((p) => {
      const b = (p.barcode || '').trim().toLowerCase();
      const s = (p.sku || '').trim().toLowerCase();
      return (b && b === target) || (s && s === target) || (p.id && p.id.toLowerCase() === target);
    });

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    if (matched) {
      playBeep(true);
      onProductScanned(matched);
      setScannedSessionCount((prev) => prev + 1);
      setScanFeedback({
        type: 'success',
        barcode: cleanCode,
        text: `Added: ${matched.name} (${matched.sku})`,
        productName: matched.name,
      });
      feedbackTimeoutRef.current = setTimeout(() => {
        setScanFeedback(null);
      }, 2500);
    } else {
      playBeep(false);
      setScanFeedback({
        type: 'error',
        barcode: cleanCode,
        text: 'Product not found for this barcode.',
      });
      feedbackTimeoutRef.current = setTimeout(() => {
        setScanFeedback(null);
      }, 3000);
    }
  }, [products, onProductScanned, playBeep]);

  // Handle manual submit (keyboard or quick-chip)
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeProcess(manualCode.trim());
    setManualCode('');
  };

  // Setup ZXing continuous decoder when modal opens
  useEffect(() => {
    if (!isOpen) {
      setCameraError(null);
      setScanFeedback(null);
      setIsCameraActive(false);
      setIsInitializing(false);
      setDetectedBarcode(null);
      return;
    }

    let isMounted = true;
    setIsInitializing(true);
    setCameraError(null);

    // Configure 1D and 2D barcode formats with tryHarder for maximum recognition
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.ITF,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const codeReader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 80,
    });

    const startDecoding = async () => {
      // Allow DOM video element to mount
      await new Promise((r) => setTimeout(r, 100));
      if (!isMounted || !videoRef.current) return;

      try {
        let controls: IScannerControls | null = null;
        try {
          // Attempt mobile back camera (environment) first
          controls = await codeReader.decodeFromConstraints(
            {
              video: {
                facingMode: { ideal: 'environment' },
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 },
              },
              audio: false,
            },
            videoRef.current,
            (result) => {
              if (result && isMounted) {
                handleBarcodeProcess(result.getText());
              }
            }
          );
        } catch {
          // Fallback to default available video device (e.g. desktop webcam)
          if (!isMounted || !videoRef.current) return;
          controls = await codeReader.decodeFromConstraints(
            { video: true, audio: false },
            videoRef.current,
            (result) => {
              if (result && isMounted) {
                handleBarcodeProcess(result.getText());
              }
            }
          );
        }

        if (isMounted) {
          controlsRef.current = controls;
          setIsCameraActive(true);
          setIsInitializing(false);
        } else if (controls) {
          controls.stop();
        }
      } catch (err: any) {
        console.warn('ZXing camera decoding initialization error:', err);
        if (isMounted) {
          setIsCameraActive(false);
          setIsInitializing(false);
          const msg = err?.message || String(err);
          if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
            setCameraError('Camera access was denied. Please allow camera permissions or enter barcodes below.');
          } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
            setCameraError('No video camera was detected on this device. You can enter or simulate barcodes below.');
          } else {
            setCameraError('Could not initialize camera scanner. You can enter or simulate barcodes below.');
          }
        }
      }
    };

    startDecoding();

    return () => {
      isMounted = false;
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {}
        controlsRef.current = null;
      }
      if (videoRef.current) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          videoRef.current.srcObject = null;
        } catch {}
      }
    };
  }, [isOpen, handleBarcodeProcess]);

  if (!isOpen) return null;

  // Filter sample demo products with barcodes/SKUs for quick testing
  const demoProducts = products.filter((p) => p.barcode || p.sku).slice(0, 8);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#101622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Barcode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{title}</span>
                {scannedSessionCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    +{scannedSessionCount} scanned
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Point camera at 1D (EAN-13, UPC, Code 128) barcode or shelf tag
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute beep' : 'Enable beep'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-300" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scanner Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* Live Camera Viewfinder */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video sm:aspect-[4/3] flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Scanning active indicator pill */}
            {isCameraActive && !cameraError && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white text-[11px] font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Scanning...</span>
              </div>
            )}

            {/* Initializing State */}
            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-2 p-4 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-teal-400" />
                <span className="text-xs font-medium">Starting barcode camera scanner...</span>
              </div>
            )}

            {/* Camera Error / Permission Denied */}
            {cameraError && !isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-white gap-2 p-5 text-center">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Camera className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                <span className="text-[11px] text-teal-400 font-semibold">
                  You can enter or simulate barcodes using the inputs below.
                </span>
              </div>
            )}

            {/* Target Reticle Overlay when camera is active */}
            {isCameraActive && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-36 border-2 border-teal-400/60 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                  <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-teal-300 rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-teal-300 rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-teal-300 rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-teal-300 rounded-br-sm" />
                  {/* Subtle red laser scanning beam */}
                  <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Real-time Status / Result Alert */}
          {scanFeedback && (
            <div
              className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-150 ${
                scanFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {scanFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <div className="flex-1 truncate">
                {scanFeedback.barcode && (
                  <span className="font-mono mr-1.5 opacity-80">[{scanFeedback.barcode}]</span>
                )}
                <span>{scanFeedback.text}</span>
              </div>
            </div>
          )}

          {/* Manual Entry or Desktop Barcode Input */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Manual Barcode or SKU Lookup:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 890000000009 or ORG-RIC-001"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Quick Demo Catalog Barcodes */}
          {demoProducts.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Demo Barcode Catalog (Click to test):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {demoProducts.map((p) => {
                  const displayCode = p.barcode || p.sku;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleBarcodeProcess(displayCode)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-300 dark:hover:border-teal-700 border border-slate-200 dark:border-slate-700/60 transition-colors"
                      title={`Simulate scan for ${p.name}`}
                    >
                      <Barcode className="h-3 w-3 text-slate-400" />
                      <span className="font-mono font-semibold">{displayCode}</span>
                      <span className="text-slate-400">·</span>
                      <span className="max-w-[120px] truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              {scannedSessionCount === 0
                ? 'Ready to scan'
                : `${scannedSessionCount} item${scannedSessionCount > 1 ? 's' : ''} added to order`}
            </span>
            {detectedBarcode && (
              <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                Last: {detectedBarcode}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
