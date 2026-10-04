import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  IconPlus,
  IconCheck,
  IconAlertCircle,
  IconRefreshCw,
  IconFileText,
  IconSlidersHorizontal,
} from '../icons';
import { api } from '../../services/api';
import {
  MeasurementTemplate,
  CustomerMeasurementProfile,
  CustomerMeasurementVersion,
} from '../../types/inventory';

interface AddMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSaved: () => void;
  // If editing an existing profile, pass it here to create a new version:
  existingProfile?: CustomerMeasurementProfile | null;
}

interface FieldValueState {
  field_name: string;
  field_code: string;
  field_id?: string;
  num_value: string;
  unit: string;
  notes: string;
  is_required: boolean;
  field_type: 'numeric' | 'text';
}

export const AddMeasurementModal: React.FC<AddMeasurementModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSaved,
  existingProfile,
}) => {
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('');
  const [profileNotes, setProfileNotes] = useState<string>('');
  const [measuredBy, setMeasuredBy] = useState<string>('');
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [fields, setFields] = useState<FieldValueState[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load templates on mount / modal open
  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const data = await api.getMeasurementTemplates();
        setTemplates(data || []);

        if (existingProfile) {
          setProfileName(existingProfile.profile_name);
          setProfileNotes(existingProfile.notes || '');
          setSelectedTemplateId(existingProfile.template_id || '');

          // Populate fields from current_version if available
          const currentVer = existingProfile.current_version;
          if (currentVer?.values && currentVer.values.length > 0) {
            setFields(
              currentVer.values.map((v) => ({
                field_name: v.field_name,
                field_code: v.field_code,
                field_id: v.field_id || undefined,
                num_value: v.num_value !== null && v.num_value !== undefined ? String(v.num_value) : '',
                unit: v.unit || 'in',
                notes: v.notes || '',
                is_required: false,
                field_type: 'numeric',
              }))
            );
          }
        } else if (data && data.length > 0) {
          // Default to first template (usually Saree Blouse)
          const first = data[0];
          setSelectedTemplateId(first.id);
          setProfileName(first.name);
          populateFieldsFromTemplate(first);
        }
      } catch (err: any) {
        console.error('Failed to load templates:', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [isOpen, existingProfile]);

  const populateFieldsFromTemplate = (tmpl: MeasurementTemplate) => {
    if (!tmpl.fields || tmpl.fields.length === 0) {
      setFields([]);
      return;
    }
    setFields(
      tmpl.fields
        .filter((f) => f.is_active !== false)
        .map((f) => ({
          field_name: f.name,
          field_code: f.code,
          field_id: f.id,
          num_value: '',
          unit: f.default_unit || 'in',
          notes: '',
          is_required: f.is_required,
          field_type: f.field_type || 'numeric',
        }))
    );
  };

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      if (!existingProfile) {
        setProfileName(tmpl.name);
      }
      populateFieldsFromTemplate(tmpl);
    }
  };

  const handleFieldChange = (index: number, key: keyof FieldValueState, value: any) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!profileName.trim()) {
      setErrorMessage('Profile name is required (e.g. Saree Blouse, Churidar)');
      return;
    }

    try {
      // Validate fields
      const formattedValues = fields.map((f, i) => {
        const parsedNum = f.num_value.trim() !== '' ? parseFloat(f.num_value.trim()) : null;
        if (f.num_value.trim() !== '' && (isNaN(parsedNum!) || parsedNum! < 0)) {
          throw new Error(`Invalid measurement value for "${f.field_name}". Must be a valid positive number.`);
        }
        return {
          field_id: f.field_id,
          field_name: f.field_name,
          field_code: f.field_code,
          num_value: parsedNum,
          unit: f.unit || 'in',
          text_value: f.field_type === 'text' ? f.num_value : undefined,
          notes: f.notes.trim() || undefined,
          display_order: i + 1,
        };
      });

      setIsSubmitting(true);

      if (existingProfile) {
        // Record a new version (Non-destructive!)
        await api.addCustomerMeasurementVersion(customerId, existingProfile.id, {
          measured_by: measuredBy.trim() || undefined,
          notes: versionNotes.trim() || profileNotes.trim() || undefined,
          values: formattedValues,
        });
      } else {
        // Create brand new profile with initial v1
        await api.createCustomerMeasurementProfile(customerId, {
          template_id: selectedTemplateId || undefined,
          profile_name: profileName.trim(),
          notes: profileNotes.trim() || undefined,
          measured_by: measuredBy.trim() || undefined,
          values: formattedValues,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save measurements:', err);
      setErrorMessage(err.message || 'Failed to save customer measurements');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingProfile ? `New Measurement Version: ${existingProfile.profile_name}` : 'Record Customer Measurements'}
      subtitle={`Customer: ${customerName} • ${existingProfile ? `Version ${(existingProfile.current_version?.version_number || 1) + 1}` : 'Initial Profile v1'}`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs">
            <IconAlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile & Template Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Measurement Template *
            </label>
            <select
              value={selectedTemplateId}
              disabled={Boolean(existingProfile) || isLoadingTemplates}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:opacity-60"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.category ? `(${t.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Garment Profile Name *
            </label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Saree Blouse, Reception Kurti"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        {/* Tailor & Version Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Measured By / Master Tailor
            </label>
            <input
              type="text"
              value={measuredBy}
              onChange={(e) => setMeasuredBy(e.target.value)}
              placeholder="e.g. Master Ramesh, Smt. Geetha"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Fitting Notes / Customer Preferences
            </label>
            <input
              type="text"
              value={profileNotes}
              onChange={(e) => setProfileNotes(e.target.value)}
              placeholder="e.g. Add 0.5 inch loose, deep back neck, prefer elbow sleeve"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        {/* Measurement Fields Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <IconSlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
            <span>Garment Measurements ({fields.length} parameters)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Default unit: Inches (in) • Metric (cm) supported
          </span>
        </div>

        {/* Responsive Two-Column Layout for Measurement Fields */}
        <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3">
          {isLoadingTemplates ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span>Loading template fields...</span>
            </div>
          ) : fields.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No fields configured for this template.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((f, idx) => (
                <div
                  key={`${f.field_code}-${idx}`}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-xs hover:border-teal-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {f.field_name} {f.is_required && <span className="text-rose-500">*</span>}
                    </label>
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                      {f.field_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Measurement Input */}
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.125"
                        min="0"
                        placeholder="0.0"
                        value={f.num_value}
                        onChange={(e) => handleFieldChange(idx, 'num_value', e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600 text-right pr-2"
                      />
                    </div>

                    {/* Unit Selector */}
                    <select
                      value={f.unit}
                      onChange={(e) => handleFieldChange(idx, 'unit', e.target.value)}
                      className="w-20 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      <option value="in">in (inch)</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>

                  {/* Inline field note */}
                  <input
                    type="text"
                    placeholder="Specific note (e.g. 0.5 loose, cut 1 in down)"
                    value={f.notes}
                    onChange={(e) => handleFieldChange(idx, 'notes', e.target.value)}
                    className="w-full mt-1.5 rounded border border-slate-100 dark:border-slate-800/80 bg-transparent px-2 py-1 text-[11px] text-slate-600 dark:text-slate-400 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preserves non-destructive history with automatic version incrementing.</span>
          </div>

          <div className="flex items-center gap-2">
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
                  <span>Save Measurement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
