import React, { useState, useEffect, useMemo } from 'react';
import {
  IconBuilding,
  IconSearch,
  IconPlus,
  IconRefreshCw,
  IconEdit,
  IconEye,
  IconArchive,
  IconPhone,
  IconMail,
  IconMapPin,
  IconCheckCircle2,
  IconPackage,
} from '../components/icons';
import { api } from '../services/api';
import { Vendor } from '../types/inventory';
import { PageMeta } from '../components/common/PageMeta';
import { Pagination } from '../components/common/Pagination';
import { TabType } from '../components/layout/Sidebar';
import { VendorModal, VENDOR_TYPES } from '../components/boutique/VendorModal';
import { VendorDetailModal } from '../components/boutique/VendorDetailModal';

interface VendorsPageProps {
  onNavigate?: (tab: TabType, params?: Record<string, string>) => void;
}

export const Vendors: React.FC<VendorsPageProps> = ({ onNavigate }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState<Vendor | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const data = await api.getVendors(
        searchQuery || undefined,
        selectedType !== 'All Types' ? selectedType : undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      setVendors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
      showToast(err.message || 'Failed to load vendors', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [selectedType, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadVendors();
  };

  const handleToggleArchive = async (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (vendor.is_active) {
        await api.archiveVendor(vendor.id);
        showToast(`Vendor ${vendor.name} archived`);
      } else {
        await api.restoreVendor(vendor.id);
        showToast(`Vendor ${vendor.name} reactivated`);
      }
      loadVendors();
    } catch (err: any) {
      console.error('Failed to update vendor status:', err);
      showToast('Failed to update status', 'error');
    }
  };

  const handleOpenDetail = (vendor: Vendor) => {
    setSelectedVendorForDetail(vendor);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVendorToEdit(vendor);
    setIsAddEditOpen(true);
  };

  const handleCreatePOForVendor = (vendor: Vendor) => {
    if (onNavigate) {
      onNavigate('purchase_orders', { vendorId: vendor.id, vendorName: vendor.name });
    }
  };

  // Client-side quick filter
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.contact_person?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.gstin?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.state?.toLowerCase().includes(q) ||
        v.vendor_type?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q)
    );
  }, [vendors, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, statusFilter]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVendors = filteredVendors.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageMeta
        title="Vendors | Invenaro Boutique IMS"
        description="Manage boutique suppliers, fabric mills, trim wholesalers, and purchase order linkages."
        canonicalPath="/vendors"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-card text-xs font-semibold animate-in slide-in-from-bottom-2 ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-teal-700 text-white'
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
              <IconBuilding className="w-5 h-5" />
            </div>
            <span>Vendors</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Boutique suppliers, fabric mills, trim wholesalers, and purchase order linkages.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setVendorToEdit(null);
            setIsAddEditOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors shrink-0 self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Vendor Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <IconSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors by name, phone, email, GSTIN..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </form>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            {/* Vendor Type Filter Dropdown */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="All Types">All Types</option>
              {VENDOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'archived', label: 'Archived' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    statusFilter === pill.id
                      ? 'bg-teal-700 text-white font-bold shadow-subtle'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Sync Button */}
            <button
              type="button"
              onClick={loadVendors}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            >
              <IconRefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs table-fixed min-w-[850px]">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="w-[22%] py-3 px-3 font-bold">Vendor Name</th>
                <th className="w-[15%] py-3 px-3 font-bold">Contact</th>
                <th className="w-[13%] py-3 px-2.5 font-bold">Phone</th>
                <th className="w-[14%] py-3 px-2.5 font-bold">Location</th>
                <th className="w-[14%] py-3 px-2.5 font-bold">Vendor Type</th>
                <th className="w-[11%] py-3 px-2 font-bold font-mono">GSTIN</th>
                <th className="w-[8%] py-3 px-2 font-bold text-center">Status</th>
                <th className="w-[9%] py-3 px-2.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Loading vendors directory...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <div className="max-w-xs mx-auto space-y-2">
                      <IconBuilding className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No vendors found</p>
                      <p className="text-[11px] text-slate-500">
                        {searchQuery
                          ? 'Try adjusting your search criteria or category filter.'
                          : 'Add your boutique fabric suppliers, lace mills, and button wholesalers.'}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setVendorToEdit(null);
                            setIsAddEditOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors"
                        >
                          <IconPlus className="w-3.5 h-3.5" />
                          <span>Add Vendor</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => handleOpenDetail(vendor)}
                    className="h-[52px] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#161D2B] transition-colors group"
                    title="Click to view full vendor profile and purchase history"
                  >
                    {/* Vendor Name */}
                    <td className="py-2.5 px-3 overflow-hidden align-middle">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20">
                          {vendor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" title={vendor.name}>
                            {vendor.name}
                          </div>
                          {vendor.code && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              Code: {vendor.code}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="py-2.5 px-3 overflow-hidden align-middle">
                      <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                        {vendor.contact_person || '—'}
                      </div>
                      {vendor.email && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {vendor.email}
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-2.5 overflow-hidden align-middle">
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate block">
                        {vendor.phone || '—'}
                      </span>
                    </td>

                    {/* Location (City, State) */}
                    <td className="py-2.5 px-2.5 overflow-hidden align-middle">
                      <div className="text-slate-700 dark:text-slate-300 text-[11px] truncate" title={vendor.address || `${vendor.city || ''} ${vendor.state || ''}`}>
                        {vendor.city ? `${vendor.city}${vendor.state ? `, ${vendor.state}` : ''}` : (vendor.state || vendor.address || '—')}
                      </div>
                    </td>

                    {/* Vendor Type */}
                    <td className="py-2.5 px-2.5 overflow-hidden align-middle">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20 truncate max-w-full">
                        {vendor.vendor_type || vendor.category || 'Fabric Supplier'}
                      </span>
                    </td>

                    {/* GSTIN */}
                    <td className="py-2.5 px-2 overflow-hidden align-middle">
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate block">
                        {vendor.gstin || '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-2 text-center overflow-hidden align-middle">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          vendor.is_active !== false
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                        }`}
                      >
                        {vendor.is_active !== false ? 'Active' : 'Archived'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2.5 text-right overflow-hidden align-middle">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(vendor);
                          }}
                          className="p-1.5 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View vendor details & purchase orders"
                        >
                          <IconEye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(vendor, e)}
                          className="p-1.5 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit vendor details"
                        >
                          <IconEdit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleArchive(vendor, e)}
                          className={`p-1.5 rounded transition-colors ${
                            vendor.is_active !== false
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={vendor.is_active !== false ? 'Archive vendor' : 'Restore vendor'}
                        >
                          <IconArchive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredVendors.length > pageSize && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredVendors.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="vendors"
            />
          </div>
        )}
      </div>

      {/* Add / Edit Vendor Modal */}
      {isAddEditOpen && (
        <VendorModal
          isOpen={isAddEditOpen}
          onClose={() => setIsAddEditOpen(false)}
          onSaved={loadVendors}
          vendorToEdit={vendorToEdit}
        />
      )}

      {/* Vendor Profile & PO History Detail Modal */}
      {isDetailOpen && (
        <VendorDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          vendor={selectedVendorForDetail}
          onEdit={(vend) => {
            setVendorToEdit(vend);
            setIsAddEditOpen(true);
          }}
          onCreatePO={handleCreatePOForVendor}
        />
      )}
    </div>
  );
};
export default Vendors;
