# Changelog

## 2.0.0-dev.2 — quality / reproducible setup
- Corrigida a expectativa de título nos testes Angular.
- Ao reconectar, registra o apelido novamente na nova sessão STOMP (o histórico anterior não suprime o JOIN).
- GitHub Actions executa build e testes unitários no Chrome Headless.
- A UI mostra a versão de prévia correta (`dev.2`).
- `compose.yaml` na raiz deste repositório integra o frontend ao backend irmão e ao PostgreSQL.
- Documentação independente de arquivos externos; versão de prévia atualizada.
- Permanece em Angular 18 e STOMP legado até migração validada.

## 2.0.0-dev.1
- Interface de desenvolvimento, histórico público e mensagem como texto; chat privado desabilitado.
