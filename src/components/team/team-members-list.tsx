'use client';

import { useState } from 'react';
import { Plus, Users, MoreHorizontal, Pencil, Trash2, Mail } from 'lucide-react';
import { RoleBadge } from './role-badge';
import { InviteMemberModal } from './invite-member-modal';
import { RelativeTime } from '@/components/date/relative-time';
import { usePermissions } from '@/hooks/use-permissions';
import type { Role } from '@/types/permissions';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  facilities: string[];
  lastActiveAt?: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
}

interface TeamMembersListProps {
  members: TeamMember[];
  invites: PendingInvite[];
  onInvite: (data: { email: string; role: Role; facilityIds: string[]; message?: string }) => Promise<void>;
  onEditMember?: (memberId: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onResendInvite?: (inviteId: string) => void;
  onRevokeInvite?: (inviteId: string) => void;
}

export function TeamMembersList({
  members,
  invites,
  onInvite,
  onEditMember,
  onRemoveMember,
  onResendInvite,
  onRevokeInvite,
}: TeamMembersListProps) {
  const { can } = usePermissions();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [openActions, setOpenActions] = useState<string | null>(null);

  const roleCounts = members.reduce(
    (acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}>
              Team Members
            </h3>
            <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {Object.entries(roleCounts).map(([role, count]) => (
              <span key={role} className="text-xs" style={{ color: 'var(--color-mid-gray)' }}>
                {count} <RoleBadge role={role as Role} />
              </span>
            ))}
          </div>
        </div>
        {can('inviteMembers') && (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors"
            style={{ fontFamily: 'var(--font-heading)', color: '#fff', backgroundColor: 'var(--color-gold)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Members table */}
      {members.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--color-light-gray)' }}>
          <Users className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--color-mid-gray)' }} />
          <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
            No team members yet. Invite your first member to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-light-gray)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-light-gray)' }}>
                {['Member', 'Role', 'Facilities', 'Last Active', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => (
                <tr key={member.id} style={{ borderBottom: idx < members.length - 1 ? '1px solid var(--color-light-gray)' : undefined }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
                        style={{ backgroundColor: 'var(--color-gold-light)', color: 'var(--color-gold)', fontFamily: 'var(--font-heading)' }}
                      >
                        {member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontSize: '13px' }}>
                          {member.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-mid-gray)' }}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}>
                      {member.facilities.length === 0 ? 'None' : member.facilities.join(', ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {member.lastActiveAt ? (
                      <RelativeTime date={member.lastActiveAt} />
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--color-mid-gray)' }}>Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {can('changeRoles') && member.role !== 'owner' && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenActions(openActions === member.id ? null : member.id)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--color-mid-gray)' }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openActions === member.id && (
                          <div
                            className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[140px]"
                            style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
                          >
                            {onEditMember && (
                              <button
                                type="button"
                                onClick={() => { onEditMember(member.id); setOpenActions(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                                style={{ color: 'var(--color-dark)' }}
                              >
                                <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--color-mid-gray)' }} />
                                Edit role
                              </button>
                            )}
                            {onRemoveMember && can('removeMembers') && (
                              <button
                                type="button"
                                onClick={() => { onRemoveMember(member.id); setOpenActions(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                                style={{ color: 'var(--color-red)' }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}>
            Pending Invites ({invites.length})
          </h4>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-light-gray)' }}>
            <table className="w-full text-sm">
              <tbody>
                {invites.map((invite, idx) => (
                  <tr key={invite.id} style={{ borderBottom: idx < invites.length - 1 ? '1px solid var(--color-light-gray)' : undefined }}>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontSize: '13px' }}>
                        {invite.email}
                      </span>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={invite.role} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--color-mid-gray)' }}>
                        Sent <RelativeTime date={invite.sentAt} />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {onResendInvite && (
                          <button
                            type="button"
                            onClick={() => onResendInvite(invite.id)}
                            className="text-xs font-medium"
                            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
                          >
                            <Mail className="h-3.5 w-3.5 inline mr-1" />
                            Resend
                          </button>
                        )}
                        {onRevokeInvite && (
                          <button
                            type="button"
                            onClick={() => onRevokeInvite(invite.id)}
                            className="text-xs font-medium"
                            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite modal */}
      <InviteMemberModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={onInvite}
      />
    </div>
  );
}
