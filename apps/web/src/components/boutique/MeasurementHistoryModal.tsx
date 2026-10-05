import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  IconClock,
  IconCheck,
  IconRefreshCw,
  IconFileText,
  IconSlidersHorizontal,
} from '../icons';
import { api } from '../../services/api';
import {
  CustomerMeasurementProfile,
  CustomerMeasurementVersion,
} from '../../types/inventory';

interface MeasurementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  profile: CustomerMeasurementProfile | null;
  onSelectVersionForNew?: (version: CustomerMeasurementVersion) => void;
}

export const MeasurementHistoryModal: React.FC<MeasurementHistoryModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  profile,
  onSelectVersionForNew,
}) => {
  const [versions, setVersions] = useState<CustomerMeasurementVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !profile) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const historyData = await api.getCustomerMeasurementHistory(customerId, profile.id);
        const list = Array.isArray(historyData) ? historyData : [];
        setVersions(list);
        if (list.length > 0) {
          const current = list.find((v) => v.is_current) || list[0];
          setSelectedVersionId(current.id);
        }
      } catch (err: any) {
        console.error('Failed to load measurement history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, customerId, profile]);

  if (!profile) return null;

  const activeVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Measurement History — ${profile.profile_name}`}
      subtitle={`Customer: ${customerName} • ${versions.length} recorded version${versions.length === 1 ? '' : 's'}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            <span>Loading historical versions...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No historical measurement versions found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Version Selection Column */}
            <div className="md:col-span-4 border-r border-slate-200 dark:border-slate-800 pr-3 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-2">
                Version Timeline
              </span>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {versions.map((ver) => {
                  const isSelected = ver.id === selectedVersionId;
                  const dateStr = ver.measured_at
                    ? new Date(ver.measured_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Unknown Date';

                  return (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => setSelectedVersionId(ver.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            v{ver.version_number}
                          </span>
                          {ver.is_current && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {dateStr}
                        </span>
                      </div>

                      {ver.measured_by && (
                        <div className="text-[11px] text-slate-500 mt-1 truncate">
                          Tailor: <span className="font-medium text-slate-700 dark:text-slate-300">{ver.measured_by}</span>
                        </div>
                      )}

                      {ver.notes && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                          "{ver.notes}"
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Version Data Snapshot Column */}
            <div className="md:col-span-8 space-y-3">
              {activeVersion ? (
                <div>
                  {/* Version Header Banner */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          Version {activeVersion.version_number}
                        </span>
                        {activeVersion.is_current ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            Active Measurement
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 border border-slate-200 dark:border-slate-800">
                            Archived Snapshot
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono text-slate-500">
                        {activeVersion.measured_at
                          ? new Date(activeVersion.measured_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Recorded'}
                      </span>
                    </div>

                    {activeVersion.notes && (
                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Fitting Notes: </span>
                        {activeVersion.notes}
                      </div>
                    )}
                  </div>

                  {/* Values Table / Grid */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-xs table-fixed">
                        <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 sticky top-0">
                          <tr>
                            <th className="w-[45%] py-2 px-3 font-bold">Measurement Field</th>
                            <th className="w-[25%] py-2 px-3 font-bold text-right">Value</th>
                            <th className="w-[30%] py-2 px-3 font-bold">Fitting Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                          {activeVersion.values && activeVersion.values.length > 0 ? (
                            activeVersion.values.map((v) => (
                              <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {v.field_name}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white text-right">
                                  {(() => {
                                    const displayNum = v.numeric_value !== undefined && v.numeric_value !== null ? v.numeric_value : v.num_value;
                                    if (displayNum !== null && displayNum !== undefined) {
                                      return (
                                        <span>
                                          {displayNum}{' '}
                                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                                            {v.unit || 'in'}
                                          </span>
                                        </span>
                                      );
                                    }
                                    if (v.text_value) {
                                      return (
                                        <span className="font-sans font-normal text-slate-600 dark:text-slate-400">
                                          {v.text_value}
                                        </span>
                                      );
                                    }
                                    return <span className="text-slate-300 dark:text-slate-700">—</span>;
                                  })()}
                                </td>
                                <td className="py-2 px-3 text-[11px] text-slate-500 italic truncate" title={v.notes || ''}>
                                  {v.notes || '—'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                                No field values recorded in this version.
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
        )}

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
