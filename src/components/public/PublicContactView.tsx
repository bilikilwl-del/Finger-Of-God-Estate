import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Shield,
  HelpCircle,
  ArrowLeft,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  Building
} from 'lucide-react';
import { EstateSettings, NavigationTab, Resident } from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';

interface PublicContactViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const PublicContactView: React.FC<PublicContactViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin,
  onOpenAdminLogin
}) => {
  const [name, setName] = useState(currentResident?.full_name || '');
  const [phone, setPhone] = useState(currentResident?.phone_number || '');
  const [houseNumber, setHouseNumber] = useState(currentResident?.house_number || '');
  const [category, setCategory] = useState('General Inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      if (!currentResident) {
        setName('');
        setPhone('');
        setHouseNumber('');
      }
      setSubject('');
      setMessage('');
      setSubmitted(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <PublicNavbar
        currentTab="contact"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        onOpenAdminLogin={onOpenAdminLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Phone className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Contact & Resident Support
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Get in touch with Finger of God Estate Executive Management, 24/7 Security Gate Control, or submit a resident service request.
          </p>
        </div>

        {/* Emergency Gate Hotlines Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl border border-slate-700 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                24/7 Emergency Dispatch
              </span>
              <h2 className="text-xl font-black tracking-tight text-white font-display">
                Gate Security & Incident Control Desk
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                For immediate security assistance, trespass alerts, medical emergencies, or gate access verification.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={`tel:${estateSettings.contact_phone || '08023456789'}`}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call Gate: {estateSettings.contact_phone || '08023456789'}</span>
              </a>
              <button
                onClick={() => onNavigate('security_public')}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Security Portal</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column: Details and Message Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Estate Secretariat Office
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Physical Address</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {estateSettings.estate_address || 'Phase 1, Iyiaba, Asaba, Delta State, Nigeria'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Official Email</p>
                    <p className="text-slate-600 mt-0.5">{estateSettings.contact_email || 'admin@fingerofgodestate.ng'}</p>
                    <p className="text-[11px] text-slate-400">Response within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Secretariat Office Hours</p>
                    <p className="text-slate-600 mt-0.5">Monday – Friday: 8:00 AM – 5:00 PM</p>
                    <p className="text-slate-600">Saturday: 9:00 AM – 2:00 PM</p>
                    <p className="text-[11px] text-slate-400">Gate Security: 24 Hours / 7 Days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Quick List */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
                Departmental Contacts
              </h4>
              <div className="space-y-2 divide-y divide-slate-100">
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Chief Security Officer (CSO)</span>
                  <span className="font-mono text-slate-600">0803-000-1122</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Road Project Committee</span>
                  <span className="font-mono text-slate-600">0802-333-4455</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Power & Transformer Desk</span>
                  <span className="font-mono text-slate-600">0809-555-6677</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Finance & Levy Accounts</span>
                  <span className="font-mono text-slate-600">0812-777-8899</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Resident Support Request Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                <span>Submit a Resident Inquiry or Service Request</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your message will be routed directly to the appropriate executive committee member.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-emerald-700 text-white rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-emerald-950">Thank You! Your Request Has Been Logged</h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  The Estate Management Secretariat has received your message. You will receive a callback or email update shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engr. Babatunde Adeleke"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 08034567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">House / Building Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Plot 4A, Hibiscus Crescent"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="General Inquiry">General Estate Inquiry</option>
                      <option value="Security & Gate Access">Security & Gate Access</option>
                      <option value="Road Project">Road Project / Interlocking</option>
                      <option value="Light & Electrification">Light / Power / Transformer</option>
                      <option value="Estate Levy & Billing">Estate Levy & Billing</option>
                      <option value="Drainage & Sanitation">Drainage & Sanitation</option>
                      <option value="Maintenance Request">Maintenance Request</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief description of your inquiry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Detailed Message *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Please provide full details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Inquiry to Estate Office</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenAdminLogin={onOpenAdminLogin}
        onOpenResidentLogin={onOpenResidentLogin}
      />
    </div>
  );
};
