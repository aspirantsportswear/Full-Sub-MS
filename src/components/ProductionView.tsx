import React, { useState } from 'react';
import {
  Printer,
  Plus,
  Search,
  Flame,
  Palette,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { ProductionOrder, Employee, SublimationEquipment, ShopSettings } from '../types';

interface ProductionViewProps {
  orders: ProductionOrder[];
  employees: Employee[];
  equipment: SublimationEquipment[];
  settings: ShopSettings;
  onAddOrder: (order: ProductionOrder) => void;
  onUpdateOrder: (order: ProductionOrder) => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  orders,
  employees,
  equipment,
  settings,
  onAddOrder,
  onUpdateOrder,
}) => {
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const artists = employees.filter((e) => e.role === 'artist');
  const operators = employees.filter((e) => e.role === 'machine_operator');

  // New Order Form
  const [orderForm, setOrderForm] = useState<{
    clientName: string;
    projectName: string;
    itemType: 'Basketball Jersey' | 'Cycling Apparel' | 'Esports Hoodie' | 'Polo Shirt' | 'Banner/Flag' | 'Rashguard' | 'Custom Fabric';
    quantity: number;
    metersRequired: number;
    assignedArtistId: string;
    assignedOperatorId: string;
    machineId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: string;
  }>({
    clientName: '',
    projectName: '',
    itemType: 'Basketball Jersey',
    quantity: 50,
    metersRequired: 75,
    assignedArtistId: artists[0]?.id || '',
    assignedOperatorId: operators[0]?.id || '',
    machineId: equipment[0]?.id || '',
    priority: 'medium',
    dueDate: '2026-09-05',
  });

  const stages = [
    'Design & RIP',
    'Sublimation Printing',
    'Heat Press Transfer',
    'Sewing & Finishing',
    'Ready for Delivery',
    'Completed',
  ];

  const handleStageChange = (order: ProductionOrder, newStage: ProductionOrder['stage']) => {
    let progress = 10;
    if (newStage === 'Design & RIP') progress = 20;
    if (newStage === 'Sublimation Printing') progress = 50;
    if (newStage === 'Heat Press Transfer') progress = 75;
    if (newStage === 'Sewing & Finishing') progress = 90;
    if (newStage === 'Ready for Delivery') progress = 95;
    if (newStage === 'Completed') progress = 100;

    onUpdateOrder({
      ...order,
      stage: newStage,
      progressPercent: progress,
    });
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const artist = employees.find((e) => e.id === orderForm.assignedArtistId);
    const op = employees.find((e) => e.id === orderForm.assignedOperatorId);
    const eq = equipment.find((m) => m.id === orderForm.machineId);

    const newOrder: ProductionOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: orderForm.clientName,
      projectName: orderForm.projectName,
      itemType: orderForm.itemType,
      quantity: orderForm.quantity,
      metersRequired: orderForm.metersRequired,
      assignedArtistId: orderForm.assignedArtistId,
      assignedArtistName: artist?.name || 'Unassigned',
      assignedOperatorId: orderForm.assignedOperatorId,
      assignedOperatorName: op?.name || 'Unassigned',
      machineId: orderForm.machineId,
      machineName: eq?.name || 'Epson SureColor F9470H',
      stage: 'Design & RIP',
      priority: orderForm.priority,
      startDate: '2026-08-27',
      dueDate: orderForm.dueDate,
      progressPercent: 20,
    };

    onAddOrder(newOrder);
    setShowAddModal(false);
  };

  const filteredOrders = orders.filter((ord) => {
    if (filterStage !== 'all' && ord.stage !== filterStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.clientName.toLowerCase().includes(q) ||
        ord.projectName.toLowerCase().includes(q) ||
        ord.assignedArtistName.toLowerCase().includes(q) ||
        ord.assignedOperatorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              Sublimation Production & Order Workflow Queue
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mt-0.5">
              Live tracking connecting Assigned Graphic Artists, Sublimation Printer & Heat Press Operators to client orders.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Sublimation Job</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 text-xs font-semibold">
            <button
              onClick={() => setFilterStage('all')}
              className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                filterStage === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Jobs ({orders.length})
            </button>
            {stages.map((st) => (
              <button
                key={st}
                onClick={() => setFilterStage(st)}
                className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                  filterStage === st
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search jobs, clients, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrders.map((ord) => (
          <div
            key={ord.id}
            className="dashboard-card-interactive bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Order #, Client, Priority */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md">
                      {ord.orderNumber}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{ord.clientName}</h3>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1">{ord.projectName}</p>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    ord.priority === 'urgent'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                      : ord.priority === 'high'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {ord.priority}
                </span>
              </div>

              {/* Progress Bar & Stage Dropdown */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-600" />
                    Stage:
                  </span>
                  <select
                    value={ord.stage}
                    onChange={(e) => handleStageChange(ord, e.target.value as any)}
                    className="text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-2 py-0.5 focus:outline-none"
                  >
                    {stages.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${ord.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Metrics (Quantity & Meters) */}
              <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Garment Volume</span>
                  <span className="font-bold text-slate-900">
                    {ord.quantity} pcs ({ord.itemType})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Sublimation Paper Required</span>
                  <span className="font-bold text-blue-700">{ord.metersRequired} Meters</span>
                </div>
              </div>
            </div>

            {/* Assigned Personnel & Equipment Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-600" />
                  Assigned Artist:
                </span>
                <span className="font-bold text-slate-900">{ord.assignedArtistName}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  Machine Operator:
                </span>
                <span className="font-bold text-slate-900">{ord.assignedOperatorName}</span>
              </div>

              <div className="flex items-center justify-between text-slate-500 pt-1 text-[11px]">
                <span>Machinery: <strong className="text-slate-700">{ord.machineName}</strong></span>
                <span>Due: <strong className="text-rose-600">{ord.dueDate}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Create New Sublimation Print Job
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 text-lg font-bold rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={orderForm.clientName}
                    onChange={(e) => setOrderForm({ ...orderForm, clientName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                    placeholder="e.g. Apex High School Athletics"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={orderForm.projectName}
                    onChange={(e) => setOrderForm({ ...orderForm, projectName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                    placeholder="e.g. Varsity Basketball Uniforms"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Item Category</label>
                  <select
                    value={orderForm.itemType}
                    onChange={(e) => setOrderForm({ ...orderForm, itemType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                  >
                    <option value="Basketball Jersey">Basketball Jersey</option>
                    <option value="Cycling Apparel">Cycling Apparel</option>
                    <option value="Esports Hoodie">Esports Hoodie</option>
                    <option value="Polo Shirt">Polo Shirt</option>
                    <option value="Banner/Flag">Banner / Flag</option>
                    <option value="Rashguard">Rashguard / Compression</option>
                    <option value="Custom Fabric">Custom Fabric</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity (pcs)</label>
                  <input
                    type="number"
                    value={orderForm.quantity}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meters Required</label>
                  <input
                    type="number"
                    value={orderForm.metersRequired}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, metersRequired: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assigned Graphic Artist
                  </label>
                  <select
                    value={orderForm.assignedArtistId}
                    onChange={(e) => setOrderForm({ ...orderForm, assignedArtistId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                  >
                    {artists.map((art) => (
                      <option key={art.id} value={art.id}>
                        {art.name} ({art.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assigned Machine Operator
                  </label>
                  <select
                    value={orderForm.assignedOperatorId}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, assignedOperatorId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                  >
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Machinery Unit</label>
                  <select
                    value={orderForm.machineId}
                    onChange={(e) => setOrderForm({ ...orderForm, machineId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                  >
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={orderForm.dueDate}
                    onChange={(e) => setOrderForm({ ...orderForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-center cursor-pointer border border-slate-200 sm:border-transparent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer text-center justify-center transition-colors active:scale-98"
                >
                  Queue Sublimation Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
