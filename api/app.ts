import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import platformsRoutes from './routes/platforms.js'
import reservationsRoutes from './routes/reservations.js'
import waitlistRoutes from './routes/waitlist.js'
import quotaRoutes from './routes/quota.js'
import workersRoutes from './routes/workers.js'
import settingsRoutes from './routes/settings.js'
import eventsRoutes from './routes/events.js'
import quotaAdjustmentsRoutes from './routes/quota-adjustments.js'
import operationLogsRoutes from './routes/operation-logs.js'
import { DataStore } from './store/dataStore.js'
import { LockManager } from './services/LockManager.js'
import { QuotaService } from './services/QuotaService.js'
import { WaitlistService } from './services/WaitlistService.js'
import { TimeoutScheduler } from './services/TimeoutScheduler.js'
import { OperationLogService } from './services/OperationLogService.js'
import { QuotaApprovalService } from './services/QuotaApprovalService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const dataStore = DataStore.getInstance()
const lockManager = new LockManager()
const quotaService = new QuotaService(dataStore, lockManager)
const waitlistService = new WaitlistService(dataStore, quotaService)
const timeoutScheduler = TimeoutScheduler.getInstance(dataStore, quotaService, waitlistService)
const operationLogService = new OperationLogService(dataStore)
const quotaApprovalService = new QuotaApprovalService(dataStore, quotaService)

app.locals.services = {
  dataStore,
  lockManager,
  quotaService,
  waitlistService,
  timeoutScheduler,
  operationLogService,
  quotaApprovalService,
}

app.use('/api/auth', authRoutes)
app.use('/api/platforms', platformsRoutes)
app.use('/api/reservations', reservationsRoutes)
app.use('/api/waitlist', waitlistRoutes)
app.use('/api/quota', quotaRoutes)
app.use('/api/workers', workersRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/quota-adjustments', quotaAdjustmentsRoutes)
app.use('/api/operation-logs', operationLogsRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    message: error.message || 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API not found',
  })
})

setImmediate(() => {
  timeoutScheduler.start()
  console.log('[app] TimeoutScheduler started')
})

export default app
