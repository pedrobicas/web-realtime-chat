# Decisões da v2 (desenvolvimento)

1. **Manter Angular existente:** preservar UX e fluxo básico do chat; redesign fica fora desta release.
2. **Repositórios separados:** backend e frontend são independentes, com Compose reproduzível no repositório frontend usando contextos de build de pastas irmãs.
3. **Teste primeiro:** CI verifica build e testes; evitar alterações de framework e bibliotecas de transporte em massa sem cobertura.
4. **Visitantes com token:** o servidor reserva o apelido e valida o token no STOMP CONNECT. Isso não constitui conta permanente nem identidade verificada; privados continuam desligados na prévia.
5. **Roadmap:** modernizar Angular e STOMP em etapas, testar reconexão, histórico e integrações reais antes de deploy público.
