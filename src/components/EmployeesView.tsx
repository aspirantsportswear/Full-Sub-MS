import React, { useState, useRef } from 'react';
import {
  Users,
  Palette,
  Printer,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  Briefcase,
  Layers,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Camera,
  Check,
  RotateCcw
} from 'lucide-react';
import { Employee, EmployeeRole, EmployeeStatus, ShopSettings } from '../types';
import { formatCurrency, getRoleBadgeColor } from '../utils/calculations';

// Curated permanent avatars representing sublimation studio roles
const PRESET_AVATARS = [
  {
    id: 'art-1',
    label: 'Graphic Designer',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'artist',
  },
  {
    id: 'art-2',
    label: 'Vector Artist',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'artist',
  },
  {
    id: 'op-1',
    label: 'Subli Operator',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'machine_operator',
  },
  {
    id: 'op-2',
    label: 'Heat Press Tech',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'machine_operator',
  },
  {
    id: 'sup-1',
    label: 'Floor Supervisor',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    role: 'supervisor',
  },
  {
    id: 'sew-1',
    label: 'Sewing Lead',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    role: 'sewing_finishing',
  },
  {
    id: 'qc-1',
    label: 'QC Tech',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    role: 'machine_operator',
  },
  {
    id: 'art-3',
    label: 'Jersey Illustrator',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'artist',
  },
];

interface EmployeesViewProps {
  employees: Employee[];
  settings: ShopSettings;
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  settings,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'artist' | 'machine_operator' | 'sewing_finishing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [avatarUploadLoading, setAvatarUploadLoading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    role: EmployeeRole;
    specialty: string;
    hourlyRate: number;
    pieceRateBonus: number;
    phone: string;
    email: string;
    status: EmployeeStatus;
    assignedStation: string;
    avatarUrl: string;
  }>({
    name: '',
    code: '',
    role: 'artist',
    specialty: '',
    hourlyRate: 20,
    pieceRateBonus: 10,
    phone: '',
    email: '',
    status: 'active',
    assignedStation: '',
    avatarUrl: PRESET_AVATARS[0].url,
  });

  const openAddModal = () => {
    setEditingEmp(null);
    setAvatarUploadError(null);
    setFormData({
      name: '',
      code: `EMP-0${employees.length + 1}`,
      role: 'artist',
      specialty: 'Graphic Layout & Sublimation Vectoring',
      hourlyRate: 22,
      pieceRateBonus: 10,
      phone: '+1 (555) 000-0000',
      email: '',
      status: 'active',
      assignedStation: 'Design Suite #1',
      avatarUrl: PRESET_AVATARS[0].url,
    });
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setAvatarUploadError(null);
    setFormData({
      name: emp.name,
      code: emp.code,
      role: emp.role,
      specialty: emp.specialty,
      hourlyRate: emp.hourlyRate,
      pieceRateBonus: emp.pieceRateBonus,
      phone: emp.phone,
      email: emp.email,
      status: emp.status,
      assignedStation: emp.assignedStation || '',
      avatarUrl: emp.avatarUrl || PRESET_AVATARS[0].url,
    });
    setShowModal(true);
  };

  // Convert uploaded image file into compressed permanent Base64 Data URL
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }

    setAvatarUploadLoading(true);
    setAvatarUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Offscreen canvas compression to 200x200 px square thumbnail
          const canvas = document.createElement('canvas');
          const maxDim = 200;
          let width = img.width;
          let height = img.height;

          // Crop or scale to square
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = maxDim;
          canvas.height = maxDim;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDim, maxDim);
            // Output Base64 JPEG
            const base64DataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setFormData((prev) => ({ ...prev, avatarUrl: base64DataUrl }));
          } else {
            setFormData((prev) => ({ ...prev, avatarUrl: event.target?.result as string }));
          }
        } catch (err) {
          console.warn('Canvas resize fallback:', err);
          setFormData((prev) => ({ ...prev, avatarUrl: event.target?.result as string }));
        } finally {
          setAvatarUploadLoading(false);
        }
      };
      img.onerror = () => {
        setAvatarUploadError('Failed to load image file.');
        setAvatarUploadLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setAvatarUploadError('Failed to read file.');
      setAvatarUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAvatar = formData.avatarUrl.trim() || PRESET_AVATARS[0].url;

    if (editingEmp) {
      onUpdateEmployee({
        ...editingEmp,
        ...formData,
        avatarUrl: finalAvatar,
      });
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        ...formData,
        avatarUrl: finalAvatar,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      onAddEmployee(newEmp);
    }
    setShowModal(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (activeTab !== 'all' && emp.role !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        emp.specialty.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Sublimation Artists & Machine Operators Personnel
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mt-0.5">
              Manage Graphic Artists (Jersey Design & Vectoring), Machine Operators (Printer & Heat Press Techs), skill sets, wage rates, and piece-rate incentives.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Personnel</span>
          </button>
        </div>

        {/* Tab & Search Controls */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Personnel ({employees.length})
            </button>
            <button
              onClick={() => setActiveTab('artist')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'artist'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-purple-700'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Artists ({employees.filter((e) => e.role === 'artist').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('machine_operator')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'machine_operator'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-blue-700'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Operators ({employees.filter((e) => e.role === 'machine_operator').length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, skill, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const roleBadge = getRoleBadgeColor(emp.role);

          return (
            <div
              key={emp.id}
              className="dashboard-card-interactive bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header: Avatar, Name, Role */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={emp.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                          {emp.code}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                        {emp.role === 'artist'
                          ? 'Graphic & Vector Artist'
                          : emp.role === 'machine_operator'
                          ? 'Machine & Press Operator'
                          : emp.role === 'sewing_finishing'
                          ? 'Sewing & Finishing'
                          : 'Supervisor'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                {/* Specialty */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-3 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                    Specialization
                  </span>
                  <p className="text-slate-800 font-medium">{emp.specialty}</p>
                </div>

                {/* Station */}
                {emp.assignedStation && (
                  <div className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                    <span className="truncate">Station: <strong>{emp.assignedStation}</strong></span>
                  </div>
                )}
              </div>

              {/* Wage Rates & Actions Footer */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Base Hourly</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(emp.hourlyRate, settings.currencySymbol)}/hr
                    </span>
                  </div>
                  <div className="p-2 bg-purple-50/70 rounded-lg">
                    <span className="text-[10px] text-purple-600 block">
                      {emp.role === 'artist' ? 'Bonus / Design' : 'Bonus / Meter'}
                    </span>
                    <span className="font-bold text-purple-700">
                      +{formatCurrency(emp.pieceRateBonus, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[120px]">{emp.email}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(emp)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Employee"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(emp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingEmp ? 'Edit Staff Member' : 'Register Personnel'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 text-lg font-bold rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Avatar Selection & Upload Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    Personnel Profile Picture / Avatar
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                    ✓ Stored Permanently
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Current Active Preview */}
                  <div className="relative group flex-shrink-0">
                    <img
                      src={formData.avatarUrl || PRESET_AVATARS[0].url}
                      alt={formData.name || 'Preview'}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-sm bg-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                      }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                    >
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span>Change</span>
                    </div>
                  </div>

                  {/* Upload Controls & Actions */}
                  <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageFileChange}
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploadLoading}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{avatarUploadLoading ? 'Compressing...' : 'Upload Photo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarUrl: PRESET_AVATARS[0].url })}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                        title="Reset to default avatar"
                      >
                        Reset Default
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Upload from your phone/computer (PNG, JPG) or choose a preset avatar below.
                    </p>

                    {avatarUploadError && (
                      <div className="text-rose-600 font-semibold text-[11px]">
                        {avatarUploadError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Preset Avatars Grid */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Or Select Preset Sublimation Role Avatar:
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = formData.avatarUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatarUrl: preset.url })}
                          className={`relative rounded-xl overflow-hidden p-0.5 border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 scale-105 shadow-sm ring-2 ring-indigo-200'
                              : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                          }`}
                          title={preset.label}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-10 object-cover rounded-lg"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow-md font-bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                    placeholder="e.g. Leo Vance"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                    placeholder="e.g. ART-04"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role Type *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                  >
                    <option value="artist">Graphic & Vector Artist</option>
                    <option value="machine_operator">Sublimation Machine Operator</option>
                    <option value="sewing_finishing">Sewing & Finishing Lead</option>
                    <option value="supervisor">Floor Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hourly Wage ({settings.currencySymbol}/hr) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {formData.role === 'artist' ? `Piece Bonus (${settings.currencySymbol}/Design)` : `Piece Bonus (${settings.currencySymbol}/Meter)`}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.pieceRateBonus}
                    onChange={(e) => setFormData({ ...formData, pieceRateBonus: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Station</label>
                  <input
                    type="text"
                    value={formData.assignedStation}
                    onChange={(e) => setFormData({ ...formData, assignedStation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                    placeholder="e.g. Epson F9470H Printer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Specialization / Skills</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                  placeholder="e.g. Continuous Rotary Heat Press / Jersey Color Separation"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                    placeholder="employee@apexsublimation.com"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                    placeholder="+63 912 345 6789"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-center cursor-pointer border border-slate-200 sm:border-transparent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer text-center justify-center transition-colors active:scale-98"
                >
                  {editingEmp ? 'Save Changes' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
