import React, { useState, useEffect, useCallback } from 'react';
import { 
  Vote, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Trophy, 
  RefreshCw, 
  Send, 
  Lock, 
  Printer, 
  Search, 
  Check, 
  X, 
  Eye, 
  UserCheck, 
  UserX,
  History,
  Sliders,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  Election, 
  ElectionPosition, 
  ElectionCandidate, 
  ElectionVoter, 
  ElectionResultSnapshot, 
  ElectionAuditLog,
  ElectionStatus,
  CandidateStatus
} from '../../types/election';
import { EstateSettings } from '../../types/database';
import { electionService } from '../../services/electionService';

interface AdminElectionViewProps {
  estateSettings: EstateSettings;
  adminUser: { email: string; full_name?: string; role?: string } | null;
}

type AdminElectionSubTab = 'overview' | 'positions_candidates' | 'voters' | 'tally' | 'audit';

export const AdminElectionView: React.FC<AdminElectionViewProps> = ({
  estateSettings,
  adminUser
}) => {
  const [subTab, setSubTab] = useState<AdminElectionSubTab>('overview');
  
  // Data
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [voters, setVoters] = useState<ElectionVoter[]>([]);
  const [auditLogs, setAuditLogs] = useState<ElectionAuditLog[]>([]);
  const [resultsSnapshot, setResultsSnapshot] = useState<ElectionResultSnapshot | null>(null);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals & Forms
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ElectionStatus>('OPEN');
  const [statusReason, setStatusReason] = useState('');

  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [newPosition, setNewPosition] = useState({ title: '', description: '', display_order: 1, max_selections: 1 });

  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    position_id: '',
    full_name: '',
    photograph_url: '',
    biography: '',
    candidate_statement: '',
    display_order: 1
  });

  const [showEditConfigModal, setShowEditConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    title: '',
    description: '',
    opening_at: '',
    closing_at: '',
    election_rules: '',
    tie_resolution_rule: ''
  });

  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState<'all' | 'voted' | 'not_voted' | 'ineligible'>('all');

  const [showPublishConfirmModal, setShowPublishConfirmModal] = useState(false);

  // Load elections list
  const loadElections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await electionService.getAdminElections();
      if (data.success && data.elections && data.elections.length > 0) {
        setElections(data.elections);
        const current = data.elections[0];
        setSelectedElection(current);
        loadElectionDetails(current.id);
      } else {
        // Fallback to active public election if no list
        const publicData = await electionService.getActiveElection();
        if (publicData.success && publicData.election) {
          setElections([publicData.election]);
          setSelectedElection(publicData.election);
          loadElectionDetails(publicData.election.id);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error loading elections', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadElections();
  }, [loadElections]);

  // Load details for selected election
  const loadElectionDetails = async (electionId: string) => {
    try {
      // 1. Get election with positions & candidates
      const det = await electionService.getElectionById(electionId);
      if (det.success && det.election) {
        setSelectedElection(det.election);
        setPositions(det.positions || []);
        setCandidates(det.candidates || []);

        setConfigForm({
          title: det.election.title || '',
          description: det.election.description || '',
          opening_at: det.election.opening_at || '',
          closing_at: det.election.closing_at || '',
          election_rules: det.election.election_rules || '',
          tie_resolution_rule: det.election.tie_resolution_rule || ''
        });
      }

      // 2. Get voters
      const vRes = await electionService.getVoters(electionId);
      if (vRes.success && vRes.voters) {
        setVoters(vRes.voters);
      }

      // 3. Get audit logs
      const aRes = await electionService.getAuditLogs(electionId);
      if (aRes.success && aRes.logs) {
        setAuditLogs(aRes.logs);
      }

      // 4. If published or closed, check for existing results
      const rRes = await electionService.getElectionResults(electionId);
      if (rRes.success && rRes.results) {
        setResultsSnapshot(rRes.results);
      }
    } catch (err: any) {
      console.error('Error fetching details:', err);
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async () => {
    if (!selectedElection) return;
    setActionLoading(true);
    try {
      const res = await electionService.updateElectionStatus(
        selectedElection.id,
        targetStatus,
        statusReason || `Updated by ${adminUser?.email || 'admin'}`
      );

      if (res.success) {
        setMessage({ text: `Election status transitioned to ${targetStatus}`, type: 'success' });
        setShowStatusModal(false);
        setStatusReason('');
        loadElectionDetails(selectedElection.id);
        loadElections();
      } else {
        setMessage({ text: res.message || 'Failed to update status', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating status', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Position
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection) return;
    setActionLoading(true);
    try {
      const res = await electionService.addPosition(selectedElection.id, newPosition);
      if (res.success) {
        setMessage({ text: 'Position added successfully', type: 'success' });
        setShowAddPositionModal(false);
        setNewPosition({ title: '', description: '', display_order: positions.length + 1, max_selections: 1 });
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to add position', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error adding position', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection) return;
    if (!newCandidate.position_id) {
      setMessage({ text: 'Please select a position for the candidate', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await electionService.addCandidate(selectedElection.id, newCandidate);
      if (res.success) {
        setMessage({ text: 'Candidate registered successfully', type: 'success' });
        setShowAddCandidateModal(false);
        setNewCandidate({
          position_id: '',
          full_name: '',
          photograph_url: '',
          biography: '',
          candidate_statement: '',
          display_order: 1
        });
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to add candidate', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error adding candidate', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Candidate Status Toggle
  const handleCandidateStatus = async (candidateId: string, status: CandidateStatus) => {
    if (!selectedElection) return;
    setActionLoading(true);
    try {
      const res = await electionService.updateCandidateStatus(selectedElection.id, candidateId, status);
      if (res.success) {
        setMessage({ text: `Candidate status updated to ${status}`, type: 'success' });
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to update candidate', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating status', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Voters
  const handleSyncVoters = async () => {
    if (!selectedElection) return;
    setActionLoading(true);
    try {
      const res = await electionService.syncVoters(selectedElection.id);
      if (res.success) {
        setMessage({ text: res.message || 'Resident voters synchronized successfully', type: 'success' });
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to sync voters', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error syncing voters', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Voter Eligibility
  const handleToggleVoterEligibility = async (voter: ElectionVoter) => {
    if (!selectedElection) return;
    const newStatus = !voter.eligible;
    const reason = newStatus ? 'Re-accredited by admin' : 'Disqualified by administrative review';
    
    setActionLoading(true);
    try {
      const res = await electionService.updateVoterEligibility(selectedElection.id, voter.id, newStatus, reason);
      if (res.success) {
        setMessage({ text: `Voter ${voter.resident_number} eligibility set to ${newStatus ? 'ELIGIBLE' : 'INELIGIBLE'}`, type: 'success' });
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to update voter', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating eligibility', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate Results
  const handleCalculateResults = async () => {
    if (!selectedElection) return;
    setActionLoading(true);
    try {
      const res = await electionService.calculateResults(selectedElection.id);
      if (res.success && res.results) {
        setResultsSnapshot(res.results);
        setMessage({ text: 'Results tallied successfully from anonymous ballot store', type: 'success' });
      } else {
        setMessage({ text: res.message || 'Failed to calculate results', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error calculating results', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Publish Results
  const handlePublishResults = async () => {
    if (!selectedElection || !resultsSnapshot) return;
    setActionLoading(true);
    try {
      const res = await electionService.publishResults(selectedElection.id, resultsSnapshot);
      if (res.success) {
        setMessage({ text: 'Official results published successfully! Now visible on public portal.', type: 'success' });
        setShowPublishConfirmModal(false);
        loadElectionDetails(selectedElection.id);
        loadElections();
      } else {
        setMessage({ text: res.message || 'Failed to publish results', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error publishing results', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection) return;
    setActionLoading(true);
    try {
      const res = await electionService.updateAdminElection(selectedElection.id, configForm);
      if (res.success) {
        setMessage({ text: 'Election configuration updated successfully', type: 'success' });
        setShowEditConfigModal(false);
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to update configuration', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error saving configuration', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Voters
  const filteredVoters = voters.filter(v => {
    const matchesSearch = v.resident_number.includes(voterSearch) || 
      (v.full_name && v.full_name.toLowerCase().includes(voterSearch.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (voterFilter === 'voted') return v.has_voted;
    if (voterFilter === 'not_voted') return !v.has_voted && v.eligible;
    if (voterFilter === 'ineligible') return !v.eligible;
    return true;
  });

  // Calculate Turnout Metric
  const totalEligible = voters.filter(v => v.eligible).length;
  const totalVoted = voters.filter(v => v.has_voted).length;
  const turnoutPercent = totalEligible > 0 ? Number(((totalVoted / totalEligible) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner / Election Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-500/20">
                Electoral Governance Hub
              </span>
              {selectedElection && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedElection.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  selectedElection.status === 'RESULTS_PUBLISHED' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                  selectedElection.status === 'CLOSED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                  Status: {selectedElection.status}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {selectedElection?.title || 'Estate Executive Election'}
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Manage election configuration, approve candidate manifestos, monitor voter accreditation (001–300), and execute certified ballot counts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (selectedElection) {
                  setTargetStatus(selectedElection.status);
                  setShowStatusModal(true);
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Change Status</span>
            </button>

            <button
              onClick={() => setShowEditConfigModal(true)}
              disabled={selectedElection?.status === 'OPEN'}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              title={selectedElection?.status === 'OPEN' ? 'Cannot edit config while voting is OPEN' : 'Edit Rules and Dates'}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Configuration</span>
            </button>

            <button
              onClick={() => selectedElection && loadElectionDetails(selectedElection.id)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Total Turnout</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-400">{turnoutPercent}%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{totalVoted} / {totalEligible} votes cast</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Accredited Voters</span>
            <span className="text-xl sm:text-2xl font-bold text-white">{voters.length}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Plots 001–300</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Active Positions</span>
            <span className="text-xl sm:text-2xl font-bold text-white">{positions.filter(p => p.active).length}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{positions.length} configured</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Approved Candidates</span>
            <span className="text-xl sm:text-2xl font-bold text-white">
              {candidates.filter(c => c.status === 'APPROVED').length}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{candidates.length} total nominees</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setSubTab('overview')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'overview'
              ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Overview & Rules</span>
        </button>

        <button
          onClick={() => setSubTab('positions_candidates')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'positions_candidates'
              ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Positions & Candidates ({candidates.length})</span>
        </button>

        <button
          onClick={() => setSubTab('voters')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'voters'
              ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Voter Accreditation Register ({voters.length})</span>
        </button>

        <button
          onClick={() => setSubTab('tally')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'tally'
              ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Ballot Tally & Results</span>
        </button>

        <button
          onClick={() => setSubTab('audit')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'audit'
              ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: OVERVIEW & RULES */}
      {/* ========================================================= */}
      {subTab === 'overview' && selectedElection && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeline & Parameters Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Election Timetable</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Opening Date / Time:</span>
                <span className="text-slate-900 font-bold">{new Date(selectedElection.opening_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Closing Date / Time:</span>
                <span className="text-slate-900 font-bold">{new Date(selectedElection.closing_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Secret Ballot Enforced:</span>
                <span className="text-emerald-700 font-bold">YES (Cryptographic Isolation)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Voting Restriction:</span>
                <span className="text-slate-900 font-bold">1 Vote per Accredited Property (001–300)</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs font-bold text-slate-700 mb-1">Turnout Progress</div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${turnoutPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>{totalVoted} Cast</span>
                <span>{turnoutPercent}% Turnout</span>
                <span>{totalEligible} Accredited</span>
              </div>
            </div>
          </div>

          {/* Constitutional Rules Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Official Rules & Tie-Resolution Mandate</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Constitutional Tie-Resolution Rule:</span>
                <p className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-amber-900 leading-relaxed italic">
                  &ldquo;{selectedElection.tie_resolution_rule}&rdquo;
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">General Electoral Guidelines:</span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                  {selectedElection.election_rules}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: POSITIONS & CANDIDATES */}
      {/* ========================================================= */}
      {subTab === 'positions_candidates' && (
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Positions & Candidate Roster</h3>
              <p className="text-xs text-slate-500">Configure executive offices and approve candidate nominations.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddPositionModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Position</span>
              </button>
              <button
                onClick={() => setShowAddCandidateModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Candidate</span>
              </button>
            </div>
          </div>

          {/* Positions & Candidates List */}
          <div className="space-y-6">
            {positions.map((pos) => {
              const posCandidates = candidates.filter(c => c.position_id === pos.id);

              return (
                <div key={pos.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{pos.display_order}</span>
                        <h4 className="text-base font-bold text-slate-900">{pos.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pos.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {pos.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {posCandidates.length} Nominee{posCandidates.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Candidates in this position */}
                  {posCandidates.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">
                      No candidates registered for this position yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {posCandidates.map((cand) => (
                        <div key={cand.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                          <div className="flex items-start gap-3">
                            {cand.photograph_url ? (
                              <img src={cand.photograph_url} alt={cand.full_name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 font-bold flex items-center justify-center">
                                {cand.full_name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{cand.full_name}</h5>
                              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                                cand.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                cand.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                cand.status === 'WITHDRAWN' ? 'bg-slate-200 text-slate-700' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {cand.status}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2">
                            {cand.biography || cand.candidate_statement}
                          </p>

                          {/* Candidate Actions */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 text-[11px] font-semibold">
                            {cand.status !== 'APPROVED' && (
                              <button
                                onClick={() => handleCandidateStatus(cand.id, 'APPROVED')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex-1"
                              >
                                Approve
                              </button>
                            )}
                            {cand.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleCandidateStatus(cand.id, 'REJECTED')}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors"
                              >
                                Reject
                              </button>
                            )}
                            {cand.status !== 'WITHDRAWN' && (
                              <button
                                onClick={() => handleCandidateStatus(cand.id, 'WITHDRAWN')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: VOTER ACCREDITATION REGISTER */}
      {/* ========================================================= */}
      {subTab === 'voters' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search plot number e.g. 014 or name..."
                  value={voterSearch}
                  onChange={(e) => setVoterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={voterFilter}
                onChange={(e: any) => setVoterFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="all">All Voters ({voters.length})</option>
                <option value="voted">Voted ({totalVoted})</option>
                <option value="not_voted">Not Voted ({totalEligible - totalVoted})</option>
                <option value="ineligible">Ineligible ({voters.filter(v => !v.eligible).length})</option>
              </select>
            </div>

            <button
              onClick={handleSyncVoters}
              disabled={actionLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>Sync Resident Register (001–300)</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Plot #</th>
                  <th className="px-4 py-3">Accredited Property</th>
                  <th className="px-4 py-3">Eligibility Status</th>
                  <th className="px-4 py-3">Voting Status</th>
                  <th className="px-4 py-3">Ballot Cast Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVoters.slice(0, 100).map((voter) => (
                  <tr key={voter.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      #{voter.resident_number}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {voter.full_name || `Estate Property Plot ${voter.resident_number}`}
                    </td>
                    <td className="px-4 py-3">
                      {voter.eligible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <UserX className="w-3 h-3 text-rose-600" />
                          Ineligible ({voter.eligibility_reason || 'Disqualified'})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {voter.has_voted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          <Vote className="w-3 h-3 text-purple-600" />
                          Ballot Cast
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Not Yet Voted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {voter.ballot_submitted_at ? new Date(voter.ballot_submitted_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleVoterEligibility(voter)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          voter.eligible
                            ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {voter.eligible ? 'Disqualify' : 'Accredit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
            Showing {filteredVoters.length} accredited voter records (Estate Plots 001–300).
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: TALLY & RESULTS */}
      {/* ========================================================= */}
      {subTab === 'tally' && selectedElection && (
        <div className="space-y-6">
          {/* Secret Ballot Isolation Info Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Cryptographic Secret Ballot Isolation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Voter personal identification is permanently dissociated from the ballot ledger upon submission. The tallying engine calculates totals exclusively from anonymous ballots to ensure 100% secrecy and constitutional privacy.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Ballot Counting
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Execute Result Calculation
              </h3>
              <p className="text-xs text-slate-500">
                {selectedElection.status === 'OPEN' 
                  ? 'Notice: Official tallies should only be executed once voting is closed.'
                  : 'Calculate votes per position, evaluate winning candidates, and verify tie conditions.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCalculateResults}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Calculate Anonymous Ballots</span>
              </button>

              {resultsSnapshot && selectedElection.status !== 'RESULTS_PUBLISHED' && (
                <button
                  onClick={() => setShowPublishConfirmModal(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish Official Results</span>
                </button>
              )}

              {resultsSnapshot && (
                <button
                  onClick={() => window.print()}
                  className="p-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                  title="Print Official Tally Sheet"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results Preview */}
          {resultsSnapshot && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Calculated Tally Preview
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {resultsSnapshot.election_title}
                    </h3>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-500 font-medium">Turnout:</span>{' '}
                    <strong className="text-slate-900 text-sm">{resultsSnapshot.turnout_percentage}%</strong>{' '}
                    <span className="text-slate-400">({resultsSnapshot.total_voters} / {resultsSnapshot.total_eligible_voters} voters)</span>
                  </div>
                </div>

                {/* Positions Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {resultsSnapshot.positions.map((pos) => (
                    <div key={pos.position_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{pos.position_title}</h4>
                        <span className="text-xs text-slate-500 font-medium">{pos.total_votes} votes</span>
                      </div>

                      {pos.is_tie && (
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{pos.tie_message}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        {pos.candidates.map((cand) => (
                          <div key={cand.candidate_id} className={`p-2.5 rounded-lg border bg-white ${
                            cand.is_winner ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={`font-bold ${cand.is_winner ? 'text-emerald-900' : 'text-slate-800'}`}>
                                {cand.is_winner && '🏆 '}
                                {cand.full_name}
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                {cand.votes} ({cand.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${cand.is_winner ? 'bg-emerald-600' : 'bg-slate-400'}`}
                                style={{ width: `${cand.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 5: AUDIT LOGS */}
      {/* ========================================================= */}
      {subTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Immutable Electoral Action Audit Trail</h3>
            <p className="text-xs text-slate-500">Every election status modification, nomination change, and ballot accreditation is logged here.</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">No audit records logged yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-slate-400">by {log.actor_email}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{log.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Change Election Status</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Status:</label>
                <select
                  value={targetStatus}
                  onChange={(e: any) => setTargetStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="DRAFT">DRAFT (Setup Stage)</option>
                  <option value="UPCOMING">UPCOMING (Public preview before voting)</option>
                  <option value="OPEN">OPEN (Voting Live & Active)</option>
                  <option value="PAUSED">PAUSED (Temporarily suspended)</option>
                  <option value="CLOSED">CLOSED (Voting concluded, counting allowed)</option>
                  <option value="RESULTS_PUBLISHED">RESULTS_PUBLISHED (Certified to public)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Status Transition:</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled voting period initiated"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                {actionLoading ? 'Updating...' : 'Confirm Transition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {showAddPositionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Executive Position</h3>
            
            <form onSubmit={handleAddPosition} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Position Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Welfare Coordinator"
                  value={newPosition.title}
                  onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mandate & Description:</label>
                <textarea
                  placeholder="Role responsibilities..."
                  value={newPosition.description}
                  onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Display Order:</label>
                <input
                  type="number"
                  min={1}
                  value={newPosition.display_order}
                  onChange={(e) => setNewPosition({ ...newPosition, display_order: parseInt(e.target.value, 10) || 1 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPositionModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Add Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Register Election Candidate</h3>
            
            <form onSubmit={handleAddCandidate} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Position:</label>
                <select
                  value={newCandidate.position_id}
                  onChange={(e) => setNewCandidate({ ...newCandidate, position_id: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Choose Position --</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Candidate Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Chief John Doe"
                  value={newCandidate.full_name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Photograph URL (optional):</label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={newCandidate.photograph_url}
                  onChange={(e) => setNewCandidate({ ...newCandidate, photograph_url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Biography & Track Record:</label>
                <textarea
                  placeholder="Brief background..."
                  value={newCandidate.biography}
                  onChange={(e) => setNewCandidate({ ...newCandidate, biography: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Candidate Manifesto / Vision Statement:</label>
                <textarea
                  placeholder="My pledge to the estate community..."
                  value={newCandidate.candidate_statement}
                  onChange={(e) => setNewCandidate({ ...newCandidate, candidate_statement: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {showEditConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Edit Election Configuration</h3>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Election Title:</label>
                <input
                  type="text"
                  value={configForm.title}
                  onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description:</label>
                <textarea
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Opening Date & Time:</label>
                  <input
                    type="datetime-local"
                    value={configForm.opening_at ? new Date(configForm.opening_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setConfigForm({ ...configForm, opening_at: new Date(e.target.value).toISOString() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Closing Date & Time:</label>
                  <input
                    type="datetime-local"
                    value={configForm.closing_at ? new Date(configForm.closing_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setConfigForm({ ...configForm, closing_at: new Date(e.target.value).toISOString() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tie-Resolution Constitutional Mandate:</label>
                <textarea
                  value={configForm.tie_resolution_rule}
                  onChange={(e) => setConfigForm({ ...configForm, tie_resolution_rule: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">General Electoral Rules:</label>
                <textarea
                  value={configForm.election_rules}
                  onChange={(e) => setConfigForm({ ...configForm, election_rules: e.target.value })}
                  rows={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditConfigModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Confirm Modal */}
      {showPublishConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Publish Official Results?</h3>
              <p className="text-xs text-slate-600">
                This will officially publish the certified election tally to the public website (/election). Residents will see winning candidates and percentage breakdowns.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPublishConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishResults}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {actionLoading ? 'Publishing...' : 'Yes, Publish Official Results'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
