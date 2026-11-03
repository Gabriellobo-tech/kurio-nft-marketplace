# Contratos REST e eventos

Todos os endpoints usam `/api`, JSON e Axios. Tipos compartilhados: `src/lib/contracts.ts`. Erros usam `{message: string}`; o contrato admite `fields` para detalhamento futuro. Status: 401 sessão inválida, 403 pedido de outra conta, 404 inexistente, 409 conflito, 422 validação e 503 falha transitória configurável.

| Método e caminho | Entrada | Saída |
| --- | --- | --- |
| GET /session | — | Session: user ou null e expiresAt |
| POST /session | email, password | Session autenticada |
| DELETE /session | — | 204 |
| POST /accounts | name, email, password | Session (201); 409 e-mail existente |
| GET /nfts | q, category, view, sort, page | items, total, pages (9 por página) |
| GET /nfts/:id | — | NFT |
| GET /cart | — | Cart |
| PUT /cart/items/:id | quantity (0 remove) | Cart recalculado |
| PUT /cart/coupon | code (vazio remove) | Cart recalculado |
| GET /favorites | sessão | IDs dos favoritos |
| PUT /favorites/:id | active: boolean | IDs dos favoritos |
| PATCH /profile | name, email, avatar, username?, ens?, walletLabel? | User atualizado |
| PUT /profile/password | currentPassword, newPassword | 204 |
| GET /wallets | sessão | Wallet[] |
| PUT /wallets | id opcional, label, address, network, primary | Wallet[] |
| POST /quotes | sessão e carrinho atual | Quote |
| POST /orders | OrderInput + header Idempotency-Key | Order (201 ou recuperação 200) |
| GET /orders/:id | sessão | Order e recibo original |

NFT contém `id,name,creator,category,price,available,image,version`. Filtros: categorias Arte/3D/Fotografia; sort recent/price-asc/price-desc. O fixture preserva ordem estável em recent. Cart contém items (nft + quantity), coupon, subtotal, discount, networkFee e total.

Quote estende Cart com id, expiresAt e fingerprint. OrderInput contém quoteId, walletId, network e buyer `{name,email}`. Order contém id, userId, status, version, receipt (snapshot Quote), buyer, wallet (snapshot), createdAt, transaction simulada e reason opcional. Datas são timestamps de milissegundos. Valores monetários são strings, quantidades inteiras.

`avatar` aceita data URL PNG/JPEG/WebP de até aproximadamente 400 KB. Carteiras aceitam endereço fictício EVM (`0x` e 40 hexadecimais), rede ethereum/polygon, até duas por usuário e uma principal. Não existe campo de chave privada.

## Socket.IO

Endpoint: mesmo origin, path `/socket.io`, transporte `websocket`, namespace `/`.

Cliente envia `subscribe` com `{userId}`. O mock valida a identidade contra a sessão atual antes de emitir eventos privados.

| Evento recebido | Payload |
| --- | --- |
| nft.updated | `{eventId, resourceId, version, data: NFT}` |
| order.updated | `{eventId, userId, resourceId, version, data: Order}` |

Versões crescem por recurso. Eventos de versão igual/menor são ignorados. `order.updated` também exige o mesmo usuário e não regride confirmed/rejected. Reconexão invalida e consulta recursos ativos via REST.

## Laboratório de mocks

GET/PATCH `/demo/scenario`: `{latency,variableLatency,connectionError,catalogError,favoriteError,timeoutOrder,payment,orderDelay}`. Somente propriedades reconhecidas e limites explícitos são aceitos.

POST `/demo/actions`: `{action,id?}`. Ações: reset, expire, price, soldout, duplicate, old, disconnect. As duas últimas testam evento obsoleto e interrupção/reconexão. Alterações de dados são persistidas antes da emissão do evento correspondente. Endpoints de laboratório pertencem aos mocks e não devem existir em um backend de produção.

## Família de edições

GET /nfts/:id também retorna editions: `{id,label,price,available}[]`, resolvidas do banco atual. IDs como nft-1-one, nft-1-ten e nft-1-open são recursos reais dos mocks, não simples labels visuais. O recurso variante tem parentId e edition. Carrinho e pedidos usam seu ID no contrato existente. As variações não aparecem duplicadas em GET /nfts. A vista new seleciona os seis lançamentos mais novos do fixture; trending seleciona o subconjunto determinístico em alta.
