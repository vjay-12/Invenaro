import React, { useState, useEffect, useMemo } from 'react';
import {
  IconLayers,
  IconSearch,
  IconShieldCheck,
  IconDownload,
  IconX,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { MovementBadge } from '../components/common/Badge';
import { PageMeta } from '../components/common/PageMeta';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';
import { StreamSelectDropdown, StreamFilterOption } from '../components/common/StreamSelectDropdown';

interface ProductDetailItem {
  name: string;
  sku: string;
  qty: number | string;
  unitOfMeasure?: string;
}

interface ProcessedLedgerEvent {
  id: string;
  rawMovement: any;
  timestamp: string;
  movementType: string;
  primaryProductName: string;
  primarySku: string;
  additionalProducts: ProductDetailItem[];
  allProducts: ProductDetailItem[];
  totalProductsCount: number;
  locationName: string;
  targetLocationName?: string;
  locationCode: string;
  deltaDisplay: {
    sign: string;
    qtyText: string;
    subText: string;
    colorClass: string;
    tooltipText: string;
  };
  runningBalance: number | string;
  referenceId: string;
  referenceType: string;
  reasonText: string;
  operatorInfo: {
    role: string;
    name: string;
    email: string;
    isSystem: boolean;
    badgeColor: string;
  };
}

// Truncated Reference Cell: only displays a tooltip (title) when the text actually overflows and truncates
const ReferenceCell: React.FC<{ referenceId: string; referenceType: string }> = ({
  referenceId,
  referenceType,
}) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = React.useRef<HTMLSpanElement>(null);

  const checkTruncation = () => {
    const el = textRef.current;
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  };

  useEffect(() => {
    checkTruncation();
  }, [referenceId]);

  return (
    <div className="h-full flex flex-col justify-center min-w-0" onMouseEnter={checkTruncation}>
      <span
        ref={textRef}
        title={isTruncated ? referenceId : undefined}
        className="font-mono text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight block group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors"
      >
        {referenceId || '—'}
      </span>
      {referenceType && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5 block">
          {referenceType}
        </span>
      )}
    </div>
  );
};

const STREAM_FILTER_OPTIONS: StreamFilterOption[] = [
  { id: 'all', label: 'All Streams' },
  { id: 'IN', label: 'Receipts (IN)' },
  { id: 'OUT', label: 'Dispatches (OUT)' },
  { id: 'TRANSFER', label: 'Transfers' },
  { id: 'ADJUST', label: 'Adjustments' },
  { id: 'DRAFT_DELETED', label: 'Deleted Drafts' },
];

export const Ledger: React.FC = () => {
  const { ledger, products, locations, selectedLocationId } = useInventory();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ProcessedLedgerEvent | null>(null);

  // Pagination State (Default 20 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Stream Counts for Dropdown Badges (Respects selected location filter)
  const streamCounts = useMemo(() => {
    const counts: Record<string, number> = {
      IN: 0,
      OUT: 0,
      TRANSFER: 0,
      ADJUST: 0,
      DRAFT_DELETED: 0,
    };
    for (const m of ledger) {
      if (
        selectedLocationId === 'all' ||
        !m.locationId ||
        m.locationId === selectedLocationId ||
        m.targetLocationId === selectedLocationId
      ) {
        if (m.movementType in counts) {
          counts[m.movementType]++;
        }
      }
    }
    return counts;
  }, [ledger, selectedLocationId]);

  const totalStreamCount = useMemo(() => {
    return ledger.filter(
      (m) =>
        selectedLocationId === 'all' ||
        !m.locationId ||
        m.locationId === selectedLocationId ||
        m.targetLocationId === selectedLocationId
    ).length;
  }, [ledger, selectedLocationId]);

  // Helper: parse operator string into clean role, display name, and email
  const parseOperator = (performedBy?: string) => {
    if (!performedBy || performedBy.trim() === '') {
      return {
        role: 'System',
        name: 'System Automation',
        email: 'system@invenza.internal',
        isSystem: true,
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700',
      };
    }

    const str = performedBy.trim();
    const lower = str.toLowerCase();

    // Check if system or automated test
    if (
      lower.includes('system') ||
      lower.includes('automation') ||
      lower.includes('automated') ||
      lower.includes('test suite') ||
      lower.includes('sync')
    ) {
      return {
        role: 'System',
        name: str.split('(')[0].trim() || 'System Automation',
        email: str.includes('(') ? str.split('(')[1].replace(')', '').trim() : 'system@invenza.internal',
        isSystem: true,
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700',
      };
    }

    // Extract name and email
    let name = str;
    let email = '';
    const match = str.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      name = match[1].trim();
      email = match[2].trim();
    }

    // Role classification
    let role = 'Operator';
    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

    if (lower.includes('dispatch')) {
      role = 'Dispatch Lead';
      badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/25';
    } else if (lower.includes('warehouse')) {
      role = 'Warehouse Lead';
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25';
    } else if (
      lower.includes('admin') ||
      lower.includes('sarabhai') ||
      lower.includes('vijay') ||
      lower.includes('baskaran') ||
      lower.includes('owner')
    ) {
      role = 'Admin';
      badgeColor = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/25';
    } else if (lower.includes('manager')) {
      role = 'Manager';
      badgeColor = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/25';
    }

    return { role, name, email, isSystem: false, badgeColor };
  };

  // Helper: parse multi-item lists from reason_code if stored (e.g. Draft Deletions)
  const parseReasonItems = (reasonCode?: string): ProductDetailItem[] => {
    if (!reasonCode) return [];
    const itemsIndex = reasonCode.indexOf('items:');
    if (itemsIndex === -1) return [];

    const itemsStr = reasonCode.substring(itemsIndex + 6).trim();
    const chunks = itemsStr.split(';').map((s) => s.trim()).filter(Boolean);
    const result: ProductDetailItem[] = [];

    for (const chunk of chunks) {
      const match = chunk.match(/^(.*?)\s*\((.*?)\)\s*[×x]\s*([0-9.]+)/);
      if (match) {
        result.push({
          name: match[1].trim(),
          sku: match[2].trim(),
          qty: match[3].trim(),
          unitOfMeasure: 'pcs',
        });
      } else {
        result.push({
          name: chunk,
          sku: '',
          qty: 1,
          unitOfMeasure: 'pcs',
        });
      }
    }
    return result;
  };

  // Group raw movements into unified business events so single events with multiple products display ONCE
  const processedEvents = useMemo(() => {
    const events: ProcessedLedgerEvent[] = [];
    const seenEventKeys = new Set<string>();

    // First filter raw movements according to user criteria
    const filteredRaw = ledger.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (m.productName && m.productName.toLowerCase().includes(q)) ||
        (m.sku && m.sku.toLowerCase().includes(q)) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q)) ||
        (m.performedBy && m.performedBy.toLowerCase().includes(q)) ||
        (m.reasonCode && m.reasonCode.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' || m.movementType === typeFilter;

      const matchesLocation =
        selectedLocationId === 'all' ||
        !m.locationId ||
        m.locationId === selectedLocationId ||
        m.targetLocationId === selectedLocationId;

      return matchesSearch && matchesType && matchesLocation;
    });

    for (let i = 0; i < filteredRaw.length; i++) {
      const m = filteredRaw[i];

      // Check if this movement has parsed items in reasonCode (e.g. Draft order deleted with multiple products)
      const parsedReasonItems = parseReasonItems(m.reasonCode);
      const isDraftDeleted = m.movementType === 'DRAFT_DELETED';

      // Check if multiple rows in the database belong to the exact same event
      // (same referenceId, same movementType, and recorded within 15 seconds)
      const timestampMs = new Date(m.timestamp || (m as any).createdAt || Date.now()).getTime();
      const eventBucketKey = m.referenceId
        ? `${m.referenceId}_${m.movementType}_${Math.floor(timestampMs / 15000)}`
        : m.id;

      if (seenEventKeys.has(eventBucketKey)) {
        continue; // Already grouped into primary row
      }
      seenEventKeys.add(eventBucketKey);

      // Find all sibling rows belonging to this exact event
      const siblings = m.referenceId
        ? filteredRaw.filter((sm) => {
            if (sm.id === m.id) return false;
            if (sm.referenceId !== m.referenceId || sm.movementType !== m.movementType) return false;
            const smTime = new Date(sm.timestamp || (sm as any).createdAt || Date.now()).getTime();
            return Math.abs(smTime - timestampMs) <= 15000;
          })
        : [];

      // Determine product items list
      let allProducts: ProductDetailItem[] = [];
      let primaryProductName = m.productName || 'Catalog Product';
      let primarySku = m.sku || 'SKU';

      if (parsedReasonItems.length > 0) {
        allProducts = parsedReasonItems;
        primaryProductName = parsedReasonItems[0].name;
        primarySku = parsedReasonItems[0].sku;
      } else if (siblings.length > 0) {
        allProducts = [
          {
            name: m.productName || 'Catalog Product',
            sku: m.sku || 'SKU',
            qty: m.quantity,
            unitOfMeasure: m.unitOfMeasure || 'pcs',
          },
          ...siblings.map((s) => ({
            name: s.productName || 'Catalog Product',
            sku: s.sku || 'SKU',
            qty: s.quantity,
            unitOfMeasure: s.unitOfMeasure || 'pcs',
          })),
        ];
      } else {
        allProducts = [
          {
            name: primaryProductName,
            sku: primarySku,
            qty: m.quantity,
            unitOfMeasure: m.unitOfMeasure || 'pcs',
          },
        ];
      }

      const additionalProducts = allProducts.slice(1);
      const totalProductsCount = allProducts.length;

      // Location resolution
      const loc = locations.find((l) => l.id === m.locationId);
      const targetLoc = locations.find((l) => l.id === m.targetLocationId);
      const locationName = loc?.name || m.locationName || (isDraftDeleted ? 'Operations' : 'Primary Hub');
      const locationCode = loc?.code || 'HUB';
      const targetLocationName = targetLoc?.name || m.targetLocationName;

      // Delta Quantity Semantics (Item 3 in Prompt)
      const uom = m.unitOfMeasure || 'pcs';
      const absQty = Math.abs(Number(m.quantity || 0));
      const mvType = m.movementType?.toUpperCase();
      let deltaDisplay: ProcessedLedgerEvent['deltaDisplay'];

      if (isDraftDeleted) {
        deltaDisplay = {
          sign: '',
          qtyText: '—',
          subText: '0 qty',
          colorClass: 'text-slate-400 dark:text-slate-500 font-mono',
          tooltipText: 'Audit-only entry for draft order deletion. Zero inventory movement occurred.',
        };
      } else if (mvType === 'IN' || mvType === 'PURCHASE_RECEIPT') {
        deltaDisplay = {
          sign: '+',
          qtyText: `+${absQty} ${uom}`,
          subText: '',
          colorClass: 'text-emerald-700 dark:text-emerald-400 font-mono font-bold',
          tooltipText: `Inbound receipt: +${absQty} ${uom} received into warehouse stock.`,
        };
      } else if (mvType === 'OUT' || mvType === 'SALES_DISPATCH') {
        deltaDisplay = {
          sign: '-',
          qtyText: `-${absQty} ${uom}`,
          subText: '',
          colorClass: 'text-rose-700 dark:text-rose-400 font-mono font-bold',
          tooltipText: `Outbound dispatch: -${absQty} ${uom} deducted from warehouse stock.`,
        };
      } else if (mvType === 'ADJUST') {
        const rawQty = Number(m.quantity || 0);
        const isPos = rawQty >= 0;
        const sign = isPos ? '+' : '-';
        deltaDisplay = {
          sign,
          qtyText: `${sign}${absQty} ${uom}`,
          subText: '',
          colorClass: isPos
            ? 'text-emerald-700 dark:text-emerald-400 font-mono font-bold'
            : 'text-rose-700 dark:text-rose-400 font-mono font-bold',
          tooltipText: `Manual count adjustment: ${sign}${absQty} ${uom} applied to inventory balance.`,
        };
      } else if (mvType === 'TRANSFER') {
        if (selectedLocationId && selectedLocationId !== 'all') {
          if (m.locationId === selectedLocationId) {
            deltaDisplay = {
              sign: '-',
              qtyText: `-${absQty} ${uom}`,
              subText: 'outbound',
              colorClass: 'text-rose-700 dark:text-rose-400 font-mono font-bold',
              tooltipText: `Inter-warehouse transfer: -${absQty} ${uom} dispatched to destination node.`,
            };
          } else {
            deltaDisplay = {
              sign: '+',
              qtyText: `+${absQty} ${uom}`,
              subText: 'inbound',
              colorClass: 'text-emerald-700 dark:text-emerald-400 font-mono font-bold',
              tooltipText: `Inter-warehouse transfer: +${absQty} ${uom} received from source node.`,
            };
          }
        } else {
          deltaDisplay = {
            sign: '±',
            qtyText: `±${absQty} ${uom}`,
            subText: 'transfer',
            colorClass: 'text-sky-700 dark:text-sky-400 font-mono font-bold',
            tooltipText: `Inter-warehouse stock transfer of ${absQty} ${uom} between internal facilities.`,
          };
        }
      } else {
        deltaDisplay = {
          sign: '',
          qtyText: `${m.quantity} ${uom}`,
          subText: '',
          colorClass: 'text-slate-700 dark:text-slate-300 font-mono font-semibold',
          tooltipText: `Physical movement of ${m.quantity} ${uom} recorded on immutable ledger.`,
        };
      }

      // Running Balance
      const runningBalance = isDraftDeleted
        ? '—'
        : typeof m.runningBalance === 'number'
        ? `${m.runningBalance} ${uom}`
        : `${m.quantity} ${uom}`;

      // Operator details
      const operatorInfo = parseOperator(m.performedBy);

      // Clean reason text
      const rawReason = m.reasonCode || (isDraftDeleted ? 'Draft order deleted' : 'Standard Inventory Transaction');
      const cleanReason = rawReason.replace(/· \d+ items:.*$/, '').trim();

      events.push({
        id: m.id,
        rawMovement: m,
        timestamp: m.timestamp || (m as any).createdAt || new Date().toISOString(),
        movementType: m.movementType,
        primaryProductName,
        primarySku,
        additionalProducts,
        allProducts,
        totalProductsCount,
        locationName,
        targetLocationName,
        locationCode,
        deltaDisplay,
        runningBalance,
        referenceId: m.referenceId || '',
        referenceType: m.referenceType || (isDraftDeleted ? 'Deleted Draft' : 'Transaction'),
        reasonText: cleanReason,
        operatorInfo,
      });
    }

    return events;
  }, [ledger, products, locations, searchQuery, typeFilter, selectedLocationId]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, selectedLocationId, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = processedEvents.slice(startIndex, startIndex + pageSize);

  // CSV Export (Full Audit Export)
  const exportLedgerCSV = () => {
    const headers = [
      'Timestamp',
      'MovementType',
      'PrimarySKU',
      'PrimaryProduct',
      'TotalProductsInEvent',
      'Location',
      'TargetLocation',
      'DeltaQuantity',
      'RunningBalance',
      'ReferenceId',
      'ReasonCode',
      'OperatorRole',
      'OperatorName',
      'OperatorEmail',
    ];

    const rows = processedEvents.map((ev) => [
      `"${ev.timestamp}"`,
      `"${ev.movementType}"`,
      `"${ev.primarySku}"`,
      `"${ev.primaryProductName.replace(/"/g, '""')}"`,
      ev.totalProductsCount,
      `"${ev.locationName}"`,
      `"${ev.targetLocationName || ''}"`,
      `"${ev.deltaDisplay.qtyText}"`,
      `"${ev.runningBalance}"`,
      `"${ev.referenceId}"`,
      `"${ev.reasonText.replace(/"/g, '""')}"`,
      `"${ev.operatorInfo.role}"`,
      `"${ev.operatorInfo.name}"`,
      `"${ev.operatorInfo.email}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `invenza-ledger-audit-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-2">
      <PageMeta
        title="Stock Movement Ledger | Invenza Immutable Audit"
        description="Enterprise double-entry movement ledger stream tracking every receipt, dispatch, transfer, and physical count reconciliation."
        canonicalPath="/ledger"
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Stock Movement Ledger
            </h1>
            <span className="flex items-center gap-1 rounded font-mono text-[10px] font-bold bg-teal-500/10 px-2 py-0.5 text-teal-700 dark:text-teal-400 border border-teal-500/20">
              <IconShieldCheck className="h-3.5 w-3.5" /> Immutable Audit Stream
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Every inventory receipt, depletion, adjustment, and transfer is cryptographically timestamped and recorded.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={exportLedgerCSV}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-subtle"
          >
            <IconDownload className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Export Ledger Audit (CSV)
          </button>
        </div>
      </div>

      {/* Filter and Quick Search Bar */}
      <div className="relative z-30 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-2.5 sm:p-3 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Box (Left Aligned) */}
        <div className="relative w-full sm:w-80 md:w-96 max-w-md shrink min-w-[200px]">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by SKU, Product, Reference #, Actor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-7 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Clear search"
            >
              <IconX className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Movement Stream Dropdown (Right Aligned) */}
        <div className="flex items-center justify-end shrink-0">
          <StreamSelectDropdown
            options={STREAM_FILTER_OPTIONS}
            selectedStream={typeFilter}
            onSelect={(id) => setTypeFilter(id)}
            streamCounts={streamCounts}
            totalCount={totalStreamCount}
          />
        </div>
      </div>

      {/* Movement Ledger Stream Table (Strictly fits desktop viewport without horizontal scrolling) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card overflow-hidden">
        <div className="w-full overflow-hidden">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="h-10 py-0 px-3 w-[14%] align-middle text-left">Timestamp</th>
                <th className="h-10 py-0 px-3 w-[13%] align-middle text-left">Movement Type</th>
                <th className="h-10 py-0 px-3 w-[22%] align-middle text-left">Product / SKU</th>
                <th className="h-10 py-0 px-3 w-[11%] align-middle text-right">Delta Quantity</th>
                <th className="h-10 py-0 px-3 w-[11%] align-middle text-right">Running Balance</th>
                <th className="h-10 py-0 px-3 w-[16%] align-middle text-left">Reference / Order #</th>
                <th className="h-10 py-0 px-3 w-[13%] align-middle text-center">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconLayers className="h-8 w-8 text-slate-300 dark:text-slate-600 opacity-60" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {searchQuery || typeFilter !== 'all'
                          ? 'No movement ledger entries match your filter criteria.'
                          : 'No recorded ledger events found.'}
                      </span>
                      <p className="text-xs text-slate-400">
                        Stock receipts, order dispatches, transfers, and draft deletions will stream here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((ev) => {
                  const d = new Date(ev.timestamp);
                  const isDraftDeleted = ev.movementType === 'DRAFT_DELETED';

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEventForDetail(ev)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedEventForDetail(ev);
                        }
                      }}
                      className="h-[52px] hover:bg-slate-50/80 dark:hover:bg-[#161D2B] transition-colors cursor-pointer group select-none"
                    >
                      {/* 1. Timestamp (2 Lines: Date & Time) */}
                      <td className="h-[52px] py-1.5 px-3 align-middle text-left overflow-hidden">
                        <div className="h-full flex flex-col justify-center min-w-0">
                          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                            {d.toISOString().split('T')[0]}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                            {d.toTimeString().split(' ')[0]}
                          </span>
                        </div>
                      </td>

                      {/* 2. Movement Type (Badge & Context) */}
                      <td className="h-[52px] py-1.5 px-3 align-middle text-left overflow-hidden">
                        <div className="h-full flex flex-col justify-center min-w-0">
                          <div>
                            <MovementBadge type={ev.movementType as any} />
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                            {isDraftDeleted ? 'Audit Logged' : 'Physical Movement'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Product / SKU (Primary Name on Line 1; SKU + +N more on Line 2) */}
                      <td className="h-[52px] py-1.5 px-3 align-middle text-left overflow-hidden">
                        <div className="h-full flex flex-col justify-center min-w-0">
                          <span
                            className="font-medium text-slate-900 dark:text-white truncate text-xs leading-tight block group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors"
                            title={ev.primaryProductName}
                          >
                            {ev.primaryProductName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 leading-tight min-w-0">
                            <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 font-semibold truncate">
                              {ev.primarySku}
                            </span>
                            {ev.additionalProducts.length > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25 shrink-0">
                                +{ev.additionalProducts.length} more
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Delta Quantity */}
                      <td className="h-[52px] py-1.5 px-3 align-middle text-right overflow-hidden">
                        <div className="h-full flex flex-col justify-center items-end min-w-0">
                          <span className={`text-xs font-mono font-bold leading-tight truncate ${ev.deltaDisplay.colorClass}`}>
                            {ev.deltaDisplay.qtyText}
                          </span>
                          {ev.deltaDisplay.subText && (
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 leading-tight mt-0.5 truncate">
                              {ev.deltaDisplay.subText}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Running Balance */}
                      <td className="h-[52px] py-1.5 px-3 align-middle text-right overflow-hidden">
                        <div className="h-full flex flex-col justify-center items-end min-w-0">
                          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                            {ev.runningBalance}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-tight mt-0.5 truncate">
                            {isDraftDeleted ? 'audit' : 'in-stock'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Reference / Order # (Truncated with tooltip ONLY when overflowing) */}
                      <td className="h-[52px] py-1.5 px-3 align-middle text-left overflow-hidden">
                        <ReferenceCell referenceId={ev.referenceId} referenceType={ev.referenceType} />
                      </td>

                      {/* 7. Operator */}
                      <td className="h-[52px] py-1.5 px-3 align-middle text-center overflow-hidden">
                        <div className="h-full flex items-center justify-center min-w-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${ev.operatorInfo.badgeColor} whitespace-nowrap`}
                          >
                            {ev.operatorInfo.role}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Shared Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={processedEvents.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="ledger events"
        />
      </div>

      {/* Stock Movement Details Modal */}
      {selectedEventForDetail && (
        <Modal
          isOpen={!!selectedEventForDetail}
          onClose={() => setSelectedEventForDetail(null)}
          title="Stock Movement Details"
          subtitle={`Transaction: ${selectedEventForDetail.referenceId || selectedEventForDetail.id} • ${new Date(selectedEventForDetail.timestamp).toLocaleString()}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate mr-2">
                Entry ID: {selectedEventForDetail.id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEventForDetail(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-sans">
            {/* 4 Summary Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Movement Type
                </span>
                <div className="pt-0.5">
                  <MovementBadge type={selectedEventForDetail.movementType as any} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">
                  {selectedEventForDetail.movementType === 'DRAFT_DELETED' ? 'Audit Logged' : 'Physical Movement'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Delta Quantity
                </span>
                <span className={`text-base font-mono font-bold block ${selectedEventForDetail.deltaDisplay.colorClass}`}>
                  {selectedEventForDetail.deltaDisplay.qtyText}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  {selectedEventForDetail.deltaDisplay.subText || (selectedEventForDetail.deltaDisplay.sign === '+' ? 'Inbound inflow' : selectedEventForDetail.deltaDisplay.sign === '-' ? 'Outbound deduction' : 'Zero variance')}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Running Balance
                </span>
                <span className="text-base font-mono font-bold text-slate-900 dark:text-white block">
                  {selectedEventForDetail.runningBalance}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Stock after event
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Facility Node
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate" title={selectedEventForDetail.locationName}>
                  {selectedEventForDetail.locationName}
                </span>
                {selectedEventForDetail.targetLocationName ? (
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 block truncate mt-0.5 font-medium">
                    → {selectedEventForDetail.targetLocationName}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    Code: {selectedEventForDetail.locationCode}
                  </span>
                )}
              </div>
            </div>

            {/* Transaction & Audit Reference Box */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] p-3.5 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Transaction Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Reference / Order #</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedEventForDetail.referenceId || 'Direct / None'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Reference Protocol</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedEventForDetail.referenceType}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block">Reason / Audit Context</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedEventForDetail.reasonText}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Local Timestamp</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {new Date(selectedEventForDetail.timestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Exact ISO Timestamp</span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                    {selectedEventForDetail.timestamp}
                  </span>
                </div>
              </div>
            </div>

            {/* Transacted Products List */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Transacted Products ({selectedEventForDetail.allProducts.length})
                </span>
                <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-bold">
                  Primary SKU: {selectedEventForDetail.primarySku}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-800">
                {selectedEventForDetail.allProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-[#131924] transition-colors">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                        SKU: {p.sku || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {p.qty} {p.unitOfMeasure || 'pcs'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operator & Security Audit */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Operator & Security Audit
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${selectedEventForDetail.operatorInfo.badgeColor}`}>
                  {selectedEventForDetail.operatorInfo.role}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Operator Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedEventForDetail.operatorInfo.name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Operator Email</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedEventForDetail.operatorInfo.email || 'system@invenza.internal'}
                  </span>
                </div>
                <div className="sm:col-span-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Session Mode:{' '}
                  {selectedEventForDetail.operatorInfo.isSystem
                    ? 'Deterministic automated system process'
                    : 'Authenticated role-based user action'}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
