import React, { useMemo, useState } from 'react';
import { EmployeeAsset, User } from '../../types';
import { Laptop, Package, ArrowLeft, Plus, AlertCircle, Search } from 'lucide-react';
import HRStatusBadge from './HRStatusBadge';

interface AssetAssignmentProps {
  employeeAssets: EmployeeAsset[];
  users: User[];
  currentUserId: string;
  checkPermission?: (code: string) => boolean;
  onAssign: (asset: Partial<EmployeeAsset>) => void;
  onReturn: (assetId: string) => void;
}

const ASSET_CATEGORIES = ['laptop', 'phone', 'monitor', 'keyboard', 'headset', 'access-card', 'vehicle', 'other'] as const;

const AssetAssignment: React.FC<AssetAssignmentProps> = ({
  employeeAssets,
  users,
  currentUserId,
  checkPermission,
  onAssign,
  onReturn,
}) => {
  const canManage = checkPermission?.('hr.assets.manage');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'returned'>('all');

  // Form state
  const [assignUserId, setAssignUserId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<string>('laptop');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  const filteredAssets = useMemo(() => {
    let assets = [...employeeAssets].sort((a, b) => new Date(b.assignedDate ?? 0).getTime() - new Date(a.assignedDate ?? 0).getTime());

    if (filterStatus === 'assigned') assets = assets.filter(a => a.status === 'assigned');
    if (filterStatus === 'returned') assets = assets.filter(a => a.status === 'returned');

    if (search) {
      const q = search.toLowerCase();
      assets = assets.filter(a => {
        const user = users.find(u => u.id === a.userId);
        return (
          a.assetName.toLowerCase().includes(q) ||
          a.serialNumber?.toLowerCase().includes(q) ||
          user?.name.toLowerCase().includes(q)
        );
      });
    }

    return assets;
  }, [employeeAssets, filterStatus, search, users]);

  const stats = useMemo(() => ({
    total: employeeAssets.length,
    assigned: employeeAssets.filter(a => a.status === 'assigned').length,
    returned: employeeAssets.filter(a => a.status === 'returned').length,
    overdue: employeeAssets.filter(a => a.status === 'assigned' && a.expectedReturnDate && new Date(a.expectedReturnDate) < new Date()).length,
  }), [employeeAssets]);

  const handleAssign = () => {
    if (!assignUserId || !assetName) return;
    onAssign({
      userId: assignUserId,
      assetName,
      assetCategory,
      serialNumber: serialNumber || undefined,
      notes: notes || undefined,
    });
    setShowForm(false);
    setAssignUserId('');
    setAssetName('');
    setSerialNumber('');
    setNotes('');
  };

  const categoryIcon: Record<string, string> = {
    laptop: '💻',
    phone: '📱',
    monitor: '🖥️',
    keyboard: '⌨️',
    headset: '🎧',
    'access-card': '🔑',
    vehicle: '🚗',
    other: '📦',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-iris-white">Asset Management</h3>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-1.5 bg-iris-red/20 text-iris-red rounded-lg text-xs font-medium hover:bg-iris-red/30">
            <Plus className="w-3.5 h-3.5" /> Assign Asset
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-iris-white">{stats.total}</span>
          <p className="text-xs text-iris-white/40">Total</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-green-400">{stats.assigned}</span>
          <p className="text-xs text-green-400/70">Assigned</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-blue-400">{stats.returned}</span>
          <p className="text-xs text-blue-400/70">Returned</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-red-400">{stats.overdue}</span>
          <p className="text-xs text-red-400/70">Overdue</p>
        </div>
      </div>

      {/* Assign Form */}
      {showForm && canManage && (
        <div className="bg-iris-black/60 border border-iris-red/20 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-iris-white/80">Assign New Asset</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-iris-white/50">Employee</label>
              <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none">
                <option value="">Select Employee</option>
                {users.filter(u => u.status !== 'inactive').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Category</label>
              <select value={assetCategory} onChange={e => setAssetCategory(e.target.value)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none">
                {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{categoryIcon[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Asset Name</label>
              <input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. MacBook Pro 14-inch" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Serial Number</label>
              <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-iris-white/10 text-iris-white/60 rounded-lg text-sm hover:bg-iris-white/20">Cancel</button>
            <button onClick={handleAssign} disabled={!assignUserId || !assetName} className="px-4 py-2 bg-iris-red/20 text-iris-red rounded-lg text-sm font-medium hover:bg-iris-red/30 disabled:opacity-40">Assign</button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iris-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="w-full pl-9 pr-3 py-2 bg-iris-black/60 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none" />
        </div>
        {(['all', 'assigned', 'returned'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize ${filterStatus === s ? 'bg-iris-red/20 text-iris-red' : 'bg-iris-black/60 text-iris-white/50 hover:text-iris-white/80'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Asset List */}
      <div className="space-y-2">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-10 text-iris-white/30 text-sm">No assets found</div>
        ) : (
          filteredAssets.map(asset => {
            const user = users.find(u => u.id === asset.userId);
            const isOverdue = asset.status === 'assigned' && asset.expectedReturnDate && new Date(asset.expectedReturnDate) < new Date();

            return (
              <div key={asset.id} className={`bg-iris-black/60 border ${isOverdue ? 'border-red-500/30' : 'border-iris-white/10'} rounded-xl p-4 flex items-center gap-4`}>
                <span className="text-2xl">{categoryIcon[asset.assetCategory ?? 'other'] || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-iris-white">{asset.assetName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${asset.status === 'assigned' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {asset.status}
                    </span>
                    {isOverdue && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-iris-white/40">
                    <span>{user?.name || 'Unknown'}</span>
                    {asset.serialNumber && <span>S/N: {asset.serialNumber}</span>}
                    <span>Assigned: {new Date(asset.assignedDate ?? '').toLocaleDateString()}</span>
                  </div>
                </div>
                {canManage && asset.status === 'assigned' && (
                  <button onClick={() => onReturn(asset.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30">
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AssetAssignment;
