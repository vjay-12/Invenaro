import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  IconCheck,
  IconAlertCircle,
  IconRefreshCw,
  IconBuilding,
  IconPhone,
  IconMail,
  IconMapPin,
  IconFileText,
} from '../icons';
import { api } from '../../services/api';
import { Vendor } from '../../types/inventory';
import { StateSelectDropdown } from '../common/StateSelectDropdown';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  vendorToEdit?: Vendor | null;
}

export const VENDOR_TYPES = [
  'Fabric Supplier',
  'Lining Supplier',
  'Thread Supplier',
  'Button Supplier',
  'Zipper Supplier',
  'Lace / Border Supplier',
  'Embroidery',
  'Printing / Dyeing',
  'Accessories',
  'Other',
] as const;

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  vendorToEdit,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [vendorType, setVendorType] = useState<string>(VENDOR_TYPES[0]);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [stateCode, setStateCode] = useState('33');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (vendorToEdit) {
      setName(vendorToEdit.name || '');
      setCode(vendorToEdit.code || '');
      setVendorType(vendorToEdit.vendor_type || vendorToEdit.category || VENDOR_TYPES[0]);
      setContactPerson(vendorToEdit.contact_person || '');
      setPhone(vendorToEdit.phone || '');
      setEmail(vendorToEdit.email || '');
      setAddress(vendorToEdit.address || '');
      setCity(vendorToEdit.city || '');
      setState(vendorToEdit.state || 'Tamil Nadu');
      setStateCode(vendorToEdit.state_code || '33');
      setGstin(vendorToEdit.gstin || '');
      setNotes(vendorToEdit.notes || '');
      setIsActive(vendorToEdit.is_active !== false);
      setOpeningBalance(Number(vendorToEdit.opening_balance || 0));
    } else {
      setName('');
      setCode('');
      setVendorType(VENDOR_TYPES[0]);
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCity('');
      setState('Tamil Nadu');
      setStateCode('33');
      setGstin('');
      setNotes('');
      setIsActive(true);
      setOpeningBalance(0);
    }
    setErrorMessage(null);
  }, [vendorToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Vendor name is required');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        vendor_type: vendorType,
        category: vendorType,
        contact_person: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        state_code: stateCode.trim() || undefined,
        gstin: gstin.trim() || undefined,
        notes: notes.trim() || undefined,
        opening_balance: openingBalance,
        is_active: isActive,
      };

      if (vendorToEdit) {
        await api.updateVendor(vendorToEdit.id, payload);
      } else {
        await api.createVendor(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save vendor:', err);
      setErrorMessage(err.message || 'Failed to save vendor details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vendorToEdit ? `Edit Vendor: ${vendorToEdit.name}` : 'Add Boutique Supplier / Vendor'}
      subtitle="Manages suppliers for fabrics, laces, trims, and boutique tailoring materials"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs">
            <IconAlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Basic Identifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vendor / Supplier Legal Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sri Lakshmi Textiles, Kaveri Fabrics"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vendor Type *
            </label>
            <select
              value={vendorType}
              onChange={(e) => setVendorType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              {VENDOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Meenakshi, Ramesh"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98450 12345"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sales@lakshmitextiles.in"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        {/* Section 3: Location Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 14 Katpadi Road, Near Old Bus Stand"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Vellore, Chennai, Erode"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              State
            </label>
            <StateSelectDropdown
              selectedCode={stateCode}
              onSelect={(code, sName) => {
                setStateCode(code);
                setState(sName);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              GSTIN / Tax ID
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 33AAAAA0000A1Z5"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        {/* Section 4: Notes & Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Fabrics Supplied / Credit Terms
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Pure raw silk, organza, Banarasi zari border supplier; 15-day credit"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="vendor-active-toggle"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
          />
          <label htmlFor="vendor-active-toggle" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            Active Vendor (available for new purchase orders)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <IconRefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <IconCheck className="w-3.5 h-3.5" />
                <span>Save Vendor</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
