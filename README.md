# Синхронизация времени

```
Клиент                            Сервер
  │                                 │
  │──── PING { clientTime: 1000 }──→│
  │                                 │ serverTime = 1050
  │←── PONG { serverTime: 1050,     │
  │           clientTime: 1000 }    │
  │                                 │
  │ RTT = сейчас - 1000             │
  │ Реальное время ≈ 1050 + RTT/2   │
```

```
pingInterval (setInterval каждые 5с)
  └──→ messageSent({ type: 'PING', ... })
        └──→ sample(filter: $isConnected)
              └──→ sendMessageFx (берёт ws из $ws)
                    └──→ ws.send(JSON.stringify(pingMessage))
                          └──→ Сервер получает PING
                                └──→ Сервер отвечает TIME_SYNC
                                      └──→ rawMessageReceived
                                            └──→ timeSyncReceived
```

# Архитектура сервера

```
