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

| Rules (in python, typescript is similar)                                                                                                                        | Input                                                                                                                                      | Output                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextStylerRule(start="*", transform=html_tag("strong"))`                                                                                                       | my \*bolded\* text                                                                                                                         | My <strong>bolded</strong> text                                                                                                                                      |
| `[<br>  TextStylerRule(start="*", transform=html_tag("strong")),<br>  TextStylerRule(start="_", transform=html_tag("em"))<br>]`                                 | my \*bolded and \_italicized\_ text\*                                                                                                      | My <strong>bolded and <em>italicized</em> text</strong>                                                                                                              |
| `[<br>  TextStylerRule(start="~" transform=html_tag("sub")),<br>  TextStylerRule(start="~~" transform=html_tag("del"))<br>]`                                    | Potentially conflicting rules are handled cleanly:<br><br>H~~~3~~2~O<br>A ~~~[sic]~[tyop]~~ typo is...                                     | Potentially conflicting rules are handled cleanly:<br><br>H<sub><del>3</del>2</sub>O<br>A <del><sub>[sic]</sub>tyop</del> typo is...                                 |
| `[<br>  TextStylerRule(start="*", transform=html_tag("strong")),<br>  TextStylerRule(start="_", transform=html_tag("em"))<br>]`                                 | Bad formatting is handled cleanly:<br><br>\*there are \*three \_asterisks\*, one underscore<br>overlapping _ rules, \_ first _ one \_ wins | Bad formatting is handled cleanly:<br><br><strong>there are </strong>three _asterisks\*, one underscore<br>overlapping <strong> rules, _ first </strong> one \_ wins |
| `TextStylerRegexRule(<br>  regex=r"https://\w+.\w+.com",<br>  replace=r"<a href='\g<0>'>\g<0></a>"<br>)`                                                        | go to https://www.google.com and search                                                                                                    | go to <a href='https://www.google.com'>https://www.googl.com</a> and search                                                                                          |
| `TextStylerRule(<br>  start="<!", <br>  transform=html_tag("span", {"class": "spoiler"})),<br>  end="!>"<br>)`                                                  | different <!start and end!> tags                                                                                                           | different <span class='spoiler'>start and end</span> tags                                                                                                            |
| `TextStylerRule(<br>  start="*", <br>  transform=html_tag("strong"), <br>  consume_start=ConsumptionStyle.OUTER, <br>  consume_end=ConsumptionStyle.OUTER<br>)` | the \*asterisks\* are preserved and styled                                                                                                 | the <strong>\*asterisks\*</strong> are preserved and styled                                                                                                          |
| `TextStylerRule(<br>  start="*", <br>  transform=html_tag("strong"), <br>  consume_start=ConsumptionStyle.INNER, <br>  consume_end=ConsumptionStyle.INNER<br>)` | the \*asterksis\* are preserved and unstyled                                                                                               | the \*<strong>asterisks</strong>\* are preserved and unstyled                                                                                                        |
| `TextStylerRule(<br>  start="!", <br>  transform=lambda s: s.upper(), <br>  consume_end=ConsumptionStyle.OUTER<br>)`                                            | it's not !just! html                                                                                                                       | it's not JUST! html                                                                                                                                                  |
