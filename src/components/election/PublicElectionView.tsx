import React, { useState, useEffect, useCallback } from 'react';
import { 
  Vote, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Award, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  User, 
  ChevronRight, 
  HelpCircle,
  Trophy,
  RefreshCw,
  Lock,
  ArrowRight
} from 'lucide-react';
import { 
  Election, 
  ElectionPosition, 
  ElectionCandidate, 
  ElectionResultSnapshot,
  ElectionStatus 
} from '../../types/election';
import { EstateSettings, Resident, NavigationTab } from '../../types/database';
import { electionService } from '../../services/electionService';
import { PublicNavbar } from '../layout/PublicNavbar';
import { SEOHead } from '../common/SEOHead';
import { CandidateModal } from './CandidateModal';
import { BallotModal } from './BallotModal';

interface PublicElectionViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: (initialTab?: 'login' | 'activate') => void;
}

export const PublicElectionView: React.FC<PublicElectionViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin
}) => {
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [results, setResults] = useState<ElectionResultSnapshot | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [isBallotModalOpen, setIsBallotModalOpen] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState<ElectionCandidate | null>(null);
  const [viewingCandidatePosition, setViewingCandidatePosition] = useState<ElectionPosition | undefined>(undefined);

  // Active position tab filter for viewing candidates
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');

  // Live countdown state for Scheduled election (Days, Hours, Minutes, Seconds)
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isZero: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isZero: false });

  const loadElectionData = useCallback(async () => {
    try {
      setError('');
      const data = await electionService.getActiveElection();
      if (data.success && data.election) {
        setElection(data.election);
        setPositions(data.positions || []);
        setCandidates(data.candidates || []);

        // If results published, fetch results
        if (data.election.status === 'RESULTS_PUBLISHED' || data.election.calculated_status === 'RESULTS_PUBLISHED') {
          const resData = await electionService.getElectionResults(data.election.id);
          if (resData.success && resData.results) {
            setResults(resData.results);
          }
        }
      } else {
        // Fallback: Check official election by ID
        const fallback = await electionService.getElectionById('aee791a1-d88a-4292-b0d2-0e5f68ea7de8');
        if (fallback.success && fallback.election) {
          setElection(fallback.election);
          setPositions(fallback.positions || []);
          setCandidates(fallback.candidates || []);
        } else {
          setError(data.message || fallback.message || 'No election scheduled at this time.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching election details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadElectionData();
  }, [loadElectionData]);

  // Live countdown timer: recalculates remaining Days, Hours, Minutes, Seconds every 1 second
  // Stops timer, cleans up on unmount, and transitions UI to Voting Open when reaching zero
  useEffect(() => {
    if (!election?.opening_at) return;

    const targetTime = new Date(election.opening_at).getTime();
    if (isNaN(targetTime)) return;

    const serverOffset = election.server_time ? (new Date(election.server_time).getTime() - Date.now()) : 0;

    const updateCountdown = () => {
      const currentRefTime = Date.now() + serverOffset;
      const diff = targetTime - currentRefTime;

      // Prevent negative values and handle zero transition (00 Days 00 Hours 00 Minutes 00 Seconds)
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isZero: true });
        // Refresh election status immediately so UI transitions from Scheduled to Voting Open
        loadElectionData();
        return false;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const seconds = totalSeconds % 60;
      const totalMinutes = Math.floor(totalSeconds / 60);
      const minutes = totalMinutes % 60;
      const totalHours = Math.floor(totalMinutes / 60);
      const hours = totalHours % 24;
      const days = Math.floor(totalHours / 24);

      setCountdown({
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds),
        isZero: false
      });
      return true;
    };

    // Calculate immediately on mount / election load
    const isRunning = updateCountdown();
    if (!isRunning) return;

    // Update countdown every 1 second (1000ms)
    const intervalId = setInterval(() => {
      const active = updateCountdown();
      if (!active) {
        clearInterval(intervalId);
      }
    }, 1000);

    // Clean up timer on unmount to prevent memory leaks or multiple timers
    return () => {
      clearInterval(intervalId);
    };
  }, [election?.opening_at, election?.server_time, loadElectionData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadElectionData();
  };

  // Helper to format timestamps in WAT (West Africa Time, UTC+1)
  const formatElectionWat = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const datePart = date.toLocaleDateString('en-US', {
        timeZone: 'Africa/Lagos',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      const timePart = date.toLocaleTimeString('en-US', {
        timeZone: 'Africa/Lagos',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${datePart} – ${timePart} WAT`;
    } catch {
      return dateStr;
    }
  };

  // Helper for dynamic election state based on database timestamps & server time
  const getElectionState = () => {
    if (!election) return null;

    const referenceTime = election.server_time ? new Date(election.server_time) : new Date();
    const startsAt = new Date(election.opening_at);
    const endsAt = new Date(election.closing_at);

    if (election.status === 'RESULTS_PUBLISHED' || election.calculated_status === 'RESULTS_PUBLISHED') {
      return {
        key: 'RESULTS_PUBLISHED' as const,
        label: 'Status: Official Results Certified',
        statusName: 'Official Results Certified',
        isVotingOpen: false,
        isScheduled: false,
        isClosed: true,
        badgeText: 'RESULTS CERTIFIED',
        badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        dotClass: 'bg-purple-400'
      };
    }

    if (election.status === 'PAUSED' || election.calculated_status === 'PAUSED') {
      return {
        key: 'PAUSED' as const,
        label: 'Status: Voting Paused',
        statusName: 'Voting Paused',
        isVotingOpen: false,
        isScheduled: false,
        isClosed: false,
        badgeText: 'VOTING PAUSED',
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400'
      };
    }

    // Dynamic database timestamp comparison:
    if (referenceTime < startsAt) {
      return {
        key: 'SCHEDULED' as const,
        label: 'Status: Scheduled — Voting Not Yet Open',
        statusName: 'Scheduled — Voting Not Yet Open',
        isVotingOpen: false,
        isScheduled: true,
        isClosed: false,
        badgeText: 'SCHEDULED — VOTING NOT YET OPEN',
        badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        dotClass: 'bg-amber-400'
      };
    }

    if (referenceTime >= startsAt && referenceTime < endsAt) {
      return {
        key: 'OPEN' as const,
        label: 'Status: Voting Open',
        statusName: 'Voting Open',
        isVotingOpen: true,
        isScheduled: false,
        isClosed: false,
        badgeText: 'VOTING OPEN',
        badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
        dotClass: 'bg-emerald-400 animate-pulse'
      };
    }

    return {
      key: 'CLOSED' as const,
      label: 'Status: Voting Closed',
      statusName: 'Voting Closed',
      isVotingOpen: false,
      isScheduled: false,
      isClosed: true,
      badgeText: 'VOTING CLOSED',
      badgeBg: 'bg-slate-700/60 text-slate-300 border-slate-600',
      dotClass: 'bg-slate-400'
    };
  };

  const electionState = getElectionState();
  const votingOpensDisplay = election?.voting_opens_display || formatElectionWat(election?.opening_at);
  const votingClosesDisplay = election?.voting_closes_display || formatElectionWat(election?.closing_at);

  const activePositions = positions
    .filter(p => p.active)
    .sort((a, b) => a.display_order - b.display_order);

  const filteredPositions = selectedPositionId === 'all'
    ? activePositions
    : activePositions.filter(p => p.id === selectedPositionId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <SEOHead
        title="Estate Election 2026 - Finger of God Estate"
        description="Official democratic elections for the executive committee of Finger of God Estate. Verified accredited property secret ballot."
      />

      {/* Public Navbar */}
      <PublicNavbar
        currentTab="election"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      {/* Hero Header */}
      <div className="bg-slate-900 text-white relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  Finger of God Estate · Electoral Committee
                </span>
                {electionState && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${electionState.badgeBg}`}>
                    <span className={`w-2 h-2 rounded-full ${electionState.dotClass}`} />
                    {electionState.badgeText}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {election ? election.title : 'Finger of God Estate Executive Election 2026'}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {election?.description || 'Democratic leadership election for Finger of God Estate. Accredited property secret ballot system.'}
              </p>

              {/* Official Election Schedule & Dynamic Status Card */}
              {election && (
                <div className="pt-2">
                  <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 backdrop-blur-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Official Election Timetable
                        </span>
                      </div>
                      <div className="text-xs font-bold">
                        <span className="text-slate-400">Current </span>
                        <span className={electionState?.isVotingOpen ? 'text-emerald-400' : electionState?.isScheduled ? 'text-amber-400' : 'text-slate-300'}>
                          {electionState?.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Opening Date & Time
                        </span>
                        <div className="font-bold text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Voting opens: {votingOpensDisplay}</span>
                        </div>

                        {/* Live Countdown Timer under Election Opening Information */}
                        {electionState?.isScheduled && !countdown.isZero && (
                          <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                            <span className="text-xs font-bold text-emerald-400 block tracking-wide">
                              Voting begins in
                            </span>
                            <div className="text-xs sm:text-base font-extrabold text-white tracking-wide flex items-center flex-wrap gap-2">
                              <span className="bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                {String(countdown.days).padStart(2, '0')} Days
                              </span>
                              <span className="bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                {String(countdown.hours).padStart(2, '0')} Hours
                              </span>
                              <span className="bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                {String(countdown.minutes).padStart(2, '0')} Minutes
                              </span>
                              <span className="bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-mono">
                                {String(countdown.seconds).padStart(2, '0')} Seconds
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Closing Date & Time
                        </span>
                        <div className="font-bold text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Voting closes: {votingClosesDisplay}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Accreditation: Plots 001–300
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          Secret Anonymous Ballot
                        </span>
                      </div>
                      <span className="text-slate-400">Timezone: Africa/Lagos (WAT, UTC+1)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Call to action column */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
              {electionState?.isVotingOpen ? (
                <button
                  onClick={() => setIsBallotModalOpen(true)}
                  className="w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Vote className="w-5 h-5" />
                  <span>Cast Confidential Ballot</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              ) : electionState?.key === 'RESULTS_PUBLISHED' ? (
                <a
                  href="#official-results"
                  className="w-full sm:w-auto px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  <span>View Certified Results</span>
                </a>
              ) : electionState?.isScheduled ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 max-w-xs space-y-2.5">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Status: Scheduled — Voting Not Yet Open</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Voting will automatically open on <strong className="text-white">October 24, 2026 at 8:00 AM WAT</strong>.
                  </p>

                  {/* Live Countdown in Status Callout */}
                  {!countdown.isZero && (
                    <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                        Voting begins in
                      </span>
                      <div className="text-xs sm:text-sm font-black text-white tracking-wide flex items-center flex-wrap gap-1">
                        <span>{String(countdown.days).padStart(2, '0')} Days</span>
                        <span>{String(countdown.hours).padStart(2, '0')} Hours</span>
                        <span>{String(countdown.minutes).padStart(2, '0')} Minutes</span>
                        <span className="text-amber-400 font-mono">{String(countdown.seconds).padStart(2, '0')} Seconds</span>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-amber-300/80 bg-amber-950/40 px-2 py-1 rounded border border-amber-500/20">
                    Accredited plots 001–300 will be enabled to cast secret ballots.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 text-xs text-slate-300 max-w-xs space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Status: Voting Closed</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Voting for the 2026 Executive Council officially closed on <strong className="text-slate-200">October 31, 2026 at 12:00 PM WAT</strong>.
                  </p>
                </div>
              )}

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full space-y-10">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Loading official election register...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 shadow-xs">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Election Information</h3>
            <p className="text-sm text-slate-600">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* 1. Official Results Section (When RESULTS_PUBLISHED) */}
            {election?.status === 'RESULTS_PUBLISHED' && results && (
              <section id="official-results" className="space-y-6">
                <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-800/80 pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 bg-purple-950 px-2.5 py-0.5 rounded border border-purple-500/30">
                          Official Certified Declaration
                        </span>
                        <span className="text-xs text-purple-200">
                          Published: {new Date(results.published_at).toLocaleString()}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Official Election Results Summary
                      </h2>
                      <p className="text-xs sm:text-sm text-purple-200">
                        Certified by: {results.published_by || 'Electoral Committee'}
                      </p>
                    </div>

                    {/* Turnout Statistics Cards */}
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-950/60 border border-purple-700/50 rounded-2xl px-4 py-3 text-center">
                        <span className="text-[11px] uppercase tracking-wider text-purple-300 block font-semibold">
                          Total Turnout
                        </span>
                        <span className="text-2xl font-black text-white">
                          {results.turnout_percentage}%
                        </span>
                      </div>
                      <div className="bg-purple-950/60 border border-purple-700/50 rounded-2xl px-4 py-3 text-center">
                        <span className="text-[11px] uppercase tracking-wider text-purple-300 block font-semibold">
                          Ballots Cast
                        </span>
                        <span className="text-2xl font-black text-white">
                          {results.total_voters} / {results.total_eligible_voters}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Position Results Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    {results.positions.map((pos) => (
                      <div 
                        key={pos.position_id}
                        className="bg-white/95 text-slate-900 rounded-2xl p-5 sm:p-6 shadow-md border border-slate-200"
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                              Position Results
                            </span>
                            <h3 className="text-lg font-bold text-slate-900">
                              {pos.position_title}
                            </h3>
                          </div>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                            {pos.total_votes} Votes Total
                          </span>
                        </div>

                        {/* Tie Alert Banner if applicable */}
                        {pos.is_tie && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Tie Detected Between Leading Candidates:</strong>
                              {pos.tie_message || results.tie_resolution_rule}
                            </div>
                          </div>
                        )}

                        {/* Candidate Breakdown */}
                        <div className="space-y-3">
                          {pos.candidates.map((cand) => (
                            <div 
                              key={cand.candidate_id}
                              className={`p-3 rounded-xl border transition-all ${
                                cand.is_winner
                                  ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                                  : 'border-slate-200 bg-slate-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 truncate">
                                  {cand.is_winner && (
                                    <span className="text-amber-500 text-sm" title="Winner">
                                      🏆
                                    </span>
                                  )}
                                  <span className={`text-sm font-bold truncate ${
                                    cand.is_winner ? 'text-emerald-950 font-extrabold' : 'text-slate-800'
                                  }`}>
                                    {cand.full_name}
                                  </span>
                                  {cand.is_winner && (
                                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                      Elected
                                    </span>
                                  )}
                                  {cand.is_tie && (
                                    <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                      Tied
                                    </span>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-sm font-bold text-slate-900">
                                    {cand.votes} <span className="text-xs font-normal text-slate-500">votes</span>
                                  </span>
                                  <span className="text-xs font-bold text-slate-600 ml-1.5">
                                    ({cand.percentage}%)
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    cand.is_winner ? 'bg-emerald-600' : 'bg-slate-400'
                                  }`}
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
              </section>
            )}

            {/* 2. Electoral Guidelines & Constitutional Rules */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    Official Electoral Guidelines & Constitutional Rules
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-600 space-y-1.5 leading-relaxed">
                    <p>• <strong>Accredited Voting Body:</strong> Only verified landlords and registered residents with allocated Estate Numbers (001–300) are accredited to vote.</p>
                    <p>• <strong>Strict 1 Vote per Accredited Property:</strong> Each property is allotted exactly one vote per election cycle. Once cast, the property record is marked as voted.</p>
                    <p>• <strong>Confidential Secret Ballot:</strong> Voter identities and telephone credentials are cryptographically isolated from ballot choices. Nobody, including the administrators, can inspect individual voter ballots.</p>
                    <p>• <strong>Tie Resolution:</strong> {election?.tie_resolution_rule || 'Run-off assembly within 7 days in accordance with Article 8.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Candidates Directory Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Official Candidates Directory
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Review accredited candidate profiles, track records, and manifesto statements.
                  </p>
                </div>

                {/* Filter position tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setSelectedPositionId('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedPositionId === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All Positions ({activePositions.length})
                  </button>
                  {activePositions.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setSelectedPositionId(pos.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedPositionId === pos.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pos.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Groups & Candidate Cards */}
              <div className="space-y-8">
                {filteredPositions.map((position) => {
                  const posCandidates = candidates.filter(
                    c => c.position_id === position.id && c.status === 'APPROVED'
                  );

                  return (
                    <div key={position.id} className="space-y-4">
                      {/* Position Title & Mandate */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                              {position.title}
                            </h3>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-medium text-emerald-700">
                              {posCandidates.length} Accredited Candidate{posCandidates.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          {position.description && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {position.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Candidate Cards Grid */}
                      {posCandidates.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 space-y-1">
                          <p className="font-semibold text-slate-700">Nominations Under Review</p>
                          <p className="text-slate-400">Candidate nominations for {position.title} are undergoing accreditation review by the Electoral Committee.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {posCandidates.map((candidate) => (
                            <div
                              key={candidate.id}
                              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                            >
                              <div className="space-y-4">
                                <div className="flex items-start gap-3.5">
                                  {candidate.photograph_url ? (
                                    <img
                                      src={candidate.photograph_url}
                                      alt={candidate.full_name}
                                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 shrink-0 font-bold border border-slate-200 shadow-inner">
                                      <User className="w-8 h-8 text-slate-400" />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block mb-1">
                                      Approved Candidate
                                    </span>
                                    <h4 className="text-base font-bold text-slate-900 truncate">
                                      {candidate.full_name}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium truncate">
                                      Contesting: {position.title}
                                    </p>
                                  </div>
                                </div>

                                {/* Bio Summary */}
                                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                  {candidate.biography || 'Registered estate community member with dedicated service record.'}
                                </p>

                                {/* Manifesto Excerpt */}
                                {candidate.candidate_statement && (
                                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 italic line-clamp-2">
                                    &ldquo;{candidate.candidate_statement}&rdquo;
                                  </div>
                                )}
                              </div>

                              {/* Card Footer Actions */}
                              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                                <button
                                  onClick={() => {
                                    setViewingCandidate(candidate);
                                    setViewingCandidatePosition(position);
                                  }}
                                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                                >
                                  <span>Read Full Manifesto</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>

                                {electionState?.isVotingOpen && (
                                  <button
                                    onClick={() => setIsBallotModalOpen(true)}
                                    className="text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                                  >
                                    Vote
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
            </section>
          </>
        )}
      </main>

      {/* Floating or Footer Call To Action Banner */}
      {electionState?.isVotingOpen && (
        <div className="sticky bottom-0 z-30 bg-slate-900 text-white border-t border-slate-800 py-3.5 px-4 shadow-2xl backdrop-blur-md bg-slate-900/95">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Vote className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">Accredited Election 2026 is LIVE</span>
                <span className="text-slate-400">All registered residents 001–300 are entitled to one vote.</span>
              </div>
            </div>

            <button
              onClick={() => setIsBallotModalOpen(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ml-auto"
            >
              <Vote className="w-4 h-4" />
              <span>Cast Your Confidential Ballot Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Secret Ballot Modal */}
      {isBallotModalOpen && election && (
        <BallotModal
          election={election}
          positions={positions}
          candidates={candidates}
          onClose={() => setIsBallotModalOpen(false)}
          onVoteCastSuccess={() => {
            loadElectionData();
          }}
        />
      )}

      {/* Full Candidate Profile Modal */}
      {viewingCandidate && (
        <CandidateModal
          candidate={viewingCandidate}
          position={viewingCandidatePosition}
          onClose={() => {
            setViewingCandidate(null);
            setViewingCandidatePosition(undefined);
          }}
        />
      )}
    </div>
  );
};
