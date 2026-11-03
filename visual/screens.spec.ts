import {test,expect} from '@playwright/test';
for(const screen of ['home','detail','cart','checkout'] as const){
  test(`Kurio ${screen}`,async({page})=>{
    await page.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));
    await page.goto('/nft/nft-1');
    await expect(page.getByRole('button',{name:'Adicionar ao carrinho',exact:true})).toBeEnabled();
    if(screen==='home'){
      await page.goto('/');
      await expect(page.locator('.grid .card')).toHaveCount(9);
    }
    if(screen==='cart'||screen==='checkout'){
      await page.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).click();
      await expect(page.getByText('Obra adicionada ao carrinho.',{exact:true})).toBeVisible();
      await page.goto('/cart');
      await expect(page.locator('.summary .total')).toContainText('1.1942 ETH');
    }
    if(screen==='checkout'){
      await page.goto('/login?redirect=%2Fcheckout');
      await page.getByLabel('E-mail',{exact:true}).fill('gabriel@example.test');
      await page.getByLabel('Senha',{exact:true}).fill('Demo@12345');
      await page.getByRole('button',{name:'Entrar',exact:true}).click();
      await expect(page).toHaveURL(/\/checkout$/);
      await expect(page.locator('.summary .total')).toContainText('1.1942 ETH');
    }
    await expect(page.getByText('● Tempo real conectado',{exact:true})).toBeVisible();
    await page.locator('img').evaluateAll(async(images)=>{
      await Promise.all(images.map(image=>image instanceof HTMLImageElement ? image.decode().catch(()=>undefined) : undefined));
    });
    await expect(page).toHaveScreenshot(`${screen}.png`,{fullPage:true});
  });
}
