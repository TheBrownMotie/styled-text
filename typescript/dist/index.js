// src/text_styler.ts
function htmlEscape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function htmlTag(tag, attributes, autoCloseEmpty = true) {
  const attrs = attributes ? Object.entries(attributes).map(([k, v]) => ` ${k}='${v}'`).join("") : "";
  const start = `${tag}${attrs}`;
  return (children) => {
    const inner = children.join("");
    if (autoCloseEmpty && !inner) {
      return `<${start} />`;
    }
    return `<${start}>${inner}</${tag}>`;
  };
}
var TextStylerRegexRule = class {
  constructor(regex, transform) {
    this.regex = regex;
    this.transform = transform;
  }
  regex;
  transform;
};
var TextStylerRule = class {
  start;
  transform;
  end;
  consume_start;
  consume_end;
  allow_inner;
  constructor(start, transform, options) {
    this.start = start;
    this.transform = transform;
    this.end = options?.end ?? null;
    this.consume_start = options?.consume_start ?? "REPLACE" /* REPLACE */;
    this.consume_end = options?.consume_end ?? "REPLACE" /* REPLACE */;
    this.allow_inner = options?.allow_inner ?? "ALLOW" /* ALLOW */;
  }
  get_end() {
    return htmlEscape(this.end || this.start);
  }
  get_start() {
    return htmlEscape(this.start);
  }
  get_wrappers() {
    let outer_prefix = "", inner_prefix = "", inner_suffix = "", outer_suffix = "";
    if (this.consume_start === "INSIDE" /* INSIDE */) {
      outer_prefix = this.get_end();
    }
    if (this.consume_start === "OUTSIDE" /* OUTSIDE */) {
      inner_prefix = this.get_start();
    }
    if (this.consume_end === "INSIDE" /* INSIDE */) {
      outer_suffix = this.get_end();
    }
    if (this.consume_end === "OUTSIDE" /* OUTSIDE */) {
      inner_suffix = this.get_end();
    }
    return [outer_prefix, inner_prefix, inner_suffix, outer_suffix];
  }
};
var Path = class _Path {
  constructor(actions = [], stack = [], num_skips = 0) {
    this.actions = actions;
    this.stack = stack;
    this.num_skips = num_skips;
  }
  actions;
  stack;
  num_skips;
  get num_pushes() {
    return this.actions.filter((a) => a.type === "PUSH" || a.type === "REGEX").length;
  }
  peek() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
  copy_and_push(action, extra_skip = 0) {
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
    return new _Path(new_actions, new_stack, this.num_skips + extra_skip);
  }
};
var TextStyler = class {
  rule;
  min_skips = null;
  constructor(rule) {
    this.rule = rule;
  }
  processText(text, multiline = false) {
    this.min_skips = null;
    if (multiline) {
      return this._process_text(text);
    }
    const texts = text.match(/.*?\n|.+/g) || [];
    return texts.flatMap((t) => this._process_text(t));
  }
  _process_text(text) {
    if (text === "") {
      return [];
    }
    text = htmlEscape(text);
    const paths = this._helper(text, 0, new Path());
    const best_path = paths.reduce((best, curr) => {
      if (curr.num_skips < best.num_skips) {
        return curr;
      }
      if (curr.num_skips > best.num_skips) {
        return best;
      }
      return curr.num_pushes < best.num_pushes ? curr : best;
    });
    const ast = new SyntaxTree();
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
  _helper(text, start, path) {
    if (this.min_skips !== null && path.num_skips > this.min_skips) {
      return [];
    }
    if (text === "") {
      return [new Path()];
    }
    const nexts = this._find_next(text, start);
    if (start >= text.length || nexts.length === 0) {
      if (path.stack.length > 0) {
        return [];
      }
      this.min_skips = Math.min(this.min_skips ?? path.num_skips, path.num_skips);
      return [path.copy_and_push({ type: "TEXT", text: text.slice(start) })];
    }
    const paths = [];
    for (const next of nexts) {
      let new_start2 = next.position;
      let new_path2 = path.copy_and_push({ type: "TEXT", text: text.slice(start, new_start2) });
      if (next.type === "REGEX") {
        new_start2 += next.match[0].length;
        new_path2 = new_path2.copy_and_push({ type: "REGEX", rule: next.rule, match: next.match });
      } else {
        new_start2 += next.is_start ? next.rule.get_start().length : next.rule.get_end().length;
        if (next.is_end && path.stack.length > 0 && path.peek() === next.rule) {
          new_path2 = new_path2.copy_and_push({ type: "POP" });
        } else if (next.is_start) {
          new_path2 = new_path2.copy_and_push({ type: "PUSH", rule: next.rule });
        }
      }
      paths.push(...this._helper(text, new_start2, new_path2));
    }
    const new_start = nexts[nexts.length - 1].position + 1;
    const new_path = path.copy_and_push({ type: "TEXT", text: text.slice(start, new_start) }, 1);
    paths.push(...this._helper(text, new_start, new_path));
    return paths;
  }
  _find_next(text, start) {
    const nexts = [];
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
};
var SyntaxTree = class {
  children = [];
  curr = null;
  push(rule) {
    const new_node = new SyntaxTreeNode(this.curr, rule);
    this._push(new_node);
    this.curr = new_node;
  }
  push_regex(rule, match) {
    const new_node = new SyntaxTreeNode(this.curr, rule, match);
    this._push(new_node);
  }
  push_str(text) {
    if (text) {
      this._push(text.replace(/\\(.)/gs, "$1"));
    }
  }
  _push(node) {
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
  render() {
    return this.children.flatMap((child) => typeof child === "string" ? [child] : child.render());
  }
};
var SyntaxTreeNode = class {
  constructor(parent, rule, match = null) {
    this.parent = parent;
    this.rule = rule;
    this.match = match;
    if (parent !== null && parent.rule instanceof TextStylerRule) {
      this.path = [...parent.path, parent.rule];
    }
  }
  parent;
  rule;
  match;
  children = [];
  path = [];
  push(child) {
    this.children.push(child);
  }
  render() {
    if (this.rule instanceof TextStylerRule) {
      const rule = this.rule;
      const inner = this.children.flatMap(
        (child) => typeof child === "string" ? [child] : child.render()
      );
      if (this._should_print_raw()) {
        return [rule.get_start(), ...inner, rule.get_end()];
      }
      const [outer_prefix, inner_prefix, inner_suffix, outer_suffix] = rule.get_wrappers();
      const wrappedInner = [...inner_prefix ? [inner_prefix] : [], ...inner, ...inner_suffix ? [inner_suffix] : []];
      const result = rule.transform(wrappedInner);
      return [...outer_prefix ? [outer_prefix] : [], result, ...outer_suffix ? [outer_suffix] : []];
    } else if (this.rule instanceof TextStylerRegexRule) {
      return [this.rule.transform(this.match)];
    }
    throw new Error("TextStylerRegexRule provided without a valid `match`");
  }
  _should_print_raw() {
    if (this.rule instanceof TextStylerRegexRule) {
      return false;
    }
    const rule = this.rule;
    const allow_inner = rule.allow_inner;
    if (allow_inner === "ALLOW" /* ALLOW */ || this.parent === null) {
      return false;
    }
    if (allow_inner === "DISALLOW_DIRECT" /* DISALLOW_DIRECT */) {
      return this.parent.rule === this.rule;
    }
    if (allow_inner === "DISALLOW_ANCESTOR" /* DISALLOW_ANCESTOR */) {
      return this.path.includes(this.rule);
    }
    return false;
  }
};
export {
  TextStyler,
  TextStylerRegexRule,
  TextStylerRule,
  htmlTag
};
