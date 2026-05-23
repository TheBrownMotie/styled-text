import { useMemo as e } from "react";
import { Fragment as t, jsx as n } from "react/jsx-runtime";
//#region ../typescript/dist/index.js
var r = /* @__PURE__ */ ((e) => (e.REPLACE = "REPLACE", e.OUTSIDE = "OUTSIDE", e.INSIDE = "INSIDE", e))(r || {}), i = /* @__PURE__ */ ((e) => (e.ALLOW = "ALLOW", e.DISALLOW_DIRECT = "DISALLOW_DIRECT", e.DISALLOW_ANCESTOR = "DISALLOW_ANCESTOR", e))(i || {});
function a(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function o(e, t, n = !0) {
	let r = `${e}${t ? Object.entries(t).map(([e, t]) => ` ${e}='${t}'`).join("") : ""}`;
	return (t) => {
		let i = t.join("");
		return n && !i ? `<${r} />` : `<${r}>${i}</${e}>`;
	};
}
var s = class {
	constructor(e, t) {
		this.regex = e, this.transform = t;
	}
	regex;
	transform;
}, c = class {
	start;
	transform;
	end;
	wrapConsecutive;
	consumeStart;
	consumeEnd;
	allowInner;
	_startRegex = null;
	_endRegex = null;
	constructor(e, t, n) {
		this.start = e, this.transform = t, this.end = n?.end ?? null, this.wrapConsecutive = n?.wrapConsecutive ?? null, this.consumeStart = n?.consumeStart ?? "REPLACE", this.consumeEnd = n?.consumeEnd ?? "REPLACE", this.allowInner = n?.allowInner ?? "ALLOW", this.start instanceof RegExp && (this._startRegex = new RegExp(this.start.source, this.start.flags.includes("g") ? this.start.flags : this.start.flags + "g")), this.end instanceof RegExp && (this._endRegex = new RegExp(this.end.source, this.end.flags.includes("g") ? this.end.flags : this.end.flags + "g"));
	}
	getStartMatch(e, t) {
		if (typeof this.start == "string") {
			let n = this.getStart();
			return e.startsWith(n, t) ? n : null;
		}
		if (this._startRegex) {
			this._startRegex.lastIndex = t;
			let n = this._startRegex.exec(e);
			return n && n.index === t ? n[0] : null;
		}
		return null;
	}
	getEndMatch(e, t) {
		let n = this.end === null ? this.start : this.end;
		if (typeof n == "string") return e.startsWith(n, t) ? n : null;
		let r = this.end === null ? this._startRegex : this._endRegex;
		if (r) {
			r.lastIndex = t;
			let n = r.exec(e);
			return n && n.index === t ? n[0] : null;
		}
		return null;
	}
	getStart() {
		return typeof this.start == "string" ? this.start : "";
	}
	getEnd() {
		let e = this.end === null ? this.start : this.end;
		return typeof e == "string" ? e : "";
	}
}, l = class e {
	constructor(e = [], t = [], n = 0) {
		this.actions = e, this.stack = t, this.numSkips = n;
	}
	actions;
	stack;
	numSkips;
	get numPushes() {
		return this.actions.filter((e) => e.type === "PUSH" || e.type === "REGEX").length;
	}
	peek() {
		return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
	}
	copyAndPush(t, n = 0) {
		let r = [...this.actions];
		(t.type !== "TEXT" || t.text !== "") && r.push(t);
		let i = this.stack;
		return t.type === "PUSH" ? i = [...this.stack, t.rule] : t.type === "POP" && (i = this.stack.slice(0, -1)), new e(r, i, this.numSkips + n);
	}
}, u = class {
	rule;
	minSkips = null;
	constructor(e) {
		this.rule = e;
	}
	processText(e, t = !1, n = !0) {
		this.minSkips = null;
		let r = !e.endsWith("\n"), i = r ? e + "\n" : e, a = this._processText(i, t, n);
		if (r && a.length > 0) {
			let e = a[a.length - 1];
			typeof e == "string" && (a[a.length - 1] = e.replace(/\n$/, ""));
		}
		return a;
	}
	_processText(e, t = !1, n = !0) {
		if (e === "") return [];
		let r = this._helper(e, 0, new l(), t).reduce((e, t) => t.numSkips < e.numSkips ? t : t.numSkips > e.numSkips ? e : t.numPushes < e.numPushes ? t : e), i = new f(n);
		for (let e of r.actions) e.type === "TEXT" ? i.pushString(e.text) : e.type === "PUSH" ? i.push(e.rule, e.matched) : e.type === "POP" ? i.pop(e.matched) : e.type === "REGEX" && i.pushRegex(e.rule, e.match);
		return i.render();
	}
	_helper(e, t, n, r = !1) {
		if (this.minSkips !== null && n.numSkips > this.minSkips) return [];
		if (e === "") return [new l()];
		let i = this._findNext(e, t);
		if (t >= e.length || i.length === 0) return n.stack.length > 0 ? [] : (this.minSkips = Math.min(this.minSkips ?? n.numSkips, n.numSkips), [n.copyAndPush({
			type: "TEXT",
			text: e.slice(t)
		})]);
		let a = [];
		for (let o of i) {
			let i = o.position, s = e.slice(t, i);
			if (!r && n.stack.length > 0 && s.includes("\n")) continue;
			let c = n.copyAndPush({
				type: "TEXT",
				text: s
			});
			if (o.type === "REGEX") i += o.match[0].length, c = c.copyAndPush({
				type: "REGEX",
				rule: o.rule,
				match: o.match
			});
			else if (i += o.matched.length, o.isEnd && n.stack.length > 0 && n.peek() === o.rule) c = c.copyAndPush({
				type: "POP",
				matched: o.matched
			});
			else if (o.isStart) {
				if (o.matched.length === 0) continue;
				c = c.copyAndPush({
					type: "PUSH",
					rule: o.rule,
					matched: o.matched
				});
			} else continue;
			a.push(...this._helper(e, i, c, r));
		}
		let o = i[i.length - 1].position + 1, s = e.slice(t, o);
		if (!r && n.stack.length > 0 && s.includes("\n")) return a;
		let c = 1;
		i.every((e) => e.type === "REGEX" ? e.match[0].length === 0 : e.matched.length === 0) && (c = 0);
		let u = n.copyAndPush({
			type: "TEXT",
			text: s
		}, c);
		return a.push(...this._helper(e, o, u, r)), a;
	}
	_findNext(e, t) {
		let n = [], r = !1;
		for (let i = t; i < e.length; i++) {
			for (let t of this.rule) if (t instanceof s) {
				let r = e.slice(i).match(t.regex);
				r && r.index === 0 && n.push({
					type: "REGEX",
					rule: t,
					position: i,
					match: r
				});
			} else if (!r) {
				let r = t.getStartMatch(e, i), a = t.getEndMatch(e, i);
				if (r !== null || a !== null) {
					let e = r === null ? a || "" : r;
					n.push({
						type: "STYLE",
						rule: t,
						position: i,
						isStart: r !== null,
						isEnd: a !== null,
						matched: e
					});
				}
			}
			if (r = e[i] === "\\" && !r, n.length > 0) return n;
		}
		return [];
	}
};
function d(e) {
	let t = [];
	for (let n of e) {
		let e = n instanceof p && n.rule instanceof c ? n.rule : null;
		if (t.length === 0) t.push({
			rule: e,
			items: [n]
		});
		else {
			let r = t[t.length - 1];
			r.rule === e ? r.items.push(n) : t.push({
				rule: e,
				items: [n]
			});
		}
	}
	return t;
}
var f = class {
	constructor(e = !0) {
		this.escapeHtml = e;
		let t = new c("", (e) => e);
		this.root = new p(null, t, null, "", e), this.curr = this.root;
	}
	escapeHtml;
	root;
	curr;
	push(e, t) {
		let n = new p(this.curr, e, null, t, this.escapeHtml);
		this._push(n), this.curr = n;
	}
	pushRegex(e, t) {
		let n = new p(this.curr, e, t);
		this._push(n);
	}
	pushString(e) {
		e && this._push(e.replace(/\\(.)/gs, "$1"));
	}
	_push(e) {
		this.curr.push(e);
	}
	pop(e) {
		if (this.curr === this.root || this.curr.parent === null) throw Error("Attempted to pop() when already at root");
		this.curr.endMatch = e, this.curr = this.curr.parent;
	}
	render() {
		return this.root.render();
	}
}, p = class {
	constructor(e, t, n = null, r = "", i = !0) {
		this.parent = e, this.rule = t, this.match = n, this.startMatch = r, this.escapeHtml = i, e !== null && e.rule instanceof c && (this.path = [...e.path, e.rule]);
	}
	parent;
	rule;
	match;
	startMatch;
	escapeHtml;
	children = [];
	path = [];
	endMatch = "";
	push(e) {
		this.children.push(e);
	}
	escape(e) {
		return this.escapeHtml ? a(e) : e;
	}
	render() {
		if (this.rule instanceof c) {
			let e = this.rule, t = [];
			for (let e of d(this.children)) {
				let n = e.items.flatMap((e) => typeof e == "string" ? [this.escape(e)] : e.render());
				e.rule && e.rule.wrapConsecutive ? t.push(e.rule.wrapConsecutive(n)) : t.push(...n);
			}
			if (this.parent === null) return t;
			if (this._shouldPrintRaw()) {
				let e = [];
				return this.startMatch && e.push(this.escape(this.startMatch)), e.push(...t), this.endMatch && e.push(this.escape(this.endMatch)), e;
			}
			let n = "", r = "", i = "", a = "";
			e.consumeStart === "INSIDE" ? n = this.escape(this.startMatch) : e.consumeStart === "OUTSIDE" && (r = this.escape(this.startMatch)), e.consumeEnd === "INSIDE" ? a = this.escape(this.endMatch) : e.consumeEnd === "OUTSIDE" && (i = this.escape(this.endMatch));
			let o = [
				...r ? [r] : [],
				...t,
				...i ? [i] : []
			], s = e.transform(o);
			return [
				...n ? [n] : [],
				s,
				...a ? [a] : []
			];
		} else if (this.rule instanceof s) return [this.rule.transform(this.match)];
		throw Error("TextStylerRegexRule provided without a valid `match`");
	}
	_shouldPrintRaw() {
		if (this.rule instanceof s) return !1;
		let e = this.rule, t = e.allowInner;
		return t === "ALLOW" || this.parent === null ? !1 : t === "DISALLOW_DIRECT" ? this.parent.rule === e : t === "DISALLOW_ANCESTOR" ? this.path.includes(e) : !1;
	}
}, m = ({ text: r, config: i, multiline: a = !1 }) => /* @__PURE__ */ n(t, { children: e(() => new u(i), [i]).processText(r, a, !1) });
//#endregion
export { r as ConsumptionStyle, i as InnerStyle, m as StyledText, u as TextStyler, s as TextStylerRegexRule, c as TextStylerRule, o as htmlTag };
