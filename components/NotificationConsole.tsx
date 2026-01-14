import React, { useMemo, useState } from 'react';
import { User, Project, RoleDefinition } from '../types';

export type NotificationTargetType = 'user' | 'role' | 'project' | 'all';

export interface ManualNotificationPayload {
  targetType: NotificationTargetType;
  targetIds: string[];
  title: string;
  body: string;
}

export type PermissionState = NotificationPermission | 'unsupported';

interface NotificationConsoleProps {
  currentUserId: string;
  users: User[];
  projects: Project[];
  roles: RoleDefinition[];
  onSend: (payload: ManualNotificationPayload) => Promise<void>;
  onEnablePush?: () => Promise<string | null>;
  permissionState?: PermissionState;
  currentToken?: string | null;
}

const NotificationConsole: React.FC<NotificationConsoleProps> = ({ currentUserId, users, projects, roles, onSend, onEnablePush, permissionState, currentToken }) => {
  const [targetType, setTargetType] = useState<NotificationTargetType>('user');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState('');

  const selectableUsers = useMemo(() => users.filter(u => u && u.id !== currentUserId), [users, currentUserId]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setFeedback('Title and body are required.');
      return;
    }
    if (targetType !== 'all' && targetIds.length === 0) {
      setFeedback('Choose at least one target.');
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      await onSend({ targetType, targetIds, title: title.trim(), body: body.trim() });
      setFeedback('Notification enqueued.');
      setTitle('');
      setBody('');
      setTargetIds([]);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const handleEnablePush = async () => {
    if (!onEnablePush) return;
    try {
      setPushStatus('Requesting permission...');
      const token = await onEnablePush();
      setPushStatus(token ? 'Push enabled.' : 'Permission was not granted.');
    } catch (err) {
      setPushStatus(err instanceof Error ? err.message : 'Failed to enable push.');
    }
  };

  const renderTargetControl = () => {
    if (targetType === 'user') {
      return (
        <select
          multiple
          value={targetIds}
          onChange={(e) => setTargetIds(Array.from(e.target.selectedOptions).map(o => (o as HTMLOptionElement).value))}
          className="w-full border rounded-md p-2 text-sm"
        >
          {selectableUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>
          ))}
        </select>
      );
    }
    if (targetType === 'role') {
      return (
        <select
          multiple
          value={targetIds}
          onChange={(e) => setTargetIds(Array.from(e.target.selectedOptions).map(o => (o as HTMLOptionElement).value))}
          className="w-full border rounded-md p-2 text-sm"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
      );
    }
    if (targetType === 'project') {
      return (
        <select
          multiple
          value={targetIds}
          onChange={(e) => setTargetIds(Array.from(e.target.selectedOptions).map(o => (o as HTMLOptionElement).value))}
          className="w-full border rounded-md p-2 text-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      );
    }
    return <p className="text-sm text-slate-500">All users will receive this notification.</p>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Manual Notifications</h3>
          <p className="text-sm text-slate-500">Send a one-off notification to users, roles, projects, or everyone.</p>
        </div>
        {feedback && <span className="text-sm text-slate-600">{feedback}</span>}
      </div>

      {onEnablePush && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="flex flex-col">
            <span className="font-medium">Push delivery</span>
            <span className="text-slate-600">Permission: {permissionState || 'unknown'} {pushStatus && `• ${pushStatus}`}</span>
            {currentToken && (
              <span className="text-[11px] text-slate-500 break-all">Token: {currentToken}</span>
            )}
          </div>
          <button
            onClick={handleEnablePush}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900"
          >
            Enable push
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Target type</label>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value as NotificationTargetType); setTargetIds([]); }}
            className="w-full border rounded-md p-2 text-sm"
          >
            <option value="user">Specific users</option>
            <option value="role">Roles / groups</option>
            <option value="project">Projects</option>
            <option value="all">All users</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Targets</label>
          {renderTargetControl()}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-md p-2 text-sm"
          placeholder="System update"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full border rounded-md p-2 text-sm"
          rows={3}
          placeholder="A short message to recipients"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send notification'}
        </button>
      </div>
    </div>
  );
};

export default NotificationConsole;
