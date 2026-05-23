declare enum ConsumptionStyle {
    REPLACE = "REPLACE",
    OUTSIDE = "OUTSIDE",
    INSIDE = "INSIDE"
}
declare enum InnerStyle {
    ALLOW = "ALLOW",
    DISALLOW_DIRECT = "DISALLOW_DIRECT",
    DISALLOW_ANCESTOR = "DISALLOW_ANCESTOR"
}
declare function htmlTag(tag: string, attributes?: Record<string, string>, autoCloseEmpty?: boolean): (children: (string | any)[]) => string;
declare class TextStylerRegexRule<T> {
    regex: RegExp;
    transform: (match: RegExpMatchArray) => T;
    constructor(regex: RegExp, transform: (match: RegExpMatchArray) => T);
}
declare class TextStylerRule<T> {
    start: string | RegExp;
    transform: (children: (T | string)[]) => T;
    end: string | RegExp | null;
    wrapConsecutive: ((children: (T | string)[]) => T) | null;
    consumeStart: ConsumptionStyle;
    consumeEnd: ConsumptionStyle;
    allowInner: InnerStyle;
    private _startRegex;
    private _endRegex;
    constructor(start: string | RegExp, transform: (children: (T | string)[]) => T, options?: {
        end?: string | RegExp | null;
        wrapConsecutive?: (children: (T | string)[]) => T;
        consumeStart?: ConsumptionStyle;
        consumeEnd?: ConsumptionStyle;
        allowInner?: InnerStyle;
    });
    getStartMatch(text: string, pos: number): string | null;
    getEndMatch(text: string, pos: number): string | null;
    getStart(): string;
    getEnd(): string;
}
type RuleType<T> = TextStylerRule<T> | TextStylerRegexRule<T>;
declare class TextStyler<T> {
    rule: RuleType<T>[];
    private minSkips;
    constructor(rule: RuleType<T>[]);
    processText(text: string, multiline?: boolean, escapeHtml?: boolean): (T | string)[];
    private _processText;
    private _helper;
    private _findNext;
}

export { ConsumptionStyle, InnerStyle, type RuleType, TextStyler, TextStylerRegexRule, TextStylerRule, htmlTag };
