'use client';

import { useState } from 'react';
import { Loader2, X, Send } from 'lucide-react';
import { useFacility } from '@/lib/facility-context';
import { usePermissions } from '@/hooks/use-permissions';
import { assignableRoles, ROLE_CONFIG } from '@/types/permissions';
import type { Role } from '@/types/permissions';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (data: { email: string; role: Role; facilityIds: string[]; message?: string }) => Promise<void>;
}

export function InviteMemberModal({ open, onClose, onInvite }: InviteMemberModalProps) {
  const { role } = usePermissions();
  const { facilities } = useFacility();
  const roles = assignableRoles(role);

  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>(roles[0] || 'viewer');
  const [facilityIds, setFacilityIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const toggleFacility = (id: string) => {
    setFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (!email.includes('@')) { setError('Enter a valid email'); return; }
    if (facilityIds.length === 0) { setError('Select at least one facility'); return; }

    setSending(true);
    try {
      await onInvite({ email, role: selectedRole, facilityIds, message: message || undefined });
      setEmail('');
      setSelectedRole(roles[0] || 'viewer');
      setFacilityIds([]);
      setMessage('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}>
            Invite Team Member
          </h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--color-mid-gray)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
              style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
              autoFocus
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
              Role
            </label>
            <div className="flex gap-2">
              {roles.map((r) => {
                const cfg = ROLE_CONFIG[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium text-center transition-colors"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      borderColor: selectedRole === r ? cfg.color : 'var(--color-light-gray)',
                      backgroundColor: selectedRole === r ? cfg.bg : 'var(--color-light)',
                      color: selectedRole === r ? cfg.color : 'var(--color-body-text)',
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Facilities */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
              Facility Access
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {facilities.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    borderColor: facilityIds.includes(f.id) ? 'var(--color-gold)' : 'var(--color-light-gray)',
                    backgroundColor: facilityIds.includes(f.id) ? 'var(--color-gold-light)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={facilityIds.includes(f.id)}
                    onChange={() => toggleFacility(f.id)}
                    className="accent-[var(--color-gold)]"
                  />
                  <div>
                    <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontSize: '13px' }}>
                      {f.name}
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--color-mid-gray)' }}>{f.location}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Personal message */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
              Personal Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Add a note to the invitation..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)] resize-none"
              style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs" style={{ color: 'var(--color-red)', fontFamily: 'var(--font-body)' }}>{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-heading)', color: '#fff', backgroundColor: 'var(--color-gold)' }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
