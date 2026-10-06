'use client';

import React, { useState } from 'react';
import {
  X,
  Star,
  Sparkles,
  Lightbulb,
  Bug,
  Heart,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { submitAppFeedback } from '@/app/actions/feedback';
import { FeedbackCategory } from '@/types';

const CATEGORIES: { id: FeedbackCategory; label: string; icon: React.ElementType }[] = [
  { id: 'experience', label: 'Overall Experience', icon: Sparkles },
  { id: 'feature_request', label: 'Feature Request', icon: Lightbulb },
  { id: 'bug_report', label: 'Report a Problem', icon: Bug },
  { id: 'praise', label: 'What I Love', icon: Heart },
  { id: 'general', label: 'General Feedback', icon: MessageSquare },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Needs improvement',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Love it!',
};

export default function FeedbackModal() {
  const { feedbackModalOpen, setFeedbackModalOpen } = useUIStore();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>('experience');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!feedbackModalOpen) return null;

  const handleClose = () => {
    setFeedbackModalOpen(false);
    // Reset state after transition
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      setRating(5);
      setError(null);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 5) {
      setError('Please provide at least a short description (minimum 5 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('rating', rating.toString());
    formData.append('category', category);
    formData.append('message', message.trim());

    const res = await submitAppFeedback(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-10 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Your Feedback</h3>
              <p className="text-[11px] text-slate-500">Help us make TraderERP better for you</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {submitted ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Thank You!</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Your feedback has been received. As a customer-centered platform, your suggestions directly shape our next updates!
              </p>
              <div className="pt-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  How would you rate your experience?
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating !== null ? hoverRating : rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 rounded-md hover:bg-slate-100 transition-transform active:scale-95 cursor-pointer"
                        title={`${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            active
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 stroke-[1.5]'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-medium text-slate-500 ml-2">
                    {RATING_LABELS[hoverRating !== null ? hoverRating : rating]}
                  </span>
                </div>
              </div>

              {/* Category Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tell us what you think <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you enjoy about TraderERP? What can we improve or add to make your daily work easier?"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none text-slate-800 placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Submit Feedback</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
