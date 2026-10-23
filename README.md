# Realtime Chat v2 — Angular

Frontend Angular para a [API Spring Boot](https://github.com/pedrobicas/java-realtime-chat). Branch de desenvolvimento: `develop/v2`.

**Versão:** `2.0.0-dev.2` (prévia de desenvolvimento, não pronta para deploy público).

## Execução local sem Docker

Requisitos: **Node.js 22+**, npm e backend iniciado em `http://localhost:8081`.

```sh
npm ci
npm start
```

Abra `http://localhost:4200`. O arquivo `proxy.conf.json` encaminha `/ws` e `/api` para o backend. O chat público funciona com apelido temporário; não há autenticação.

## Execução conjunta com Docker Compose

Clone os **dois** repositórios no mesmo diretório, com os nomes abaixo:

```text
projects/
├── java-realtime-chat/  # Spring Boot
└── web-realtime-chat/   # Angular + compose.yaml
```

Na pasta `web-realtime-chat`:

```sh
docker compose up --build
```

Acesse `http://localhost:8080`. Os serviços são: Angular/Nginx, Spring Boot e PostgreSQL com volume persistente. Não é necessário baixar outro workspace ou copiar arquivos para uma terceira pasta.

Para desligar, use `docker compose down`. **Não use `docker compose down -v` se quiser preservar o banco**.

## Testes e build

```sh
npm ci
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

No CI, o Google Chrome é fornecido pelo runner `ubuntu-latest`; o workflow compila **e** roda os testes, diferente da prévia anterior.

## Limitações desta prévia

- Sem contas, autenticação, autorização para mensagens privadas ou proteção contra abuso.
- O cliente STOMP legado ainda depende de scripts carregados por CDN. Migração para pacote mantido é etapa futura que exige atualização do lockfile e testes de WebSocket.
- Ainda em Angular 18. Atualização progressiva para versões suportadas será feita em outra etapa com validação de testes a cada major.

Ver [CHANGELOG](CHANGELOG.md) e [decisões](docs/DECISIONS.md).
