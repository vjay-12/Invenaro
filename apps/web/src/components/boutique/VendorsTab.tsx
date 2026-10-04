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
import { VendorModal } from './VendorModal';
import { Pagination } from '../common/Pagination';

interface VendorsTabProps {
  onSelectVendorForPO?: (vendor: Vendor) => void;
}

const CATEGORIES = [
  'All Categories',
  'Fabric & Textiles',
  'Trims & Lace',
  'Embroidery & Zari',
  'Tailoring Accessories',
  'Buttons & Zippers',
  'Dyeing & Printing',
  'Packaging & Delivery',
  'General',
];

export const VendorsTab: React.FC<VendorsTabProps> = ({ onSelectVendorForPO }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const data = await api.getVendors(
        searchQuery || undefined,
        selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      setVendors(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [selectedCategory, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleToggleArchive = async (vendor: Vendor) => {
    try {
      if (vendor.is_active) {
        await api.archiveVendor(vendor.id);
      } else {
        await api.updateVendor(vendor.id, { is_active: true });
      }
      fetchVendors();
    } catch (err: any) {
      console.error('Failed to toggle vendor status:', err);
    }
  };

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.contact_person?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q)
    );
  }, [vendors, searchQuery]);

  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search & Category Filter */}
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name, contact person, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </form>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
          <table className="w-full text-left text-xs table-fixed min-w-[760px]">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="w-[28%] py-3 px-3 font-bold">Vendor / Supplier</th>
                <th className="w-[18%] py-3 px-3 font-bold">Category</th>
                <th className="w-[22%] py-3 px-3 font-bold">Contact Details</th>
                <th className="w-[18%] py-3 px-3 font-bold">Location / Address</th>
                <th className="w-[14%] py-3 px-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Loading vendors...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
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
                    className="h-[52px] hover:bg-slate-50 dark:hover:bg-[#161D2B] transition-colors"
                  >
                    {/* Name */}
                    <td className="py-2.5 px-3 overflow-hidden align-middle">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20">
                          {vendor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
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

                    {/* Category */}
                    <td className="py-2.5 px-3 overflow-hidden align-middle">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-full">
                        {vendor.category || 'General'}
                      </span>
                    </td>

                    {/* Contact Person & Phone */}
                    <td className="py-2.5 px-3 overflow-hidden align-middle">
                      <div className="min-w-0 space-y-0.5">
                        {vendor.contact_person && (
                          <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                            {vendor.contact_person}
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate">
                            <IconPhone className="w-3 h-3 shrink-0" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] truncate">
                            <IconMail className="w-3 h-3 shrink-0" />
                            <span>{vendor.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-2.5 px-3 overflow-hidden align-middle">
                      <div className="text-slate-700 dark:text-slate-300 text-[11px] truncate" title={vendor.address || ''}>
                        {vendor.address || '—'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right overflow-hidden align-middle">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setVendorToEdit(vendor);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit vendor details"
                        >
                          <IconEdit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleArchive(vendor)}
                          className={`p-1.5 rounded transition-colors ${
                            vendor.is_active
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={vendor.is_active ? 'Archive vendor' : 'Restore vendor'}
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
    </div>
  );
};
