# Roteiro de validação da v2 (desenvolvimento)

## 1. Build automatizado

- Frontend: `npm ci && npm run build && npm test -- --watch=false --browsers=ChromeHeadless`.
- Backend: `mvn verify`.
- O workflow do GitHub Actions deve ficar verde nos **dois** repositórios.

## 2. Integração local

Execute `docker compose up --build` com `java-realtime-chat` e `web-realtime-chat` como pastas irmãs.

1. Abra `http://localhost:8080` em dois navegadores/abas diferentes.
2. Entre com `Ana` e `Bia` e envie uma mensagem de cada lado; confirme entrega nos dois.
3. Tente usar `Ana` novamente numa terceira sessão: deve receber erro de apelido em uso, sem histórico roteado para ela como se fosse a sessão original.
4. Feche a aba de `Ana`: verifique atualização da lista online e mensagem de saída na outra aba.
5. Envie várias mensagens, derrube e reinicie o serviço backend e confirme que o histórico público reaparece.
6. Derrube temporariamente a conexão com o backend e restabeleça: o frontend deve reconectar e registrar o apelido na nova sessão.
7. Verifique `/api/chat/version` e `/api/chat/history?limit=5` via Nginx.
8. Confirme que as conversas privadas continuam desabilitadas.

## 3. Limitações

Os testes Angular em Karma não substituem testes de integração reais entre WebSocket, proxy, Spring Boot e PostgreSQL. A lista acima é manual até que os cenários STOMP sejam automatizados. A aplicação não está preparada para exposição pública.
