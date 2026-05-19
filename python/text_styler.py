import html
import re
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from re import Match, Pattern, sub
from typing import NamedTuple, override


class ConsumptionStyle(StrEnum):
    REPLACE = "REPLACE"
    OUTSIDE = "OUTSIDE"
    INSIDE = "INSIDE"


class InnerStyle(StrEnum):
    ALLOW = "ALLOW"
    DISALLOW_DIRECT = "DISALLOW_DIRECT"
    DISALLOW_ANCESTOR = "DISALLOW_ANCESTOR"


@dataclass
class TextStylerRegexConfig:
    regex: Pattern[str]
    replace: str


def html_tag(
    tag: str, attributes: dict[str, str] | None = None, auto_close_empty: bool = True
) -> Callable[[str], str]:
    attrs = "".join(f" {k}='{v}'" for k, v in attributes.items()) if attributes else ""
    start = f"{tag}{attrs}"
    return lambda text: (
        f"<{start} />" if auto_close_empty and not text else f"<{start}>{text}</{tag}>"
    )


@dataclass
class TextStylerConfig:
    start: str
    transform: Callable[[str], str]
    end: str | None = None

    consume_start: ConsumptionStyle = ConsumptionStyle.REPLACE
    consume_end: ConsumptionStyle = ConsumptionStyle.REPLACE
    allow_inner: InnerStyle = InnerStyle.ALLOW

    def get_end(self) -> str:
        return html.escape(self.end or self.start)

    def get_start(self) -> str:
        return html.escape(self.start)

    def get_wrappers(self) -> tuple[str, str, str, str]:
        outer_prefix, inner_prefix, inner_suffix, outer_suffix = "", "", "", ""
        if self.consume_start == ConsumptionStyle.INSIDE:
            outer_prefix = self.get_end()
        if self.consume_start == ConsumptionStyle.OUTSIDE:
            inner_prefix = self.get_start()

        if self.consume_end == ConsumptionStyle.INSIDE:
            outer_suffix = self.get_end()
        if self.consume_end == ConsumptionStyle.OUTSIDE:
            inner_suffix = self.get_end()
        return (outer_prefix, inner_prefix, inner_suffix, outer_suffix)


@dataclass
class TextAction:
    text: str


@dataclass
class PushAction:
    config: TextStylerConfig


@dataclass
class PopAction:
    pass


@dataclass
class RegexAction:
    config: TextStylerRegexConfig
    match: re.Match[str]


# Used in _find_next
class NextStyle(NamedTuple):
    config: TextStylerConfig
    position: int
    is_start: bool
    is_end: bool


class NextRegex(NamedTuple):
    config: TextStylerRegexConfig
    position: int
    match: Match[str]


type Action = TextAction | PushAction | PopAction | RegexAction


@dataclass(frozen=True)
class Path:
    actions: tuple[Action, ...] = ()
    stack: tuple[TextStylerConfig, ...] = ()
    num_skips: int = 0

    @property
    def num_pushes(self) -> int:
        return sum(1 for a in self.actions if isinstance(a, (PushAction, RegexAction)))

    def peek(self) -> TextStylerConfig | None:
        return self.stack[-1] if len(self.stack) > 0 else None

    def copy_and_push(self, action: Action, extra_skip: int = 0) -> Path:
        new_actions = self.actions
        if not isinstance(action, TextAction) or action.text:
            new_actions += (action,)

        if isinstance(action, PushAction):
            new_stack = self.stack + (action.config,)
        elif isinstance(action, PopAction):
            new_stack = self.stack[:-1]
        else:
            new_stack = self.stack

        return Path(new_actions, new_stack, self.num_skips + extra_skip)


class TextStyler:
    def __init__(self, config: list[TextStylerConfig | TextStylerRegexConfig]):
        self.config: list[TextStylerConfig | TextStylerRegexConfig] = config
        self.min_skips: int | None = None

    def process_text(self, text: str, multiline: bool = False):
        self.min_skips = None
        if multiline:
            return self._process_text(text)
        return "".join(map(self._process_text, re.findall(r".*?\n|.+", text)))

    def _process_text(self, text: str) -> str:
        if text == "":
            return text
        text = html.escape(text, quote=False)
        paths = self._helper(text, 0, Path())

        # First we pick the paths with the lowest skipped markings (memoization already pruned out most of these)
        # Then tie-break to the fewest blocks created
        best_path = min(paths, key=lambda p: (p.num_skips, p.num_pushes))

        # Build the tree
        ast = SyntaxTree()
        for action in best_path.actions:
            if isinstance(action, TextAction):
                ast.push_str(action.text)
            elif isinstance(action, PushAction):
                ast.push(action.config)
            elif isinstance(action, PopAction):
                ast.pop()
            else:
                ast.push_regex(action.config, action.match)

        return str(ast)

    def _helper(self, text: str, start: int, path: Path) -> list[Path]:
        if self.min_skips is not None and path.num_skips > self.min_skips:
            return []
        if text == "":
            return [Path()]

        # Get the next token(s)
        nexts = self._find_next(text, start)

        # Base case, if there aren't any more tokens, return success or fail
        if start >= len(text) or len(nexts) == 0:
            if len(path.stack) > 0:
                return []
            self.min_skips = min(self.min_skips or path.num_skips, path.num_skips)
            return [path.copy_and_push(TextAction(text[start:]))]

        paths: list[Path] = []
        for next in nexts:
            new_start = next.position
            new_path = path.copy_and_push(TextAction(text[start:new_start]))

            if isinstance(next, NextRegex):
                new_start += len(next.match.group(0))
                new_path = new_path.copy_and_push(RegexAction(next.config, next.match))
            else:
                config, _, is_start, is_end = next
                new_start += len(config.get_start() if is_start else config.get_end())
                if is_end and len(path.stack) > 0 and path.peek() == config:
                    new_path = new_path.copy_and_push(PopAction())
                elif is_start:
                    new_path = new_path.copy_and_push(PushAction(config))
                # else is_end but the top of the stack doesn't match? new_start moves forward but stack stays the same

            paths.extend(self._helper(text, new_start, new_path))

        # Fallback branch: skip the current set of tokens entirely
        new_start = nexts[-1].position + 1
        new_path = path.copy_and_push(TextAction(text[start:new_start]), 1)
        paths.extend(self._helper(text, new_start, new_path))
        return paths

    def _find_next(self, text: str, start: int) -> list[NextStyle | NextRegex]:
        nexts: list[NextStyle | NextRegex] = []
        escaped = False
        for index in range(start, len(text)):
            for marking in self.config:
                if isinstance(marking, TextStylerRegexConfig):
                    if match := marking.regex.match(text, index):
                        nexts.append(NextRegex(marking, index, match))
                elif not escaped:
                    is_start = text.startswith(marking.get_start(), index)
                    is_end = text.startswith(marking.get_end(), index)
                    if is_start or is_end:
                        nexts.append(NextStyle(marking, index, is_start, is_end))

            escaped = text[index] == "\\" and not escaped
            if len(nexts) > 0:
                return nexts
        return []


class SyntaxTree:
    def __init__(self):
        self.children: list[SyntaxTreeNode | str] = []
        self.curr: SyntaxTreeNode | None = None

    def push(self, matched: TextStylerConfig):
        new_node = SyntaxTreeNode(self.curr, matched)
        self._push(new_node)
        self.curr = new_node

    def push_regex(self, matched: TextStylerRegexConfig, match: re.Match[str]):
        new_node = SyntaxTreeNode(self.curr, matched, match)
        self._push(new_node)

    def push_str(self, text: str):
        if text:
            self._push(re.sub(r"\\(.)", r"\1", text))

    def _push(self, node: SyntaxTreeNode | str):
        if self.curr is None:
            self.children.append(node)
        else:
            self.curr.push(node)

    def pop(self):
        if self.curr is None:
            raise ValueError("Attempted to pop() when already at root")
        self.curr = self.curr.parent

    @override
    def __str__(self) -> str:
        return "".join(map(str, self.children))


class SyntaxTreeNode:
    def __init__(
        self,
        parent: SyntaxTreeNode | None,
        matched: TextStylerConfig | TextStylerRegexConfig,
        match: re.Match[str] | None = None,
    ):
        self.parent: SyntaxTreeNode | None = parent
        self.matched: TextStylerConfig | TextStylerRegexConfig = matched
        self.match: re.Match[str] | None = match

        self.children: list[str | SyntaxTreeNode] = []
        self.path: tuple[TextStylerConfig, ...] = ()
        if parent is not None and isinstance(parent.matched, TextStylerConfig):
            self.path = parent.path + (parent.matched,)

    def push(self, child: str | SyntaxTreeNode):
        self.children.append(child)

    @override
    def __str__(self):
        if isinstance(self.matched, TextStylerConfig):
            inner = "".join(map(str, self.children))
            if self._should_print_raw():
                return self.matched.get_start() + inner + self.matched.get_end()

            outer_prefix, inner_prefix, inner_suffix, outer_suffix = (
                self.matched.get_wrappers()
            )
            inner = inner_prefix + inner + inner_suffix
            return outer_prefix + self.matched.transform(inner) + outer_suffix
        elif self.match is not None:
            return sub(self.matched.regex, self.matched.replace, self.match.group(0))
        raise ValueError("TextStylerRegexConfig provided without a valid `match`")

    def _should_print_raw(self) -> bool:
        if isinstance(self.matched, TextStylerRegexConfig):
            return False

        allow_inner: InnerStyle = self.matched.allow_inner
        if allow_inner == InnerStyle.ALLOW or self.parent is None:
            return False
        if allow_inner == InnerStyle.DISALLOW_DIRECT:
            return self.parent.matched == self.matched
        if allow_inner == InnerStyle.DISALLOW_ANCESTOR:
            return self.matched in self.path
