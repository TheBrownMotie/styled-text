import pytest

from text_styler import (
    InnerStyle,
    SyntaxTree,
    SyntaxTreeNode,
    TextStylerRule,
    html_tag,
)


@pytest.fixture
def em_config() -> TextStylerRule:
    return TextStylerRule(start="_", transform=html_tag("em"))


@pytest.fixture
def strong_config() -> TextStylerRule:
    return TextStylerRule(start="*", transform=html_tag("strong"))


@pytest.fixture
def spoiler_config() -> TextStylerRule:
    return TextStylerRule(
        start="<!",
        transform=html_tag("span", {"class": "spoiler"}),
        end="!>",
        allow_inner=InnerStyle.DISALLOW_DIRECT,
    )


def test_simple_ast(em_config: TextStylerRule):
    ast = SyntaxTree()
    ast.push_str("hello ")
    assert str(ast) == "hello "

    ast.push(em_config)
    assert str(ast) == "hello <em />"

    ast.push_str("my")
    assert str(ast) == "hello <em>my</em>"

    ast.pop()
    assert str(ast) == "hello <em>my</em>"

    ast.push_str(" world")
    assert str(ast) == "hello <em>my</em> world"

    assert ast.curr is None
    assert ast.children[0] == "hello "
    assert ast.children[2] == " world"
    assert isinstance(ast.children[1], SyntaxTreeNode)
    assert ast.children[1].parent is None
    assert ast.children[1].children == ["my"]
    assert ast.children[1].rule == em_config
    assert ast.children[1].match is None


def test_simple_ast_copy(em_config: TextStylerRule):
    ast = SyntaxTree()
    ast.push_str("hello ")
    ast.push(em_config)
    ast.push_str("my")
    ast.pop()
    ast.push_str(" world")

    assert ast.curr is None
    assert ast.children[0] == "hello "
    assert ast.children[2] == " world"
    assert isinstance(ast.children[1], SyntaxTreeNode)
    assert ast.children[1].parent is None
    assert ast.children[1].children == ["my"]
    assert ast.children[1].rule == em_config
    assert ast.children[1].match is None


def test_simple_ast_copy_in_middle(em_config: TextStylerRule):
    ast = SyntaxTree()
    ast.push_str("hello ")
    ast.push(em_config)
    assert ast.curr is not None
    assert ast.curr.children == []
    assert ast.curr.rule == em_config
    ast.push_str("my")
    ast.pop()
    ast.push_str(" world")

    assert ast.curr is None
    assert ast.children[0] == "hello "
    assert ast.children[2] == " world"
    assert isinstance(ast.children[1], SyntaxTreeNode)
    assert ast.children[1].parent is None
    assert ast.children[1].children == ["my"]
    assert ast.children[1].rule == em_config
    assert ast.children[1].match is None


def test_simple_ast_peek(em_config: TextStylerRule):
    ast = SyntaxTree()
    ast.push_str("hello ")
    ast.push(em_config)
    ast.push_str("my")
    assert ast.curr is not None and ast.curr.rule == em_config
    ast.pop()
    ast.push_str(" world")


def test_more_complex_ast(em_config: TextStylerRule, strong_config: TextStylerRule):
    # this *is _bold and italics_ which* is pretty cool
    ast = SyntaxTree()
    ast.push_str("this ")
    ast.push(strong_config)
    ast.push_str("is ")
    ast.push(em_config)
    ast.push_str("bold and italics")
    ast.pop()
    ast.push_str(" which")
    ast.pop()
    ast.push_str(" is pretty cool")

    assert (
        str(ast)
        == "this <strong>is <em>bold and italics</em> which</strong> is pretty cool"
    )


def test_complex_ast(em_config: TextStylerRule, spoiler_config: TextStylerRule):
    ast = SyntaxTree()
    ast.push_str("")
    ast.push(spoiler_config)
    ast.push_str("this is a spoiler ")
    ast.push(spoiler_config)

    ast.push_str("within a spoiler")
    ast.pop()

    ast.push_str(", which is ")
    ast.push(em_config)

    ast.push_str("weird, but this is ")
    ast.push(spoiler_config)

    ast.push_str("allowed")
    ast.pop()
    ast.push_str("")
    ast.pop()
    ast.push_str("")
    ast.pop()
    ast.push_str("")
    assert (
        str(ast)
        == "<span class='spoiler'>this is a spoiler &lt;!within a spoiler!&gt;, which is <em>weird, but this is <span class='spoiler'>allowed</span></em></span>"
    )
