'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { BusinessMember } from '@/types';
import {
  getStaffMembers,
  createStaffMember,
  toggleStaffStatus,
} from '@/app/actions/staff';
import { formatDate } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';

export default function StaffList() {
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Staff Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    const res = await getStaffMembers();
    if (res.data) setMembers(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createStaffMember(formData);
    setSubmitting(false);

    if (res.error) {
      setFormError(res.error);
    } else {
      setIsAddModalOpen(false);
      fetchStaff();
    }
  };

  const handleToggleStatus = async (member: BusinessMember) => {
    if (member.role === 'owner') return;
    const actionName = member.status === 'active' ? 'suspend' : 'reactivate';
    if (confirm(`Are you sure you want to ${actionName} ${member.user?.name || 'this user'}?`)) {
      const res = await toggleStaffStatus(member.id);
      if (res.error) alert(res.error);
      else fetchStaff();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & User Access"
        description="Manage cashiers, shop attendants, and administrators with role-based operational permissions."
        action={
          <Button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Staff Member
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Loading staff directory..." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const isOwner = m.role === 'owner';
                  const isActive = m.status === 'active';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-slate-900">{m.user?.name || 'User'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{m.user?.email}</div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {m.user?.phone || '—'}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                            isOwner
                              ? 'bg-slate-900 text-white'
                              : m.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {m.role}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(m.created_at)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={isActive ? 'success' : 'danger'} size="sm" dot>
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {!isOwner && (
                          <button
                            onClick={() => handleToggleStatus(m)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                              isActive
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Staff Member"
        description="Create account credentials for a shop attendant or co-manager"
        maxWidth="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Full Name"
            name="name"
            placeholder="e.g. Fatima Kabir"
            required
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="fatima@business.com"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Phone Number (Optional)"
            name="phone"
            type="tel"
            placeholder="08023456789"
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Temporary Password"
            name="password"
            type="password"
            placeholder="Min 8 characters"
            required
            helperText="The staff member will use this to sign in"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Assigned Operational Role
            </label>
            <select
              name="role"
              className="w-full bg-white border border-slate-300 rounded-lg text-sm text-slate-900 px-3.5 py-2 outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="staff">Staff (Can record sales, check stock, record expenses)</option>
              <option value="admin">Administrator (Can manage products, staff, and view full reports)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
