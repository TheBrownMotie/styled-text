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
  TextStyler: () => TextStyler,
  TextStylerRegexRule: () => TextStylerRegexRule,
  TextStylerRule: () => TextStylerRule,
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
  wrapConsecutive;
  consumeStart;
  consumeEnd;
  allowInner;
  _startRegex = null;
  _endRegex = null;
  constructor(start, transform, options) {
    this.start = start;
    this.transform = transform;
    this.end = options?.end ?? null;
    this.wrapConsecutive = options?.wrapConsecutive ?? null;
    this.consumeStart = options?.consumeStart ?? "REPLACE" /* REPLACE */;
    this.consumeEnd = options?.consumeEnd ?? "REPLACE" /* REPLACE */;
    this.allowInner = options?.allowInner ?? "ALLOW" /* ALLOW */;
    if (this.start instanceof RegExp) {
      this._startRegex = new RegExp(this.start.source, this.start.flags.includes("g") ? this.start.flags : this.start.flags + "g");
    }
    if (this.end instanceof RegExp) {
      this._endRegex = new RegExp(this.end.source, this.end.flags.includes("g") ? this.end.flags : this.end.flags + "g");
    }
  }
  getStartMatch(text, pos) {
    if (typeof this.start === "string") {
      const startStr = this.getStart();
      return text.startsWith(startStr, pos) ? startStr : null;
    }
    if (this._startRegex) {
      this._startRegex.lastIndex = pos;
      const match = this._startRegex.exec(text);
      return match && match.index === pos ? match[0] : null;
    }
    return null;
  }
  getEndMatch(text, pos) {
    const end = this.end !== null ? this.end : this.start;
    if (typeof end === "string") {
      return text.startsWith(end, pos) ? end : null;
    }
    const regex = this.end !== null ? this._endRegex : this._startRegex;
    if (regex) {
      regex.lastIndex = pos;
      const match = regex.exec(text);
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
  constructor(actions = [], stack = [], numSkips = 0) {
    this.actions = actions;
    this.stack = stack;
    this.numSkips = numSkips;
  }
  actions;
  stack;
  numSkips;
  get numPushes() {
    return this.actions.filter((a) => a.type === "PUSH" || a.type === "REGEX").length;
  }
  peek() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
  copyAndPush(action, extraSkip = 0) {
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
    return new _Path(newActions, newStack, this.numSkips + extraSkip);
  }
};
var TextStyler = class {
  rule;
  minSkips = null;
  constructor(rule) {
    this.rule = rule;
  }
  processText(text, multiline = false, escapeHtml = true) {
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
    if (this.minSkips !== null && path.numSkips > this.minSkips) {
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
      this.minSkips = Math.min(this.minSkips ?? path.numSkips, path.numSkips);
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
          const match = text.slice(index).match(marking.regex);
          if (match && match.index === 0) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConsumptionStyle,
  InnerStyle,
  TextStyler,
  TextStylerRegexRule,
  TextStylerRule,
  htmlTag
});
