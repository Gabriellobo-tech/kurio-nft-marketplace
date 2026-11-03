# Assets e referências visuais

Referências fornecidas pelo usuário: seis PNGs mobile 414 × 896 e nove PNGs desktop, exportados do Figma em sete arquivos ZIP. O código reconstrói as interfaces com React/CSS; nenhuma tela inteira é utilizada como página ou imagem de fundo da aplicação.

Os arquivos originais individuais dos NFTs e as fontes não estavam incluídos. Foram extraídos somente retângulos das ilustrações presentes nas exportações, preservando seus pixels e gerando WebP local. Nenhum NFT foi recriado por IA.

| Arquivo local | Origem e região em pixels (x, y, largura, altura) |
| --- | --- |
| public/nfts/emerald-card.webp | Desktop/Início.png: 870, 100, 450, 450 |
| public/nfts/emerald-detail.webp | Mesma ilustração de Emerald do início, evitando o ícone de zoom sobreposto à imagem no detalhe |
| public/nfts/sage.webp | Desktop/Carrinho de NFTs.png: 135, 679, 189, 243 |
| public/nfts/violet.webp | Desktop/Carrinho de NFTs.png: 375, 695, 189, 211 |
| public/nfts/ivory.webp | Desktop/Carrinho de NFTs.png: 615, 695, 211, 211 |
| public/nfts/golden.webp | Desktop/Carrinho de NFTs.png: 870, 695, 184, 211 |
| public/nfts/google-mark.webp | Mobile/Login.png: 103, 630, 21, 21 |

## Ajustes e limites

- Os NFTs vêm pela API simulada e usam imagens locais. Cards usam `object-fit: cover`; galeria mantém proporção e raio coerentes com as exportações.
- A ampliação de recortes pequenos pode perder nitidez. Substituí-los pelos arquivos originais é recomendado quando disponíveis.
- Tipografia monoespaçada do sistema (Consolas/SFMono/Liberation Mono), pois não foram fornecidos arquivos de fonte ou tokens tipográficos do Figma.
- Ícones de interface via Lucide e letra da marca Kurio em texto. Símbolos de provedores são indicadores da simulação, sem conexão real a extensões.
- As molduras arredondadas dos frames mobile não são aplicadas ao viewport real do site. As páginas devem ocupar a tela inteira e permitir rolagem.
- Preços, estoque, taxas e quantidades seguem a API; as exportações desktop/mobile têm exemplos numéricos diferentes. A consistência da compra prevalece sobre copiar totais incompatíveis entre telas.
- Login social, newsletter e páginas editoriais não simulam sucesso. Ações fora do escopo informam indisponibilidade ou aparecem como prévias estáticas.
- A estrutura é aproximada às telas fornecidas; não foi feita certificação de fidelidade pixel a pixel. Campos de perfil adicionais foram integrados à API; alguns detalhes de composição das carteiras e do checkout ainda diferem do desenho.
- Arquivos SVG antigos em public/art são mantidos para compatibilidade com snapshots de pedidos criados antes da atualização Kurio.
