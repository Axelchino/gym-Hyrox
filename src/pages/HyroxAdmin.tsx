import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeTokens } from '../utils/themeHelpers';
import { getAdminGroupsOverview, isHyroxAdmin } from '../services/hyroxService';
import type { HyroxAdminGroupSummary } from '../types/hyrox';

export default function HyroxAdmin() {
  const { user, loading } = useAuth();
  const tokens = useThemeTokens();
  const [groups, setGroups] = useState<HyroxAdminGroupSummary[] | null>(null);
  const [error, setError] = useState('');

  const admin = isHyroxAdmin(user?.email);

  useEffect(() => {
    if (!admin) return;
    getAdminGroupsOverview().then(setGroups).catch((e) => setError(e.message || 'Failed to load'));
  }, [admin]);

  if (loading) return null;
  if (!admin) return <Navigate to="/hyrox" replace />;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16 pt-4">
      <div className="text-xl font-black text-primary mb-1">HYROX — ALL GROUPS</div>
      <div className="text-xs text-secondary font-mono mb-4">Summary only — no per-day or station detail</div>

      {error && <div className="text-sm mb-3" style={{ color: '#E03131' }}>{error}</div>}

      {!groups ? (
        <div className="text-sm text-secondary">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="text-sm text-secondary">No groups yet.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.groupId} className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
              <div className="font-black text-primary mb-2">{g.groupName}</div>
              {g.members.length === 0 ? (
                <div className="text-sm text-secondary">No members yet.</div>
              ) : (
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="text-left text-secondary text-xs">
                      <th className="font-semibold pb-1">Member</th>
                      <th className="font-semibold pb-1">Week</th>
                      <th className="font-semibold pb-1 text-right">% Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.members.map((m, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <td className="py-1.5 text-primary font-semibold">{m.name}</td>
                        <td className="py-1.5 text-primary font-mono">{m.currentWeek || '—'}</td>
                        <td className="py-1.5 text-primary font-mono text-right">{m.percentDone}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
