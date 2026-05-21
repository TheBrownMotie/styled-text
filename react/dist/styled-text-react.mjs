import { useMemo as e } from "react";
//#region \0rolldown/runtime.js
var t = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), n = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(e, { get: (e, t) => (typeof require < "u" ? require : e)[t] }) : e)(function(e) {
	if (typeof require < "u") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + e + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
});
//#endregion
//#region ../typescript/dist/index.js
function r(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
var i = class {
	constructor(e, t) {
		this.regex = e, this.transform = t;
	}
	regex;
	transform;
}, a = class {
	start;
	transform;
	end;
	consume_start;
	consume_end;
	allow_inner;
	constructor(e, t, n) {
		this.start = e, this.transform = t, this.end = n?.end ?? null, this.consume_start = n?.consume_start ?? "REPLACE", this.consume_end = n?.consume_end ?? "REPLACE", this.allow_inner = n?.allow_inner ?? "ALLOW";
	}
	get_end() {
		return r(this.end || this.start);
	}
	get_start() {
		return r(this.start);
	}
	get_wrappers() {
		let e = "", t = "", n = "", r = "";
		return this.consume_start === "INSIDE" && (e = this.get_end()), this.consume_start === "OUTSIDE" && (t = this.get_start()), this.consume_end === "INSIDE" && (r = this.get_end()), this.consume_end === "OUTSIDE" && (n = this.get_end()), [
			e,
			t,
			n,
			r
		];
	}
}, o = class e {
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
}, s = class {
	rule;
	min_skips = null;
	constructor(e) {
		this.rule = e;
	}
	processText(e, t = !1) {
		return this.min_skips = null, t ? this._process_text(e) : (e.match(/.*?\n|.+/g) || []).flatMap((e) => this._process_text(e));
	}
	_process_text(e) {
		if (e === "") return [];
		e = r(e);
		let t = this._helper(e, 0, new o()).reduce((e, t) => t.num_skips < e.num_skips ? t : t.num_skips > e.num_skips ? e : t.num_pushes < e.num_pushes ? t : e), n = new c();
		for (let e of t.actions) e.type === "TEXT" ? n.push_str(e.text) : e.type === "PUSH" ? n.push(e.rule) : e.type === "POP" ? n.pop() : e.type === "REGEX" && n.push_regex(e.rule, e.match);
		return n.render();
	}
	_helper(e, t, n) {
		if (this.min_skips !== null && n.num_skips > this.min_skips) return [];
		if (e === "") return [new o()];
		let r = this._find_next(e, t);
		if (t >= e.length || r.length === 0) return n.stack.length > 0 ? [] : (this.min_skips = Math.min(this.min_skips ?? n.num_skips, n.num_skips), [n.copy_and_push({
			type: "TEXT",
			text: e.slice(t)
		})]);
		let i = [];
		for (let a of r) {
			let r = a.position, o = n.copy_and_push({
				type: "TEXT",
				text: e.slice(t, r)
			});
			a.type === "REGEX" ? (r += a.match[0].length, o = o.copy_and_push({
				type: "REGEX",
				rule: a.rule,
				match: a.match
			})) : (r += a.is_start ? a.rule.get_start().length : a.rule.get_end().length, a.is_end && n.stack.length > 0 && n.peek() === a.rule ? o = o.copy_and_push({ type: "POP" }) : a.is_start && (o = o.copy_and_push({
				type: "PUSH",
				rule: a.rule
			}))), i.push(...this._helper(e, r, o));
		}
		let a = r[r.length - 1].position + 1, s = n.copy_and_push({
			type: "TEXT",
			text: e.slice(t, a)
		}, 1);
		return i.push(...this._helper(e, a, s)), i;
	}
	_find_next(e, t) {
		let n = [], r = !1;
		for (let a = t; a < e.length; a++) {
			for (let t of this.rule) if (t instanceof i) {
				let r = e.slice(a).match(t.regex);
				r && r.index === 0 && n.push({
					type: "REGEX",
					rule: t,
					position: a,
					match: r
				});
			} else if (!r) {
				let r = e.startsWith(t.get_start(), a), i = e.startsWith(t.get_end(), a);
				(r || i) && n.push({
					type: "STYLE",
					rule: t,
					position: a,
					is_start: r,
					is_end: i
				});
			}
			if (r = e[a] === "\\" && !r, n.length > 0) return n;
		}
		return [];
	}
}, c = class {
	children = [];
	curr = null;
	push(e) {
		let t = new l(this.curr, e);
		this._push(t), this.curr = t;
	}
	push_regex(e, t) {
		let n = new l(this.curr, e, t);
		this._push(n);
	}
	push_str(e) {
		e && this._push(e.replace(/\\(.)/gs, "$1"));
	}
	_push(e) {
		this.curr === null ? this.children.push(e) : this.curr.push(e);
	}
	pop() {
		if (this.curr === null) throw Error("Attempted to pop() when already at root");
		this.curr = this.curr.parent;
	}
	render() {
		return this.children.flatMap((e) => typeof e == "string" ? [e] : e.render());
	}
}, l = class {
	constructor(e, t, n = null) {
		this.parent = e, this.rule = t, this.match = n, e !== null && e.rule instanceof a && (this.path = [...e.path, e.rule]);
	}
	parent;
	rule;
	match;
	children = [];
	path = [];
	push(e) {
		this.children.push(e);
	}
	render() {
		if (this.rule instanceof a) {
			let e = this.rule, t = this.children.flatMap((e) => typeof e == "string" ? [e] : e.render());
			if (this._should_print_raw()) return [
				e.get_start(),
				...t,
				e.get_end()
			];
			let [n, r, i, a] = e.get_wrappers(), o = [
				...r ? [r] : [],
				...t,
				...i ? [i] : []
			], s = e.transform(o);
			return [
				...n ? [n] : [],
				s,
				...a ? [a] : []
			];
		} else if (this.rule instanceof i) return [this.rule.transform(this.match)];
		throw Error("TextStylerRegexRule provided without a valid `match`");
	}
	_should_print_raw() {
		if (this.rule instanceof i) return !1;
		let e = this.rule.allow_inner;
		return e === "ALLOW" || this.parent === null ? !1 : e === "DISALLOW_DIRECT" ? this.parent.rule === this.rule : e === "DISALLOW_ANCESTOR" ? this.path.includes(this.rule) : !1;
	}
}, u = /* @__PURE__ */ t(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
	function r(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.Fragment = n, e.jsx = r, e.jsxs = r;
})), d = /* @__PURE__ */ t(((e) => {
	process.env.NODE_ENV !== "production" && (function() {
		function t(e) {
			if (e == null) return null;
			if (typeof e == "function") return e.$$typeof === k ? null : e.displayName || e.name || null;
			if (typeof e == "string") return e;
			switch (e) {
				case v: return "Fragment";
				case b: return "Profiler";
				case y: return "StrictMode";
				case w: return "Suspense";
				case T: return "SuspenseList";
				case O: return "Activity";
			}
			if (typeof e == "object") switch (typeof e.tag == "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), e.$$typeof) {
				case _: return "Portal";
				case S: return e.displayName || "Context";
				case x: return (e._context.displayName || "Context") + ".Consumer";
				case C:
					var n = e.render;
					return e = e.displayName, e ||= (e = n.displayName || n.name || "", e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
				case E: return n = e.displayName || null, n === null ? t(e.type) || "Memo" : n;
				case D:
					n = e._payload, e = e._init;
					try {
						return t(e(n));
					} catch {}
			}
			return null;
		}
		function r(e) {
			return "" + e;
		}
		function i(e) {
			try {
				r(e);
				var t = !1;
			} catch {
				t = !0;
			}
			if (t) {
				t = console;
				var n = t.error, i = typeof Symbol == "function" && Symbol.toStringTag && e[Symbol.toStringTag] || e.constructor.name || "Object";
				return n.call(t, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", i), r(e);
			}
		}
		function a(e) {
			if (e === v) return "<>";
			if (typeof e == "object" && e && e.$$typeof === D) return "<...>";
			try {
				var n = t(e);
				return n ? "<" + n + ">" : "<...>";
			} catch {
				return "<...>";
			}
		}
		function o() {
			var e = A.A;
			return e === null ? null : e.getOwner();
		}
		function s() {
			return Error("react-stack-top-frame");
		}
		function c(e) {
			if (j.call(e, "key")) {
				var t = Object.getOwnPropertyDescriptor(e, "key").get;
				if (t && t.isReactWarning) return !1;
			}
			return e.key !== void 0;
		}
		function l(e, t) {
			function n() {
				P || (P = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", t));
			}
			n.isReactWarning = !0, Object.defineProperty(e, "key", {
				get: n,
				configurable: !0
			});
		}
		function u() {
			var e = t(this.type);
			return F[e] || (F[e] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.")), e = this.props.ref, e === void 0 ? null : e;
		}
		function d(e, t, n, r, i, a) {
			var o = n.ref;
			return e = {
				$$typeof: g,
				type: e,
				key: t,
				props: n,
				_owner: r
			}, (o === void 0 ? null : o) === null ? Object.defineProperty(e, "ref", {
				enumerable: !1,
				value: null
			}) : Object.defineProperty(e, "ref", {
				enumerable: !1,
				get: u
			}), e._store = {}, Object.defineProperty(e._store, "validated", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: 0
			}), Object.defineProperty(e, "_debugInfo", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: null
			}), Object.defineProperty(e, "_debugStack", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: i
			}), Object.defineProperty(e, "_debugTask", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: a
			}), Object.freeze && (Object.freeze(e.props), Object.freeze(e)), e;
		}
		function f(e, n, r, a, s, u) {
			var f = n.children;
			if (f !== void 0) if (a) if (M(f)) {
				for (a = 0; a < f.length; a++) p(f[a]);
				Object.freeze && Object.freeze(f);
			} else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
			else p(f);
			if (j.call(n, "key")) {
				f = t(e);
				var m = Object.keys(n).filter(function(e) {
					return e !== "key";
				});
				a = 0 < m.length ? "{key: someKey, " + m.join(": ..., ") + ": ...}" : "{key: someKey}", R[f + a] || (m = 0 < m.length ? "{" + m.join(": ..., ") + ": ...}" : "{}", console.error("A props object containing a \"key\" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />", a, f, m, f), R[f + a] = !0);
			}
			if (f = null, r !== void 0 && (i(r), f = "" + r), c(n) && (i(n.key), f = "" + n.key), "key" in n) for (var h in r = {}, n) h !== "key" && (r[h] = n[h]);
			else r = n;
			return f && l(r, typeof e == "function" ? e.displayName || e.name || "Unknown" : e), d(e, f, r, o(), s, u);
		}
		function p(e) {
			m(e) ? e._store && (e._store.validated = 1) : typeof e == "object" && e && e.$$typeof === D && (e._payload.status === "fulfilled" ? m(e._payload.value) && e._payload.value._store && (e._payload.value._store.validated = 1) : e._store && (e._store.validated = 1));
		}
		function m(e) {
			return typeof e == "object" && !!e && e.$$typeof === g;
		}
		var h = n("react"), g = Symbol.for("react.transitional.element"), _ = Symbol.for("react.portal"), v = Symbol.for("react.fragment"), y = Symbol.for("react.strict_mode"), b = Symbol.for("react.profiler"), x = Symbol.for("react.consumer"), S = Symbol.for("react.context"), C = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), T = Symbol.for("react.suspense_list"), E = Symbol.for("react.memo"), D = Symbol.for("react.lazy"), O = Symbol.for("react.activity"), k = Symbol.for("react.client.reference"), A = h.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, j = Object.prototype.hasOwnProperty, M = Array.isArray, N = console.createTask ? console.createTask : function() {
			return null;
		};
		h = { react_stack_bottom_frame: function(e) {
			return e();
		} };
		var P, F = {}, I = h.react_stack_bottom_frame.bind(h, s)(), L = N(a(s)), R = {};
		e.Fragment = v, e.jsx = function(e, t, n) {
			var r = 1e4 > A.recentlyCreatedOwnerStacks++;
			return f(e, t, n, !1, r ? Error("react-stack-top-frame") : I, r ? N(a(e)) : L);
		}, e.jsxs = function(e, t, n) {
			var r = 1e4 > A.recentlyCreatedOwnerStacks++;
			return f(e, t, n, !0, r ? Error("react-stack-top-frame") : I, r ? N(a(e)) : L);
		};
	})();
})), f = (/* @__PURE__ */ t(((e, t) => {
	process.env.NODE_ENV === "production" ? t.exports = u() : t.exports = d();
})))(), p = ({ text: t, config: n, multiline: r = !1 }) => /* @__PURE__ */ (0, f.jsx)(f.Fragment, { children: e(() => new s(n), [n]).processText(t, r) });
//#endregion
export { p as StyledText };
