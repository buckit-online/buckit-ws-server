import { WebSocketServer } from 'ws'
import url from 'url'
import dotenv from 'dotenv'
dotenv.config()

const cafeConnections = new Map()

const wss = new WebSocketServer({ port: process.env.WS_PORT })

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  //   console.log('User connected to WebSocket')

  const { query } = url.parse(req.url, true)
  const cafeId = query.cafeId

  if (cafeId) {
    if (!cafeConnections.has(cafeId)) {
      cafeConnections.set(cafeId, new Set())
    }
    cafeConnections.get(cafeId).add(ws)

    ws.send(
      JSON.stringify({
        type: 'connection',
        message: `Connected to cafe ${cafeId}`,
      })
    )
  }

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message)

      if (parsedMessage.type === 'fetchOrders' && parsedMessage.cafeId) {
        updateToCafe(parsedMessage.cafeId, {
          type: 'fetchOrders',
        })
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  })

  ws.on('close', () => {
    if (cafeId && cafeConnections.has(cafeId)) {
      cafeConnections.get(cafeId).delete(ws)

      if (cafeConnections.get(cafeId).size === 0) {
        //remove empyt cafe
        cafeConnections.delete(cafeId)
      }
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  // ping interval to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }))
    } else {
      clearInterval(pingInterval)
    }
  }, 30000)

  ws.on('close', () => {
    clearInterval(pingInterval)
  })
})

const updateToCafe = (cafeId, data) => {
  if (!cafeConnections.has(cafeId)) {
    return
  }

  const connections = cafeConnections.get(cafeId)
  let sentCount = 0

  connections.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(data))
      sentCount++
    }
  })
}

console.log(`WebSocket server is running on port ${process.env.WS_PORT}`)
