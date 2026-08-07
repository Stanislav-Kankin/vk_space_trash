# Architecture

## Phase 1

В `frontend/` находится автономный React-прототип. Zustand временно моделирует игровые состояния и переходы. TanStack Query установлен как граница будущего server state. VK Bridge инициализируется безопасно: локальный запуск продолжает работать, если контейнер VK недоступен.

## Target services

```text
VK Mini App -> Nginx -> FastAPI -> PostgreSQL
VK community -> vkbottle bot -> FastAPI
```

Frontend: React, TypeScript, Vite, VK Bridge, VKUI assets, TanStack Query, Zustand и Motion.

Backend Фазы 2: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL и pytest. Доменный слой будет отвечать за генерацию карты, конечный автомат экспедиции, события, бой, награды и улучшения.

## State authority

Клиент отправляет намерение пользователя вместе с idempotency key и ожидаемой версией экспедиции. Сервер блокирует строку активной экспедиции в транзакции, проверяет допустимость перехода, применяет результат и увеличивает `state_version`. Повторный ключ возвращает ранее сохранённый ответ.

## Authentication

В VK frontend передаёт исходные подписанные параметры запуска на backend. Backend проверяет подпись и свежесть, после чего выдаёт короткую игровую сессию. Локальная авторизация будет доступна только через явный `DEV_AUTH_MODE`, отключённый в production.
