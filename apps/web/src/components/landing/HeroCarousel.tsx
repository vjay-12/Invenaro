import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IconChevronLeft, IconChevronRight } from '../icons';

const IconPause: React.FC<{ className?: string }> = ({ className = 'w-2.5 h-2.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

export interface HeroSlide {
  id: string;
  src: string;
  title: string;
  category: string;
  description: string;
  tag: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'dock-logistics',
    src: '/sample-images/dock-logistics.png',
    title: 'Multi-Dock Freight Logistics',
    category: 'Inbound & Outbound Bay Operations',
    description: 'Automated dock bay scheduling, container cross-docking, and receiving verification.',
    tag: 'Bay 01 - 03 Active',
  },
  {
    id: 'analytics-console',
    src: '/sample-images/analytics-console.png',
    title: 'Real-Time Enterprise Telemetry',
    category: 'Financial Stock Valuation',
    description: 'Instant ₹ INR inventory valuation, movement velocity, and multi-location telemetry.',
    tag: 'Live ₹2.48 Cr Valuation',
  },
  {
    id: 'warehouse-aisle',
    src: '/sample-images/warehouse-aisle.png',
    title: 'High-Density Rack & Aisle Topology',
    category: 'Storage Optimization',
    description: 'Precision bin mapping (A1, A2, B1, B2) with optimized putaway routing.',
    tag: 'Aisle A & B Active',
  },
  {
    id: 'enterprise-network',
    src: '/sample-images/enterprise-network.png',
    title: 'Synchronized Multi-City Operations',
    category: 'Multi-Location Hubs',
    description: 'Unified inventory across Mumbai, Delhi, Bengaluru, Chennai & Hyderabad.',
    tag: '6 Hubs Connected',
  },
  {
    id: 'mobile-picking',
    src: '/sample-images/mobile-picking.png',
    title: 'Handheld Mobile Picking Execution',
    category: 'Paperless Warehouse',
    description: 'Instant digital pick lists, batch routing, and handheld verification on the floor.',
    tag: 'Digital Pick Slip',
  },
  {
    id: 'barcode-scanning',
    src: '/sample-images/barcode-scanning.png',
    title: 'Precision Barcode & Batch Verification',
    category: 'Traceability & Quality Control',
    description: 'Instant barcode scanning, batch tracking, and zero-error receiving validation.',
    tag: 'Verified Match',
  },
  {
    id: 'pallet-staging',
    src: '/sample-images/pallet-staging.png',
    title: 'Pallet Allocation & Quarantine Routing',
    category: 'Inbound Ingest Staging',
    description: 'Automated pallet serialization, bay routing, and tax classification staging verification.',
    tag: 'EPAL Certified Staging',
  },
  {
    id: 'material-handling',
    src: '/sample-images/material-handling.png',
    title: 'Forklift Fleet & Heavy Material Logistics',
    category: 'Floor Safety & Dispatch',
    description: 'Automated weight compliance, heavy lift tracking, and dock-to-rack transit.',
    tag: 'Fleet Telematics Active',
  },
];

interface HeroCarouselProps {
  intervalMs?: number;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ intervalMs = 4200 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    setProgress(0);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  // Auto-scroll slideshow timer with progress bar sync
  useEffect(() => {
    if (isPaused) return;

    const stepMs = 50;
    const progressIncrement = (stepMs / intervalMs) * 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + progressIncrement;
      });
    }, stepMs);

    return () => clearInterval(progressTimer);
  }, [isPaused, intervalMs, nextSlide]);

  // Touch swipe support for tablets/mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartXRef.current = null;
  };

  const currentSlide = HERO_SLIDES[currentIndex];

  return (
    <div
      className="relative w-full max-w-[560px] lg:max-w-none mx-auto group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main architectural frame */}
      <div className="relative rounded-2xl lg:rounded-3xl border border-slate-300/80 dark:border-slate-700/60 bg-white dark:bg-[#090E17]/95 p-2 sm:p-2.5 shadow-xl shadow-slate-300/50 dark:shadow-2xl dark:shadow-slate-950/80 transition-all backdrop-blur-sm">
        {/* Inner viewport with 16:10 aspect ratio and minimum height guarantee */}
        <div className="relative w-full min-h-[220px] sm:min-h-[260px] aspect-[16/10.5] sm:aspect-[16/10] rounded-xl lg:rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
          {/* Slides stack */}
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  isActive
                    ? 'opacity-100 scale-100 z-10'
                    : 'opacity-0 scale-[1.03] pointer-events-none z-0'
                }`}
                aria-hidden={!isActive}
              >
                <img
                  src={slide.src}
                  alt={slide.title}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover object-center transform will-change-transform"
                />

                {/* Subtle vignette layer */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70 dark:from-black/40 dark:via-transparent dark:to-black/80 pointer-events-none" />
              </div>
            );
          })}

          {/* Top Info Badges */}
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-[#090E17]/90 text-[10px] font-mono font-semibold text-teal-700 dark:text-teal-300 shadow-sm backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-sm bg-teal-500 dark:bg-teal-400 shrink-0" />
              <span className="truncate">{currentSlide.tag}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {isPaused && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-300 dark:border-slate-700 bg-amber-50/95 dark:bg-slate-900/90 text-[10px] text-amber-800 dark:text-amber-300 font-mono shadow-sm backdrop-blur-md">
                  <IconPause className="w-2.5 h-2.5" />
                  <span>Paused</span>
                </span>
              )}
              <span className="px-2 py-1 rounded-md border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-[#090E17]/90 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-md">
                {String(currentIndex + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Bottom Gradient Scrim & Captions */}
          <div className="absolute bottom-0 inset-x-0 z-20 p-3.5 sm:p-4 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent dark:from-[#090E17] dark:via-[#090E17]/85 dark:to-transparent pt-10 pointer-events-none">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-300 dark:text-teal-400 font-mono mb-0.5">
              {currentSlide.category}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug drop-shadow-sm">
              {currentSlide.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-200 dark:text-slate-300/90 leading-normal mt-0.5 line-clamp-1">
              {currentSlide.description}
            </p>
          </div>

          {/* Manual Chevron Buttons (visible on hover) */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 p-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/90 shadow-md dark:bg-[#090E17]/90 dark:hover:bg-[#090E17] dark:text-white/70 dark:hover:text-white dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-sm"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 p-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/90 shadow-md dark:bg-[#090E17]/90 dark:hover:bg-[#090E17] dark:text-white/70 dark:hover:text-white dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-sm"
          >
            <IconChevronRight className="w-4 h-4" />
          </button>

          {/* Subtle auto-scroll countdown progress bar along the very bottom of viewport */}
          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-300/80 dark:bg-slate-800/80 z-30">
            <div
              className="h-full bg-teal-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Carousel Pagination Navigation Bar Below Card */}
        <div className="flex items-center justify-between px-2 pt-2.5 pb-0.5">
          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Slideshow pagination">
            {HERO_SLIDES.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'w-6 bg-teal-600 dark:bg-teal-400 shadow-sm shadow-teal-600/30 dark:shadow-teal-400/50'
                      : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-500'
                  }`}
                />
              );
            })}
          </div>

          {/* Auto-scroll Status Hint */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400/80" />
            <span>Auto-rotating &bull; Hover to pause</span>
          </div>
        </div>
      </div>
    </div>
  );
};
