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

function withGlobalFlag(regex: RegExp): RegExp {
  if (regex.flags.includes("g")) {
    return regex;
  }
  return new RegExp(regex.source, regex.flags + "g");
}

export class TextStylerRegexRule<T> {
  constructor(
    public regex: RegExp,
    public transform: (match: RegExpMatchArray) => T,
  ) {
    this.regex = withGlobalFlag(regex);
  }
}

export class TextStylerRule<T> {
  public start: string | RegExp;
  public transform: (children: (T | string)[]) => T;
  public end: string | RegExp | null;
  public wrapConsecutive: ((children: (T | string)[]) => T) | null;
  public consumeStart: ConsumptionStyle;
  public consumeEnd: ConsumptionStyle;
  public allowInner: InnerStyle;

  constructor(
    start: string | RegExp,
    transform: (children: (T | string)[]) => T,
    options?: {
      end?: string | RegExp | null;
      wrapConsecutive?: (children: (T | string)[]) => T;
      consumeStart?: ConsumptionStyle;
      consumeEnd?: ConsumptionStyle;
      allowInner?: InnerStyle;
    },
  ) {
    this.start = start;
    this.transform = transform;
    this.end = options?.end ?? null;
    this.wrapConsecutive = options?.wrapConsecutive ?? null;
    this.consumeStart = options?.consumeStart ?? ConsumptionStyle.REPLACE;
    this.consumeEnd = options?.consumeEnd ?? ConsumptionStyle.REPLACE;
    this.allowInner = options?.allowInner ?? InnerStyle.ALLOW;

    if (this.start instanceof RegExp) {
      this.start = withGlobalFlag(this.start);
    }
    if (this.end instanceof RegExp) {
      this.end = withGlobalFlag(this.end);
    }
  }

  getStartMatch(text: string, pos: number): string | null {
      if (typeof this.start === "string") {
        const startStr = this.getStart();
        return text.startsWith(startStr, pos) ? startStr : null;
      } else {
        this.start.lastIndex = pos;
        const match = this.start.exec(text);
        return match && match.index === pos ? match[0] : null;
      }
      return null;
    }

    getEndMatch(text: string, pos: number): string | null {
      const end = this.end !== null ? this.end : this.start;
      if (typeof end === "string") {
        return text.startsWith(end, pos) ? end : null;
      } else {
        end.lastIndex = pos;
        const match = end.exec(text);
        return match && match.index === pos ? match[0] : null;
      }
      return null;
    }

  getStart(): string {
    return typeof this.start === "string" ? this.start : "";
  }

  getEnd(): string {
    const end = this.end !== null ? this.end : this.start;
    return typeof end === "string" ? end : "";
  }
}

export type RuleType<T> = TextStylerRule<T> | TextStylerRegexRule<T>;

export type Action<T> =
  | { type: "TEXT"; text: string }
  | { type: "PUSH"; rule: TextStylerRule<T>; matched: string }
  | { type: "POP"; matched: string }
  | { type: "REGEX"; rule: TextStylerRegexRule<T>; match: RegExpMatchArray };

type NextMatch<T> =
  | { type: "STYLE"; rule: TextStylerRule<T>; position: number; isStart: boolean; isEnd: boolean; matched: string }
  | { type: "REGEX"; rule: TextStylerRegexRule<T>; position: number; match: RegExpMatchArray };

export class Path<T> {
  constructor(
    public readonly actions: Action<T>[] = [],
    public readonly stack: TextStylerRule<T>[] = [],
    public readonly numSkips: number = 0,
  ) {}

  get numPushes(): number {
    return this.actions.filter((a) => a.type === "PUSH" || a.type === "REGEX").length;
  }

  peek(): TextStylerRule<T> | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  copyAndPush(action: Action<T>, extraSkip: number = 0): Path<T> {
    const newActions = [...this.actions];
    if (action.type !== "TEXT" || action.text !== "") {
      newActions.push(action);
    }

    let newStack = this.stack;
    if (action.type === "PUSH") {
      newStack = [...this.stack, action.rule];
    } else if (action.type === "POP") {
      newStack = this.stack.slice(0, -1);
    }

    return new Path(newActions, newStack, this.numSkips + extraSkip);
  }
}

export class TextStyler<T> {
  public rule: RuleType<T>[];
  private minSkips: number | null = null;

  constructor(rule: RuleType<T>[]) {
    this.rule = rule;
  }

  public processText(text: string, multiline: boolean = false, escapeHtml: boolean = true): (T | string)[] {
    this.minSkips = null;
    const needsCleanup = !text.endsWith("\n");
    const normalizedText = needsCleanup ? text + "\n" : text;

    const result = this._processText(normalizedText, multiline, escapeHtml);

    if (needsCleanup && result.length > 0) {
        const last = result[result.length - 1];
        if (typeof last === "string") {
            result[result.length - 1] = last.replace(/\n$/, "");
        }
    }
    return result;
  }

  private _processText(text: string, multiline: boolean = false, escapeHtml: boolean = true): (T | string)[] {
    if (text === "") {
      return [];
    }
    const paths = this._helper(text, 0, new Path<T>(), multiline);

    // Tie-break: lowest skips first, then fewest pushes
    const bestPath = paths.reduce((best, curr) => {
      if (curr.numSkips < best.numSkips) return curr;
      if (curr.numSkips > best.numSkips) return best;
      return curr.numPushes < best.numPushes ? curr : best;
    });

    const ast = new SyntaxTree<T>(escapeHtml);
    for (const action of bestPath.actions) {
      if (action.type === "TEXT") {
        ast.pushString(action.text);
      } else if (action.type === "PUSH") {
        ast.push(action.rule, action.matched);
      } else if (action.type === "POP") {
        ast.pop(action.matched);
      } else if (action.type === "REGEX") {
        ast.pushRegex(action.rule, action.match);
      }
    }
    return ast.render();
  }

  private _helper(text: string, start: number, path: Path<T>, multiline: boolean = false): Path<T>[] {
    if (this.minSkips !== null && path.numSkips > this.minSkips) {
      return [];
    }
    if (text === "") {
      return [new Path<T>()];
    }

    const nexts = this._findNext(text, start);

    if (start >= text.length || nexts.length === 0) {
      if (path.stack.length > 0) {
        return [];
      }
      this.minSkips = Math.min(this.minSkips ?? path.numSkips, path.numSkips);
      return [path.copyAndPush({ type: "TEXT", text: text.slice(start) })];
    }

    const paths: Path<T>[] = [];
    for (const next of nexts) {
      let newStart = next.position;
      let textPart = text.slice(start, newStart);
      if (!multiline && path.stack.length > 0 && textPart.includes("\n")) {
        continue;
      }
      let newPath = path.copyAndPush({ type: "TEXT", text: textPart });

      if (next.type === "REGEX") {
        newStart += next.match[0].length;
        newPath = newPath.copyAndPush({ type: "REGEX", rule: next.rule, match: next.match });
      } else {
        newStart += next.matched.length;
        if (next.isEnd && path.stack.length > 0 && path.peek() === next.rule) {
          newPath = newPath.copyAndPush({ type: "POP", matched: next.matched });
        } else if (next.isStart) {
          if (next.matched.length === 0) continue; // Prevent infinite loops from 0-length regexes
          newPath = newPath.copyAndPush({ type: "PUSH", rule: next.rule, matched: next.matched });
        } else {
          continue;
        }
      }
      paths.push(...this._helper(text, newStart, newPath, multiline));
    }

    // Fallback branch
    const newStart = nexts[nexts.length - 1].position + 1;
    const textPart = text.slice(start, newStart);
    if (!multiline && path.stack.length > 0 && textPart.includes("\n")) {
      return paths;
    }

    // Do not penalize if we skipped a 0-length match boundary (like end of line / lookarounds)
    let penalty = 1;
    const allZero = nexts.every(n => n.type === "REGEX" ? n.match[0].length === 0 : n.matched.length === 0);
    if (allZero) penalty = 0;

    const newPath = path.copyAndPush({ type: "TEXT", text: textPart }, penalty);
    paths.push(...this._helper(text, newStart, newPath, multiline));

    return paths;
  }

  private _findNext(text: string, start: number): NextMatch<T>[] {
    const nexts: NextMatch<T>[] = [];
    let isEscaped = false;

    for (let index = start; index < text.length; index++) {
      for (const marking of this.rule) {
        if (marking instanceof TextStylerRegexRule) {
          marking.regex.lastIndex = index;
          const match = marking.regex.exec(text);
          if (match && match.index === index) {
            nexts.push({ type: "REGEX", rule: marking, position: index, match });
          }
        } else if (!isEscaped) {
          const startMatch = marking.getStartMatch(text, index);
          const endMatch = marking.getEndMatch(text, index);

          if (startMatch !== null || endMatch !== null) {
            const matched = startMatch !== null ? startMatch : (endMatch || "");
            nexts.push({
              type: "STYLE",
              rule: marking,
              position: index,
              isStart: startMatch !== null,
              isEnd: endMatch !== null,
              matched,
            });
          }
        }
      }

      isEscaped = text[index] === "\\" && !isEscaped;
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
    const isWhitespace = typeof child === "string" && child.trim() === "";
    const rule = child instanceof SyntaxTreeNode && child.rule instanceof TextStylerRule ? child.rule : null;

    if (groupedChildren.length === 0) {
      groupedChildren.push({ rule: isWhitespace ? null : rule, items: [child] });
    } else {
      const lastGroup = groupedChildren[groupedChildren.length - 1];

      // If the node is just whitespace, absorb it into the current group!
      if (isWhitespace && lastGroup.rule !== null) {
        lastGroup.items.push(child);
      } else if (lastGroup.rule === rule) {
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

  constructor(public escapeHtml: boolean = true) {
    const dummyRule = new TextStylerRule<T>("", (c) => c as unknown as T);
    this.root = new SyntaxTreeNode<T>(null, dummyRule, null, "", escapeHtml);
    this.curr = this.root;
  }

  push(rule: TextStylerRule<T>, matched: string) {
    const node = new SyntaxTreeNode<T>(this.curr, rule, null, matched, this.escapeHtml);
    this._push(node);
    this.curr = node;
  }

  pushRegex(rule: TextStylerRegexRule<T>, match: RegExpMatchArray) {
    const node = new SyntaxTreeNode<T>(this.curr, rule, match);
    this._push(node);
  }

  pushString(text: string) {
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
    this.curr.endMatch = matched;
    this.curr = this.curr.parent;
  }

  render(): (T | string)[] {
    return this.root.render();
  }
}

export class SyntaxTreeNode<T> {
  public children: (string | SyntaxTreeNode<T>)[] = [];
  public path: TextStylerRule<T>[] = [];
  public endMatch: string = "";

  constructor(
    public parent: SyntaxTreeNode<T> | null,
    public rule: RuleType<T>,
    public match: RegExpMatchArray | null = null,
    public startMatch: string = "",
    public escapeHtml: boolean = true,
  ) {
    if (parent !== null && parent.rule instanceof TextStylerRule) {
      this.path = [...parent.path, parent.rule];
    }
  }

  push(child: string | SyntaxTreeNode<T>) {
    this.children.push(child);
  }

  private escape(text: string) {
    return this.escapeHtml ? htmlEscape(text) : text;
  }

  render(): (T | string)[] {
    if (this.rule instanceof TextStylerRule) {
      const rule = this.rule;
      const inner: (T | string)[] = [];

      for (const group of groupBy(this.children)) {
        const renderedItems = group.items.flatMap(child =>
          typeof child === "string" ? [this.escape(child)] : child.render()
        );
        if (group.rule && group.rule.wrapConsecutive) {
          inner.push(group.rule.wrapConsecutive(renderedItems));
        } else {
          inner.push(...renderedItems);
        }
      }

      if (this.parent === null) {
        return inner; // Root simply surfaces the children
      }

      if (this._shouldPrintRaw()) {
        const rawResult: (T | string)[] = [];
        if (this.startMatch) rawResult.push(this.escape(this.startMatch));
        rawResult.push(...inner);
        if (this.endMatch) rawResult.push(this.escape(this.endMatch));
        return rawResult;
      }

      let outerPrefix = "", innerPrefix = "", innerSuffix = "", outerSuffix = "";

      // Escape prefixes/suffixes if they are outputted as raw text outside the transform
      if (rule.consumeStart === ConsumptionStyle.INSIDE) outerPrefix = this.escape(this.startMatch);
      else if (rule.consumeStart === ConsumptionStyle.OUTSIDE) innerPrefix = this.escape(this.startMatch);

      if (rule.consumeEnd === ConsumptionStyle.INSIDE) outerSuffix = this.escape(this.endMatch);
      else if (rule.consumeEnd === ConsumptionStyle.OUTSIDE) innerSuffix = this.escape(this.endMatch);

      const wrappedInner = [
        ...(innerPrefix ? [innerPrefix] : []),
        ...inner,
        ...(innerSuffix ? [innerSuffix] : [])
      ];

      const result = rule.transform(wrappedInner);

      return [
        ...(outerPrefix ? [outerPrefix] : []),
        result,
        ...(outerSuffix ? [outerSuffix] : [])
      ];
    } else if (this.rule instanceof TextStylerRegexRule) {
      return [this.rule.transform(this.match!)];
    }
    throw new Error("TextStylerRegexRule provided without a valid `match`");
  }

  private _shouldPrintRaw(): boolean {
    if (this.rule instanceof TextStylerRegexRule) {
      return false;
    }

    const rule = this.rule as TextStylerRule<T>;
    const allowInner = rule.allowInner;

    if (allowInner === InnerStyle.ALLOW || this.parent === null) {
      return false;
    }
    if (allowInner === InnerStyle.DISALLOW_DIRECT) {
      return this.parent.rule === rule;
    }
    if (allowInner === InnerStyle.DISALLOW_ANCESTOR) {
      return this.path.includes(rule);
    }

    return false;
  }
}
