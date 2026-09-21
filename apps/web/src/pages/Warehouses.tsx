import React, { useState } from 'react';
import {
  IconWarehouse,
  IconPlus,
  IconMapPin,
  IconCheck,
  IconSearch,
  IconEdit,
  IconAlertCircle,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { Modal } from '../components/common/Modal';
import { PageMeta } from '../components/common/PageMeta';
import { Location } from '../types/inventory';

export const Warehouses: React.FC = () => {
  const {
    locations,
    products,
    addLocation,
    updateLocation,
    selectedLocationId,
    setSelectedLocationId,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('10000');

  // Edit Warehouse State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCapacity, setEditCapacity] = useState('10000');
  const [editError, setEditError] = useState<string | null>(null);

  const filteredLocations = locations.filter((loc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.name.toLowerCase().includes(q) ||
      loc.code.toLowerCase().includes(q) ||
      (loc.address && loc.address.toLowerCase().includes(q))
    );
  });

  const handleAddWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    addLocation({
      name,
      code: code.toUpperCase().trim(),
      address,
      capacity: parseInt(capacity, 10) || 10000,
    });

    setIsAddModalOpen(false);
    setName('');
    setCode('');
    setAddress('');
  };

  const handleOpenEditModal = (loc: Location) => {
    setEditingLocationId(loc.id);
    setEditName(loc.name);
    setEditCode(loc.code);
    setEditAddress(loc.address || '');
    setEditCapacity(String(loc.capacity || 10000));
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocationId || !editName.trim() || !editCode.trim()) return;

    const normalizedCode = editCode.toUpperCase().trim();
    const duplicate = locations.find(
      (l) => l.id !== editingLocationId && l.code.toUpperCase() === normalizedCode
    );
    if (duplicate) {
      setEditError(`Warehouse code "${normalizedCode}" is already in use by another location.`);
      return;
    }

    updateLocation(editingLocationId, {
      name: editName.trim(),
      code: normalizedCode,
      address: editAddress.trim(),
      capacity: parseInt(editCapacity, 10) || 10000,
    });

    setIsEditModalOpen(false);
    setEditingLocationId(null);
  };

  return (
    <div className="space-y-6">
      <PageMeta
        title="Warehouses & Storage Locations | Invenza Inventory"
        description="Multi-warehouse distribution network management, storage capacity utilization, and location-filtered inventory tracking."
        canonicalPath="/warehouses"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Multi-Warehouse & Storage Locations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Architected for multi-location operations. Track real-time distribution and capacity utilization.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-subtle transition-colors self-start sm:self-auto"
        >
          <IconPlus className="h-4 w-4" />
          Add Warehouse Location
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search warehouse by name, code, or address..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {filteredLocations.length} of {locations.length} locations
        </span>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLocations.map((loc) => {
          // Total items in this warehouse (guaranteed non-negative)
          const totalUnits = Math.max(
            0,
            products.reduce(
              (sum, p) => sum + Math.max(0, p.locationStock[loc.id] || 0),
              0
            )
          );
          const activeSKUsCount = products.filter(
            (p) => (p.locationStock[loc.id] || 0) > 0
          ).length;
          const capacityPercent = Math.min(
            100,
            Math.max(0, Math.round((totalUnits / (loc.capacity || 10000)) * 100))
          );
          const isCurrentActive = selectedLocationId === loc.id;

          return (
            <div
              key={loc.id}
              className={`rounded-xl border bg-white dark:bg-[#131924] p-5 shadow-card flex flex-col justify-between transition-all ${
                isCurrentActive
                  ? 'border-teal-600 ring-2 ring-teal-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                      <IconWarehouse className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{loc.name}</div>
                      <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400">
                        {loc.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(loc)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit warehouse details"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                    </button>
                    <span className="inline-flex items-center gap-1 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-0.5">
                      <IconCheck className="h-3 w-3" /> Active
                    </span>
                  </div>
                </div>

                {loc.address && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <IconMapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{loc.address}</span>
                  </div>
                )}

                {/* Metrics */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div>
                    <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Stored Units</div>
                    <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      {totalUnits} pcs
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Distinct SKUs</div>
                    <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      {activeSKUsCount}
                    </div>
                  </div>
                </div>

                {/* Capacity Meter */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Capacity Utilization</span>
                    <span className="font-mono">{capacityPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all duration-300"
                      style={{ width: `${Math.max(4, capacityPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0</span>
                    <span>Max {loc.capacity || 10000}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLocationId(isCurrentActive ? 'all' : loc.id)
                  }
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                    isCurrentActive
                      ? 'bg-teal-700 text-white shadow-subtle'
                      : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isCurrentActive ? 'Active Filter Applied (Click to Clear)' : 'Filter System to this Location'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Warehouse Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Warehouse Location"
        subtitle="Expands multi-location distribution network"
        maxWidth="md"
      >
        <form onSubmit={handleAddWarehouseSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Warehouse Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. South Texas Fulfillment Center"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Facility Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. STX-04"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Storage Capacity (Units)
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Street Address & Postal Code
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 Industrial Parkway, Austin, TX"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
            >
              Add Warehouse
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLocationId(null);
        }}
        title="Edit Warehouse Details"
        subtitle="Update facility naming, code identifier, physical address, or storage capacity."
        maxWidth="md"
      >
        <form onSubmit={handleEditWarehouseSubmit} className="space-y-4">
          {editError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs border border-rose-500/20 font-medium">
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Warehouse Facility Name *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Facility Code *
              </label>
              <input
                type="text"
                required
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Capacity (Units)
              </label>
              <input
                type="number"
                min="1"
                required
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Physical Street Address / Hub Location
            </label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingLocationId(null);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
