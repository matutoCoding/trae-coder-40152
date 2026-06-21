import { Router, type Request, type Response } from 'express'
import { DataStore } from '../store/dataStore.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  const store = DataStore.getInstance()

  const sendEvent = (event: string, data?: unknown): void => {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data ?? {})}\n\n`)
  }

  sendEvent('connected', { message: 'SSE connection established' })

  const unsubQuotaLogs = store.on('quotaLogs:change', (data) => {
    sendEvent('quota:update', data)
  })

  const unsubShippers = store.on('shippers:change', () => {
    sendEvent('quota:update', { type: 'shipperChange' })
  })

  const unsubReservations = store.on('reservations:change', (data) => {
    sendEvent('reservation:update', data)
  })

  const unsubWaitlist = store.on('waitlist:change', (data) => {
    sendEvent('waitlist:update', data)
  })

  const unsubPlatforms = store.on('platforms:change', () => {
    sendEvent('notification', { type: 'platforms:change' })
  })

  const unsubWorkers = store.on('workers:change', () => {
    sendEvent('notification', { type: 'workers:change' })
  })

  const unsubSettings = store.on('settings:change', () => {
    sendEvent('notification', { type: 'settings:change' })
  })

  const heartbeat = setInterval(() => {
    sendEvent('heartbeat', { timestamp: Date.now() })
  }, 30000)

  req.on('close', () => {
    clearInterval(heartbeat)
    unsubQuotaLogs()
    unsubShippers()
    unsubReservations()
    unsubWaitlist()
    unsubPlatforms()
    unsubWorkers()
    unsubSettings()
  })
})

export default router
