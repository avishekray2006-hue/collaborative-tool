import { useMemo, useState } from 'react'
import './App.css'

type Status = 'Todo' | 'In progress' | 'Done'
type ProjectName = 'Project Northstar' | 'Website refresh' | 'Team rituals'
type Task = { id: number; project: ProjectName; title: string; description: string; status: Status; tag: string; tagTone: string; due: string; assignees: string[]; comments: number }

const initialTasks: Task[] = [
  { id: 1, project: 'Project Northstar', title: 'Map the onboarding journey', description: 'Document the first-time experience and identify the moments that need more context.', status: 'Todo', tag: 'Research', tagTone: 'yellow', due: 'Sep 08', assignees: ['MS', 'JP'], comments: 4 },
  { id: 2, project: 'Project Northstar', title: 'Audit empty states', description: 'Review every empty state in the dashboard and write a useful next action.', status: 'Todo', tag: 'Product', tagTone: 'mint', due: 'Sep 10', assignees: ['AK'], comments: 2 },
  { id: 3, project: 'Project Northstar', title: 'Set up analytics events', description: 'Define the event taxonomy for activation, invitations, and project completion.', status: 'In progress', tag: 'Engineering', tagTone: 'blue', due: 'Sep 06', assignees: ['RN', 'AK'], comments: 7 },
  { id: 4, project: 'Project Northstar', title: 'Share early concepts', description: 'Bring the latest direction to the team for a quick async review.', status: 'In progress', tag: 'Design', tagTone: 'pink', due: 'Today', assignees: ['MS'], comments: 5 },
  { id: 5, project: 'Project Northstar', title: 'Create project template', description: 'A thoughtful starting point for teams who want to move quickly.', status: 'Done', tag: 'Product', tagTone: 'mint', due: 'Sep 02', assignees: ['JP'], comments: 3 },
  { id: 6, project: 'Project Northstar', title: 'Invite pilot teams', description: 'Bring in three small teams and watch how they organize their work.', status: 'Done', tag: 'Research', tagTone: 'yellow', due: 'Sep 01', assignees: ['RN', 'MS'], comments: 8 },
  { id: 7, project: 'Website refresh', title: 'Review homepage direction', description: 'Align on the new visual direction before implementation starts.', status: 'In progress', tag: 'Design', tagTone: 'pink', due: 'Sep 11', assignees: ['MS'], comments: 3 },
  { id: 8, project: 'Website refresh', title: 'Rewrite product copy', description: 'Make the value proposition clearer for first-time visitors.', status: 'Todo', tag: 'Content', tagTone: 'yellow', due: 'Sep 14', assignees: ['JP'], comments: 1 },
  { id: 9, project: 'Team rituals', title: 'Plan weekly retro', description: 'Prepare prompts and collect topics from the team.', status: 'Todo', tag: 'Team', tagTone: 'mint', due: 'Sep 09', assignees: ['AK', 'RN'], comments: 2 },
  { id: 10, project: 'Team rituals', title: 'Share meeting notes', description: 'Capture decisions and follow-ups from the last team sync.', status: 'Done', tag: 'Operations', tagTone: 'blue', due: 'Sep 05', assignees: ['RN'], comments: 4 },
]
const statuses: Status[] = ['Todo', 'In progress', 'Done']
const avatarLetters: Record<string, string> = { MS: 'M', JP: 'J', AK: 'A', RN: 'R' }

function App() {
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedId, setSelectedId] = useState(3)
  const [newTask, setNewTask] = useState('')
  const [comment, setComment] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('Board')
  const [activeProject, setActiveProject] = useState<ProjectName>('Project Northstar')
  const [filter, setFilter] = useState<'All' | Status>('All')
  const [newestFirst, setNewestFirst] = useState(false)
  const [notice, setNotice] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [projectOpen, setProjectOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [utilityOpen, setUtilityOpen] = useState<'settings' | 'help' | null>(null)
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [compactMode, setCompactMode] = useState(false)

  const projectTasks = tasks.filter((task) => task.project === activeProject)
  const selectedTask = projectTasks.find((task) => task.id === selectedId) ?? projectTasks[0]
  const visibleTasks = useMemo(() => tasks.filter((task) => task.project === activeProject)
    .filter((task) => filter === 'All' || task.status === filter)
    .filter((task) => `${task.title} ${task.description} ${task.tag}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => newestFirst ? b.id - a.id : a.id - b.id), [activeProject, filter, newestFirst, search, tasks])
  const counts = statuses.map((status) => projectTasks.filter((task) => task.status === status).length)
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }
  const addTask = () => {
    if (!newTask.trim()) return
    const task: Task = { id: Date.now(), project: activeProject, title: newTask.trim(), description: 'Add a description to help your team understand the next step.', status: 'Todo', tag: 'Product', tagTone: 'mint', due: 'Sep 12', assignees: ['AK'], comments: 0 }
    setTasks((current) => [...current, task]); setSelectedId(task.id); setNewTask(''); flash('Task added')
  }
  const moveTask = (status: Status) => { if (!selectedTask) return; setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, status } : task)); flash(`Moved to ${status}`) }
  const deleteTask = (id: number) => { setTasks((current) => current.filter((task) => task.id !== id)); setSelectedId(tasks.find((task) => task.id !== id)?.id ?? 0); flash('Task deleted') }
  const addComment = () => { if (!comment.trim() || !selectedTask) return; setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, comments: task.comments + 1 } : task)); setComment(''); flash('Comment added') }
  const invite = () => { if (!inviteEmail.trim()) return; const email = inviteEmail.trim(); setInviteEmail(''); setInviteOpen(false); flash(`Invitation sent to ${email}`) }
  const addProject = () => { if (!projectName.trim()) return; const name = projectName.trim(); setProjectName(''); setProjectOpen(false); flash(`${name} created`) }
  const cycleFilter = () => setFilter(filter === 'All' ? 'Todo' : filter === 'Todo' ? 'In progress' : filter === 'In progress' ? 'Done' : 'All')
  const focusNewTask = () => document.getElementById('new-task')?.focus()
  const selectProject = (name: ProjectName) => { setActiveProject(name); setSelectedId(0); setView('Board'); setSearch(''); setFilter('All') }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">*</span><span>orbit</span></div>
      <button className="workspace-switcher" type="button" onClick={() => flash('Northstar workspace selected')}><span className="workspace-dot">N</span><span><b>Northstar</b><small>Workspace</small></span><span className="chevron">v</span></button>
      <nav className="main-nav" aria-label="Main navigation">
        <button className={`nav-item ${view === 'Board' ? 'active' : ''}`} type="button" onClick={() => setView('Board')}><span>#</span>My work <em>{tasks.filter((task) => task.status !== 'Done').length}</em></button>
        <button className={`nav-item ${view === 'Inbox' ? 'active' : ''}`} type="button" onClick={() => { setView('Inbox'); flash('Inbox is clear') }}><span>o</span>Inbox <em>2</em></button>
        <button className={`nav-item ${view === 'Projects' ? 'active' : ''}`} type="button" onClick={() => setView('Projects')}><span>□</span>Projects</button>
      </nav>
      <div className="side-label">Your projects <button type="button" aria-label="Add project" onClick={() => setProjectOpen(true)}>+</button></div>
      <div className="project-list"><button className={`project ${activeProject === 'Project Northstar' ? 'active' : ''}`} type="button" onClick={() => selectProject('Project Northstar')}><i className="project-icon coral">*</i>Project Northstar</button><button className={`project ${activeProject === 'Website refresh' ? 'active' : ''}`} type="button" onClick={() => selectProject('Website refresh')}><i className="project-icon blue">*</i>Website refresh</button><button className={`project ${activeProject === 'Team rituals' ? 'active' : ''}`} type="button" onClick={() => selectProject('Team rituals')}><i className="project-icon yellow">*</i>Team rituals</button></div>
      <div className="sidebar-bottom"><button className="nav-item" type="button" onClick={() => setUtilityOpen('settings')}><span>*</span>Settings</button><button className="nav-item" type="button" onClick={() => setUtilityOpen('help')}><span>?</span>Help center</button><button className="profile" type="button" onClick={() => flash('Signed in as Alex Kim')}><span className="avatar avatar-coral">AK</span><span><b>Alex Kim</b><small>Product lead</small></span><span className="more">...</span></button></div>
    </aside>
    <main className="main-content" id="board">
      <header className="topbar"><div className="breadcrumbs"><span>Projects</span><b>/</b><strong>{activeProject}</strong></div><div className="top-actions"><button className="icon-btn" type="button" aria-label="Search" onClick={() => setSearchOpen((open) => !open)}>?</button><button className="icon-btn notification" type="button" aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}>o<i></i></button><button className="invite-btn" type="button" onClick={() => setInviteOpen(true)}>+ Invite</button></div></header>
      {searchOpen && <div className="search-bar"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." /><button type="button" onClick={() => { setSearch(''); setSearchOpen(false) }}>Close</button></div>}
      {notificationsOpen && <div className="popover"><b>Notifications</b><span>2 updates waiting for your review.</span><button type="button" onClick={() => setNotificationsOpen(false)}>Dismiss</button></div>}
      <section className="project-header"><div><div className="eyebrow">PRODUCT / Q3 2026</div><h1>{activeProject} <span className="status-pill"><i></i> On track</span></h1><p>Make the first mile feel effortless for every new team.</p></div><div className="header-meta"><div className="member-stack"><span className="avatar avatar-coral">AK</span><span className="avatar avatar-blue">RN</span><span className="avatar avatar-yellow">MS</span><b>+4 members</b></div><span className="updated">Updated just now</span></div></section>
      <section className="stats"><div><span>Progress</span><strong>{Math.round((counts[2] / tasks.length) * 100) || 0}%</strong><small>+12%</small></div><div><span>Tasks</span><strong>{tasks.length}</strong><small>{counts[0]} to do</small></div><div><span>Completed</span><strong>{counts[2]}</strong><small>this cycle</small></div><div><span>Due soon</span><strong>{tasks.filter((task) => task.status !== 'Done').length}</strong><small className="warning">needs focus</small></div><div className="progress"><i style={{ width: `${tasks.length ? (counts[2] / tasks.length) * 100 : 0}%` }}></i></div></section>
      <div className="board-toolbar"><div className="view-tabs">{['Board', 'List', 'Timeline'].map((item) => <button className={`tab ${view === item ? 'active' : ''}`} type="button" key={item} onClick={() => { setView(item); if (item !== 'Board') flash(`${item} view selected`) }}>{item}</button>)}</div><div className="toolbar-actions"><button className="filter-btn" type="button" onClick={cycleFilter}>Filter <span>{filter === 'All' ? '0' : '1'}</span></button><button className="sort-btn" type="button" onClick={() => setNewestFirst((value) => !value)}>Sort {newestFirst ? 'newest' : 'oldest'} ^</button></div></div>
      {view === 'Board' ? <div className="kanban-board">{statuses.map((status, index) => <section className="kanban-column" key={status}><div className="column-heading"><i className={`column-dot ${['dot-yellow', 'dot-blue', 'dot-mint'][index]}`}></i><h2>{status}</h2><b>{visibleTasks.filter((task) => task.status === status).length}</b><button type="button" aria-label={`Add task to ${status}`} onClick={focusNewTask}>...</button></div><div className="task-list">{visibleTasks.filter((task) => task.status === status).map((task) => <article className={`task-card ${task.id === selectedId ? 'selected' : ''}`} key={task.id} onClick={() => setSelectedId(task.id)}><div className="task-top"><span className={`tag ${task.tagTone}`}>{task.tag}</span><button type="button" aria-label={`Delete ${task.title}`} onClick={(event) => { event.stopPropagation(); deleteTask(task.id) }}>...</button></div><h3>{task.title}</h3><p>{task.description}</p><div className="task-footer"><span className={task.due === 'Today' ? 'due today' : ''}>{task.due}</span><span className="task-comments">{task.comments} comments</span><span className="mini-avatars">{task.assignees.map((person) => <span className="avatar avatar-ak" key={person}>{avatarLetters[person] ?? person[0]}</span>)}</span></div></article>)}</div>{status === 'Todo' && <button className="add-task" type="button" onClick={focusNewTask}>+ Add task</button>}</section>)}</div> : <div className="empty-view"><h2>{view} view</h2><p>Select Board to return to the task board.</p><button className="invite-btn" type="button" onClick={() => setView('Board')}>Back to board</button></div>}
      <div className="new-task-row"><input id="new-task" value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addTask()} placeholder="What needs to happen next?" /><button type="button" onClick={addTask}>Add task</button></div>
    </main>
    {selectedTask && <aside className="detail-panel"><div className="detail-top"><span>Task details</span><button type="button" aria-label="Close details" onClick={() => setSelectedId(0)}>x</button></div><div className="detail-body"><span className={`tag ${selectedTask.tagTone}`}>{selectedTask.tag}</span><h2>{selectedTask.title}</h2><p className="detail-description">{selectedTask.description}</p><div className="detail-fields"><div><span>Status</span><select className="field-value" value={selectedTask.status} onChange={(event) => moveTask(event.target.value as Status)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div><span>Assignee</span><span className="field-value"><span className="avatar avatar-coral">AK</span> Alex Kim</span></div><div><span>Due date</span><span className="field-value">{selectedTask.due}</span></div></div><div className="detail-divider"></div><div className="activity-heading"><h3>Activity</h3><span>{selectedTask.comments} comments</span></div><div className="activity"><div className="activity-item"><span className="avatar avatar-coral">AK</span><p><b>Alex Kim</b> created this task<small>Today, 9:42 AM</small></p></div><div className="activity-item"><span className="avatar avatar-blue">RN</span><p><b>Ravi N.</b> moved it to {selectedTask.status}<small>Yesterday</small></p></div></div><div className="comment-box"><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment..." /><div><span>Updates the whole team</span><button type="button" onClick={addComment}>Comment</button></div></div><button className="delete-task" type="button" onClick={() => deleteTask(selectedTask.id)}>Delete task</button></div></aside>}
    {notice && <div className="toast" role="status">{notice}</div>}
    {utilityOpen && <div className="modal-backdrop" onClick={() => setUtilityOpen(null)}><div className="modal utility-modal" onClick={(event) => event.stopPropagation()}>{utilityOpen === 'settings' ? <><h2>Workspace settings</h2><p className="modal-copy">Manage how Orbit keeps you informed.</p><label className="setting-row"><span><b>Email updates</b><small>Receive activity summaries from your projects.</small></span><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} /></label><label className="setting-row"><span><b>Compact board</b><small>Show more tasks in each column.</small></span><input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} /></label><div><button type="button" onClick={() => setUtilityOpen(null)}>Done</button></div></> : <><h2>Help center</h2><p className="modal-copy">Need a hand with your workspace?</p><div className="help-list"><button type="button" onClick={() => flash('Open a task and change its status from the details panel')}>How do I move a task?</button><button type="button" onClick={() => flash('Use Invite to send a teammate an invitation')}>How do I invite someone?</button><button type="button" onClick={() => flash('Support request noted for Alex Kim')}>Contact support</button></div><div><button type="button" onClick={() => setUtilityOpen(null)}>Close</button></div></>}</div></div>}
    {inviteOpen && <div className="modal-backdrop" onClick={() => setInviteOpen(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><h2>Invite a teammate</h2><input autoFocus value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && invite()} placeholder="teammate@example.com" /><div><button type="button" onClick={() => setInviteOpen(false)}>Cancel</button><button className="invite-btn" type="button" onClick={invite}>Send invite</button></div></div></div>}
    {projectOpen && <div className="modal-backdrop" onClick={() => setProjectOpen(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><h2>New project</h2><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addProject()} placeholder="Project name" /><div><button type="button" onClick={() => setProjectOpen(false)}>Cancel</button><button className="invite-btn" type="button" onClick={addProject}>Create project</button></div></div></div>}
  </div>
}

export default App
