# Real Time Chat

Um aplicativo de chat em tempo real desenvolvido com Angular e integrado com um backend Java Spring Boot usando WebSocket.

## 🚀 Funcionalidades

- **Chat em tempo real** com WebSocket
- **Interface moderna e responsiva** com tema claro/escuro
- **Lista de usuários online** em tempo real
- **Indicador de digitação** quando alguém está escrevendo
- **Notificações** para eventos importantes
- **Design responsivo** para mobile e desktop
- **Auto-reconexão** em caso de perda de conexão

## 🛠️ Tecnologias Utilizadas

### Frontend (Angular)
- **Angular 18** - Framework principal
- **TypeScript** - Linguagem de programação
- **SCSS** - Pré-processador CSS
- **RxJS** - Programação reativa
- **SockJS** - Cliente WebSocket
- **STOMP.js** - Protocolo de mensagens

### Backend (Java Spring Boot)
- **Spring Boot** - Framework Java
- **Spring WebSocket** - Suporte a WebSocket
- **STOMP** - Protocolo de mensagens
- **SockJS** - Fallback para WebSocket

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn
- Java 17 ou superior (para o backend)
- Maven (para o backend)

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd java-realtime-chat
```

### 2. Configure o Backend (Java)
```bash
# Navegue para o diretório do backend
cd java-realtime-chat

# Compile e execute o projeto Spring Boot
./mvnw spring-boot:run
```

O backend estará disponível em: `http://localhost:8080`

### 3. Configure o Frontend (Angular)
```bash
# Navegue para o diretório do frontend
cd web-realtime-chat

# Instale as dependências
npm install

# Execute o servidor de desenvolvimento
npm start
```

O frontend estará disponível em: `http://localhost:4200`

## 🔧 Configuração do Proxy

O projeto está configurado com um proxy que redireciona as requisições WebSocket para o backend Java:

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

## 🎨 Interface do Usuário

### Tela de Boas-vindas
- Formulário para inserir nome de usuário
- Validação de entrada (apenas letras, números, _ e -)
- Máximo de 30 caracteres

### Chat Principal
- **Header**: Logo, status de conexão, toggle de tema, botão de usuários (mobile)
- **Sidebar**: Lista de usuários online com status e indicador de digitação
- **Área de mensagens**: Chat com bolhas de mensagem, timestamps e avatares
- **Área de input**: Campo de texto com seletor de emojis e botão de envio

### Recursos da Interface
- **Tema claro/escuro** - Toggle no header
- **Responsivo** - Sidebar colapsável em mobile
- **Animações suaves** - Transições e efeitos visuais
- **Notificações** - Sistema de alertas para eventos
- **Scroll automático** - Botão para ir ao final do chat

## 🔌 Integração com Backend

### Endpoints WebSocket
- `/ws` - Conexão WebSocket principal
- `/topic/public` - Mensagens públicas
- `/topic/users` - Atualizações de usuários
- `/topic/typing` - Indicador de digitação
- `/user/queue/private` - Mensagens privadas
- `/user/queue/mention` - Menções
- `/user/queue/history` - Histórico de mensagens

### Comandos STOMP
- `/app/chat.addUser` - Adicionar usuário
- `/app/chat.send` - Enviar mensagem
- `/app/chat.typing` - Indicar digitação

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm start          # Inicia o servidor de desenvolvimento
npm run build      # Compila para produção
npm run watch      # Compila e observa mudanças

# Testes
npm test           # Executa os testes unitários
```

## 📱 Responsividade

O chat é totalmente responsivo e funciona em:
- **Desktop** - Layout completo com sidebar fixa
- **Tablet** - Layout adaptativo
- **Mobile** - Sidebar colapsável com overlay

## 🎯 Funcionalidades Avançadas

### Sistema de Notificações
- **Sucesso** - Conexão estabelecida
- **Erro** - Problemas de conexão
- **Aviso** - Validações de formulário
- **Info** - Menções e eventos

### Indicador de Digitação
- Mostra quando outros usuários estão digitando
- Auto-ocultação após 3 segundos
- Suporte a múltiplos usuários

### Seletor de Emojis
- 16 emojis populares
- Inserção direta no campo de texto
- Interface intuitiva

## 🔒 Segurança

- Validação de entrada no frontend
- Sanitização de mensagens
- Proteção contra XSS
- Validação de nomes de usuário

## 🐛 Solução de Problemas

### Problemas de Conexão
1. Verifique se o backend está rodando em `localhost:8080`
2. Confirme se o proxy está configurado corretamente
3. Verifique os logs do console do navegador

### Problemas de Compilação
1. Limpe o cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules && npm install`
3. Verifique a versão do Node.js

## 📄 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte ou dúvidas, abra uma issue no repositório.
