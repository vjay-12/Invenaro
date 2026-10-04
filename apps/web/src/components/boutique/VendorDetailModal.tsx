import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  IconBuilding,
  IconPhone,
  IconMail,
  IconMapPin,
  IconFileText,
  IconClock,
  IconCheckCircle2,
  IconPlus,
  IconEdit,
  IconRefreshCw,
  IconPackage,
  IconWarehouse,
} from '../icons';
import { api } from '../../services/api';
import { Vendor, PurchaseOrder } from '../../types/inventory';
import { useInventory } from '../../context/InventoryContext';

interface VendorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onEdit: (vendor: Vendor) => void;
  onCreatePO?: (vendor: Vendor) => void;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onEdit,
  onCreatePO,
}) => {
  const { formatCurrency, purchaseOrders: contextPOs } = useInventory();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview');
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(vendor);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (vendor && isOpen) {
      setVendorDetails(vendor);
      setIsLoading(true);
      api.getVendor(vendor.id)
        .then((data) => {
          if (data && data.id) {
            setVendorDetails(data);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch full vendor details:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [vendor, isOpen]);

  if (!vendorDetails) return null;

  // Combine backend-provided purchase_orders or fallback to context POs matching supplier
  const relatedPOs: any[] = (vendorDetails.purchase_orders && vendorDetails.purchase_orders.length > 0)
    ? vendorDetails.purchase_orders
    : contextPOs.filter(
        (po) =>
          po.supplierId === vendorDetails.id ||
          (po.supplierName && po.supplierName.toLowerCase() === vendorDetails.name.toLowerCase())
      );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vendor Profile: ${vendorDetails.name}`}
      subtitle="Complete supplier credentials, boutique material specifications, and purchase orders"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-lg border border-teal-500/20">
              {vendorDetails.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {vendorDetails.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    vendorDetails.is_active !== false
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                  }`}
                >
                  {vendorDetails.is_active !== false ? 'Active' : 'Archived'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-teal-700 dark:text-teal-400">
                  {vendorDetails.vendor_type || vendorDetails.category || 'Fabric Supplier'}
                </span>
                {vendorDetails.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <IconMapPin className="w-3 h-3 text-slate-400" />
                      {vendorDetails.city}{vendorDetails.state ? `, ${vendorDetails.state}` : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onCreatePO && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreatePO(vendorDetails);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>New PO</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(vendorDetails);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <IconEdit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2 transition-colors relative ${
              activeTab === 'overview'
                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Vendor Details & Contacts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Purchase Orders & History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono font-bold">
              {relatedPOs.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Overview & Details */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card A: Contact Information */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <IconPhone className="w-3.5 h-3.5 text-teal-600" />
                  <span>Contact Information</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contact Person</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {vendorDetails.contact_person || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phone Number</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {vendorDetails.phone || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email Address</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {vendorDetails.email || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card B: Location & Address */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <IconMapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>Address & Tax Information</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Street Address</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {vendorDetails.address || 'Not specified'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">City</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {vendorDetails.city || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">State</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {vendorDetails.state || 'Tamil Nadu'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">GSTIN / Tax ID</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {vendorDetails.gstin || 'Unregistered / None'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {vendorDetails.notes && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <IconFileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>Notes & Special Terms</span>
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {vendorDetails.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Purchase Orders History */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                <span>Loading purchase orders...</span>
              </div>
            ) : relatedPOs.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <IconPackage className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No Purchase Orders Placed Yet
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  When you issue purchase orders to {vendorDetails.name}, receipts, stock increases, and invoice history will appear here.
                </p>
                {onCreatePO && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreatePO(vendorDetails);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors mt-2"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                    <span>Create Purchase Order</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="w-[25%] py-2.5 px-3 font-bold">PO Number</th>
                      <th className="w-[20%] py-2.5 px-3 font-bold">Date</th>
                      <th className="w-[25%] py-2.5 px-3 font-bold">Godown Destination</th>
                      <th className="w-[15%] py-2.5 px-3 font-bold text-right">Total Amount</th>
                      <th className="w-[15%] py-2.5 px-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {relatedPOs.map((po) => {
                      const poNum = po.po_number || po.poNumber;
                      const dateStr = po.order_date || po.orderDate || '';
                      const godown = po.godown_name || po.targetLocationName || 'Main Godown';
                      const grandTotal = Number(po.grand_total ?? po.total_amount ?? po.totalAmount ?? 0);
                      const isReceived = po.status === 'RECEIVED' || po.status === 'received' || po.status === 'completed';

                      return (
                        <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-[#161D2B] transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                            {poNum}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {dateStr.split('T')[0]}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate">
                            <span className="flex items-center gap-1">
                              <IconWarehouse className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{godown}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(grandTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isReceived ? (
                              <span className="inline-flex items-center gap-1 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-0.5">
                                <IconCheckCircle2 className="w-3 h-3 text-emerald-600" /> Received
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-2 py-0.5">
                                <IconClock className="w-3 h-3 text-amber-600" /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
