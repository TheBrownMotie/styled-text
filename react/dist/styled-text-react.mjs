import { useMemo as e } from "react";
import { Fragment as t, jsx as n } from "react/jsx-runtime";
//#region ../typescript/dist/index.js
function r(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function i(e, t, n = !0) {
	let r = `${e}${t ? Object.entries(t).map(([e, t]) => ` ${e}='${t}'`).join("") : ""}`;
	return (t) => {
		let i = t.join("");
		return n && !i ? `<${r} />` : `<${r}>${i}</${e}>`;
	};
}
var a = class {
	constructor(e, t) {
		this.regex = e, this.transform = t;
	}
	regex;
	transform;
}, o = class {
	start;
	transform;
	end;
	wrap_consecutive;
	consume_start;
	consume_end;
	allow_inner;
	_startRegex = null;
	_endRegex = null;
	constructor(e, t, n) {
		this.start = e, this.transform = t, this.end = n?.end ?? null, this.wrap_consecutive = n?.wrap_consecutive ?? null, this.consume_start = n?.consume_start ?? "REPLACE", this.consume_end = n?.consume_end ?? "REPLACE", this.allow_inner = n?.allow_inner ?? "ALLOW", this.start instanceof RegExp && (this._startRegex = new RegExp(this.start.source, this.start.flags.includes("g") ? this.start.flags : this.start.flags + "g")), this.end instanceof RegExp && (this._endRegex = new RegExp(this.end.source, this.end.flags.includes("g") ? this.end.flags : this.end.flags + "g"));
	}
	get_start_match(e, t) {
		if (typeof this.start == "string") {
			let n = this.get_start();
			return e.startsWith(n, t) ? n : null;
		}
		if (this._startRegex) {
			this._startRegex.lastIndex = t;
			let n = this._startRegex.exec(e);
			return n && n.index === t ? n[0] : null;
		}
		return null;
	}
	get_end_match(e, t) {
		let n = this.end === null ? this.start : this.end;
		if (typeof n == "string") {
			let i = r(n);
			return e.startsWith(i, t) ? i : null;
		}
		let i = this.end === null ? this._startRegex : this._endRegex;
		if (i) {
			i.lastIndex = t;
			let n = i.exec(e);
			return n && n.index === t ? n[0] : null;
		}
		return null;
	}
	get_start() {
		return typeof this.start == "string" ? r(this.start) : "";
	}
	get_end() {
		let e = this.end === null ? this.start : this.end;
		return typeof e == "string" ? r(e) : "";
	}
}, s = class e {
	constructor(e = [], t = [], n = 0) {
		this.actions = e, this.stack = t, this.num_skips = n;
	}
	actions;
	stack;
	num_skips;
	get num_pushes() {
		return this.actions.filter((e) => e.type === "PUSH" || e.type === "REGEX").length;
	}
	peek() {
		return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
	}
	copy_and_push(t, n = 0) {
		let r = [...this.actions];
		(t.type !== "TEXT" || t.text !== "") && r.push(t);
		let i = this.stack;
		return t.type === "PUSH" ? i = [...this.stack, t.rule] : t.type === "POP" && (i = this.stack.slice(0, -1)), new e(r, i, this.num_skips + n);
	}
}, c = class {
	rule;
	min_skips = null;
	constructor(e) {
		this.rule = e;
	}
	processText(e, t = !1) {
		this.min_skips = null;
		let n = !e.endsWith("\n"), r = n ? e + "\n" : e, i = this._process_text(r, t);
		if (n && i.length > 0) {
			let e = i[i.length - 1];
			typeof e == "string" && (i[i.length - 1] = e.replace(/\n$/, ""));
		}
		return i;
	}
	_process_text(e, t = !1) {
		if (e === "") return [];
		e = r(e);
		let n = this._helper(e, 0, new s(), t).reduce((e, t) => t.num_skips < e.num_skips ? t : t.num_skips > e.num_skips ? e : t.num_pushes < e.num_pushes ? t : e), i = new u();
		for (let e of n.actions) e.type === "TEXT" ? i.push_str(e.text) : e.type === "PUSH" ? i.push(e.rule, e.matched) : e.type === "POP" ? i.pop(e.matched) : e.type === "REGEX" && i.push_regex(e.rule, e.match);
		return i.render();
	}
	_helper(e, t, n, r = !1) {
		if (this.min_skips !== null && n.num_skips > this.min_skips) return [];
		if (e === "") return [new s()];
		let i = this._find_next(e, t);
		if (t >= e.length || i.length === 0) return n.stack.length > 0 ? [] : (this.min_skips = Math.min(this.min_skips ?? n.num_skips, n.num_skips), [n.copy_and_push({
			type: "TEXT",
			text: e.slice(t)
		})]);
		let a = [];
		for (let o of i) {
			let i = o.position, s = e.slice(t, i);
			if (!r && n.stack.length > 0 && s.includes("\n")) continue;
			let c = n.copy_and_push({
				type: "TEXT",
				text: s
			});
			if (o.type === "REGEX") i += o.match[0].length, c = c.copy_and_push({
				type: "REGEX",
				rule: o.rule,
				match: o.match
			});
			else if (i += o.matched.length, o.is_end && n.stack.length > 0 && n.peek() === o.rule) c = c.copy_and_push({
				type: "POP",
				matched: o.matched
			});
			else if (o.is_start) {
				if (o.matched.length === 0) continue;
				c = c.copy_and_push({
					type: "PUSH",
					rule: o.rule,
					matched: o.matched
				});
			} else continue;
			a.push(...this._helper(e, i, c, r));
		}
		let o = i[i.length - 1].position + 1, c = e.slice(t, o);
		if (!r && n.stack.length > 0 && c.includes("\n")) return a;
		let l = 1;
		i.every((e) => e.type === "REGEX" ? e.match[0].length === 0 : e.matched.length === 0) && (l = 0);
		let u = n.copy_and_push({
			type: "TEXT",
			text: c
		}, l);
		return a.push(...this._helper(e, o, u, r)), a;
	}
	_find_next(e, t) {
		let n = [], r = !1;
		for (let i = t; i < e.length; i++) {
			for (let t of this.rule) if (t instanceof a) {
				let r = e.slice(i).match(t.regex);
				r && r.index === 0 && n.push({
					type: "REGEX",
					rule: t,
					position: i,
					match: r
				});
			} else if (!r) {
				let r = t.get_start_match(e, i), a = t.get_end_match(e, i);
				if (r !== null || a !== null) {
					let e = r === null ? a || "" : r;
					n.push({
						type: "STYLE",
						rule: t,
						position: i,
						is_start: r !== null,
						is_end: a !== null,
						matched: e
					});
				}
			}
			if (r = e[i] === "\\" && !r, n.length > 0) return n;
		}
		return [];
	}
};
function l(e) {
	let t = [];
	for (let n of e) {
		let e = n instanceof d && n.rule instanceof o ? n.rule : null;
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
var u = class {
	root;
	curr;
	constructor() {
		let e = new o("", (e) => e);
		this.root = new d(null, e, null, ""), this.curr = this.root;
	}
	push(e, t) {
		let n = new d(this.curr, e, null, t);
		this._push(n), this.curr = n;
	}
	push_regex(e, t) {
		let n = new d(this.curr, e, t);
		this._push(n);
	}
	push_str(e) {
		e && this._push(e.replace(/\\(.)/gs, "$1"));
	}
	_push(e) {
		this.curr.push(e);
	}
	pop(e) {
		if (this.curr === this.root || this.curr.parent === null) throw Error("Attempted to pop() when already at root");
		this.curr.end_match = e, this.curr = this.curr.parent;
	}
	render() {
		return this.root.render();
	}
}, d = class {
	constructor(e, t, n = null, r = "") {
		this.parent = e, this.rule = t, this.match = n, this.start_match = r, e !== null && e.rule instanceof o && (this.path = [...e.path, e.rule]);
	}
	parent;
	rule;
	match;
	start_match;
	children = [];
	path = [];
	end_match = "";
	push(e) {
		this.children.push(e);
	}
	render() {
		if (this.rule instanceof o) {
			let e = this.rule, t = [];
			for (let e of l(this.children)) {
				let n = e.items.flatMap((e) => typeof e == "string" ? [e] : e.render());
				e.rule && e.rule.wrap_consecutive ? t.push(e.rule.wrap_consecutive(n)) : t.push(...n);
			}
			if (this.parent === null) return t;
			if (this._should_print_raw()) {
				let e = [];
				return this.start_match && e.push(this.start_match), e.push(...t), this.end_match && e.push(this.end_match), e;
			}
			let n = "", r = "", i = "", a = "";
			e.consume_start === "INSIDE" ? n = this.start_match : e.consume_start === "OUTSIDE" && (r = this.start_match), e.consume_end === "INSIDE" ? a = this.end_match : e.consume_end === "OUTSIDE" && (i = this.end_match);
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
		} else if (this.rule instanceof a) return [this.rule.transform(this.match)];
		throw Error("TextStylerRegexRule provided without a valid `match`");
	}
	_should_print_raw() {
		if (this.rule instanceof a) return !1;
		let e = this.rule, t = e.allow_inner;
		return t === "ALLOW" || this.parent === null ? !1 : t === "DISALLOW_DIRECT" ? this.parent.rule === e : t === "DISALLOW_ANCESTOR" ? this.path.includes(e) : !1;
	}
}, f = ({ text: r, config: i, multiline: a = !1 }) => /* @__PURE__ */ n(t, { children: e(() => new c(i), [i]).processText(r, a) });
//#endregion
export { f as StyledText, c as TextStyler, a as TextStylerRegexRule, o as TextStylerRule, i as htmlTag };
