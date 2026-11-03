const scale = 10n ** 18n;
const decimalEth = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;

/** Parse a non-negative decimal amount without passing through Number. */
export function toWei(value: string): bigint {
  if (!decimalEth.test(value)) {
    throw new RangeError("ETH deve ser um decimal positivo com até 18 casas.");
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * scale + BigInt(fraction.padEnd(18, "0"));
}
export function fromWei(value: bigint): string {
  if (value < 0n) throw new RangeError("O valor em wei não pode ser negativo.");
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
export function sumEth(lines: { price: string; quantity: number }[]): string {
  return fromWei(
    lines.reduce((sum, line) => {
      if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) {
        throw new RangeError("A quantidade deve ser um inteiro não negativo seguro.");
      }
      return sum + toWei(line.price) * BigInt(line.quantity);
    }, 0n),
  );
}
export function formatEth(value: string): string {
  return value;
}
