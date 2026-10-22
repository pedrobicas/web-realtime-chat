# Decisões de arquitetura (versão de desenvolvimento)

**ADR-001 — Evolução incremental, sem refazer a interface**
- As telas Angular e o protocolo STOMP atuais foram preservados.
- A v2 começa corrigindo persistência e segurança, não por um redesign genérico.

**ADR-002 — Persistência só da sala pública neste marco**
- `PublicMessageRepository` possui operação `save` e consulta `recent`.
- A ordem é definida por sequência no banco; o histórico retorna um lote de até 100 mensagens.
- H2 em arquivo permite desenvolvimento sem infraestrutura; PostgreSQL em Compose permite integração mais próxima da produção.
- Escrita antes da publicação: se falhar a gravação, a mensagem não é anunciada como recebida na sala.

**ADR-003 — Não tentar dar segurança de conta a apelidos temporários**
- Principal no handshake está associado ao apelido; o backend impede que o corpo de uma mensagem pública o substitua.
- Isso NÃO constitui autenticação confiável.
- Conversas privadas e históricos privados ficam fora de serviço até existir identidade e autorização reais.

**ADR-004 — O cliente renderiza mensagens como texto**
- Evita interpretar HTML fornecido por outros usuários e reduz risco de conteúdo indesejado no DOM.

**ADR-005 — Escopo da prévia e validação**
- Nenhuma promessa de readiness de produção nem de testes compilados: verificar em máquina com dependências e corrigir antes do próximo milestone.
