import html
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import StrEnum
from re import Match, Pattern, sub
from typing import Literal, override


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
    tag: str, attributes: dict[str, str] | None = None
) -> Callable[[str], str]:
    attrs = "".join(f" {k}='{v}'" for k, v in attributes.items()) if attributes else ""
    return lambda text: f"<{tag}{attrs}>{text}</{tag}>"


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


default_config: list[TextStylerConfig | TextStylerRegexConfig] = [
    TextStylerConfig(start="~~", transform=html_tag("del")),
    TextStylerConfig(start="~", transform=html_tag("sub")),
    TextStylerConfig(start="*", transform=html_tag("strong")),
    TextStylerConfig(start="_", transform=html_tag("em")),
    TextStylerConfig(start="<!", transform=html_tag("spoiler"), end="!>"),
    TextStylerConfig(start="&gt;", transform=html_tag("blockquote"), end="\n"),
]


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


type Action = TextAction | PushAction | PopAction | RegexAction


@dataclass
class Path:
    actions: list[Action] = field(default_factory=list)
    num_pushes: int = 0
    num_pops: int = 0
    num_skips: int = 0

    def copy_and_push(self, action: Action) -> Path:
        new_actions = self.actions.copy()
        if not isinstance(action, TextAction) or action.text:
            new_actions.append(action)

        if isinstance(action, PushAction) or isinstance(action, RegexAction):
            return Path(new_actions, self.num_pushes + 1, self.num_pops, self.num_skips)
        elif isinstance(action, PopAction):
            return Path(new_actions, self.num_pushes, self.num_pops + 1, self.num_skips)
        return Path(new_actions, self.num_pushes, self.num_pops, self.num_skips)


class TextStyler:
    def __init__(
        self, config: list[TextStylerConfig | TextStylerRegexConfig] | None = None
    ):
        if config is None:
            config = default_config
        self.config: list[TextStylerConfig | TextStylerRegexConfig] = config
        self.recursive_calls: int = 0
        self.min_skips: int | None = None

    def _find_next(
        self, text: str, start: int
    ) -> list[
        tuple[
            TextStylerConfig | TextStylerRegexConfig, int, bool, bool, Match[str] | None
        ]
    ]:
        next_markings: list[
            tuple[
                TextStylerConfig | TextStylerRegexConfig,
                int,
                bool,
                bool,
                Match[str] | None,
            ]
        ] = []
        for index in range(start, len(text)):
            found = False
            for marking in self.config:
                if isinstance(marking, TextStylerRegexConfig):
                    if match := marking.regex.match(text, index):
                        next_markings.append((marking, index, False, False, match))
                        found = True
                else:
                    is_start = text.startswith(marking.get_start(), index)
                    is_end = text.startswith(marking.get_end(), index)
                    if is_start or is_end:
                        next_markings.append((marking, index, is_start, is_end, None))
                        found = True

            if found:
                return next_markings
        return next_markings

    def _helper(
        self,
        text: str,
        start: int,
        path: Path,
        stack: list[TextStylerConfig],
        skips: int = 0,
    ) -> list[tuple[Path, int]]:
        self.recursive_calls += 1

        if self.min_skips is not None and skips > self.min_skips:
            return []

        if text == "":
            return [(Path(), skips)]

        nexts = self._find_next(text, start)

        if start >= len(text) or len(nexts) == 0:
            if len(stack) == 0:
                self.min_skips = (
                    min(self.min_skips, skips) if self.min_skips is not None else skips
                )
                return [(path.copy_and_push(TextAction(text[start:])), skips)]
            else:
                return []

        nexts = sorted(nexts, key=lambda i: i[1])
        paths: list[tuple[Path, int]] = []
        last_index: int | None = None
        current_skips = skips

        for config, index, is_start, is_end, match in nexts:
            if last_index is not None and index > last_index:
                current_skips += 1

            new_path = path.copy_and_push(TextAction(text[start:index]))
            new_path.num_skips = current_skips
            new_stack = stack.copy()
            new_start = index

            if isinstance(config, TextStylerRegexConfig):
                if not match:
                    raise ValueError("Match is missing from a regex")
                new_start += len(match.group(0))
                new_path = new_path.copy_and_push(RegexAction(config, match))
            else:
                is_at_top = len(new_stack) == 0
                peek_tag = new_stack[-1] if not is_at_top else None
                if is_at_top:
                    if is_start:
                        new_path = new_path.copy_and_push(PushAction(config))
                        new_stack.append(config)
                        new_start += len(config.get_start())
                    else:
                        new_start += len(config.get_end())
                else:
                    if is_end and peek_tag == config:
                        new_path = new_path.copy_and_push(PopAction())
                        new_stack.pop()
                        new_start += len(config.get_end())
                    elif is_start:
                        new_path = new_path.copy_and_push(PushAction(config))
                        new_stack.append(config)
                        new_start += len(config.get_start())

            last_index = index
            if not new_path:
                raise ValueError("Shouldn't reach here")

            paths.extend(
                self._helper(text, new_start, new_path, new_stack, current_skips)
            )

        # Fallback branch: skip the current set of tokens entirely
        most_index = nexts[-1][1] + 1
        current_skips += 1
        new_path = path.copy_and_push(TextAction(text[start:most_index]))
        new_path.num_skips = current_skips
        paths.extend(
            self._helper(text, most_index, new_path, stack.copy(), current_skips)
        )

        return paths

    def _process_text(self, text: str) -> str:
        if text == "":
            return text
        text = html.escape(text, quote=False)
        paths = self._helper(text, 0, Path(), [])
        print("HELLO")
        print(paths)
        # First we pick the paths with the lowest skipped markings (memoization already pruned out most of these)
        least_skips = min(map(lambda path: path[0].num_skips, paths))
        winning_paths = [path[0] for path in paths if path[1] == least_skips]
        # Tie-break to the fewest blocks
        realized_trees: list[SyntaxTree] = []
        for path in winning_paths:
            ast = SyntaxTree()
            for action in path.actions:
                if isinstance(action, TextAction):
                    ast.push_str(action.text)
                elif isinstance(action, PushAction):
                    ast.push(action.config)
                elif isinstance(action, PopAction):
                    ast.pop()
                else:
                    ast.push_regex(action.config, action.match)
            realized_trees.append(ast)

        realized_trees = sorted(realized_trees, key=lambda tree: str(tree).count("<"))
        winning_tree = realized_trees[0]

        # Returns the finalized evaluated string
        return str(winning_tree)

    def process_text(self, text: str, multiline: bool = False):
        self.recursive_calls = 0
        self.min_skips = None
        texts = [text]
        if multiline:
            return self._process_text(text)

        texts = re.findall(r".*?\n|.+", text)
        texts = map(self._process_text, texts)
        text = "".join(texts)
        return text


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
            self._push(text)

    def _push(self, node: SyntaxTreeNode | str):
        if self.curr is None:
            self.children.append(node)
        else:
            self.curr.children.append(node)

    def pop(self):
        if self.curr is None:
            raise ValueError("Attempted to pop() when already at root")
        self.curr = self.curr.parent

    def peek(self) -> TextStylerConfig | None:
        if self.curr is None or not isinstance(self.curr.matched, TextStylerConfig):
            return None
        return self.curr.matched

    def copy(self) -> SyntaxTree:
        ast = SyntaxTree()
        children_copy: list[str | SyntaxTreeNode] = []
        found = None
        for child in self.children:
            if isinstance(child, str):
                children_copy.append(child)
            else:
                child_copy, searched = child.copy(None, self.curr)
                found = searched if searched is not None else found
                children_copy.append(child_copy)
        ast.children = children_copy
        ast.curr = found
        return ast

    def at_top_of_stack(self):
        return self.curr is None

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
        self.children: list[str | SyntaxTreeNode] = []
        self.match: re.Match[str] | None = match

    def current_path(self) -> list[TextStylerConfig | TextStylerRegexConfig]:
        stack: list[TextStylerConfig | TextStylerRegexConfig] = []
        curr = self
        while curr is not None:
            stack.append(curr.matched)
            curr = curr.parent
        return stack

    def copy(
        self, parent: SyntaxTreeNode | None, search: SyntaxTreeNode | None
    ) -> tuple[SyntaxTreeNode, SyntaxTreeNode | None]:
        children_copy: list[str | SyntaxTreeNode] = []
        found = None
        node = SyntaxTreeNode(parent, self.matched, self.match)
        for child in self.children:
            if isinstance(child, str):
                children_copy.append(child)
            else:
                child_copy, searched = child.copy(node, search)
                found = searched if searched is not None else found
                children_copy.append(child_copy)

        node.children = children_copy
        if self == search:
            if found is not None and search is not None:
                raise ValueError("How was I found twice?")
            found = node

        return node, found

    def _should_print_raw(self) -> bool:
        if isinstance(self.matched, TextStylerRegexConfig):
            return False

        allow_inner: InnerStyle = self.matched.allow_inner
        if allow_inner == InnerStyle.ALLOW or self.parent is None:
            return False
        if allow_inner == InnerStyle.DISALLOW_DIRECT:
            return self.parent.matched == self.matched
        if allow_inner == InnerStyle.DISALLOW_ANCESTOR:
            curr = self.parent
            while curr is not None:
                if curr.matched == self.matched:
                    return True
                curr = curr.parent
            return False

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
