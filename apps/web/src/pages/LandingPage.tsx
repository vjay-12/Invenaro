import React, { useState, useEffect, useRef } from 'react';
import {
  IconArrowLeftRight,
  IconSlidersHorizontal,
  IconFileText,
  IconShieldCheck,
  IconKey,
  IconClock,
  IconCheck,
  IconArrowRight,
  IconAlertCircle,
  IconCalculator,
  IconMessageCircle,
  IconWarehouse,
  IconCheckCircle2,
  IconBot,
  IconFileDown,
  IconBarChart3,
  IconSun,
  IconMoon,
} from '../components/icons';
import { useTheme } from '../context/ThemeContext';
import { PageMeta } from '../components/common/PageMeta';
import { api } from '../services/api';
import { Login } from './Login';
import {
  INDUSTRIES_LIST,
  INDIAN_STATES_LIST,
  SUPPORTED_COUNTRIES,
  US_STATES_LIST,
  EU_VAT_RATES,
  US_STATE_SALES_TAX_RATES,
} from '../data/platformConstants';
import { HeroCarousel } from '../components/landing/HeroCarousel';
import { TaxEngineCarousel } from '../components/landing/TaxEngineCarousel';

// --- Sample Questions & Answers for AI Copilot Simulator ---
const AI_CONVERSATIONS = [
  {
    question: "Which items in North Depot are currently below our minimum reorder safety threshold?",
    items: [
      { name: "Precision Copper Busbar 100A", current: 50, min: 100, short: 50 },
      { name: "Heat Shrink Tubing 12mm Black", current: 12, min: 40, short: 28 },
    ],
    suggestion: "You have 350 units of Copper Busbars in Central Hub. Transferring 60 units will restore safety stock without purchasing.",
    actionLabel: "Create Inter-Hub Transfer Draft",
  },
  {
    question: "What were our top 3 highest-turnover SKUs across all warehouses this week?",
    items: [
      { name: "Industrial Steel Bearings 608-2RS", current: 1420, dispatched: 380, trend: "+24% vs last week" },
      { name: "Fiber Optic Patch Cord SC-LC 5m", current: 640, dispatched: 195, trend: "+12% vs last week" },
      { name: "Modular DIN Rail Terminal Block", current: 2200, dispatched: 510, trend: "+18% vs last week" },
    ],
    suggestion: "Bearing demand is peaking in Bangalore Central Hub. Consider replenishing batch buffer before Friday.",
    actionLabel: "View Full Velocity Report",
  },
  {
    question: "Where is batch lot BATCH-2026-04A stored and what is its expiry date?",
    items: [
      { name: "Thermal Conductive Grease 50g", lot: "BATCH-2026-04A", bin: "Central Hub - Aisle 2, Bin C-09", expiry: "18 Months Remaining" },
    ],
    suggestion: "85 units allocated across 2 pending sales orders. 115 units unreserved and ready for dispatch.",
    actionLabel: "Open SKU Lot Details",
  },
];

export const LandingPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // --- Scroll Progress & Storytelling State ---
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  // --- Quotation Calculator State (Step 1) ---
  const [warehouses, setWarehouses] = useState<string>('1-2');
  const [skus, setSkus] = useState<string>('< 500');
  const [orders, setOrders] = useState<string>('< 1,000');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team'
  ]);

  // --- Quotation & Lead Form State (Step 2) ---
  const [quoteStep, setQuoteStep] = useState<'calculator' | 'contact' | 'submitted'>('calculator');
  const [currency, setCurrency] = useState<'INR' | 'EUR' | 'USD'>('INR');
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES_LIST[0]);
  const [location, setLocation] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedLeadData, setSubmittedLeadData] = useState<any | null>(null);

  // --- Hero Walkthrough Sequence State ---
  const [heroActiveTab, setHeroActiveTab] = useState<number>(0);
  const [heroAutoPlay, setHeroAutoPlay] = useState<boolean>(true);

  // --- 1. Movement Ledger Live Animated Feed State ---
  const [ledgerEntries, setLedgerEntries] = useState<Array<{
    id: string;
    type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
    title: string;
    detail: string;
    actor: string;
    time: string;
    badge: string;
  }>>([
    {
      id: 'L-101',
      type: 'IN',
      title: 'Purchase Order Received (#PO-4819)',
      detail: '+300 units Bearings added to Central Hub',
      actor: 'Ramesh K. (Receiving)',
      time: 'Just now',
      badge: 'Goods Receipt',
    },
    {
      id: 'L-102',
      type: 'OUT',
      title: 'Sales Order Dispatched (#SO-9204)',
      detail: '-120 units Bearings shipped to Tata Power',
      actor: 'Priya S. (Dispatch)',
      time: '2 mins ago',
      badge: 'Order Shipped',
    },
    {
      id: 'L-103',
      type: 'TRANSFER',
      title: 'Inter-Hub Stock Transit (#TR-338)',
      detail: '50 units Busbars moved from Bangalore to Delhi',
      actor: 'Sunil M. (Operations)',
      time: '7 mins ago',
      badge: 'In Transit',
    },
    {
      id: 'L-104',
      type: 'ADJUST',
      title: 'Cycle Count Verification (#CY-092)',
      detail: '-1 unit Fiber Cable damaged in bin aisle 3',
      actor: 'Vikram D. (Supervisor)',
      time: '18 mins ago',
      badge: 'Manager Signoff',
    },
  ]);

  // --- 2. Multi-Warehouse Interactive Map & Transfer State ---
  const [whCentralStock, setWhCentralStock] = useState(920);
  const [whNorthStock, setWhNorthStock] = useState(500);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // --- 4. Reports & Valuation Self-Drawing Chart State & Dynamic Currency Sync ---
  const [activeTaxSlide, setActiveTaxSlide] = useState<number>(0);
  const [chartMetric, setChartMetric] = useState<'valuation' | 'volume'>('valuation');
  const [chartTimeframe, setChartTimeframe] = useState<'7d' | '30d'>('7d');
  const [chartDrawn, setChartDrawn] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const REPORT_CURRENCY_DATA = [
    // Slide 0: India GST (INR ₹)
    {
      regime: 'GST',
      currencyCode: 'INR',
      symbol: '₹',
      totalVal: '₹48,24,600',
      growth: '+8.4% This Month',
      badgeLabel: 'INR (₹) · GST Regime',
      bars: [
        { day: 'Mon', x: 35, hVal: 65, hVol: 45, shortVal: '₹34.2L', fullVal: '₹34,20,000', vol: '28,400 Units', pct: '+2.1% Day' },
        { day: 'Tue', x: 75, hVal: 80, hVol: 70, shortVal: '₹39.5L', fullVal: '₹39,50,000', vol: '35,200 Units', pct: '+5.4% Day' },
        { day: 'Wed', x: 115, hVal: 55, hVol: 35, shortVal: '₹31.1L', fullVal: '₹31,10,000', vol: '22,900 Units', pct: '-1.8% Day' },
        { day: 'Thu', x: 155, hVal: 95, hVol: 85, shortVal: '₹44.8L', fullVal: '₹44,80,000', vol: '39,100 Units', pct: '+8.2% Day' },
        { day: 'Fri', x: 195, hVal: 70, hVol: 60, shortVal: '₹36.4L', fullVal: '₹36,40,000', vol: '31,400 Units', pct: '+3.0% Day' },
        { day: 'Sat', x: 235, hVal: 88, hVol: 75, shortVal: '₹42.9L', fullVal: '₹42,90,000', vol: '37,800 Units', pct: '+6.5% Day' },
        { day: 'Sun', x: 275, hVal: 105, hVol: 95, shortVal: '₹48.2L', fullVal: '₹48,24,600', vol: '42,900 Units', pct: '+8.4% Peak' },
      ],
    },
    // Slide 1: EU VAT (EUR €)
    {
      regime: 'VAT',
      currencyCode: 'EUR',
      symbol: '€',
      totalVal: '€482,460',
      growth: '+8.4% This Month',
      badgeLabel: 'EUR (€) · VAT Regime',
      bars: [
        { day: 'Mon', x: 35, hVal: 65, hVol: 45, shortVal: '€342k', fullVal: '€342,000', vol: '28,400 Units', pct: '+2.1% Day' },
        { day: 'Tue', x: 75, hVal: 80, hVol: 70, shortVal: '€395k', fullVal: '€395,000', vol: '35,200 Units', pct: '+5.4% Day' },
        { day: 'Wed', x: 115, hVal: 55, hVol: 35, shortVal: '€311k', fullVal: '€311,000', vol: '22,900 Units', pct: '-1.8% Day' },
        { day: 'Thu', x: 155, hVal: 95, hVol: 85, shortVal: '€448k', fullVal: '€448,000', vol: '39,100 Units', pct: '+8.2% Day' },
        { day: 'Fri', x: 195, hVal: 70, hVol: 60, shortVal: '€364k', fullVal: '€364,000', vol: '31,400 Units', pct: '+3.0% Day' },
        { day: 'Sat', x: 235, hVal: 88, hVol: 75, shortVal: '€429k', fullVal: '€429,000', vol: '37,800 Units', pct: '+6.5% Day' },
        { day: 'Sun', x: 275, hVal: 105, hVol: 95, shortVal: '€482k', fullVal: '€482,460', vol: '42,900 Units', pct: '+8.4% Peak' },
      ],
    },
    // Slide 2: US Sales Tax (USD $)
    {
      regime: 'SALES_TAX',
      currencyCode: 'USD',
      symbol: '$',
      totalVal: '$524,800',
      growth: '+8.4% This Month',
      badgeLabel: 'USD ($) · Sales Tax Regime',
      bars: [
        { day: 'Mon', x: 35, hVal: 65, hVol: 45, shortVal: '$372k', fullVal: '$372,000', vol: '28,400 Units', pct: '+2.1% Day' },
        { day: 'Tue', x: 75, hVal: 80, hVol: 70, shortVal: '$428k', fullVal: '$428,000', vol: '35,200 Units', pct: '+5.4% Day' },
        { day: 'Wed', x: 115, hVal: 55, hVol: 35, shortVal: '$339k', fullVal: '$339,000', vol: '22,900 Units', pct: '-1.8% Day' },
        { day: 'Thu', x: 155, hVal: 95, hVol: 85, shortVal: '$486k', fullVal: '$486,000', vol: '39,100 Units', pct: '+8.2% Day' },
        { day: 'Fri', x: 195, hVal: 70, hVol: 60, shortVal: '$395k', fullVal: '$395,000', vol: '31,400 Units', pct: '+3.0% Day' },
        { day: 'Sat', x: 235, hVal: 88, hVol: 75, shortVal: '$465k', fullVal: '$465,000', vol: '37,800 Units', pct: '+6.5% Day' },
        { day: 'Sun', x: 275, hVal: 105, hVol: 95, shortVal: '$524k', fullVal: '$524,800', vol: '42,900 Units', pct: '+8.4% Peak' },
      ],
    },
  ];

  const currentReportData = REPORT_CURRENCY_DATA[activeTaxSlide] || REPORT_CURRENCY_DATA[0];

  // --- Interactive Micro-Moment States ---
  const [hoveredFacilityZone, setHoveredFacilityZone] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number | null>(null);

  // --- 5. AI Copilot Typing Simulator State ---
  const [activeCopilotPrompt, setActiveCopilotPrompt] = useState<number>(0);
  const [typedQuestion, setTypedQuestion] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [showCopilotAnswer, setShowCopilotAnswer] = useState<boolean>(false);

  // --- Numeric Count-Up Animated Stats State ---
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [statAccuracyValue, setStatAccuracyValue] = useState(0);
  const [statUptimeValue, setStatUptimeValue] = useState(0);
  const statsSectionRef = useRef<HTMLDivElement | null>(null);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Proximity detection for floating right-side journey navigator
  const [isNavNear, setIsNavNear] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Distance from the right edge of the viewport
      const distFromRight = window.innerWidth - e.clientX;
      const menuCenterY = window.innerHeight / 2;
      const distFromCenterY = Math.abs(e.clientY - menuCenterY);

      // Only expand when cursor is directly hovering near the navigator itself (within 45px of right edge and vertically centered)
      const near = distFromRight < 45 && distFromCenterY < 160;
      setIsNavNear(near);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const isNavExpanded = isNavNear || isNavHovered;

  // Scroll listener for progress bar, active section, and subtle parallax
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalScroll > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (currentScroll / totalScroll) * 100)));
      }

      // Parallax effect on hero background
      if (!prefersReducedMotion) {
        setParallaxY(currentScroll * 0.12);
      }

      // Check if near bottom of page - activate last section
      if (window.innerHeight + currentScroll >= document.documentElement.scrollHeight - 60) {
        setActiveSection('quote-calculator');
        return;
      }

      // Detect active section for journey indicator
      const sections = [
        'hero',
        'how-it-works',
        'warehouse-map',
        'audit-ledger',
        'gst-invoicing',
        'reports-valuation',
        'ai-copilot',
        'trust-security',
        'quote-calculator',
      ];

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.4 && rect.bottom >= window.innerHeight * 0.2) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);

  // Count-up animation using requestAnimationFrame
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsAnimated) {
          setStatsAnimated(true);

          if (prefersReducedMotion) {
            setStatAccuracyValue(100);
            setStatUptimeValue(99.99);
            return;
          }

          const duration = 1400; // ms
          const startTime = performance.now();

          const animateNumbers = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            setStatAccuracyValue(Math.round(ease * 100));
            setStatUptimeValue(Number((ease * 99.9).toFixed(1)));

            if (progress < 1) {
              requestAnimationFrame(animateNumbers);
            } else {
              setStatAccuracyValue(100);
              setStatUptimeValue(99.9);
            }
          };

          requestAnimationFrame(animateNumbers);
        }
      },
      { threshold: 0.2 }
    );

    if (statsSectionRef.current) {
      observer.observe(statsSectionRef.current);
    }
    return () => observer.disconnect();
  }, [statsAnimated, prefersReducedMotion]);

  // Self-drawing chart trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setChartDrawn(true);
        }
      },
      { threshold: 0.25 }
    );
    if (chartRef.current) {
      observer.observe(chartRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Hero walkthrough auto-cycle
  useEffect(() => {
    if (!heroAutoPlay) return;
    const interval = setInterval(() => {
      setHeroActiveTab((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [heroAutoPlay]);

  // AI Copilot typing effect simulator
  useEffect(() => {
    const targetText = AI_CONVERSATIONS[activeCopilotPrompt].question;
    setTypedQuestion('');
    setShowCopilotAnswer(false);
    setIsTyping(true);

    if (prefersReducedMotion) {
      setTypedQuestion(targetText);
      setIsTyping(false);
      setShowCopilotAnswer(true);
      return;
    }

    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < targetText.length) {
        setTypedQuestion(targetText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        // Pause before answer appears
        setTimeout(() => {
          setShowCopilotAnswer(true);
        }, 300);
      }
    }, 28);

    return () => clearInterval(typingInterval);
  }, [activeCopilotPrompt, prefersReducedMotion]);

  // Dynamic Movement Ledger Simulation Action
  const triggerSimulatedEvent = (type: 'IN' | 'OUT' | 'ADJUST') => {
    const randomId = 'L-' + Math.floor(100 + Math.random() * 900);
    let newEntry;

    if (type === 'IN') {
      newEntry = {
        id: randomId,
        type: 'IN' as const,
        title: 'Supplier Receipt Logged (GRN #' + randomId + ')',
        detail: '+50 units Copper Busbars delivered to Central Hub',
        actor: 'Ramesh K. (Receiving)',
        time: 'Just now',
        badge: 'Verified Receipt',
      };
    } else if (type === 'OUT') {
      newEntry = {
        id: randomId,
        type: 'OUT' as const,
        title: 'Sales Order Picked (SO #' + randomId + ')',
        detail: '-25 units Bearings allocated & staged for shipping',
        actor: 'Priya S. (Dispatch)',
        time: 'Just now',
        badge: 'Dispatched',
      };
    } else {
      newEntry = {
        id: randomId,
        type: 'ADJUST' as const,
        title: 'Spot Check Audit (#ADJ-' + randomId + ')',
        detail: 'Bin count verified: 100% matched physical shelf count',
        actor: 'Sunil M. (Operations Lead)',
        time: 'Just now',
        badge: 'Zero Variance',
      };
    }

    setLedgerEntries((prev) => [newEntry, ...prev.slice(0, 4)]);
  };

  // Interactive Multi-Warehouse Inter-Hub Transfer
  const triggerWarehouseTransfer = () => {
    if (isTransferring || whCentralStock < 50) return;
    setIsTransferring(true);
    setTransferSuccess(false);

    setTimeout(() => {
      setWhCentralStock((prev) => prev - 50);
      setWhNorthStock((prev) => prev + 50);
      setIsTransferring(false);
      setTransferSuccess(true);
      setTimeout(() => setTransferSuccess(false), 4000);
    }, 1800);
  };

  const calculateTier = () => {
    if (warehouses === '20+' || skus === '50,000+' || orders === '100,000+') {
      return {
        name: 'Enterprise Fleet Scale',
        tag: 'HIGH CAPACITY',
        desc: 'Built for large distributed distribution hubs, unlimited order volume, and dedicated operations onboarding.',
        sla: '99.99% Uptime Commitment with 24/7 Dedicated Support',
      };
    }
    if (warehouses === '6-20' || skus === '5,000 - 50,000' || orders === '10,000 - 100,000') {
      return {
        name: 'Multi-Facility Growth',
        tag: 'MULTI-LOCATION',
        desc: 'Optimized for multi-warehouse routing, fast-turnover order fulfillment, and automated multi-regime tax invoicing.',
        sla: '99.95% Availability Commitment with Priority Business Support',
      };
    }
    return {
      name: 'Essential Operations',
      tag: 'FAST START',
      desc: 'Complete inventory lifecycle control, tamper-proof activity logging, automated billing, and secure document vault.',
      sla: 'Standard Operational Support with Continuous Automated Backups',
    };
  };

  const currentTier = calculateTier();

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleProceedToContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedModules.length === 0) {
      setSubmissionError('Please select at least one core platform capability.');
      return;
    }
    setSubmissionError(null);
    setQuoteStep('contact');
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !email.trim() || !phone.trim() || !location.trim() || !state.trim() || !pincode.trim()) {
      setSubmissionError('Please fill in all required company, location (City, State, Pincode), and contact fields.');
      return;
    }

    const cleanPincode = pincode.trim();
    if (currency === 'INR' && !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      setPincodeError('Pincode must be a valid 6-digit Indian postal code (e.g. 560001).');
      setSubmissionError('Please enter a valid 6-digit Pincode.');
      return;
    }
    if (currency === 'USD' && !/^[0-9]{5}(-[0-9]{4})?$/.test(cleanPincode)) {
      setPincodeError('ZIP code must be a valid 5-digit US postal code (e.g. 94105).');
      setSubmissionError('Please enter a valid 5-digit US ZIP code.');
      return;
    }
    if (currency === 'EUR' && !/^[A-Za-z0-9 -]{3,10}$/.test(cleanPincode)) {
      setPincodeError('Postal code must be between 3 and 10 alphanumeric characters (e.g. 10115).');
      setSubmissionError('Please enter a valid European postal code.');
      return;
    }
    setPincodeError(null);

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const payload = {
        company_name: companyName.trim(),
        company_code: companyCode.trim() || undefined,
        industry,
        location: location.trim(),
        state: state.trim(),
        pincode: cleanPincode,
        contact_name: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        whatsapp_number: (whatsappNumber.trim() || phone.trim()),
        estimated_warehouses: warehouses,
        estimated_skus: skus,
        estimated_monthly_orders: orders,
        selected_modules: selectedModules,
        tier_estimate: currentTier.name,
        notes: `[Currency: ${currency}] ${notes.trim()}`.trim(),
      };

      const res = await api.submitLeadInquiry(payload);
      setSubmittedLeadData(res);
      setQuoteStep('submitted');
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit quotation request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'hero') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const headerOffset = 66; // height of sticky top bar (64px) + progress bar (2px)
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F7] dark:bg-[#0C1017] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-800 dark:selection:text-teal-300 relative">
      <PageMeta
        title="Invenza - Modern Multi-Warehouse Inventory & Automated Tax Platform"
        description="Run your inventory with zero discrepancies, automated tax invoicing, real-time multi-warehouse tracking, and a tamper-proof audit trail."
      />

      {/* Top Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-slate-200 dark:bg-[#1E2636] z-50">
        <div
          className="h-full bg-teal-400 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Vertical Journey Navigator (Desktop) - Collapsed by default, expands on proximity/hover */}
      <aside
        onMouseEnter={() => setIsNavHovered(true)}
        onMouseLeave={() => setIsNavHovered(false)}
        className={`fixed right-1.5 xl:right-2 2xl:right-3 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-1.5 rounded-2xl bg-white/95 dark:bg-[#131924]/95 backdrop-blur-md border border-slate-200 dark:border-[#1E2636] text-[10px] font-mono shadow-2xl transition-all duration-300 ease-out ${
          isNavExpanded
            ? 'p-2 w-32 border-teal-500/30 ring-1 ring-teal-500/20'
            : 'px-1 py-2 w-8 items-center border-slate-200 dark:border-[#1E2636]/80'
        }`}
        title={!isNavExpanded ? 'Quick Section Navigator' : undefined}
      >
        {[
          { id: 'hero', label: 'Overview' },
          { id: 'how-it-works', label: 'Workflow' },
          { id: 'warehouse-map', label: 'Warehouses' },
          { id: 'audit-ledger', label: 'Live Ledger' },
          { id: 'gst-invoicing', label: 'Tax Engine' },
          { id: 'reports-valuation', label: 'Reports' },
          { id: 'ai-copilot', label: 'AI Copilot' },
          { id: 'trust-security', label: 'Security' },
          { id: 'quote-calculator', label: 'Quotation' },
        ].map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              title={item.label}
              className={`group flex items-center transition-all duration-200 text-left ${
                isNavExpanded
                  ? `px-2.5 py-1.5 w-full gap-2 rounded-lg ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`
                  : `w-6 h-6 justify-center rounded-full p-0 ${
                      isActive
                        ? ''
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`
              }`}
            >
              <span
                className={`rounded-full aspect-square transition-all duration-300 shrink-0 ${
                  isActive
                    ? 'w-2.5 h-2.5 bg-teal-400 ring-2 ring-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.8)]'
                    : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-500 dark:group-hover:bg-slate-400'
                }`}
              />
              <span
                className={`transition-all duration-300 ease-out whitespace-nowrap overflow-hidden ${
                  isNavExpanded
                    ? 'max-w-[100px] opacity-100'
                    : 'max-w-0 opacity-0 w-0 h-0 pointer-events-none'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </aside>

      {/* Top Navigation Bar */}
      <header className="sticky top-0.5 z-40 bg-white/95 dark:bg-[#0C1017]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1E2636]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-16 2xl:pr-12 h-16 flex items-center justify-between">
          <div
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-3 cursor-pointer group select-none"
            title="Invenza Home"
          >
            <img
              src={isDark ? '/invenza-logo-dark.png' : '/invenza-logo-light.png'}
              alt="Invenza"
              className="h-9 w-auto max-w-[170px] object-contain transition-opacity duration-150 group-hover:opacity-90"
              onError={(e) => {
                e.currentTarget.src = isDark ? '/invenza-logo-transparent.png' : '/invenza-logo-cropped.png';
              }}
            />
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
              Operations Suite
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#1E2636] bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 shadow-subtle transition-colors flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? (
                <IconSun className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              ) : (
                <IconMoon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <button
              onClick={() => setIsSignInOpen(true)}
              className="px-4 py-2 rounded-lg bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1E2636] border border-slate-200 dark:border-[#1E2636] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-[0.98] shadow-subtle"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setQuoteStep('calculator');
                scrollToSection('quote-calculator');
              }}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-xs font-bold text-slate-950 transition-colors shadow-sm flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span>Request Quote</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION WITH LAYERED DEPTH & PARALLAX */}
      <section id="hero" className="relative scroll-mt-16 pt-5 sm:pt-7 pb-5 sm:pb-6 border-b border-slate-200 dark:border-[#1E2636] overflow-hidden">
        {/* Subtle background structural grid layer with gentle parallax */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ transform: `translateY(${parallaxY * 0.2}px)` }}
        >
          <svg className="w-full h-full" width="100%" height="100%">
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 xl:gap-8 items-center">
            {/* Left Column: Core Value Proposition & CTAs */}
            <div className="lg:col-span-7 xl:col-span-7">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.65rem] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.18]">
                Never lose track of stock, valuation, or tax compliance again.
              </h1>

              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Invenza unifies multi-warehouse tracking, real-time stock valuation, tamper-proof activity logs,
                and error-free tax invoices into one intuitive operational platform. Built to eliminate stockouts,
                prevent billing errors, and keep your accountant audit-ready every day.
              </p>

              <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setQuoteStep('calculator');
                    scrollToSection('quote-calculator');
                  }}
                  className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors shadow-sm flex items-center gap-2 active:scale-[0.98]"
                >
                  <IconCalculator className="w-4 h-4" />
                  <span>Calculate Quote & Request Access</span>
                </button>
                <button
                  onClick={() => setIsSignInOpen(true)}
                  className="px-4 py-2.5 rounded-lg bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1E2636] border border-slate-200 dark:border-[#1E2636] text-slate-900 dark:text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2 active:scale-[0.98] shadow-subtle"
                >
                  <IconKey className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>Sign in to Workspace</span>
                </button>
              </div>
            </div>

            {/* Right Column: High-Impact Auto-Scrolling Image Carousel */}
            <div className="lg:col-span-5 xl:col-span-5 w-full">
              <HeroCarousel />
            </div>
          </div>

          {/* Embedded Product Walkthrough Sequence */}
          <div className="mt-6 sm:mt-7 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-200 dark:border-[#1E2636] bg-[#F6F8FA] dark:bg-[#0C1017] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Live Platform Walkthrough</span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">(Interactive operational flow preview)</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full pb-0.5">
                {[
                  { label: '1. Catalog & Stock Levels', id: 0 },
                  { label: '2. Picking & Order Dispatch', id: 1 },
                  { label: '3. Automated Tax Invoice', id: 2 },
                ].map((step) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      setHeroAutoPlay(false);
                      setHeroActiveTab(step.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      heroActiveTab === step.id
                        ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide 1: Catalog & Multi-Location Stock */}
            {heroActiveTab === 0 && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Real-Time Inventory Status by Warehouse</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Stock updates instantly across every bin and facility as orders are received and shipped.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-mono font-medium border border-teal-500/20">
                    Live Stock Sync
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[#1E2636] text-slate-400">
                        <th className="pb-3 font-semibold">SKU & Item Name</th>
                        <th className="pb-3 font-semibold">HSN Code</th>
                        <th className="pb-3 font-semibold text-right">Central Hub</th>
                        <th className="pb-3 font-semibold text-right">North Depot</th>
                        <th className="pb-3 font-semibold text-right">Total Available</th>
                        <th className="pb-3 font-semibold text-center">Health Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#1E2636]/60">
                      <tr>
                        <td className="py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">Industrial Steel Ball Bearings 608-2RS</div>
                          <div className="text-[11px] text-slate-500 font-mono">SKU: IND-BRG-608</div>
                        </td>
                        <td className="py-3 font-mono text-slate-700 dark:text-slate-300">848210</td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">{whCentralStock} units</td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">{whNorthStock} units</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">{whCentralStock + whNorthStock} units</td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Optimal Stock
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">Precision Copper Busbar 100A</div>
                          <div className="text-[11px] text-slate-500 font-mono">SKU: ELE-BUS-100</div>
                        </td>
                        <td className="py-3 font-mono text-slate-700 dark:text-slate-300">740710</td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">35 units</td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">50 units</td>
                        <td className="py-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">85 units</td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Reorder Triggered
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">Fiber Optic Patch Cord SC-LC 5m</div>
                          <div className="text-[11px] text-slate-500 font-mono">SKU: OPT-COR-5M</div>
                        </td>
                        <td className="py-3 font-mono text-slate-700 dark:text-slate-300">854470</td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">400 units</td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">240 units</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">640 units</td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Optimal Stock
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Slide 2: Picking & Order Dispatch */}
            {heroActiveTab === 1 && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">One-Click Picking & Automated Stock Deduction</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Warehouse teams verify items on the floor. On dispatch, inventory is deducted immediately with full audit logging.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-mono font-medium border border-indigo-500/20">
                    Fulfillment Flow
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#1E2636] pb-3 text-xs">
                    <div>
                      <span className="text-slate-400">Sales Order:</span>
                      <span className="font-bold text-slate-900 dark:text-white ml-2 font-mono">#SO-9204</span>
                      <span className="text-slate-400 ml-4">Customer:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 ml-2">Tata Power Systems</span>
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                        Items Staged &bull; Ready to Ship
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
                      <span className="text-slate-700 dark:text-slate-300">120x Industrial Bearings (Central Hub - Aisle 3, Bin B-12)</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <IconCheckCircle2 className="w-3.5 h-3.5" /> Picked
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
                      <span className="text-slate-700 dark:text-slate-300">15x Precision Copper Busbars (Central Hub - Aisle 1, Bin A-04)</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <IconCheckCircle2 className="w-3.5 h-3.5" /> Picked
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Action writes permanent movement log with staff timestamp.</span>
                    <button
                      type="button"
                      onClick={() => triggerSimulatedEvent('OUT')}
                      className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors active:scale-[0.98]"
                    >
                      <IconCheck className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Confirm Dispatch & Deduct Stock</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Slide 3: Automated Tax Invoice */}
            {heroActiveTab === 2 && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instant, Error-Free Tax Invoicing</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">The platform determines buyer vs seller jurisdictions and calculates statutory tax splits automatically without manual calculator work.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-mono font-medium border border-purple-500/20">
                    Multi-Regime Tax Engine
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2 border-r border-slate-200 dark:border-[#1E2636] pr-4">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Tax Breakdown Details</div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-200 dark:border-[#1E2636]/60">
                      <span className="text-slate-400">Transaction Type:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">Intra-State (Karnataka to Karnataka)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-200 dark:border-[#1E2636]/60">
                      <span className="text-slate-400">Taxable Goods Value:</span>
                      <span className="font-mono text-slate-900 dark:text-white">INR 48,000.00</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-200 dark:border-[#1E2636]/60">
                      <span className="text-slate-400">Central Tax (CGST 9%):</span>
                      <span className="font-mono text-teal-700 dark:text-teal-400">INR 4,320.00</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-200 dark:border-[#1E2636]/60">
                      <span className="text-slate-400">State Tax (SGST 9%):</span>
                      <span className="font-mono text-teal-700 dark:text-teal-400">INR 4,320.00</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-bold">
                      <span className="text-slate-900 dark:text-white">Total Invoice Amount:</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">INR 56,640.00</span>
                    </div>
                  </div>

                  <div className="space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">Automated Document Generation</div>
                      <div className="p-3 rounded-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                          <IconFileText className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                          <span>Tax Invoice #INV-2026-088.pdf</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Complete with seller and buyer GSTIN, HSN summaries, QR validation, and digital signature attachment.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => scrollToSection('gst-invoicing')}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] hover:text-white text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <IconFileDown className="w-3.5 h-3.5" />
                        <span>Interactive Tax Calculator</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Numeric Count-Up Animated Statistics */}
          <div ref={statsSectionRef} className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 border-t border-slate-200 dark:border-[#1E2636] pt-4">
            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
              <div className="text-xl sm:text-2xl font-mono font-bold text-teal-700 dark:text-teal-400">
                &lt; 1s
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Live Sync Latency</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Instant stock deduction across all facilities upon order dispatch</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {statAccuracyValue}%
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">FIFO Batch Traceability</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Automated purchase cost tracking with exact FIFO batch costing</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
              <div className="text-xl sm:text-2xl font-mono font-bold text-indigo-700 dark:text-indigo-400">
                0
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Unlogged Movements</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Every receipt, transfer, and sale is permanently recorded</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
              <div className="text-xl sm:text-2xl font-mono font-bold text-purple-700 dark:text-purple-400">
                {statUptimeValue}%
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">High Availability Target</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Resilient infrastructure ensuring warehouse picking never stalls</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WORKFLOW: 4-STEP OPERATIONAL NARRATIVE */}
      <section id="how-it-works" className="scroll-mt-16 py-5 sm:py-7 border-b border-slate-200 dark:border-[#1E2636] bg-[#E8ECF2] dark:bg-[#0A0E14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-20 2xl:pr-12">
          <div className="max-w-2xl mb-3.5 sm:mb-4">
            <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Guided Operational Flow
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
              From Stock Receipt to Tax Invoice in 4 Clear Steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              No complicated configuration or confusing steps. Invenza fits into your existing warehouse and sales routines immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <div
              onMouseEnter={() => setActiveWorkflowStep(1)}
              onMouseLeave={() => setActiveWorkflowStep(null)}
              className={`group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border transition-all duration-300 flex gap-3.5 cursor-default ${
                activeWorkflowStep === 1
                  ? 'border-teal-500/50 shadow-lg shadow-teal-500/10 -translate-y-0.5'
                  : 'border-slate-200 dark:border-[#1E2636] hover:border-teal-500/30 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 font-mono font-bold text-sm border border-teal-500/20 group-hover:scale-105 group-hover:ring-2 group-hover:ring-teal-500/30 transition-all duration-300">
                01
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-300 transition-colors">Centralize your product catalog</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Import your items with SKU codes, categories, units of measure, and default tax rates.
                  Assign storage aisles and bins across your main warehouse or regional depots.
                </p>
                <div className="mt-2.5 text-[11px] text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Outcome: One single source of truth for all stock.</span>
                </div>
              </div>
            </div>

            <div
              onMouseEnter={() => setActiveWorkflowStep(2)}
              onMouseLeave={() => setActiveWorkflowStep(null)}
              className={`group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border transition-all duration-300 flex gap-3.5 cursor-default ${
                activeWorkflowStep === 2
                  ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10 -translate-y-0.5'
                  : 'border-slate-200 dark:border-[#1E2636] hover:border-indigo-500/30 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-mono font-bold text-sm border border-indigo-500/20 group-hover:scale-105 group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all duration-300">
                02
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-300 transition-colors">Track every inbound and outbound move</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Receive supplier shipments through purchase order receipts and fulfill customer sales orders
                  with verified item picking. Stock levels adjust across all locations instantly.
                </p>
                <div className="mt-2.5 text-[11px] text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>Outcome: Zero discrepancies between shelves and screens.</span>
                </div>
              </div>
            </div>

            <div
              onMouseEnter={() => setActiveWorkflowStep(3)}
              onMouseLeave={() => setActiveWorkflowStep(null)}
              className={`group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border transition-all duration-300 flex gap-3.5 cursor-default ${
                activeWorkflowStep === 3
                  ? 'border-purple-500/50 shadow-lg shadow-purple-500/10 -translate-y-0.5'
                  : 'border-slate-200 dark:border-[#1E2636] hover:border-purple-500/30 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 font-mono font-bold text-sm border border-purple-500/20 group-hover:scale-105 group-hover:ring-2 group-hover:ring-purple-500/30 transition-all duration-300">
                03
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-300 transition-colors">Issue compliant tax invoices automatically</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  When an order is dispatched, Invenza inspects buyer and seller locations to apply the exact right tax split.
                  Professional PDF invoices are created automatically with zero manual math.
                </p>
                <div className="mt-2.5 text-[11px] text-purple-700 dark:text-purple-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Outcome: Error-free invoices your customers pay on time.</span>
                </div>
              </div>
            </div>

            <div
              onMouseEnter={() => setActiveWorkflowStep(4)}
              onMouseLeave={() => setActiveWorkflowStep(null)}
              className={`group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border transition-all duration-300 flex gap-3.5 cursor-default ${
                activeWorkflowStep === 4
                  ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10 -translate-y-0.5'
                  : 'border-slate-200 dark:border-[#1E2636] hover:border-emerald-500/30 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm border border-emerald-500/20 group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-500/30 transition-all duration-300">
                04
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-300 transition-colors">Verify accurate stock valuation in real time</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Review real-time financial valuation reports based on true purchase batch costs. Every movement
                  is preserved in an unbroken audit log that makes tax filing painless.
                </p>
                <div className="mt-2.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Outcome: Clean books and an audit-ready business.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Pipeline Sequence Progress Bar */}
          <div className="mt-4 sm:mt-5 p-3.5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                Continuous Operational Pipeline: Step 01 &rarr; Step 02 &rarr; Step 03 &rarr; Step 04
              </span>
            </div>
            <span className="text-teal-700 dark:text-teal-400 text-[11px] font-bold">
              {activeWorkflowStep ? `Inspecting Step 0${activeWorkflowStep}` : 'Interactive Operational Model'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. MULTI-WAREHOUSE MAP & INTER-HUB TRANSFER SCHEMATIC */}
      <section id="warehouse-map" className="scroll-mt-16 py-5 sm:py-6 border-b border-slate-200 dark:border-[#1E2636]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-16 2xl:pr-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7 items-start">
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 mb-2">
                <IconWarehouse className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Multi-Location Management
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Real-Time Stock Routing Between Regional Facilities
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Connect multiple fulfillment centers, regional depots, and cross-docks. Transfer stock with
                in-transit tracking, verify receipts, and prevent inventory fragmentation across branches.
              </p>

              <div className="mt-2.5 sm:mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>Interactive transit routes show goods in-transit between source and destination</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>Automatic stock decrement at dispatch and increment upon receipt signoff</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>Granular bin tracking within each facility down to rack, level, and bin number</span>
                </div>
              </div>

              {/* Warehouse Floor Layout Schematic Graphic - Fully Interactive Zones */}
              <div
                onMouseLeave={() => setHoveredFacilityZone(null)}
                className="mt-2.5 sm:mt-3 p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Architectural Facility Layout Graphic
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-teal-600 dark:text-teal-400">
                    Hover Zones to Inspect
                  </span>
                </div>
                <svg viewBox="0 0 400 120" className="w-full h-auto text-slate-500 select-none">
                  <defs>
                    {/* Architectural Blueprint Grid Pattern */}
                    <pattern id="facilityGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                      <path
                        d="M 16 0 L 0 0 0 16"
                        fill="none"
                        stroke={isDark ? '#16202E' : '#E2E8F0'}
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>

                  {/* Outer Warehouse Perimeter Floor */}
                  <rect
                    x="5"
                    y="5"
                    width="390"
                    height="110"
                    rx="8"
                    fill={isDark ? '#0C1017' : '#F8FAFC'}
                    stroke={isDark ? '#1E2636' : '#CBD5E1'}
                    strokeWidth="1.5"
                  />
                  <rect
                    x="5"
                    y="5"
                    width="390"
                    height="110"
                    rx="8"
                    fill="url(#facilityGrid)"
                    opacity={isDark ? 0.6 : 0.75}
                  />

                  {/* Forklift Central Transit Lane Guide */}
                  <line
                    x1="90"
                    y1="60"
                    x2="255"
                    y2="60"
                    stroke={isDark ? '#1E2636' : '#E2E8F0'}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />

                  {/* Receiving Dock */}
                  <g
                    onMouseEnter={() => setHoveredFacilityZone('inbound')}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="15"
                      y="15"
                      width="70"
                      height="90"
                      rx="4"
                      fill={hoveredFacilityZone === 'inbound' ? (isDark ? '#0f2922' : '#DCFCE7') : (isDark ? '#131924' : '#F0FDF4')}
                      stroke={hoveredFacilityZone === 'inbound' ? (isDark ? '#2dd4bf' : '#059669') : (isDark ? '#334155' : '#86EFAC')}
                      strokeWidth={hoveredFacilityZone === 'inbound' ? '1.5' : '1'}
                      strokeDasharray={hoveredFacilityZone === 'inbound' ? undefined : '3 3'}
                    />
                    <text
                      x="50"
                      y="55"
                      fill={hoveredFacilityZone === 'inbound' ? (isDark ? '#ffffff' : '#065F46') : (isDark ? '#94a3b8' : '#166534')}
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight={hoveredFacilityZone === 'inbound' ? 'bold' : '600'}
                    >
                      INBOUND DOCK
                    </text>
                    <text
                      x="50"
                      y="70"
                      fill={hoveredFacilityZone === 'inbound' ? (isDark ? '#5eead4' : '#059669') : (isDark ? '#2dd4bf' : '#0D9488')}
                      fontSize="8"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      GRN Inspection
                    </text>
                  </g>

                  {/* Aisle A: Racks */}
                  <g
                    onMouseEnter={() => setHoveredFacilityZone('aisleA')}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="105"
                      y="15"
                      width="35"
                      height="90"
                      rx="3"
                      fill={hoveredFacilityZone === 'aisleA' ? (isDark ? '#172554' : '#E0F2FE') : (isDark ? '#131924' : '#F0F9FF')}
                      stroke={hoveredFacilityZone === 'aisleA' ? (isDark ? '#38bdf8' : '#0284C7') : (isDark ? '#1E2636' : '#BAE6FD')}
                      strokeWidth={hoveredFacilityZone === 'aisleA' ? '1.5' : '1'}
                    />
                    <text
                      x="122"
                      y="65"
                      fill={hoveredFacilityZone === 'aisleA' ? (isDark ? '#7dd3fc' : '#0369A1') : (isDark ? '#64748b' : '#0284C7')}
                      fontSize="8"
                      fontWeight={hoveredFacilityZone === 'aisleA' ? 'bold' : '600'}
                      textAnchor="middle"
                      transform="rotate(-90 122 65)"
                      fontFamily="monospace"
                    >
                      AISLE A: RACKS
                    </text>
                  </g>

                  {/* Aisle B: Bins */}
                  <g
                    onMouseEnter={() => setHoveredFacilityZone('aisleB')}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="155"
                      y="15"
                      width="35"
                      height="90"
                      rx="3"
                      fill={hoveredFacilityZone === 'aisleB' ? (isDark ? '#1e1b4b' : '#E0E7FF') : (isDark ? '#131924' : '#EEF2FF')}
                      stroke={hoveredFacilityZone === 'aisleB' ? (isDark ? '#818cf8' : '#4F46E5') : (isDark ? '#1E2636' : '#C7D2FE')}
                      strokeWidth={hoveredFacilityZone === 'aisleB' ? '1.5' : '1'}
                    />
                    <text
                      x="172"
                      y="65"
                      fill={hoveredFacilityZone === 'aisleB' ? (isDark ? '#a5b4fc' : '#3730A3') : (isDark ? '#64748b' : '#4F46E5')}
                      fontSize="8"
                      fontWeight={hoveredFacilityZone === 'aisleB' ? 'bold' : '600'}
                      textAnchor="middle"
                      transform="rotate(-90 172 65)"
                      fontFamily="monospace"
                    >
                      AISLE B: BINS
                    </text>
                  </g>

                  {/* Aisle C: Bulk */}
                  <g
                    onMouseEnter={() => setHoveredFacilityZone('aisleC')}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="205"
                      y="15"
                      width="35"
                      height="90"
                      rx="3"
                      fill={hoveredFacilityZone === 'aisleC' ? (isDark ? '#142a3a' : '#CFFAFE') : (isDark ? '#131924' : '#ECFEFF')}
                      stroke={hoveredFacilityZone === 'aisleC' ? (isDark ? '#0ea5e9' : '#0891B2') : (isDark ? '#1E2636' : '#A5F3FC')}
                      strokeWidth={hoveredFacilityZone === 'aisleC' ? '1.5' : '1'}
                    />
                    <text
                      x="222"
                      y="65"
                      fill={hoveredFacilityZone === 'aisleC' ? (isDark ? '#38bdf8' : '#155E75') : (isDark ? '#64748b' : '#0891B2')}
                      fontSize="8"
                      fontWeight={hoveredFacilityZone === 'aisleC' ? 'bold' : '600'}
                      textAnchor="middle"
                      transform="rotate(-90 222 65)"
                      fontFamily="monospace"
                    >
                      AISLE C: BULK
                    </text>
                  </g>

                  {/* Packing & Staging */}
                  <g
                    onMouseEnter={() => setHoveredFacilityZone('packing')}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="260"
                      y="15"
                      width="55"
                      height="90"
                      rx="4"
                      fill={hoveredFacilityZone === 'packing' ? (isDark ? '#2e1065' : '#F3E8FF') : (isDark ? '#131924' : '#FAF5FF')}
                      stroke={hoveredFacilityZone === 'packing' ? (isDark ? '#a855f7' : '#9333EA') : (isDark ? '#334155' : '#D8B4FE')}
                      strokeWidth={hoveredFacilityZone === 'packing' ? '1.5' : '1'}
                    />
                    <text
                      x="287"
                      y="55"
                      fill={hoveredFacilityZone === 'packing' ? (isDark ? '#ffffff' : '#581C87') : (isDark ? '#94a3b8' : '#6B21A8')}
                      fontSize="8"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight={hoveredFacilityZone === 'packing' ? 'bold' : '600'}
                    >
                      PACKING
                    </text>
                    <text
                      x="287"
                      y="70"
                      fill={hoveredFacilityZone === 'packing' ? (isDark ? '#c084fc' : '#7E22CE') : (isDark ? '#a78bfa' : '#9333EA')}
                      fontSize="8"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      Scan & Stage
                    </text>
                  </g>

                  {/* Outbound Bay */}
                  <g
                    onMouseEnter={() => setHoveredFacilityZone('dispatch')}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="330"
                      y="15"
                      width="55"
                      height="90"
                      rx="4"
                      fill={hoveredFacilityZone === 'dispatch' ? (isDark ? '#064e3b' : '#DCFCE7') : (isDark ? '#131924' : '#F0FDF4')}
                      stroke={hoveredFacilityZone === 'dispatch' ? (isDark ? '#34d399' : '#16A34A') : (isDark ? '#334155' : '#BBF7D0')}
                      strokeWidth={hoveredFacilityZone === 'dispatch' ? '1.5' : '1'}
                      strokeDasharray={hoveredFacilityZone === 'dispatch' ? undefined : '3 3'}
                    />
                    <text
                      x="357"
                      y="55"
                      fill={hoveredFacilityZone === 'dispatch' ? (isDark ? '#ffffff' : '#14532D') : (isDark ? '#94a3b8' : '#166534')}
                      fontSize="8"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight={hoveredFacilityZone === 'dispatch' ? 'bold' : '600'}
                    >
                      DISPATCH
                    </text>
                    <text
                      x="357"
                      y="70"
                      fill={hoveredFacilityZone === 'dispatch' ? (isDark ? '#6ee7b7' : '#15803D') : (isDark ? '#34d399' : '#16A34A')}
                      fontSize="8"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      Ready to Ship
                    </text>
                  </g>
                </svg>

                {/* Live Reactive Zone Telemetry Readout */}
                <div className="mt-2 py-1.5 px-2.5 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 animate-pulse shrink-0" />
                    <span className="text-slate-800 dark:text-slate-200 font-semibold text-[10px] sm:text-[11px] truncate">
                      {hoveredFacilityZone === 'inbound' && 'INBOUND BAY 01: Pallet scan & Goods Receipt Note (GRN) verification active'}
                      {hoveredFacilityZone === 'aisleA' && 'AISLE A (RACKS): Heavy pallet racking • 84% capacity utilized'}
                      {hoveredFacilityZone === 'aisleB' && 'AISLE B (BINS): High-density pick face • Fast moving SKUs active'}
                      {hoveredFacilityZone === 'aisleC' && 'AISLE C (BULK): Heavy machinery & bulk drums • Forklift lane unobstructed'}
                      {hoveredFacilityZone === 'packing' && 'PACKING ZONE: Automated dimensional scanning & weigh-scale check'}
                      {hoveredFacilityZone === 'dispatch' && 'DISPATCH BAY: 6 shipments staged • Verified pick lists & tax invoices generated'}
                      {!hoveredFacilityZone && 'HOVER OVER ANY FACILITY ZONE TO INSPECT REAL-TIME BAY TELEMETRY'}
                    </span>
                  </div>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase hidden sm:inline shrink-0 ml-2">
                    {hoveredFacilityZone ? 'LIVE SENSOR' : 'INTERACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Inter-Hub Route Diagram */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-[#1E2636] mb-2.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">Interactive Network Map</span>
                <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">Click to Trigger Transfer</span>
              </div>

              {/* Hub Route SVG Graphic */}
              <div className="relative p-3 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] overflow-hidden">
                <svg viewBox="0 0 360 160" className="w-full h-auto select-none">
                  <defs>
                    {/* Active flowing route gradient */}
                    <linearGradient id="activeRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2dd4bf" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>

                    {/* Radial glow for in-transit packet */}
                    <radialGradient id="packetGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="40%" stopColor="#2dd4bf" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                    </radialGradient>

                    {/* Filter glow for pulse */}
                    <filter id="routeGlow" x="-20%" y="-40%" width="140%" height="180%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <style>{`
                    @keyframes routeDashStream {
                      from { stroke-dashoffset: 28; }
                      to { stroke-dashoffset: 0; }
                    }
                    @keyframes nodeBeaconWave {
                      0% { r: 24px; opacity: 0.8; }
                      100% { r: 42px; opacity: 0; }
                    }
                  `}</style>

                  {/* Base Route Path */}
                  <line
                    x1="80"
                    y1="80"
                    x2="280"
                    y2="80"
                    stroke={isDark ? '#1E2636' : '#CBD5E1'}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />

                  {/* Animated Active Route Beam during Transfer */}
                  {isTransferring && (
                    <>
                      {/* Wide soft neon glow underpinning the route */}
                      <line
                        x1="80"
                        y1="80"
                        x2="280"
                        y2="80"
                        stroke="#2dd4bf"
                        strokeWidth="8"
                        opacity="0.2"
                        strokeLinecap="round"
                        className="animate-pulse"
                      />

                      {/* Moving conveyor dashed line showing continuous directional flow */}
                      <line
                        x1="80"
                        y1="80"
                        x2="280"
                        y2="80"
                        stroke="url(#activeRouteGrad)"
                        strokeWidth="3"
                        strokeDasharray="8 6"
                        strokeLinecap="round"
                        style={{ animation: 'routeDashStream 0.6s linear infinite' }}
                        filter="url(#routeGlow)"
                      />

                      {/* Moving In-Transit Packet & Pulse Dots */}
                      <g>
                        {/* Outer pulsating energy halo */}
                        <circle cy="80" r="14" fill="#2dd4bf" opacity="0.25">
                          <animate
                            attributeName="cx"
                            from="80"
                            to="280"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Main radiant packet */}
                        <circle cy="80" r="7" fill="url(#packetGlow)" filter="url(#routeGlow)">
                          <animate
                            attributeName="cx"
                            from="80"
                            to="280"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Core white-hot energy center */}
                        <circle cy="80" r="3.5" fill="#ffffff">
                          <animate
                            attributeName="cx"
                            from="80"
                            to="280"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Trailing impulse particle 1 */}
                        <circle cy="80" r="3.5" fill="#2dd4bf" opacity="0.75">
                          <animate
                            attributeName="cx"
                            from="62"
                            to="262"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Trailing impulse particle 2 */}
                        <circle cy="80" r="2.5" fill="#38bdf8" opacity="0.6">
                          <animate
                            attributeName="cx"
                            from="48"
                            to="248"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Trailing impulse particle 3 */}
                        <circle cy="80" r="1.5" fill="#818cf8" opacity="0.4">
                          <animate
                            attributeName="cx"
                            from="36"
                            to="236"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* In-Transit floating payload badge moving along the route */}
                        <g>
                          <animate
                            attributeName="transform"
                            type="translate"
                            from="0,0"
                            to="200,0"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                          <rect
                            x="58"
                            y="48"
                            width="44"
                            height="16"
                            rx="4"
                            fill={isDark ? '#131924' : '#FFFFFF'}
                            stroke={isDark ? '#2dd4bf' : '#0D9488'}
                            strokeWidth="1"
                            opacity="0.95"
                          />
                          <text
                            x="80"
                            y="59"
                            fill={isDark ? '#2dd4bf' : '#0F766E'}
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            50 Units
                          </text>
                        </g>
                      </g>
                    </>
                  )}

                  {/* Hub 1: Central Hub (Bangalore) */}
                  <g transform="translate(80, 80)">
                    {/* Origin Beacon Wave Pulse during transfer */}
                    {isTransferring && (
                      <circle
                        r="24"
                        fill="none"
                        stroke={isDark ? '#2dd4bf' : '#0D9488'}
                        strokeWidth="1.5"
                        style={{ animation: 'nodeBeaconWave 1.2s cubic-bezier(0, 0.2, 0.8, 1) infinite' }}
                      />
                    )}
                    <circle r="24" fill={isDark ? '#131924' : '#FFFFFF'} stroke={isDark ? '#2dd4bf' : '#0D9488'} strokeWidth={isTransferring ? '2.5' : '2'} />
                    <circle r="6" fill={isDark ? '#2dd4bf' : '#0D9488'} className={isTransferring ? 'animate-ping' : ''} />
                    <circle r="6" fill={isDark ? '#2dd4bf' : '#0D9488'} />
                    <text y="38" fill={isDark ? '#ffffff' : '#0F172A'} fontSize="10" fontWeight="bold" textAnchor="middle">Central Hub</text>
                    <text y="50" fill={isDark ? '#94a3b8' : '#475569'} fontSize="8" fontWeight="500" textAnchor="middle">Bangalore (KA)</text>
                  </g>

                  {/* Hub 2: North Depot (Delhi) */}
                  <g transform="translate(280, 80)">
                    {/* Destination Receiving Target Ring */}
                    {isTransferring && (
                      <circle
                        r="32"
                        fill="none"
                        stroke={isDark ? '#818cf8' : '#4F46E5'}
                        strokeWidth="1.5"
                        opacity="0.6"
                        className="animate-pulse"
                      />
                    )}
                    {transferSuccess && (
                      <circle
                        r="24"
                        fill="none"
                        stroke={isDark ? '#10b981' : '#059669'}
                        strokeWidth="2.5"
                        style={{ animation: 'nodeBeaconWave 0.8s ease-out 2' }}
                      />
                    )}
                    <circle r="24" fill={isDark ? '#131924' : '#FFFFFF'} stroke={transferSuccess ? (isDark ? '#10b981' : '#059669') : (isDark ? '#818cf8' : '#4F46E5')} strokeWidth={transferSuccess || isTransferring ? '2.5' : '2'} />
                    <circle r="6" fill={transferSuccess ? (isDark ? '#10b981' : '#059669') : (isDark ? '#818cf8' : '#4F46E5')} />
                    <text y="38" fill={isDark ? '#ffffff' : '#0F172A'} fontSize="10" fontWeight="bold" textAnchor="middle">North Depot</text>
                    <text y="50" fill={isDark ? '#94a3b8' : '#475569'} fontSize="8" fontWeight="500" textAnchor="middle">Delhi (DL)</text>
                  </g>
                </svg>

                {/* Transit Status Badge */}
                <div className="text-center mt-2">
                  {isTransferring && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400" />
                      In-Transit: 50 units Bearings moving to Delhi...
                    </span>
                  )}
                  {transferSuccess && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <IconCheck className="w-3.5 h-3.5" />
                      Transfer Complete: North Depot stock updated!
                    </span>
                  )}
                  {!isTransferring && !transferSuccess && (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      Route active: Bangalore to Delhi line clear
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Live Inventory Stats for the 2 Hubs */}
              <div className="grid grid-cols-2 gap-2.5 mt-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636]">
                  <div className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Central Hub (Origin)</div>
                  <div className="text-base sm:text-lg font-bold text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                    {whCentralStock} units
                  </div>
                  <div className="text-[10px] text-slate-500">Bearings Available</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636]">
                  <div className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">North Depot (Destination)</div>
                  <div className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {whNorthStock} units
                  </div>
                  <div className="text-[10px] text-slate-500">Bearings Available</div>
                </div>
              </div>

              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={triggerWarehouseTransfer}
                  disabled={isTransferring || whCentralStock < 50}
                  className="w-full py-2 px-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <IconArrowLeftRight className="w-3.5 h-3.5" />
                  <span>{isTransferring ? 'Transferring Stock...' : 'Simulate Inter-Hub Transfer (50 Units)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MOVEMENT LEDGER: LIVE ANIMATED EVENT FEED */}
      <section id="audit-ledger" className="scroll-mt-16 py-5 sm:py-6 border-b border-slate-200 dark:border-[#1E2636] bg-[#E8ECF2] dark:bg-[#0A0E14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-16 2xl:pr-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7 items-start">
            {/* Live Animated Event Feed Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-[#1E2636] mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25 shrink-0" title="Activity Filter Controls">
                    <IconSlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">Live Activity Stream</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <span className="text-[11px] text-teal-700 dark:text-teal-400 font-mono">Real-Time Ledger</span>
              </div>

              {/* Action Buttons to trigger simulated live events */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => triggerSimulatedEvent('IN')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] hover:border-emerald-500/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-300 transition-colors active:scale-[0.98]"
                >
                  + Inbound GRN
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulatedEvent('OUT')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] hover:border-teal-500/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-teal-300 transition-colors active:scale-[0.98]"
                >
                  - Dispatch Pick
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulatedEvent('ADJUST')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] hover:border-indigo-500/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-300 transition-colors active:scale-[0.98]"
                >
                  ~ Spot Audit
                </button>
              </div>

              {/* Animated Entries List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-xs">
                {ledgerEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] flex items-start justify-between gap-2.5 transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            entry.type === 'IN'
                              ? 'bg-emerald-400'
                              : entry.type === 'OUT'
                              ? 'bg-teal-400'
                              : entry.type === 'TRANSFER'
                              ? 'bg-indigo-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-semibold text-slate-900 dark:text-white">{entry.title}</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5 pl-4">{entry.detail}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5 pl-4 font-mono">
                        {entry.actor} &bull; {entry.time}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                        entry.type === 'IN'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : entry.type === 'OUT'
                          ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20'
                          : entry.type === 'TRANSFER'
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {entry.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 mb-2">
                <IconShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Permanent Audit Trail
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Every Stock Movement Accounted For. No Mystery Shortages.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Eliminate unexplained stock shrinkage. Invenza records an unbroken chain of custody for every
                goods receipt, customer dispatch, inter-warehouse transfer, and manual cycle adjustment.
              </p>

              <div className="mt-2.5 sm:mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                  <span>Know exactly who authorized every stock change, when it occurred, and why</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                  <span>Mandatory reason codes and manager signoffs for all manual write-offs</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                  <span>Records cannot be quietly overwritten or deleted after the fact</span>
                </div>
              </div>

              {/* Cryptographic Ledger Chain Illustrative Graphic - Interactive & Animated */}
              <div
                onMouseLeave={() => setHoveredBlock(null)}
                className="mt-2.5 sm:mt-3 p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Sequential Append-Only Ledger Flow
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                    Hover Records to Inspect
                  </span>
                </div>
                <svg viewBox="0 0 360 80" className="w-full h-auto text-slate-500 select-none">
                  <defs>
                    <linearGradient id="chainLinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                    <linearGradient id="chainLinkGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>

                  {/* Connecting Link 1 (Animated Flowing Stream) */}
                  <line
                    x1="95"
                    y1="40"
                    x2="135"
                    y2="40"
                    stroke="#1E2636"
                    strokeWidth="2"
                  />
                  <line
                    x1="95"
                    y1="40"
                    x2="135"
                    y2="40"
                    stroke="url(#chainLinkGrad)"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    style={{ animation: 'routeDashStream 0.8s linear infinite' }}
                  />
                  {/* Moving transaction validation packet 1 */}
                  <circle cy="40" r="2.5" fill="#2dd4bf" className="filter drop-shadow-[0_0_4px_#2dd4bf]">
                    <animate attributeName="cx" from="95" to="135" dur="1.2s" repeatCount="indefinite" />
                  </circle>

                  {/* Connecting Link 2 (Animated Flowing Stream) */}
                  <line
                    x1="220"
                    y1="40"
                    x2="260"
                    y2="40"
                    stroke="#1E2636"
                    strokeWidth="2"
                  />
                  <line
                    x1="220"
                    y1="40"
                    x2="260"
                    y2="40"
                    stroke="url(#chainLinkGrad2)"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    style={{ animation: 'routeDashStream 0.8s linear infinite' }}
                  />
                  {/* Moving transaction validation packet 2 */}
                  <circle cy="40" r="2.5" fill="#818cf8" className="filter drop-shadow-[0_0_4px_#818cf8]">
                    <animate attributeName="cx" from="220" to="260" dur="1.2s" repeatCount="indefinite" />
                  </circle>

                  {/* Block 1 */}
                  <g
                    onMouseEnter={() => setHoveredBlock(401)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="10"
                      y={hoveredBlock === 401 ? 12 : 15}
                      width="85"
                      height={hoveredBlock === 401 ? 54 : 50}
                      rx="6"
                      fill={hoveredBlock === 401 ? '#092520' : '#0C1017'}
                      stroke="#2dd4bf"
                      strokeWidth={hoveredBlock === 401 ? '2' : '1.5'}
                    />
                    <text x="52" y={hoveredBlock === 401 ? 33 : 35} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">ENTRY #1041</text>
                    <text x="52" y={hoveredBlock === 401 ? 49 : 50} fill={hoveredBlock === 401 ? '#5eead4' : '#2dd4bf'} fontSize="8" textAnchor="middle" fontFamily="monospace">GRN Verified</text>
                  </g>

                  {/* Block 2 */}
                  <g
                    onMouseEnter={() => setHoveredBlock(402)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="135"
                      y={hoveredBlock === 402 ? 12 : 15}
                      width="85"
                      height={hoveredBlock === 402 ? 54 : 50}
                      rx="6"
                      fill={hoveredBlock === 402 ? '#16193b' : '#0C1017'}
                      stroke="#818cf8"
                      strokeWidth={hoveredBlock === 402 ? '2' : '1.5'}
                    />
                    <text x="177" y={hoveredBlock === 402 ? 33 : 35} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">ENTRY #1042</text>
                    <text x="177" y={hoveredBlock === 402 ? 49 : 50} fill={hoveredBlock === 402 ? '#a5b4fc' : '#818cf8'} fontSize="8" textAnchor="middle" fontFamily="monospace">SO Dispatched</text>
                  </g>

                  {/* Block 3 */}
                  <g
                    onMouseEnter={() => setHoveredBlock(403)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="260"
                      y={hoveredBlock === 403 ? 12 : 15}
                      width="85"
                      height={hoveredBlock === 403 ? 54 : 50}
                      rx="6"
                      fill={hoveredBlock === 403 ? '#072e22' : '#0C1017'}
                      stroke="#34d399"
                      strokeWidth={hoveredBlock === 403 ? '2' : '1.5'}
                    />
                    <text x="302" y={hoveredBlock === 403 ? 33 : 35} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">ENTRY #1043</text>
                    <text x="302" y={hoveredBlock === 403 ? 49 : 50} fill={hoveredBlock === 403 ? '#6ee7b7' : '#34d399'} fontSize="8" textAnchor="middle" fontFamily="monospace">Stock Transfer</text>
                  </g>
                </svg>

                {/* Audit Trail Status Readout */}
                <div className="mt-3 py-2 px-3 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                      {hoveredBlock === 401 && 'ENTRY #1041 • Purchase Receipt (GRN) • +300 units Bearings • Signoff: Ramesh K.'}
                      {hoveredBlock === 402 && 'ENTRY #1042 • Sales Dispatch (SO) • -120 units Bearings • Signoff: Priya S.'}
                      {hoveredBlock === 403 && 'ENTRY #1043 • Inter-Hub Transfer (TR) • 50 units Busbars • Signoff: Sunil M.'}
                      {!hoveredBlock && 'LEDGER INTEGRITY: Append-Only Immutable Records • Permanent Operator Signoffs • Non-Destructive Audit Trail'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80 font-bold uppercase hidden sm:inline">
                    {hoveredBlock ? 'INSPECTING' : 'VERIFIED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TAX ENGINE: MULTI-REGIME DYNAMIC CAROUSEL (GST / VAT / SALES TAX) */}
      <section id="gst-invoicing" className="scroll-mt-16 py-5 sm:py-7 border-b border-slate-200 dark:border-[#1E2636]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-20 2xl:pr-12">
          <TaxEngineCarousel
            currentSlideIndex={activeTaxSlide}
            onSlideChange={setActiveTaxSlide}
          />
        </div>
      </section>

      {/* 6. REPORTS & VALUATION: ANIMATED SELF-DRAWING CHART & INTERACTIVE TOOLTIPS */}
      <section id="reports-valuation" className="scroll-mt-16 py-5 sm:py-7 border-b border-slate-200 dark:border-[#1E2636] bg-[#E8ECF2] dark:bg-[#0A0E14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-20 2xl:pr-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            {/* Animated SVG Chart Card */}
            <div ref={chartRef} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1E2636] mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <IconBarChart3 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">Stock Valuation Trends</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-semibold transition-all">
                    {currentReportData.badgeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChartMetric('valuation')}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                      chartMetric === 'valuation'
                        ? 'bg-teal-50 dark:bg-teal-500/20 text-teal-900 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30 font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    FIFO Value
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('volume')}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                      chartMetric === 'volume'
                        ? 'bg-teal-50 dark:bg-teal-500/20 text-teal-900 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30 font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    Units Moved
                  </button>
                </div>
              </div>

              {/* Self-Drawing Interactive Chart Canvas */}
              <div
                onMouseLeave={() => setHoveredBarIndex(null)}
                className="p-3 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] relative select-none"
              >
                {/* Dynamically synchronized counter header */}
                <div className="flex justify-between items-center mb-3 text-xs">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {hoveredBarIndex !== null
                        ? `${[
                            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
                          ][hoveredBarIndex]} ${chartMetric === 'valuation' ? 'Valuation' : 'Units'}:`
                        : chartMetric === 'valuation'
                        ? 'Total Portfolio Value:'
                        : 'Total Units Moved:'}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono ml-2 transition-all">
                      {hoveredBarIndex !== null
                        ? chartMetric === 'valuation'
                          ? currentReportData.bars[hoveredBarIndex].fullVal
                          : currentReportData.bars[hoveredBarIndex].vol
                        : chartMetric === 'valuation'
                        ? currentReportData.totalVal
                        : '42,900 Units'}
                    </span>
                  </div>
                  <span
                    className={`font-semibold font-mono text-[11px] px-2 py-0.5 rounded transition-all ${
                      hoveredBarIndex !== null
                        ? [
                            'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                            'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                            'text-amber-700 dark:text-amber-400 bg-amber-500/10',
                            'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                            'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                            'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                            'text-teal-800 dark:text-teal-300 bg-teal-500/10',
                          ][hoveredBarIndex]
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {hoveredBarIndex !== null
                      ? currentReportData.bars[hoveredBarIndex].pct
                      : currentReportData.growth}
                  </span>
                </div>

                {/* SVG Bar Chart with smooth scale/draw and hover tooltip */}
                <svg viewBox="0 0 340 140" className="w-full h-auto overflow-visible">
                  <defs>
                    <filter id="barGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="activeSunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#5eead4" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                    <linearGradient id="hoverBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  <line x1="20" y1="20" x2="330" y2="20" stroke="#1E2636" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="60" x2="330" y2="60" stroke="#1E2636" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="100" x2="330" y2="100" stroke="#1E2636" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="120" x2="330" y2="120" stroke="#334155" strokeWidth="1" />

                  {/* 7 Interactive Animated Bars */}
                  {currentReportData.bars.map((bar, i) => {
                    const isHovered = hoveredBarIndex === i;
                    const h = chartMetric === 'valuation' ? bar.hVal : bar.hVol;
                    const barHeight = chartDrawn ? (isHovered ? h + 4 : h) : 0;
                    const barY = 120 - barHeight;

                    return (
                      <g
                        key={bar.day}
                        onMouseEnter={() => setHoveredBarIndex(i)}
                        className="cursor-pointer"
                      >
                        {/* Invisible enlarged hit area for effortless cursor tracking */}
                        <rect
                          x={bar.x - 5}
                          y={10}
                          width={34}
                          height={120}
                          fill="transparent"
                        />

                        {/* Interactive Bar */}
                        <rect
                          x={isHovered ? bar.x - 1 : bar.x}
                          y={barY}
                          width={isHovered ? 26 : 24}
                          height={barHeight}
                          rx="4"
                          fill={
                            isHovered
                              ? i === 6
                                ? 'url(#activeSunGrad)'
                                : 'url(#hoverBarGrad)'
                              : i === 6
                              ? '#2dd4bf'
                              : '#1e293b'
                          }
                          stroke={isHovered ? '#5eead4' : i === 6 ? '#2dd4bf' : '#334155'}
                          strokeWidth={isHovered ? 1.5 : 1}
                          filter={isHovered ? 'url(#barGlow)' : undefined}
                          className="transition-all duration-200 ease-out"
                        />

                        {/* Day label */}
                        <text
                          x={bar.x + 12}
                          y="134"
                          fill={isHovered ? '#5eead4' : '#64748b'}
                          fontSize={isHovered ? '9' : '8'}
                          fontWeight={isHovered ? 'bold' : 'normal'}
                          textAnchor="middle"
                          fontFamily="monospace"
                          className="transition-colors duration-150"
                        >
                          {bar.day}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dynamic Floating SVG Tooltip */}
                  {hoveredBarIndex !== null && (() => {
                    const activeBar = currentReportData.bars[hoveredBarIndex];
                    const h = chartMetric === 'valuation' ? activeBar.hVal : activeBar.hVol;
                    const tipText = chartMetric === 'valuation' ? activeBar.fullVal : activeBar.vol;
                    const tipX = Math.min(Math.max(activeBar.x + 12, 46), 294);
                    const tipY = Math.max(120 - h - 26, 8);

                    return (
                      <g
                        transform={`translate(${tipX}, ${tipY})`}
                        className="pointer-events-none transition-transform duration-150"
                      >
                        {/* Tooltip background pill */}
                        <rect
                          x="-42"
                          y="-10"
                          width="84"
                          height="18"
                          rx="4"
                          fill="#0F172A"
                          stroke="#2dd4bf"
                          strokeWidth="1"
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                        />
                        {/* Downward pointer caret */}
                        <polygon
                          points="-3,8 0,12 3,8"
                          fill="#0F172A"
                          stroke="#2dd4bf"
                          strokeWidth="1"
                        />
                        <line x1="-2.5" y1="8" x2="2.5" y2="8" stroke="#0F172A" strokeWidth="1.5" />
                        {/* Tooltip value text */}
                        <text
                          x="0"
                          y="2.5"
                          fill="#5eead4"
                          fontSize="7.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {tipText}
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Calculated via strict FIFO batch cost allocation ({currentReportData.currencyCode})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setChartTimeframe(chartTimeframe === '7d' ? '30d' : '7d')}
                  className="text-teal-700 dark:text-teal-400 hover:text-teal-300 font-mono transition-colors"
                >
                  View: {chartTimeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              </div>
            </div>

            {/* Content Column */}
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 mb-2.5">
                <IconBarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                True Valuation Reports
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
                Always Know What Your Stock is Worth
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Stop estimating inventory assets based on outdated assumptions. Invenza tracks purchase costs
                down to the exact supplier batch, providing deterministic FIFO valuation reports your
                accountant and tax auditor will trust.
              </p>

              <div className="mt-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <IconCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>Exact First-In-First-Out (FIFO) costing matched to purchase lot bills</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <IconCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>Real-time Gross Margin tracking on every customer dispatch</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <IconCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>One-click financial export for balance sheet reporting and annual tax filings</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AI COPILOT: INTERACTIVE CONVERSATIONAL TYPING SIMULATOR */}
      <section id="ai-copilot" className="scroll-mt-16 py-5 sm:py-7 border-b border-slate-200 dark:border-[#1E2636]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-20 2xl:pr-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-2.5">
                <IconBot className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
                Operational AI Assistant
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
                Ask Questions About Your Stock in Plain English
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                No database queries, no spreadsheet lookups. Ask everyday questions about inventory levels,
                reorder thresholds, or lot locations and get instant, structured answers from your live data.
              </p>

              {/* Clickable Sample Prompts */}
              <div className="mt-4 sm:mt-5 space-y-2 text-xs">
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                  Click a Sample Question to Test:
                </div>
                {AI_CONVERSATIONS.map((conv, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCopilotPrompt(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                      activeCopilotPrompt === idx
                        ? 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-600 dark:border-cyan-500 text-cyan-950 dark:text-cyan-200 font-semibold shadow-sm'
                        : 'bg-white dark:bg-[#131924] border-slate-200 dark:border-[#1E2636] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate pr-2">{conv.question}</span>
                    <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-bold shrink-0">Try Query &rarr;</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversational Terminal Simulator */}
            <div className="p-5 sm:p-5.5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-[#1E2636]">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <IconBot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Invenza Stock Copilot</span>
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">Live Session</span>
              </div>

              {/* Simulated User Message with typing cursor */}
              <div className="flex justify-end">
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-500/15 border border-teal-300 dark:border-teal-500/30 text-teal-950 dark:text-teal-200 text-xs max-w-sm shadow-sm font-medium">
                  <span>"{typedQuestion}"</span>
                  {isTyping && <span className="inline-block w-1.5 h-3 bg-teal-600 dark:bg-teal-400 ml-1 animate-pulse" />}
                </div>
              </div>

              {/* Simulated Assistant Structured Response */}
              <div className="flex justify-start">
                <div className="p-3.5 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs space-y-2.5 max-w-md w-full">
                  {!showCopilotAnswer ? (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs py-2 font-mono">
                      <span className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-ping" />
                      <span>Analyzing live warehouse records...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-800 dark:text-slate-300 font-semibold">
                        Found {AI_CONVERSATIONS[activeCopilotPrompt].items.length} matching inventory records:
                      </p>

                      <div className="space-y-1.5">
                        {AI_CONVERSATIONS[activeCopilotPrompt].items.map((it: any, i: number) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] flex justify-between items-center text-[11px]"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{it.name}</div>
                              {it.min && <div className="text-slate-600 dark:text-slate-400 font-normal">Current: {it.current} (Safety Min: {it.min})</div>}
                              {it.dispatched && <div className="text-slate-600 dark:text-slate-400 font-normal">Dispatched: {it.dispatched} units &bull; {it.trend}</div>}
                              {it.bin && <div className="text-slate-600 dark:text-slate-400 font-normal">{it.bin} &bull; {it.expiry}</div>}
                            </div>
                            {it.short && <span className="text-amber-800 dark:text-amber-400 font-semibold">Short by {it.short}</span>}
                          </div>
                        ))}
                      </div>

                      <p className="text-[11px] text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-[#1E2636] pt-2 leading-relaxed">
                        {AI_CONVERSATIONS[activeCopilotPrompt].suggestion}
                      </p>

                      <div className="pt-1">
                        <button
                          type="button"
                          className="w-full py-2 px-3 rounded-lg bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 text-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <IconCheck className="w-3.5 h-3.5" />
                          <span>{AI_CONVERSATIONS[activeCopilotPrompt].actionLabel}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TRUST, SECURITY & CREDIBILITY SECTION */}
      <section id="trust-security" className="scroll-mt-16 py-5 sm:py-7 border-b border-slate-200 dark:border-[#1E2636] bg-[#E8ECF2] dark:bg-[#0A0E14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-20 2xl:pr-12">
          <div className="max-w-2xl mb-3.5 sm:mb-4">
            <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Trust & Data Security
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
              Enterprise Data Security & Architectural Safeguards
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Your inventory and sales data represent your business livelihood. We keep your records isolated,
              encrypted, and available around the clock.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] hover:border-teal-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300 cursor-default">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 mb-2.5 group-hover:scale-105 group-hover:ring-2 group-hover:ring-teal-500/30 transition-all duration-300">
                <IconShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-300 transition-colors">Strict Business Data Isolation</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Your business runs within its own dedicated organization boundary. No other business or user
                can ever see, query, or leak into your inventory catalog, customer orders, or financial reports.
              </p>
            </div>

            <div className="group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] hover:border-indigo-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-default">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 mb-2.5 group-hover:scale-105 group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all duration-300">
                <IconKey className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-300 transition-colors">Enterprise Data Encryption</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                All data in transit is protected using modern TLS 1.3 encryption, and stored database records:
                including generated invoice PDFs, tax records, and movement logs: are secured at rest.
              </p>
            </div>

            <div className="group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] hover:border-purple-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 cursor-default">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 mb-2.5 group-hover:scale-105 group-hover:ring-2 group-hover:ring-purple-500/30 transition-all duration-300">
                <IconClock className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-300 transition-colors">High Operational Availability</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Warehouses never sleep, and neither does Invenza. Resilient cloud architecture ensures that your
                picking staff, drivers, and sales representatives can dispatch orders without unexpected downtime.
              </p>
            </div>

            <div className="group p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] hover:border-emerald-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-default">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-2.5 group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-500/30 transition-all duration-300">
                <IconCheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-300 transition-colors">Audit-Ready Compliance</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Export complete, tamper-proof transaction histories and tax summaries with one click.
                Designed to make annual financial audits and tax filings painless for your accounting team.
              </p>
            </div>
          </div>

          {/* Live System Trust & Compliance Telemetry Bar */}
          <div className="mt-4 p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                Active Safeguards: Scoped Company Boundary &bull; Multi-Factor RBAC &bull; Daily Automated Backups
              </span>
            </div>
            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              Maker-Checker Dual Control &bull; Immutable Audit Ledger
            </span>
          </div>
        </div>
      </section>

      {/* 9. QUOTATION & ONBOARDING FLOW */}
      <section id="quote-calculator" className="scroll-mt-16 py-5 sm:py-7 border-b border-slate-200 dark:border-[#1E2636]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-14 2xl:pr-8">
          <div className="text-center max-w-2xl mx-auto mb-3.5 sm:mb-4">
            <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Request Platform Access
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
              Configure Your Plan & Get a Custom Quotation
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Select your warehouse size, catalog volume, and required capabilities below. We will calculate
              your recommended plan and connect with you on WhatsApp to finalize your setup.
            </p>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-4 mb-4 sm:mb-5 text-xs font-semibold font-mono overflow-x-auto scrollbar-none pb-1 max-w-full">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 ${
                quoteStep === 'calculator'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-400'
                  : 'bg-white dark:bg-[#131924] border-slate-200 dark:border-[#1E2636] text-slate-600 dark:text-slate-400 font-medium'
              }`}
            >
              <span className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center text-[10px]">1</span>
              <span>1. Operational Scale</span>
            </div>
            <span className="text-slate-600 dark:text-slate-400 shrink-0">&rarr;</span>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 ${
                quoteStep === 'contact'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-400'
                  : 'bg-white dark:bg-[#131924] border-slate-200 dark:border-[#1E2636] text-slate-600 dark:text-slate-400 font-medium'
              }`}
            >
              <span className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center text-[10px]">2</span>
              <span>2. Contact Details</span>
            </div>
            <span className="text-slate-600 dark:text-slate-400 shrink-0">&rarr;</span>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 ${
                quoteStep === 'submitted'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-400'
                  : 'bg-white dark:bg-[#131924] border-slate-200 dark:border-[#1E2636] text-slate-600 dark:text-slate-400 font-medium'
              }`}
            >
              <span className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center text-[10px]">3</span>
              <span>3. WhatsApp Confirmation</span>
            </div>
          </div>

          {/* Error Banner */}
          {submissionError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
              <IconAlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* STEP 1: CALCULATOR */}
          {quoteStep === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              {/* Scale Configuration Form */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono mb-2">
                    1. Number of Warehouses / Hubs
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['1-2', '3-5', '6-20', '20+'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setWarehouses(opt)}
                        className={`p-3 rounded-xl border text-center transition-all active:scale-[0.98] ${
                          warehouses === opt
                            ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-600 dark:border-teal-500 text-teal-900 dark:text-teal-300 font-bold shadow-sm'
                            : 'bg-[#F6F8FA] dark:bg-[#0C1017] border-slate-200 dark:border-[#1E2636] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="text-sm">{opt}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Facilities</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono mb-2">
                    2. Estimated Product Catalog Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['< 500', '500 - 5,000', '5,000 - 50,000', '50,000+'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSkus(opt)}
                        className={`p-3 rounded-xl border text-center transition-all active:scale-[0.98] ${
                          skus === opt
                            ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-600 dark:border-teal-500 text-teal-900 dark:text-teal-300 font-bold shadow-sm'
                            : 'bg-[#F6F8FA] dark:bg-[#0C1017] border-slate-200 dark:border-[#1E2636] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs">{opt}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Product SKUs</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono mb-2">
                    3. Monthly Order Volume
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['< 1,000', '1,000 - 10,000', '10,000 - 100,000', '100,000+'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOrders(opt)}
                        className={`p-3 rounded-xl border text-center transition-all active:scale-[0.98] ${
                          orders === opt
                            ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-600 dark:border-teal-500 text-teal-900 dark:text-teal-300 font-bold shadow-sm'
                            : 'bg-[#F6F8FA] dark:bg-[#0C1017] border-slate-200 dark:border-[#1E2636] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs">{opt}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Orders / month</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
                      4. Core Capabilities Required
                    </label>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-medium">
                      {selectedModules.length} of 8 selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'products', name: 'Product Catalog & SKUs', desc: 'Item details, pricing, and variants' },
                      { id: 'locations', name: 'Multi-Warehouse & Bins', desc: 'Aisles, racks, and location tracking' },
                      { id: 'orders', name: 'Orders & Tax Invoicing', desc: 'Supplier receipts and customer billing' },
                      { id: 'transfers', name: 'Stock Transfers', desc: 'Inter-facility movement tracking' },
                      { id: 'adjustments', name: 'Stock Adjustments', desc: 'Cycle counts and damage write-offs' },
                      { id: 'ledger', name: 'Tamper-Proof Audit Trail', desc: 'Complete activity history' },
                      { id: 'reports', name: 'Inventory Valuation', desc: 'Accurate cost and stock reports' },
                      { id: 'storage', name: 'Document Vault', desc: 'Receipts, invoices, and certificates' },
                      { id: 'team', name: 'Teams & Roles', desc: 'Granular permissions and user access control' },
                    ].map((mod) => {
                      const isSelected = selectedModules.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModule(mod.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-colors active:scale-[0.98] ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-500 text-slate-900 dark:text-white shadow-sm'
                              : 'bg-[#F6F8FA] dark:bg-[#0C1017] border-slate-200 dark:border-[#1E2636] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center text-xs shrink-0 ${
                              isSelected ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 font-bold' : 'border border-slate-400 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <IconCheck className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-white">{mod.name}</div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400">{mod.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleProceedToContact}
                    className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span>Proceed with this Scope &rarr; Enter Contact Details</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Quotation Calculation Summary Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] space-y-4 sm:space-y-5">
                <div>
                  <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                    {currentTier.tag}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{currentTier.name}</h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{currentTier.desc}</p>
                </div>

                <div className="border-t border-slate-200 dark:border-[#1E2636] pt-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[#1E2636]/60">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Target Warehouses:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{warehouses} Hubs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[#1E2636]/60">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Catalog Volume:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{skus} SKUs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[#1E2636]/60">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Monthly Volume:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{orders} orders</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[#1E2636]/60">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Privacy Mode:</span>
                    <span className="font-mono font-semibold text-teal-800 dark:text-teal-400">Dedicated Organization Boundary</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[#1E2636]/60">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Support Commitment:</span>
                    <span className="font-mono font-semibold text-indigo-900 dark:text-indigo-400 text-[11px] text-right">{currentTier.sla}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-[11px] space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Fast-Track Setup:</div>
                  <div className="text-slate-700 dark:text-slate-400 leading-relaxed">
                    Once submitted, your scope is sent directly to our team via WhatsApp and email.
                    We configure your workspace and guide you through onboarding.
                  </div>
                </div>

                <button
                  onClick={handleProceedToContact}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span>Request Official Quote</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COMPANY & CONTACT FORM */}
          {quoteStep === 'contact' && (
            <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1E2636] mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Company & Contact Details</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Quoting for: <span className="font-bold text-teal-700 dark:text-teal-400">{currentTier.name}</span> ({warehouses} Hubs, {skus} SKUs)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuoteStep('calculator')}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-mono transition-colors"
                >
                  &larr; Adjust Scale
                </button>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder="e.g. Apex Industrial Supplies"
                      className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Industry Sector
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
                    >
                      {INDUSTRIES_LIST.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Currency & State / Jurisdiction Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Operating Currency *
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        const newCurr = e.target.value as 'INR' | 'EUR' | 'USD';
                        setCurrency(newCurr);
                        setState('');
                        setPincode('');
                        setPincodeError(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
                    >
                      <option value="INR">INR (₹) — India (GST Regime)</option>
                      <option value="EUR">EUR (€) — European Union (VAT Regime)</option>
                      <option value="USD">USD ($) — United States (Sales Tax Regime)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      State *
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
                    >
                      <option value="">
                        {currency === 'EUR'
                          ? 'Select EU Country / Member State...'
                          : currency === 'USD'
                          ? 'Select US State...'
                          : 'Select State / UT...'}
                      </option>
                      {currency === 'INR' &&
                        INDIAN_STATES_LIST.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                      {currency === 'EUR' &&
                        SUPPORTED_COUNTRIES.filter((c) => c.code !== 'IN' && c.code !== 'US').map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.name} ({c.code} · {EU_VAT_RATES[c.code]}% VAT)
                          </option>
                        ))}
                      {currency === 'USD' &&
                        US_STATES_LIST.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.name} ({s.code} · {US_STATE_SALES_TAX_RATES[s.code]}% Tax)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City / Operating Location *
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder={
                        currency === 'EUR'
                          ? 'e.g. Berlin / Munich / Paris'
                          : currency === 'USD'
                          ? 'e.g. San Francisco / Austin'
                          : 'e.g. Bengaluru / Mumbai'
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {currency === 'EUR'
                        ? 'Postal Code (PLZ / Postal Code) *'
                        : currency === 'USD'
                        ? 'ZIP Code (5 Digits) *'
                        : 'Pincode (6 Digits) *'}
                    </label>
                    <input
                      type="text"
                      maxLength={currency === 'EUR' ? 10 : currency === 'USD' ? 10 : 6}
                      value={pincode}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val =
                          currency === 'INR'
                            ? raw.replace(/\D/g, '').slice(0, 6)
                            : currency === 'USD'
                            ? raw.replace(/[^0-9-]/g, '').slice(0, 10)
                            : raw.replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 10);
                        setPincode(val);

                        if (currency === 'INR') {
                          if (val.length === 6) {
                            if (/^[1-9][0-9]{5}$/.test(val)) {
                              setPincodeError(null);
                            } else {
                              setPincodeError('Pincode cannot start with 0');
                            }
                          } else if (val.length > 0) {
                            setPincodeError('Must be exactly 6 digits');
                          } else {
                            setPincodeError(null);
                          }
                        } else if (currency === 'USD') {
                          if (val.length >= 5) {
                            if (/^[0-9]{5}(-[0-9]{4})?$/.test(val)) {
                              setPincodeError(null);
                            } else {
                              setPincodeError('Invalid US ZIP code format');
                            }
                          } else if (val.length > 0) {
                            setPincodeError('Must be at least 5 digits');
                          } else {
                            setPincodeError(null);
                          }
                        } else {
                          if (val.length >= 3) {
                            setPincodeError(null);
                          } else if (val.length > 0) {
                            setPincodeError('Must be at least 3 characters');
                          } else {
                            setPincodeError(null);
                          }
                        }
                      }}
                      required
                      placeholder={
                        currency === 'EUR'
                          ? 'e.g. 10115'
                          : currency === 'USD'
                          ? 'e.g. 94105'
                          : 'e.g. 560001'
                      }
                      className={`w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border ${
                        pincodeError ? 'border-rose-500' : 'border-slate-200 dark:border-[#1E2636]'
                      } text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors`}
                    />
                    {pincodeError && (
                      <p className="text-[10px] text-rose-500 mt-1 font-sans">{pincodeError}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Suggested Company Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    placeholder="e.g. APEXIND"
                    maxLength={12}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono uppercase transition-colors"
                  />
                </div>

                <div className="border-t border-slate-200 dark:border-[#1E2636] pt-4 mt-4">
                  <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Contact Person
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        required
                        placeholder="e.g. Rajesh Kumar"
                        className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Work Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="rajesh@apexsupplies.com"
                        className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        WhatsApp Number (for fast response)
                      </label>
                      <input
                        type="tel"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="Leave blank if same as phone"
                        className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Specific Operational Needs or Existing Software
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Currently tracking in Excel, need automated tax invoices for 2 warehouse locations..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setQuoteStep('calculator')}
                    className="px-4 py-2.5 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    &larr; Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <span>{isSubmitting ? 'Sending Request...' : 'Submit Quotation Request'}</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SUBMITTED CONFIRMATION & WHATSAPP ACTION */}
          {quoteStep === 'submitted' && submittedLeadData && (
            <div className="max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#131924] border border-teal-500/30 text-center">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <IconCheck className="w-6 h-6 stroke-[2.5]" />
              </div>

              <span className="px-2.5 py-0.5 rounded font-mono text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                Inquiry Registered &bull; Ref: {String(submittedLeadData.id).slice(0, 8)}
              </span>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2.5 sm:mt-3">
                Quotation Request Received!
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{submittedLeadData.contact_name}</strong>. Your inquiry for{' '}
                <strong>{submittedLeadData.company_name}</strong> has been logged. Our onboarding specialist will contact you shortly.
              </p>

              {/* Prominent WhatsApp Click-to-Chat CTA */}
              <div className="mt-4 sm:mt-5 p-4 sm:p-5 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-emerald-500/30 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold font-mono">
                  <IconMessageCircle className="w-4 h-4" />
                  <span>Instant WhatsApp Confirmation</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  To speed up your workspace setup and discuss custom requirements directly, send your submitted details to our lead team on WhatsApp with 1 tap:
                </p>

                {submittedLeadData.whatsapp_url && (
                  <a
                    href={submittedLeadData.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md active:scale-[0.98]"
                  >
                    <IconMessageCircle className="w-4 h-4" />
                    <span>Send Details to Invenza Team on WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-200 dark:border-[#1E2636] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <button
                  onClick={() => {
                    setQuoteStep('calculator');
                    setCompanyName('');
                    setContactName('');
                    setEmail('');
                    setPhone('');
                    setSubmittedLeadData(null);
                  }}
                  className="hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                >
                  &larr; Submit Another Inquiry
                </button>

                <button
                  onClick={() => setIsSignInOpen(true)}
                  className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 font-semibold transition-colors"
                >
                  Already have an account? Sign in &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sign In Modal Overlay */}
      {isSignInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] shadow-2xl p-6 sm:p-8">
            <button
              onClick={() => setIsSignInOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Close Sign In Dialog"
            >
              &times;
            </button>
            <Login isModal={true} onClose={() => setIsSignInOpen(false)} />
          </div>
        </div>
      )}

      {/* Customer-Focused Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-[#1E2636] py-5 sm:py-6 bg-[#E8ECF2] dark:bg-[#080B10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:pr-20 2xl:pr-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src={isDark ? '/invenza-logo-dark.png' : '/invenza-logo-light.png'}
              alt="Invenza"
              className="h-6 w-auto object-contain opacity-85 select-none transition-opacity duration-150"
              onError={(e) => {
                e.currentTarget.src = isDark ? '/invenza-logo-transparent.png' : '/invenza-logo-cropped.png';
              }}
            />
            <span className="text-slate-600">&bull;</span>
            <span className="font-mono text-[11px] text-slate-500">
              Multi-Warehouse Inventory & Automated Tax Invoicing
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate && onNavigate('terms')}
              className="hover:text-slate-300 transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigate && onNavigate('privacy')}
              className="hover:text-slate-300 transition-colors"
            >
              Privacy Policy
            </button>
            <span className="font-mono text-[11px] text-slate-500">
              Enterprise Data Isolation &bull; 99.9% Availability Target &bull; Immutable Audit Trail
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
