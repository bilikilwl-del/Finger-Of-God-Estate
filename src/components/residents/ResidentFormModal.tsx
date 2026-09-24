import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Home, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Shield, 
  AlertCircle, 
  Sparkles,
  FileText,
  Lock,
  PhoneCall
} from 'lucide-react';
import { Resident, ResidentStatus } from '../../types/database';
import { NIGERIAN_STATES_LGAS } from '../../data/nigerianStates';
import { getNextSequentialResidentNumber, dbService } from '../../lib/supabase';
import { validateNigerianPhone } from '../../lib/phoneUtils';

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

  // Form fields
  const [residentNumber, setResidentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [email, setEmail] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selectedState, setSelectedState] = useState('Lagos');
  const [selectedLga, setSelectedLga] = useState('Eti-Osa');
  const [notes, setNotes] = useState('');
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
      setAdditionalPhone(residentToEdit.additional_phone || '');
      setEmail(residentToEdit.email || '');
      setHouseNumber(residentToEdit.house_number);
      setAddress(residentToEdit.address);
      setSelectedState(residentToEdit.state || 'Lagos');
      setSelectedLga(residentToEdit.lga || 'Eti-Osa');
      setNotes(residentToEdit.notes || '');
      setRegistrationDate(residentToEdit.registration_date);
      setStatus(residentToEdit.status);
    } else {
      // New Resident: generate sequential resident number automatically
      const today = new Date().toISOString().split('T')[0];
      setRegistrationDate(today);
      setFullName('');
      setPhoneNumber('');
      setAdditionalPhone('');
      setEmail('');
      setHouseNumber('');
      setAddress('');
      setSelectedState('Lagos');
      setSelectedLga('Eti-Osa');
      setNotes('');
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

    // Validate primary phone number with Nigerian carrier validation
    const phoneVal = validateNigerianPhone(phoneNumber);
    if (!phoneVal.isValid) {
      return phoneVal.error || 'Please enter a valid Nigerian phone number.';
    }

    // Validate additional phone if provided
    if (additionalPhone.trim()) {
      const addVal = validateNigerianPhone(additionalPhone);
      if (!addVal.isValid) {
        return `Additional Phone Error: ${addVal.error}`;
      }
      if (addVal.normalized === phoneVal.normalized) {
        return 'Additional phone number cannot be identical to the primary phone number.';
      }
    }

    // Email validation
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return 'Please enter a valid email address, or leave it blank.';
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
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim(),
            additional_phone: additionalPhone.trim() ? additionalPhone.trim() : null,
            email: email.trim() ? email.trim() : null,
            house_number: houseNumber.trim(),
            address: address.trim(),
            state: selectedState,
            lga: selectedLga,
            notes: notes.trim() ? notes.trim() : null,
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
            additional_phone: additionalPhone.trim() ? additionalPhone.trim() : null,
            email: email.trim() ? email.trim() : null,
            house_number: houseNumber.trim(),
            address: address.trim(),
            state: selectedState,
            lga: selectedLga,
            notes: notes.trim() ? notes.trim() : null,
            registration_date: registrationDate,
            status
          },
          adminEmail
        );
        onSaved(created);
        onClose();
      }
    } catch (err: any) {
      console.warn('Failed to save resident:', err);
      setErrorMsg(err.message || 'An error occurred while saving the resident.');
    } finally {
      setLoading(false);
    }
  };

  // Live preview normalized phone
  const primaryPhoneCheck = phoneNumber ? validateNigerianPhone(phoneNumber) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold">
                {isEditing ? 'Edit Resident Profile' : 'Register New Estate Resident'}
              </h2>
              <p className="text-xs text-slate-300">
                Finger of God Estate Security Management · {isEditing ? `Resident ID #${residentNumber}` : 'Sequential Registry'}
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

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
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
                <span>Resident Number</span>
                {isEditing ? (
                  <span className="text-[10px] font-normal text-slate-500 flex items-center gap-1 font-sans bg-slate-200 px-1.5 py-0.5 rounded">
                    <Lock className="w-3 h-3" /> Permanent ID
                  </span>
                ) : (
                  <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-sans font-medium">
                    <Sparkles className="w-3 h-3" /> Auto-Generated
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={residentNumber}
                  onChange={(e) => !isEditing && setResidentNumber(e.target.value)}
                  readOnly={isEditing}
                  placeholder="e.g. 001, 002, 100"
                  required
                  className={`w-full px-3.5 py-2 rounded-lg border text-sm font-mono font-bold tracking-wider outline-none ${
                    isEditing 
                      ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isEditing 
                  ? 'Resident numbers cannot be altered after creation to preserve billing history.'
                  : 'Unique sequential ID. Preserves leading zeros (e.g. 001, 002, 025, 300).'}
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
                  ACTIVE
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
                  INACTIVE
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Deactivated residents retain all audit and payment history.
              </p>
            </div>
          </div>

          {/* Section: Personal & Primary Contact */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Resident Identification & Contact
            </h3>

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
                    placeholder="08012345678 or +234..."
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                {primaryPhoneCheck && (
                  <p className={`text-[11px] mt-1 ${primaryPhoneCheck.isValid ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {primaryPhoneCheck.isValid ? `✓ Validated: ${primaryPhoneCheck.formatted}` : 'Supports 080..., 070..., 081..., 090..., 091... or +234...'}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Additional Contact Number</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <div className="relative">
                  <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={additionalPhone}
                    onChange={(e) => setAdditionalPhone(e.target.value)}
                    placeholder="e.g. Spouse / Emergency 080..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
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
            </div>
          </div>

          {/* Section: Estate Property Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Home className="w-3.5 h-3.5 text-emerald-600" />
              Estate House / Plot Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  House / Plot Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="e.g. Plot 4B / House 8"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street / Detailed Estate Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Hibiscus Crescent, Phase 1, Finger of God Estate"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

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
          </div>

          {/* Section: Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Administrative Notes / Remarks
              </span>
              <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Landlord resident, tenant, specialized gate pass holder, or specific payment arrangements..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
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
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
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
