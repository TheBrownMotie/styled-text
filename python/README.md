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

| Rules (in python, typescript is similar)                                                                                                                              | Input                                                                                                                                      | Output                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextStylerRule(start="*", transform=html_tag("strong"))`                                                                                                             | my \*bolded\* text                                                                                                                         | <pre>My <strong>bolded</strong> text</pre>                                                                                                                                      |
| <pre>[<br>&nbsp;&nbsp;TextStylerRule(start="*", transform=html_tag("strong")),<br>&nbsp;&nbsp;TextStylerRule(start="_", transform=html_tag("em"))<br>]</pre>          | my \*bolded and \_italicized\_ text\*                                                                                                      | <pre>My <strong>bolded and <em>italicized</em> text</strong></pre>                                                                                                              |
| <pre>[<br> TextStylerRule(start="~" transform=html_tag("sub")),<br> TextStylerRule(start="~~" transform=html_tag("del"))<br>]</pre>                                   | <pre>Potentially conflicting rules are handled cleanly:<br><br>H~~~3~~2~O<br>A ~~~[sic]~[tyop]~~ typo is...</pre>                          | <pre>Potentially conflicting rules are handled cleanly:<br><br>H<sub><del>3</del>2</sub>O<br>A <del><sub>[sic]</sub>tyop</del> typo is...</pre>                                 |
| <pre>[<br> TextStylerRule(start="*", transform=html_tag("strong")),<br> TextStylerRule(start="_", transform=html_tag("em"))<br>]</pre>                                | Bad formatting is handled cleanly:<br><br>\*there are \*three \_asterisks\*, one underscore<br>overlapping _ rules, \_ first _ one \_ wins | <pre>Bad formatting is handled cleanly:<br><br><strong>there are </strong>three _asterisks\*, one underscore<br>overlapping <strong> rules, _ first </strong> one \_ wins</pre> |
| <pre>TextStylerRegexRule(<br> regex=r"https://\w+.\w+.com",<br> replace=r"<a href='\\g<0>'>\\g<0></a>"<br>)</pre>                                                     | go to <pre>https://www.google.com</pre> and search                                                                                         | <pre>go to <a href='https://www.google.com'>https://www.googl.com</a> and search</pre>                                                                                          |
| <pre>TextStylerRule(<br> start="<!", <br> transform=html_tag("span", {"class": "spoiler"})),<br> end="!>"<br>)</pre>                                                  | different <!start and end!> tags                                                                                                           | <pre>different <span class='spoiler'>start and end</span> tags</pre>                                                                                                            |
| <pre>TextStylerRule(<br> start="\*", <br> transform=html_tag("strong"), <br> consume_start=ConsumptionStyle.OUTER, <br> consume_end=ConsumptionStyle.OUTER<br>)</pre> | the \*asterisks\* are preserved and styled                                                                                                 | <pre>the <strong>\*asterisks\*</strong> are preserved and styled</pre>                                                                                                          |
| <pre>TextStylerRule(<br> start="\*", <br> transform=html_tag("strong"), <br> consume_start=ConsumptionStyle.INNER, <br> consume_end=ConsumptionStyle.INNER<br>)</pre> | the \*asterksis\* are preserved and unstyled                                                                                               | <pre>the \*<strong>asterisks</strong>\* are preserved and unstyled</pre>                                                                                                        |
| <pre>TextStylerRule(<br> start="!", <br> transform=lambda s: s.upper(), <br> consume_end=ConsumptionStyle.OUTER<br>)</pre>                                            | it's not !just! html                                                                                                                       | <pre>it's not JUST! html</pre>                                                                                                                                                  |
