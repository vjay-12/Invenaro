import React, { useState, useEffect } from 'react';
import {
  IconUsers as Users,
  IconBuilding as Building2,
  IconShieldCheck as Shield,
  IconCheck as CheckCircle2,
  IconAlertCircle as AlertCircle,
  IconAlertTriangle as AlertTriangle,
  IconSearch as Search,
  IconEdit as Edit,
  IconRefreshCw as RefreshCw,
  IconPower as Power,
  IconPowerOff as PowerOff,
  IconLock as Lock,
  IconLayers as Layers,
  IconKey as Key,
  IconClock as Clock,
  IconSlidersHorizontal as Sliders,
  IconPlus as Plus,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconMail as Mail,
  IconX as XIcon,
} from '../components/icons';
import { api } from '../services/api';
import { PageMeta } from '../components/common/PageMeta';
import { SimpleSelectDropdown, DropdownOption } from '../components/common/SimpleSelectDropdown';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';

const ROLE_TEMPLATES: Record<string, { label: string; defaultPerms: string[]; badgeColor: string }> = {
  admin: {
    label: 'Administrator',
    defaultPerms: [
      'inventory:read',
      'inventory:write',
      'orders:manage',
      'team:manage',
      'reports:view',
      'settings:manage',
    ],
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/25',
  },
  manager: {
    label: 'Operations Manager',
    defaultPerms: ['inventory:read', 'inventory:write', 'orders:manage', 'reports:view'],
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/25',
  },
  staff: {
    label: 'Warehouse Staff',
    defaultPerms: ['inventory:read', 'inventory:write', 'orders:manage'],
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/25',
  },
  viewer: {
    label: 'Auditor / Viewer',
    defaultPerms: ['inventory:read', 'reports:view'],
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700',
  },
};

const GRANULAR_PERMISSIONS = [
  { id: 'inventory:read', label: 'View SKUs & Inventory Levels', category: 'Catalog' },
  { id: 'inventory:write', label: 'Create & Modify Products', category: 'Catalog' },
  { id: 'orders:manage', label: 'Purchase & Sales Order Operations', category: 'Orders' },
  { id: 'team:manage', label: 'Invite & Manage Team Members', category: 'Administration' },
  { id: 'reports:view', label: 'Financial & Inventory Valuation Reports', category: 'Reporting' },
  { id: 'settings:manage', label: 'Organization Legal & Sequence Config', category: 'Administration' },
];

interface RoleManagementProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

export const RoleManagement: React.FC<RoleManagementProps> = ({ onNavigate }) => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrgId, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMembers = teamMembers.slice(startIndex, startIndex + pageSize);

  // Edit Role Modal State
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [selectedRoleTier, setSelectedRoleTier] = useState<string>('staff');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [forceLastAdmin, setForceLastAdmin] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Operator Status Confirmation Modal State
  const [statusConfirmMember, setStatusConfirmMember] = useState<any | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState('staff');
  const [newUserPermissions, setNewUserPermissions] = useState<string[]>([]);
  const [newUserSendEmail, setNewUserSendEmail] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Sole Admin Block Modal State
  const [soleAdminBlockModal, setSoleAdminBlockModal] = useState<{ targetRole: string } | null>(null);

  // Row Detail Modal State
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<any | null>(null);

  // Helper to get effective complete permissions
  const getEffectivePermissions = (member: any): string[] => {
    if (Array.isArray(member?.permissions) && member.permissions.length > 0) {
      return member.permissions;
    }
    const roleKey = (member?.role || 'staff').toLowerCase();
    return ROLE_TEMPLATES[roleKey]?.defaultPerms || [];
  };

  // Count active administrators in current team
  const activeAdmins = teamMembers.filter(
    (m) => (m.role || '').toLowerCase() === 'admin' && m.is_active
  );

  // High-friction warning if removing last admin
  const isTargetingLastAdmin =
    editingMember?.role === 'admin' &&
    selectedRoleTier !== 'admin' &&
    activeAdmins.length <= 1;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Load organizations on mount
  useEffect(() => {
    const loadOrgs = async () => {
      setIsLoadingOrgs(true);
      try {
        const orgs = await api.getRoleOrganizations();
        if (Array.isArray(orgs)) {
          setOrganizations(orgs);
          // Check URL query param '?org='
          const searchParams = new URLSearchParams(window.location.search);
          const orgParam = searchParams.get('org');
          if (orgParam && orgs.some((o) => o.id === orgParam)) {
            setSelectedOrgId(orgParam);
          } else if (orgs.length > 0) {
            setSelectedOrgId(orgs[0].id);
          }
        }
      } catch (err: any) {
        showToast('Failed to load organizations', 'error');
      } finally {
        setIsLoadingOrgs(false);
      }
    };
    loadOrgs();
  }, []);

  // When selectedOrgId changes, update selectedOrg and fetch team members
  useEffect(() => {
    if (!selectedOrgId) return;
    const org = organizations.find((o) => o.id === selectedOrgId);
    setSelectedOrg(org || null);

    const loadTeam = async () => {
      setIsLoadingTeam(true);
      try {
        const team = await api.getRoleOrganizationTeam(selectedOrgId);
        if (Array.isArray(team)) {
          setTeamMembers(team);
        }
      } catch (err: any) {
        showToast('Failed to load organization team', 'error');
      } finally {
        setIsLoadingTeam(false);
      }
    };
    loadTeam();
  }, [selectedOrgId, organizations]);

  // Open Edit Role Modal
  const handleOpenEditRole = (member: any) => {
    setEditingMember(member);
    const roleKey = ROLE_TEMPLATES[member.role] ? member.role : 'staff';
    setSelectedRoleTier(roleKey);
    const effective = getEffectivePermissions(member);
    setSelectedPermissions(effective.length > 0 ? effective : ROLE_TEMPLATES[roleKey].defaultPerms);
    setForceLastAdmin(false);
  };

  // Change Role Tier with Sole Admin Block
  const handleRoleTierChange = (newRole: string) => {
    const isSoleAdmin =
      (editingMember?.role || '').toLowerCase() === 'admin' &&
      activeAdmins.length <= 1;

    if (isSoleAdmin && newRole !== 'admin') {
      const targetLabel = ROLE_TEMPLATES[newRole]?.label || newRole;
      setSoleAdminBlockModal({ targetRole: targetLabel });
      return;
    }

    setSelectedRoleTier(newRole);
    if (ROLE_TEMPLATES[newRole]) {
      setSelectedPermissions(ROLE_TEMPLATES[newRole].defaultPerms);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const isSoleAdmin =
      (editingMember?.role || '').toLowerCase() === 'admin' &&
      activeAdmins.length <= 1;

    if (isSoleAdmin && selectedRoleTier !== 'admin') {
      const targetLabel = ROLE_TEMPLATES[selectedRoleTier]?.label || selectedRoleTier;
      setSoleAdminBlockModal({ targetRole: targetLabel });
      return;
    }

    setIsSavingRole(true);
    try {
      const res = await api.updateUserRoleAndPermissions(editingMember.id, {
        role: selectedRoleTier,
        permissions: selectedPermissions,
        force_last_admin: forceLastAdmin,
      });

      if (res && res.requires_safeguard) {
        showToast(
          'Last Administrator removal intercepted. Request sent to Security Safeguards Approval Queue for dual-authorization.',
          'error'
        );
      } else {
        showToast(`Roles and permissions updated for ${editingMember.full_name}.`);
      }

      setEditingMember(null);
      const updated = await api.getRoleOrganizationTeam(selectedOrgId);
      if (Array.isArray(updated)) setTeamMembers(updated);
      const updatedOrgs = await api.getRoleOrganizations();
      if (Array.isArray(updatedOrgs)) setOrganizations(updatedOrgs);
    } catch (err: any) {
      showToast(err.message || 'Failed to update member role.', 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  // Add User Modal Handlers
  const handleOpenAddUser = () => {
    setNewUserName('');
    setNewUserEmail('');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewUserPassword(pass);
    setShowNewUserPassword(false);
    setNewUserRole('staff');
    setNewUserPermissions(ROLE_TEMPLATES.staff.defaultPerms);
    setNewUserSendEmail(true);
    setIsAddUserModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewUserPassword(pass);
  };

  const handleNewUserRoleChange = (role: string) => {
    setNewUserRole(role);
    if (ROLE_TEMPLATES[role]) {
      setNewUserPermissions(ROLE_TEMPLATES[role].defaultPerms);
    }
  };

  const toggleNewUserPermission = (permId: string) => {
    setNewUserPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    setIsCreatingUser(true);
    try {
      await api.createRoleOrganizationUser(selectedOrgId, {
        full_name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        permissions: newUserPermissions,
        send_email: newUserSendEmail,
      });
      showToast(`User ${newUserName.trim()} successfully added to ${selectedOrg?.name || 'organization'}.`);
      setIsAddUserModalOpen(false);
      const updatedTeam = await api.getRoleOrganizationTeam(selectedOrgId);
      if (Array.isArray(updatedTeam)) setTeamMembers(updatedTeam);
      const updatedOrgs = await api.getRoleOrganizations();
      if (Array.isArray(updatedOrgs)) setOrganizations(updatedOrgs);
    } catch (err: any) {
      showToast(err.message || 'Failed to create user.', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleOpenToggleStatus = (member: any) => {
    setStatusConfirmMember(member);
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmMember) return;
    const targetStatus = !statusConfirmMember.is_active;
    setIsTogglingStatus(true);
    try {
      await api.toggleRoleUserStatus(statusConfirmMember.id, targetStatus);
      showToast(`User ${statusConfirmMember.full_name} has been ${targetStatus ? 'reactivated' : 'suspended'}.`);
      setStatusConfirmMember(null);
      const updated = await api.getRoleOrganizationTeam(selectedOrgId);
      if (Array.isArray(updated)) setTeamMembers(updated);
      const updatedOrgs = await api.getRoleOrganizations();
      if (Array.isArray(updatedOrgs)) setOrganizations(updatedOrgs);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle member status', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const orgSelectOptions: DropdownOption[] = organizations.map((o) => ({
    value: o.id,
    label: `${o.name} (${o.company_code || o.unique_code || 'N/A'})`,
  }));

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-6">
      <PageMeta
        title="Tenant Role & RBAC Management | Invenza Platform"
        description="Tenant-scoped role and granular permission management with template roles and safety guardrails against admin lockout."
        canonicalPath="/role-management"
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold animate-in slide-in-from-top duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/90 dark:border-emerald-500/40 dark:text-emerald-300 backdrop-blur-xl'
              : 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/90 dark:border-rose-500/40 dark:text-rose-300 backdrop-blur-xl'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-teal-600 dark:text-teal-400 mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Tenant-Scoped RBAC Administration</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Role & Permission Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Template-based access control with granular permission toggles. Every role is strictly tenant-scoped to guarantee strict multi-tenant isolation.
          </p>
        </div>

        {/* Organization Picker */}
        <div className="w-full md:w-80 shrink-0">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Select Organization:
          </label>
          <SimpleSelectDropdown
            options={orgSelectOptions}
            value={selectedOrgId}
            onChange={(val) => {
              setSelectedOrgId(val);
              const url = new URL(window.location.href);
              url.searchParams.set('org', val);
              window.history.pushState({}, '', url.toString());
            }}
            placeholder="Select an Organization..."
          />
        </div>
      </div>

      {/* Selected Org Context Banner */}
      {selectedOrg && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-sm border border-teal-500/25 shrink-0">
              {selectedOrg.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {selectedOrg.name}
                </h2>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                  <Key className="w-3 h-3" />
                  <span>{selectedOrg.company_code || selectedOrg.unique_code || 'N/A'}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>{selectedOrg.industry || 'General'}</span>
                <span>&bull;</span>
                <span>{selectedOrg.location || 'Headquarters'}</span>
                <span>&bull;</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                  {teamMembers.length} active operators
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Add User Button (Prompt Item 1) */}
            <button
              type="button"
              onClick={handleOpenAddUser}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-subtle"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.('billing', { org: selectedOrg.id })}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0C1017] hover:bg-teal-500/10 hover:text-teal-600 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              View Billing Account &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Team & Roles Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Enrolled Operators & Access Matrix
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {teamMembers.length} Members
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            {/* All 6 headers center-aligned (Prompt Item 4) */}
            <thead className="bg-[#F8FAFC] dark:bg-[#0C1017] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="w-[20%] px-3.5 py-2.5 text-center">Operator</th>
                <th className="w-[15%] px-3.5 py-2.5 text-center">Role Tier</th>
                <th className="w-[38%] px-3.5 py-2.5 text-center">Granted Granular Permissions</th>
                <th className="w-[10%] px-3.5 py-2.5 text-center">Status</th>
                <th className="w-[9%] px-3.5 py-2.5 text-center">Enrolled</th>
                <th className="w-[8%] px-3.5 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    <p className="font-semibold text-sm">No members enrolled for this organization</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Add User" above or select another organization from the dropdown.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => {
                  const roleCfg = ROLE_TEMPLATES[m.role] || {
                    label: (m.role || 'OPERATOR').toUpperCase(),
                    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  };
                  const effectivePerms = getEffectivePermissions(m);

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMemberForDetail(m)}
                      className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      title="Click to view operator details"
                    >
                      {/* Operator Identity — Left-aligned, avatar + name only, NO email (Prompt Items 5 & 7) */}
                      <td className="px-3.5 py-2.5 text-left whitespace-nowrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs shrink-0 border border-teal-500/20">
                            {m.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white truncate text-xs" title={m.full_name}>
                            {m.full_name}
                          </span>
                        </div>
                      </td>

                      {/* Role Tier — Center-aligned (Prompt Item 5) */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${roleCfg.badgeColor}`}>
                          {roleCfg.label}
                        </span>
                      </td>

                      {/* Complete Granular Permissions — Center-aligned, accurately displayed for all roles (Prompt Items 3 & 5) */}
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {effectivePerms.length === 0 ? (
                            <span className="text-slate-400 text-[10px] italic">No permissions assigned</span>
                          ) : (
                            effectivePerms.map((p: string) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0C1017] text-slate-700 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-800 shrink-0"
                              >
                                {p}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Status — Center-aligned (Prompt Item 5) */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            m.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25'
                          }`}
                        >
                          {m.is_active ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>

                      {/* Enrolled At — Center-aligned (Prompt Item 5) */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions — Center-aligned, stops row click propagation (Prompt Item 5 & 6) */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <div
                          className="inline-flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEditRole(m)}
                            className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors border border-slate-200 dark:border-slate-700"
                            title="Edit Role & Permissions"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenToggleStatus(m)}
                            className={`p-1.5 rounded-md transition-colors border ${
                              m.is_active
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-slate-200 dark:border-slate-700'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/25'
                            }`}
                            title={m.is_active ? 'Suspend Operator' : 'Reactivate Operator'}
                          >
                            {m.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Shared Reusable Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={teamMembers.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="operators"
        />
      </div>

      {/* Detail View Modal (Prompt Item 6) */}
      {selectedMemberForDetail && (
        <Modal
          isOpen={!!selectedMemberForDetail}
          onClose={() => setSelectedMemberForDetail(null)}
          title="Operator Profile & Access Matrix"
          subtitle={`${selectedMemberForDetail.full_name} • ${selectedOrg?.name || 'Tenant Organization'}`}
          maxWidth="xl"
        >
          <div className="space-y-6 text-xs">
            {/* Header Hero Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-50 dark:via-[#0C1017] to-slate-50 dark:to-[#0C1017] border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white font-bold text-lg shadow-subtle shrink-0">
                  {selectedMemberForDetail.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedMemberForDetail.full_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="w-3 h-3 text-teal-500 shrink-0" />
                    <span className="font-mono">{selectedMemberForDetail.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(() => {
                  const roleCfg = ROLE_TEMPLATES[selectedMemberForDetail.role] || {
                    label: (selectedMemberForDetail.role || 'OPERATOR').toUpperCase(),
                    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  };
                  return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${roleCfg.badgeColor}`}>
                      {roleCfg.label}
                    </span>
                  );
                })()}

                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
                    selectedMemberForDetail.is_active
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25'
                  }`}
                >
                  {selectedMemberForDetail.is_active ? 'ACTIVE' : 'SUSPENDED'}
                </span>
              </div>
            </div>

            {/* Grid 1: Organization & Identity Metadata */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2.5 flex items-center gap-1.5 font-mono">
                <Building2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Tenant Organization Assignment</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Organization</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedOrg?.name || 'Assigned Tenant'}
                  </div>
                  <div className="text-[10px] font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                    {selectedOrg?.company_code || selectedOrg?.unique_code || 'N/A'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Domain & Location</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedOrg?.industry || 'General Industry'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedOrg?.location || 'Headquarters'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Enrollment Date</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {new Date(selectedMemberForDetail.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Account provisioned
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 2: Granted Granular Permissions Matrix */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5 font-mono">
                  <Key className="w-3.5 h-3.5 text-teal-500" />
                  <span>Granted Granular Permissions</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {getEffectivePermissions(selectedMemberForDetail).length} / {GRANULAR_PERMISSIONS.length} Privileges Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GRANULAR_PERMISSIONS.map((perm) => {
                  const effective = getEffectivePermissions(selectedMemberForDetail);
                  const isGranted = effective.includes(perm.id);

                  return (
                    <div
                      key={perm.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                        isGranted
                          ? 'bg-teal-500/5 border-teal-500/25 text-slate-900 dark:text-white'
                          : 'bg-[#F8FAFC] dark:bg-[#0C1017]/60 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                      }`}
                    >
                      <div
                        className={`p-1 rounded-md shrink-0 mt-0.5 ${
                          isGranted
                            ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs leading-snug">
                          {perm.label}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="font-bold text-teal-600 dark:text-teal-400">{perm.category}</span>
                          <span>&bull;</span>
                          <span>{perm.id}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedMemberForDetail(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedMemberForDetail;
                    setSelectedMemberForDetail(null);
                    handleOpenToggleStatus(target);
                  }}
                  className={`px-3.5 py-2 rounded-lg font-semibold text-xs border transition-colors flex items-center gap-1.5 ${
                    selectedMemberForDetail.is_active
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-500 border-slate-200 dark:border-slate-700'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  {selectedMemberForDetail.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  <span>{selectedMemberForDetail.is_active ? 'Suspend Operator' : 'Reactivate Operator'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = selectedMemberForDetail;
                    setSelectedMemberForDetail(null);
                    handleOpenEditRole(target);
                  }}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-subtle flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Role & Permissions</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Operator Modal (Prompt Item 1) */}
      {isAddUserModalOpen && (
        <Modal
          isOpen={isAddUserModalOpen}
          onClose={() => {
            if (!isCreatingUser) setIsAddUserModalOpen(false);
          }}
          title="Add New Operator"
          subtitle={`Enroll User to ${selectedOrg?.name || 'Selected Organization'}`}
          maxWidth="lg"
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. john@company.com"
                  className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Initial Password *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold"
                >
                  Generate Strong Password
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewUserPassword ? 'text' : 'password'}
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Tier Selection */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">
                Select Assigned Role Template:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(ROLE_TEMPLATES).map(([key, cfg]) => {
                  const isSelected = newUserRole === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleNewUserRoleChange(key)}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300 shadow-subtle'
                          : 'border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs capitalize">{key}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{cfg.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Permissions Checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Granular Permission Assignment:
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {newUserPermissions.length} / {GRANULAR_PERMISSIONS.length} Selected
                </span>
              </div>

              <div className="space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-[#F8FAFC] dark:bg-[#0C1017] max-h-48 overflow-y-auto">
                {GRANULAR_PERMISSIONS.map((perm) => {
                  const isGranted = newUserPermissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isGranted}
                        onChange={() => toggleNewUserPermission(perm.id)}
                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {perm.label}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {perm.id} &bull; {perm.category}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Email Dispatch Checkbox */}
            <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={newUserSendEmail}
                onChange={(e) => setNewUserSendEmail(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>Send welcome email with account credentials to operator</span>
            </label>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isCreatingUser}
                onClick={() => setIsAddUserModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingUser}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-subtle flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCreatingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isCreatingUser ? 'Creating...' : 'Enroll Operator'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sole Administrator Block Modal (Prompt Item 2) */}
      {soleAdminBlockModal && (
        <Modal
          isOpen={!!soleAdminBlockModal}
          onClose={() => setSoleAdminBlockModal(null)}
          title="Cannot Demote Sole Administrator"
          subtitle={`Platform Governance Guardrail • ${selectedOrg?.name || 'Organization'}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-xl border p-3.5 bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  Assign another user as Admin first, then update this user to {soleAdminBlockModal.targetRole}.
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                  Every organization must have at least one active Administrator to maintain administrative governance and configuration privileges.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] p-3 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Organization:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedOrg?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Admins:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">1 (Sole Administrator)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Required Action:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">Enroll or promote an alternate Admin</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setSoleAdminBlockModal(null)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-subtle transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Role & Permissions Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 text-xs">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit Role & Granular Permissions
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {editingMember.full_name} ({editingMember.email}) &bull; {selectedOrg?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Role Tier Selection */}
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">
                  Assigned Role Template:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(ROLE_TEMPLATES).map(([key, cfg]) => {
                    const isSelected = selectedRoleTier === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleRoleTierChange(key)}
                        className={`p-2.5 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300 shadow-subtle'
                            : 'border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-xs capitalize">{key}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{cfg.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* High Friction Alert: Removing Last Admin */}
              {isTargetingLastAdmin && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Warning: Removing the Sole Administrator</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">
                    This operator is currently the only administrator for {selectedOrg?.name}. Demoting them will leave the organization without admin access. In accordance with security protocol, this action requires explicit authorization via the Security Safeguards queue.
                  </p>
                  <label className="flex items-center gap-2 text-[11px] font-semibold pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceLastAdmin}
                      onChange={(e) => setForceLastAdmin(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>I confirm routing this action through Security Safeguards approval</span>
                  </label>
                </div>
              )}

              {/* Granular Permissions Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Granular Permission Overrides:
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {selectedPermissions.length} / {GRANULAR_PERMISSIONS.length} Granted
                  </span>
                </div>

                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-[#F8FAFC] dark:bg-[#0C1017]">
                  {GRANULAR_PERMISSIONS.map((perm) => {
                    const isGranted = selectedPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isGranted}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {perm.label}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {perm.id} &bull; {perm.category}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRole || (isTargetingLastAdmin && !forceLastAdmin)}
                  className="px-5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold shadow-subtle flex items-center gap-1.5"
                >
                  {isSavingRole ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Role & Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Operator Confirmation Modal */}
      {statusConfirmMember && (
        <Modal
          isOpen={!!statusConfirmMember}
          onClose={() => {
            if (!isTogglingStatus) setStatusConfirmMember(null);
          }}
          title={statusConfirmMember.is_active ? 'Suspend Operator' : 'Reactivate Operator'}
          subtitle={`Platform Access Control • ${selectedOrg?.name || 'Tenant Organization'}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div
              className={`rounded-xl border p-3.5 ${
                statusConfirmMember.is_active
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    statusConfirmMember.is_active
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {statusConfirmMember.is_active ? (
                    <PowerOff className="w-5 h-5" />
                  ) : (
                    <Power className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    Are you sure you want to {statusConfirmMember.is_active ? 'suspend' : 'reactivate'}{' '}
                    <span className={statusConfirmMember.is_active ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {statusConfirmMember.full_name}
                    </span>?
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {statusConfirmMember.email} &bull; Role: {statusConfirmMember.role_tier || statusConfirmMember.role || 'Operator'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] p-3 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Organization:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedOrg?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    statusConfirmMember.is_active
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}
                >
                  {statusConfirmMember.is_active ? 'ACTIVE' : 'SUSPENDED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Security Action:</span>
                <span
                  className={`font-bold ${
                    statusConfirmMember.is_active
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {statusConfirmMember.is_active ? 'BLOCK WORKSPACE LOGIN' : 'RESTORE WORKSPACE LOGIN'}
                </span>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              {statusConfirmMember.is_active
                ? 'When suspended, this operator cannot log in to Invenza. Any active sessions will be terminated immediately. Their historical ledger movements, orders, and assigned role templates remain intact.'
                : 'Reactivating will immediately restore platform login and inventory workspace access for this operator according to their granted permission matrix.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={() => setStatusConfirmMember(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleConfirmToggleStatus}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-subtle flex items-center gap-1.5 transition-all ${
                  statusConfirmMember.is_active
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                }`}
              >
                {isTogglingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>
                  {isTogglingStatus
                    ? 'Updating...'
                    : statusConfirmMember.is_active
                    ? 'Suspend Operator'
                    : 'Reactivate Operator'}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
