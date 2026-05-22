import re

from text_styler import (
    ConsumptionStyle,
    InnerStyle,
    TextStyler,
    TextStylerRegexRule,
    TextStylerRule,
    html_tag,
)


def test_empty_string1():
    text_styler = TextStyler([])
    assert text_styler.process_text("") == ""


def test_empty_string2():
    text_styler = TextStyler(
        [TextStylerRule(start="*", transform=html_tag("strong"))]  # unused
    )
    assert text_styler.process_text("") == ""


def test_styletext_none1():
    text_styler = TextStyler([])
    message = "this is normal"
    assert text_styler.process_text(message) == message


def test_styletext_none2():
    text_styler = TextStyler([])
    message = "this *is* normal"
    assert text_styler.process_text(message) == message


def test_all_is_bold():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert text_styler.process_text("*this is bold*") == "<strong>this is bold</strong>"


def test_all_is_italics():
    text_styler = TextStyler([TextStylerRule(start="_", transform=html_tag("em"))])
    assert text_styler.process_text("_this is italics_") == "<em>this is italics</em>"


def test_some_is_bold():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert (
        text_styler.process_text("this *is bold* in the middle")
        == "this <strong>is bold</strong> in the middle"
    )


def test_beginning_is_bold():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert (
        text_styler.process_text("*this is bold* at the start")
        == "<strong>this is bold</strong> at the start"
    )


def test_ending_is_bold():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert (
        text_styler.process_text("this is *bold at the end*")
        == "this is <strong>bold at the end</strong>"
    )


def test_empty_bold1():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert text_styler.process_text("**") == "<strong />"


def test_empty_bold2():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert text_styler.process_text("hello ** world") == "hello <strong /> world"


def test_empty_bold3():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="*", transform=html_tag("strong", auto_close_empty=False)
            )
        ]
    )
    assert text_styler.process_text("**") == "<strong></strong>"


def test_empty_bold4():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="*",
                transform=html_tag("strong", auto_close_empty=True),
                consume_start=ConsumptionStyle.OUTSIDE,
                consume_end=ConsumptionStyle.OUTSIDE,
            )
        ]
    )
    assert text_styler.process_text("**") == "<strong>**</strong>"


def test_empty_bold5():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="*",
                transform=html_tag("strong", auto_close_empty=True),
                consume_start=ConsumptionStyle.INSIDE,
                consume_end=ConsumptionStyle.INSIDE,
            )
        ]
    )
    assert text_styler.process_text("**") == "*<strong />*"


def test_italics_within_bold():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="_", transform=html_tag("em")),
        ]
    )
    assert (
        text_styler.process_text("this *is _bold and italics_ which* is pretty cool")
        == "this <strong>is <em>bold and italics</em> which</strong> is pretty cool"
    )


def test_bold_without_end():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert (
        text_styler.process_text("*this is bold that doesn't end")
        == "*this is bold that doesn't end"
    )


def test_bold_at_end():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert (
        text_styler.process_text("this is bold that doesn't start*")
        == "this is bold that doesn't start*"
    )


def test_italics_within_bold_within_italics():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="_", transform=html_tag("em")),
        ]
    )
    assert (
        text_styler.process_text(
            "_this is *bold and then _italics again_ and* it still_ works"
        )
        == "<em>this is <strong>bold and then <em>italics again</em> and</strong> it still</em> works"
    )


def test_two_bolds_not_overlapping():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert (
        text_styler.process_text(
            "*this is *bold and then bold again* but it still works*"
        )
        == "<strong>this is </strong>bold and then bold again<strong> but it still works</strong>"
    )


def test_three_asterisks():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    assert (
        text_styler.process_text(
            "*this is bold and then bold again* but doesn't close the second* bold"
        )
        == "<strong>this is bold and then bold again</strong> but doesn't close the second* bold"
    )


def test_single_underscore_in_middle_of_bold():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="_", transform=html_tag("em")),
        ]
    )
    assert (
        text_styler.process_text(
            "this is *bold with an underscore_ in the middle* that doesn't end"
        )
        == "this is <strong>bold with an underscore_ in the middle</strong> that doesn't end"
    )


def test_overlapping_regions1():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="_", transform=html_tag("em")),
        ]
    )
    assert (
        text_styler.process_text(
            "this is *bold and now _an underscore* that closes later_"
        )
        == "this is <strong>bold and now _an underscore</strong> that closes later_"
    )


def test_overlapping_regions2():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="_", transform=html_tag("em")),
        ]
    )
    assert (
        text_styler.process_text(
            "this is _bold and now *an underscore_ that closes later*"
        )
        == "this is <em>bold and now *an underscore</em> that closes later*"
    )


def test_strikethrough():
    text_styler = TextStyler(
        [
            TextStylerRule(start="~~", transform=html_tag("del")),
            TextStylerRule(start="*", transform=html_tag("strong")),
        ]
    )
    assert (
        text_styler.process_text("this is ~~bad~~ *great*!")
        == "this is <del>bad</del> <strong>great</strong>!"
    )


def test_strikethrough_and_sub():
    text_styler = TextStyler(
        [
            TextStylerRule(start="~", transform=html_tag("sub")),
            TextStylerRule(start="~~", transform=html_tag("del")),
        ]
    )
    assert (
        text_styler.process_text("this is ~~bad~~ ~okay~")
        == "this is <del>bad</del> <sub>okay</sub>"
    )


def test_strikethrough_within_sub():
    text_styler = TextStyler(
        [
            TextStylerRule(start="~", transform=html_tag("sub")),
            TextStylerRule(start="~~", transform=html_tag("del")),
        ]
    )
    assert (
        text_styler.process_text("Water is H~ ~~3~~2~O")
        == "Water is H<sub> <del>3</del>2</sub>O"
    )


def test_sub_within_strikethrough():
    text_styler = TextStyler(
        [
            TextStylerRule(start="~", transform=html_tag("sub")),
            TextStylerRule(start="~~", transform=html_tag("del")),
        ]
    )
    assert (
        text_styler.process_text("Water is ~~H~3~O~~ H~2~O")
        == "Water is <del>H<sub>3</sub>O</del> H<sub>2</sub>O"
    )


def test_triple_tilde_strikethrough_within_sub():
    text_styler = TextStyler(
        [
            TextStylerRule(start="~", transform=html_tag("sub")),
            TextStylerRule(start="~~", transform=html_tag("del")),
        ]
    )
    assert (
        text_styler.process_text("Water is H~~~3~~2~O")
        == "Water is H<sub><del>3</del>2</sub>O"
    )


def test_triple_tilde_overall_sub_within_strikethrough():
    text_styler = TextStyler(
        [
            TextStylerRule(start="~", transform=html_tag("sub")),
            TextStylerRule(start="~~", transform=html_tag("del")),
        ]
    )
    assert (
        text_styler.process_text("Small text: ~~~foo~bar~~")
        == "Small text: <del><sub>foo</sub>bar</del>"
    )


def test_different_start_and_end():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="<!", transform=html_tag("span", {"class": "spoiler"}), end="!>"
            )
        ]
    )
    assert (
        text_styler.process_text("<!this is a spoiler!>")
        == "<span class='spoiler'>this is a spoiler</span>"
    )


def test_different_start_and_end_with_styling():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="<!", transform=html_tag("span", {"class": "spoiler"}), end="!>"
            ),
            TextStylerRule(start="_", transform=html_tag("em")),
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="~~", transform=html_tag("del")),
        ]
    )
    assert (
        text_styler.process_text("<!this _is_ a ~~_quote_~~ *spoiler*!>")
        == "<span class='spoiler'>this <em>is</em> a <del><em>quote</em></del> <strong>spoiler</strong></span>"
    )


def test_start_and_end_inside_start_and_end():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="<!", transform=html_tag("span", {"class": "spoiler"}), end="!>"
            )
        ]
    )
    assert (
        text_styler.process_text(
            "<!this is a spoiler <!within a spoiler!>, which is weird!>"
        )
        == "<span class='spoiler'>this is a spoiler <span class='spoiler'>within a spoiler</span>, which is weird</span>"
    )


def test_start_and_end_inside_start_and_end_disallow_direct():
    text_styler = TextStyler(
        [
            TextStylerRule(start="_", transform=html_tag("em")),
            TextStylerRule(
                start="<!",
                transform=html_tag("span", {"class": "spoiler"}),
                end="!>",
                allow_inner=InnerStyle.DISALLOW_DIRECT,
            ),
        ]
    )
    assert (
        text_styler.process_text(
            "<!this is a spoiler <!within a spoiler!>, which is _weird, but this is <!allowed!>_!>"
        )
        == "<span class='spoiler'>this is a spoiler &lt;!within a spoiler!&gt;, which is <em>weird, but this is <span class='spoiler'>allowed</span></em></span>"
    )


def test_start_and_end_inside_start_and_end_disallow_ancestors():
    text_styler = TextStyler(
        [
            TextStylerRule(start="_", transform=html_tag("em")),
            TextStylerRule(
                start="<!",
                transform=html_tag("span", {"class": "spoiler"}),
                end="!>",
                allow_inner=InnerStyle.DISALLOW_ANCESTOR,
            ),
        ]
    )
    assert (
        text_styler.process_text(
            "<!this is a spoiler <!within a spoiler!>, which is _weird, and so is <!this!>_!>"
        )
        == "<span class='spoiler'>this is a spoiler &lt;!within a spoiler!&gt;, which is <em>weird, and so is &lt;!this!&gt;</em></span>"
    )


def test_multiquote():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=">",
                transform=html_tag("blockquote"),
                end="\n",
            )
        ]
    )
    assert (
        text_styler.process_text(
            ">this is a blockquote\n>this is *another\n>this is* a cool third one\n",
        )
        == "<blockquote>this is a blockquote</blockquote><blockquote>this is *another</blockquote><blockquote>this is* a cool third one</blockquote>"
    )


def test_multiquote_preserving_start_marking():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=">",
                transform=html_tag("blockquote"),
                end="\n",
                consume_start=ConsumptionStyle.OUTSIDE,
            )
        ]
    )
    assert (
        text_styler.process_text(
            ">this is a blockquote\n>this is *another\n>this is* a cool third one\n",
        )
        == "<blockquote>&gt;this is a blockquote</blockquote><blockquote>&gt;this is *another</blockquote><blockquote>&gt;this is* a cool third one</blockquote>"
    )


def test_multiquote_preserving_all():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=">",
                transform=html_tag("blockquote"),
                end="\n",
                consume_start=ConsumptionStyle.OUTSIDE,
                consume_end=ConsumptionStyle.OUTSIDE,
            )
        ]
    )
    assert (
        text_styler.process_text(
            ">this is a blockquote\n>this is *another\n>this is* a cool third one\n",
        )
        == "<blockquote>&gt;this is a blockquote\n</blockquote><blockquote>&gt;this is *another\n</blockquote><blockquote>&gt;this is* a cool third one\n</blockquote>"
    )


def test_multiline_true():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    message = "*this starts bold\nand finishes here*"
    assert (
        text_styler.process_text(message, multiline=True)
        == "<strong>this starts bold\nand finishes here</strong>"
    )


def test_multiline_false():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    message = "*this starts bold\nand finishes here*"
    assert (
        text_styler.process_text(message, multiline=False)
        == "*this starts bold\nand finishes here*"
    )


def test_non_html_transform():
    # A config that just uppercase the inner text instead of wrapping in HTML
    text_styler = TextStyler(
        [TextStylerRule(start="!", transform=lambda x: x.upper(), end="!")]
    )
    assert text_styler.process_text("this is a !loud! word") == "this is a LOUD word"


def test_keep_all_markings_outside():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="*",
                transform=html_tag("strong"),
                consume_start=ConsumptionStyle.OUTSIDE,
                consume_end=ConsumptionStyle.OUTSIDE,
            ),
            TextStylerRule(
                start="_",
                transform=html_tag("em"),
                consume_start=ConsumptionStyle.OUTSIDE,
                consume_end=ConsumptionStyle.OUTSIDE,
            ),
            TextStylerRule(
                start="~~",
                transform=html_tag("del"),
                consume_start=ConsumptionStyle.OUTSIDE,
                consume_end=ConsumptionStyle.OUTSIDE,
            ),
            TextStylerRule(
                start="~",
                transform=html_tag("sub"),
                consume_start=ConsumptionStyle.OUTSIDE,
                consume_end=ConsumptionStyle.OUTSIDE,
            ),
        ]
    )

    assert (
        text_styler.process_text(
            "Lorem *ipsum* dolor sit ~amet~, _consectetur ~~adipiscing~~ *elit*_. Nulla _dapibus_.",
        )
        == "Lorem <strong>*ipsum*</strong> dolor sit <sub>~amet~</sub>, <em>_consectetur <del>~~adipiscing~~</del> <strong>*elit*</strong>_</em>. Nulla <em>_dapibus_</em>."
    )


def test_keep_all_markings_inside():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="*",
                transform=html_tag("strong"),
                consume_start=ConsumptionStyle.INSIDE,
                consume_end=ConsumptionStyle.INSIDE,
            ),
            TextStylerRule(
                start="_",
                transform=html_tag("em"),
                consume_start=ConsumptionStyle.INSIDE,
                consume_end=ConsumptionStyle.INSIDE,
            ),
            TextStylerRule(
                start="~~",
                transform=html_tag("del"),
                consume_start=ConsumptionStyle.INSIDE,
                consume_end=ConsumptionStyle.INSIDE,
            ),
            TextStylerRule(
                start="~",
                transform=html_tag("sub"),
                consume_start=ConsumptionStyle.INSIDE,
                consume_end=ConsumptionStyle.INSIDE,
            ),
        ]
    )

    assert (
        text_styler.process_text(
            "Lorem *ipsum* dolor sit ~amet~, _consectetur ~~adipiscing~~ *elit*_. Nulla _dapibus_.",
        )
        == "Lorem *<strong>ipsum</strong>* dolor sit ~<sub>amet</sub>~, _<em>consectetur ~~<del>adipiscing</del>~~ *<strong>elit</strong>*</em>_. Nulla _<em>dapibus</em>_."
    )


def test_regex():
    text_styler = TextStyler(
        [
            TextStylerRegexRule(
                regex=re.compile(r"&gt;&gt;(\d+)"),
                replace=r"<link id='\1'>\g<0></link>",
            )
        ]
    )

    assert (
        text_styler.process_text(
            "This is an imageboard style >>12345 link",
        )
        == "This is an imageboard style <link id='12345'>&gt;&gt;12345</link> link"
    )


def test_regex_wrapped_with_strong():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRegexRule(
                regex=re.compile(r"&gt;&gt;(\d+)"),
                replace=r"<link id='\1'>\g<0></link>",
            ),
        ]
    )

    assert (
        text_styler.process_text(
            "This is an imageboard *style >>12345 link* that is bolded",
        )
        == "This is an imageboard <strong>style <link id='12345'>&gt;&gt;12345</link> link</strong> that is bolded"
    )


def test_regex_wrapped_with_strong_inside_it1():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRegexRule(
                regex=re.compile(r"&gt;&gt;([*\d]+)"),
                replace=r"<link id='\1'>\g<0></link>",
            ),
        ]
    )

    assert (
        text_styler.process_text(
            "This is a regex unaffected >>12*3*45 by *asterisks* inside it",
        )
        == "This is a regex unaffected <link id='12*3*45'>&gt;&gt;12*3*45</link> by <strong>asterisks</strong> inside it"
    )


def test_regex_wrapped_with_strong_inside_it2():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRegexRule(
                regex=re.compile(r"&gt;&gt;([*\d]+)"),
                replace=r"<link id='\1'>\g<0></link>",
            ),
        ]
    )

    assert (
        text_styler.process_text(
            "This is a regex *broken by an asterisk >>12*345 that came first",
        )
        == "This is a regex <strong>broken by an asterisk &gt;&gt;12</strong>345 that came first"
    )


def test_regex_wrapped_with_strong_inside_it3():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRegexRule(
                regex=re.compile(r"&gt;&gt;([*\d]+)"),
                replace=r"<link id='\1'>\g<0></link>",
            ),
        ]
    )

    assert (
        text_styler.process_text(
            "This is a regex unbroken by an asterisk >>12*345 that came* second",
        )
        == "This is a regex unbroken by an asterisk <link id='12*345'>&gt;&gt;12*345</link> that came* second"
    )


def test_regex_within_regex():
    text_styler = TextStyler(
        [
            TextStylerRegexRule(  # imageboard style implied board link
                regex=re.compile(r"/anime/"),
                replace=r"<link to='/anime'>/anime/</link>",
            ),
            TextStylerRegexRule(  # external link
                regex=re.compile(r"https://\w+\.\w+.com(/\w+)+"),
                replace=r"<a href='\g<0>'>\g<0></a>",
            ),
        ]
    )
    assert (
        text_styler.process_text("Make sure /anime/ works")
        == "Make sure <link to='/anime'>/anime/</link> works"
    )
    assert (
        text_styler.process_text(
            "Here is a link https://www.google.com/anime/hello matching one regex within another"
        )
        == "Here is a link <a href='https://www.google.com/anime/hello'>https://www.google.com/anime/hello</a> matching one regex within another"
    )


def test_big_message():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="_", transform=html_tag("em")),
            TextStylerRule(start="~~", transform=html_tag("del")),
            TextStylerRule(start="~", transform=html_tag("sub")),
            TextStylerRule(
                start="<!", transform=html_tag("span", {"class": "spoiler"}), end="!>"
            ),
            TextStylerRegexRule(  # external link
                regex=re.compile(r"https://\w+\.\w+.com(/\w+)*"),
                replace=r"<a href='\g<0>'>\g<0></a>",
            ),
        ]
    )

    message = "This is a _bunch_ of *~~things~~stuff* all coming *together* to _produce~lmao~ a big message_. Check out https://www.google.com to find out _all_ the things you can do."
    assert (
        text_styler.process_text(message)
        == "This is a <em>bunch</em> of <strong><del>things</del>stuff</strong> all coming <strong>together</strong> to <em>produce<sub>lmao</sub> a big message</em>. Check out <a href='https://www.google.com'>https://www.google.com</a> to find out <em>all</em> the things you can do."
    )


def test_big_message_some_escaped():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(start="_", transform=html_tag("em")),
            TextStylerRule(start="~~", transform=html_tag("del")),
            TextStylerRule(start="~", transform=html_tag("sub")),
            TextStylerRule(
                start="<!", transform=html_tag("span", {"class": "spoiler"}), end="!>"
            ),
            TextStylerRegexRule(  # external link
                regex=re.compile(r"https://\w+\.\w+.com(/\w+)*"),
                replace=r"<a href='\g<0>'>\g<0></a>",
            ),
        ]
    )

    message = "This is a _bunch_ of \\*~~things~~stuff\\* all coming *together* to _produce\\~lmao\\~ a big message_. Check out https://www.google.com to find out _all_ the things you can do."
    assert (
        text_styler.process_text(message)
        == "This is a <em>bunch</em> of *<del>things</del>stuff* all coming <strong>together</strong> to <em>produce~lmao~ a big message</em>. Check out <a href='https://www.google.com'>https://www.google.com</a> to find out <em>all</em> the things you can do."
    )


def test_escape_one_instance():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    message = "hello \\* wonderful"
    assert text_styler.process_text(message) == "hello * wonderful"


def test_escape_three_instances():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    message = "hello \\*wonderful*beautiful*"
    assert (
        text_styler.process_text(message)
        == "hello *wonderful<strong>beautiful</strong>"
    )


def test_many_escapes1():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    message = "hello \\\\*wonderful*beautiful*"
    assert (
        text_styler.process_text(message)
        == "hello \\<strong>wonderful</strong>beautiful*"
    )


def test_many_escapes2():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    message = "hello \\\\\\*wonderful*beautiful*"
    assert (
        text_styler.process_text(message)
        == "hello \\*wonderful<strong>beautiful</strong>"
    )


def test_html_escaping():
    text_styler = TextStyler([TextStylerRule(start="*", transform=html_tag("strong"))])
    message = "Normal <script>alert(1)</script> and *bold <script>alert(2)</script>*"
    assert (
        text_styler.process_text(message)
        == "Normal &lt;script&gt;alert(1)&lt;/script&gt; and <strong>bold &lt;script&gt;alert(2)&lt;/script&gt;</strong>"
    )


def test_wrap():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start="- ",
                transform=html_tag("li"),
                end="\n",
                wrap_consecutive=html_tag("ul"),
            )
        ]
    )
    message = "- first item\n- second item\n- third item\n"
    assert (
        text_styler.process_text(message)
        == "<ul><li>first item</li><li>second item</li><li>third item</li></ul>"
    )


def test_wrap_complex():
    text_styler = TextStyler(
        [
            TextStylerRule(start="*", transform=html_tag("strong")),
            TextStylerRule(
                start="- ",
                transform=html_tag("li"),
                end="\n",
                wrap_consecutive=html_tag("ul"),
            ),
            TextStylerRule(
                start="> ",
                transform=html_tag("p"),
                end="\n",
                wrap_consecutive=html_tag("blockquote"),
            ),
        ]
    )

    message = """
> A bad opinion
This is *wrong* because:
- reason number 1
- reason *number* 2
- reason *number 3

> A *bigger*
> quote *of a
> wrong opinion
"""
    message = message.strip()
    assert (
        text_styler.process_text(message)
        == "<blockquote><p>A bad opinion</p></blockquote>This is <strong>wrong</strong> because:\n<ul><li>reason number 1</li><li>reason <strong>number</strong> 2</li><li>reason *number 3</li></ul>\n<blockquote><p>A <strong>bigger</strong></p><p>quote *of a</p><p>wrong opinion</p></blockquote>"
    )


def test_regex_symmetric_character_classes():
    text_styler = TextStyler(
        [TextStylerRule(start=re.compile(r"\d{3}"), transform=html_tag("strong"))]
    )
    assert (
        text_styler.process_text("abc 123hello123 xyz")
        == "abc <strong>hello</strong> xyz"
    )


def test_regex_asymmetric_tags():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=re.compile(r"\[[A-Z]+\]"),
                end=re.compile(r"\[/[A-Z]+\]"),
                transform=html_tag("em"),
            )
        ]
    )
    assert (
        text_styler.process_text(
            "a [TAG]b[/BAZ] c [OTHER]d[/NOT]"
        )  # it's not _that_ smart
        == "a <em>b</em> c <em>d</em>"
    )


def test_regex_wrap_consecutive():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=re.compile(r"^\s*-\s+", re.MULTILINE),
                end="\n",
                transform=html_tag("li"),
                wrap_consecutive=html_tag("ul"),
            )
        ]
    )
    message = " - first\n    - second\n"
    assert text_styler.process_text(message) == "<ul><li>first</li><li>second</li></ul>"


def test_regex_escaped_html_interaction():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=re.compile(r"&lt;[a-z]+&gt;"),
                end=re.compile(r"&lt;/[a-z]+&gt;"),
                transform=html_tag("div"),
            )
        ]
    )
    assert text_styler.process_text("<test>hello</test>") == "<div>hello</div>"


def test_regex_anchors_and_multiline():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=re.compile(r"^&gt;&gt;&gt; ", re.MULTILINE),
                end=re.compile(r"$", re.MULTILINE),
                transform=html_tag("blockquote"),
            )
        ]
    )
    message = "normal line\n>>> quoted line\n >>>another normal"
    assert (
        text_styler.process_text(message)
        == "normal line\n<blockquote>quoted line</blockquote>\n &gt;&gt;&gt;another normal"
    )


def test_regex_consume_styles():
    # Tests that dynamic regex matches correctly output into wrappers
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=re.compile(r"\{+"),
                end=re.compile(r"\}+"),
                transform=html_tag("code"),
                consume_start=ConsumptionStyle.OUTSIDE,
                consume_end=ConsumptionStyle.OUTSIDE,
            )
        ]
    )
    assert text_styler.process_text("var {{test}}") == "var <code>{{test}}</code>"


def test_regex_disallow_direct():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=re.compile(r"\[del\]"),
                end=re.compile(r"\[/del\]"),
                transform=html_tag("del"),
                allow_inner=InnerStyle.DISALLOW_DIRECT,
            )
        ]
    )
    assert (
        text_styler.process_text("[del]strike [del]nested[/del] out[/del]")
        == "<del>strike [del]nested[/del] out</del>"
    )


def test_regex_disallow_ancestors():
    text_styler = TextStyler(
        [
            TextStylerRule(
                start=re.compile(r"\[strong\]"),
                end=re.compile(r"\[/strong\]"),
                transform=html_tag("strong"),
                allow_inner=InnerStyle.DISALLOW_ANCESTOR,
            ),
            TextStylerRule(start="_", transform=html_tag("em")),
        ]
    )
    assert (
        text_styler.process_text(
            "[strong]bold _italic [strong]ignored[/strong] italic_ bold[/strong]"
        )
        == "<strong>bold <em>italic [strong]ignored[/strong] italic</em> bold</strong>"
    )
