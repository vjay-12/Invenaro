import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  IconBuilding,
  IconCheck,
  IconShieldCheck,
  IconSend,
  IconClock,
} from '../icons';
import { useAuth } from '../../context/AuthContext';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const companyName = user?.companyName || 'Enterprise';
  const [category, setCategory] = useState('technical');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const ticketId = `TICK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedTicket(ticketId);
      setIsSubmitting(false);
      setSubject('');
      setMessage('');
      setTimeout(() => {
        setSubmittedTicket(null);
        onClose();
      }, 3500);
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contact Enterprise Support"
      subtitle={`Dedicated assistance and SLA ticketing for ${companyName} operations`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {submittedTicket ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2 animate-fadeIn">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto">
              <IconCheck className="h-6 w-6" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Support Ticket Created: {submittedTicket}
            </div>
            <p className="text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your inquiry has been dispatched to enterprise support engineers. Expected response time: under 15 minutes.
            </p>
          </div>
        ) : (
          <>
            {/* Contact Channels Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F4F5F8]/70 dark:bg-[#0C1017]/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <IconBuilding className="h-3.5 w-3.5 text-teal-600" />
                  {companyName} Operations Support
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  24/7 SLA Active
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60 font-mono">
                <div>
                  <span className="text-slate-400">Support Desk:</span>{' '}
                  <span className="text-teal-600 dark:text-teal-400">
                    Active SLA Channel
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Hotline:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">+91 (800) 427-5664</span>
                </div>
              </div>
            </div>

            {/* Quick Ticket Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="technical">Technical Support & Infrastructure</option>
                  <option value="ledger">Movement Ledger & Audit Discrepancies</option>
                  <option value="invoicing">Tax Invoicing & Compliance</option>
                  <option value="api">SAP / ERP Webhook Integration</option>
                  <option value="other">General Account Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe details, steps to reproduce, or relevant SKU/order numbers..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 px-4 py-1.5 font-bold text-white shadow-sm transition-colors"
                >
                  <IconSend className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};
