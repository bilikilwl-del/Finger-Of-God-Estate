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
  AlertTriangle,
  Upload,
  User,
  Info,
  Filter
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

type AdminElectionSubTab = 'candidates' | 'overview' | 'positions' | 'voters' | 'tally' | 'audit';

export const AdminElectionView: React.FC<AdminElectionViewProps> = ({
  estateSettings,
  adminUser
}) => {
  const [subTab, setSubTab] = useState<AdminElectionSubTab>('candidates');
  
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
  const [showCreateElectionModal, setShowCreateElectionModal] = useState(false);
  const [createElectionForm, setCreateElectionForm] = useState({
    title: '',
    year: 2026,
    description: '',
    opening_at: '',
    closing_at: '',
    election_rules: '1. One accredited vote per estate plot (001–300).\n2. Ballots are cryptographically isolated and anonymous.\n3. Simple majority determines the winning candidate for each position.',
    tie_resolution_rule: 'Run-off election within 7 days in accordance with Estate Electoral Guidelines.'
  });

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ElectionStatus>('OPEN');
  const [statusReason, setStatusReason] = useState('');

  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [newPosition, setNewPosition] = useState({ title: '', description: '', display_order: 1, max_selections: 1 });
  const [showEditPositionModal, setShowEditPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<ElectionPosition | null>(null);

  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    position_id: '',
    full_name: '',
    photograph_url: '',
    biography: '',
    candidate_statement: '',
    display_order: 1
  });
  const [showEditCandidateModal, setShowEditCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<ElectionCandidate | null>(null);
  const [viewingManifestoCandidate, setViewingManifestoCandidate] = useState<ElectionCandidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<ElectionCandidate | null>(null);
  const [photoInputMode, setPhotoInputMode] = useState<'upload' | 'url'>('upload');
  const [editPhotoInputMode, setEditPhotoInputMode] = useState<'upload' | 'url'>('upload');

  const [showBallotPreviewModal, setShowBallotPreviewModal] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateFilterStatus, setCandidateFilterStatus] = useState<string>('all');
  const [candidateFilterPosition, setCandidateFilterPosition] = useState<string>('all');

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

  // Create New Election Handler
  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createElectionForm.title.trim()) {
      setMessage({ text: 'Election title is required.', type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await electionService.createAdminElection(createElectionForm);
      if (res.success && res.election) {
        setMessage({ text: `Election "${res.election.title}" created successfully!`, type: 'success' });
        setShowCreateElectionModal(false);
        setCreateElectionForm({
          title: '',
          year: 2026,
          description: '',
          opening_at: '',
          closing_at: '',
          election_rules: '1. One accredited vote per estate plot (001–300).\n2. Ballots are cryptographically isolated and anonymous.\n3. Simple majority determines the winning candidate for each position.',
          tie_resolution_rule: 'Run-off election within 7 days in accordance with Estate Electoral Guidelines.'
        });
        await loadElections();
        loadElectionDetails(res.election.id);
      } else {
        setMessage({ text: res.message || 'Failed to create election.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error creating election.', type: 'error' });
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

  // Edit Position
  const handleEditPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection || !editingPosition) return;
    setActionLoading(true);
    try {
      const res = await electionService.updatePosition(selectedElection.id, editingPosition.id, {
        title: editingPosition.title,
        description: editingPosition.description,
        display_order: editingPosition.display_order,
        max_selections: editingPosition.max_selections,
        active: editingPosition.active
      });
      if (res.success) {
        setMessage({ text: 'Position updated successfully', type: 'success' });
        setShowEditPositionModal(false);
        setEditingPosition(null);
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to update position', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating position', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Position Active/Inactive
  const handleTogglePositionActive = async (pos: ElectionPosition) => {
    if (!selectedElection) return;
    if (selectedElection.status === 'OPEN' || selectedElection.status === 'RESULTS_PUBLISHED') {
      setMessage({ text: `Cannot modify position status while election is ${selectedElection.status}.`, type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      const newActive = !pos.active;
      const res = await electionService.updatePosition(selectedElection.id, pos.id, {
        active: newActive
      });
      if (res.success) {
        setMessage({ text: `Position "${pos.title}" ${newActive ? 'activated' : 'deactivated'}`, type: 'success' });
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to update position status', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating position status', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Photo upload helper
  const handlePhotoUpload = (file: File, isEdit: boolean = false) => {
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: 'Image file size must be 2MB or less.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (isEdit && editingCandidate) {
        setEditingCandidate({ ...editingCandidate, photograph_url: dataUrl });
      } else {
        setNewCandidate({ ...newCandidate, photograph_url: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Add Candidate for specific position
  const handleOpenAddCandidateForPosition = (posId?: string) => {
    const targetPos = posId ? positions.find(p => p.id === posId) : positions[0];
    const existingInPos = candidates.filter(c => c.position_id === (targetPos?.id || ''));
    setNewCandidate({
      position_id: targetPos?.id || '',
      full_name: '',
      photograph_url: '',
      biography: '',
      candidate_statement: '',
      display_order: existingInPos.length + 1
    });
    setShowAddCandidateModal(true);
  };

  // Add Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection) return;
    if (!newCandidate.position_id) {
      setMessage({ text: 'Please select an election position for the candidate.', type: 'error' });
      return;
    }
    if (!newCandidate.full_name || !newCandidate.full_name.trim()) {
      setMessage({ text: 'Candidate full name is required.', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await electionService.addCandidate(selectedElection.id, {
        position_id: newCandidate.position_id,
        full_name: newCandidate.full_name.trim(),
        photograph_url: newCandidate.photograph_url,
        biography: newCandidate.biography.trim(),
        candidate_statement: newCandidate.candidate_statement.trim(),
        display_order: Number(newCandidate.display_order) || 1
      });
      if (res.success) {
        setMessage({ text: 'Candidate added successfully.', type: 'success' });
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
        setMessage({ text: res.message || 'Could not add candidate. Please verify the entered information.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error adding candidate.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Candidate
  const handleEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection || !editingCandidate) return;
    if (!editingCandidate.position_id) {
      setMessage({ text: 'Please select an election position.', type: 'error' });
      return;
    }
    if (!editingCandidate.full_name || !editingCandidate.full_name.trim()) {
      setMessage({ text: 'Candidate full name is required.', type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await electionService.updateCandidate(selectedElection.id, editingCandidate.id, {
        position_id: editingCandidate.position_id,
        full_name: editingCandidate.full_name.trim(),
        photograph_url: editingCandidate.photograph_url,
        biography: (editingCandidate.biography || '').trim(),
        candidate_statement: (editingCandidate.candidate_statement || '').trim(),
        display_order: Number(editingCandidate.display_order) || 1
      });
      if (res.success) {
        setMessage({ text: 'Candidate updated successfully.', type: 'success' });
        setShowEditCandidateModal(false);
        setEditingCandidate(null);
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Could not update candidate.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating candidate.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Candidate Status Toggle
  const handleCandidateStatus = async (candidateId: string, status: CandidateStatus) => {
    if (!selectedElection) return;
    if (['CLOSED', 'RESULTS_PUBLISHED'].includes(selectedElection.status)) {
      setMessage({ text: `Cannot modify candidate status while election is in ${selectedElection.status} status.`, type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await electionService.updateCandidateStatus(selectedElection.id, candidateId, status);
      if (res.success) {
        setMessage({ text: `Candidate status updated to ${status}.`, type: 'success' });
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to update candidate status.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating candidate status.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Candidate Confirmation handler
  const handleDeleteCandidateConfirm = async () => {
    if (!selectedElection || !candidateToDelete) return;
    if (['OPEN', 'CLOSED', 'RESULTS_PUBLISHED'].includes(selectedElection.status)) {
      setMessage({ text: `Cannot delete candidates while election is in ${selectedElection.status} status.`, type: 'error' });
      setCandidateToDelete(null);
      return;
    }
    setActionLoading(true);
    try {
      const res = await electionService.deleteCandidate(selectedElection.id, candidateToDelete.id);
      if (res.success) {
        setMessage({ text: `Candidate "${candidateToDelete.full_name}" was successfully removed.`, type: 'success' });
        setCandidateToDelete(null);
        loadElectionDetails(selectedElection.id);
      } else {
        setMessage({ text: res.message || 'Failed to delete candidate.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error deleting candidate.', type: 'error' });
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
            {elections.length > 1 && (
              <select
                value={selectedElection?.id || ''}
                onChange={(e) => {
                  const found = elections.find(el => el.id === e.target.value);
                  if (found) {
                    setSelectedElection(found);
                    loadElectionDetails(found.id);
                  }
                }}
                className="px-3 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {elections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.title} ({el.status})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowCreateElectionModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Election</span>
            </button>

            {selectedElection && (
              <button
                onClick={() => {
                  setTargetStatus(selectedElection.status);
                  setShowStatusModal(true);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all shadow-xs flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Change Status</span>
              </button>
            )}

            {selectedElection && (
              <button
                onClick={() => setShowEditConfigModal(true)}
                disabled={selectedElection.status === 'OPEN'}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                title={selectedElection.status === 'OPEN' ? 'Cannot edit config while voting is OPEN' : 'Edit Rules and Dates'}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Configuration</span>
              </button>
            )}

            <button
              onClick={() => {
                loadElections();
                if (selectedElection) loadElectionDetails(selectedElection.id);
              }}
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

      {/* Sub-Navigation Tabs & Views or Empty State */}
      {!selectedElection && !loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs space-y-4 max-w-lg mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <Vote className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No Election Configured Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create an official election to configure executive offices, review and approve candidate nominations, and initiate secure voting.
            </p>
          </div>
          <button
            onClick={() => setShowCreateElectionModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Election</span>
          </button>
        </div>
      ) : (
        <>
          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setSubTab('candidates')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'candidates'
              ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Candidates</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {candidates.length}
          </span>
        </button>

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
      {/* SUB-TAB: CANDIDATES MANAGEMENT */}
      {/* ========================================================= */}
      {subTab === 'candidates' && (
        <div className="space-y-6">
          {/* Header & Primary Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">Candidates</h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {candidates.length} Registered
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Official Candidate Register for Finger of God Estate Executive Election 2026. Review nomination credentials, photographs, manifestos, and certify candidate status for the official ballot.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddPositionModal(true)}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Position</span>
                </button>
                <button
                  onClick={() => {
                    const firstPos = [...positions].sort((a, b) => a.display_order - b.display_order)[0];
                    setNewCandidate({
                      position_id: firstPos?.id || '',
                      full_name: '',
                      photograph_url: '',
                      biography: '',
                      candidate_statement: '',
                      display_order: 1
                    });
                    setShowAddCandidateModal(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Candidate</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidate name, bio, or vision..."
                  value={candidateSearchQuery}
                  onChange={(e) => setCandidateSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <select
                  value={candidateFilterPosition}
                  onChange={(e) => setCandidateFilterPosition(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All 9 Executive Positions</option>
                  {[...positions]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.display_order}. {p.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={candidateFilterStatus}
                  onChange={(e) => setCandidateFilterStatus(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Candidate Statuses</option>
                  <option value="APPROVED">Approved (Appears on Ballot)</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </select>

                {(candidateSearchQuery || candidateFilterPosition !== 'all' || candidateFilterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setCandidateSearchQuery('');
                      setCandidateFilterPosition('all');
                      setCandidateFilterStatus('all');
                    }}
                    className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl text-xs font-medium shrink-0"
                    title="Clear Filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Positions & Candidates List */}
          <div className="space-y-6">
            {[...positions]
              .sort((a, b) => a.display_order - b.display_order)
              .filter(pos => candidateFilterPosition === 'all' || candidateFilterPosition === pos.id)
              .map((pos) => {
                const posCandidates = candidates
                  .filter(c => c.position_id === pos.id)
                  .filter(c => candidateFilterStatus === 'all' || c.status === candidateFilterStatus)
                  .filter(c => {
                    if (!candidateSearchQuery.trim()) return true;
                    const q = candidateSearchQuery.toLowerCase();
                    return (
                      c.full_name.toLowerCase().includes(q) ||
                      (c.biography && c.biography.toLowerCase().includes(q)) ||
                      (c.candidate_statement && c.candidate_statement.toLowerCase().includes(q))
                    );
                  })
                  .sort((a, b) => a.display_order - b.display_order);

                const totalInPos = candidates.filter(c => c.position_id === pos.id).length;

                return (
                  <div key={pos.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                    {/* Position Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400">#{pos.display_order}</span>
                          <h4 className="text-base font-bold text-slate-900">{pos.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            pos.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {pos.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            (Max selections: {pos.max_selections || 1})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 mr-1">
                          {totalInPos} Nominee{totalInPos === 1 ? '' : 's'}
                        </span>
                        <button
                          onClick={() => handleOpenAddCandidateForPosition(pos.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Candidate</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingPosition(pos);
                            setShowEditPositionModal(true);
                          }}
                          disabled={selectedElection?.status === 'OPEN' || selectedElection?.status === 'RESULTS_PUBLISHED'}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-40"
                          title={selectedElection?.status === 'OPEN' ? 'Cannot edit while voting is OPEN' : 'Edit Position'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTogglePositionActive(pos)}
                          disabled={selectedElection?.status === 'OPEN' || selectedElection?.status === 'RESULTS_PUBLISHED' || actionLoading}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                            pos.active
                              ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={selectedElection?.status === 'OPEN' ? 'Cannot change status while voting is OPEN' : ''}
                        >
                          {pos.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    {/* Candidates in this position */}
                    {posCandidates.length === 0 ? (
                      <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-700">No candidates added yet for {pos.title}</h5>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            The executive office of {pos.title} currently has no registered nominees.
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenAddCandidateForPosition(pos.id)}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Register Candidate for {pos.title}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {posCandidates.map((cand) => (
                          <div key={cand.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-3">
                            <div className="flex items-start gap-3">
                              {cand.photograph_url ? (
                                <img
                                  src={cand.photograph_url}
                                  alt={cand.full_name}
                                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-600 font-bold text-lg flex items-center justify-center border border-slate-200 shrink-0">
                                  {cand.full_name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-bold text-slate-400">Order #{cand.display_order}</span>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    cand.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    cand.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    cand.status === 'WITHDRAWN' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {cand.status === 'APPROVED' && <Check className="w-2.5 h-2.5" />}
                                    {cand.status === 'PENDING' && <Clock className="w-2.5 h-2.5" />}
                                    {cand.status}
                                  </span>
                                </div>
                                <h5 className="text-sm font-bold text-slate-900 truncate mt-0.5" title={cand.full_name}>
                                  {cand.full_name}
                                </h5>
                                <span className="text-[11px] font-medium text-emerald-700 block truncate">
                                  {pos.title}
                                </span>
                              </div>
                            </div>

                            {/* Biography */}
                            {cand.biography && (
                              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                                <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">Bio</span>
                                {cand.biography}
                              </div>
                            )}

                            {/* Manifesto */}
                            {cand.candidate_statement && (
                              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-semibold text-slate-700 text-[10px] uppercase tracking-wider">Manifesto</span>
                                  <button
                                    onClick={() => setViewingManifestoCandidate(cand)}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                                  >
                                    Read Full
                                  </button>
                                </div>
                                <p className="line-clamp-2 italic text-slate-500 text-[11px]">
                                  &ldquo;{cand.candidate_statement}&rdquo;
                                </p>
                              </div>
                            )}

                            {/* Actions Bar */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCandidate(cand);
                                    setShowEditCandidateModal(true);
                                  }}
                                  disabled={selectedElection?.status === 'OPEN' || selectedElection?.status === 'RESULTS_PUBLISHED'}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-40"
                                  title={selectedElection?.status === 'OPEN' ? 'Cannot edit while voting is OPEN' : 'Edit Candidate'}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setCandidateToDelete(cand)}
                                  disabled={selectedElection?.status === 'OPEN' || selectedElection?.status === 'RESULTS_PUBLISHED'}
                                  className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-40"
                                  title={selectedElection?.status === 'OPEN' ? 'Cannot delete while voting is OPEN' : 'Delete Candidate'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                {cand.status !== 'APPROVED' && (
                                  <button
                                    onClick={() => handleCandidateStatus(cand.id, 'APPROVED')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                                  >
                                    Approve
                                  </button>
                                )}
                                {cand.status !== 'REJECTED' && (
                                  <button
                                    onClick={() => handleCandidateStatus(cand.id, 'REJECTED')}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-lg transition-colors"
                                  >
                                    Reject
                                  </button>
                                )}
                                {cand.status !== 'WITHDRAWN' && (
                                  <button
                                    onClick={() => handleCandidateStatus(cand.id, 'WITHDRAWN')}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors"
                                  >
                                    Withdraw
                                  </button>
                                )}
                              </div>
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
      </>
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
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Candidate</h3>
                  <p className="text-[11px] text-slate-500">Register candidate profile, photograph, and manifesto for the official ballot.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCandidateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddCandidate} className="space-y-4 text-xs">
              {/* Position Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Election Position *
                </label>
                <select
                  value={newCandidate.position_id}
                  onChange={(e) => {
                    const posId = e.target.value;
                    const existingInPos = candidates.filter(c => c.position_id === posId);
                    setNewCandidate({
                      ...newCandidate,
                      position_id: posId,
                      display_order: existingInPos.length + 1
                    });
                  }}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Election Position (1 of 9) --</option>
                  {[...positions]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        #{p.display_order} - {p.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chief Dr. Emmanuel Okafor"
                    value={newCandidate.full_name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ballot Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newCandidate.display_order}
                    onChange={(e) => setNewCandidate({ ...newCandidate, display_order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Photograph Upload & Selection Area */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Candidate Photograph (Official Portrait)
                </label>
                {newCandidate.photograph_url ? (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src={newCandidate.photograph_url}
                      alt="Candidate Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-2xs shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" /> Photograph Attached
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer">
                          Change Photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(file, false);
                            }}
                          />
                        </label>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setNewCandidate({ ...newCandidate, photograph_url: '' })}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <button
                        type="button"
                        onClick={() => setPhotoInputMode('upload')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${photoInputMode === 'upload' ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100'}`}
                      >
                        Upload Image File
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoInputMode('url')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${photoInputMode === 'url' ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100'}`}
                      >
                        Enter Image URL
                      </button>
                    </div>

                    {photoInputMode === 'upload' ? (
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl cursor-pointer transition-colors group">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1.5 transition-colors" />
                        <span className="font-semibold text-slate-700 group-hover:text-emerald-700">Click or drag image file here</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or WEBP (Max file size 2MB)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(file, false);
                          }}
                        />
                      </label>
                    ) : (
                      <input
                        type="url"
                        placeholder="https://example.com/portraits/candidate.jpg"
                        value={newCandidate.photograph_url}
                        onChange={(e) => setNewCandidate({ ...newCandidate, photograph_url: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Biography */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Candidate Biography (Short Background & Career Record)
                </label>
                <textarea
                  placeholder="Enter candidate's professional background, residency tenure, and prior community service in Finger of God Estate..."
                  value={newCandidate.biography}
                  onChange={(e) => setNewCandidate({ ...newCandidate, biography: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Manifesto / Vision Statement */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Manifesto / Vision Statement (Pledges to Residents)
                </label>
                <textarea
                  placeholder="Enter candidate's key campaign pledges, strategic priorities, security & infrastructure plans for the estate community..."
                  value={newCandidate.candidate_statement}
                  onChange={(e) => setNewCandidate({ ...newCandidate, candidate_statement: e.target.value })}
                  rows={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Saving...' : 'Save Candidate'}</span>
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

      {/* Create Election Modal */}
      {showCreateElectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Vote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create New Estate Election</h3>
                  <p className="text-[11px] text-slate-500">Initialize election metadata, timetable, and constitutional rules.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateElectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateElection} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Election Title / Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Finger of God Estate Executive Election 2026"
                    value={createElectionForm.title}
                    onChange={(e) => setCreateElectionForm({ ...createElectionForm, title: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Election Year</label>
                  <input
                    type="number"
                    min={2026}
                    value={createElectionForm.year}
                    onChange={(e) => setCreateElectionForm({ ...createElectionForm, year: parseInt(e.target.value, 10) || 2026 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Purpose</label>
                <textarea
                  placeholder="Official executive council elections for Finger of God Estate, Phase 1, Iyiaba, Asaba..."
                  value={createElectionForm.description}
                  onChange={(e) => setCreateElectionForm({ ...createElectionForm, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Opening Date & Time</label>
                  <input
                    type="datetime-local"
                    value={createElectionForm.opening_at ? new Date(createElectionForm.opening_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setCreateElectionForm({ ...createElectionForm, opening_at: new Date(e.target.value).toISOString() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Closing Date & Time</label>
                  <input
                    type="datetime-local"
                    value={createElectionForm.closing_at ? new Date(createElectionForm.closing_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setCreateElectionForm({ ...createElectionForm, closing_at: new Date(e.target.value).toISOString() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Constitutional Tie-Resolution Mandate</label>
                <textarea
                  value={createElectionForm.tie_resolution_rule}
                  onChange={(e) => setCreateElectionForm({ ...createElectionForm, tie_resolution_rule: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">General Electoral Rules & Guidelines</label>
                <textarea
                  value={createElectionForm.election_rules}
                  onChange={(e) => setCreateElectionForm({ ...createElectionForm, election_rules: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateElectionModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Creating...' : 'Create Election'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Position Modal */}
      {showEditPositionModal && editingPosition && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Position</h3>

            <form onSubmit={handleEditPosition} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Position Title:</label>
                <input
                  type="text"
                  value={editingPosition.title}
                  onChange={(e) => setEditingPosition({ ...editingPosition, title: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mandate & Description:</label>
                <textarea
                  value={editingPosition.description || ''}
                  onChange={(e) => setEditingPosition({ ...editingPosition, description: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Display Order:</label>
                  <input
                    type="number"
                    min={1}
                    value={editingPosition.display_order}
                    onChange={(e) => setEditingPosition({ ...editingPosition, display_order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Max Selections:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingPosition.max_selections || 1}
                    onChange={(e) => setEditingPosition({ ...editingPosition, max_selections: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPositionModal(false);
                    setEditingPosition(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {showEditCandidateModal && editingCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Candidate Details</h3>
                  <p className="text-[11px] text-slate-500">Update candidate credentials, photograph, biography, or manifesto.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditCandidateModal(false);
                  setEditingCandidate(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditCandidate} className="space-y-4 text-xs">
              {/* Position */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Election Position *
                </label>
                <select
                  value={editingCandidate.position_id}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, position_id: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[...positions]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        #{p.display_order} - {p.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Full Name & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    value={editingCandidate.full_name}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, full_name: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingCandidate.display_order}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, display_order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Photograph Upload & Selection Area */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Candidate Photograph (Official Portrait)
                </label>
                {editingCandidate.photograph_url ? (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src={editingCandidate.photograph_url}
                      alt="Candidate Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-2xs shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" /> Photograph Attached
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer">
                          Change Photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(file, true);
                            }}
                          />
                        </label>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setEditingCandidate({ ...editingCandidate, photograph_url: '' })}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <button
                        type="button"
                        onClick={() => setEditPhotoInputMode('upload')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${editPhotoInputMode === 'upload' ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100'}`}
                      >
                        Upload Image File
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPhotoInputMode('url')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${editPhotoInputMode === 'url' ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100'}`}
                      >
                        Enter Image URL
                      </button>
                    </div>

                    {editPhotoInputMode === 'upload' ? (
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl cursor-pointer transition-colors group">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1.5 transition-colors" />
                        <span className="font-semibold text-slate-700 group-hover:text-emerald-700">Click or drag image file here</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or WEBP (Max file size 2MB)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(file, true);
                          }}
                        />
                      </label>
                    ) : (
                      <input
                        type="url"
                        placeholder="https://example.com/portraits/candidate.jpg"
                        value={editingCandidate.photograph_url || ''}
                        onChange={(e) => setEditingCandidate({ ...editingCandidate, photograph_url: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Biography */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Candidate Biography (Short Background & Career Record)
                </label>
                <textarea
                  value={editingCandidate.biography || ''}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, biography: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Manifesto */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Manifesto / Vision Statement (Pledges to Residents)
                </label>
                <textarea
                  value={editingCandidate.candidate_statement || ''}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, candidate_statement: e.target.value })}
                  rows={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCandidateModal(false);
                    setEditingCandidate(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Candidate Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Remove Candidate?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently remove <strong className="text-slate-900 font-semibold">{candidateToDelete.full_name}</strong> from the official election roster? This cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCandidateConfirm}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Deleting...' : 'Yes, Remove Candidate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Manifesto Viewer Modal */}
      {viewingManifestoCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                {viewingManifestoCandidate.photograph_url ? (
                  <img
                    src={viewingManifestoCandidate.photograph_url}
                    alt={viewingManifestoCandidate.full_name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-600 font-bold text-xl flex items-center justify-center border border-slate-200 shrink-0">
                    {viewingManifestoCandidate.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{viewingManifestoCandidate.full_name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      viewingManifestoCandidate.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      viewingManifestoCandidate.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      viewingManifestoCandidate.status === 'WITHDRAWN' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {viewingManifestoCandidate.status}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Nominee for {positions.find(p => p.id === viewingManifestoCandidate.position_id)?.title || 'Executive Office'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingManifestoCandidate(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Biography */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Biography & Track Record</span>
              </h4>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {viewingManifestoCandidate.biography || 'No biography recorded for this candidate.'}
              </div>
            </div>

            {/* Manifesto */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Official Manifesto & Vision Statement</span>
              </h4>
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {viewingManifestoCandidate.candidate_statement || 'No manifesto submitted for this candidate.'}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingManifestoCandidate(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
