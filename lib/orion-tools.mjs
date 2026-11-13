export function calculateSafely(source) {
  if (typeof source !== "string" || source.length > 160) {
    throw new Error("Expression is too long or invalid.");
  }

  const tokens = [];
  const pattern = /\\s*(\\d+(?:\\.\\d+)?|\\.\\d+|[()+\\-*/%^])/gy;
  let position = 0;

  while (position < source.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(source);
    if (!match) throw new Error("Only basic arithmetic characters are allowed.");
    tokens.push(match[1]);
    position = pattern.lastIndex;
    if (tokens.length > 80) throw new Error("Expression has too many parts.");
  }

  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];

  function primary() {
    const token = take();
    if (token === "(") {
      const value = expression();
      if (take() !== ")") throw new Error("Missing closing parenthesis.");
      return value;
    }
    if (token === undefined || !/^\\d+(?:\\.\\d+)?$|^\\.\\d+$/.test(token)) {
      throw new Error("Expected a number.");
    }
    return Number(token);
  }

  function unary() {
    if (peek() === "+") { take(); return unary(); }
    if (peek() === "-") { take(); return -unary(); }
    return primary();
  }

  function power() {
    const left = unary();
    if (peek() === "^") {
      take();
      return left ** power();
    }
    return left;
  }

  function term() {
    let value = power();
    while (["*", "/", "%"].includes(peek())) {
      const operator = take();
      const right = power();
      if ((operator === "/" || operator === "%") && right === 0) {
        throw new Error("Division by zero is not allowed.");
      }
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  }

  function expression() {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  if (!tokens.length) throw new Error("Expression is empty.");
  const result = expression();
  if (index !== tokens.length || !Number.isFinite(result)) {
    throw new Error("Expression is invalid or result is outside the supported range.");
  }
  return { expression: source, result };
}
