import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { hashPassword } from '../src/mocks/password.ts';

test('hash nativo e fallback preservam credenciais PBKDF2 existentes', async () => {
  const password = 'Senha-á🔒';
  const salt = 'salt-fixture-123';
  const expected = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  assert.equal(await hashPassword(password, salt), expected);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', {value: undefined, configurable: true});
    assert.equal(await hashPassword(password, salt), expected);
    assert.notEqual(await hashPassword(password + 'x', salt), expected);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});
