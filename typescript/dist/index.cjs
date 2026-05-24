"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ConsumptionStyle: () => ConsumptionStyle,
  InnerStyle: () => InnerStyle,
  MARKDOWN_RULES: () => MARKDOWN_RULES,
  TextStyler: () => TextStyler,
  TextStylerRegexRule: () => TextStylerRegexRule,
  TextStylerRule: () => TextStylerRule,
  htmlEscape: () => htmlEscape,
  htmlTag: () => htmlTag
});
module.exports = __toCommonJS(index_exports);

// src/text_styler.ts
var ConsumptionStyle = /* @__PURE__ */ ((ConsumptionStyle2) => {
  ConsumptionStyle2["REPLACE"] = "REPLACE";
  ConsumptionStyle2["OUTSIDE"] = "OUTSIDE";
  ConsumptionStyle2["INSIDE"] = "INSIDE";
  return ConsumptionStyle2;
})(ConsumptionStyle || {});
var InnerStyle = /* @__PURE__ */ ((InnerStyle2) => {
  InnerStyle2["ALLOW"] = "ALLOW";
  InnerStyle2["DISALLOW_DIRECT"] = "DISALLOW_DIRECT";
  InnerStyle2["DISALLOW_ANCESTOR"] = "DISALLOW_ANCESTOR";
  return InnerStyle2;
})(InnerStyle || {});
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
function withGlobalFlag(regex) {
  return new RegExp(regex.source, regex.flags.replace(/[gy]/g, "") + "y");
}
var TextStylerRegexRule = class {
  constructor(regex, transform) {
    this.regex = regex;
    this.transform = transform;
    this.regex = withGlobalFlag(regex);
  }
  regex;
  transform;
};
var TextStylerRule = class {
  start;
  transform;
  end;
  wrapConsecutive;
  consumeStart;
  consumeEnd;
  allowInner;
  constructor(start, transform, options) {
    this.start = start;
    this.transform = transform;
    this.end = options?.end ?? null;
    this.wrapConsecutive = options?.wrapConsecutive ?? null;
    this.consumeStart = options?.consumeStart ?? "REPLACE" /* REPLACE */;
    this.consumeEnd = options?.consumeEnd ?? "REPLACE" /* REPLACE */;
    this.allowInner = options?.allowInner ?? "ALLOW" /* ALLOW */;
    if (this.start instanceof RegExp) {
      this.start = withGlobalFlag(this.start);
    }
    if (this.end instanceof RegExp) {
      this.end = withGlobalFlag(this.end);
    }
  }
  getStartMatch(text, pos) {
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
  getEndMatch(text, pos) {
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
  getStart() {
    return typeof this.start === "string" ? this.start : "";
  }
  getEnd() {
    const end = this.end !== null ? this.end : this.start;
    return typeof end === "string" ? end : "";
  }
};
var Path = class _Path {
  constructor(actions = [], stack = [], numSkips = 0, numPushes = 0) {
    this.actions = actions;
    this.stack = stack;
    this.numSkips = numSkips;
    this.numPushes = numPushes;
  }
  actions;
  stack;
  numSkips;
  numPushes;
  peek() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
  copyAndPush(action, extraSkip = 0) {
    const newActions = [...this.actions];
    if (action.type !== "TEXT" || action.text !== "") {
      newActions.push(action);
    }
    let newNumPushes = this.numPushes;
    let newStack = this.stack;
    if (action.type === "PUSH") {
      newStack = [...this.stack, action.rule];
      newNumPushes++;
    } else if (action.type === "POP") {
      newStack = this.stack.slice(0, -1);
    } else if (action.type === "REGEX") {
      newNumPushes++;
    }
    return new _Path(newActions, newStack, this.numSkips + extraSkip, newNumPushes);
  }
};
var TextStyler = class {
  rule;
  bestFound = null;
  stateBest = /* @__PURE__ */ new Map();
  constructor(rule) {
    this.rule = rule;
    this.rule.forEach((r, i) => r._id = i);
  }
  processText(text, multiline = false, escapeHtml = true) {
    this.bestFound = null;
    this.stateBest.clear();
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
  _processText(text, multiline = false, escapeHtml = true) {
    if (text === "") {
      return [];
    }
    const paths = this._helper(text, 0, new Path(), multiline);
    const bestPath = paths.reduce((best, curr) => {
      if (curr.numSkips < best.numSkips) return curr;
      if (curr.numSkips > best.numSkips) return best;
      return curr.numPushes < best.numPushes ? curr : best;
    });
    const ast = new SyntaxTree(escapeHtml);
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
  _helper(text, start, path, multiline = false) {
    if (this._endEarly(path, start)) {
      return [];
    }
    if (text === "") {
      return [new Path()];
    }
    const nexts = this._findNext(text, start);
    if (start >= text.length || nexts.length === 0) {
      if (path.stack.length > 0) {
        return [];
      }
      const current_score = [path.numSkips, path.numPushes];
      if (this.bestFound === null || current_score[0] < this.bestFound[0] || current_score[0] === this.bestFound[0] && current_score[1] < this.bestFound[1]) {
        this.bestFound = current_score;
      }
      return [path.copyAndPush({ type: "TEXT", text: text.slice(start) })];
    }
    const paths = [];
    for (const next of nexts) {
      let newStart2 = next.position;
      let textPart2 = text.slice(start, newStart2);
      if (!multiline && path.stack.length > 0 && textPart2.includes("\n")) {
        continue;
      }
      let newPath2 = path.copyAndPush({ type: "TEXT", text: textPart2 });
      if (next.type === "REGEX") {
        newStart2 += next.match[0].length;
        newPath2 = newPath2.copyAndPush({ type: "REGEX", rule: next.rule, match: next.match });
      } else {
        newStart2 += next.matched.length;
        if (next.isEnd && path.stack.length > 0 && path.peek() === next.rule) {
          newPath2 = newPath2.copyAndPush({ type: "POP", matched: next.matched });
        } else if (next.isStart) {
          if (next.matched.length === 0) continue;
          newPath2 = newPath2.copyAndPush({ type: "PUSH", rule: next.rule, matched: next.matched });
        } else {
          continue;
        }
      }
      paths.push(...this._helper(text, newStart2, newPath2, multiline));
    }
    const newStart = nexts[nexts.length - 1].position + 1;
    const textPart = text.slice(start, newStart);
    if (!multiline && path.stack.length > 0 && textPart.includes("\n")) {
      return paths;
    }
    let penalty = 1;
    const allZero = nexts.every((n) => n.type === "REGEX" ? n.match[0].length === 0 : n.matched.length === 0);
    if (allZero) penalty = 0;
    const newPath = path.copyAndPush({ type: "TEXT", text: textPart }, penalty);
    paths.push(...this._helper(text, newStart, newPath, multiline));
    return paths;
  }
  _findNext(text, start) {
    const nexts = [];
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
            const matched = startMatch !== null ? startMatch : endMatch || "";
            nexts.push({
              type: "STYLE",
              rule: marking,
              position: index,
              isStart: startMatch !== null,
              isEnd: endMatch !== null,
              matched
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
  _endEarly(path, index) {
    if (this.bestFound !== null) {
      if (path.numSkips > this.bestFound[0] || path.numSkips === this.bestFound[0] && path.numPushes >= this.bestFound[1]) {
        return true;
      }
    }
    let stackKey = "";
    for (let i = 0; i < path.stack.length; i++) {
      stackKey += path.stack[i]._id + ",";
    }
    const stateKey = `${index}:${stackKey}`;
    const currentScore = [path.numSkips, path.numPushes];
    const previousBest = this.stateBest.get(stateKey);
    if (previousBest) {
      if (currentScore[0] > previousBest[0] || currentScore[0] === previousBest[0] && currentScore[1] >= previousBest[1]) {
        return true;
      }
    }
    this.stateBest.set(stateKey, currentScore);
    return false;
  }
};
function groupBy(children) {
  const groupedChildren = [];
  for (const child of children) {
    const isWhitespace = typeof child === "string" && child.trim() === "";
    const rule = child instanceof SyntaxTreeNode && child.rule instanceof TextStylerRule ? child.rule : null;
    if (groupedChildren.length === 0) {
      groupedChildren.push({ rule: isWhitespace ? null : rule, items: [child] });
    } else {
      const lastGroup = groupedChildren[groupedChildren.length - 1];
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
var SyntaxTree = class {
  constructor(escapeHtml = true) {
    this.escapeHtml = escapeHtml;
    const dummyRule = new TextStylerRule("", (c) => c);
    this.root = new SyntaxTreeNode(null, dummyRule, null, "", escapeHtml);
    this.curr = this.root;
  }
  escapeHtml;
  root;
  curr;
  push(rule, matched) {
    const node = new SyntaxTreeNode(this.curr, rule, null, matched, this.escapeHtml);
    this._push(node);
    this.curr = node;
  }
  pushRegex(rule, match) {
    const node = new SyntaxTreeNode(this.curr, rule, match);
    this._push(node);
  }
  pushString(text) {
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
    this.curr.endMatch = matched;
    this.curr = this.curr.parent;
  }
  render() {
    return this.root.render();
  }
};
var SyntaxTreeNode = class {
  constructor(parent, rule, match = null, startMatch = "", escapeHtml = true) {
    this.parent = parent;
    this.rule = rule;
    this.match = match;
    this.startMatch = startMatch;
    this.escapeHtml = escapeHtml;
    if (parent !== null && parent.rule instanceof TextStylerRule) {
      this.path = [...parent.path, parent.rule];
    }
  }
  parent;
  rule;
  match;
  startMatch;
  escapeHtml;
  children = [];
  path = [];
  endMatch = "";
  push(child) {
    this.children.push(child);
  }
  escape(text) {
    return this.escapeHtml ? htmlEscape(text) : text;
  }
  render() {
    if (this.rule instanceof TextStylerRule) {
      const rule = this.rule;
      const inner = [];
      for (const group of groupBy(this.children)) {
        const renderedItems = group.items.flatMap(
          (child) => typeof child === "string" ? [this.escape(child)] : child.render()
        );
        if (group.rule && group.rule.wrapConsecutive) {
          inner.push(group.rule.wrapConsecutive(renderedItems));
        } else {
          inner.push(...renderedItems);
        }
      }
      if (this.parent === null) {
        return inner;
      }
      if (this._shouldPrintRaw()) {
        const rawResult = [];
        if (this.startMatch) rawResult.push(this.escape(this.startMatch));
        rawResult.push(...inner);
        if (this.endMatch) rawResult.push(this.escape(this.endMatch));
        return rawResult;
      }
      let outerPrefix = "", innerPrefix = "", innerSuffix = "", outerSuffix = "";
      if (rule.consumeStart === "INSIDE" /* INSIDE */) outerPrefix = this.escape(this.startMatch);
      else if (rule.consumeStart === "OUTSIDE" /* OUTSIDE */) innerPrefix = this.escape(this.startMatch);
      if (rule.consumeEnd === "INSIDE" /* INSIDE */) outerSuffix = this.escape(this.endMatch);
      else if (rule.consumeEnd === "OUTSIDE" /* OUTSIDE */) innerSuffix = this.escape(this.endMatch);
      const wrappedInner = [
        ...innerPrefix ? [innerPrefix] : [],
        ...inner,
        ...innerSuffix ? [innerSuffix] : []
      ];
      const result = rule.transform(wrappedInner);
      return [
        ...outerPrefix ? [outerPrefix] : [],
        result,
        ...outerSuffix ? [outerSuffix] : []
      ];
    } else if (this.rule instanceof TextStylerRegexRule) {
      return [this.rule.transform(this.match)];
    }
    throw new Error("TextStylerRegexRule provided without a valid `match`");
  }
  _shouldPrintRaw() {
    if (this.rule instanceof TextStylerRegexRule) {
      return false;
    }
    const rule = this.rule;
    const allowInner = rule.allowInner;
    if (allowInner === "ALLOW" /* ALLOW */ || this.parent === null) {
      return false;
    }
    if (allowInner === "DISALLOW_DIRECT" /* DISALLOW_DIRECT */) {
      return this.parent.rule === rule;
    }
    if (allowInner === "DISALLOW_ANCESTOR" /* DISALLOW_ANCESTOR */) {
      return this.path.includes(rule);
    }
    return false;
  }
};

// src/markdown.ts
var MARKDOWN_RULES = [
  // Code Blocks & Inline Code (Disables all other formatting inside)
  new TextStylerRegexRule(
    /```([\s\S]+?)```/,
    (match) => `<pre><code>${htmlEscape(match[1].trim())}</code></pre>`
  ),
  new TextStylerRegexRule(
    /`([^`]+)`/,
    (match) => `<code>${htmlEscape(match[1])}</code>`
  ),
  // Images & Links (Image must come first so the '!' isn't left behind)
  new TextStylerRegexRule(
    /!\[([^\]]*)\]\(([^)]+)\)/,
    (match) => `<img src='${htmlEscape(match[2])}' alt='${htmlEscape(match[1])}' />`
  ),
  new TextStylerRegexRule(
    /\[([^\]]+)\]\(([^)]+)\)/,
    (match) => `<a href='${htmlEscape(match[2])}'>${htmlEscape(match[1])}</a>`
  ),
  // Headers
  ...[6, 5, 4, 3, 2, 1].map(
    (level) => new TextStylerRule(
      new RegExp(`^#{${level}}\\s+`, "m"),
      htmlTag(`h${level}`),
      { end: /(?=\n|$)\n?/ }
    )
  ),
  // Lists
  new TextStylerRule(
    /^\s*[-*]\s+/m,
    htmlTag("li"),
    { end: /(?=\n|$)\n?/, wrapConsecutive: htmlTag("ul") }
  ),
  new TextStylerRule(
    /^\s*\d+\.\s+/m,
    htmlTag("li"),
    { end: /(?=\n|$)\n?/, wrapConsecutive: htmlTag("ol") }
  ),
  // Blockquotes
  new TextStylerRule(
    /^>\s+/m,
    (children) => children.join("") + "\n",
    // Preserve linebreaks inside quotes
    { end: /(?=\n|$)\n?/, wrapConsecutive: htmlTag("blockquote") }
  ),
  // Inline Formatting
  new TextStylerRule("**", htmlTag("strong")),
  new TextStylerRule("__", htmlTag("strong")),
  new TextStylerRule("*", htmlTag("em")),
  new TextStylerRule("_", htmlTag("em")),
  new TextStylerRule("~~", htmlTag("del"))
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConsumptionStyle,
  InnerStyle,
  MARKDOWN_RULES,
  TextStyler,
  TextStylerRegexRule,
  TextStylerRule,
  htmlEscape,
  htmlTag
});
