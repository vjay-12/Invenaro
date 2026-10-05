import React, { useState, useEffect, useMemo } from 'react';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconArchive,
  IconRefreshCw,
  IconBuilding,
  IconPhone,
  IconMail,
  IconMapPin,
  IconCheckCircle2,
} from '../icons';
import { api } from '../../services/api';
import { Vendor } from '../../types/inventory';
import { VendorModal, VENDOR_TYPES } from './VendorModal';
import { VendorDetailModal } from './VendorDetailModal';
import { Pagination } from '../common/Pagination';

interface VendorsTabProps {
  onSelectVendorForPO?: (vendor: Vendor) => void;
}

export const VendorsTab: React.FC<VendorsTabProps> = ({ onSelectVendorForPO }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState<Vendor | null>(null);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const data = await api.getVendors(
        searchQuery || undefined,
        selectedType !== 'All Types' ? selectedType : undefined,
        statusFilter
      );
      setVendors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [selectedType, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleToggleArchive = async (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    const willBeActive = !vendor.is_active;

    // Optimistically update vendor in local list
    setVendors((prev) =>
      prev.map((v) => (v.id === vendor.id ? { ...v, is_active: willBeActive } : v))
    );

    try {
      if (vendor.is_active) {
        await api.archiveVendor(vendor.id);
      } else {
        await api.restoreVendor(vendor.id);
      }
      await fetchVendors();
    } catch (err: any) {
      console.error('Failed to toggle vendor status:', err);
      // Revert optimistic update
      setVendors((prev) =>
        prev.map((v) => (v.id === vendor.id ? { ...v, is_active: vendor.is_active } : v))
      );
      fetchVendors();
    }
  };

  const handleOpenDetail = (vendor: Vendor) => {
    setSelectedVendorForDetail(vendor);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    setVendorToEdit(vendor);
    setIsModalOpen(true);
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      // 1. Status Filter
      if (statusFilter === 'active' && v.is_active === false) return false;
      if (statusFilter === 'archived' && v.is_active !== false) return false;

      // 2. Vendor Type Filter
      if (
        selectedType !== 'All Types' &&
        v.vendor_type !== selectedType &&
        v.category !== selectedType
      ) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          v.name?.toLowerCase().includes(q) ||
          v.contact_person?.toLowerCase().includes(q) ||
          v.phone?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q) ||
          v.gstin?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q) ||
          v.state?.toLowerCase().includes(q) ||
          v.vendor_type?.toLowerCase().includes(q) ||
          v.category?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [vendors, statusFilter, selectedType, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, statusFilter]);

  const start = (currentPage - 1) * pageSize;
  const paginatedVendors = filteredVendors.slice(start, start + pageSize);

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search & Category Filter */}
        <div className="flex flex-1 items-center gap-2 max-w-2xl flex-wrap sm:flex-nowrap">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name, phone, email, GSTIN, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </form>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="All Types">All Types</option>
            {VENDOR_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="active">Active Only</option>
            <option value="archived">Archived</option>
            <option value="all">All Statuses</option>
          </select>

          <button
            type="button"
            onClick={fetchVendors}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Refresh vendors list"
          >
            <IconRefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add Vendor Button */}
        <button
          type="button"
          onClick={() => {
            setVendorToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors shrink-0"
        >
          <IconPlus className="w-3.5 h-3.5" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Vendors Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed min-w-[900px]">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="w-[22%] min-w-[170px] py-3 px-3 font-bold">Vendor Name</th>
                <th className="w-[15%] min-w-[130px] py-3 px-3 font-bold">Contact</th>
                <th className="w-[11%] min-w-[105px] py-3 px-2.5 font-bold">Phone</th>
                <th className="w-[12%] min-w-[110px] py-3 px-2.5 font-bold">Location</th>
                <th className="w-[13%] min-w-[120px] py-3 px-2.5 font-bold">Vendor Type</th>
                <th className="w-[13%] min-w-[125px] py-3 px-2 font-bold font-mono">GSTIN</th>
                <th className="w-[7%] min-w-[65px] py-3 px-2 font-bold text-center">Status</th>
                <th className="w-[7%] min-w-[75px] py-3 px-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Loading vendors...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <div className="space-y-1">
                      <IconBuilding className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No vendors found</p>
                      <p className="text-[11px] text-slate-400">
                        Add boutique fabric mills, trim wholesalers, and accessory suppliers.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => handleOpenDetail(vendor)}
                    className="h-[52px] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#161D2B] transition-colors group"
                    title="Click to view full vendor profile"
                  >
                    {/* Name */}
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
                      <div className="text-slate-800 dark:text-slate-200 font-medium truncate" title={vendor.contact_person || undefined}>
                        {vendor.contact_person || '—'}
                      </div>
                      {vendor.email && (
                        <div className="text-[10px] text-slate-400 truncate" title={vendor.email}>
                          {vendor.email}
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-2.5 overflow-hidden align-middle">
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate block" title={vendor.phone || undefined}>
                        {vendor.phone || '—'}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-2.5 overflow-hidden align-middle">
                      <div
                        className="text-slate-700 dark:text-slate-300 text-[11px] truncate"
                        title={vendor.address || `${vendor.city || ''} ${vendor.state || ''}`.trim() || undefined}
                      >
                        {vendor.city ? `${vendor.city}${vendor.state ? `, ${vendor.state}` : ''}` : (vendor.state || vendor.address || '—')}
                      </div>
                    </td>

                    {/* Vendor Type */}
                    <td className="py-2.5 px-2.5 overflow-hidden align-middle">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20 truncate max-w-full"
                        title={vendor.vendor_type || vendor.category || 'Fabric Supplier'}
                      >
                        {vendor.vendor_type || vendor.category || 'Fabric Supplier'}
                      </span>
                    </td>

                    {/* GSTIN */}
                    <td className="py-2.5 px-2 overflow-hidden align-middle">
                      <span
                        className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate block tracking-tight"
                        title={vendor.gstin || undefined}
                      >
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
                    <td className="py-2.5 px-3 text-right overflow-hidden align-middle">
                      <div className="inline-flex items-center justify-end gap-1">
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
      {isModalOpen && (
        <VendorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={fetchVendors}
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
            setIsModalOpen(true);
          }}
          onCreatePO={onSelectVendorForPO}
        />
      )}
    </div>
  );
};
