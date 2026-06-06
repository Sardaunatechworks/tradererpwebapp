'use client';

import React, { useState, useEffect } from 'react';
import { 
  verifyAdminPassword, 
  createStaff, 
  editStaff, 
  suspendStaff, 
  activateStaff, 
  resetStaffPassword,
  restrictStaff,
  unrestrictStaff,
  deleteStaff
} from '@/app/actions/staff';
import { 
  UserPlus, 
  ShieldAlert, 
  Search, 
  Shield, 
  Building2, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Edit,
  RotateCcw,
  Ban,
  UserCheck,
  Clipboard,
  Check,
  X,
  Loader2,
  Lock,
  Unlock,
  Trash2
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  must_change_password: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
}

interface UserBranch {
  user_id: string;
  branch_id: string;
}

interface Props {
  initialUsers: StaffUser[];
  branches: Branch[];
  userBranches: UserBranch[];
  currentAdminId: string;
}

export default function StaffManagement({ initialUsers, branches, userBranches, currentAdminId }: Props) {
  const [filterText, setFilterText] = useState('');
  const [users, setUsers] = useState<StaffUser[]>(initialUsers);
  
  // Modals & Flows state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResetSuccessModal, setShowResetSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteUser, setTargetDeleteUser] = useState<StaffUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Password confirmation states (re-auth)
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Creation form states
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [createFormLoading, setCreateFormLoading] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  // Editing states
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editBranches, setEditBranches] = useState<string[]>([]);

  // Details states
  const [viewingUser, setViewingUser] = useState<StaffUser | null>(null);

  // Reset password states
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Action status indicators
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeDropdown && !target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activeDropdown]);

  // Filter staff users based on search (excluding soft-deleted users)
  const filteredUsers = users.filter(u => 
    u.status !== 'DELETED' && u.status !== 'deleted' && (
      u.name.toLowerCase().includes(filterText.toLowerCase()) ||
      u.email.toLowerCase().includes(filterText.toLowerCase()) ||
      (u.phone && u.phone.includes(filterText))
    )
  );

  // Retrieve assigned branches names for a user
  const getUserBranchesNames = (userId: string) => {
    const assignedIds = userBranches.filter(ub => ub.user_id === userId).map(ub => ub.branch_id);
    if (assignedIds.length === 0) return 'No branch assigned';
    if (assignedIds.length === branches.length) return 'All Outlets';
    return branches.filter(b => assignedIds.includes(b.id)).map(b => b.name).join(', ');
  };

  // Re-authentication submit
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const res = await verifyAdminPassword(adminPassword);
    if (res?.error) {
      setAuthError('Incorrect password. Please try again.');
      setAuthLoading(false);
    } else {
      setAuthLoading(false);
      setShowAuthModal(false);
      setAdminPassword('');
      // Open Create modal immediately
      setSelectedBranches([branches[0]?.id || '']);
      setShowCreateModal(true);
    }
  };

  // Create staff submit
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateFormError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;
    const tempPassword = formData.get('tempPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (tempPassword !== confirmPassword) {
      setCreateFormError('Passwords do not match.');
      return;
    }

    if (selectedBranches.length === 0) {
      setCreateFormError('Please select at least one branch assignment.');
      return;
    }

    setCreateFormLoading(true);

    const res = await createStaff({
      name,
      email,
      phone,
      role,
      branchIds: selectedBranches,
      tempPassword
    });

    if (res?.error) {
      setCreateFormError(res.error);
      setCreateFormLoading(false);
    } else {
      setCreateFormLoading(false);
      setShowCreateModal(false);
      window.location.reload();
    }
  };

  // Open edit modal
  const startEditing = (user: StaffUser) => {
    setEditingUser(user);
    const assignedIds = userBranches.filter(ub => ub.user_id === user.id).map(ub => ub.branch_id);
    setEditBranches(assignedIds);
    setEditFormError(null);
    setShowEditModal(true);
  };

  // Edit staff submit
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditFormError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;

    if (editBranches.length === 0) {
      setEditFormError('Please select at least one branch assignment.');
      return;
    }

    setEditFormLoading(true);

    const res = await editStaff(editingUser.id, {
      name,
      phone,
      role,
      branchIds: editBranches
    });

    if (res?.error) {
      setEditFormError(res.error);
      setEditFormLoading(false);
    } else {
      setEditFormLoading(false);
      setShowEditModal(false);
      setEditingUser(null);
      window.location.reload();
    }
  };

  // Suspend staff
  const handleSuspend = async (userId: string) => {
    if (userId === currentAdminId) return;
    setActionLoading(userId);
    const res = await suspendStaff(userId);
    setActionLoading(null);
    setActiveDropdown(null);
    if (res?.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  // Activate staff
  const handleActivate = async (userId: string) => {
    setActionLoading(userId);
    const res = await activateStaff(userId);
    setActionLoading(null);
    setActiveDropdown(null);
    if (res?.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  // Restrict staff
  const handleRestrict = async (userId: string) => {
    if (userId === currentAdminId) return;
    setActionLoading(userId);
    const res = await restrictStaff(userId);
    setActionLoading(null);
    setActiveDropdown(null);
    if (res?.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  // Unrestrict staff
  const handleUnrestrict = async (userId: string) => {
    if (userId === currentAdminId) return;
    setActionLoading(userId);
    const res = await unrestrictStaff(userId);
    setActionLoading(null);
    setActiveDropdown(null);
    if (res?.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  // Confirm and delete staff (soft-delete)
  const handleDeleteConfirm = async () => {
    if (!targetDeleteUser) return;
    setDeleteError(null);
    setDeleteLoading(true);

    const res = await deleteStaff(targetDeleteUser.id);
    if (res?.error) {
      setDeleteError(res.error);
      setDeleteLoading(false);
    } else {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setTargetDeleteUser(null);
      window.location.reload();
    }
  };

  // Reset staff password
  const handleResetPassword = async (userId: string) => {
    if (userId === currentAdminId) return;
    setResetLoading(userId);
    const res = await resetStaffPassword(userId);
    setResetLoading(null);
    setActiveDropdown(null);
    if (res?.error) {
      alert(res.error);
    } else if (res?.tempPassword) {
      setGeneratedTempPassword(res.tempPassword);
      setShowResetSuccessModal(true);
    }
  };

  // Copy temporary password
  const copyToClipboard = () => {
    if (generatedTempPassword) {
      navigator.clipboard.writeText(generatedTempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search staff members..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <button
          onClick={() => {
            setAuthError(null);
            setAdminPassword('');
            setShowAuthModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* Staff Grid/Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Personal Details</th>
                <th className="py-4 px-6">System Role</th>
                <th className="py-4 px-6">Branch Access</th>
                <th className="py-4 px-6">Account Status</th>
                <th className="py-4 px-6 text-right">Row Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500 font-semibold">
                    No staff accounts found matches search query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentAdminId;
                  return (
                    <tr key={user.id} className="hover:bg-slate-900/10 text-slate-300 transition-colors">
                      <td className="py-4 px-6 space-y-1">
                        <span className="text-white font-bold block flex items-center gap-1.5">
                          {user.name} {isSelf && <span className="text-[9px] uppercase bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-normal text-slate-400">You</span>}
                        </span>
                        <span className="text-slate-500 text-[10px] block font-mono">{user.email}</span>
                        {user.phone && <span className="text-slate-500 text-[10px] block font-mono">{user.phone}</span>}
                      </td>
                      <td className="py-4 px-6">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-black bg-slate-900/40 border border-slate-800/80 px-2 py-0.5 rounded-lg w-max text-blue-400 tracking-wider">
                          <Shield className="w-3 h-3 text-blue-500" /> {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="flex items-center gap-1 font-medium text-slate-300 text-[11px]">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[200px]" title={getUserBranchesNames(user.id)}>
                            {getUserBranchesNames(user.id)}
                          </span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5 w-max">
                          {/* Main Status */}
                          {user.status === 'ACTIVE' || user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              Active
                            </span>
                          ) : user.status === 'RESTRICTED' || user.status === 'restricted' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                              Restricted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg">
                              Suspended
                            </span>
                          )}

                          {/* Must Change Password Check */}
                          {user.must_change_password && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                              Password Reset Required
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right relative">
                        {actionLoading === user.id || resetLoading === user.id ? (
                          <div className="flex justify-end pr-4">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {/* View Details */}
                            <button
                              onClick={() => {
                                setViewingUser(user);
                                setShowDetailsModal(true);
                              }}
                              title="View Details"
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {!isSelf && (
                              <>
                                {/* Edit User */}
                                <button
                                  onClick={() => startEditing(user)}
                                  title="Edit User"
                                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* Reset Password */}
                                <button
                                  onClick={() => handleResetPassword(user.id)}
                                  title="Reset Password"
                                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-500 hover:text-amber-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                {/* Restrict / Unrestrict */}
                                {user.status === 'RESTRICTED' || user.status === 'restricted' ? (
                                  <button
                                    onClick={() => handleUnrestrict(user.id)}
                                    title="Remove Restriction"
                                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-500 hover:text-emerald-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleRestrict(user.id)}
                                    title="Restrict User"
                                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-500 hover:text-amber-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:cursor-not-allowed"
                                    disabled={user.status !== 'ACTIVE' && user.status !== 'active'}
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Suspend / Activate */}
                                {user.status === 'ACTIVE' || user.status === 'active' || user.status === 'RESTRICTED' || user.status === 'restricted' ? (
                                  <button
                                    onClick={() => handleSuspend(user.id)}
                                    title="Suspend User"
                                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-red-500 hover:text-red-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleActivate(user.id)}
                                    title="Activate User"
                                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-500 hover:text-emerald-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete User */}
                                <button
                                  onClick={() => {
                                    setTargetDeleteUser(user);
                                    setDeleteError(null);
                                    setShowDeleteModal(true);
                                  }}
                                  title="Delete User"
                                  className="p-1.5 bg-slate-900 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg border border-slate-800 hover:border-red-900/50 transition-all cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RE-AUTHENTICATION */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div className="text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-white leading-none">Confirm your password to continue</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Security Re-authentication Required</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Administrator Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE STAFF */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Add Staff Member</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Register new administrative profile</span>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {createFormError && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium">
                  {createFormError}
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-3">
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Personal Information</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Full Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Phone Number</label>
                    <input
                      name="phone"
                      type="text"
                      required
                      placeholder="e.g. +23480..."
                      className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Access Information */}
              <div className="space-y-3 pt-2 border-t border-slate-800/60">
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Access Information</span>
                
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">System Role</label>
                  <select
                    name="role"
                    required
                    className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="STAFF">STAFF (Can perform sales and view permitted info)</option>
                    <option value="MANAGER">MANAGER (Can manage branch operations)</option>
                    <option value="ADMIN">ADMIN (Can manage operations and staff)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Access</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-32 overflow-y-auto">
                    {branches.map(b => (
                      <label key={b.id} className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranches([...selectedBranches, b.id]);
                            } else {
                              setSelectedBranches(selectedBranches.filter(id => id !== b.id));
                            }
                          }}
                          className="rounded border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Password Setting */}
              <div className="space-y-3 pt-2 border-t border-slate-800/60">
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Credentials</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Temporary Password</label>
                    <input
                      name="tempPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Confirm Password</label>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFormLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {createFormLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT STAFF */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Edit Staff Profile</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">{editingUser.email}</span>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editFormError && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium">
                  {editFormError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingUser.name}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Phone Number</label>
                <input
                  name="phone"
                  type="text"
                  required
                  defaultValue={editingUser.phone || ''}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">System Role</label>
                <select
                  name="role"
                  required
                  defaultValue={editingUser.role}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Access</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-32 overflow-y-auto">
                  {branches.map(b => (
                    <label key={b.id} className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editBranches.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditBranches([...editBranches, b.id]);
                          } else {
                            setEditBranches(editBranches.filter(id => id !== b.id));
                          }
                        }}
                        className="rounded border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {editFormLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW DETAILS */}
      {showDetailsModal && viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Administrative Profile Details</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Staff CRM Entry</span>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-300">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="text-white">{viewingUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="text-white font-mono">{viewingUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="text-white font-mono">{viewingUser.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">System Role:</span>
                  <span className="text-blue-400 font-bold uppercase text-[10px]">{viewingUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Status:</span>
                  <span className={
                    viewingUser.status === 'ACTIVE' || viewingUser.status === 'active' 
                      ? 'text-emerald-500 font-bold' 
                      : viewingUser.status === 'RESTRICTED' || viewingUser.status === 'restricted'
                      ? 'text-amber-500 font-bold'
                      : 'text-red-500 font-bold'
                  }>
                    {viewingUser.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Password reset:</span>
                  <span className={viewingUser.must_change_password ? 'text-amber-500 font-bold' : 'text-slate-500'}>
                    {viewingUser.must_change_password ? 'Required' : 'Completed'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <span className="text-slate-500 block">Authorized Branch Assignments:</span>
                <span className="text-white font-bold block">{getUserBranchesNames(viewingUser.id)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setViewingUser(null);
                }}
                className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PASSWORD RESET SUCCESS DISPLAY */}
      {showResetSuccessModal && generatedTempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-white leading-none">Password Reset Successfully</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Temporary Password Generated</p>
            </div>

            <div className="space-y-4">
              <div className="bg-red-950/30 border border-red-900/60 rounded-xl p-4 text-xs font-semibold text-red-400">
                <span className="block font-bold mb-1">WARNING:</span>
                Please provide this temporary password securely to the employee. It will not be shown again.
              </div>

              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <span className="text-white font-mono font-bold select-all">{generatedTempPassword}</span>
                <button
                  onClick={copyToClipboard}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowResetSuccessModal(false);
                  setGeneratedTempPassword(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DELETE USER CONFIRMATION */}
      {showDeleteModal && targetDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div className="text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-white leading-none">Delete Staff Account?</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">This action cannot be undone</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="text-white font-bold">{targetDeleteUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-white font-mono">{targetDeleteUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="text-blue-400 font-bold uppercase text-[10px]">{targetDeleteUser.role}</span>
                </div>
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed">
                Deleting this staff member will revoke their credentials and permanently block their access.
                Their profile records will be kept as <span className="text-red-400 font-bold">DELETED</span> to preserve database audit integrity.
              </p>

              {deleteError && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTargetDeleteUser(null);
                }}
                className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
