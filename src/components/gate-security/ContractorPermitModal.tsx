import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  X, 
  Phone, 
  Home, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck,
  Send,
  AlertCircle,
  IdCard
} from 'lucide-react';
import { ContractorAccessPass, ContractorServiceType, Resident } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface ContractorPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (pass: ContractorAccessPass) => void;
}

const SERVICE_PRESETS: ContractorServiceType[] = [
  'Air Conditioning / HVAC',
  'Electrical & Solar',
  'Plumbing & Drainage',
  'Carpentry & Woodwork',
  'Masonry & Construction',
  'Painting & Decorating',
  'Landscaping & Gardening',
  'Roofing & Aluminum',
  'Pest Control & Fumigation',
  'Cleaning & Janitorial',
  'Interior Decoration',
  'Other Service'
];

export const ContractorPermitModal: React.FC<ContractorPermitModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [companyName, setCompanyName] = useState('');
  const [leadContractorName, setLeadContractorName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [workerCount, setWorkerCount] = useState<number>(2);
  const [workerNames, setWorkerNames] = useState('');
  const [serviceType, setServiceType] = useState<ContractorServiceType>('Electrical & Solar');
  const [houseNumber, setHouseNumber] = useState('');
  const [residentName, setResidentName] = useState('');
  const [residentNumber, setResidentNumber] = useState('');
  const [idType, setIdType] = useState<'NIN' | "Driver's License" | "Voter's Card" | 'Company ID' | 'National Passport' | 'Other'>('NIN');
  const [idNumber, setIdNumber] = useState('');
  const [permitId, setPermitId] = useState('');
  const [notes, setNotes] = useState('');

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPass, setCreatedPass] = useState<ContractorAccessPass | null>(null);

  useEffect(() => {
    if (isOpen) {
      dbService.getResidents().then(setResidents);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleHouseSelect = (selectedHouse: string) => {
    setHouseNumber(selectedHouse);
    const matched = residents.find(r => r.house_number.toUpperCase() === selectedHouse.toUpperCase());
    if (matched) {
      setResidentName(matched.full_name);
      setResidentNumber(matched.resident_number);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !leadContractorName.trim() || !leadPhone.trim() || !houseNumber.trim() || !idNumber.trim()) {
      setError('Please provide company name, lead artisan name, phone, destination house, and ID number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await dbService.createContractorPass({
        company_name: companyName.trim(),
        lead_contractor_name: leadContractorName.trim(),
        lead_phone: leadPhone.trim(),
        worker_count: Number(workerCount) || 1,
        worker_names: workerNames.trim() || null,
        service_type: serviceType,
        house_number: houseNumber.trim(),
        resident_number: residentNumber || '999',
        resident_name: residentName.trim() || 'Resident Host',
        permit_id: permitId.trim() || undefined,
        id_type_recorded: idType,
        id_number: idNumber.trim(),
        valid_date: new Date().toISOString().split('T')[0],
        entry_time: new Date().toISOString(),
        status: 'Active On-Site',
        security_officer: 'Guard Sunday Eze',
        notes: notes.trim() || null
      });

      if (res.success && res.pass) {
        setCreatedPass(res.pass);
        if (onSuccess) onSuccess(res.pass);
      } else {
        setError(res.message || 'Failed to issue contractor permit.');
      }
    } catch {
      setError('Server error creating contractor permit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-xl w-full text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">
                Contractor & Artisan Work Permit
              </h3>
              <p className="text-xs text-slate-400">
                Register on-site artisans, verify national identification & log tool access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {createdPass ? (
            <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Contractor Work Pass Active</div>
                  <div className="text-lg font-black font-mono text-emerald-400">{createdPass.pass_code}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                <div><span className="text-slate-400">Company:</span> <strong className="text-white">{createdPass.company_name}</strong></div>
                <div><span className="text-slate-400">Lead Artisan:</span> <strong className="text-white">{createdPass.lead_contractor_name}</strong> ({createdPass.lead_phone})</div>
                <div><span className="text-slate-400">Service:</span> <strong className="text-amber-300">{createdPass.service_type}</strong> ({createdPass.worker_count} Workers On-Site)</div>
                <div><span className="text-slate-400">ID Verified:</span> <strong className="text-white font-mono">{createdPass.id_type_recorded}: {createdPass.id_number}</strong></div>
                <div><span className="text-slate-400">Host Plot:</span> <strong className="text-emerald-400">House {createdPass.house_number}</strong> ({createdPass.resident_name})</div>
                <div><span className="text-slate-400">Status:</span> <strong className="text-emerald-400 uppercase font-black">ACTIVE ON-SITE</strong></div>
              </div>

              <p className="text-xs text-slate-400 italic">
                * Work hours restricted to 08:00 - 17:00 (Mon - Sat). Sunday construction prohibited by estate bylaws.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Contractor / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Solar Engineering Ltd"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Trade / Service Category *
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as ContractorServiceType)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    {SERVICE_PRESETS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Lead Artisan Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadContractorName}
                    onChange={(e) => setLeadContractorName(e.target.value)}
                    placeholder="e.g. Engr. Samuel Bassey"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Lead Artisan Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="e.g. 08123344556"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    ID Type Presented *
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as any)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    <option value="NIN">National Identity (NIN)</option>
                    <option value="Driver's License">Driver's License</option>
                    <option value="Voter's Card">Voter's Card (INEC)</option>
                    <option value="Company ID">Company Staff ID</option>
                    <option value="National Passport">International Passport</option>
                    <option value="Other">Other ID</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    ID Number / Slip Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. NIN-89012345678"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Total Workers
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={workerCount}
                    onChange={(e) => setWorkerCount(Number(e.target.value))}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Worker Names (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={workerNames}
                    onChange={(e) => setWorkerNames(e.target.value)}
                    placeholder="e.g. Samuel Bassey, Tunde Alabi, Sunday Paul"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Plot / House Being Serviced *
                  </label>
                  <input
                    type="text"
                    required
                    value={houseNumber}
                    onChange={(e) => handleHouseSelect(e.target.value)}
                    placeholder="e.g. Plot 4A or House 12"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Resident Host
                  </label>
                  <input
                    type="text"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    placeholder="Auto-filled from plot selection"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  Equipment / Materials / Security Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Inverter batteries and solar mounting rails inspected at gate..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Processing...' : 'Issue Work Permit & Grant Access'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Artisan & Contractor Permit Desk</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
