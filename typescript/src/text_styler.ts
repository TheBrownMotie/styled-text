// ============================================================================
// Enums & Configurations
// ============================================================================

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

export class TextStylerRegexConfig {
  constructor(
    public regex: RegExp,
    public replace: string,
  ) {}
}

// Helper function to mimic Python's html.escape(text, quote=False)
function htmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function html_tag(tag: string, attributes?: Record<string, string>): (text: string) => string {
  let attributes_str = "";
  if (attributes) {
    const attributes_strs = Object.entries(attributes).map(([key, val]) => `${key}='${val}'`);
    attributes_str = " " + attributes_strs.join(" ");
  }
  return (text: string) => `<${tag}${attributes_str}>${text}</${tag}>`;
}

export class TextStylerConfig {
  public consume_start: ConsumptionStyle;
  public consume_end: ConsumptionStyle;
  public allow_inner: InnerStyle;

  constructor(
    public start: string,
    public transform: (text: string) => string,
    public end: string | null = null,
    options?: {
      consume_start?: ConsumptionStyle;
      consume_end?: ConsumptionStyle;
      allow_inner?: InnerStyle;
    },
  ) {
    this.consume_start = options?.consume_start ?? ConsumptionStyle.REPLACE;
    this.consume_end = options?.consume_end ?? ConsumptionStyle.REPLACE;
    this.allow_inner = options?.allow_inner ?? InnerStyle.ALLOW;
  }

  get_end(): string {
    return htmlEscape(this.end ?? this.start);
  }

  get_start(): string {
    return htmlEscape(this.start);
  }

  get_wrappers(): [string, string, string, string] {
    let outer_prefix = "";
    let inner_prefix = "";
    let inner_suffix = "";
    let outer_suffix = "";

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

export type ConfigType = TextStylerConfig | TextStylerRegexConfig;

export const default_config: ConfigType[] = [
  new TextStylerConfig("~~", html_tag("del")),
  new TextStylerConfig("~", html_tag("sub")),
  new TextStylerConfig("*", html_tag("strong")),
  new TextStylerConfig("_", html_tag("em")),
  new TextStylerConfig("<!", html_tag("spoiler"), "!>"),
  new TextStylerConfig("&gt;", html_tag("blockquote"), "\n"),
];

// ============================================================================
// TextStyler Core Engine
// ============================================================================

type FindNextResult = [ConfigType, number, boolean, boolean, RegExpMatchArray | null];

export class TextStyler {
  public config: ConfigType[];
  public recursive_calls = 0;
  public min_skips: number | null = null;

  constructor(config: ConfigType[] | null = null) {
    this.config = config ?? default_config;
  }

  private _find_next(text: string, start: number): FindNextResult[] {
    const next_markings: FindNextResult[] = [];

    for (let index = start; index < text.length; index++) {
      let found = false;
      for (const marking of this.config) {
        if (marking instanceof TextStylerRegexConfig) {
          // Slicing to guarantee we match starting exactly at `index` position
          const sliced = text.slice(index);
          const match = sliced.match(marking.regex);
          if (match && match.index === 0) {
            next_markings.push([marking, index, false, false, match]);
            found = true;
          }
        } else {
          const is_start = text.startsWith(marking.get_start(), index);
          const is_end = text.startsWith(marking.get_end(), index);
          if (is_start || is_end) {
            next_markings.push([marking, index, is_start, is_end, null]);
            found = true;
          }
        }
      }
      if (found) {
        return next_markings;
      }
    }
    return next_markings;
  }

  private _helper(text: string, start: number, ast: SyntaxTree, skips = 0): [string, number][] {
    this.recursive_calls += 1;
    if (this.min_skips !== null && skips > this.min_skips) {
      return [];
    }

    if (text === "") {
      return [["", skips]];
    }

    let nexts = this._find_next(text, start);
    if (start >= text.length || nexts.length === 0) {
      if (ast.at_top_of_stack()) {
        this.min_skips = this.min_skips !== null ? Math.min(this.min_skips, skips) : skips;
        ast.push_str(text.slice(start));
        return [[ast.toString(), skips]];
      } else {
        return [];
      }
    }

    // Sort by matched indices safely without mutating state prematurely
    nexts = [...nexts].sort((a, b) => a[1] - b[1]);
    const paths: [string, number][] = [];
    let last_index: number | null = null;
    let current_skips = skips;

    for (const [config, index, is_start, is_end, match] of nexts) {
      if (last_index !== null && index > last_index) {
        current_skips += 1;
      }

      const new_ast = ast.copy();
      new_ast.push_str(text.slice(start, index));
      let new_start = index;

      if (config instanceof TextStylerRegexConfig) {
        if (!match) {
          throw new Error("Match is missing from a regex");
        }
        new_start += match[0].length;
        new_ast.push_regex(config, match);
      } else {
        if (new_ast.at_top_of_stack()) {
          if (is_start) {
            new_ast.push(config);
            new_start += config.get_start().length;
          } else {
            new_start += config.get_end().length;
          }
        } else {
          if (is_end && new_ast.peek() === config) {
            new_ast.pop();
            new_start += config.get_end().length;
          } else if (is_start) {
            new_ast.push(config);
            new_start += config.get_start().length;
          }
        }
      }
      last_index = index;
      paths.push(...this._helper(text, new_start, new_ast, current_skips));
    }

    const most_index = nexts[nexts.length - 1][1] + 1;
    const new_ast = ast.copy();
    new_ast.push_str(text.slice(start, most_index));
    paths.push(...this._helper(text, most_index, new_ast, current_skips + 1));
    return paths;
  }

  private _process_text(text: string): string {
    if (text === "") {
      return text;
    }
    const escapedText = htmlEscape(text);
    const ast = new SyntaxTree();
    const paths = this._helper(escapedText, 0, ast);

    // Match lowest number of skipped configurations
    const least_skips = Math.min(...paths.map((p) => p[1]));
    let filteredPaths = paths.filter((p) => p[1] === least_skips).map((p) => p[0]);

    // Tiebreak using fewer generated HTML tag indicators
    filteredPaths.sort((a, b) => {
      const countA = (a.match(/</g) || []).length;
      const countB = (b.match(/</g) || []).length;
      return countA - countB;
    });

    return filteredPaths[0];
  }

  private _split_by_line_preserving_newlines(text: string): string[] {
    let lines = text.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      lines[i] += "\n";
    }

    if (lines[lines.length - 1].length === 0) {
      lines = lines.slice(0, -1);
    }
    return lines;
  }

  public process_text(text: string, multiline = false): string {
    this.recursive_calls = 0;
    this.min_skips = null;

    if (multiline) {
      return this._process_text(text);
    }

    let texts = this._split_by_line_preserving_newlines(text);
    texts = texts.map((t) => this._process_text(t));
    return texts.join("");
  }
}

// ============================================================================
// Abstract Syntax Tree (AST) Implementation
// ============================================================================

export class SyntaxTree {
  public children: (SyntaxTreeNode | string)[] = [];
  public curr: SyntaxTreeNode | null = null;

  public push(matched: TextStylerConfig): void {
    const new_node = new SyntaxTreeNode(this.curr, matched);
    this._push(new_node);
    this.curr = new_node;
  }

  public push_regex(matched: TextStylerRegexConfig, match: RegExpMatchArray): void {
    const new_node = new SyntaxTreeNode(this.curr, matched, match);
    this._push(new_node);
  }

  public push_str(text: string): void {
    if (text) {
      this._push(text);
    }
  }

  private _push(node: SyntaxTreeNode | string): void {
    if (this.curr === null) {
      this.children.push(node);
    } else {
      this.curr.children.push(node);
    }
  }

  public pop(): void {
    if (this.curr === null) {
      throw new Error("Attempted to pop() when already at root");
    }
    this.curr = this.curr.parent;
  }

  public peek(): TextStylerConfig | null {
    if (this.curr === null || !(this.curr.matched instanceof TextStylerConfig)) {
      return null;
    }
    return this.curr.matched;
  }

  public copy(): SyntaxTree {
    const ast = new SyntaxTree();
    const children_copy: (string | SyntaxTreeNode)[] = [];
    let found: SyntaxTreeNode | null = null;

    for (const child of this.children) {
      if (typeof child === "string") {
        children_copy.push(child);
      } else {
        const [child_copy, searched] = child.copy(null, this.curr);
        found = searched !== null ? searched : found;
        children_copy.push(child_copy);
      }
    }
    ast.children = children_copy;
    ast.curr = found;
    return ast;
  }

  public at_top_of_stack(): boolean {
    return this.curr === null;
  }

  public toString(): string {
    return this.children.map((child) => child.toString()).join("");
  }
}

export class SyntaxTreeNode {
  public children: (string | SyntaxTreeNode)[] = [];

  constructor(
    public parent: SyntaxTreeNode | null,
    public matched: ConfigType,
    public match: RegExpMatchArray | null = null,
  ) {}

  public current_path(): ConfigType[] {
    const stack: ConfigType[] = [];
    let curr: SyntaxTreeNode | null = this;
    while (curr !== null) {
      stack.push(curr.matched);
      curr = curr.parent;
    }
    return stack;
  }

  public copy(parent: SyntaxTreeNode | null, search: SyntaxTreeNode | null): [SyntaxTreeNode, SyntaxTreeNode | null] {
    const children_copy: (string | SyntaxTreeNode)[] = [];
    let found: SyntaxTreeNode | null = null;
    const node = new SyntaxTreeNode(parent, this.matched, this.match);

    for (const child of this.children) {
      if (typeof child === "string") {
        children_copy.push(child);
      } else {
        const [child_copy, searched] = child.copy(node, search);
        found = searched !== null ? searched : found;
        children_copy.push(child_copy);
      }
    }

    node.children = children_copy;
    if (this === search) {
      if (found !== null && search !== null) {
        throw new Error("How was I found twice?");
      }
      found = node;
    }

    return [node, found];
  }

  private _should_print_raw(): boolean {
    if (this.matched instanceof TextStylerRegexConfig) {
      return false;
    }

    const allow_inner = this.matched.allow_inner;
    if (allow_inner === InnerStyle.ALLOW || this.parent === null) {
      return false;
    }
    if (allow_inner === InnerStyle.DISALLOW_DIRECT) {
      return this.parent.matched === this.matched;
    }
    if (allow_inner === InnerStyle.DISALLOW_ANCESTOR) {
      let curr: SyntaxTreeNode | null = this.parent;
      while (curr !== null) {
        if (curr.matched === this.matched) {
          return true;
        }
        curr = curr.parent;
      }
      return false;
    }
    return false;
  }

  public toString(): string {
    if (this.matched instanceof TextStylerConfig) {
      const inner = this.children.map((child) => child.toString()).join("");
      if (this._should_print_raw()) {
        return this.matched.get_start() + inner + this.matched.get_end();
      }

      const [outer_prefix, inner_prefix, inner_suffix, outer_suffix] = this.matched.get_wrappers();
      const wrappedInner = inner_prefix + inner + inner_suffix;
      return outer_prefix + this.matched.transform(wrappedInner) + outer_suffix;
    } else if (this.match !== null) {
      // Equivalent to Python's re.sub on a isolated match grouping context
      return this.match[0].replace(this.matched.regex, this.matched.replace);
    }
    throw new Error("TextStylerRegexConfig provided without a valid `match`");
  }
}
