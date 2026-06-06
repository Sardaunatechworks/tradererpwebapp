'use client';

import React, { useState } from 'react';
import { createTenantTicket, closeTenantTicket } from '@/app/actions/support';
import {
  LifeBuoy,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

interface Props {
  initialTickets: any[];
}

export default function SupportCenter({ initialTickets }: Props) {
  const [tickets, setTickets] = useState(initialTickets);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCloseTicket = async (ticketId: string) => {
    setClosingId(ticketId);
    setError(null);
    setSuccess(null);

    const res = await closeTenantTicket(ticketId);
    if (res?.error) {
      setError(res.error);
    } else {
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t));
      setSuccess('Support ticket closed and acknowledged successfully.');
    }
    setClosingId(null);
  };

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'support' | 'complaint' | 'feedback' | 'contact_request'>('support');
  const [description, setDescription] = useState('');

  // Expandable tickets state
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Calculations
  const totalRaised = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await createTenantTicket(title, description, category);

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess('Your support ticket has been submitted. The platform administration team has been notified.');
      // Prepend the new ticket to local state (simulate real-time addition before reload)
      setTickets([
        {
          id: Math.random().toString(),
          title,
          description,
          category,
          status: 'open',
          created_at: new Date().toISOString()
        },
        ...tickets
      ]);
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('support');
    }
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedTicketId(expandedTicketId === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ─── SUMMARY KPI CARD ROW ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Raised */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Raised</span>
            <span className="text-2xl font-black text-white block mt-1">{totalRaised}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <LifeBuoy className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Open Tickets</span>
            <span className="text-2xl font-black text-amber-500 block mt-1">{openTickets}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Resolved Tickets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Resolved Cases</span>
            <span className="text-2xl font-black text-emerald-500 block mt-1">{resolvedTickets}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ─── MESSAGES ─── */}
      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4 text-xs text-emerald-400 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ─── TICKET SUBMISSION FORM ─── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 lg:col-span-1">
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Raise Support Ticket</h3>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Submit help requests to Super Admin</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                Ticket Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
              >
                <option value="support">Technical Support</option>
                <option value="complaint">Complaint</option>
                <option value="feedback">Platform Feedback</option>
                <option value="contact_request">Contact Request</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                Subject / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-650"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                Detailed Description
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe what occurred, any error messages, or what assistance you need..."
                className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-650 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-900/10 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Submit Request <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ─── TICKET HISTORY ─── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white leading-none">Your Ticket History</h3>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Track issues and view platform admin feedback</span>
          </div>

          <div className="divide-y divide-slate-950">
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-550 text-xs font-medium">
                No tickets raised yet. If you have any inquiries, please submit a request on the left.
              </div>
            ) : (
              tickets.map((t) => {
                const isExpanded = expandedTicketId === t.id;
                return (
                  <div key={t.id} className="hover:bg-slate-950/20 transition-all duration-150">
                    
                    {/* Header Row */}
                    <div
                      onClick={() => toggleExpand(t.id)}
                      className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{t.title}</span>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 tracking-wider">
                            {t.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          Submitted on {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
                          t.status === 'open' 
                            ? 'bg-amber-950/40 border-amber-900 text-amber-400' 
                            : 'bg-emerald-950/40 border-emerald-900 text-emerald-400'
                        }`}>
                          {t.status}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 space-y-4 border-t border-slate-950 bg-slate-950/20 animate-in slide-in-from-top duration-200">
                        {/* Description */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Description</span>
                          <p className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-medium">{t.description}</p>
                        </div>

                        {/* Response */}
                        <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-xl space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Platform Owner Response
                            </span>
                            {t.status === 'resolved' && (
                              <button
                                onClick={() => handleCloseTicket(t.id)}
                                disabled={closingId === t.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                {closingId === t.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Acknowledge & Close'
                                )}
                              </button>
                            )}
                          </div>
                          {t.admin_response ? (
                            <p className="text-xs text-white leading-relaxed whitespace-pre-wrap font-medium">
                              {t.admin_response}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-550 font-semibold italic">
                              Pending response from platform support.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
