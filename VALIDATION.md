# Evidências e limites de validação

Atualizado em 03/11/2026. Ambiente: Linux, Node.js 24, preview Vite e Chrome remoto.

## Verificação do código

TypeScript da aplicação e da suíte, ESLint, build de produção e descoberta dos testes são verificados antes da publicação. Sete testes unitários de dinheiro passaram com o executor nativo do Node: precisão de 18 decimais, soma exata, valores grandes, normalização, desconto/taxa e entradas inválidas. Esses comandos não substituem a execução dos fluxos no navegador.

## Revisão manual

- Catálogo inspecionado em larguras de 390, 768 e 1440 px. Detalhe e login também revisados em mobile. Layout derivado das exportações desktop/mobile fornecidas; imagens recortadas conforme ASSETS.md.
- Adição como visitante, proteção do checkout, login fictício, migração do carrinho visitante e retorno ao checkout observados na interface.
- Na versão Kurio, compra simulada de Emerald Ape com total de 1.1942 ETH confirmada pela API; revisão em diálogo, recibo e estado confirmado observados.
- Na versão anterior do mesmo fluxo funcional, evento Socket.IO de preço atualizou o resumo, duplicata não alterou novamente o valor, refresh preservou ID e valores do recibo e alteração posterior do catálogo não mudou o recibo. Interrupção simulada seguida de reconexão foi observada. A edição simples do nome do perfil também foi confirmada.
- Seleção da edição 1/1 observada: preço 2.38 ETH, aumento de quantidade desabilitado, item independente no carrinho e total 2.3842 ETH. Os novos campos nome de usuário, ENS e apelido foram salvos com confirmação pela API e permaneceram após refresh. Violet Nomad também foi inspecionado: quatro rótulos de edição distintos e limite de uma unidade na edição 1/1. A regressão completa permanece pendente.

## Recuperação exercitada em 03/11

- O adaptador XHR no preview HTTP não interrompeu a resposta atrasada do mock. Após trocar para o adaptador Fetch do Axios, o mesmo cenário expôs “Recuperar mesma tentativa”. Refresh manteve a tentativa, recuperação retornou pedido confirmado `40102371-e8ef-4bef-a985-1f172cb42516`, total 1.1942 ETH. A igualdade da chave deve ser verificada pela suíte; a revisão manual não capturou os cabeçalhos.
- Pedido `9caf6b96-f748-49e9-8d55-6ae0daf24f8c` foi observado pendente, com total 1.6942 ETH; interrupção do socket mostrou aviso de desconexão e consulta REST ativa. A conexão voltou e o mesmo pedido passou a confirmado, mantendo total e dados do recibo.
- Opções do laboratório agora refletem a alteração imediatamente e restauram o estado anterior em falha de gravação.

## Playwright

A suíte possui 16 cenários em dois projetos (32 testes): catálogo/URL, carrinho, compra, favoritos/rollback, cupons, rejeição, realtime, perfil/carteiras/isolamento, foco do diálogo, timeout/idempotência, sessão expirada, evento antigo/reconexão e edição limitada, unicidade das opções e interrupção enquanto pendente.

**A suíte não está aprovada por execução.** O download oficial do Chromium retornou um arquivo incompleto. Um executável alternativo de Chromium iniciou, mas o acesso ao preview gerenciado falhou em `page.goto` com `net::ERR_EMPTY_RESPONSE`. A execução parou após três falhas de infraestrutura, antes das verificações de interface. A descoberta com `--list` verifica apenas parsing/configuração.

Em ambiente local ou CI com Chromium instalado: `npx playwright install chromium` e `npm run test:e2e`. Corrigir eventuais falhas antes da entrega. Baselines de regressão visual ainda não foram produzidas. Interrupção durante pedido pendente foi exercitada manualmente; a aprovação automatizada permanece pendente.

## Lighthouse e fidelidade

O comando `npm run audit -- http://localhost:4173` está preparado para três execuções por página (home/detalhe) e perfil (mobile/desktop), salvando HTML, JSON, medianas e LCP/CLS/TBT em `validation/lighthouse`. Nenhuma auditoria foi medida neste ambiente; não há notas ou metas comprovadas.

As exportações permitiram aproximar o visual. A integração Figma recusou acesso técnico com a permissão de visualização atual. Não foi feita comparação automatizada pixel a pixel; fontes e alguns detalhes diferem. Não há certificação completa de acessibilidade.

## Entrega externa

O link hospedado de revisão permanece privado para o proprietário. Repositório público no GitHub, deploy público para recrutadores e relatórios finais de execução ainda precisam ser concluídos. O README explica como rodar, publicar e reproduzir os cenários.

## CI preparada

O workflow `.github/workflows/quality.yml` instala Chromium no Ubuntu, executa a suíte e disponibiliza relatórios Playwright. Outro job mede Lighthouse contra `vite preview` de produção. Esses jobs ainda não foram executados: precisam do código em um repositório GitHub com Actions habilitado. Não substituem baselines visuais versionadas, ainda pendentes.
