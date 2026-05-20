# styled-text (Typescript version)

The Typescript version of the `styled-text` library. Designed for **custom markup transformations**.

This library is for anyone who wants to create styled text **_like_** markdown, but with total **flexibility** to create their own rules.

## Installation

`npm install @brownmotie/styled-text`

## Usage

```typescript
import { TextStyler, TextStylerRule, TextStylerRegexRule, htmlTag} from "../src/text_styler";

// Let's style this text:
const text = "_Welcome_ to _<~my library~>*styled-text*_ version 0.0.1";

// Create the rules (only need to do this once)
const styleRules = [
  new TextStylerRule("*", htmlTag("strong")),
  new TextStylerRule("_", htmlTag("em")),
  new TextStylerRule("<~", htmlTag("del"), {end: "~>"}),
  new TextStylerRegexRule(
    /(\d+\.\d+\.\d+)/,
    (match: RegExpMatchArray) => `<span style='color: red'>${match[1]}</span>`,
  )
];

// Create the styler:
const styler = new TextStyler<string>(styleRules);

// Process text
const html = styler.processText(text).join("");

// `html` looks like this now:
// <em>Welcome</em> to <em><del>my library</del><strong>styled-text</strong></em> version <span style='color: red'>0.0.1</span>
```

## Examples

#### Simple bold
```typescript
new TextStylerRule(*, htmlTag("strong"))
```
Input: `My *bolded* text`<br>
Output (raw): `My <strong>bolded</strong> text`<br>
Output (visual): My <strong>bolded</strong> text<br>

#### Nested bold/italic
```typescript
TextStylerRule('*', html_tag("strong"))
TextStylerRule('_', html_tag("em"))
```
Input: `My *bolded and _italicized_ text*`<br>
Output (raw): `My <strong>bolded and <em>italicized</em> text</strong>`<br>
Output (visual): My <strong>bolded and <em>italicized</em> text</strong><br>

Input: `Three *asterisks* matches* eagerly`<br>
Output (raw): `Three <strong>asterisks</strong> matches* eagerly`<br>
Output (visual): Three <strong>asterisks</strong> matches* eagerly<br>

Input: `Overlapping * tags _ also * matches _ eagerly`<br>
Output (raw): `Overlapping <strong> tags _ also </strong> matches _ eagerly`<br>
Output (visual): Overlapping <strong> tags _ also </strong> matches _ eagerly<br>

#### Nested / Conflicting Tags
Here we show two things:
1. `start` can be multiple characters (`~~` for strikethrough)
2. one rule can be a subset of another, and it still works as expected (`~` for subscript)

```typescript
TextStylerRule("~", html_tag("sub"))
TextStylerRule("~~", html_tag("del"))
```
Input: `H~~~3~~2~O`<br>
Output (raw): `H<sub><del>3</del>2</sub>O`<br>
Output (visual): H<sub><del>3</del>2</sub>O<br>

Input: `A ~~~[sic]~tyop~~ typo is...`<br>
Output (raw): `H<del><sub>[sic]<sub>tyop</del> typo is...`<br>
Output (visual): H<del><sub>[sic]</sub>tyop</del> typo is...<br>

#### Regexes

Regexes are the best way to built a complex replacement strategy, like if you need to parse the inner text into pieces, or use the inner text multiple times, such as in this example, where the matched url is used both as the property `href` and as the link text:

```typescript
TextStylerRegexRule(
  regex=/(https:\/\/www.[^\.]+.com)/,
  replace=(match: RegExpMatchArray) => `<a href='${match[1]}'>${match[1]}</a>`
)
```

Input: `My link https://www.google.com`<br>
Output (raw): `My link <a href='https://www.google.com'>https://www.google.com</a>`<br>
Output (visual): My link <a href='https://www.google.com'>https://www.google.com</a><br>

However, regexes are matched like literal strings, meaning that any styling within them is not matched by any other rules.<br>
For example, even if we included the rule from asterisks to \<strong> that we've used before, it will not use it to match within our regex:

Input: `My link https://www.*google*.com`<br>
Output (raw): `My link <a href='https://www.*google*.com'>https://www.*google*.com</a>`<br>
Output (visual): My link <a href='https://www.*google*.com'>https://www.*google*.com</a><br>

#### Preserving the special characters

By default, the special characters are removed from the output, but they can be preserved on the inside or on the outside:

```typescript
TextStylerRule('*', html_tag("strong"), {
  consume_start: ConsumptionStyle.OUTSIDE,
  consume_end: ConsumptionStyle.OUTSIDE
})
TextStylerRule('_', html_tag("em"), {
  consume_start: ConsumptionStyle.INSIDE,
  consume_end: ConsumptionStyle.INSIDE
})
```

Input: `My *bolded* text, my _italicized_ text`<br>
Output (raw): `My <strong>*bolded*</strong> text, my _<em>italicized</em>_ text`<br>
Output (visual): My <strong>\*bolded\*</strong> text, my \_<em>italicized</em>\_ text<br>

#### Disallowing self-nesting

By default, a rule nesting within itself is allowed, but this can be disabled in two ways:
1. Completely disallowed, at any depth
2. A direct parent-child is disallowed, but grandparent-grandchild (or more distant) is allowed

```typescript
TextStylerRule('*', html_tag("strong"), {
  allow_inner: InnerStyle.DISALLOW_DIRECT,
})
TextStylerRule('^', html_tag("sup"), {
  allow_inner: InnerStyle.DISALLOW_ANCESTOR,
})
TextStylerRule('~', html_tag("sub"), {
  allow_inner: InnerStyle.DISALLOW_DIRECT,
})
```

Input: `Subscript ~cannot exist ~directly~ within subscript, but *can exist ~within~ the bolded* region~`<br>
Output (raw): `Subscript <sub>cannot exist ~directly~ within subscript, but <strong>can exist <sub>within</sub> the bolded</strong> region</sub>`<br>
Output (visual): Subscript <sub>cannot exist \~directly\~ within subscript, but <strong>can exist <sub>within</sub> the bolded</strong> region</sub>`<br>

Input: `Superscript ^of multiple depths is ^disallowed^, *even if we ^wrap^ it in a bolded* region^`<br>
Output (raw): `Superscript <sup>of multiple depths is ^disallowed^, <strong>even if we ^wrap^ it in a bolded</strong> region</sup>`<br>
Output (visual): Superscript <sup>of multiple depths is ^disallowed^, <strong>even if we ^wrap^ it in a bolded</strong> region</sup><br>


## Reference
To use the library, just set up a list of "rules", create a `TextStyler` object, then call `processText`.

| Class / Function | Parameter | Type | Default | Description |
| :--------------- | :-------- | :--- | :------ | :---------- |
|TextStyler|rules|Array|Required|A list of TextStylerRule or TextStylerRegexRule objects.|
|TextStylerRegexRule|regex|string|Required|The regular expression pattern to match.
||replace|(match: RegExpMatchArray): string|Required|The replacement string (supports regex capture groups like \1).
|TextStylerRule<T>|start|string|Required|The marker string that begins the rule.
||transform|(children: (T | string)[]) => T|Required|"Function to process inner content (e.g., html_tag)."
||end|string|start|The marker string that terminates the rule.
||consume_start|ConsumptionType|REPLACE|"Determines if start is included in output (INSIDE, OUTSIDE, REPLACE)."
||consume_end|ConsumptionType|REPLACE|"Determines if end is included in output (INSIDE, OUTSIDE, REPLACE)."
||allow_inner|InnerStyle|ALLOW|"Determines if self-nesting is allowed (ALLOW, DISALLOW_DIRECT, DISALLOW_ANCESTOR)."
|html_tag|name|string|Required|The HTML tag name (e.g., `"strong"`).|
||attrs|Record<string, string>|`{}`|Optional HTML attributes (e.g., `{"class": "my-css-class"}`).|
