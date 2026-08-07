# Closed Alpha Deployment

Цель первого деплоя — закрытый frontend-only тест внутри VK. Игровое состояние пока рассчитывается клиентом, а постоянный лом и улучшения временно хранятся в `localStorage`. Это не production-модель и не защита от изменения данных пользователем.

## Control points

DNS, кабинет VK, VDS, reverse proxy и TLS изменяются только после отдельного подтверждения непосредственно перед соответствующим действием. Токены, SSH-ключи, launch-параметры и сертификаты не сохраняются в репозитории.

## 1. VDS audit

Перед установкой контейнера выполнить на сервере и сохранить вывод:

```bash
uptime
free -h
df -h
docker stats --no-stream
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
sudo ss -lntp
```

На предыдущем снимке VDS использовал 99% CPU и 88% RAM. Если это постоянная нагрузка, сначала нужно найти потребителя ресурсов. Frontend-контейнер лёгкий, но reverse proxy и выдача TLS должны работать с запасом.

## 2. VK application

1. Создать новое Mini App в кабинете разработчика VK.
2. Оставить приложение в режиме разработки/тестирования.
3. Сохранить `app_id`; сервисный ключ и пользовательские токены в frontend не добавлять.
4. После появления HTTPS указать для mobile, web и m.vk один адрес: `https://game.dev-cloud-ksa.ru/`.
5. Добавить нужные аккаунты в список тестировщиков и проверить Android, iOS и desktop VK.

Текущий frontend уже вызывает `VKWebAppInit`, применяет safe-area из VK, оформляет системные панели и обрабатывает скрытие/возврат приложения.

## 3. DNS

В зоне `dev-cloud-ksa.ru` добавить запись:

```text
Type: A
Name: game
Value: 94.141.161.148
TTL: 300
```

Перед выпуском сертификата проверить:

```bash
dig +short game.dev-cloud-ksa.ru
```

Ожидаемый ответ: `94.141.161.148`.

## 4. Container

На VDS разместить репозиторий, создать `.env` рядом с `compose.yaml` и задать уникальную версию сборки:

```bash
cp .env.example .env
BUILD_VERSION="alpha-$(git rev-parse --short HEAD)"
sed -i "s/^BUILD_VERSION=.*/BUILD_VERSION=${BUILD_VERSION}/" .env
docker compose build
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:8088/healthz
```

Контейнер слушает только `127.0.0.1:8088`; наружу его публикует существующий reverse proxy. Это исключает обход HTTPS напрямую по IP.

## 5. Reverse proxy and TLS

Сначала определить, чем обслуживаются существующие домены: host Nginx, Traefik, Caddy или отдельный proxy-контейнер. Для host Nginx подготовлен шаблон `deploy/nginx/game.dev-cloud-ksa.ru.conf.example`.

После подключения vhost:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://game.dev-cloud-ksa.ru/
```

TLS выпускать только после успешного DNS и HTTP smoke-test. Команда Certbot зависит от уже установленного на VDS способа управления сертификатами.

## 6. Acceptance

- `https://game.dev-cloud-ksa.ru/healthz` отвечает `200 ok`.
- Главная страница открывается напрямую и внутри VK.
- В настройках видна ожидаемая версия сборки.
- Safe-area корректна на устройстве с вырезом экрана.
- Звук останавливается при сворачивании VK.
- Улучшение сохраняется после перезапуска приложения.
- Полный маршрут заканчивается возвратом в шлюз и эвакуацией.
- В консоли браузера и логах Nginx нет повторяющихся ошибок.

## Rollback

Каждая серверная сборка получает тег `alpha-<git-sha>`. Для отката нужно вернуть проверенный commit/тег в рабочем каталоге, восстановить его `BUILD_VERSION` и повторить `docker compose build && docker compose up -d`.
