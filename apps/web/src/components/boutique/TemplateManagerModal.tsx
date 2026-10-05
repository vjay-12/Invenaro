import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  IconPlus,
  IconCheck,
  IconAlertCircle,
  IconRefreshCw,
  IconSlidersHorizontal,
  IconLayers,
} from '../icons';
import { api } from '../../services/api';
import { MeasurementTemplate, MeasurementTemplateField } from '../../types/inventory';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesUpdated?: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  onTemplatesUpdated,
}) => {
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Template form state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('WOMEN');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  // New Field form state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState<'in' | 'cm'>('in');
  const [isSavingField, setIsSavingField] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMeasurementTemplates();
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId((prev) => {
          if (prev && data.some((t: MeasurementTemplate) => t.id === prev)) {
            return prev;
          }
          return data[0].id;
        });
      }
    } catch (err: any) {
      console.error('Failed to load measurement templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    setErrorMessage(null);
    try {
      const code = newTemplateName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const created = await api.createMeasurementTemplate({
        name: newTemplateName.trim(),
        code,
        category: newTemplateCategory,
        description: newTemplateDescription.trim() || undefined,
        fields: [],
      });
      setIsCreatingTemplate(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      await fetchTemplates();
      if (created?.id) {
        setSelectedTemplateId(created.id);
      }
      onTemplatesUpdated?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create template');
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !newFieldName.trim()) return;

    setErrorMessage(null);
    setIsSavingField(true);
    // Automatically generate internal key without exposing technical codes to user
    const internalKey = newFieldName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `field_${Date.now()}`;

    try {
      await api.addMeasurementTemplateField(selectedTemplateId, {
        field_name: newFieldName.trim(),
        field_key: internalKey,
        field_type: 'number',
        default_unit: newFieldUnit,
        is_required: false,
      });
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldUnit('in');
      await fetchTemplates();
      onTemplatesUpdated?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add measurement field');
    } finally {
      setIsSavingField(false);
    }
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const activeFields: MeasurementTemplateField[] = activeTemplate?.fields || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Measurement Templates"
      subtitle="Predefined South-Indian garment measurements & custom tailoring fields"
      maxWidth="3xl"
    >
      <div className="space-y-4 font-sans">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs">
            <IconAlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Template Selector List */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                Garment Templates
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingTemplate(true);
                  setIsAddingField(false);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <IconPlus className="w-3 h-3" />
                <span>New Template</span>
              </button>
            </div>

            {/* Template Buttons */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                const fieldCount = tmpl.fields?.length || 0;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setIsCreatingTemplate(false);
                      setIsAddingField(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {tmpl.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 shrink-0">
                        {fieldCount} field{fieldCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    {tmpl.description && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {tmpl.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Detail & Fields Management */}
          <div className="md:col-span-8 space-y-3">
            {isCreatingTemplate ? (
              <form onSubmit={handleCreateTemplate} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Create Custom Garment Template
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                    className="text-[11px] text-slate-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. Anarkali Suit, Lehenga Choli, Sherwani"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description / Tailoring Notes
                  </label>
                  <textarea
                    rows={2}
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Optional tailoring description or fit guidelines"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            ) : activeTemplate ? (
              <div className="space-y-3">
                {/* Active Template Banner */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {activeTemplate.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeTemplate.description || 'Standard tailored garment specification'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingField(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors shrink-0"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>Add Field</span>
                    </button>
                  </div>
                </div>

                {/* Add Field Inline Form */}
                {isAddingField && (
                  <form onSubmit={handleAddField} className="p-3.5 rounded-xl border border-teal-500/40 bg-teal-50/30 dark:bg-teal-950/20 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                        Add Measurement Field to "{activeTemplate.name}"
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingField(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          Field Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Elbow Round, Slit Length, Cuff Width"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          Unit
                        </label>
                        <select
                          value={newFieldUnit}
                          onChange={(e) => setNewFieldUnit(e.target.value as 'in' | 'cm')}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
                        >
                          <option value="in">Inches (in)</option>
                          <option value="cm">Centimeters (cm)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingField(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingField}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-subtle flex items-center gap-1.5 transition-colors"
                      >
                        {isSavingField ? <IconRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <IconCheck className="w-3.5 h-3.5" />}
                        <span>Save Field</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Predefined & Custom Fields List (Clean Table without technical database codes) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs table-fixed">
                      <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 sticky top-0">
                        <tr>
                          <th className="w-[12%] py-2.5 px-3 text-center">#</th>
                          <th className="w-[68%] py-2.5 px-3 font-bold">Field Name</th>
                          <th className="w-[20%] py-2.5 px-3 text-center font-bold">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                        {activeFields && activeFields.length > 0 ? (
                          activeFields.map((f, i) => {
                            const fieldName = f.field_name || f.name || 'Measurement Field';
                            const unit = f.default_unit || 'in';
                            return (
                              <tr key={f.id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-2 px-3 text-center text-[10px] font-mono text-slate-400">
                                  {i + 1}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {fieldName}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                                    {unit === 'cm' ? 'cm' : 'in'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                              No fields defined for this template yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
