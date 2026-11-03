import test from 'node:test';
import assert from 'node:assert/strict';
import {toWei,fromWei,sumEth} from '../src/lib/money.ts';

test('um wei e todos os 18 decimais são preservados',()=>{
  assert.equal(toWei('0.000000000000000001'),1n);
  assert.equal(toWei('1.123456789012345678'),1123456789012345678n);
  assert.equal(fromWei(1123456789012345678n),'1.123456789012345678');
});
test('soma decimal não introduz erro de ponto flutuante',()=>{
  assert.equal(sumEth([{price:'0.1',quantity:1},{price:'0.2',quantity:1}]),'0.3');
  assert.equal(sumEth([{price:'1.19',quantity:2},{price:'0.0042',quantity:1}]),'2.3842');
});
test('valores acima da precisão segura de Number continuam exatos',()=>{
  const amount='9007199254740993.000000000000000001';
  assert.equal(fromWei(toWei(amount)),amount);
});
test('inteiros, zero e zeros finais são normalizados corretamente',()=>{
  for(const [input,expected] of [['0','0'],['0.000','0'],['10.0000','10'],['100','100'],['1.0100','1.01']]){
    assert.equal(fromWei(toWei(input)),expected);
  }
  assert.equal(sumEth([]),'0');
});
test('desconto inteiro de 10% e taxa mantêm o total esperado',()=>{
  const subtotal=toWei('1.19');
  const discount=subtotal*10n/100n;
  assert.equal(fromWei(subtotal-discount+toWei('0.0042')),'1.0752');
});
test('precisão excessiva e representações ambíguas são rejeitadas',()=>{
  for(const invalid of ['','-1','1e3','NaN','Infinity','1,2',' 1','01','.1','1.','1.0000000000000000001']){
    assert.throws(()=>toWei(invalid),RangeError,invalid);
  }
  assert.throws(()=>fromWei(-1n),RangeError);
});
test('quantidades fracionadas, negativas e inseguras são rejeitadas',()=>{
  for(const quantity of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>sumEth([{price:'1',quantity}]),RangeError);
  }
});
