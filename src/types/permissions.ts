// Permissions & roles for multi-user access control

export type Role = 'owner' | 'admin' | 'manager' | 'viewer';

export type PermissionAction =
  | 'viewDashboard'
  | 'viewGlobalRollup'
  | 'viewCampaigns'
  | 'createCampaign'
  | 'editCampaign'
  | 'pauseResumeCampaign'
  | 'deleteCampaign'
  | 'viewLandingPages'
  | 'createLandingPage'
  | 'editLandingPage'
  | 'publishLandingPage'
  | 'deleteLandingPage'
  | 'viewReports'
  | 'generateReport'
  | 'exportReport'
  | 'viewSettings'
  | 'editProfile'
  | 'manageIntegrations'
  | 'manageBilling'
  | 'manageTeam'
  | 'inviteMembers'
  | 'removeMembers'
  | 'changeRoles'
  | 'deleteAccount'
  | 'addFacility'
  | 'editFacility'
  | 'deactivateFacility';

/** Which roles can perform each action */
export const PERMISSION_MATRIX: Record<PermissionAction, Role[]> = {
  viewDashboard: ['owner', 'admin', 'manager', 'viewer'],
  viewGlobalRollup: ['owner', 'admin'],
  viewCampaigns: ['owner', 'admin', 'manager', 'viewer'],
  createCampaign: ['owner', 'admin', 'manager'],
  editCampaign: ['owner', 'admin', 'manager'],
  pauseResumeCampaign: ['owner', 'admin', 'manager'],
  deleteCampaign: ['owner', 'admin'],
  viewLandingPages: ['owner', 'admin', 'manager', 'viewer'],
  createLandingPage: ['owner', 'admin', 'manager'],
  editLandingPage: ['owner', 'admin', 'manager'],
  publishLandingPage: ['owner', 'admin'],
  deleteLandingPage: ['owner', 'admin'],
  viewReports: ['owner', 'admin', 'manager', 'viewer'],
  generateReport: ['owner', 'admin', 'manager'],
  exportReport: ['owner', 'admin', 'manager'],
  viewSettings: ['owner', 'admin', 'manager', 'viewer'],
  editProfile: ['owner', 'admin', 'manager', 'viewer'],
  manageIntegrations: ['owner', 'admin'],
  manageBilling: ['owner'],
  manageTeam: ['owner', 'admin'],
  inviteMembers: ['owner', 'admin'],
  removeMembers: ['owner', 'admin'],
  changeRoles: ['owner', 'admin'],
  deleteAccount: ['owner'],
  addFacility: ['owner', 'admin'],
  editFacility: ['owner', 'admin'],
  deactivateFacility: ['owner'],
};

/** Check if a role has permission for an action */
export function hasPermission(role: Role, action: PermissionAction): boolean {
  return PERMISSION_MATRIX[action]?.includes(role) ?? false;
}

export const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  owner: { label: 'Owner', color: 'var(--color-gold)', bg: 'var(--color-gold-light)' },
  admin: { label: 'Admin', color: 'var(--color-blue)', bg: 'rgba(106, 155, 204, 0.15)' },
  manager: { label: 'Manager', color: 'var(--color-green)', bg: 'rgba(120, 140, 93, 0.15)' },
  viewer: { label: 'Viewer', color: 'var(--color-mid-gray)', bg: 'var(--color-light-gray)' },
};

/** Roles that a given role can assign to others */
export function assignableRoles(role: Role): Role[] {
  if (role === 'owner') return ['admin', 'manager', 'viewer'];
  if (role === 'admin') return ['manager', 'viewer'];
  return [];
}
