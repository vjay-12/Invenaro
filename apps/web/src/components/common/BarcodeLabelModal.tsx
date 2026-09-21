import React, { useRef } from 'react';
import { Modal } from './Modal';
import { Product } from '../../types/inventory';
import {
  IconPrinter as Printer,
  IconCopy as Copy,
  IconCheck as Check,
} from '../icons';
import { useInventory } from '../../context/InventoryContext';

interface BarcodeLabelModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { formatCurrency } = useInventory();
  const [copied, setCopied] = React.useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!product) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(product.barcode || product.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate SVG Code128 pattern simulation based on digits/characters
  const generateBarcodeBars = (code: string) => {
    const bars: boolean[] = [];
    const seed = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < 65; i++) {
      bars.push(((seed * (i + 1) * 31) % 7) > 2);
    }
    return bars;
  };

  const bars = generateBarcodeBars(product.barcode || product.sku);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode Label Generator"
      subtitle={`Print warehouse shelf & asset tags for ${product.sku}`}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Printable Label Card Preview */}
        <div
          ref={printAreaRef}
          className="mx-auto w-full max-w-xs rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0C1017] p-5 text-center shadow-card"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
            <span>INVENZA ASSET TAG</span>
            <span>{product.unitOfMeasure.toUpperCase()}</span>
          </div>

          <div className="my-3 text-left">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{product.name}</h4>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-mono text-teal-700 dark:text-teal-400 font-bold">{product.sku}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(product.sellPrice, product.currency)}</span>
            </div>
          </div>

          {/* SVG Barcode Bars */}
          <div className="flex h-16 items-center justify-center gap-[2px] bg-white p-2 rounded border border-slate-200 dark:border-slate-700">
            {bars.map((isBar, idx) => (
              <div
                key={idx}
                className={`h-full ${isBar ? 'w-[3px] bg-black' : 'w-[2px] bg-transparent'}`}
              />
            ))}
          </div>

          {/* Numeric barcode string */}
          <div className="mt-2 font-mono text-xs tracking-widest text-slate-700 dark:text-slate-300 font-bold">
            {product.barcode || 'NO-BARCODE-DEFINED'}
          </div>

          {/* Batch / Storage Zone if present */}
          {(product.customFields?.batchNumber || product.customFields?.storageZone) && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-[10px] text-slate-400 font-mono">
              <span>Lot: {product.customFields.batchNumber || 'N/A'}</span>
              <span>Zone: {product.customFields.storageZone || 'Standard'}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopyBarcode}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied Barcode' : 'Copy Barcode'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print Label
          </button>
        </div>
      </div>
    </Modal>
  );
};
