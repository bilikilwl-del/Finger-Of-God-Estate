import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Home, MapPin, Calendar, CheckCircle2, Shield, AlertCircle, Sparkles } from 'lucide-react';
import { Resident, ResidentStatus } from '../../types/database';
import { NIGERIAN_STATES_LGAS } from '../../data/nigerianStates';
import { getNextSequentialResidentNumber, dbService } from '../../lib/supabase';

interface ResidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedResident: Resident) => void;
  residentToEdit?: Resident | null;
  adminEmail: string;
}

export const ResidentFormModal: React.FC<ResidentFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  residentToEdit,
  adminEmail
}) => {
  const isEditing = Boolean(residentToEdit);

  const [residentNumber, setResidentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selectedState, setSelectedState] = useState('Lagos');
  const [selectedLga, setSelectedLga] = useState('Eti-Osa');
  const [registrationDate, setRegistrationDate] = useState('');
  const [status, setStatus] = useState<ResidentStatus>('Active');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lgaList, setLgaList] = useState<string[]>([]);

  // Update LGAs when State changes
  useEffect(() => {
    const found = NIGERIAN_STATES_LGAS.find(s => s.state.toLowerCase() === selectedState.toLowerCase());
    if (found) {
      setLgaList(found.lgas);
      if (!found.lgas.includes(selectedLga)) {
        setSelectedLga(found.lgas[0] || '');
      }
    } else {
      setLgaList([]);
    }
  }, [selectedState]);

  // Initialize or reset form values
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (residentToEdit) {
      setResidentNumber(residentToEdit.resident_number);
      setFullName(residentToEdit.full_name);
      setPhoneNumber(residentToEdit.phone_number);
      setEmail(residentToEdit.email || '');
      setHouseNumber(residentToEdit.house_number);
      setAddress(residentToEdit.address);
      setSelectedState(residentToEdit.state || 'Lagos');
      setSelectedLga(residentToEdit.lga || 'Eti-Osa');
      setRegistrationDate(residentToEdit.registration_date);
      setStatus(residentToEdit.status);
    } else {
      // New Resident: generate sequential resident number automatically
      const today = new Date().toISOString().split('T')[0];
      setRegistrationDate(today);
      setFullName('');
      setPhoneNumber('');
      setEmail('');
      setHouseNumber('');
      setAddress('');
      setSelectedState('Lagos');
      setSelectedLga('Eti-Osa');
      setStatus('Active');

      getNextSequentialResidentNumber().then(nextNum => {
        setResidentNumber(nextNum);
      });
    }
  }, [isOpen, residentToEdit]);

  if (!isOpen) return null;

  // Validation function
  const validateForm = (): string | null => {
    if (!residentNumber.trim()) {
      return 'Resident identification number is required.';
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      return 'Please enter the resident\'s full name.';
    }
    if (!phoneNumber.trim()) {
      return 'Phone number is required for security levy records and notifications.';
    }

    // Nigerian phone validation pattern (supports 080..., 070..., 090..., 081..., 091..., +234...)
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    const phoneRegex = /^(\+?234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return 'Please enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return 'Please enter a valid email address, or leave it empty.';
      }
    }

    if (!houseNumber.trim()) {
      return 'House or Plot Number is required (e.g. Plot 4B, House 12).';
    }
    if (!address.trim()) {
      return 'Street / Estate address is required.';
    }
    if (!selectedState) {
      return 'State is required.';
    }
    if (!selectedLga) {
      return 'LGA is required.';
    }
    if (!registrationDate) {
      return 'Registration date is required.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isEditing && residentToEdit) {
        const updated = await dbService.updateResident(
          residentToEdit.id,
          {
            resident_number: residentNumber.trim(),
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim(),
            email: email.trim() ? email.trim() : null,
            house_number: houseNumber.trim(),
            address: address.trim(),
            state: selectedState,
            lga: selectedLga,
            registration_date: registrationDate,
            status
          },
          adminEmail
        );
        onSaved(updated);
        onClose();
      } else {
        const created = await dbService.createResident(
          {
            resident_number: residentNumber.trim(),
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim(),
            email: email.trim() ? email.trim() : null,
            house_number: houseNumber.trim(),
            address: address.trim(),
            state: selectedState,
            lga: selectedLga,
            registration_date: registrationDate,
            status
          },
          adminEmail
        );
        onSaved(created);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save resident:', err);
      setErrorMsg(err.message || 'An error occurred while saving the resident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">
                {isEditing ? 'Edit Resident Profile' : 'Register New Resident'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? `Modifying profile for Resident #${residentNumber}` : 'Sequential Resident Identification & Levy Ledger'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Resident Number & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                <span>Resident ID Number</span>
                {!isEditing && (
                  <span className="text-[10px] font-normal text-emerald-600 flex items-center gap-0.5 font-sans">
                    <Sparkles className="w-3 h-3" /> Auto-Generated
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={residentNumber}
                  onChange={(e) => setResidentNumber(e.target.value)}
                  placeholder="e.g. 001, 002, 100"
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-bold text-sm tracking-wider focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Must be unique. Preserves leading zeros (e.g. 001, 002, 025).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Resident Status
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setStatus('Active')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    status === 'Active'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Inactive')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    status === 'Inactive'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Inactive
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Active residents are billed monthly security levy.
              </p>
            </div>
          </div>

          {/* Full Name & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Chief Adeleke Johnson"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 08031234567"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Email & House/Plot Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. resident@gmail.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                House / Plot Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="e.g. Plot 14B or House 8"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Street Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estate Street / Full Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Sunflower Crescent, Phase 1, Palm Grove Estate"
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* State, LGA, and Registration Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {NIGERIAN_STATES_LGAS.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                LGA <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedLga}
                onChange={(e) => setSelectedLga(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {lgaList.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registration Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={registrationDate}
                  onChange={(e) => setRegistrationDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Register Resident'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
