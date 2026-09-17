# Синхронизация времени между клиентом и сервером

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
apps/mock-server/src/
├── index.ts              # Точка входа, WebSocket-сервер
├── game-engine.ts        # Ядро игры: фазы, таймер, очки
├── types.ts              # Серверные типы
├── handlers/
│   ├── join-handler.ts       # Обработка JOIN_GAME
│   ├── guess-handler.ts      # Обработка SUBMIT_GUESS
│   ├── question-handler.ts   # Обработка ASK_QUESTION + ANSWER_QUESTION
│   ├── admin-handler.ts      # Админские команды (startGame, approveLandmark)
│   └── landmark-handler.ts   # SUBMIT_LANDMARK + модерация
└── utils/
    ├── scoring.ts        # Функция calculateScore
    ├── validation.ts     # Валидация ответов
    └── logger.ts         # Логирование
```
