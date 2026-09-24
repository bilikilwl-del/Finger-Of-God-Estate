import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  X, 
  Phone, 
  Home, 
  Package, 
  CheckCircle2, 
  Clock, 
  Send,
  AlertCircle
} from 'lucide-react';
import { CourierCompany, DeliveryAccessPass, PackageType, Resident } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface DeliveryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (pass: DeliveryAccessPass) => void;
}

const COURIER_PRESETS: CourierCompany[] = [
  'GIG Logistics',
  'DHL Express',
  'FedEx',
  'Jumia Logistics',
  'Chowdeck',
  'Glovo',
  'UberEats',
  'Kwik Delivery',
  'Speedaf Express',
  'Red Star Express',
  'Independent Courier',
  'Other'
];

const PACKAGE_PRESETS: PackageType[] = [
  'Food / Beverage Order',
  'E-Commerce Parcel',
  'Heavy Goods / Appliances',
  'Legal / Confidential Document',
  'Medicine / Pharmacy',
  'Groceries',
  'Other'
];

export const DeliveryEntryModal: React.FC<DeliveryEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [courierCompany, setCourierCompany] = useState<CourierCompany>('GIG Logistics');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'Motorcycle' | 'Bicycle' | 'Van' | 'Car' | 'Truck' | 'On Foot'>('Motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [packageType, setPackageType] = useState<PackageType>('E-Commerce Parcel');
  const [houseNumber, setHouseNumber] = useState('');
  const [residentName, setResidentName] = useState('');
  const [residentNumber, setResidentNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPass, setCreatedPass] = useState<DeliveryAccessPass | null>(null);

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
    if (!riderName.trim() || !riderPhone.trim() || !houseNumber.trim()) {
      setError('Please provide rider name, phone number, and destination house.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await dbService.createDeliveryPass({
        courier_company: courierCompany,
        rider_name: riderName.trim(),
        rider_phone: riderPhone.trim(),
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate.trim() ? vehiclePlate.trim().toUpperCase() : null,
        package_type: packageType,
        house_number: houseNumber.trim(),
        resident_number: residentNumber || '999',
        resident_name: residentName.trim() || 'Resident Host',
        entry_time: new Date().toISOString(),
        status: 'Inside Estate',
        security_officer: 'Guard Sunday Eze',
        notes: notes.trim() || null
      });

      if (res.success && res.pass) {
        setCreatedPass(res.pass);
        if (onSuccess) onSuccess(res.pass);
      } else {
        setError(res.message || 'Failed to issue delivery pass.');
      }
    } catch {
      setError('Server error creating delivery clearance.');
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">
                Courier & Delivery Gate Clearance
              </h3>
              <p className="text-xs text-slate-400">
                Issue temporary delivery dispatch pass with 25-minute turnaround tracking
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
                  <div className="text-[10px] uppercase font-bold text-slate-400">Delivery Clearance Issued</div>
                  <div className="text-lg font-black font-mono text-emerald-400">{createdPass.pass_code}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                <div><span className="text-slate-400">Courier:</span> <strong className="text-white">{createdPass.courier_company}</strong> ({createdPass.rider_name})</div>
                <div><span className="text-slate-400">Rider Phone:</span> <strong className="text-white font-mono">{createdPass.rider_phone}</strong></div>
                <div><span className="text-slate-400">Package Type:</span> <strong className="text-purple-300">{createdPass.package_type}</strong></div>
                <div><span className="text-slate-400">Destination:</span> <strong className="text-emerald-400">House {createdPass.house_number}</strong> ({createdPass.resident_name})</div>
                <div><span className="text-slate-400">Status:</span> <strong className="text-emerald-400 uppercase font-black">INSIDE ESTATE (Active)</strong></div>
              </div>

              <p className="text-xs text-slate-400 italic">
                * Gate barrier may be lifted. Rider has been recorded into the Gate Movements Log.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Courier Service / Company *
                  </label>
                  <select
                    value={courierCompany}
                    onChange={(e) => setCourierCompany(e.target.value as CourierCompany)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-purple-500"
                  >
                    {COURIER_PRESETS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Package / Order Type
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value as PackageType)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-purple-500"
                  >
                    {PACKAGE_PRESETS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Rider / Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    placeholder="e.g. Ibrahim Alabi"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Rider Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    placeholder="e.g. 08122334455"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    <option value="Motorcycle">Motorcycle / Dispatch Bike</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Van">Delivery Van</option>
                    <option value="Car">Car</option>
                    <option value="Truck">Heavy Truck</option>
                    <option value="On Foot">On Foot / Pedestrian</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Vehicle Plate / Bike Tag
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="e.g. KJA-881-XY"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Destination Plot / House *
                  </label>
                  <input
                    type="text"
                    required
                    value={houseNumber}
                    onChange={(e) => handleHouseSelect(e.target.value)}
                    placeholder="e.g. Plot 4A or House 12"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-emerald-400"
                  />
                  {residents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {residents.slice(0, 4).map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleHouseSelect(r.house_number)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300"
                        >
                          {r.house_number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Recipient Resident Name
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
                  Officer Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Food order from Chowdeck app, verified customer name..."
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
                  className="flex-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Processing...' : 'Authorize Delivery Entry'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Delivery Management Module</span>
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
