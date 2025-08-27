# Frontend - Real Time Chat (Angular)

## Visão Geral

Interface web do sistema de chat em tempo real construída em Angular, integrada ao backend Java Spring Boot via WebSocket (STOMP) e REST.

## Tecnologias Utilizadas

- Angular 18
- TypeScript
- SCSS
- RxJS
- SockJS
- STOMP.js

## Estrutura do Projeto

```
web-realtime-chat/
├── src/
│   ├── app/
│   │   └── components/
│   │       └── chat/
│   │           ├── chat.component.ts         # Lógica do componente
│   │           ├── chat.component.html       # Template
│   │           └── chat.component.scss       # Estilos
│   ├── styles.scss                           # Estilos globais
│   └── styles/variables.scss                 # Variáveis SCSS (cores, temas)
├── proxy.conf.json                           # Proxy para backend
└── angular.json                              # Configuração Angular
```

## Funcionalidades Implementadas

### UI e Experiência
- Tema claro/escuro com CSS variables
- Layout responsivo (desktop e mobile)
- Animações suaves e microinterações
- Lista de usuários online com status
- Notificações integradas

### Chat
- Envio/recebimento de mensagens públicas
- Indicador de digitação
- Histórico de mensagens
- Chat privado integrado (filas de usuário)

## Integração com Backend

### Endpoints WebSocket
- `/ws` (ou `/ws-native`) – conexão principal
- `/topic/public` – mensagens públicas
- `/topic/users` – lista/atualizações de usuários
- `/topic/typing` – indicador de digitação
- `/user/queue/private` – mensagens privadas
- `/user/queue/mention` – menções
- `/user/queue/history` – histórico inicial

### Comandos STOMP
- `/app/chat.addUser` – adicionar usuário
- `/app/chat.send` – enviar mensagem pública
- `/app/chat.typing` – notificar digitação
- `/app/chat.private` – enviar mensagem privada

## API REST Consumida

```
GET  /api/chat/users
GET  /api/chat/users/{username}
GET  /api/chat/users/{username}/status
GET  /api/chat/users/search?query={}
GET  /api/chat/stats
GET  /api/chat/health
GET  /api/chat/private/conversations/{username}
GET  /api/chat/private/conversation/{user1}/{user2}
POST /api/chat/private/mark-read
```

## Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Passos
```bash
# Dentro do diretório do frontend
cd web-realtime-chat

# Instalar dependências
npm install

# Iniciar em desenvolvimento
npm start
```

Frontend: `http://localhost:4200`

## Configuração do Proxy

Arquivo `proxy.conf.json` (exemplo):
```json
{
  "/ws": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "ws": true
  }
}
```

## Scripts Disponíveis

```bash
npm start         # Dev server com proxy
npm run build     # Build de produção
npm run watch     # Build contínuo
npm test          # Testes unitários
```

## Arquitetura (Frontend)

1. Componente `ChatComponent`
   - Gerencia estado de UI e interações
   - Renderiza mensagens, sidebar e input
2. Serviço de WebSocket (via STOMP)
   - Conecta ao backend e gerencia tópicos/filas
   - Trata reconexão e fallback SockJS
3. Estilos e Temas
   - `styles.scss` global e `styles/variables.scss` para tokens de design

## Troubleshooting

### WebSocket não conecta
- Verifique se o backend está em `http://localhost:8080`
- Confirme o proxy `proxy.conf.json`
- Veja erros no console do navegador

### Estilos/tema não aplicam
- Garanta o import em `src/styles.scss`:
```scss
@import './styles/variables.scss';
```

### Portas em uso
- Altere a porta do dev server Angular em `angular.json` ou via CLI (`--port=4201`)

## Licença

Projeto sob licença MIT.

