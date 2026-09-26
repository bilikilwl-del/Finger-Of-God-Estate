import React, { useState } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Lock,
  ExternalLink,
  ChevronRight,
  Shield,
  Eye,
  X
} from 'lucide-react';
import { EstateSettings, EstateDocument, NavigationTab, Resident } from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { SEOHead } from '../common/SEOHead';

interface PublicDocumentsViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
}

const ESTATE_DOCUMENTS: EstateDocument[] = [
  {
    id: 'doc-001',
    title: 'Finger of God Estate Resident Association Constitution & Bylaws',
    category: 'Governance',
    description: 'The supreme governing document of Finger of God Estate defining community governance, resident rights, executive committee duties, and meeting procedures.',
    file_name: 'FOG_Estate_Constitution_2026_RevB.pdf',
    file_size: '2.4 MB',
    version: 'Version 2.3 (Ratified)',
    date_published: '2026-08-15',
    effective_date: '2026-09-01',
    badge: 'Official Bylaw'
  },
  {
    id: 'doc-002',
    title: 'Security Operations & Gate Access Protocol Guidelines',
    category: 'Security & Access',
    description: 'Official rules regarding visitor access, gate passes, contractor movements, restricted hours, delivery checks, and domestic staff background registration.',
    file_name: 'FOG_Security_Access_Protocol_2026.pdf',
    file_size: '1.8 MB',
    version: 'Version 3.1',
    date_published: '2026-09-01',
    effective_date: '2026-09-01',
    badge: 'Mandatory Policy'
  },
  {
    id: 'doc-003',
    title: 'Building, Civil Construction & Drainage Connection Standards',
    category: 'Building Guidelines',
    description: 'Mandatory standards for plot development, building setbacks, road drainage connections, construction material drop-offs, and environmental damage bonds.',
    file_name: 'FOG_Building_Construction_Guidelines.pdf',
    file_size: '3.1 MB',
    version: 'Version 1.8',
    date_published: '2026-07-20',
    effective_date: '2026-08-01',
    badge: 'Technical Guideline'
  },
  {
    id: 'doc-004',
    title: 'Road Project Financial Audit & Phase 1 Expenditure Report',
    category: 'Financial & Audits',
    description: 'Comprehensive transparent accounting ledger of all resident contributions, vendor disbursements for stone interlocking, and current escrow bank balance.',
    file_name: 'FOG_Road_Project_Audit_Q3_2026.pdf',
    file_size: '1.2 MB',
    version: 'Q3 2026 Certified Audit',
    date_published: '2026-09-24',
    effective_date: '2026-09-24',
    badge: 'Audit Verified'
  },
  {
    id: 'doc-005',
    title: 'Resident Registration & Emergency Contact Information Form',
    category: 'Forms & Applications',
    description: 'Official onboarding questionnaire for new homeowners and tenants to register household members, vehicles, and emergency next-of-kin with estate security.',
    file_name: 'FOG_Resident_Registration_Form_2026.pdf',
    file_size: '680 KB',
    version: 'Form FOG-REG-01',
    date_published: '2026-09-05',
    effective_date: '2026-09-05',
    badge: 'Application Form'
  },
  {
    id: 'doc-006',
    title: 'Electricity & 500kVA Substation Maintenance Operating Code',
    category: 'Governance',
    description: 'Protocols for household load capacity, phase distribution, transformer maintenance schedules, solar streetlight care, and electrical fault reporting.',
    file_name: 'FOG_Power_Substation_Operating_Code.pdf',
    file_size: '1.5 MB',
    version: 'Version 1.4',
    date_published: '2026-08-28',
    effective_date: '2026-09-01',
    badge: 'Standard Code'
  }
];

export const PublicDocumentsView: React.FC<PublicDocumentsViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<EstateDocument | null>(null);

  const categories = ['ALL', 'Governance', 'Security & Access', 'Building Guidelines', 'Financial & Audits', 'Forms & Applications'];

  const filteredDocs = ESTATE_DOCUMENTS.filter((doc) => {
    if (categoryFilter !== 'ALL' && doc.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.file_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDownload = (doc: EstateDocument) => {
    // Simulated instant PDF download / preview trigger
    const element = document.createElement('a');
    const file = new Blob([
      `FINGER OF GOD ESTATE OFFICIAL DOCUMENT\nTitle: ${doc.title}\nCategory: ${doc.category}\nVersion: ${doc.version}\nPublished: ${doc.date_published}\n\nDescription:\n${doc.description}\n\nEstate Management Secretariat, Asaba, Delta State.`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = doc.file_name.replace('.pdf', '.txt');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Official Documents, Constitution & Bylaws — Finger of God Estate"
        description="Download and review official estate documents, constitution, building guidelines, security access rules, and committee resolutions for Finger of God Estate."
        keywords={['Estate Documents', 'Estate Constitution', 'Bylaws', 'Building Guidelines', 'Finger of God Estate', 'Asaba Delta State']}
        canonicalPath="/#documents"
        ogType="website"
      />

      <PublicNavbar
        currentTab="documents"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                Official Estate Documents & Policies
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Access and download official Finger of God Estate bylaws, security regulations, architectural building standards, and certified financial audits.
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
            />
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    {doc.category}
                  </span>
                  {doc.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {doc.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {doc.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">{doc.version}</span>
                  <span>{doc.file_size}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>View Details</span>
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title="Download Official Document"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
              No official documents found matching the search or category filter.
            </div>
          )}
        </div>
      </main>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  {selectedDoc.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedDoc.title}</h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedDoc.description}
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">File Name:</span>
                <span className="font-mono font-medium text-slate-800">{selectedDoc.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Version:</span>
                <span className="font-medium text-slate-800">{selectedDoc.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Published Date:</span>
                <span className="font-medium text-slate-800">{selectedDoc.date_published}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Effective Date:</span>
                <span className="font-medium text-slate-800">{selectedDoc.effective_date}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handleDownload(selectedDoc);
                  setSelectedDoc(null);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download {selectedDoc.file_size}</span>
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />
    </div>
  );
};
