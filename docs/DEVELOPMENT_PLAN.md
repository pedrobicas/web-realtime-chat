# Plano de desenvolvimento — sem aumento descontrolado de escopo

## Milestone atual: 2.0.0-dev.1

**Objetivo**: dois navegadores conversam na sala pública e encontram suas mensagens após reiniciar backend/banco.

### Testes de aceite manuais (a executar)

- [ ] Rodar `docker compose up --build` em ambiente com internet e Docker
- [ ] Abrir `http://localhost:8080` em dois navegadores
- [ ] Entrar com dois nomes diferentes e trocar 5 mensagens
- [ ] Recarregar ambos e confirmar o histórico público
- [ ] Reiniciar o backend e confirmar que as mensagens antigas permanecem
- [ ] Enviar conteúdo HTML e confirmar que é exibido como texto literal
- [ ] Testar texto vazio, tamanho acima de 1000 caracteres e nome repetido
- [ ] Confirmar HTTP 501 nos endpoints privados antigos
- [ ] Executar `mvn test`, `npm test -- --watch=false` e `npm run build`
- [ ] Corrigir qualquer falha encontrada, sem adicionar nova funcionalidade

## Milestone seguinte: 2.0.0-dev.2

1. Tornar estados do cliente WebSocket previsíveis (reconnect, sessão expirada, duplicação de mensagens).
2. Testes de integração do ciclo conectar → enviar → sair → reconectar.
3. Atualizar as dependências com atenção ao risco de regressão.
4. Evitar depender de scripts de CDN no frontend.
5. Extrair subsistemas grandes em unidades menores e cobertas por testes.

## Para a v2.0 pública (futuro, NÃO incluso)

- Autenticação e controle de acesso antes de habilitar mensagens privadas.
- Rate limiting, limites de armazenamento/retenção e política de dados.
- Observabilidade, deploy HTTPS/WSS, hardening do reverse proxy.
- Migrations versionadas (Flyway ou Liquibase), backups, auditoria dos dados.
- Acessibilidade, E2E e matriz de navegadores revisados.

## Regras do projeto

- Não usar prompts do tipo “faça tudo completo”.
- Não abrir funcionalidades fora do milestone ativo.
- Cada mudança precisa responder: o que mudou? por quê? como foi testado?
- Limitar PRs a uma única responsabilidade.
- Encerrar milestones mesmo com ideias futuras na lista de backlog.
