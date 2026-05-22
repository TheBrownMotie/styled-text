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
  public start: string | RegExp;
  public transform: (children: (T | string)[]) => T;
  public end: string | RegExp | null;
  public wrap_consecutive: ((children: (T | string)[]) => T) | null;
  public consume_start: ConsumptionStyle;
  public consume_end: ConsumptionStyle;
  public allow_inner: InnerStyle;

  private _startRegex: RegExp | null = null;
  private _endRegex: RegExp | null = null;

  constructor(
    start: string | RegExp,
    transform: (children: (T | string)[]) => T,
    options?: {
      end?: string | RegExp | null;
      wrap_consecutive?: (children: (T | string)[]) => T;
      consume_start?: ConsumptionStyle;
      consume_end?: ConsumptionStyle;
      allow_inner?: InnerStyle;
    },
  ) {
    this.start = start;
    this.transform = transform;
    this.end = options?.end ?? null;
    this.wrap_consecutive = options?.wrap_consecutive ?? null;
    this.consume_start = options?.consume_start ?? ConsumptionStyle.REPLACE;
    this.consume_end = options?.consume_end ?? ConsumptionStyle.REPLACE;
    this.allow_inner = options?.allow_inner ?? InnerStyle.ALLOW;

    if (this.start instanceof RegExp) {
      this._startRegex = new RegExp(this.start.source, this.start.flags.includes("g") ? this.start.flags : this.start.flags + "g");
    }
    if (this.end instanceof RegExp) {
      this._endRegex = new RegExp(this.end.source, this.end.flags.includes("g") ? this.end.flags : this.end.flags + "g");
    }
  }

  get_start_match(text: string, pos: number): string | null {
      if (typeof this.start === "string") {
        const startStr = this.get_start();
        return text.startsWith(startStr, pos) ? startStr : null;
      }
      if (this._startRegex) {
        this._startRegex.lastIndex = pos;
        const match = this._startRegex.exec(text);
        return match && match.index === pos ? match[0] : null;
      }
      return null;
    }

    get_end_match(text: string, pos: number): string | null {
      const end = this.end !== null ? this.end : this.start;
      if (typeof end === "string") {
        const endStr = htmlEscape(end);
        return text.startsWith(endStr, pos) ? endStr : null;
      }
      const regex = this.end !== null ? this._endRegex : this._startRegex;
      if (regex) {
        regex.lastIndex = pos;
        const match = regex.exec(text);
        return match && match.index === pos ? match[0] : null;
      }
      return null;
    }

  get_start(): string {
    return typeof this.start === "string" ? htmlEscape(this.start) : "";
  }

  get_end(): string {
    const end = this.end !== null ? this.end : this.start;
    return typeof end === "string" ? htmlEscape(end) : "";
  }
}

export type RuleType<T> = TextStylerRule<T> | TextStylerRegexRule<T>;

export type Action<T> =
  | { type: "TEXT"; text: string }
  | { type: "PUSH"; rule: TextStylerRule<T>; matched: string }
  | { type: "POP"; matched: string }
  | { type: "REGEX"; rule: TextStylerRegexRule<T>; match: RegExpMatchArray };

type NextMatch<T> =
  | { type: "STYLE"; rule: TextStylerRule<T>; position: number; is_start: boolean; is_end: boolean; matched: string }
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
    const needs_cleanup = !text.endsWith("\n");
    const normalizedText = needs_cleanup ? text + "\n" : text;

    const result = this._process_text(normalizedText, multiline);

    if (needs_cleanup && result.length > 0) {
        const last = result[result.length - 1];
        if (typeof last === "string") {
            result[result.length - 1] = last.replace(/\n$/, "");
        }
    }
    return result;
  }

  private _process_text(text: string, multiline: boolean = false): (T | string)[] {
    if (text === "") {
      return [];
    }
    text = htmlEscape(text);

    const paths = this._helper(text, 0, new Path<T>(), multiline);

    // Tie-break: lowest skips first, then fewest pushes
    const best_path = paths.reduce((best, curr) => {
      if (curr.num_skips < best.num_skips) return curr;
      if (curr.num_skips > best.num_skips) return best;
      return curr.num_pushes < best.num_pushes ? curr : best;
    });

    const ast = new SyntaxTree<T>();
    for (const action of best_path.actions) {
      if (action.type === "TEXT") {
        ast.push_str(action.text);
      } else if (action.type === "PUSH") {
        ast.push(action.rule, action.matched);
      } else if (action.type === "POP") {
        ast.pop(action.matched);
      } else if (action.type === "REGEX") {
        ast.push_regex(action.rule, action.match);
      }
    }
    return ast.render();
  }

  private _helper(text: string, start: number, path: Path<T>, multiline: boolean = false): Path<T>[] {
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
      let text_part = text.slice(start, new_start);
      if (!multiline && path.stack.length > 0 && text_part.includes("\n")) {
        continue;
      }
      let new_path = path.copy_and_push({ type: "TEXT", text: text_part });

      if (next.type === "REGEX") {
        new_start += next.match[0].length;
        new_path = new_path.copy_and_push({ type: "REGEX", rule: next.rule, match: next.match });
      } else {
        new_start += next.matched.length;
        if (next.is_end && path.stack.length > 0 && path.peek() === next.rule) {
          new_path = new_path.copy_and_push({ type: "POP", matched: next.matched });
        } else if (next.is_start) {
          if (next.matched.length === 0) continue; // Prevent infinite loops from 0-length regexes
          new_path = new_path.copy_and_push({ type: "PUSH", rule: next.rule, matched: next.matched });
        } else {
          continue;
        }
      }
      paths.push(...this._helper(text, new_start, new_path, multiline));
    }

    // Fallback branch
    const new_start = nexts[nexts.length - 1].position + 1;
    const text_part = text.slice(start, new_start);
    if (!multiline && path.stack.length > 0 && text_part.includes("\n")) {
      return paths;
    }

    // Do not penalize if we skipped a 0-length match boundary (like end of line / lookarounds)
    let penalty = 1;
    const allZero = nexts.every(n => n.type === "REGEX" ? n.match[0].length === 0 : n.matched.length === 0);
    if (allZero) penalty = 0;

    const new_path = path.copy_and_push({ type: "TEXT", text: text_part }, penalty);
    paths.push(...this._helper(text, new_start, new_path, multiline));

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
          const startMatch = marking.get_start_match(text, index);
          const endMatch = marking.get_end_match(text, index);

          if (startMatch !== null || endMatch !== null) {
            const matched = startMatch !== null ? startMatch : (endMatch || "");
            nexts.push({
              type: "STYLE",
              rule: marking,
              position: index,
              is_start: startMatch !== null,
              is_end: endMatch !== null,
              matched,
            });
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

type Group<T> = { rule: TextStylerRule<T> | null, items: (string | SyntaxTreeNode<T>)[] };

function groupBy<T>(children: (string | SyntaxTreeNode<T>)[]): Group<T>[] {
  const groupedChildren: Group<T>[] = [];

  for (const child of children) {
    const rule = child instanceof SyntaxTreeNode && child.rule instanceof TextStylerRule ? child.rule : null;
    if (groupedChildren.length === 0) {
      groupedChildren.push({ rule, items: [child] });
    } else {
      const lastGroup = groupedChildren[groupedChildren.length - 1];
      if (lastGroup.rule === rule) {
        lastGroup.items.push(child);
      } else {
        groupedChildren.push({ rule, items: [child] });
      }
    }
  }
  return groupedChildren;
}

export class SyntaxTree<T> {
  public root: SyntaxTreeNode<T>;
  public curr: SyntaxTreeNode<T>;

  constructor() {
    const dummyRule = new TextStylerRule<T>("", (c) => c as unknown as T);
    this.root = new SyntaxTreeNode<T>(null, dummyRule, null, "");
    this.curr = this.root;
  }

  push(rule: TextStylerRule<T>, matched: string) {
    const new_node = new SyntaxTreeNode<T>(this.curr, rule, null, matched);
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
    this.curr.push(node);
  }

  pop(matched: string) {
    if (this.curr === this.root || this.curr.parent === null) {
      throw new Error("Attempted to pop() when already at root");
    }
    this.curr.end_match = matched;
    this.curr = this.curr.parent;
  }

  render(): (T | string)[] {
    return this.root.render();
  }
}

export class SyntaxTreeNode<T> {
  public children: (string | SyntaxTreeNode<T>)[] = [];
  public path: TextStylerRule<T>[] = [];
  public end_match: string = "";

  constructor(
    public parent: SyntaxTreeNode<T> | null,
    public rule: RuleType<T>,
    public match: RegExpMatchArray | null = null,
    public start_match: string = "",
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
      const inner: (T | string)[] = [];

      for (const group of groupBy(this.children)) {
        const renderedItems = group.items.flatMap(child =>
          typeof child === "string" ? [child] : child.render()
        );
        if (group.rule && group.rule.wrap_consecutive) {
          inner.push(group.rule.wrap_consecutive(renderedItems));
        } else {
          inner.push(...renderedItems);
        }
      }

      if (this.parent === null) {
        return inner; // Root simply surfaces the children
      }

      if (this._should_print_raw()) {
        const rawResult: (T | string)[] = [];
        if (this.start_match) rawResult.push(this.start_match);
        rawResult.push(...inner);
        if (this.end_match) rawResult.push(this.end_match);
        return rawResult;
      }

      let outer_prefix = "", inner_prefix = "", inner_suffix = "", outer_suffix = "";
      if (rule.consume_start === ConsumptionStyle.INSIDE) outer_prefix = this.start_match;
      else if (rule.consume_start === ConsumptionStyle.OUTSIDE) inner_prefix = this.start_match;

      if (rule.consume_end === ConsumptionStyle.INSIDE) outer_suffix = this.end_match;
      else if (rule.consume_end === ConsumptionStyle.OUTSIDE) inner_suffix = this.end_match;

      const wrappedInner = [
        ...(inner_prefix ? [inner_prefix] : []),
        ...inner,
        ...(inner_suffix ? [inner_suffix] : [])
      ];

      const result = rule.transform(wrappedInner);

      return [
        ...(outer_prefix ? [outer_prefix] : []),
        result,
        ...(outer_suffix ? [outer_suffix] : [])
      ];
    } else if (this.rule instanceof TextStylerRegexRule) {
      return [this.rule.transform(this.match!)];
    }
    throw new Error("TextStylerRegexRule provided without a valid `match`");
  }

  private _should_print_raw(): boolean {
    if (this.rule instanceof TextStylerRegexRule) {
      return false;
    }

    const rule = this.rule as TextStylerRule<T>;
    const allow_inner = rule.allow_inner;

    if (allow_inner === InnerStyle.ALLOW || this.parent === null) {
      return false;
    }
    if (allow_inner === InnerStyle.DISALLOW_DIRECT) {
      return this.parent.rule === rule;
    }
    if (allow_inner === InnerStyle.DISALLOW_ANCESTOR) {
      return this.path.includes(rule);
    }

    return false;
  }
}
