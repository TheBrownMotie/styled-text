import html
import re

from .text_styler import TextStylerRegexRule, TextStylerRule, html_tag


def _escape(match: re.Match[str], group: int = 1) -> str:
    return html.escape(match.group(group), quote=False)


markdown_rules = [
    # Code Blocks & Inline Code
    TextStylerRegexRule(
        re.compile(r"```([\s\S]+?)```"),
        lambda m: f"<pre><code>{_escape(m, 1).strip()}</code></pre>",
    ),
    TextStylerRegexRule(
        re.compile(r"`([^`]+)`"), lambda m: f"<code>{_escape(m, 1)}</code>"
    ),
    # Images & Links
    TextStylerRegexRule(
        re.compile(r"!\[([^\]]*)\]\(([^)]+)\)"),
        lambda m: f"<img src='{_escape(m, 2)}' alt='{_escape(m, 1)}' />",
    ),
    TextStylerRegexRule(
        re.compile(r"\[([^\]]+)\]\(([^)]+)\)"),
        lambda m: f"<a href='{_escape(m, 2)}'>{_escape(m, 1)}</a>",
    ),
    # Headers
    *[
        TextStylerRule(
            start=re.compile(rf"^#{{{level}}}\s+", re.MULTILINE),
            transform=html_tag(f"h{level}"),
            end=re.compile(r"(?=\n|$)\n?"),
        )
        for level in range(6, 0, -1)
    ],
    # Lists
    TextStylerRule(
        start=re.compile(r"^\s*[-*]\s+", re.MULTILINE),
        transform=html_tag("li"),
        end=re.compile(r"(?=\n|$)\n?"),
        wrap_consecutive=html_tag("ul"),
    ),
    TextStylerRule(
        start=re.compile(r"^\s*\d+\.\s+", re.MULTILINE),
        transform=html_tag("li"),
        end=re.compile(r"(?=\n|$)\n?"),
        wrap_consecutive=html_tag("ol"),
    ),
    # Blockquotes
    TextStylerRule(
        start=re.compile(r"^>\s+", re.MULTILINE),
        transform=lambda children: children + "\n",
        end=re.compile(r"(?=\n|$)\n?"),
        wrap_consecutive=html_tag("blockquote"),
    ),
    # Inline Formatting
    TextStylerRule(start="**", transform=html_tag("strong")),
    TextStylerRule(start="__", transform=html_tag("strong")),
    TextStylerRule(start="*", transform=html_tag("em")),
    TextStylerRule(start="_", transform=html_tag("em")),
    TextStylerRule(start="~~", transform=html_tag("del")),
]
