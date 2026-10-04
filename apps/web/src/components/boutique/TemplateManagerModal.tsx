import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  IconPlus,
  IconCheck,
  IconAlertCircle,
  IconRefreshCw,
  IconSlidersHorizontal,
  IconLayers,
  IconTrash2,
  IconEdit,
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
  const [newTemplateCategory, setNewTemplateCategory] = useState('Custom');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  // New Field form state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldCode, setNewFieldCode] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('in');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMeasurementTemplates();
      setTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id);
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
      const created = await api.createMeasurementTemplate({
        name: newTemplateName.trim(),
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
    const code = newFieldCode.trim() || newFieldName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    try {
      await api.addMeasurementTemplateField(selectedTemplateId, {
        name: newFieldName.trim(),
        code,
        field_type: 'numeric',
        default_unit: newFieldUnit,
        is_required: newFieldRequired,
      });
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldCode('');
      await fetchTemplates();
      onTemplatesUpdated?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add field to template');
    }
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Boutique Measurement Templates"
      subtitle="Standard and custom garment measurement templates for tailoring workflows"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs">
            <IconAlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Templates List */}
          <div className="md:col-span-5 border-r border-slate-200 dark:border-slate-800 pr-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                Available Templates
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
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
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
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {tmpl.name}
                      </span>
                      {tmpl.is_system ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          System
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/30">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>{tmpl.category || 'Garment'}</span>
                      <span>{tmpl.fields?.length || 0} fields</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Detail / Forms */}
          <div className="md:col-span-7 space-y-3">
            {isCreatingTemplate ? (
              <form onSubmit={handleCreateTemplate} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Create Custom Template
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
                    Garment Category
                  </label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="Saree Blouse">Saree Blouse</option>
                    <option value="Salwar / Suit">Salwar / Suit</option>
                    <option value="Kurti">Kurti</option>
                    <option value="Bottom / Pants">Bottom / Pants</option>
                    <option value="Gown / Dress">Gown / Dress</option>
                    <option value="Men / Kids">Men / Kids</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description / Tailor Notes
                  </label>
                  <textarea
                    rows={2}
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Optional description or tailoring guidelines"
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
                {/* Active Template Header */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
                  <div className="flex items-center justify-between">
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shadow-subtle transition-colors"
                    >
                      <IconPlus className="w-3 h-3" />
                      <span>Add Field</span>
                    </button>
                  </div>
                </div>

                {/* Add Field Inline Form */}
                {isAddingField && (
                  <form onSubmit={handleAddField} className="p-3 rounded-lg border border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/20 space-y-2">
                    <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block">
                      Add Field to "{activeTemplate.name}"
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Field name (e.g. Slit Length)"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={newFieldUnit}
                          onChange={(e) => setNewFieldUnit(e.target.value)}
                          className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] px-2 py-1 text-xs font-mono"
                        >
                          <option value="in">in</option>
                          <option value="cm">cm</option>
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingField(false)}
                          className="px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Fields List */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden">
                  <div className="max-h-[280px] overflow-y-auto">
                    <table className="w-full text-left text-xs table-fixed">
                      <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 sticky top-0">
                        <tr>
                          <th className="w-[10%] py-2 px-2 text-center">#</th>
                          <th className="w-[50%] py-2 px-3 font-bold">Field Name</th>
                          <th className="w-[25%] py-2 px-2 font-mono">Code</th>
                          <th className="w-[15%] py-2 px-2 text-center font-mono">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                        {activeTemplate.fields && activeTemplate.fields.length > 0 ? (
                          activeTemplate.fields.map((f, i) => (
                            <tr key={f.id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                              <td className="py-1.5 px-2 text-center text-[10px] font-mono text-slate-400">
                                {i + 1}
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {f.name}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-[10px] text-slate-500 truncate">
                                {f.code}
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                                {f.default_unit || 'in'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
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

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
