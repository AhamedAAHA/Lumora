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
} from 'lucide-react';
import api from '../lib/api';
import AppShell from '../layouts/AppShell';

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
      const [overview, userRes, interviewRes, reportRes, roleRes, questionRes, settingsRes] = await Promise.all([
        api.get('/analytics/admin'),
        api.get('/admin/users'),
        api.get('/admin/interviews'),
        api.get('/admin/reports'),
        api.get('/admin/job-roles'),
        api.get('/admin/questions'),
        api.get('/admin/settings'),
      ]);
      setStats(overview.data);
      setUsers(userRes.data);
      setInterviews(interviewRes.data);
      setReports(reportRes.data);
      setJobRoles(roleRes.data);
      setQuestionBank(questionRes.data);
      const appSetting = settingsRes.data.find((item) => item.key === 'app');
      if (appSetting?.value) setSettingsForm({ ...defaultSettings, ...appSetting.value });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
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

  const createInterview = (event) => {
    event.preventDefault();
    run(interviewForm.publish ? 'Interview published' : 'Interview saved as draft', async () => {
      await api.post('/admin/interviews', {
        ...interviewForm,
        totalQuestions: Number(interviewForm.totalQuestions),
      });
      setInterviewForm(emptyInterview);
    });
  };

  const publishInterview = (id) =>
    run('Interview published', () => api.patch(`/admin/interviews/${id}`, { publish: true }));

  const updateInterview = (interview) =>
    run('Interview updated', () => api.patch(`/admin/interviews/${interview.id}`, { status: interview.status }));

  const deleteInterview = (id) =>
    run('Interview deleted', () => api.delete(`/admin/interviews/${id}`));

  const updateReport = (report, recommendation) =>
    run('Report updated', () => api.patch(`/admin/reports/${report.id}`, { recommendation }));

  const deleteReport = (id) => run('Report deleted', () => api.delete(`/admin/reports/${id}`));

  const saveSettings = (event) => {
    event.preventDefault();
    run('Settings saved', () => api.put('/admin/settings/app', { value: settingsForm }));
  };

  return (
    <AppShell title="Admin Dashboard" subtitle="Manage interviews, candidates, reports, and publishing.">
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
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Candidates" value={stats?.totalCandidates ?? candidates.length} />
              <Metric label="Interviews" value={interviews.length} />
              <Metric label="Completed" value={stats?.totalInterviews ?? 0} />
              <Metric label="Success" value={`${stats?.successRate ?? 0}%`} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Top Candidates" icon={Users}>
                <Stack>
                  {(stats?.topCandidates || []).map((candidate) => (
                    <Row key={candidate.name} title={candidate.name} meta={`${candidate.score}% average`} />
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
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <Panel title="Create Interview" icon={ClipboardList}>
              <form onSubmit={createInterview} className="space-y-3">
                <Select
                  value={interviewForm.candidateId}
                  onChange={(candidateId) => setInterviewForm((form) => ({ ...form, candidateId }))}
                  options={[['', 'Select candidate'], ...candidates.map((candidate) => [candidate.id, candidate.name])]}
                />
                <Select
                  value={interviewForm.jobRoleId}
                  onChange={(jobRoleId) => setInterviewForm((form) => ({ ...form, jobRoleId }))}
                  options={[['', 'Select job role'], ...jobRoles.map((role) => [role._id, role.title])]}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    value={interviewForm.round}
                    onChange={(round) => setInterviewForm((form) => ({ ...form, round }))}
                    options={[['hr', 'HR'], ['aptitude', 'Aptitude'], ['technical', 'Technical'], ['final', 'Final']]}
                  />
                  <Input
                    type="number"
                    value={interviewForm.totalQuestions}
                    onChange={(totalQuestions) => setInterviewForm((form) => ({ ...form, totalQuestions }))}
                    placeholder="Questions"
                  />
                </div>
                <Select
                  value={interviewForm.personality}
                  onChange={(personality) => setInterviewForm((form) => ({ ...form, personality }))}
                  options={[
                    ['friendly_hr', 'Friendly HR'],
                    ['strict_corporate', 'Strict Corporate'],
                    ['senior_engineer', 'Senior Engineer'],
                    ['startup_founder', 'Startup Founder'],
                    ['technical_lead', 'Technical Lead'],
                  ]}
                />
                <textarea
                  value={interviewForm.currentQuestion}
                  onChange={(event) =>
                    setInterviewForm((form) => ({ ...form, currentQuestion: event.target.value }))
                  }
                  rows={4}
                  placeholder="Add the first question manually, or generate it with AI."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => generateQuestion('interview')} className="btn-secondary inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> {busy === 'question' ? 'Generating...' : 'Generate AI question'}
                  </button>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
                    <input
                      type="checkbox"
                      checked={interviewForm.includeCoding}
                      onChange={(event) => setInterviewForm((form) => ({ ...form, includeCoding: event.target.checked }))}
                    />
                    Coding round
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
                    <input
                      type="checkbox"
                      checked={interviewForm.publish}
                      onChange={(event) => setInterviewForm((form) => ({ ...form, publish: event.target.checked }))}
                    />
                    Publish now
                  </label>
                </div>
                <button className="mono-button" type="submit">
                  <Send className="h-4 w-4" /> Save interview
                </button>
              </form>
            </Panel>
            <Panel title="All Interviews" icon={ClipboardList}>
              <Stack>
                {interviews.map((interview) => (
                  <Row
                    key={interview.id}
                    title={interview.candidate?.name || 'Candidate'}
                    meta={`${formatLabel(interview.round)} - ${formatLabel(interview.status)} - ${interview.progress}`}
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
                      <option value="archived">Archived</option>
                    </select>
                    <IconButton label="Save interview" onClick={() => updateInterview(interview)}>
                      <Check className="h-4 w-4" />
                    </IconButton>
                    {interview.status === 'draft' && (
                      <IconButton label="Publish interview" onClick={() => publishInterview(interview.id)}>
                        <Send className="h-4 w-4" />
                      </IconButton>
                    )}
                    <IconButton label="Delete interview" onClick={() => deleteInterview(interview.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </Row>
                ))}
                {interviews.length === 0 && <Empty text="No interviews created yet." />}
              </Stack>
            </Panel>
          </div>
        )}

        {activeTab === 'questions' && (
          <Panel title="All Questions" icon={Sparkles}>
            <div className="grid min-w-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
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
            </div>
          </Panel>
        )}

        {activeTab === 'reports' && (
          <Panel title="Candidate Reports and Evaluation" icon={FileText}>
            <Stack>
              {reports.map((report) => (
                <Row
                  key={report.id}
                  title={report.candidate?.name || 'Candidate'}
                  meta={`${report.overallScore ?? 0}% - ${formatLabel(report.session?.round || 'interview')}`}
                >
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
                  <IconButton label="Delete report" onClick={() => deleteReport(report.id)}>
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

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
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
