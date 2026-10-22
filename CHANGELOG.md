# Changelog

## 2.0.0-dev.1 — preview local

### Adicionado
- Persistência pública por JDBC, H2 e PostgreSQL
- Leitura do histórico público por REST e STOMP
- Script SQL de criação da tabela
- Docker Compose, Dockerfiles e reverse proxy local
- Identificação visual de prévia e sinalização de conexão
- Testes do repositório de mensagens

### Alterado
- Identidade no envio de mensagens confirmada pelo backend
- Validação de entradas e limite de tamanho
- CORS mais restritivo, configurável por ambiente
- Deduplicação do histórico por ID no cliente
- Exibição segura de texto das mensagens

### Temporariamente desabilitado
- Conversas privadas e endpoints de histórico privado, pendentes de autenticação/autorização

### Próximas etapas
- Validar a execução real em Windows, browser e Docker
- Refatorar o gerenciador de conexão STOMP e testes E2E de reconexão
- Planejar autenticação para chat privado, sem reutilizar identidade baseada em apelido
- Melhorar documentação, versionamento de schemas e métricas
