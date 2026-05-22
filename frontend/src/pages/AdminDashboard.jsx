import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  ClipboardList,
  FileText,
  Pencil,
  Plus,
  Send,
  Settings,
  Sparkles,
  Trash2,
  X,
  UserPlus,
  Users,
  Copy,
  KeyRound,
} from 'lucide-react';
import api from '../lib/api';
import AppShell from '../layouts/AppShell';
import OSDashboard from '../components/os/OSDashboard';

const emptyUser = { name: '', email: '', password: '', role: 'candidate' };
const emptyInterview = {
  candidateId: '',
  jobRoleId: '',
  round: 'technical',
  personality: 'friendly_hr',
  totalQuestions: 8,
  includeCoding: false,
  currentQuestion: '',
  publish: true,
};
const emptyPinInterview = {
  title: '',
  jobRole: '',
  candidateName: '',
  candidateEmail: '',
  q1: 'Tell me about yourself.',
  q2: 'Why do you want to join our team?',
  q3: '',
  language: 'en',
  personality: 'friendly_hr',
  round: 'technical',
  difficulty: 'medium',
  aiQuestionCount: '5',
  includeCoding: false,
  pinExpiryHours: '72',
};
const emptyJobRole = {
  title: '',
  department: '',
  description: '',
  skills: '',
  rounds: ['hr', 'technical'],
  status: 'active',
};
const emptyQuestion = {
  text: '',
  candidateId: '',
  jobRoleId: '',
  interviewId: '',
  round: 'technical',
  difficulty: 'medium',
};
const defaultSettings = {
  defaultLanguage: 'en',
  defaultQuestions: 8,
  allowCandidateSelfStart: false,
  elevenLabsEnabled: true,
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'candidates', label: 'Candidates', icon: Users },
  { id: 'jobs', label: 'Job Roles', icon: ClipboardList },
  { id: 'interviews', label: 'Interviews', icon: ClipboardList },
  { id: 'questions', label: 'Questions', icon: Sparkles },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [pinInterviews, setPinInterviews] = useState([]);
  const [pinForm, setPinForm] = useState(emptyPinInterview);
  const [generatedPin, setGeneratedPin] = useState(null);
  const [editingPinId, setEditingPinId] = useState('');
  const [pinEditDraft, setPinEditDraft] = useState(null);
  const [pinAnswersView, setPinAnswersView] = useState(null);
  const [reports, setReports] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [settingsForm, setSettingsForm] = useState(defaultSettings);
  const [userForm, setUserForm] = useState(emptyUser);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [jobForm, setJobForm] = useState(emptyJobRole);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionRoundFilter, setQuestionRoundFilter] = useState('');
  const [questionSourceFilter, setQuestionSourceFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [liveDash, setLiveDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const candidates = useMemo(() => users.filter((user) => user.role === 'candidate'), [users]);
  const visibleQuestions = useMemo(
    () =>
      questionBank.filter((question) => {
        const haystack = `${question.text || ''} ${question.jobRoleId?.title || ''}`.toLowerCase();
        const matchesSearch = haystack.includes(questionSearch.trim().toLowerCase());
        const matchesRound = !questionRoundFilter || question.round === questionRoundFilter;
        const matchesSource = !questionSourceFilter || question.source === questionSourceFilter;
        return matchesSearch && matchesRound && matchesSource;
      }),
    [questionBank, questionRoundFilter, questionSearch, questionSourceFilter]
  );

  const load = async () => {
    try {
      setError('');
      const [overview, userRes, interviewRes, pinRes, reportRes, roleRes, questionRes, settingsRes] =
        await Promise.all([
          api.get('/analytics/admin'),
          api.get('/admin/users'),
          api.get('/admin/interviews'),
          api.get('/interviews'),
          api.get('/admin/reports'),
          api.get('/admin/job-roles'),
          api.get('/admin/questions'),
          api.get('/admin/settings'),
        ]);
      setStats(overview.data);
      setUsers(userRes.data);
      setInterviews(interviewRes.data);
      setPinInterviews(pinRes.data);
      setReports(reportRes.data);
      setJobRoles(roleRes.data);
      setQuestionBank(questionRes.data);
      const appSetting = settingsRes.data.find((item) => item.key === 'app');
      if (appSetting?.value) setSettingsForm({ ...defaultSettings, ...appSetting.value });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const refreshLive = async () => {
    setDashLoading(true);
    try {
      const { data } = await api.get('/analytics/live');
      setLiveDash(data);
    } catch {
      // Live dashboard refresh is best-effort.
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    load();
    refreshLive();
    const id = setInterval(refreshLive, 15000);
    return () => clearInterval(id);
  }, []);

  const run = async (success, task) => {
    try {
      setError('');
      setMessage('');
      await task();
      setMessage(success);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const createUser = (event) => {
    event.preventDefault();
    run('User created', async () => {
      await api.post('/admin/users', userForm);
      setUserForm(emptyUser);
    });
  };

  const updateUserRole = (user) =>
    run('User updated', () => api.patch(`/admin/users/${user.id}`, { role: user.role }));

  const deleteUser = (id) => run('User deleted', () => api.delete(`/admin/users/${id}`));

  const createJobRole = (event) => {
    event.preventDefault();
    run('Job role saved', async () => {
      await api.post('/admin/job-roles', jobForm);
      setJobForm(emptyJobRole);
    });
  };

  const updateJobRole = (role) =>
    run('Job role updated', () => api.patch(`/admin/job-roles/${role._id}`, role));

  const deleteJobRole = (id) => run('Job role deleted', () => api.delete(`/admin/job-roles/${id}`));

  const createQuestion = (event) => {
    event.preventDefault();
    run('Question added to bank', async () => {
      await api.post('/admin/questions', questionForm);
      setQuestionForm(emptyQuestion);
    });
  };

  const startEditQuestion = (question) => {
    setEditingQuestionId(question._id);
    setQuestionDrafts((drafts) => ({
      ...drafts,
      [question._id]: {
        text: question.text || '',
        jobRoleId: question.jobRoleId?._id || question.jobRoleId || '',
        interviewId: question.interviewId?._id || question.interviewId || '',
        round: question.round || 'technical',
        difficulty: question.difficulty || 'medium',
      },
    }));
  };

  const updateQuestionDraft = (id, patch) => {
    setQuestionDrafts((drafts) => ({ ...drafts, [id]: { ...drafts[id], ...patch } }));
  };

  const saveQuestion = (id) =>
    run('Question updated', async () => {
      await api.patch(`/admin/questions/${id}`, questionDrafts[id]);
      setEditingQuestionId('');
    });

  const deleteQuestion = (id) =>
    run('Question deleted', () => api.delete(`/admin/questions/${id}`));

  const generateQuestion = async (target = 'interview', save = false) => {
    const source = target === 'bank' ? questionForm : interviewForm;
    setBusy(save ? 'question-save' : target === 'bank' ? 'question-draft' : 'question');
    try {
      const { data } = await api.post('/admin/questions/generate', {
        ...source,
        save,
        requireResume: target === 'bank',
      });
      if (target === 'bank') {
        if (save) {
          setQuestionForm(emptyQuestion);
          await load();
        } else {
          setQuestionForm((form) => ({ ...form, text: data.question || '' }));
        }
      } else {
        setInterviewForm((form) => ({ ...form, currentQuestion: data.question || '' }));
      }
      setMessage(save ? 'AI question saved' : 'AI question generated');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  };

  const publishInterview = (id) =>
    run('Interview published', () => api.patch(`/admin/interviews/${id}`, { publish: true }));

  const updateInterview = (interview) =>
    run('Interview updated', () => api.patch(`/admin/interviews/${interview.id}`, { status: interview.status }));

  const deleteInterview = (id) =>
    run('Interview deleted', () => api.delete(`/admin/interviews/${id}`));

  const createPinInterview = async (event) => {
    event.preventDefault();
    const questions = [pinForm.q1, pinForm.q2, pinForm.q3].map((q) => q.trim()).filter(Boolean);
    if (questions.length < 2) {
      setError('Add at least 2 custom questions for the PIN interview.');
      return;
    }
    try {
      setError('');
      setMessage('');
      const { data } = await api.post('/interviews/create', {
        title: pinForm.title,
        jobRole: pinForm.jobRole,
        candidateName: pinForm.candidateName,
        candidateEmail: pinForm.candidateEmail,
        questions,
        language: pinForm.language,
        personality: pinForm.personality,
        round: pinForm.round,
        difficulty: pinForm.difficulty,
        aiQuestionCount: Number(pinForm.aiQuestionCount) || 5,
        includeCoding: pinForm.includeCoding,
      });
      try {
        const pinRes = await api.post(`/interviews/${data.interview.id}/generate-pin`, {
          pinExpiryHours: Number(pinForm.pinExpiryHours) || 72,
        });
        setGeneratedPin({
          interviewId: data.interview.id,
          title: data.interview.title,
          pinCode: pinRes.data.pinCode,
          pinExpiresAt: pinRes.data.pinExpiresAt,
        });
        setMessage('PIN interview created and PIN generated');
      } catch (pinErr) {
        setGeneratedPin({ interviewId: data.interview.id, title: data.interview.title });
        setError(
          pinErr.response?.data?.message ||
            'Interview saved but PIN generation failed. Use Generate PIN on the list.'
        );
      }
      setPinForm(emptyPinInterview);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const generatePin = (interviewId) =>
    run('PIN generated', async () => {
      const { data } = await api.post(`/interviews/${interviewId}/generate-pin`, {
        pinExpiryHours: Number(pinForm.pinExpiryHours) || 72,
      });
      setGeneratedPin({
        interviewId,
        pinCode: data.pinCode,
        pinExpiresAt: data.pinExpiresAt,
        title: data.interview?.title,
      });
    });

  const copyPin = (pin) => {
    navigator.clipboard?.writeText(pin);
    setMessage('PIN copied to clipboard');
  };

  const deletePinInterview = (id) =>
    run('PIN interview deleted', () => api.delete(`/interviews/${id}`));

  const canEditPin = (iv) =>
    iv.status !== 'completed' && iv.candidateStatus !== 'interview_started' && iv.candidateStatus !== 'completed';

  const startEditPin = async (iv) => {
    const interviewId = iv.id || iv._id;
    if (!interviewId) {
      setError('Interview id missing — refresh the page and try again.');
      return;
    }
    try {
      setError('');
      const { data } = await api.get(`/interviews/${interviewId}`);
      setEditingPinId(interviewId);
      setPinEditDraft({
        title: data.interview.title || '',
        jobRole: data.interview.jobRole || '',
        candidateName: data.interview.candidateName || '',
        candidateEmail: data.interview.candidateEmail || '',
        language: data.interview.language || 'en',
        personality: data.interview.personality || 'friendly_hr',
        round: data.interview.round || 'technical',
        difficulty: data.interview.difficulty || 'medium',
        aiQuestionCount: String(data.interview.aiQuestionCount || 5),
        includeCoding: !!data.interview.includeCoding,
        customQuestions: (data.customQuestions || []).map((q) => ({
          id: q._id,
          questionText: q.questionText || '',
        })),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const viewPinAnswers = async (iv) => {
    const interviewId = iv.id || iv._id;
    if (!interviewId) return;
    setPinAnswersView({
      title: iv.title || 'PIN interview',
      candidateName: iv.candidateName || 'Candidate',
      answers: [],
      loading: true,
    });
    try {
      setError('');
      const { data } = await api.get(`/interviews/${interviewId}`);
      setPinAnswersView({
        title: data.interview?.title || iv.title,
        candidateName: data.candidate?.name || data.interview?.candidateName || iv.candidateName,
        answers: Array.isArray(data.answers) ? data.answers : [],
        partial: !data.result,
        loading: false,
      });
    } catch (err) {
      setPinAnswersView({
        title: iv.title || 'PIN interview',
        candidateName: iv.candidateName || 'Candidate',
        answers: [],
        partial: true,
        loading: false,
        error: err.response?.data?.message || err.message,
      });
    }
  };

  const savePinEdit = () =>
    run('PIN interview updated', async () => {
      await api.put(`/interviews/${editingPinId}`, {
        title: pinEditDraft.title,
        jobRole: pinEditDraft.jobRole,
        candidateName: pinEditDraft.candidateName,
        candidateEmail: pinEditDraft.candidateEmail,
        language: pinEditDraft.language,
        personality: pinEditDraft.personality,
        round: pinEditDraft.round,
        difficulty: pinEditDraft.difficulty,
        aiQuestionCount: Number(pinEditDraft.aiQuestionCount) || 5,
        includeCoding: pinEditDraft.includeCoding,
        customQuestions: pinEditDraft.customQuestions,
      });
      setEditingPinId('');
      setPinEditDraft(null);
    });

  const updateReport = (report, recommendation) =>
    run('Report updated', () =>
      api.patch(
        report.source === 'pin' ? `/admin/pin-results/${report.id}` : `/admin/reports/${report.id}`,
        { recommendation }
      )
    );

  const deleteReport = (report) =>
    run('Report deleted', () =>
      api.delete(
        report.source === 'pin' ? `/admin/pin-results/${report.id}` : `/admin/reports/${report.id}`
      )
    );

  const saveSettings = (event) => {
    event.preventDefault();
    run('Settings saved', () => api.put('/admin/settings/app', { value: settingsForm }));
  };

  return (
    <AppShell title="Admin Dashboard" subtitle="Manage interviews, candidates, reports, and publishing.">
      {pinAnswersView && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/20 bg-[#101116] p-6 text-white shadow-2xl ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{pinAnswersView.title}</h3>
                <p className="mt-1 text-sm text-white/50">
                  {pinAnswersView.candidateName}
                  {pinAnswersView.partial ? ' · in progress' : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setPinAnswersView(null)}
              >
                Close
              </button>
            </div>
            {pinAnswersView.loading ? (
              <p className="mt-6 text-sm text-white/55">Loading submitted answers...</p>
            ) : pinAnswersView.error ? (
              <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {pinAnswersView.error}
              </p>
            ) : pinAnswersView.answers.length === 0 ? (
              <p className="mt-6 text-sm text-white/45">No answers submitted yet.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {pinAnswersView.answers.map((a, idx) => (
                  <li
                    key={a._id || idx}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-indigo-300/80">
                      Q{idx + 1} · {a.questionType}
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/90">{a.questionText}</p>
                    <p className="mt-2 text-sm text-white/65">{a.candidateAnswer}</p>
                    {a.aiScore != null && (
                      <p className="mt-2 text-xs text-white/45">
                        Score {a.aiScore}/10
                        {a.aiFeedback ? ` — ${a.aiFeedback}` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl pb-10">
        {(error || message) && (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            {error || message}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                activeTab === tab.id ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-5">
            <OSDashboard stats={liveDash || {}} loading={dashLoading} />

            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Candidates" value={stats?.totalCandidates ?? candidates.length} />
              <Metric label="Interviews" value={interviews.length} />
              <Metric label="Completed" value={stats?.completedCount ?? 0} />
              <Metric label="Success" value={`${stats?.successRate ?? 0}%`} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Top Candidates" icon={Users}>
                <Stack>
                  {(stats?.topCandidates || []).map((candidate) => (
                    <Row key={candidate.name} title={candidate.name} meta={`${formatPct(candidate.score)} average`} />
                  ))}
                  {(!stats?.topCandidates || stats.topCandidates.length === 0) && (
                    <Empty text="Completed candidate results will appear here." />
                  )}
                </Stack>
              </Panel>
              <Panel title="Question Risk" icon={ClipboardList}>
                <Stack>
                  {(stats?.mostFailedQuestions || []).map((item) => (
                    <Row key={item.question} title={item.question} meta={`${item.failRate}% fail rate`} />
                  ))}
                  {(!stats?.mostFailedQuestions || stats.mostFailedQuestions.length === 0) && (
                    <Empty text="No failed-question analytics yet." />
                  )}
                </Stack>
              </Panel>
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <Panel title="Create Login" icon={UserPlus}>
              <form onSubmit={createUser} className="space-y-3">
                <Input value={userForm.name} onChange={(name) => setUserForm((form) => ({ ...form, name }))} placeholder="Name" />
                <Input value={userForm.email} onChange={(email) => setUserForm((form) => ({ ...form, email }))} placeholder="Email" />
                <Input type="password" value={userForm.password} onChange={(password) => setUserForm((form) => ({ ...form, password }))} placeholder="Password" />
                <Select
                  value={userForm.role}
                  onChange={(role) => setUserForm((form) => ({ ...form, role }))}
                  options={[['candidate', 'Candidate'], ['admin', 'Admin / HR']]}
                />
                <button className="mono-button" type="submit">
                  <Plus className="h-4 w-4" /> Add user
                </button>
              </form>
            </Panel>
            <Panel title="All Candidates and Admins" icon={Users}>
              <Stack>
                {users.map((user) => (
                  <Row
                    key={user.id}
                    title={user.name}
                    meta={`${user.email} - ${user.completedInterviews || 0}/${user.interviews || 0} completed`}
                  >
                    <select
                      className="mono-select h-9 w-32"
                      value={user.role}
                      onChange={(event) =>
                        setUsers((items) =>
                          items.map((item) =>
                            item.id === user.id ? { ...item, role: event.target.value } : item
                          )
                        )
                      }
                    >
                      <option value="candidate">Candidate</option>
                      <option value="admin">Admin / HR</option>
                    </select>
                    <IconButton label="Save user" onClick={() => updateUserRole(user)}>
                      <Check className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Delete user" onClick={() => deleteUser(user.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </Row>
                ))}
              </Stack>
            </Panel>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <Panel title="Create Job Role" icon={ClipboardList}>
              <form onSubmit={createJobRole} className="space-y-3">
                <Input
                  value={jobForm.title}
                  onChange={(title) => setJobForm((form) => ({ ...form, title }))}
                  placeholder="Job title"
                />
                <Input
                  value={jobForm.department}
                  onChange={(department) => setJobForm((form) => ({ ...form, department }))}
                  placeholder="Department"
                />
                <textarea
                  value={jobForm.description}
                  onChange={(event) => setJobForm((form) => ({ ...form, description: event.target.value }))}
                  rows={4}
                  placeholder="Role description"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                />
                <Input
                  value={jobForm.skills}
                  onChange={(skills) => setJobForm((form) => ({ ...form, skills }))}
                  placeholder="Skills, comma separated"
                />
                <button className="mono-button" type="submit">
                  <Plus className="h-4 w-4" /> Save role
                </button>
              </form>
            </Panel>
            <Panel title="Role Library" icon={ClipboardList}>
              <Stack>
                {jobRoles.map((role) => (
                  <Row
                    key={role._id}
                    title={role.title}
                    meta={`${role.department || 'General'} - ${(role.skills || []).join(', ') || 'No skills yet'}`}
                  >
                    <select
                      className="mono-select h-9 w-28"
                      value={role.status}
                      onChange={(event) =>
                        setJobRoles((items) =>
                          items.map((item) =>
                            item._id === role._id ? { ...item, status: event.target.value } : item
                          )
                        )
                      }
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                    <IconButton label="Save role" onClick={() => updateJobRole(role)}>
                      <Check className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Delete role" onClick={() => deleteJobRole(role._id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </Row>
                ))}
                {jobRoles.length === 0 && <Empty text="Create job roles to organize interviews and questions." />}
              </Stack>
            </Panel>
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="space-y-6">
            {generatedPin?.pinCode && (
              <div className="os-panel flex flex-wrap items-center justify-between gap-4 border border-indigo-500/40 bg-indigo-500/10 p-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-indigo-300">Candidate PIN</p>
                  <p className="mt-2 font-mono text-4xl font-bold tracking-[0.35em] text-white">
                    {generatedPin.pinCode}
                  </p>
                  <p className="mt-2 text-sm text-white/50">
                    Share with candidate → <a href="/pin" className="text-indigo-300 underline">/pin</a>
                    {generatedPin.pinExpiresAt &&
                      ` · Expires ${new Date(generatedPin.pinExpiresAt).toLocaleString()}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyPin(generatedPin.pinCode)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" /> Copy PIN
                </button>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
              <Panel title="Schedule PIN Interview" icon={KeyRound}>
                <form onSubmit={createPinInterview} className="space-y-3">
                  <Input
                    value={pinForm.title}
                    onChange={(title) => setPinForm((f) => ({ ...f, title }))}
                    placeholder="Interview title"
                  />
                  <Input
                    value={pinForm.jobRole}
                    onChange={(jobRole) => setPinForm((f) => ({ ...f, jobRole }))}
                    placeholder="Job role"
                  />
                  <Input
                    value={pinForm.candidateName}
                    onChange={(candidateName) => setPinForm((f) => ({ ...f, candidateName }))}
                    placeholder="Candidate name"
                  />
                  <Input
                    value={pinForm.candidateEmail}
                    onChange={(candidateEmail) => setPinForm((f) => ({ ...f, candidateEmail }))}
                    placeholder="Candidate email"
                  />
                  <Input value={pinForm.q1} onChange={(q1) => setPinForm((f) => ({ ...f, q1 }))} placeholder="Question 1" />
                  <Input value={pinForm.q2} onChange={(q2) => setPinForm((f) => ({ ...f, q2 }))} placeholder="Question 2" />
                  <Input value={pinForm.q3} onChange={(q3) => setPinForm((f) => ({ ...f, q3 }))} placeholder="Question 3 (optional)" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      value={pinForm.round}
                      onChange={(round) => setPinForm((f) => ({ ...f, round }))}
                      options={[['hr', 'HR'], ['technical', 'Technical'], ['final', 'Final']]}
                    />
                    <Select
                      value={pinForm.pinExpiryHours}
                      onChange={(pinExpiryHours) => setPinForm((f) => ({ ...f, pinExpiryHours }))}
                      options={[
                        ['24', 'PIN expires 24h'],
                        ['48', 'PIN expires 48h'],
                        ['72', 'PIN expires 72h'],
                        ['168', 'PIN expires 7 days'],
                      ]}
                    />
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={pinForm.aiQuestionCount}
                    onChange={(aiQuestionCount) => setPinForm((f) => ({ ...f, aiQuestionCount }))}
                    placeholder="Total questions candidate will face"
                  />
                  <Select
                    value={pinForm.personality}
                    onChange={(personality) => setPinForm((f) => ({ ...f, personality }))}
                    options={[
                      ['friendly_hr', 'Friendly HR'],
                      ['strict_corporate', 'Strict Corporate'],
                      ['senior_engineer', 'Senior Engineer'],
                      ['startup_founder', 'Startup Founder'],
                      ['technical_lead', 'Technical Lead'],
                    ]}
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-white/60">
                    <input
                      type="checkbox"
                      checked={pinForm.includeCoding}
                      onChange={(e) => setPinForm((f) => ({ ...f, includeCoding: e.target.checked }))}
                    />
                    Include coding round
                  </label>
                  <button className="mono-button" type="submit">
                    <Plus className="h-4 w-4" /> Create interview
                  </button>
                </form>
              </Panel>

              <Panel title="PIN Interviews (share code with candidate)" icon={KeyRound}>
                <Stack>
                  {pinInterviews.map((iv) =>
                    editingPinId === iv.id && pinEditDraft ? (
                      <div key={iv.id} className="space-y-3 rounded-xl border border-white/15 bg-black/30 p-4">
                        <p className="text-sm font-semibold text-white">Edit PIN interview</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            value={pinEditDraft.title}
                            onChange={(title) => setPinEditDraft((d) => ({ ...d, title }))}
                            placeholder="Title"
                          />
                          <Input
                            value={pinEditDraft.jobRole}
                            onChange={(jobRole) => setPinEditDraft((d) => ({ ...d, jobRole }))}
                            placeholder="Job role"
                          />
                          <Input
                            value={pinEditDraft.candidateName}
                            onChange={(candidateName) => setPinEditDraft((d) => ({ ...d, candidateName }))}
                            placeholder="Candidate name"
                          />
                          <Input
                            value={pinEditDraft.candidateEmail}
                            onChange={(candidateEmail) => setPinEditDraft((d) => ({ ...d, candidateEmail }))}
                            placeholder="Candidate email"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Select
                            value={pinEditDraft.round}
                            onChange={(round) => setPinEditDraft((d) => ({ ...d, round }))}
                            options={[['hr', 'HR'], ['technical', 'Technical'], ['final', 'Final']]}
                          />
                          <Select
                            value={pinEditDraft.personality}
                            onChange={(personality) => setPinEditDraft((d) => ({ ...d, personality }))}
                            options={[
                              ['friendly_hr', 'Friendly HR'],
                              ['strict_corporate', 'Strict Corporate'],
                              ['senior_engineer', 'Senior Engineer'],
                              ['startup_founder', 'Startup Founder'],
                              ['technical_lead', 'Technical Lead'],
                            ]}
                          />
                        </div>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={pinEditDraft.aiQuestionCount}
                          onChange={(aiQuestionCount) =>
                            setPinEditDraft((d) => ({ ...d, aiQuestionCount }))
                          }
                          placeholder="Total questions candidate will face"
                        />
                        <p className="text-xs text-white/45">Custom questions</p>
                        {pinEditDraft.customQuestions.map((q, idx) => (
                          <Input
                            key={q.id || idx}
                            value={q.questionText}
                            onChange={(questionText) =>
                              setPinEditDraft((d) => ({
                                ...d,
                                customQuestions: d.customQuestions.map((item, i) =>
                                  i === idx ? { ...item, questionText } : item
                                ),
                              }))
                            }
                            placeholder={`Question ${idx + 1}`}
                          />
                        ))}
                        <label className="inline-flex items-center gap-2 text-sm text-white/60">
                          <input
                            type="checkbox"
                            checked={pinEditDraft.includeCoding}
                            onChange={(e) =>
                              setPinEditDraft((d) => ({ ...d, includeCoding: e.target.checked }))
                            }
                          />
                          Include coding round
                        </label>
                        {iv.pinCode && (
                          <p className="text-xs text-indigo-300/80">
                            PIN {iv.pinCode} — unchanged when editing details
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <IconButton
                            label="Cancel"
                            onClick={() => {
                              setEditingPinId('');
                              setPinEditDraft(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Save" onClick={savePinEdit}>
                            <Check className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </div>
                    ) : (
                      <Row
                        key={iv.id}
                        title={iv.title}
                        meta={`${iv.candidateName} · ${iv.candidateEmail} · ${iv.aiQuestionCount || 5} total questions · ${formatLabel(iv.status)} · ${iv.candidateStatus || 'pending'}`}
                      >
                        {iv.pinCode ? (
                          <span className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 font-mono text-lg tracking-widest text-indigo-200">
                            {iv.pinCode}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => generatePin(iv.id)}
                            className="btn-primary inline-flex items-center gap-2 text-sm"
                          >
                            <KeyRound className="h-4 w-4" /> Generate PIN
                          </button>
                        )}
                        {iv.pinCode && (
                          <IconButton label="Copy PIN" onClick={() => copyPin(iv.pinCode)}>
                            <Copy className="h-4 w-4" />
                          </IconButton>
                        )}
                        {canEditPin(iv) && (
                          <IconButton label="Edit interview" onClick={() => startEditPin(iv)}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                        )}
                        {(iv.candidateStatus === 'interview_started' || iv.hasResult) && (
                          <button
                            type="button"
                            onClick={() => viewPinAnswers(iv)}
                            className="btn-secondary inline-flex h-9 items-center px-3 text-xs"
                          >
                            Answers
                          </button>
                        )}
                        {iv.hasResult && (
                          <a
                            href={`/pin-report/${iv.id}`}
                            className="btn-secondary inline-flex h-9 items-center px-3 text-xs"
                          >
                            Report
                          </a>
                        )}
                        <IconButton label="Delete" onClick={() => deletePinInterview(iv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </Row>
                    )
                  )}
                  {pinInterviews.length === 0 && (
                    <Empty text="No PIN interviews yet. Create one, then click Generate PIN." />
                  )}
                </Stack>
              </Panel>
            </div>

            <Panel title="Assigned interviews (account login)" icon={ClipboardList}>
              <p className="mb-4 text-sm text-white/45">
                Candidates who sign in at /login see these under Assigned Interviews. They must upload a resume
                before attending. The first question is your introduction (set when assigning); later questions are
                AI-generated from their resume.
              </p>
              <Stack>
                {interviews.map((interview) => (
                  <Row
                    key={interview.id}
                    title={interview.candidate?.name || 'Candidate'}
                    meta={`${formatLabel(interview.round)} · ${formatLabel(interview.status)} · ${interview.progress}`}
                  >
                    <select
                      className="mono-select h-9 w-28"
                      value={interview.status}
                      onChange={(event) =>
                        setInterviews((items) =>
                          items.map((item) =>
                            item.id === interview.id ? { ...item, status: event.target.value } : item
                          )
                        )
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                    <IconButton label="Save" onClick={() => updateInterview(interview)}>
                      <Check className="h-4 w-4" />
                    </IconButton>
                    {interview.status === 'draft' && (
                      <IconButton label="Publish" onClick={() => publishInterview(interview.id)}>
                        <Send className="h-4 w-4" />
                      </IconButton>
                    )}
                    <IconButton label="Delete" onClick={() => deleteInterview(interview.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </Row>
                ))}
                {interviews.length === 0 && <Empty text="No account-based interviews." />}
              </Stack>
            </Panel>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="grid min-w-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel title="Add Question" icon={Sparkles}>
              <form onSubmit={createQuestion} className="space-y-3">
                <textarea
                  value={questionForm.text}
                  onChange={(event) =>
                    setQuestionForm((form) => ({ ...form, text: event.target.value }))
                  }
                  rows={5}
                  required
                  placeholder="Question the interviewer can ask"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                />
                <Select
                  value={questionForm.jobRoleId}
                  onChange={(jobRoleId) => setQuestionForm((form) => ({ ...form, jobRoleId }))}
                  options={[['', 'Any job role'], ...jobRoles.map((role) => [role._id, role.title])]}
                />
                <Select
                  value={questionForm.candidateId}
                  onChange={(candidateId) => setQuestionForm((form) => ({ ...form, candidateId }))}
                  options={[['', 'Select candidate with PDF'], ...candidates.map((candidate) => [candidate.id, candidate.name])]}
                />
                <Select
                  value={questionForm.interviewId}
                  onChange={(interviewId) => setQuestionForm((form) => ({ ...form, interviewId }))}
                  options={[
                    ['', 'Save to question bank'],
                    ...interviews.map((interview) => [
                      interview.id,
                      `${interview.candidate?.name || 'Candidate'} - ${formatLabel(interview.round)}`,
                    ]),
                  ]}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    value={questionForm.round}
                    onChange={(round) => setQuestionForm((form) => ({ ...form, round }))}
                    options={[['hr', 'HR'], ['aptitude', 'Aptitude'], ['technical', 'Technical'], ['final', 'Final'], ['coding', 'Coding']]}
                  />
                  <Select
                    value={questionForm.difficulty}
                    onChange={(difficulty) => setQuestionForm((form) => ({ ...form, difficulty }))}
                    options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="mono-button" type="submit">
                    <Plus className="h-4 w-4" /> Add question
                  </button>
                  <button type="button" onClick={() => generateQuestion('bank')} className="btn-secondary inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> {busy === 'question-draft' ? 'Generating...' : 'AI draft'}
                  </button>
                  <button type="button" onClick={() => generateQuestion('bank', true)} className="btn-secondary inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> {busy === 'question-save' ? 'Saving...' : 'AI save'}
                  </button>
                </div>
              </form>
            </Panel>
            <Panel title="All Questions" icon={Sparkles}>
              <Stack>
                <div className="grid min-w-0 gap-3 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <Input
                    value={questionSearch}
                    onChange={setQuestionSearch}
                    placeholder="Search questions"
                  />
                  <Select
                    value={questionRoundFilter}
                    onChange={setQuestionRoundFilter}
                    options={[['', 'All rounds'], ['hr', 'HR'], ['aptitude', 'Aptitude'], ['technical', 'Technical'], ['final', 'Final'], ['coding', 'Coding']]}
                  />
                  <Select
                    value={questionSourceFilter}
                    onChange={setQuestionSourceFilter}
                    options={[['', 'All sources'], ['manual', 'Manual'], ['ai', 'AI']]}
                  />
                </div>
                <p className="text-xs text-white/40">
                  Showing {visibleQuestions.length} of {questionBank.length} questions
                </p>
                {visibleQuestions.map((question) => {
                  const editing = editingQuestionId === question._id;
                  const draft = questionDrafts[question._id] || {};
                  return editing ? (
                    <div key={question._id} className="space-y-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                      <textarea
                        value={draft.text}
                        onChange={(event) => updateQuestionDraft(question._id, { text: event.target.value })}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                      />
                      <div className="grid gap-3 md:grid-cols-4">
                        <Select
                          value={draft.jobRoleId}
                          onChange={(jobRoleId) => updateQuestionDraft(question._id, { jobRoleId })}
                          options={[['', 'Any job role'], ...jobRoles.map((role) => [role._id, role.title])]}
                        />
                        <Select
                          value={draft.interviewId}
                          onChange={(interviewId) => updateQuestionDraft(question._id, { interviewId })}
                          options={[
                            ['', 'Question bank'],
                            ...interviews.map((interview) => [
                              interview.id,
                              `${interview.candidate?.name || 'Candidate'} - ${formatLabel(interview.round)}`,
                            ]),
                          ]}
                        />
                        <Select
                          value={draft.round}
                          onChange={(round) => updateQuestionDraft(question._id, { round })}
                          options={[['hr', 'HR'], ['aptitude', 'Aptitude'], ['technical', 'Technical'], ['final', 'Final'], ['coding', 'Coding']]}
                        />
                        <Select
                          value={draft.difficulty}
                          onChange={(difficulty) => updateQuestionDraft(question._id, { difficulty })}
                          options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <IconButton label="Cancel edit" onClick={() => setEditingQuestionId('')}>
                          <X className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Save question" onClick={() => saveQuestion(question._id)}>
                          <Check className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                  ) : (
                    <Row
                      key={question._id}
                      title={question.text}
                      meta={`${formatLabel(question.round)} - ${formatLabel(question.difficulty)} - ${question.source}${question.jobRoleId?.title ? ` - ${question.jobRoleId.title}` : ''}`}
                    >
                      <IconButton label="Edit question" onClick={() => startEditQuestion(question)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Delete question" onClick={() => deleteQuestion(question._id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </Row>
                  );
                })}
                {questionBank.length === 0 && <Empty text="Manual and AI questions will appear here." />}
                {questionBank.length > 0 && visibleQuestions.length === 0 && <Empty text="No questions match those filters." />}
              </Stack>
            </Panel>
          </div>
        )}

        {activeTab === 'reports' && (
          <Panel title="Candidate Reports and Evaluation" icon={FileText}>
            <Stack>
              {reports.map((report) => (
                <Row
                  key={report.id}
                  title={report.candidate?.name || 'Candidate'}
                  meta={`${formatPct(report.overallScore)} - ${formatLabel(report.session?.round || 'interview')}`}
                >
                  <a
                    href={report.pinInterviewId ? `/pin-report/${report.pinInterviewId}` : `/reports/${report.id}`}
                    className="btn-secondary inline-flex h-9 items-center px-3 text-xs"
                  >
                    View
                  </a>
                  <select
                    className="mono-select h-9 w-40"
                    value={report.recommendation || 'needs_improvement'}
                    onChange={(event) => updateReport(report, event.target.value)}
                  >
                    <option value="selected">Selected</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="needs_improvement">Needs work</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <IconButton label="Delete report" onClick={() => deleteReport(report)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </Row>
              ))}
              {reports.length === 0 && <Empty text="Completed interview reports will appear here." />}
            </Stack>
          </Panel>
        )}

        {activeTab === 'settings' && (
          <Panel title="Platform Settings" icon={Settings}>
            <form onSubmit={saveSettings} className="grid gap-4 md:grid-cols-2">
              <Select
                value={settingsForm.defaultLanguage}
                onChange={(defaultLanguage) =>
                  setSettingsForm((form) => ({ ...form, defaultLanguage }))
                }
                options={[['en', 'English'], ['ta', 'Tamil'], ['si', 'Sinhala']]}
              />
              <Input
                type="number"
                value={settingsForm.defaultQuestions}
                onChange={(defaultQuestions) =>
                  setSettingsForm((form) => ({ ...form, defaultQuestions: Number(defaultQuestions) }))
                }
                placeholder="Default question count"
              />
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/60">
                <input
                  type="checkbox"
                  checked={settingsForm.allowCandidateSelfStart}
                  onChange={(event) =>
                    setSettingsForm((form) => ({ ...form, allowCandidateSelfStart: event.target.checked }))
                  }
                />
                Allow candidate self-start interviews
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/60">
                <input
                  type="checkbox"
                  checked={settingsForm.elevenLabsEnabled}
                  onChange={(event) =>
                    setSettingsForm((form) => ({ ...form, elevenLabsEnabled: event.target.checked }))
                  }
                />
                Enable ElevenLabs voice
              </label>
              <button className="mono-button md:col-span-2" type="submit">
                <Check className="h-4 w-4" /> Save settings
              </button>
            </form>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }) {
  return (
    <div className="os-card px-5 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="os-panel min-w-0 overflow-hidden p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <Icon className="h-4 w-4 text-white/80" />
        </span>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Stack({ children }) {
  return <div className="min-w-0 space-y-2">{children}</div>;
}

function Row({ title, meta, children }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="truncate text-xs text-white/40">{meta}</p>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      {...props}
      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mono-select h-11 w-full">
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

function Empty({ text }) {
  return <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/40">{text}</p>;
}

function formatLabel(value) {
  return String(value || '').replace(/_/g, ' ');
}

function formatPct(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return '0%';
  const pct = n > 0 && n <= 10 ? Math.round(n * 10) : Math.round(n);
  return `${pct}%`;
}
