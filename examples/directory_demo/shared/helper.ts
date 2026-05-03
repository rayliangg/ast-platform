/** Base string transform used by helpers. */
abstract class StringTransform {
  abstract apply(value: string): string;
}

class UpperCaseTransform extends StringTransform {
  apply(value: string): string {
    return value.toUpperCase();
  }
}

const upper = new UpperCaseTransform();

export function helper(value: string): string {
  return upper.apply(value);
}
