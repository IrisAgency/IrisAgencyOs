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

  const handleToggleTarget = (id: string) => {
    setTargetIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const renderTargetControl = () => {
    if (targetType === 'user') {
      return (
        <div className="w-full border border-slate-300 rounded-md p-3 text-sm bg-white max-h-[200px] overflow-y-auto space-y-2">
          {selectableUsers.map((u) => (
            <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
              <input
                type="checkbox"
                checked={targetIds.includes(u.id)}
                onChange={() => handleToggleTarget(u.id)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-900">{u.name || u.email || u.id}</span>
            </label>
          ))}
        </div>
      );
    }
    if (targetType === 'role') {
      return (
        <div className="w-full border border-slate-300 rounded-md p-3 text-sm bg-white max-h-[200px] overflow-y-auto space-y-2">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
              <input
                type="checkbox"
                checked={targetIds.includes(r.name)}
                onChange={() => handleToggleTarget(r.name)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-900">{r.name}</span>
            </label>
          ))}
        </div>
      );
    }
    if (targetType === 'project') {
      return (
        <div className="w-full border border-slate-300 rounded-md p-3 text-sm bg-white max-h-[200px] overflow-y-auto space-y-2">
          {projects.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
              <input
                type="checkbox"
                checked={targetIds.includes(p.id)}
                onChange={() => handleToggleTarget(p.id)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-900">{p.name}</span>
            </label>
          ))}
        </div>
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
            className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white text-slate-900"
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
          className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white text-slate-900 placeholder:text-slate-400"
          placeholder="System update"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white text-slate-900 placeholder:text-slate-400"
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
