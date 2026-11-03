import { test, expect } from "@playwright/test";
test("filtros e busca sobrevivem ao refresh", async ({ page }) => {
  await page.goto("/");
  if (test.info().project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir filtros" }).click();
    await page.getByLabel("Categoria mobile").selectOption("Arte");
    await page.getByRole("button", { name: "Ver resultados" }).click();
  } else {
    await page.getByLabel("Filtrar categoria").selectOption("Arte");
  }
  await page.getByLabel("Buscar NFTs").fill("Emerald Ape");
  await expect(page.locator(".grid .card")).toHaveCount(1);
  await expect(page).toHaveURL(/category=Arte/);
  await page.reload();
  await expect(page.getByLabel("Buscar NFTs")).toHaveValue("Emerald Ape");
  await expect(page.locator(".grid .card")).toHaveCount(1);
});
test("detalhe, carrinho, quantidade e persistência", async ({ page }) => {
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(
    page.getByText("Obra adicionada ao carrinho.", { exact: true }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".summary .total")).toContainText("1.1942 ETH");
  await page.getByRole("button", { name: "Aumentar Emerald Ape #042" }).click();
  await expect(page.locator(".summary .total")).toContainText("2.3842 ETH");
  await page.reload();
  await expect(page.locator(".summary .total")).toContainText("2.3842 ETH");
  await page.getByRole("button", { name: "Remover Emerald Ape #042" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua coleção começa aqui" }),
  ).toBeVisible();
});
test("NFT inexistente e busca vazia", async ({ page }) => {
  await page.goto("/nft/inexistente");
  await expect(page.getByText("NFT não encontrado.")).toBeVisible();
  await page.goto("/?q=naoexiste");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
});
async function login(
  page: import("@playwright/test").Page,
  redirect = "/checkout",
  email = "gabriel@example.test",
) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Demo@12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === redirect);
}
async function addOne(page: import("@playwright/test").Page) {
  await page.goto("/nft/nft-1");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByText("Obra adicionada ao carrinho.", { exact: true }),
  ).toBeVisible();
}
async function checkoutReview(page: import("@playwright/test").Page) {
  await page.goto("/checkout");
  await page
    .getByRole("button", { name: "Conectar carteira simulada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
test("login preserva carrinho visitante e compra chega ao recibo confirmado", async ({
  page,
}) => {
  await addOne(page);
  await login(page);
  await checkoutReview(page);
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(
    page.getByRole("heading", { name: "Sua coleção ganhou uma nova obra." }),
  ).toBeVisible({ timeout: 12000 });
  await expect(page.locator(".summary .total")).toContainText("1.1942 ETH");
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(
    page.getByText("Compra confirmada pela API simulada."),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sua coleção começa aqui" }),
  ).toBeVisible();
});
test("favorito otimista desfaz alteração em falha e recupera", async ({
  page,
}) => {
  await login(page, "/nft/nft-1");
  await page.goto("/demo");
  await page.getByLabel("Falha ao salvar favorito").check();
  await expect(page.getByText("Cenário atualizado.", {exact:true})).toBeVisible();
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: "Favoritar", exact: true }).click();
  await expect(
    page.getByText("Falha simulada ao salvar favorito. Tente novamente."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Favoritar", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.goto("/demo");
  await page.getByLabel("Falha ao salvar favorito").uncheck();
  await expect(page.getByText("Cenário atualizado.", {exact:true})).toBeVisible();
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: "Favoritar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Favorito salvo.", {exact:true})).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toBeVisible();
});
test("cupom válido, inválido e expirado", async ({ page }) => {
  await addOne(page);
  await page.goto("/cart");
  await page.getByLabel("Cupom de desconto").fill("FORMA10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.locator(".summary .total")).toContainText("1.0752 ETH");
  await page.getByLabel("Cupom de desconto").fill("EXPIRADO");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("Este cupom expirou.")).toBeVisible();
  await page.getByLabel("Cupom de desconto").fill("INVALIDO");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("Cupom inválido.")).toBeVisible();
});
test("pagamento recusado preserva carrinho", async ({ page }) => {
  await addOne(page);
  await login(page);
  await page.goto("/demo");
  await page.getByLabel("Resultado do pagamento").selectOption("rejected");
  await checkoutReview(page);
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "O pagamento foi recusado." }),
  ).toBeVisible({ timeout: 12000 });
  await page
    .getByRole("link", { name: "Voltar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
});
test("Socket.IO altera preço do carrinho e duplicata não reaplica preço", async ({
  page,
}) => {
  await addOne(page);
  await page.goto("/cart");
  await expect(
    page.getByText("● Tempo real conectado", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Testar alteração em tempo real (simulação)", { exact: true })
    .click();
  await page.getByRole("button", { name: "Aumentar preço em 0,1 ETH" }).click();
  await expect(page.locator(".summary .total")).toContainText("1.2942 ETH");
  await page.getByRole("button", { name: "Reenviar evento duplicado" }).click();
  await expect(page.locator(".summary .total")).toContainText("1.2942 ETH");
});
test("perfil e carteira persistem e troca de usuário isola dados", async ({
  page,
}) => {
  await login(page, "/profile");
  await page.getByLabel("Nome", { exact: true }).fill("Gabriel Atualizado");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(
    "Gabriel Atualizado",
  );
  await page.getByRole("link", { name: "Carteiras", exact: true }).click();
  await page.getByLabel("Nome da carteira").fill("Carteira Polygon");
  await page
    .getByLabel("Endereço", { exact: true })
    .fill("0x2222222222222222222222222222222222222222");
  await page.getByLabel("Rede", { exact: true }).selectOption("polygon");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(
    page.getByRole("heading", { name: "Carteira Polygon" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Entre para continuar" }),
  ).toBeVisible();
  await login(page, "/wallets", "marina@example.test");
  await expect(
    page.getByRole("heading", { name: "Carteira Polygon" }),
  ).toHaveCount(0);
});
test("diálogo mantém foco e Escape retorna ao fluxo", async ({ page }) => {
  await addOne(page);
  await login(page);
  await checkoutReview(page);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeVisible();
});

test("timeout após criar recupera a mesma chave e o mesmo pedido", async ({
  page,
}) => {
  test.setTimeout(45000);
  await addOne(page);
  await login(page);
  await page.goto("/demo");
  await page.getByLabel("Timeout após criar pedido").check();
  await expect(page.getByText("Cenário atualizado.", {exact:true})).toBeVisible();
  await checkoutReview(page);
  let firstKey: string | undefined;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/orders") && request.method() === "POST") {
      const key = request.headers()["idempotency-key"];
      if (!firstKey) firstKey = key;
      else expect(key).toBe(firstKey);
    }
  });
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("button", { name: "Recuperar mesma tentativa" }),
  ).toBeVisible({ timeout: 15000 });
  await page.reload();
  await page.getByRole("button", { name: "Recuperar mesma tentativa" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  const createdId = page.url();
  await expect(
    page.getByRole("heading", { name: "Sua coleção ganhou uma nova obra." }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(createdId);
  expect(firstKey).toBeTruthy();
});

test("sessão expirada preserva contexto e login permite retomada", async ({
  page,
}) => {
  await addOne(page);
  await login(page);
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Expirar sessão", exact: true })
    .click();
  await expect(page.getByText("Ação executada na camada de mocks.", {exact:true})).toBeVisible();

  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/);
  await page.getByLabel("E-mail", { exact: true }).fill("gabriel@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo@12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".summary .total")).toContainText("1.1942 ETH");
});

test("evento antigo e reconexão preservam pedido e recibo", async ({
  page,
}) => {
  await addOne(page);
  await login(page);
  await checkoutReview(page);
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua coleção ganhou uma nova obra." }),
  ).toBeVisible({ timeout: 12000 });
  const url = page.url();
  await page
    .getByText("Testar alteração em tempo real (simulação)", { exact: true })
    .click();
  await page.getByRole("button", { name: "Aumentar preço em 0,1 ETH" }).click();
  await expect(page.locator(".summary .total")).toContainText("1.1942 ETH");
  await page.getByRole("button", { name: "Emitir evento antigo" }).click();
  await page
    .getByRole("button", { name: "Interromper conexão simulada" })
    .click();
  await expect(
    page.getByText("● Tempo real conectado", { exact: true }),
  ).toBeVisible({ timeout: 12000 });
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.locator(".summary .total")).toContainText("1.1942 ETH");
});

test("seleção de edição mantém preço, estoque e carrinho independentes", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: "Edição 1/1", exact: true }).click();
  await expect(page).toHaveURL(/nft-1-one/);
  await expect(
    page.getByRole("button", { name: "Aumentar quantidade", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByText("Obra adicionada ao carrinho.", { exact: true }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-row-info")).toContainText("Edição: 1/1");
  await expect(page.locator(".summary .total")).toContainText("2.3842 ETH");
  await page.reload();
  await expect(page.locator(".summary .total")).toContainText("2.3842 ETH");
});

test("pedido pendente sobrevive à queda de socket e refresh", async ({ page }) => {
  test.setTimeout(45000);
  await addOne(page);
  await login(page);
  await page.goto("/demo");
  await page.getByLabel("Tempo de processamento").selectOption("20000");
  await expect(page.getByText("Cenário atualizado.", {exact:true})).toBeVisible();
  await checkoutReview(page);
  await page.getByRole("button", {name:"Confirmar compra simulada"}).click();
  await expect(page.getByRole("heading", {name:"Seu pedido está em processamento."})).toBeVisible();
  const orderUrl = page.url();
  await page.getByText("Testar alteração em tempo real (simulação)",{exact:true}).click();
  await page.getByRole("button",{name:"Interromper conexão simulada"}).click();
  await expect(page.getByText("Conexão interrompida. Os pedidos continuam sendo consultados pela API.")).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(orderUrl);
  await expect(page.getByRole("heading",{name:"Sua coleção ganhou uma nova obra."})).toBeVisible({timeout:25000});
  await expect(page.locator(".summary .total")).toContainText("1.1942 ETH");
});

test("edição única de outra obra tem limite e opções sem repetição",async({page})=>{
  await page.goto('/nft/nft-5');
  for (const label of ['1/1','1/10','1/50','ABERTA']) {
    await expect(page.getByRole('button',{name:`Edição ${label}`,exact:true})).toHaveCount(1);
  }
  await expect(page.getByRole('button',{name:'Aumentar quantidade',exact:true})).toBeDisabled();
});
