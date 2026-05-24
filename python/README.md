# styled-text (Python version)

The Python version of the `styled-text` library. Designed for **custom markup transformations**.

This library is for anyone who wants to create styled text **_like_** markdown, but with total **flexibility** to create their own rules.

## Installation

`pip install styled-text`
This is a fantastic opportunity to showcase what makes your library incredibly powerful. The most unique and valuable aspects of your engine are the **Markdown parser (out of the box)**, the **robust lookaround regex capabilities (context-aware)**, and the **advanced hierarchical nested matching** (which naive string-replacement regex completely fails at).

Here is a highly realistic, professional `README.md` Usage section that highlights all of those features simultaneously.

---

## Usage

`styled-text` isn't just a markdown parser; it is a full AST (Abstract Syntax Tree) generator. You can build complex, nested, context-aware transpilers that go far beyond standard Regex search-and-replace.

It's not just for producing html/xml; since you define the transformations, it can output anything you want. Here are some simple examples for html, LaTeX, and ANSI.

### HTML

Let's build a custom Discord-style chat formatter:

```python
import re
from styled_text.text_styler import (
    TextStyler,
    TextStylerRule,
    TextStylerRegexRule,
    html_tag,
    ConsumptionStyle
)

# Let's create our custom syntax rules:
discord_rules = [
    # Basic matching (matches symmetrically, i.e. **bold**)
    TextStylerRule(start="**", transform=html_tag("strong")),

    TextStylerRule(
        start="||",
        end="||",
        transform=html_tag("span", {"class": "spoiler"})
    ),

    # Context-aware regex lookbehinds
    # (Matches "@username", but ONLY if preceded by whitespace or start of line)
    TextStylerRegexRule(
        regex=re.compile(r"(?<=^| )@([a-zA-Z0-9_]+)"),
        transform=lambda match: f"<a href='/users/{match.group(1)}'>@{match.group(1)}</a>"
    ),

    # (Transforms custom internal links `[[page]]` without consuming the brackets)
    # Two things being demonstrated here:
    #  1. We leave the tags in the output instead of consuming them
    #  2. The end tag is different from the start tag
    TextStylerRule(
        start="[[",
        end="]]",
        consume_start=ConsumptionStyle.OUTSIDE, # Leaves [[ in the output
        consume_end=ConsumptionStyle.OUTSIDE,   # Leaves ]] in the output
        transform=lambda text: f"<a href='/wiki/{text}'>{text}</a>"
    )
]

# Process it:
styler = TextStyler(discord_rules)
message = "Hello @admin, here is the **||[[Secret Code]]||**!"
html = styler.process_text(message)

# Output:
# Hello <a href='/users/admin'>@admin</a>, here is the <strong><span class='spoiler'>[[<a href='/wiki/Secret Code'>Secret Code</a>]]</span></strong>!
```

### Out-of-the-Box Markdown

`styled-text` also provides a pre-defined Markdown ruleset. It supports headers, bold, italics, lists, quotes, inline code, blocks, and images!

Since it's just a list of rules, it's easy to modify, and a useful reference for how the library can be used.

```python
from styled_text.markdown import markdown_rules
from styled_text.text_styler import TextStyler

styler = TextStyler(markdown_rules)

html = styler.process_text("""
# Welcome!
This is **bold** and *italic*.

- Item 1
- Item 2
""", multiline=True)

```

### LaTeX

`styled-text` is not just an HTML tool, it is a general tool to transpile from **anything** to **anything** else. Here's a short example for producing LaTeX:

```python
import re
from styled_text.text_styler import TextStyler, TextStylerRule, TextStylerRegexRule

latex_rules = [
    # Convert bold to \textbf{}
    TextStylerRule(
        start="**",
        transform=lambda text: f"\\textbf{{{text}}}"
    ),
    # Convert quotes to LaTeX blockquotes
    TextStylerRule(
        start=re.compile(r"^>\s+", re.MULTILINE),
        end=re.compile(r"(?=\n|$)\n?"),
        transform=lambda text: f"\\begin{{quote}}\n{text}\n\\end{{quote}}"
    ),
    # Convert an internal [[reference]] to a LaTeX \cite{}
    TextStylerRegexRule(
        regex=re.compile(r"\[\[(.*?)\]\]"),
        transform=lambda match: f"\\cite{{{match.group(1)}}}"
    )
]

styler = TextStyler(latex_rules)

academic_text = """
The study found that **performance increased** dramatically [[smith2023]].
> "The caching layer was the bottleneck."
"""

# Make sure to disable escape_html
latex_output = styler.process_text(academic_text, multiline=True, escape_html=False)

print(latex_output)
```

### ANSI color codes for a CLI tool

And here's an example to convert to ANSI color codes:

```python
from styled_text.text_styler import TextStyler, TextStylerRule

# Standard terminal ANSI escape codes
class ANSI:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    ITALIC = "\033[3m"
    RED = "\033[91m"
    CYAN = "\033[96m"

terminal_rules = [
    # Map Markdown-style stars to ANSI Bold/Italic
    TextStylerRule(
        start="**",
        transform=lambda text: f"{ANSI.BOLD}{text}{ANSI.RESET}"
    ),
    TextStylerRule(
        start="*",
        transform=lambda text: f"{ANSI.ITALIC}{text}{ANSI.RESET}"
    ),
    # Map BBCode-style tags to ANSI Colors
    TextStylerRule(
        start="[red]",
        end="[/red]",
        transform=lambda text: f"{ANSI.RED}{text}{ANSI.RESET}"
    ),
    TextStylerRule(
        start="[cyan]",
        end="[/cyan]",
        transform=lambda text: f"{ANSI.CYAN}{text}{ANSI.RESET}"
    ),
]

styler = TextStyler(terminal_rules)

raw_text = "CLI output can be **bold**, *italic*, or [red]colored[/red]! Nesting works for [cyan]**bold cyan**[/cyan] text too."

# Make sure to disable escape_html
cli_output = styler.process_text(raw_text, escape_html=False)

print(cli_output)
```

### Why use `styled-text` instead of raw Regex?

If you tried to parse the string above using standard `.replace()` or standard global regex, nested tags (`||...||`) frequently overlap and corrupt each other, lookbehinds fail when preceding characters are sliced, XSS vulnerabilities are a constant concern, and if you have multiple regexes, the order you apply them will drastically affect the output.

`styled-text` safely evaluates the string hierarchically (converting it to an Abstract Syntax Tree first), uses memoization and dynamic programming for performance (`$O(N)`), and safely escapes HTML characters before output.

## Examples

#### Simple bold

```python
TextStylerRule(
  start='*',
  transform=html_tag("strong")
)
```

Input: `My *bolded* text`<br>
Output (raw): `My <strong>bolded</strong> text`<br>
Output (visual): My <strong>bolded</strong> text<br>

#### Nested bold/italic

```python
TextStylerRule(
  start='*',
  transform=html_tag("strong")
),
TextStylerRule(
  start='_',
  transform=html_tag("em")
)
```

Input: `My *bolded and _italicized_ text*`<br>
Output (raw): `My <strong>bolded and <em>italicized</em> text</strong>`<br>
Output (visual): My <strong>bolded and <em>italicized</em> text</strong><br>

Input: `Three *asterisks* matches* eagerly`<br>
Output (raw): `Three <strong>asterisks</strong> matches* eagerly`<br>
Output (visual): Three <strong>asterisks</strong> matches\* eagerly<br>

Input: `Overlapping * tags _ also * matches _ eagerly`<br>
Output (raw): `Overlapping <strong> tags _ also </strong> matches _ eagerly`<br>
Output (visual): Overlapping <strong> tags _ also </strong> matches _ eagerly<br>

#### Nested / Conflicting Tags

Here we show two things:

1. `start` can be multiple characters (`~~` for strikethrough)
2. one rule can be a subset of another, and it still works as expected (`~` for subscript)

```python
TextStylerRule(
  start="~",
  transform=html_tag("sub")
),
TextStylerRule(
  start="~~",
  transform=html_tag("del")
)
```

Input: `H~~~3~~2~O`<br>
Output (raw): `H<sub><del>3</del>2</sub>O`<br>
Output (visual): H<sub><del>3</del>2</sub>O<br>

Input: `A ~~~[sic]~tyop~~ typo is...`<br>
Output (raw): `H<del><sub>[sic]<sub>tyop</del> typo is...`<br>
Output (visual): H<del><sub>[sic]</sub>tyop</del> typo is...<br>

#### Regexes

Regexes are the best way to built a complex replacement strategy, like if you need to parse the inner text into pieces, or use the inner text multiple times, such as in this example, where the matched url is used both as the property `href` and as the link text:

```python
TextStylerRegexRule(
  regex=re.compile(r"https://www.[^\.]+.com),
  replace=r"<a href='\\g<0>'>\\g<0></a>"
)
```

Input: `My link https://www.google.com`<br>
Output (raw): `My link <a href='https://www.google.com'>https://www.google.com</a>`<br>
Output (visual): My link <a href='https://www.google.com'>https://www.google.com</a><br>

However, regexes are matched like literal strings, meaning that any styling within them is not matched by any other rules.<br>
For example, even if we included the rule from asterisks to \<strong> that we've used before, it will not use it to match within our regex:

Input: `My link https://www.*google*.com`<br>
Output (raw): `My link <a href='https://www.*google*.com'>https://www.*google*.com</a>`<br>
Output (visual): My link <a href='https://www.*google*.com'>https://www._google_.com</a><br>

#### Preserving the special characters

By default, the special characters are removed from the output, but they can be preserved on the inside or on the outside:

```python
TextStylerRule(
  start='*',
  transform=html_tag("strong"),
  consume_start=ConsumptionStyle.OUTSIDE,
  consume_end=ConsumptionStyle.OUTSIDE,
),
TextStylerRule(
  start='_',
  transform=html_tag("em")
  consume_start=ConsumptionStyle.INSIDE,
  consume_end=ConsumptionStyle.INSIDE,
)
```

Input: `My *bolded* text, my _italicized_ text`<br>
Output (raw): `My <strong>*bolded*</strong> text, my _<em>italicized</em>_ text`<br>
Output (visual): My <strong>\*bolded\*</strong> text, my \_<em>italicized</em>\_ text<br>

#### Disallowing self-nesting

By default, a rule nesting within itself is allowed, but this can be disabled in two ways:

1. Completely disallowed, at any depth
2. A direct parent-child is disallowed, but grandparent-grandchild (or more distant) is allowed

```python
TextStylerRule(
  start='*',
  transform=html_tag("strong"),
  allow_inner=InnerStyle.DISALLOW_DIRECT,
),
TextStylerRule(
  start='^',
  transform=html_tag("sup")
  allow_inner=InnerStyle.DISALLOW_ANCESTOR,
),
TextStylerRule(
  start='~',
  transform=html_tag("sub")
  allow_inner=InnerStyle.DISALLOW_DIRECT,
)
```

Input: `Subscript ~cannot exist ~directly~ within subscript, but *can exist ~within~ the bolded* region~`<br>
Output (raw): `Subscript <sub>cannot exist ~directly~ within subscript, but <strong>can exist <sub>within</sub> the bolded</strong> region</sub>`<br>
Output (visual): Subscript <sub>cannot exist \~directly\~ within subscript, but <strong>can exist <sub>within</sub> the bolded</strong> region</sub>`<br>

Input: `Superscript ^of multiple depths is ^disallowed^, *even if we ^wrap^ it in a bolded* region^`<br>
Output (raw): `Superscript <sup>of multiple depths is ^disallowed^, <strong>even if we ^wrap^ it in a bolded</strong> region</sup>`<br>
Output (visual): Superscript <sup>of multiple depths is ^disallowed^, <strong>even if we ^wrap^ it in a bolded</strong> region</sup><br>

## Reference

To use the library, just set up a list of "rules", create a `TextStyler` object, then call `process_text`.

| Class / Function    | Parameter     | Type               | Default  | Description                                                                          |
| :------------------ | :------------ | :----------------- | :------- | :----------------------------------------------------------------------------------- |
| TextStyler          | rules         | list               | Required | A list of TextStylerRule or TextStylerRegexRule objects.                             |
| TextStylerRegexRule | regex         | str                | Required | The regular expression pattern to match.                                             |
|                     | replace       | str                | Required | The replacement string (supports regex capture groups like \1).                      |
| TextStylerRule      | start         | str                | Required | The marker string that begins the rule.                                              |
|                     | transform     | Callable[str, str] | Required | "Function to process inner content (e.g., html_tag)."                                |
|                     | end           | str                | start    | The marker string that terminates the rule.                                          |
|                     | consume_start | ConsumptionType    | REPLACE  | "Determines if start is included in output (INSIDE, OUTSIDE, REPLACE)."              |
|                     | consume_end   | ConsumptionType    | REPLACE  | "Determines if end is included in output (INSIDE, OUTSIDE, REPLACE)."                |
|                     | allow_inner   | InnerStyle         | ALLOW    | "Determines if self-nesting is allowed (ALLOW, DISALLOW_DIRECT, DISALLOW_ANCESTOR)." |
| html_tag            | name          | str                | Required | The HTML tag name (e.g., `"strong"`).                                                |
|                     | attrs         | dict               | `{}`     | Optional HTML attributes (e.g., `{"class": "my-css-class"}`).                        |
