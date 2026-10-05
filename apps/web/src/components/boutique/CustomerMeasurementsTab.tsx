import React, { useState, useEffect, useCallback } from 'react';
import {
  IconPlus,
  IconRefreshCw,
  IconFileText,
  IconSlidersHorizontal,
  IconClock,
  IconEdit,
  IconCheck,
  IconLayers,
} from '../icons';
import { api } from '../../services/api';
import { CustomerMeasurementProfile, CustomerMeasurementVersion } from '../../types/inventory';
import { AddMeasurementModal } from './AddMeasurementModal';
import { MeasurementHistoryModal } from './MeasurementHistoryModal';
import { TemplateManagerModal } from './TemplateManagerModal';

interface CustomerMeasurementsTabProps {
  customerId: string;
  customerName: string;
}

export const CustomerMeasurementsTab: React.FC<CustomerMeasurementsTabProps> = ({
  customerId,
  customerName,
}) => {
  const [profiles, setProfiles] = useState<CustomerMeasurementProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [selectedProfileForAction, setSelectedProfileForAction] = useState<CustomerMeasurementProfile | null>(null);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<CustomerMeasurementProfile | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getCustomerMeasurementProfiles(customerId);
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load customer measurement profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleOpenAdd = () => {
    setSelectedProfileForAction(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditNewVersion = (profile: CustomerMeasurementProfile) => {
    setSelectedProfileForAction(profile);
    setIsAddModalOpen(true);
  };

  const handleOpenHistory = (profile: CustomerMeasurementProfile) => {
    setSelectedProfileForAction(profile);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Boutique Measurement Profiles
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
              {profiles.length} Garment{profiles.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Individual tailored garment patterns with audit-safe historical versions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTemplateManagerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <IconSlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>Add Measurement</span>
          </button>
        </div>
      </div>

      {/* Profiles Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
          <span>Loading garment measurements...</span>
        </div>
      ) : profiles.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-3">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <IconSlidersHorizontal className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Measurement Profiles Yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Record custom body measurements for {customerName} across Saree Blouse, Churidar, Kurti, or Bottom pants.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>Record First Measurement</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((prof) => {
            const currentVer = prof.current_version;
            const updatedDate = currentVer?.measured_at
              ? new Date(currentVer.measured_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : new Date(prof.updated_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

            const values = currentVer?.values || [];
            // Prioritize filled values for summary preview so blank fields don't crowd out entered measurements
            const filledValues = values.filter((v) => v.num_value !== null && v.num_value !== undefined && v.num_value !== ('' as any));
            const previewValues = (filledValues.length > 0 ? filledValues : values).slice(0, 6);

            return (
              <div
                key={prof.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-xs hover:border-teal-500/40 transition-colors p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {prof.profile_name}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                          v{currentVer?.version_number || 1}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Updated: {updatedDate}
                        {currentVer?.measured_by && ` • Tailor: ${currentVer.measured_by}`}
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {prof.template_name || prof.template?.name || 'Garment'}
                    </span>
                  </div>

                  {/* Notes Callout if present */}
                  {(currentVer?.notes || prof.notes) && (
                    <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 italic">
                      "{currentVer?.notes || prof.notes}"
                    </div>
                  )}

                  {/* Key Measurements Preview Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3">
                    {previewValues.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-100 dark:border-slate-800/80"
                      >
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate" title={v.field_name}>
                          {v.field_name}
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {v.num_value !== null && v.num_value !== undefined ? (
                            <span>
                              {v.num_value}{' '}
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                                {v.unit || 'in'}
                              </span>
                            </span>
                          ) : (
                            <span className="font-sans font-normal text-slate-500">{v.text_value || '—'}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {values.length > 6 && (
                    <div className="text-[10px] text-slate-400 text-right pr-1 mb-2 font-mono">
                      + {values.length - 6} more parameters
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenHistory(prof)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  >
                    <IconClock className="w-3.5 h-3.5" />
                    <span>History ({prof.total_versions || prof.versions?.length || 1})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProfileForDetail(prof)}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      View All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditNewVersion(prof)}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
                    >
                      <IconEdit className="w-3 h-3" />
                      <span>New Version</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / New Version Modal */}
      {isAddModalOpen && (
        <AddMeasurementModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          customerId={customerId}
          customerName={customerName}
          onSaved={fetchProfiles}
          existingProfile={selectedProfileForAction}
        />
      )}

      {/* History Modal */}
      {isHistoryModalOpen && selectedProfileForAction && (
        <MeasurementHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          customerId={customerId}
          customerName={customerName}
          profile={selectedProfileForAction}
        />
      )}

      {/* Full Detail Modal */}
      {selectedProfileForDetail && (
        <MeasurementHistoryModal
          isOpen={Boolean(selectedProfileForDetail)}
          onClose={() => setSelectedProfileForDetail(null)}
          customerId={customerId}
          customerName={customerName}
          profile={selectedProfileForDetail}
        />
      )}

      {/* Template Manager Modal */}
      {isTemplateManagerOpen && (
        <TemplateManagerModal
          isOpen={isTemplateManagerOpen}
          onClose={() => setIsTemplateManagerOpen(false)}
          onTemplatesUpdated={fetchProfiles}
        />
      )}
    </div>
  );
};
