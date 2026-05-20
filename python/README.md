# styled-text (Python version)

The Python engine for `styled-text`. Designed for custom markup transformations.

## Installation

`pip install styled-text`

## Usage

```python
import re

from text_styler import TextStyler, TextStylerRegexRule, TextStylerRule, html_tag

styler = TextStyler(
    [
        TextStylerRule(start="*", transform=html_tag("strong")),
        TextStylerRule(start="_", transform=html_tag("em")),
        TextStylerRule(start="<~", transform=html_tag("del"), end="~>"),
        TextStylerRegexRule(
            regex=re.compile(r"(\d+\.\d+\.\d+)"),
            replace=r"<span style='color: red'>\1</span>",
        ),
    ]
)

# Process text
html = styler.process_text(
    "_Welcome_ to _<~my library~>*styled-text*_ version 0.0.1"
)
print(html)
# Prints:
# <em>Welcome</em> to <em><del>my library</del><strong>styled-text</strong></em> version <span style='color: red'>0.0.1</span>
```

## Examples

| Rules                                                                                                                                                                                                                      | Input                                                                                                                                          | Output (Raw)                                                                                                                                                                 | Output (Visual)                                                                                                                                                            |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong")<br>)</pre>                                                                                                                     | my \*bolded\* text                                                                                                                             | My \<strong>bolded\</strong> text                                                                                                                                            | My <strong>bolded</strong> text                                                                                                                                            |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong")<br>),<br>TextStylerRule(<br>&nbsp;&nbsp;start="\_",<br>&nbsp;&nbsp;transform=html_tag("em")<br>)<br></pre>                     | my \*bolded and \_italicized\_ text\*                                                                                                          | My \<strong>bolded and \<em>italicized\</em> text\</strong>                                                                                                                  | My <strong>bolded and <em>italicized</em> text</strong>                                                                                                                    |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="~",<br>&nbsp;&nbsp;transform=html_tag("sub")<br>),<br>TextStylerRule(<br>&nbsp;&nbsp;start="~~",<br>&nbsp;&nbsp;transform=html_tag("del")<br>)<br></pre>                        | Potentially conflicting rules are handled cleanly:<br><br>H\~\~\~3\~\~2\~O<br><br>A \~\~\~[sic]\~[tyop]\~\~ typo is...                         | Potentially conflicting rules are handled cleanly:<br><br>H\<sub>\<del>3\</del>2\</sub>O<br><br>A \<del>\<sub>[sic]\</sub>tyop\</del> typo is...                             | Potentially conflicting rules are handled cleanly:<br><br>H<sub><del>3</del>2</sub>O<br><br>A <del><sub>[sic]</sub>tyop</del> typo is...                                   |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong")<br>),<br>TextStylerRule(<br>&nbsp;&nbsp;start="\_",<br>&nbsp;&nbsp;transform=html_tag("em")<br>)<br></pre>                     | Bad formatting is handled cleanly:<br><br>\*there are \*three \_asterisks\*, one underscore<br><br>overlapping _ rules, \_ first _ one \_ wins | Bad formatting is handled cleanly:<br><br>\<strong>there are \</strong>three _asterisks\*, one underscore<br><br>overlapping \<strong> rules, _ first \</strong> one \_ wins | Bad formatting is handled cleanly:<br><br><strong>there are </strong>three \_asterisks\*, one underscore<br><br>overlapping <strong> rules, \_ first </strong> one \_ wins |
| <pre>TextStylerRegexRule(<br>&nbsp;&nbsp;regex=r"https://\w+.\w+.com",<br> replace=r"<a href='\\g<0>'>\\g<0></a>"<br>)</pre>                                                                                               | go to https://www.google.com and search                                                                                                        | go to <a href='https://www.google.com'>https://www.google.com\</a> and search                                                                                                | go to <a href='https://www.google.com'>https://www.google.com</a> and search                                                                                               |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="<!",<br>&nbsp;&nbsp;transform=html_tag(<br>&nbsp;&nbsp;&nbsp;&nbsp;"span",<br>&nbsp;&nbsp;&nbsp;&nbsp;{"class": "spoiler"}<br>&nbsp;&nbsp;),<br>&nbsp;&nbsp;end="!>"<br>)</pre> | different <!start and end!> tags                                                                                                               | different \<span class='spoiler'>start and end\</span> tags                                                                                                                  | different <span class='spoiler'>start and end</span> tags                                                                                                                  |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong"),<br>&nbsp;&nbsp;consume_start=ConsumptionStyle.OUTER,<br>&nbsp;&nbsp;consume_end=ConsumptionStyle.OUTER<br>)</pre>             | the \*asterisks\* are preserved and styled                                                                                                     | the \<strong>\*asterisks\*\</strong> are preserved and styled                                                                                                                | the <strong>\*asterisks\*</strong> are preserved and styled                                                                                                                |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong"),<br>&nbsp;&nbsp;consume_start=ConsumptionStyle.INNER,<br>&nbsp;&nbsp;consume_end=ConsumptionStyle.INNER<br>)</pre>             | the \*asterisks\* are preserved and unstyled                                                                                                   | the \*\<strong>asterisks\</strong>\* are preserved and unstyled                                                                                                              | the \*<strong>asterisks</strong>\* are preserved and unstyled                                                                                                              |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="!",<br>&nbsp;&nbsp;transform=lambda s: s.upper(),<br>&nbsp;&nbsp;consume_end=ConsumptionStyle.OUTER<br>)</pre>                                                                  | it's not !just! html                                                                                                                           | it's not JUST! html                                                                                                                                                          | it's not JUST! html                                                                                                                                                        |
