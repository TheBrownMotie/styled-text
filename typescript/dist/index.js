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
  wrap_consecutive;
  consume_start;
  consume_end;
  allow_inner;
  _startRegex = null;
  _endRegex = null;
  constructor(start, transform, options) {
    this.start = start;
    this.transform = transform;
    this.end = options?.end ?? null;
    this.wrap_consecutive = options?.wrap_consecutive ?? null;
    this.consume_start = options?.consume_start ?? "REPLACE" /* REPLACE */;
    this.consume_end = options?.consume_end ?? "REPLACE" /* REPLACE */;
    this.allow_inner = options?.allow_inner ?? "ALLOW" /* ALLOW */;
    if (this.start instanceof RegExp) {
      this._startRegex = new RegExp(this.start.source, this.start.flags.includes("g") ? this.start.flags : this.start.flags + "g");
    }
    if (this.end instanceof RegExp) {
      this._endRegex = new RegExp(this.end.source, this.end.flags.includes("g") ? this.end.flags : this.end.flags + "g");
    }
  }
  get_start_match(text, pos) {
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
  get_end_match(text, pos) {
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
  get_start() {
    return typeof this.start === "string" ? htmlEscape(this.start) : "";
  }
  get_end() {
    const end = this.end !== null ? this.end : this.start;
    return typeof end === "string" ? htmlEscape(end) : "";
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
  _process_text(text, multiline = false) {
    if (text === "") {
      return [];
    }
    text = htmlEscape(text);
    const paths = this._helper(text, 0, new Path(), multiline);
    const best_path = paths.reduce((best, curr) => {
      if (curr.num_skips < best.num_skips) return curr;
      if (curr.num_skips > best.num_skips) return best;
      return curr.num_pushes < best.num_pushes ? curr : best;
    });
    const ast = new SyntaxTree();
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
  _helper(text, start, path, multiline = false) {
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
      let text_part2 = text.slice(start, new_start2);
      if (!multiline && path.stack.length > 0 && text_part2.includes("\n")) {
        continue;
      }
      let new_path2 = path.copy_and_push({ type: "TEXT", text: text_part2 });
      if (next.type === "REGEX") {
        new_start2 += next.match[0].length;
        new_path2 = new_path2.copy_and_push({ type: "REGEX", rule: next.rule, match: next.match });
      } else {
        new_start2 += next.matched.length;
        if (next.is_end && path.stack.length > 0 && path.peek() === next.rule) {
          new_path2 = new_path2.copy_and_push({ type: "POP", matched: next.matched });
        } else if (next.is_start) {
          if (next.matched.length === 0) continue;
          new_path2 = new_path2.copy_and_push({ type: "PUSH", rule: next.rule, matched: next.matched });
        } else {
          continue;
        }
      }
      paths.push(...this._helper(text, new_start2, new_path2, multiline));
    }
    const new_start = nexts[nexts.length - 1].position + 1;
    const text_part = text.slice(start, new_start);
    if (!multiline && path.stack.length > 0 && text_part.includes("\n")) {
      return paths;
    }
    let penalty = 1;
    const allZero = nexts.every((n) => n.type === "REGEX" ? n.match[0].length === 0 : n.matched.length === 0);
    if (allZero) penalty = 0;
    const new_path = path.copy_and_push({ type: "TEXT", text: text_part }, penalty);
    paths.push(...this._helper(text, new_start, new_path, multiline));
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
          const startMatch = marking.get_start_match(text, index);
          const endMatch = marking.get_end_match(text, index);
          if (startMatch !== null || endMatch !== null) {
            const matched = startMatch !== null ? startMatch : endMatch || "";
            nexts.push({
              type: "STYLE",
              rule: marking,
              position: index,
              is_start: startMatch !== null,
              is_end: endMatch !== null,
              matched
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
};
function groupBy(children) {
  const groupedChildren = [];
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
var SyntaxTree = class {
  root;
  curr;
  constructor() {
    const dummyRule = new TextStylerRule("", (c) => c);
    this.root = new SyntaxTreeNode(null, dummyRule, null, "");
    this.curr = this.root;
  }
  push(rule, matched) {
    const new_node = new SyntaxTreeNode(this.curr, rule, null, matched);
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
    this.curr.push(node);
  }
  pop(matched) {
    if (this.curr === this.root || this.curr.parent === null) {
      throw new Error("Attempted to pop() when already at root");
    }
    this.curr.end_match = matched;
    this.curr = this.curr.parent;
  }
  render() {
    return this.root.render();
  }
};
var SyntaxTreeNode = class {
  constructor(parent, rule, match = null, start_match = "") {
    this.parent = parent;
    this.rule = rule;
    this.match = match;
    this.start_match = start_match;
    if (parent !== null && parent.rule instanceof TextStylerRule) {
      this.path = [...parent.path, parent.rule];
    }
  }
  parent;
  rule;
  match;
  start_match;
  children = [];
  path = [];
  end_match = "";
  push(child) {
    this.children.push(child);
  }
  render() {
    if (this.rule instanceof TextStylerRule) {
      const rule = this.rule;
      const inner = [];
      for (const group of groupBy(this.children)) {
        const renderedItems = group.items.flatMap(
          (child) => typeof child === "string" ? [child] : child.render()
        );
        if (group.rule && group.rule.wrap_consecutive) {
          inner.push(group.rule.wrap_consecutive(renderedItems));
        } else {
          inner.push(...renderedItems);
        }
      }
      if (this.parent === null) {
        return inner;
      }
      if (this._should_print_raw()) {
        const rawResult = [];
        if (this.start_match) rawResult.push(this.start_match);
        rawResult.push(...inner);
        if (this.end_match) rawResult.push(this.end_match);
        return rawResult;
      }
      let outer_prefix = "", inner_prefix = "", inner_suffix = "", outer_suffix = "";
      if (rule.consume_start === "INSIDE" /* INSIDE */) outer_prefix = this.start_match;
      else if (rule.consume_start === "OUTSIDE" /* OUTSIDE */) inner_prefix = this.start_match;
      if (rule.consume_end === "INSIDE" /* INSIDE */) outer_suffix = this.end_match;
      else if (rule.consume_end === "OUTSIDE" /* OUTSIDE */) inner_suffix = this.end_match;
      const wrappedInner = [
        ...inner_prefix ? [inner_prefix] : [],
        ...inner,
        ...inner_suffix ? [inner_suffix] : []
      ];
      const result = rule.transform(wrappedInner);
      return [
        ...outer_prefix ? [outer_prefix] : [],
        result,
        ...outer_suffix ? [outer_suffix] : []
      ];
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
      return this.parent.rule === rule;
    }
    if (allow_inner === "DISALLOW_ANCESTOR" /* DISALLOW_ANCESTOR */) {
      return this.path.includes(rule);
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
