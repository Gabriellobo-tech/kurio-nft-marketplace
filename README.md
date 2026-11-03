# Kurio — NFT Marketplace

Implementação em progresso do desafio frontend, adaptada às exportações mobile e desktop Kurio fornecidas pelo usuário. **Ainda não é a entrega final para avaliação:** a suíte completa, regressão visual e auditorias precisam ser concluídas.

## Executar no VS Code

Requisitos: Node.js 22.19 ou superior (ou Node.js 24) e npm. Este projeto usa Vite, não Live Server.

```sh
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite. Os mocks MSW ficam ativos por padrão, inclusive no build de demonstração. Para configurar, copie `.env.example` para `.env.local`. `VITE_ENABLE_MOCKS=false` exige uma API compatível e um servidor Socket.IO no mesmo origin.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npx playwright install chromium
npm run test:e2e
npm run test:e2e:report
```

Em ambiente com preview já iniciado, configure `PLAYWRIGHT_BASE_URL` para executar os testes sem iniciar outro servidor. O relatório HTML fica em `playwright-report`; traces são retidos nas falhas.

## Contas fictícias

| Conta | Senha |
| --- | --- |
| gabriel@example.test | Demo@12345 |
| marina@example.test | Demo@12345 |

Nunca informe dados reais, frases de recuperação ou chaves privadas. Nada é enviado à blockchain e não há cobrança real. Senhas simuladas são persistidas com PBKDF2/SHA-256 e salt, sem texto claro no banco de mocks. As credenciais acima são fixtures públicas de teste.

## Fluxo para experimentar

1. Abra um NFT e adicione ao carrinho ainda como visitante.
2. No carrinho, use o cupom `FORMA10` para desconto de 10%. `EXPIRADO` demonstra erro de expiração; outros códigos demonstram código inválido.
3. Clique em **Continuar para pagamento**. O login preserva o carrinho visitante e retorna ao checkout.
4. Selecione a carteira cadastrada e conecte a carteira **simulada**. Também é possível recusar e desconectar.
5. Revise dados e valores no diálogo e confirme a compra simulada.
6. O pedido passa por processamento e chega à confirmação ou recusa devolvida pelos mocks. Atualizar a página recupera o mesmo pedido. O recibo conserva os valores originais.
7. Acesse **Minha conta** para editar perfil, avatar, senha e até duas carteiras.

## Edições e cenários

O detalhe permite escolher 1/1, 1/10, 1/50 e ABERTA. A escolha muda a rota, preço e disponibilidade via API. O carrinho mantém edições distintas como linhas independentes. A edição única tem limite de uma unidade.

## Cenários e reset

`/demo` contém latência fixa/variável, falha de conexão REST, erro HTTP de catálogo, falha em favoritos, timeout após criação de pedido, resultado confirmado/recusado, prazo de processamento e reset integral do cenário.

O detalhe, carrinho, checkout e pedido têm um bloco expansível **Testar alteração em tempo real**. Ele altera o estado na API simulada, emite eventos com Socket.IO e permite testar preço, indisponibilidade, duplicata, evento antigo e interrupção de conexão. Não atualiza o cache diretamente.

Para timeout idempotente, ative o cenário antes de comprar. Após o timeout, **Recuperar mesma tentativa** reenvia a mesma chave e conteúdo; após refresh, a tentativa continua disponível. Não reinicie o cenário antes da recuperação.

O reset apaga os dados fictícios e restaura as duas contas, catálogo e carteiras iniciais. Persistência é exclusiva deste navegador/origin, não compartilhada com um backend.

## Stack e organização

- React + TypeScript, Vite, Tailwind, botões e diálogo baseados nos padrões shadcn/ui e Radix.
- TanStack Router: rotas, busca na URL e proteção de conta/checkout/pedidos.
- TanStack Query: consultas, mutations, cache por usuário e invalidação. Axios com adaptador Fetch e limite de 8 segundos: todas as chamadas REST.
- MSW 2.12.0 + `@mswjs/socket.io-binding`: REST e WebSocket com `socket.io-client` real, transporte websocket; versão fixada por compatibilidade.
- `src/lib`: contratos, cliente HTTP, dinheiro decimal e utilitários.
- `src/features`: conta, compra, favoritos, sessão e tempo real.
- `src/mocks`: fixtures, banco persistido, regras e handlers de simulação.
- `tests`: cenários E2E Chromium desktop/mobile.

Veja [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), [ASSETS.md](ASSETS.md) e [VALIDATION.md](VALIDATION.md).

## Validação automática no GitHub

O arquivo `.github/workflows/quality.yml` executa tipos, lint, sete testes unitários de precisão monetária, build e Playwright em cada push/PR. Um job separado executa as 12 auditorias Lighthouse contra o build de produção. Os relatórios são anexados à execução na aba Actions por 14 dias. Essa configuração ainda não foi executada no GitHub; sua presença não representa aprovação dos testes ou notas de performance.

`npm test` usa o executor nativo de testes do Node e cobre conversão exata com 18 decimais, valores grandes, desconto, soma e rejeição de quantidades/representações inválidas.

## Auditoria Lighthouse

Use o build otimizado e mantenha o preview aberto em outro terminal:

```sh
npm run build
npm run preview
npm run audit -- http://localhost:4173
```

O script executa três medições de início e detalhe, nos perfis mobile/desktop (12 auditorias), e grava HTML, JSON, ambiente, LCP/CLS/TBT e medianas em `validation/lighthouse`. As imagens e todos os mocks continuam ativos. Use `CHROME_PATH` apenas se o Chrome instalado não for encontrado. O script retorna falha caso encontre erro ou mediana abaixo das metas. Não há resultados medidos incluídos nesta versão.

## GitHub e deploy externo

Extraia o ZIP, abra a pasta no VS Code e execute `npm ci`. Publique os arquivos no seu repositório GitHub. Não envie `node_modules`, `dist` ou senhas pessoais. O lockfile, assets, mocks, testes e configurações devem permanecer no repositório.

- **Vercel:** importar o repositório, preset Vite, build `npm run build`, pasta de saída `dist`. `vercel.json` habilita acesso direto às rotas.
- **Netlify:** mesmo build e saída. `public/_redirects` inclui fallback de SPA.
- **Cloudflare Pages:** usar Vite, build `npm run build`, saída `dist` e fallback de SPA habilitado.
- Os mocks estão ligados por padrão no build; mantenha isso na entrega. Não há backend privado ou API key necessária.
- O site de revisão no ChatGPT continua privado. Ele não substitui a URL pública exigida pelo avaliador.

## Pendências para entrega final

- Refinar medidas, fontes originais e detalhes restantes de composição; os recortes disponíveis não substituem todos os assets originais.
- Executar e ajustar toda a suíte Playwright, incluindo as novas edições e cenários de rede; criar baselines de regressão visual e controles de relógio determinísticos.
- Executar as 12 auditorias Lighthouse, analisar os resultados e corrigir valores abaixo das metas. Lint, tipos e build são verificações distintas das auditorias.
- Revisar integralmente acessibilidade, isolamento de sessão sob concorrência e desconexão enquanto um pedido está pendente (o cenário já foi exercitado manualmente; falta aprovação da suíte).
- Publicar o repositório e a aplicação acessíveis aos avaliadores, mantendo código e build correspondentes.

A implementação já cobre a compra simulada e foi exercitada manualmente, mas não deve ser apresentada como 100% aderente até concluir as pendências.
