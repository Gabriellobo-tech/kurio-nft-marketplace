# Arquitetura Kurio

## Limites e fluxo de dados

UI → TanStack Query → Axios → handlers MSW → banco de mocks. O banco e regras simuladas vivem em `src/mocks`; componentes não importam fixtures nem criam respostas falsas. WebSocket é interceptado pelo MSW e codificado pelo adaptador Socket.IO. O cliente usa `socket.io-client`, não callbacks que substituem um socket.

Esta é uma simulação local, sem autenticação de produção, blockchain ou backend compartilhado. O armazenamento local representa o banco do servidor fictício. Não utilizar credenciais pessoais nesse ambiente.

## Conta e isolamento

Duas contas iniciais com salt por usuário e PBKDF2/SHA-256 (100 mil iterações). Contextos seguros usam Web Crypto para derivação nativa; previews HTTP usam o fallback compatível de @noble/hashes, carregado sob demanda. Um teste cruza os dois caminhos com o PBKDF2 do Node para preservar contas já armazenadas. Sessão fictícia tem validade de 30 minutos, persistida no banco simulado. Login incorpora o carrinho visitante com quantidades limitadas ao estoque. Perfil, favoritos, carteiras e pedidos pertencem a um ID de usuário.

Rotas privadas consultam a sessão antes de entrar. A interface reconsulta sessão a cada 15 segundos e trata respostas 401, apresentando retomada do contexto. Logout limpa consultas privadas e subscriptions. Mudança de identidade cancela e remove consultas do usuário anterior. Uma geração de sessão no cliente evita que uma resposta 401 antiga encerre a sessão nova. Handlers com latência verificam se a identidade mudou enquanto aguardavam para evitar mutação na conta nova.

Limitação: a simulação conserva apenas uma sessão ativa por navegador/origin, sem sincronização de banco entre abas. Sessões independentes em diferentes navegadores têm bancos independentes.

## Cache e respostas obsoletas

`staleTime` padrão de 30 segundos. Catálogo chaveado por todos os filtros; detalhe por ID; carrinho, carteiras, favoritos, cotações e pedidos por usuário. AbortSignal passa ao Axios em consultas. Uma tentativa adicional para consultas transitórias/5xx; sem retries automáticos de mutations. Respostas de carrinho substituem o cache confirmado. Favoritos têm atualização otimista, cancelamento da consulta e rollback para o snapshot anterior se a API falhar.

## Dinheiro, cotação e pedidos

ETH trafega como string decimal. BigInt com escala de 18 casas evita erros de ponto flutuante. Quantidades são inteiras. Cupom FORMA10 calcula desconto por divisão inteira em wei. Cotação inclui itens, versões, quantidade, preço, disponibilidade, desconto, taxa, total, identidade e prazo de 2 minutos. Sua impressão determinística detecta alterações relevantes.

A revisão mantém um snapshot. Ao confirmar, o cliente pede nova cotação e compara a impressão: se mudou, exibe o novo resumo e exige outro clique consciente. O POST de pedido verifica novamente a validade da cotação e os recursos da conta. Erro de disponibilidade não cria compra. Uma reserva de estoque é criada junto com o pedido pendente.

Chave de idempotência e corpo são persistidos no cliente antes do envio. No mock, a chave é segmentada por usuário. Mesma chave e conteúdo recuperam o pedido; conteúdo diferente retorna 409. Timeout após criação não descarta a tentativa; o botão de recuperação reutiliza a mesma operação após refresh. Campos de recibo e carteira são copiados para o pedido.

Pedidos `pending` podem transitar a `confirmed` ou `rejected` uma vez. O prazo de processamento é persistido e reavaliado na API após refresh. Na confirmação, somente as quantidades capturadas são subtraídas do carrinho. Na recusa, a reserva volta ao estoque e os itens permanecem. O recibo não depende dos preços posteriores do catálogo.

## Tempo real e reconciliação

Socket.IO usa apenas transporte WebSocket e namespace padrão. Engine.IO handshake e frames de eventos são tratados pelo `@mswjs/socket.io-binding`; o mock mantém heartbeat e libera listeners na desconexão. A importação do cliente ocorre após a ativação do MSW para não capturar um WebSocket nativo anterior à interceptação.

`nft.updated` invalida catálogo, carrinho e cotação e atualiza o detalhe. `order.updated` é filtrado pelo usuário atual e atualiza o pedido. Recurso + versão impedem aplicação de eventos duplicados/antigos, e estados terminais não regridem. A identidade estável do evento também trafega no contrato. Ao conectar/reconectar, consultas ativas são reconciliadas via REST. Pedido pendente tem polling REST de 1,5 segundo como recuperação complementar.

Os controles de demonstração fazem requisições REST para alterar o banco de mocks; os handlers emitem os frames Socket.IO. O React recebe o evento pelo cliente Socket.IO, sem simulação direta de evento via setter ou atualização direta do cache pelo controle.

MSW fixado em 2.12.0 após incompatibilidade observada com a versão mais recente resolvida inicialmente. Rooms, namespaces adicionais, fallback long-polling e backend WebSocket real não são implementados pelos mocks. Revalidar a compatibilidade antes de atualizar dependências.

## UX, assets e desempenho

Rotas de conta, pedido, checkout e laboratório são carregadas sob demanda. Mocks estão em chunk separado. Imagens WebP locais e fontes do sistema permitem execução sem imagens remotas. O visual Kurio foi reconstruído a partir das exportações mobile e desktop fornecidas pelo usuário. Recortes WebP das ilustrações substituem as artes provisórias. Medidas são aproximações por inspeção das imagens; fontes e assets originais não foram fornecidos. Veja ASSETS.md para as regiões extraídas e os desvios conhecidos.

Radix Dialog oferece contenção/restauração de foco e fechamento por Escape. Labels, status ao vivo, foco visível, skeletons e reduced-motion foram incluídos. A suíte funcional passou em desktop e mobile; 390/768/1440 também foram inspecionados manualmente. As notas automatizadas não substituem uma auditoria completa de acessibilidade. A execução CI 41632014730 mediu medianas de desempenho 94/100 (início mobile/desktop) e 95/100 (detalhe mobile/desktop), atendendo às metas configuradas.

## Edições e compatibilidade

O banco de mocks usa schema 5 e migra os dados locais anteriores conservando contas, carrinhos e recibos. Cada edição negociável tem um identificador estável, estoque, preço e versão próprios. Os recursos de catálogo são pais; variações usam parentId e não duplicam o catálogo. GET de detalhe resolve a família completa com as opções atualizadas. Selecionar uma edição navega para seu ID, preservando acesso direto e refresh. Carrinho, reservas e snapshots são calculados pela identidade da edição.

O catálogo possui 18 obras, 9 por página e 54 variações adicionais acessíveis pelo detalhe. Busca, categoria, vista (todos/novos/em alta), ordenação e página compõem a URL. A latência variável de busca é determinística pelo tamanho do termo. Uma falha de conexão é representada por HttpResponse.error na camada MSW; endpoints do laboratório ficam acessíveis para recuperação.

As rotas de favoritos exigem sessão e isolam as consultas por conta; sessão expirada não mantém um ciclo de requests privados. Perfil adiciona nome de usuário, ENS opcional e apelido de carteira, com validação no servidor simulado.

## Ajustes de recuperação e edições

Axios usa o adaptador Fetch para que o limite de resposta seja aplicado também no fallback dos mocks sem Service Worker em preview HTTP. A tentativa fica salva antes do envio; o cancelamento de transporte não desfaz a criação no servidor simulado. Recuperar reenvia corpo e chave originais.

A migração para schema 5 mantém contas, carrinhos, pedidos e IDs antigos, adiciona edições ausentes e limita os registros 1/1 a uma unidade disponível. A seleção de edições elimina rótulos repetidos, priorizando o registro selecionado e depois o registro base. Registros legados continuam acessíveis para recibos e carrinhos persistidos.
