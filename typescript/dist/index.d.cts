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
    wrap_consecutive: ((children: (T | string)[]) => T) | null;
    consume_start: ConsumptionStyle;
    consume_end: ConsumptionStyle;
    allow_inner: InnerStyle;
    private _startRegex;
    private _endRegex;
    constructor(start: string | RegExp, transform: (children: (T | string)[]) => T, options?: {
        end?: string | RegExp | null;
        wrap_consecutive?: (children: (T | string)[]) => T;
        consume_start?: ConsumptionStyle;
        consume_end?: ConsumptionStyle;
        allow_inner?: InnerStyle;
    });
    get_start_match(text: string, pos: number): string | null;
    get_end_match(text: string, pos: number): string | null;
    get_start(): string;
    get_end(): string;
}
type RuleType<T> = TextStylerRule<T> | TextStylerRegexRule<T>;
declare class TextStyler<T> {
    rule: RuleType<T>[];
    private min_skips;
    constructor(rule: RuleType<T>[]);
    processText(text: string, multiline?: boolean): (T | string)[];
    private _process_text;
    private _helper;
    private _find_next;
}

export { type RuleType, TextStyler, TextStylerRegexRule, TextStylerRule, htmlTag };
