# styled-text (Typescript version)

The Typescript version of the `styled-text` library. Designed for **custom markup transformations**.

This library is for anyone who wants to create styled text **_like_** markdown, but with total **flexibility** to create their own rules.

## Installation

`npm install @brownmotie/styled-text`

## Usage

`styled-text` isn't just a markdown parser; it is a full AST (Abstract Syntax Tree) generator. You can build complex, nested, context-aware transpilers that go far beyond standard Regex search-and-replace.

It's not just for producing html/xml; since you define the transformations, it can output anything you want. Here are some simple examples for HTML, LaTeX, and ANSI.

### HTML

Let's build a custom Discord-style chat formatter:

```typescript
import {
  TextStyler,
  TextStylerRule,
  TextStylerRegexRule,
  htmlTag
} from "styled-text"; // Adjust import to match your package name

// Let's create our custom syntax rules:
const discordRules = [
  // Basic matching (matches symmetrically, i.e. **bold**)
  new TextStylerRule("**", htmlTag("strong")),

  new TextStylerRule("||", htmlTag("span", { class: "spoiler" }), {
    end: "||"
  }),

  // Context-aware regex lookbehinds
  // (Matches "@username", but ONLY if preceded by whitespace or start of line)
  new TextStylerRegexRule(
    /(?<=^| )@([a-zA-Z0-9_]+)/,
    (match) => `<a href='/users/${match[1]}'>@${match[1]}</a>`
  ),

  // (Transforms custom internal links `[[page]]` without consuming the brackets)
  // Two things being demonstrated here:
  //  1. We leave the tags in the output instead of consuming them
  //  2. The end tag is different from the start tag
  new TextStylerRule(
    "[[",
    (children) => {
      const text = children.join("");
      return `<a href='/wiki/${text}'>${text}</a>`;
    },
    {
      end: "]]",
      consumeStart: "OUTSIDE", // Leaves [[ in the output
      consumeEnd: "OUTSIDE",   // Leaves ]] in the output
    }
  )
];

// Process it:
const styler = new TextStyler(discordRules);
const message = "Hello @admin, here is the **||[[Secret Code]]||**!";

// processText returns an array of strings/React nodes, so we join them
const html = styler.processText(message).join("");

// Output:
// Hello <a href='/users/admin'>@admin</a>, here is the <strong><span class='spoiler'>[[<a href='/wiki/Secret Code'>Secret Code</a>]]</span></strong>!

```

### Out-of-the-Box Markdown

`styled-text` also provides a pre-defined Markdown ruleset. It supports headers, bold, italics, lists, quotes, inline code, blocks, and images!

Since it's just a list of rules, it's easy to modify, and a useful reference for how the library can be used.

```typescript
import { TextStyler } from "styled-text";
import { markdownRules } from "styled-text/markdown";

const styler = new TextStyler(markdownRules);

const text = `
# Welcome!
This is **bold** and *italic*.

- Item 1
- Item 2
`;

styler.processText(text, multiline, escapeHtml)
const html = styler.processText(text, true).join("");

```

### LaTeX

`styled-text` is not just an HTML tool, it is a general tool to transpile from **anything** to **anything** else. Here's a short example for producing LaTeX:

```typescript
import { TextStyler, TextStylerRule, TextStylerRegexRule } from "styled-text";

const latexRules = [
  // Convert bold to \textbf{}
  new TextStylerRule("**", (children) => `\\textbf{${children.join("")}}`),
  
  // Convert quotes to LaTeX blockquotes
  new TextStylerRule(
    /^>\s+/m,
    (children) => `\\begin{quote}\n${children.join("")}\n\\end{quote}`,
    { end: /(?=\n|$)\n?/ }
  ),
  
  // Convert an internal [[reference]] to a LaTeX \cite{}
  new TextStylerRegexRule(
    /\[\[(.*?)\]\]/,
    (match) => `\\cite{${match[1]}}`
  )
];

const styler = new TextStyler(latexRules);

const academicText = `
The study found that **performance increased** dramatically [[smith2023]].
> "The caching layer was the bottleneck."
`;

// Make sure to disable escapeHtml
const latexOutput = styler.processText(academicText, true, false).join("");

console.log(latexOutput);
// Prints:
// The study found that \textbf{performance increased} dramatically \cite{smith2023}.
// \begin{quote}
// "The caching layer was the bottleneck."
// \end{quote}

```

### ANSI color codes for a CLI tool

And here's an example to convert to ANSI color codes:

```typescript
import { TextStyler, TextStylerRule } from "styled-text";

// Standard terminal ANSI escape codes (using hex \x1b for JS strict mode compatibility)
const ANSI = {
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  ITALIC: "\x1b[3m",
  RED: "\x1b[91m",
  CYAN: "\x1b[96m"
};

const terminalRules = [
  // Map Markdown-style stars to ANSI Bold/Italic
  new TextStylerRule("**", (children) => `${ANSI.BOLD}${children.join("")}${ANSI.RESET}`),
  new TextStylerRule("*", (children) => `${ANSI.ITALIC}${children.join("")}${ANSI.RESET}`),
  
  // Map BBCode-style tags to ANSI Colors
  new TextStylerRule("[red]", (children) => `${ANSI.RED}${children.join("")}${ANSI.RESET}`, { end: "[/red]" }),
  new TextStylerRule("[cyan]", (children) => `${ANSI.CYAN}${children.join("")}${ANSI.RESET}`, { end: "[/cyan]" })
];

const styler = new TextStyler(terminalRules);

const rawText = "CLI output can be **bold**, *italic*, or [red]colored[/red]! Nesting works for [cyan]**bold cyan**[/cyan] text too.";

// Make sure to disable escapeHtml
const cliOutput = styler.processText(rawText, false, false).join("");

console.log(cliOutput);

```

### Why use `styled-text` instead of raw Regex?

If you tried to parse the string above using standard `.replace()` or standard global regex, nested tags (`||...||`) frequently overlap and corrupt each other, lookbehinds fail when preceding characters are sliced, XSS vulnerabilities are a constant concern, and if you have multiple regexes, the order you apply them will drastically affect the output.

`styled-text` safely evaluates the string hierarchically (converting it to an Abstract Syntax Tree first), uses memoization and dynamic programming for performance (O(N)), and safely escapes HTML characters before output.

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
