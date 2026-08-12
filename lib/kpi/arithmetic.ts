const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const MAX_DECIMAL_CHARACTERS = 256;
const MAX_DIVISION_SCALE = 12;

type Decimal = {
  coefficient: bigint;
  scale: number;
};

export class KpiArithmeticError extends Error {
  constructor() {
    super("The KPI decimal input is invalid.");
    this.name = "KpiArithmeticError";
  }
}

function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function parse(value: string): Decimal {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_DECIMAL_CHARACTERS || !DECIMAL_PATTERN.test(value)) {
    throw new KpiArithmeticError();
  }
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const coefficient = BigInt(`${whole}${fraction}`) * (negative ? -1n : 1n);
  return { coefficient, scale: fraction.length };
}

function format(decimal: Decimal): string {
  const negative = decimal.coefficient < 0n;
  const digits = (negative ? -decimal.coefficient : decimal.coefficient).toString().padStart(decimal.scale + 1, "0");
  const whole = decimal.scale === 0 ? digits : digits.slice(0, -decimal.scale);
  const fraction = decimal.scale === 0 ? "" : digits.slice(-decimal.scale).replace(/0+$/, "");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "");
  const unsigned = fraction ? `${normalizedWhole}.${fraction}` : normalizedWhole;
  return negative && unsigned !== "0" ? `-${unsigned}` : unsigned;
}

function align(left: Decimal, right: Decimal): [bigint, bigint, number] {
  const scale = Math.max(left.scale, right.scale);
  return [
    left.coefficient * powerOfTen(scale - left.scale),
    right.coefficient * powerOfTen(scale - right.scale),
    scale,
  ];
}

export function add(left: string, right: string): string {
  const [leftCoefficient, rightCoefficient, scale] = align(parse(left), parse(right));
  return format({ coefficient: leftCoefficient + rightCoefficient, scale });
}

export function subtract(left: string, right: string): string {
  const [leftCoefficient, rightCoefficient, scale] = align(parse(left), parse(right));
  return format({ coefficient: leftCoefficient - rightCoefficient, scale });
}

export function multiply(left: string, right: string): string {
  const leftDecimal = parse(left);
  const rightDecimal = parse(right);
  return format({ coefficient: leftDecimal.coefficient * rightDecimal.coefficient, scale: leftDecimal.scale + rightDecimal.scale });
}

export function compare(left: string, right: string): -1 | 0 | 1 {
  const [leftCoefficient, rightCoefficient] = align(parse(left), parse(right));
  return leftCoefficient === rightCoefficient ? 0 : leftCoefficient < rightCoefficient ? -1 : 1;
}

export function divide(numerator: string, denominator: string, scale = MAX_DIVISION_SCALE): string {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_DIVISION_SCALE) throw new KpiArithmeticError();
  const left = parse(numerator);
  const right = parse(denominator);
  if (right.coefficient === 0n) throw new KpiArithmeticError();

  const negative = (left.coefficient < 0n) !== (right.coefficient < 0n);
  const dividend = (left.coefficient < 0n ? -left.coefficient : left.coefficient) * powerOfTen(scale + right.scale);
  const divisor = (right.coefficient < 0n ? -right.coefficient : right.coefficient) * powerOfTen(left.scale);
  let quotient = dividend / divisor;
  const remainder = dividend % divisor;
  if (remainder * 2n >= divisor) quotient += 1n;
  return format({ coefficient: negative ? -quotient : quotient, scale });
}

export function isValidDecimal(value: unknown): value is string {
  try {
    return typeof value === "string" && (parse(value), true);
  } catch {
    return false;
  }
}
