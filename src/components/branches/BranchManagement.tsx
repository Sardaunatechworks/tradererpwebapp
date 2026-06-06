'use client';

import React, { useState } from 'react';
import { 
  createBranch, 
  updateBranch, 
  toggleBranchStatus, 
  deleteBranch 
} from '@/app/actions/branches';
import { 
  Building2, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  ShieldAlert, 
  MapPin, 
  Shield, 
  Lock, 
  Unlock, 
  PlusCircle, 
  CheckCircle2 
} from 'lucide-react';

interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  manager_id: string | null;
  manager: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface Props {
  initialBranches: Branch[];
  staffMembers: StaffMember[];
}

export default function BranchManagement({ initialBranches, staffMembers }: Props) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [filterText, setFilterText] = useState('');

  // Modal display states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit / Delete Target state
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [targetDeleteBranch, setTargetDeleteBranch] = useState<Branch | null>(null);

  // Form loading & errors
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter branches based on name, address, or manager name search
  const filteredBranches = branches.filter(b => {
    const term = filterText.toLowerCase();
    const matchesName = b.name.toLowerCase().includes(term);
    const matchesAddress = b.address ? b.address.toLowerCase().includes(term) : false;
    const matchesManager = b.manager ? b.manager.name.toLowerCase().includes(term) : false;
    return matchesName || matchesAddress || matchesManager;
  });

  // Handle Add Branch submit
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const managerId = formData.get('managerId') as string || null;

    const res = await createBranch({
      name,
      address,
      managerId
    });

    if (res?.error) {
      setCreateError(res.error);
      setCreateLoading(false);
    } else {
      setCreateLoading(false);
      setShowCreateModal(false);
      window.location.reload();
    }
  };

  // Handle Edit Branch submit
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBranch) return;
    setEditError(null);
    setEditLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const managerId = formData.get('managerId') as string || null;

    const res = await updateBranch(editingBranch.id, {
      name,
      address,
      managerId
    });

    if (res?.error) {
      setEditError(res.error);
      setEditLoading(false);
    } else {
      setEditLoading(false);
      setShowEditModal(false);
      setEditingBranch(null);
      window.location.reload();
    }
  };

  // Handle Restrict / Unrestrict Toggle
  const handleToggleStatus = async (branchId: string, currentStatus: boolean) => {
    setActionLoadingId(branchId);
    const res = await toggleBranchStatus(branchId, !currentStatus);
    setActionLoadingId(null);
    if (res?.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  // Handle Confirm Delete Branch
  const handleDeleteConfirm = async () => {
    if (!targetDeleteBranch) return;
    setDeleteError(null);
    setDeleteLoading(true);

    const res = await deleteBranch(targetDeleteBranch.id);

    if (res?.error) {
      setDeleteError(res.error);
      setDeleteLoading(false);
    } else {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setTargetDeleteBranch(null);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search branches..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-900/10"
        >
          <PlusCircle className="w-4 h-4" /> Add Branch
        </button>
      </div>

      {/* Branches Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Branch Details</th>
                <th className="py-4 px-6">Physical Address</th>
                <th className="py-4 px-6">Branch Manager</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Row Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-medium">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500 font-semibold">
                    No branches found matching search query.
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-900/10 text-slate-300 transition-colors">
                    <td className="py-4 px-6 space-y-1">
                      <span className="text-white font-bold block flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {branch.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {branch.address ? (
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          {branch.address}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">No address listed</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {branch.manager ? (
                        <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                          {branch.manager.name}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">No manager assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {branch.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                          Restricted
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      {actionLoadingId === branch.id ? (
                        <div className="flex justify-end pr-4">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {/* Edit Details */}
                          <button
                            onClick={() => {
                              setEditingBranch(branch);
                              setEditError(null);
                              setShowEditModal(true);
                            }}
                            title="Edit Branch"
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Restrict / Unrestrict Toggle */}
                          {branch.is_active ? (
                            <button
                              onClick={() => handleToggleStatus(branch.id, branch.is_active)}
                              title="Restrict Branch"
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-500 hover:text-amber-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(branch.id, branch.is_active)}
                              title="Activate Branch"
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-500 hover:text-emerald-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Branch */}
                          <button
                            onClick={() => {
                              setTargetDeleteBranch(branch);
                              setDeleteError(null);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Branch"
                            className="p-1.5 bg-slate-900 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg border border-slate-800 hover:border-red-900/50 transition-all cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD BRANCH */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Add Branch</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Register new outlet workspace</span>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {createError && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Lagos Mainland Outlet"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Physical Address</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="e.g. Plot 10, Herbert Macaulay Way, Yaba"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Manager</label>
                <select
                  name="managerId"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">No manager assigned</option>
                  {staffMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
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
                  disabled={createLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT BRANCH */}
      {showEditModal && editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Edit Branch Details</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Modify settings for {editingBranch.name}</span>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingBranch.name}
                  placeholder="e.g. Lagos Mainland Outlet"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Physical Address</label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingBranch.address || ''}
                  placeholder="e.g. Plot 10, Herbert Macaulay Way, Yaba"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Manager</label>
                <select
                  name="managerId"
                  defaultValue={editingBranch.manager_id || ''}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">No manager assigned</option>
                  {staffMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBranch(null);
                  }}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE BRANCH CONFIRMATION */}
      {showDeleteModal && targetDeleteBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div className="text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-white leading-none">Delete Branch Workspace?</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">This action cannot be undone</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Name:</span>
                  <span className="text-white font-bold">{targetDeleteBranch.name}</span>
                </div>
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-slate-500">Address:</span>
                  <span className="text-white truncate max-w-[200px]" title={targetDeleteBranch.address || ''}>
                    {targetDeleteBranch.address || 'N/A'}
                  </span>
                </div>
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed">
                Deleting this branch will remove its inventory entries and pricing definitions.
                This operation is blocked if there are active sales recorded at this branch to preserve database audit records.
              </p>

              {deleteError && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium leading-relaxed">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTargetDeleteBranch(null);
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
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
