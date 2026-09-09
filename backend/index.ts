import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

type Status = 'Todo' | 'In progress' | 'Done'
type User = { id: string; name: string; email: string; password: string }
type Project = { id: string; name: string; description: string; memberIds: string[] }
type Task = { id: string; projectId: string; title: string; description: string; status: Status; assigneeId?: string; dueDate?: string }
type Comment = { id: string; taskId: string; authorId: string; body: string; createdAt: string }
type Database = { users: User[]; projects: Project[]; tasks: Task[]; comments: Comment[] }
type AuthRequest = Request & { userId?: string }

const port = Number(process.env.PORT ?? 3001)
const secret = process.env.JWT_SECRET ?? 'local-development-secret'
const databasePath = process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'database.json')
const seedDatabase: Database = {
  users: [],
  projects: [
    { id: 'northstar', name: 'Project Northstar', description: 'Make the first mile feel effortless for every new team.', memberIds: [] },
    { id: 'website-refresh', name: 'Website refresh', description: 'Refresh the website experience for clearer product storytelling.', memberIds: [] },
    { id: 'team-rituals', name: 'Team rituals', description: 'Create lightweight rituals that keep the team aligned.', memberIds: [] },
  ],
  tasks: [
    { id: 'task-1', projectId: 'northstar', title: 'Map the onboarding journey', description: 'Document the first-time experience.', status: 'Todo', dueDate: '2026-09-08' },
    { id: 'task-2', projectId: 'northstar', title: 'Set up analytics events', description: 'Define the event taxonomy for activation.', status: 'In progress', dueDate: '2026-09-06' },
    { id: 'task-3', projectId: 'northstar', title: 'Create project template', description: 'A thoughtful starting point for teams.', status: 'Done', dueDate: '2026-09-02' },
    { id: 'task-4', projectId: 'website-refresh', title: 'Review homepage direction', description: 'Align on the new visual direction before implementation starts.', status: 'In progress', dueDate: '2026-09-11' },
    { id: 'task-5', projectId: 'website-refresh', title: 'Rewrite product copy', description: 'Make the value proposition clearer for first-time visitors.', status: 'Todo', dueDate: '2026-09-14' },
    { id: 'task-6', projectId: 'team-rituals', title: 'Plan weekly retro', description: 'Prepare prompts and collect topics from the team.', status: 'Todo', dueDate: '2026-09-09' },
    { id: 'task-7', projectId: 'team-rituals', title: 'Share meeting notes', description: 'Capture decisions and follow-ups from the last team sync.', status: 'Done', dueDate: '2026-09-05' },
  ],
  comments: [],
}

function loadDatabase(): Database {
  if (!existsSync(databasePath)) {
    mkdirSync(dirname(databasePath), { recursive: true })
    writeFileSync(databasePath, JSON.stringify(seedDatabase, null, 2))
    return structuredClone(seedDatabase)
  }
  try {
    return JSON.parse(readFileSync(databasePath, 'utf8')) as Database
  } catch {
    return structuredClone(seedDatabase)
  }
}

const database = loadDatabase()
const broadcastClients = new Set<import('ws').WebSocket>()

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '1mb' }))

function persist() {
  const temporaryPath = `${databasePath}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(database, null, 2))
  renameSync(temporaryPath, databasePath)
}

function id(prefix: string) { return `${prefix}-${randomUUID()}` }
function text(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function publicUser(user: User) { return { id: user.id, name: user.name, email: user.email } }
function tokenFor(userId: string) { return jwt.sign({ userId }, secret, { expiresIn: '7d' }) }
function sendError(response: Response, status: number, error: string) { return response.status(status).json({ error }) }

function authenticate(request: AuthRequest, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : undefined
  if (!token) return sendError(response, 401, 'Authentication required')
  try {
    const payload = jwt.verify(token, secret) as { userId?: string }
    if (!payload.userId || !database.users.some((user) => user.id === payload.userId)) return sendError(response, 401, 'Invalid token')
    request.userId = payload.userId
    return next()
  } catch { return sendError(response, 401, 'Invalid token') }
}

function findProject(projectId: string) { return database.projects.find((project) => project.id === projectId) }
function findTask(taskId: string) { return database.tasks.find((task) => task.id === taskId) }
function broadcast(event: string, payload: unknown) {
  const message = JSON.stringify({ event, payload })
  broadcastClients.forEach((client) => { if (client.readyState === 1) client.send(message) })
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.get('/api', (_request, response) => response.json({ name: 'Orbit API', version: '1.0.0', status: 'ok' }))
app.get('/', (_request, response) => response.json({
  name: 'Orbit API',
  version: '1.0.0',
  status: 'ok',
  health: '/api/health',
  documentation: 'Use the API endpoints described in README.md.',
}))

app.post('/api/auth/register', async (request, response) => {
  const name = text(request.body?.name)
  const email = text(request.body?.email).toLowerCase()
  const password = text(request.body?.password)
  if (!name || !email || password.length < 8) return sendError(response, 400, 'Name, email, and an 8-character password are required')
  if (database.users.some((user) => user.email === email)) return sendError(response, 409, 'Email already registered')
  const user: User = { id: id('user'), name, email, password: await bcrypt.hash(password, 10) }
  database.users.push(user)
  persist()
  return response.status(201).json({ token: tokenFor(user.id), user: publicUser(user) })
})

app.post('/api/auth/login', async (request, response) => {
  const email = text(request.body?.email).toLowerCase()
  const password = text(request.body?.password)
  const user = database.users.find((candidate) => candidate.email === email)
  if (!user || !(await bcrypt.compare(password, user.password))) return sendError(response, 401, 'Invalid email or password')
  return response.json({ token: tokenFor(user.id), user: publicUser(user) })
})

app.get('/api/auth/me', authenticate, (request: AuthRequest, response) => {
  const user = database.users.find((candidate) => candidate.id === request.userId)
  return user ? response.json(publicUser(user)) : sendError(response, 404, 'User not found')
})

app.get('/api/projects', authenticate, (_request, response) => response.json(database.projects))
app.get('/api/projects/:projectId', authenticate, (request, response) => {
  const project = findProject(String(request.params.projectId))
  return project ? response.json(project) : sendError(response, 404, 'Project not found')
})
app.post('/api/projects', authenticate, (request: AuthRequest, response) => {
  const name = text(request.body?.name)
  if (!name) return sendError(response, 400, 'Project name is required')
  const project: Project = { id: id('project'), name, description: text(request.body?.description), memberIds: [request.userId!] }
  database.projects.push(project)
  persist()
  broadcast('project.created', project)
  return response.status(201).json(project)
})

app.get('/api/projects/:projectId/tasks', authenticate, (request, response) => {
  if (!findProject(String(request.params.projectId))) return sendError(response, 404, 'Project not found')
  return response.json(database.tasks.filter((task) => task.projectId === request.params.projectId))
})
app.post('/api/projects/:projectId/tasks', authenticate, (request, response) => {
  const projectId = String(request.params.projectId)
  if (!findProject(projectId)) return sendError(response, 404, 'Project not found')
  const title = text(request.body?.title)
  const status = request.body?.status ?? 'Todo'
  if (!title) return sendError(response, 400, 'Task title is required')
  if (!['Todo', 'In progress', 'Done'].includes(status)) return sendError(response, 400, 'Invalid task status')
  const task: Task = { id: id('task'), projectId, title, description: text(request.body?.description), status, assigneeId: text(request.body?.assigneeId) || undefined, dueDate: text(request.body?.dueDate) || undefined }
  database.tasks.push(task)
  persist()
  broadcast('task.created', task)
  return response.status(201).json(task)
})

app.patch('/api/tasks/:taskId', authenticate, (request, response) => {
  const task = findTask(String(request.params.taskId))
  if (!task) return sendError(response, 404, 'Task not found')
  const updates = request.body as Partial<Task>
  if (updates.title !== undefined && !text(updates.title)) return sendError(response, 400, 'Task title cannot be empty')
  if (updates.status !== undefined && !['Todo', 'In progress', 'Done'].includes(updates.status)) return sendError(response, 400, 'Invalid task status')
  if (updates.projectId !== undefined && !findProject(updates.projectId)) return sendError(response, 400, 'Project not found')
  Object.assign(task, updates)
  persist()
  broadcast('task.updated', task)
  return response.json(task)
})

app.delete('/api/tasks/:taskId', authenticate, (request, response) => {
  const taskIndex = database.tasks.findIndex((candidate) => candidate.id === request.params.taskId)
  if (taskIndex < 0) return sendError(response, 404, 'Task not found')
  const [task] = database.tasks.splice(taskIndex, 1)
  database.comments = database.comments.filter((comment) => comment.taskId !== task.id)
  persist()
  broadcast('task.deleted', { id: task.id })
  return response.status(204).send()
})

app.get('/api/tasks/:taskId/comments', authenticate, (request, response) => response.json(database.comments.filter((comment) => comment.taskId === request.params.taskId)))
app.post('/api/tasks/:taskId/comments', authenticate, (request: AuthRequest, response) => {
  if (!findTask(String(request.params.taskId))) return sendError(response, 404, 'Task not found')
  const body = text(request.body?.body)
  if (!body) return sendError(response, 400, 'Comment body is required')
  const comment: Comment = { id: id('comment'), taskId: String(request.params.taskId), authorId: request.userId!, body, createdAt: new Date().toISOString() }
  database.comments.push(comment)
  persist()
  broadcast('comment.created', comment)
  return response.status(201).json(comment)
})

app.use((_request, response) => sendError(response, 404, 'Route not found'))

const server = createServer(app)
const websocket = new WebSocketServer({ server, path: '/ws' })
let startupErrorReported = false
function handleServerError(error: NodeJS.ErrnoException) {
  if (error.code === 'EADDRINUSE') {
    if (startupErrorReported) return
    startupErrorReported = true
    console.error(`Orbit API is already running on port ${port}. Use the existing server or choose another PORT.`)
    process.exitCode = 0
    return
  }
  console.error('Orbit API failed to start:', error.message)
  process.exitCode = 1
}
server.on('error', handleServerError)
websocket.on('error', handleServerError)
websocket.on('connection', (client) => {
  broadcastClients.add(client)
  client.send(JSON.stringify({ event: 'connected' }))
  client.on('close', () => broadcastClients.delete(client))
})
server.listen(port, () => console.log(`Orbit API listening on http://localhost:${port}`))
