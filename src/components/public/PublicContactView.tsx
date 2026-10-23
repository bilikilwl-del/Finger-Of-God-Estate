import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Shield,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
import { EstateSettings, NavigationTab, Resident } from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { SEOHead } from '../common/SEOHead';

interface PublicContactViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onLogoutResident?: () => void;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
}

export const PublicContactView: React.FC<PublicContactViewProps> = ({
  estateSettings,
  currentResident,
  onLogoutResident,
  onNavigate,
  onOpenResidentLogin
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
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Contact Estate EXCO, Security Gate & Management — Finger of God Estate"
        description="Reach the Executive Committee, Chief Security Officer, facility maintenance desk, and security gate control at Finger of God Estate, Asaba, Delta State."
        keywords={['Contact Estate', 'Security Gate Phone', 'Finger of God Estate Exco', 'Estate Secretariat', 'Asaba Delta State']}
        canonicalPath="/#contact"
        ogType="website"
      />

      <PublicNavbar
        currentTab="contact"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        onLogoutResident={onLogoutResident}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <div className="border-b border-stone-200 pb-6">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#064E3B] transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Estate Homepage</span>
          </button>
          <div className="text-xs font-semibold text-[#064E3B] mb-1">
            Resident Administration &amp; Security Desk · Asaba
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
            Contact &amp; Resident Support
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
            Get in touch with Finger of God Estate Executive Management, 24/7 Security Gate Control, or submit a resident service request.
          </p>
        </div>

        {/* Emergency Gate Hotlines Card */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl border border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-amber-400">
                24/7 Emergency &amp; Gatehouse Dispatch
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-display">
                Gate Security &amp; Incident Control Desk
              </h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                For immediate security assistance, trespass alerts, medical emergencies, or gate access verification.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <a
                href="tel:07057543935"
                className="px-5 py-2.5 rounded-lg bg-[#064E3B] hover:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call Gate: 07057543935</span>
              </a>
              <button
                onClick={() => {
                  import('../common/TawkToWidget').then(m => m.openTawkToChat());
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Start Live Chat</span>
              </button>
              <button
                onClick={() => onNavigate('security_public')}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-stone-100 pb-3">
                Estate Secretariat Office
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-[#064E3B] shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Physical Address</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      1 Ogbueshi Ugboko Street, Finger of God Estate, Iyiaba, Asaba, Delta State.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-[#064E3B] shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Official Email</p>
                    <p className="text-slate-600 mt-0.5">support@fingerofgodestate.com</p>
                    <p className="text-[11px] text-slate-500">Response within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-800 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Secretariat Office Hours</p>
                    <p className="text-slate-600 mt-0.5">Monday – Friday: 8:00 AM – 5:00 PM</p>
                    <p className="text-slate-600">Saturday: 9:00 AM – 2:00 PM</p>
                    <p className="text-[11px] text-slate-500">Gate Security: 24 Hours / 7 Days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Quick List */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 text-sm">
                Departmental Contacts
              </h4>
              <div className="space-y-2.5 divide-y divide-stone-100">
                <div className="pt-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Chief Security Officer (CSO)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">08164259355</span>
                </div>
                <div className="pt-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Road Project Committee</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">09021735272</span>
                </div>
                <div className="pt-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Power &amp; Transformer Desk</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">08037582940</span>
                </div>
                <div className="pt-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Finance &amp; Levy Accounts</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">08036985573</span>
                </div>
                <div className="pt-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Delta State Unified Vigilante (School Boy Units)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">08164259355</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Resident Support Request Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-xl border border-stone-200 shadow-2xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Submit a Resident Inquiry or Service Request
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your message will be routed directly to the appropriate executive committee member.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <div className="w-11 h-11 bg-[#064E3B] text-white rounded-lg flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-emerald-950">Your Request Has Been Logged</h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  The Estate Management Secretariat has received your message. You will receive a callback or email update shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engr. Babatunde Adeleke"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:bg-white text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 08034567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:bg-white text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">House / Building Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Plot 4A, Hibiscus Crescent"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:bg-white text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:bg-white text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="General Inquiry">General Estate Inquiry</option>
                      <option value="Security & Gate Access">Security &amp; Gate Access</option>
                      <option value="Road Project">Road Project / Interlocking</option>
                      <option value="Light & Electrification">Light / Power / Transformer</option>
                      <option value="Estate Levy & Billing">Estate Levy &amp; Billing</option>
                      <option value="Drainage & Sanitation">Drainage &amp; Sanitation</option>
                      <option value="Maintenance Request">Maintenance Request</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief description of your inquiry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:bg-white text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Detailed Message *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Please provide full details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:bg-white text-slate-900 font-medium resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#064E3B] hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
        onOpenResidentLogin={onOpenResidentLogin}
      />
    </div>
  );
};
