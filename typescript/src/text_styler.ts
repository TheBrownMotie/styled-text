export enum ConsumptionStyle {
  REPLACE = "REPLACE",
  OUTSIDE = "OUTSIDE",
  INSIDE = "INSIDE",
}

export enum InnerStyle {
  ALLOW = "ALLOW",
  DISALLOW_DIRECT = "DISALLOW_DIRECT",
  DISALLOW_ANCESTOR = "DISALLOW_ANCESTOR",
}

function htmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function htmlTag(
  tag: string,
  attributes?: Record<string, string>,
  autoCloseEmpty = true,
): (children: (string | any)[]) => string {
  const attrs = attributes
    ? Object.entries(attributes)
        .map(([k, v]) => ` ${k}='${v}'`)
        .join("")
    : "";
  const start = `${tag}${attrs}`;

  return (children: (string | any)[]) => {
    const inner = children.join("");
    if (autoCloseEmpty && !inner) {
      return `<${start} />`;
    }
    return `<${start}>${inner}</${tag}>`;
  };
}

export class TextStylerRegexRule<T> {
  constructor(
    public regex: RegExp,
    public transform: (match: RegExpMatchArray) => T,
  ) {}
}

export class TextStylerRule<T> {
  public start: string;
  public transform: (children: (T | string)[]) => T;
  public end: string | null;
  public consume_start: ConsumptionStyle;
  public consume_end: ConsumptionStyle;
  public allow_inner: InnerStyle;

  constructor(
    start: string,
    transform: (children: (T | string)[]) => T,
    options?: {
      end?: string | null;
      consume_start?: ConsumptionStyle;
      consume_end?: ConsumptionStyle;
      allow_inner?: InnerStyle;
    },
  ) {
    this.start = start;
    this.transform = transform;
    this.end = options?.end ?? null;
    this.consume_start = options?.consume_start ?? ConsumptionStyle.REPLACE;
    this.consume_end = options?.consume_end ?? ConsumptionStyle.REPLACE;
    this.allow_inner = options?.allow_inner ?? InnerStyle.ALLOW;
  }

  get_end(): string {
    return htmlEscape(this.end || this.start);
  }

  get_start(): string {
    return htmlEscape(this.start);
  }

  get_wrappers(): [string, string, string, string] {
    let outer_prefix = "",
      inner_prefix = "",
      inner_suffix = "",
      outer_suffix = "";

    if (this.consume_start === ConsumptionStyle.INSIDE) {
      outer_prefix = this.get_end();
    }
    if (this.consume_start === ConsumptionStyle.OUTSIDE) {
      inner_prefix = this.get_start();
    }

    if (this.consume_end === ConsumptionStyle.INSIDE) {
      outer_suffix = this.get_end();
    }
    if (this.consume_end === ConsumptionStyle.OUTSIDE) {
      inner_suffix = this.get_end();
    }

    return [outer_prefix, inner_prefix, inner_suffix, outer_suffix];
  }
}

export type RuleType<T> = TextStylerRule<T> | TextStylerRegexRule<T>;

export type Action<T> =
  | { type: "TEXT"; text: string }
  | { type: "PUSH"; rule: TextStylerRule<T> }
  | { type: "POP" }
  | { type: "REGEX"; rule: TextStylerRegexRule<T>; match: RegExpMatchArray };

type NextMatch<T> =
  | { type: "STYLE"; rule: TextStylerRule<T>; position: number; is_start: boolean; is_end: boolean }
  | { type: "REGEX"; rule: TextStylerRegexRule<T>; position: number; match: RegExpMatchArray };

export class Path<T> {
  constructor(
    public readonly actions: Action<T>[] = [],
    public readonly stack: TextStylerRule<T>[] = [],
    public readonly num_skips: number = 0,
  ) {}

  get num_pushes(): number {
    return this.actions.filter((a) => a.type === "PUSH" || a.type === "REGEX").length;
  }

  peek(): TextStylerRule<T> | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  copy_and_push(action: Action<T>, extra_skip: number = 0): Path<T> {
    const new_actions = [...this.actions];
    if (action.type !== "TEXT" || action.text !== "") {
      new_actions.push(action);
    }

    let new_stack = this.stack;
    if (action.type === "PUSH") {
      new_stack = [...this.stack, action.rule];
    } else if (action.type === "POP") {
      new_stack = this.stack.slice(0, -1);
    }

    return new Path(new_actions, new_stack, this.num_skips + extra_skip);
  }
}

export class TextStyler<T> {
  public rule: RuleType<T>[];
  private min_skips: number | null = null;

  constructor(rule: RuleType<T>[]) {
    this.rule = rule;
  }

  public processText(text: string, multiline: boolean = false): (T | string)[] {
    this.min_skips = null;
    if (multiline) {
      return this._process_text(text);
    }

    const texts = text.match(/.*?\n|.+/g) || [];
    return texts.flatMap((t) => this._process_text(t));
  }

  private _process_text(text: string): (T | string)[] {
    if (text === "") {
      return [];
    }
    text = htmlEscape(text);

    const paths = this._helper(text, 0, new Path<T>());

    // Tie-break: lowest skips first, then fewest pushes
    const best_path = paths.reduce((best, curr) => {
      if (curr.num_skips < best.num_skips) {
        return curr;
      }
      if (curr.num_skips > best.num_skips) {
        return best;
      }
      return curr.num_pushes < best.num_pushes ? curr : best;
    });

    const ast = new SyntaxTree<T>();
    for (const action of best_path.actions) {
      if (action.type === "TEXT") {
        ast.push_str(action.text);
      } else if (action.type === "PUSH") {
        ast.push(action.rule);
      } else if (action.type === "POP") {
        ast.pop();
      } else if (action.type === "REGEX") {
        ast.push_regex(action.rule, action.match);
      }
    }
    return ast.render();
  }

  private _helper(text: string, start: number, path: Path<T>): Path<T>[] {
    if (this.min_skips !== null && path.num_skips > this.min_skips) {
      return [];
    }
    if (text === "") {
      return [new Path<T>()];
    }

    const nexts = this._find_next(text, start);

    if (start >= text.length || nexts.length === 0) {
      if (path.stack.length > 0) {
        return [];
      }
      this.min_skips = Math.min(this.min_skips ?? path.num_skips, path.num_skips);
      return [path.copy_and_push({ type: "TEXT", text: text.slice(start) })];
    }

    const paths: Path<T>[] = [];
    for (const next of nexts) {
      let new_start = next.position;
      let new_path = path.copy_and_push({ type: "TEXT", text: text.slice(start, new_start) });

      if (next.type === "REGEX") {
        new_start += next.match[0].length;
        new_path = new_path.copy_and_push({ type: "REGEX", rule: next.rule, match: next.match });
      } else {
        new_start += next.is_start ? next.rule.get_start().length : next.rule.get_end().length;
        if (next.is_end && path.stack.length > 0 && path.peek() === next.rule) {
          new_path = new_path.copy_and_push({ type: "POP" });
        } else if (next.is_start) {
          new_path = new_path.copy_and_push({ type: "PUSH", rule: next.rule });
        }
      }
      paths.push(...this._helper(text, new_start, new_path));
    }

    // Fallback branch
    const new_start = nexts[nexts.length - 1].position + 1;
    const new_path = path.copy_and_push({ type: "TEXT", text: text.slice(start, new_start) }, 1);
    paths.push(...this._helper(text, new_start, new_path));

    return paths;
  }

  private _find_next(text: string, start: number): NextMatch<T>[] {
    const nexts: NextMatch<T>[] = [];
    let is_escaped = false;

    for (let index = start; index < text.length; index++) {
      for (const marking of this.rule) {
        if (marking instanceof TextStylerRegexRule) {
          const match = text.slice(index).match(marking.regex);
          if (match && match.index === 0) {
            nexts.push({ type: "REGEX", rule: marking, position: index, match });
          }
        } else if (!is_escaped) {
          const is_start = text.startsWith(marking.get_start(), index);
          const is_end = text.startsWith(marking.get_end(), index);
          if (is_start || is_end) {
            nexts.push({ type: "STYLE", rule: marking, position: index, is_start, is_end });
          }
        }
      }

      is_escaped = text[index] === "\\" && !is_escaped;
      if (nexts.length > 0) {
        return nexts;
      }
    }
    return [];
  }
}

export class SyntaxTree<T> {
  public children: (SyntaxTreeNode<T> | string)[] = [];
  public curr: SyntaxTreeNode<T> | null = null;

  push(rule: TextStylerRule<T>) {
    const new_node = new SyntaxTreeNode<T>(this.curr, rule);
    this._push(new_node);
    this.curr = new_node;
  }

  push_regex(rule: TextStylerRegexRule<T>, match: RegExpMatchArray) {
    const new_node = new SyntaxTreeNode<T>(this.curr, rule, match);
    this._push(new_node);
  }

  push_str(text: string) {
    if (text) {
      this._push(text.replace(/\\(.)/gs, "$1"));
    }
  }

  private _push(node: SyntaxTreeNode<T> | string) {
    if (this.curr === null) {
      this.children.push(node);
    } else {
      this.curr.push(node);
    }
  }

  pop() {
    if (this.curr === null) {
      throw new Error("Attempted to pop() when already at root");
    }
    this.curr = this.curr.parent;
  }

  render(): (T | string)[] {
    return this.children.flatMap((child) => (typeof child === "string" ? [child] : child.render()));
  }
}

export class SyntaxTreeNode<T> {
  public children: (string | SyntaxTreeNode<T>)[] = [];
  public path: TextStylerRule<T>[] = [];

  constructor(
    public parent: SyntaxTreeNode<T> | null,
    public rule: RuleType<T>,
    public match: RegExpMatchArray | null = null,
  ) {
    if (parent !== null && parent.rule instanceof TextStylerRule) {
      this.path = [...parent.path, parent.rule];
    }
  }

  push(child: string | SyntaxTreeNode<T>) {
    this.children.push(child);
  }

  render(): (T | string)[] {
    if (this.rule instanceof TextStylerRule) {
      const rule = this.rule;
      const inner: (T | string)[] = this.children.flatMap((child) =>
        typeof child === "string" ? [child] : child.render(),
      );

      if (this._should_print_raw()) {
        return [rule.get_start(), ...inner, rule.get_end()];
      }

      const [outer_prefix, inner_prefix, inner_suffix, outer_suffix] = rule.get_wrappers();

      const wrappedInner = [...(inner_prefix ? [inner_prefix] : []), ...inner, ...(inner_suffix ? [inner_suffix] : [])];

      const result = rule.transform(wrappedInner);

      return [...(outer_prefix ? [outer_prefix] : []), result, ...(outer_suffix ? [outer_suffix] : [])];
    } else if (this.rule instanceof TextStylerRegexRule) {
      return [this.rule.transform(this.match!)];
    }
    throw new Error("TextStylerRegexRule provided without a valid `match`");
  }

  private _should_print_raw(): boolean {
    if (this.rule instanceof TextStylerRegexRule) {
      return false;
    }

    const rule = this.rule;
    const allow_inner = rule.allow_inner;
    if (allow_inner === InnerStyle.ALLOW || this.parent === null) {
      return false;
    }
    if (allow_inner === InnerStyle.DISALLOW_DIRECT) {
      return this.parent.rule === this.rule;
    }
    if (allow_inner === InnerStyle.DISALLOW_ANCESTOR) {
      return this.path.includes(this.rule);
    }

    return false;
  }
}
