# Evidências e limites de validação

Atualizado em 03/11/2026. O código de aplicação validado é o commit `e47e61ed3212b39689a11ee17d1c5fc9ede1d6aa`, disponível no [PR #1](https://github.com/Gabriellobo-tech/kurio-nft-marketplace/pull/1).

## Testes funcionais e código

A [execução 41632014730](https://github.com/Gabriellobo-tech/kurio-nft-marketplace/actions/runs/41632014730) aprovou TypeScript, ESLint, oito testes unitários, build e **32 testes Playwright** (16 cenários em desktop/mobile). O ambiente CI instala Chromium no Ubuntu com Node.js 24.

Os cenários cobrem filtros e URL após refresh, quantidades e persistência do carrinho, login e migração do visitante, compra e recibo, favoritos com rollback, cupons, pagamento recusado, Socket.IO, perfil/carteiras e isolamento de usuários, foco/Escape do diálogo, timeout/idempotência, sessão expirada, eventos antigos/reconexão e edições limitadas. A correção do logout preserva o observador ativo da consulta de sessão para que a interface reflita imediatamente a saída.

Os testes unitários cobrem sete cenários de precisão monetária e a equivalência PBKDF2 nativa/fallback com credenciais existentes, incluindo Unicode e senha incorreta. Tipos, lint, testes unitários e build também passaram localmente nesta revisão.

## Lighthouse

A mesma execução realizou **12 auditorias**: três por página e perfil, com imagens e mocks ativos, restaurando o armazenamento em cada medição. Todas as metas foram atingidas pela mediana. A primeira medição não é descartada.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO |
| --- | --- | --- | --- | --- | --- |
| Início | Mobile | 94 | 98 | 100 | 92 |
| Início | Desktop | 100 | 100 | 96 | 92 |
| Detalhe | Mobile | 95 | 100 | 100 | 92 |
| Detalhe | Desktop | 100 | 100 | 100 | 92 |

Metas: performance ≥90, acessibilidade ≥95, boas práticas ≥95 e SEO ≥90. A home mobile teve execuções individuais 86/94/95; portanto, nem toda medição isolada supera 90. Resultados variam com ambiente e carga. Os relatórios HTML/JSON completos estão nos artefatos Lighthouse dessa execução (retenção de 14 dias).

A versão anterior (`8544d8e`) passou nos 32 E2E, mas teve mediana 89 na home mobile. O ajuste usa Web Crypto para derivação PBKDF2 fora da thread da UI quando disponível, mantendo algoritmo, salt e 100 mil iterações; o preview HTTP conserva fallback.

## Referências visuais

Foram geradas e revisadas oito capturas: início, detalhe, carrinho e checkout em desktop/mobile. Elas ficam em `visual/baselines`; a configuração fixa o relógio, desativa animações nas capturas e aguarda imagens decodificadas. O workflow anterior aprovou a geração de candidatos, não uma comparação com referências versionadas. A primeira comparação com essas referências ainda será conferida e registrada.

Essas imagens estabelecem uma referência do aplicativo. Não representam comparação pixel a pixel com o Figma: fontes, medidas e alguns assets diferem; os recortes utilizados são documentados em ASSETS.md. As larguras 390/768/1440 foram inspecionadas manualmente. Notas automatizadas não certificam acessibilidade integral.

## Entrega e limites

O [repositório GitHub](https://github.com/Gabriellobo-tech/kurio-nft-marketplace) está público. O PR de desempenho está separado da branch principal e aguarda integração. O site hospedado de revisão continua privado; a URL externa para recrutadores ainda precisa ser publicada.

A aplicação usa dados e pagamentos fictícios, sem blockchain ou backend compartilhado. A persistência e as sessões ficam limitadas ao navegador/origin, conforme ARCHITECTURE.md. Não inserir dados reais.
