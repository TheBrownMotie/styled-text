# styled-text (Python version)

The Python engine for `styled-text`. Designed for high-speed regex processing and custom markup transformations.

## Installation

`pip install styled-text`

## Usage

```python
from styled_text import TextStyler, TextStylerConfig, html_tag

styler = TextStyler([
    TextStylerConfig(start="*", transform=html_tag("strong")),
    TextStylerConfig(start="_", transform=html_tag("em"))
])

# Process text
html = styler.process_text("Hello *bold* and _italic_")
```

## Examples

| Rules (in python, typescript is similar)                                                                                                                                                                              | Input                                                                                                                                      | Output                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong")<br>)</pre>                                                                                                                | my \*bolded\* text                                                                                                                         | My <strong>bolded</strong> text                                                                                                                                      |
| <pre><br>&nbsp;&nbsp;TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html*tag("strong")<br>),<br>TextStylerRule(<br>&nbsp;&nbsp;start="*",<br>&nbsp;&nbsp;transform=html_tag("em")<br>)<br></pre> | my \*bolded and \_italicized\_ text\*                                                                                                      | My <strong>bolded and <em>italicized</em> text</strong>                                                                                                              |
| <pre><br>TextStylerRule(<br>&nbsp;&nbsp;start="~",<br>&nbsp;&nbsp;transform=html_tag("sub")<br>),<br>TextStylerRule(<br>&nbsp;&nbsp;start="~~",<br>&nbsp;&nbsp;transform=html_tag("del")<br>)<br></pre>               | Potentially conflicting rules are handled cleanly:<br><br>H\~\~\~3\~\~2\~O<br>A \~\~\~[sic]\~[tyop]\~\~ typo is...                         | Potentially conflicting rules are handled cleanly:<br><br>H<sub><del>3</del>2</sub>O<br>A <del><sub>[sic]</sub>tyop</del> typo is...                                 |
| <pre><br>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html*tag("strong")<br>),<br>TextStylerRule(<br>&nbsp;&nbsp;start="*",<br>&nbsp;&nbsp;transform=html_tag("em")<br>)<br></pre>             | Bad formatting is handled cleanly:<br><br>\*there are \*three \_asterisks\*, one underscore<br>overlapping _ rules, \_ first _ one \_ wins | Bad formatting is handled cleanly:<br><br><strong>there are </strong>three _asterisks\*, one underscore<br>overlapping <strong> rules, _ first </strong> one \_ wins |
| <pre>TextStylerRegexRule(<br>regex=r"https://\w+.\w+.com",<br> replace=r"<a href='\\g<0>'>\\g<0></a>"<br>)</pre>                                                                                                      | go to https://www.google.com and search                                                                                                    | go to <a href='https://www.google.com'>https://www.googl.com</a> and search                                                                                          |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="<!",<br>&nbsp;&nbsp;transform=html_tag("span", {"class": "spoiler"})),<br>&nbsp;&nbsp;end="!>"<br>)</pre>                                                                  | different <!start and end!> tags                                                                                                           | different <span class='spoiler'>start and end</span> tags                                                                                                            |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong"),<br>&nbsp;&nbsp;consume_start=ConsumptionStyle.OUTER,<br>&nbsp;&nbsp;consume_end=ConsumptionStyle.OUTER<br>)</pre>        | the \*asterisks\* are preserved and styled                                                                                                 | the <strong>\*asterisks\*</strong> are preserved and styled                                                                                                          |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="\*",<br>&nbsp;&nbsp;transform=html_tag("strong"),<br>&nbsp;&nbsp;consume_start=ConsumptionStyle.INNER,<br>&nbsp;&nbsp;consume_end=ConsumptionStyle.INNER<br>)</pre>        | the \*asterksis\* are preserved and unstyled                                                                                               | the \*<strong>asterisks</strong>\* are preserved and unstyled                                                                                                        |
| <pre>TextStylerRule(<br>&nbsp;&nbsp;start="!",<br>&nbsp;&nbsp;transform=lambda s: s.upper(),<br>&nbsp;&nbsp;consume_end=ConsumptionStyle.OUTER<br>)</pre>                                                             | it's not !just! html                                                                                                                       | it's not JUST! html                                                                                                                                                  |
