import { test, expect } from "vitest";
import {
  ConsumptionStyle,
  InnerStyle,
  TextStyler,
  TextStylerRule,
  TextStylerRegexRule,
  htmlTag,
} from "../src/text_styler"; // Adjust the import path if necessary

test("test_empty_string1", () => {
  const text_styler = new TextStyler<string>([]);
  expect(text_styler.processText("").join("")).toBe("");
});

test("test_empty_string2", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")), // unused
  ]);
  expect(text_styler.processText("").join("")).toBe("");
});

test("test_styletext_none1", () => {
  const text_styler = new TextStyler<string>([]);
  const message = "this is normal";
  expect(text_styler.processText(message).join("")).toBe(message);
});

test("test_styletext_none2", () => {
  const text_styler = new TextStyler<string>([]);
  const message = "this *is* normal";
  expect(text_styler.processText(message).join("")).toBe(message);
});

test("test_all_is_bold", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("*this is bold*").join("")).toBe("<strong>this is bold</strong>");
});

test("test_all_is_italics", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("_", htmlTag("em"))]);
  expect(text_styler.processText("_this is italics_").join("")).toBe("<em>this is italics</em>");
});

test("test_some_is_bold", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("this *is bold* in the middle").join("")).toBe(
    "this <strong>is bold</strong> in the middle",
  );
});

test("test_beginning_is_bold", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("*this is bold* at the start").join("")).toBe(
    "<strong>this is bold</strong> at the start",
  );
});

test("test_ending_is_bold", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("this is *bold at the end*").join("")).toBe(
    "this is <strong>bold at the end</strong>",
  );
});

test("test_empty_bold1", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("**").join("")).toBe("<strong />");
});

test("test_empty_bold2", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("hello ** world").join("")).toBe("hello <strong /> world");
});

test("test_empty_bold3", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong", undefined, false))]);
  expect(text_styler.processText("**").join("")).toBe("<strong></strong>");
});

test("test_empty_bold4", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong", undefined, true), {
      consumeStart: ConsumptionStyle.OUTSIDE,
      consumeEnd: ConsumptionStyle.OUTSIDE,
    }),
  ]);
  expect(text_styler.processText("**").join("")).toBe("<strong>**</strong>");
});

test("test_empty_bold5", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong", undefined, true), {
      consumeStart: ConsumptionStyle.INSIDE,
      consumeEnd: ConsumptionStyle.INSIDE,
    }),
  ]);
  expect(text_styler.processText("**").join("")).toBe("*<strong />*");
});

test("test_italics_within_bold", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("_", htmlTag("em")),
  ]);
  expect(text_styler.processText("this *is _bold and italics_ which* is pretty cool").join("")).toBe(
    "this <strong>is <em>bold and italics</em> which</strong> is pretty cool",
  );
});

test("test_bold_without_end", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("*this is bold that doesn't end").join("")).toBe("*this is bold that doesn't end");
});

test("test_bold_at_end", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("this is bold that doesn't start*").join("")).toBe("this is bold that doesn't start*");
});

test("test_italics_within_bold_within_italics", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("_", htmlTag("em")),
  ]);
  expect(text_styler.processText("_this is *bold and then _italics again_ and* it still_ works").join("")).toBe(
    "<em>this is <strong>bold and then <em>italics again</em> and</strong> it still</em> works",
  );
});

test("test_two_bolds_not_overlapping", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(text_styler.processText("*this is *bold and then bold again* but it still works*").join("")).toBe(
    "<strong>this is </strong>bold and then bold again<strong> but it still works</strong>",
  );
});

test("test_three_asterisks", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  expect(
    text_styler.processText("*this is bold and then bold again* but doesn't close the second* bold").join(""),
  ).toBe("<strong>this is bold and then bold again</strong> but doesn't close the second* bold");
});

test("test_single_underscore_in_middle_of_bold", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("_", htmlTag("em")),
  ]);
  expect(text_styler.processText("this is *bold with an underscore_ in the middle* that doesn't end").join("")).toBe(
    "this is <strong>bold with an underscore_ in the middle</strong> that doesn't end",
  );
});

test("test_overlapping_regions1", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("_", htmlTag("em")),
  ]);
  expect(text_styler.processText("this is *bold and now _an underscore* that closes later_").join("")).toBe(
    "this is <strong>bold and now _an underscore</strong> that closes later_",
  );
});

test("test_overlapping_regions2", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("_", htmlTag("em")),
  ]);
  expect(text_styler.processText("this is _bold and now *an underscore_ that closes later*").join("")).toBe(
    "this is <em>bold and now *an underscore</em> that closes later*",
  );
});

test("test_strikethrough", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("~~", htmlTag("del")),
    new TextStylerRule("*", htmlTag("strong")),
  ]);
  expect(text_styler.processText("this is ~~bad~~ *great*!").join("")).toBe(
    "this is <del>bad</del> <strong>great</strong>!",
  );
});

test("test_strikethrough_and_sub", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("~", htmlTag("sub")),
    new TextStylerRule("~~", htmlTag("del")),
  ]);
  expect(text_styler.processText("this is ~~bad~~ ~okay~").join("")).toBe("this is <del>bad</del> <sub>okay</sub>");
});

test("test_strikethrough_within_sub", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("~", htmlTag("sub")),
    new TextStylerRule("~~", htmlTag("del")),
  ]);
  expect(text_styler.processText("Water is H~ ~~3~~2~O").join("")).toBe("Water is H<sub> <del>3</del>2</sub>O");
});

test("test_sub_within_strikethrough", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("~", htmlTag("sub")),
    new TextStylerRule("~~", htmlTag("del")),
  ]);
  expect(text_styler.processText("Water is ~~H~3~O~~ H~2~O").join("")).toBe(
    "Water is <del>H<sub>3</sub>O</del> H<sub>2</sub>O",
  );
});

test("test_triple_tilde_strikethrough_within_sub", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("~", htmlTag("sub")),
    new TextStylerRule("~~", htmlTag("del")),
  ]);
  expect(text_styler.processText("Water is H~~~3~~2~O").join("")).toBe("Water is H<sub><del>3</del>2</sub>O");
});

test("test_triple_tilde_overall_sub_within_strikethrough", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("~", htmlTag("sub")),
    new TextStylerRule("~~", htmlTag("del")),
  ]);
  expect(text_styler.processText("Small text: ~~~foo~bar~~").join("")).toBe("Small text: <del><sub>foo</sub>bar</del>");
});

test("test_different_start_and_end", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("<!", htmlTag("span", { class: "spoiler" }), { end: "!>" }),
  ]);
  expect(text_styler.processText("<!this is a spoiler!>").join("")).toBe(
    "<span class='spoiler'>this is a spoiler</span>",
  );
});

test("test_different_start_and_end_with_styling", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("<!", htmlTag("span", { class: "spoiler" }), { end: "!>" }),
    new TextStylerRule("_", htmlTag("em")),
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("~~", htmlTag("del")),
  ]);
  expect(text_styler.processText("<!this _is_ a ~~_quote_~~ *spoiler*!>").join("")).toBe(
    "<span class='spoiler'>this <em>is</em> a <del><em>quote</em></del> <strong>spoiler</strong></span>",
  );
});

test("test_start_and_end_inside_start_and_end", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("<!", htmlTag("span", { class: "spoiler" }), { end: "!>" }),
  ]);
  expect(text_styler.processText("<!this is a spoiler <!within a spoiler!>, which is weird!>").join("")).toBe(
    "<span class='spoiler'>this is a spoiler <span class='spoiler'>within a spoiler</span>, which is weird</span>",
  );
});

test("test_start_and_end_inside_start_and_end_disallow_direct", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("_", htmlTag("em")),
    new TextStylerRule("<!", htmlTag("span", { class: "spoiler" }), {
      end: "!>",
      allowInner: InnerStyle.DISALLOW_DIRECT,
    }),
  ]);
  expect(
    text_styler
      .processText("<!this is a spoiler <!within a spoiler!>, which is _weird, but this is <!allowed!>_!>")
      .join(""),
  ).toBe(
    "<span class='spoiler'>this is a spoiler &lt;!within a spoiler!&gt;, which is <em>weird, but this is <span class='spoiler'>allowed</span></em></span>",
  );
});

test("test_start_and_end_inside_start_and_end_disallow_ancestors", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("_", htmlTag("em")),
    new TextStylerRule("<!", htmlTag("span", { class: "spoiler" }), {
      end: "!>",
      allowInner: InnerStyle.DISALLOW_ANCESTOR,
    }),
  ]);
  expect(
    text_styler
      .processText("<!this is a spoiler <!within a spoiler!>, which is _weird, and so is <!this!>_!>")
      .join(""),
  ).toBe(
    "<span class='spoiler'>this is a spoiler &lt;!within a spoiler!&gt;, which is <em>weird, and so is &lt;!this!&gt;</em></span>",
  );
});

test("test_multiquote", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule(">", htmlTag("blockquote"), { end: "\n" })]);
  expect(
    text_styler.processText(">this is a blockquote\n>this is *another\n>this is* a cool third one\n").join(""),
  ).toBe(
    "<blockquote>this is a blockquote</blockquote><blockquote>this is *another</blockquote><blockquote>this is* a cool third one</blockquote>",
  );
});

test("test_multiquote_preserving_start_marking", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule(">", htmlTag("blockquote"), {
      end: "\n",
      consumeStart: ConsumptionStyle.OUTSIDE,
    }),
  ]);
  expect(
    text_styler.processText(">this is a blockquote\n>this is *another\n>this is* a cool third one\n").join(""),
  ).toBe(
    "<blockquote>&gt;this is a blockquote</blockquote><blockquote>&gt;this is *another</blockquote><blockquote>&gt;this is* a cool third one</blockquote>",
  );
});

test("test_multiquote_preserving_all", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule(">", htmlTag("blockquote"), {
      end: "\n",
      consumeStart: ConsumptionStyle.OUTSIDE,
      consumeEnd: ConsumptionStyle.OUTSIDE,
    }),
  ]);
  expect(
    text_styler.processText(">this is a blockquote\n>this is *another\n>this is* a cool third one\n").join(""),
  ).toBe(
    "<blockquote>&gt;this is a blockquote\n</blockquote><blockquote>&gt;this is *another\n</blockquote><blockquote>&gt;this is* a cool third one\n</blockquote>",
  );
});

test("test_multiline_true", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  const message = "*this starts bold\nand finishes here*";
  expect(text_styler.processText(message, true).join("")).toBe("<strong>this starts bold\nand finishes here</strong>");
});

test("test_multiline_false", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  const message = "*this starts bold\nand finishes here*";
  expect(text_styler.processText(message, false).join("")).toBe("*this starts bold\nand finishes here*");
});

test("test_non_html_transform", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("!", (children: string[]) => children.join("").toUpperCase(), { end: "!" }),
  ]);
  expect(text_styler.processText("this is a !loud! word").join("")).toBe("this is a LOUD word");
});

test("test_keep_all_markings_outside", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong"), {
      consumeStart: ConsumptionStyle.OUTSIDE,
      consumeEnd: ConsumptionStyle.OUTSIDE,
    }),
    new TextStylerRule("_", htmlTag("em"), {
      consumeStart: ConsumptionStyle.OUTSIDE,
      consumeEnd: ConsumptionStyle.OUTSIDE,
    }),
    new TextStylerRule("~~", htmlTag("del"), {
      consumeStart: ConsumptionStyle.OUTSIDE,
      consumeEnd: ConsumptionStyle.OUTSIDE,
    }),
    new TextStylerRule("~", htmlTag("sub"), {
      consumeStart: ConsumptionStyle.OUTSIDE,
      consumeEnd: ConsumptionStyle.OUTSIDE,
    }),
  ]);

  expect(
    text_styler
      .processText("Lorem *ipsum* dolor sit ~amet~, _consectetur ~~adipiscing~~ *elit*_. Nulla _dapibus_.")
      .join(""),
  ).toBe(
    "Lorem <strong>*ipsum*</strong> dolor sit <sub>~amet~</sub>, <em>_consectetur <del>~~adipiscing~~</del> <strong>*elit*</strong>_</em>. Nulla <em>_dapibus_</em>.",
  );
});

test("test_keep_all_markings_inside", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong"), {
      consumeStart: ConsumptionStyle.INSIDE,
      consumeEnd: ConsumptionStyle.INSIDE,
    }),
    new TextStylerRule("_", htmlTag("em"), {
      consumeStart: ConsumptionStyle.INSIDE,
      consumeEnd: ConsumptionStyle.INSIDE,
    }),
    new TextStylerRule("~~", htmlTag("del"), {
      consumeStart: ConsumptionStyle.INSIDE,
      consumeEnd: ConsumptionStyle.INSIDE,
    }),
    new TextStylerRule("~", htmlTag("sub"), {
      consumeStart: ConsumptionStyle.INSIDE,
      consumeEnd: ConsumptionStyle.INSIDE,
    }),
  ]);

  expect(
    text_styler
      .processText("Lorem *ipsum* dolor sit ~amet~, _consectetur ~~adipiscing~~ *elit*_. Nulla _dapibus_.")
      .join(""),
  ).toBe(
    "Lorem *<strong>ipsum</strong>* dolor sit ~<sub>amet</sub>~, _<em>consectetur ~~<del>adipiscing</del>~~ *<strong>elit</strong>*</em>_. Nulla _<em>dapibus</em>_.",
  );
});

test("test_regex", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRegexRule(/>>(\d+)/, (match: RegExpMatchArray) => `<link id='${match[1]}'>${match[0]}</link>`),
  ]);

  expect(text_styler.processText("This is an imageboard style >>12345 link").join("")).toBe(
    "This is an imageboard style <link id='12345'>>>12345</link> link",
  );
});

test("test_regex_wrapped_with_strong", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRegexRule(/>>(\d+)/, (match: RegExpMatchArray) => `<link id='${match[1]}'>${match[0]}</link>`),
  ]);

  expect(text_styler.processText("This is an imageboard *style >>12345 link* that is bolded").join("")).toBe(
    "This is an imageboard <strong>style <link id='12345'>>>12345</link> link</strong> that is bolded",
  );
});

test("test_regex_wrapped_with_strong_inside_it1", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRegexRule(
      />>([*\d]+)/,
      (match: RegExpMatchArray) => `<link id='${match[1]}'>${match[0]}</link>`,
    ),
  ]);

  expect(text_styler.processText("This is a regex unaffected >>12*3*45 by *asterisks* inside it").join("")).toBe(
    "This is a regex unaffected <link id='12*3*45'>>>12*3*45</link> by <strong>asterisks</strong> inside it",
  );
});

test("test_regex_wrapped_with_strong_inside_it2", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRegexRule(
      /&gt;&gt;([*\d]+)/,
      (match: RegExpMatchArray) => `<link id='${match[1]}'>${match[0]}</link>`,
    ),
  ]);

  expect(text_styler.processText("This is a regex *broken by an asterisk >>12*345 that came first").join("")).toBe(
    "This is a regex <strong>broken by an asterisk &gt;&gt;12</strong>345 that came first",
  );
});

test("test_regex_wrapped_with_strong_inside_it3", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRegexRule(
      />>([*\d]+)/,
      (match: RegExpMatchArray) => `<link id='${match[1]}'>${match[0]}</link>`,
    ),
  ]);

  expect(text_styler.processText("This is a regex unbroken by an asterisk >>12*345 that came* second").join("")).toBe(
    "This is a regex unbroken by an asterisk <link id='12*345'>>>12*345</link> that came* second",
  );
});

test("test_regex_within_regex", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRegexRule(/\/anime\//, (match: RegExpMatchArray) => `<link to='/anime'>/anime/</link>`),
    new TextStylerRegexRule(
      /https:\/\/\w+\.\w+\.com(\/\w+)+/,
      (match: RegExpMatchArray) => `<a href='${match[0]}'>${match[0]}</a>`,
    ),
  ]);

  expect(text_styler.processText("Make sure /anime/ works").join("")).toBe(
    "Make sure <link to='/anime'>/anime/</link> works",
  );

  expect(
    text_styler
      .processText("Here is a link https://www.google.com/anime/hello matching one regex within another")
      .join(""),
  ).toBe(
    "Here is a link <a href='https://www.google.com/anime/hello'>https://www.google.com/anime/hello</a> matching one regex within another",
  );
});

test("test_big_message", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("_", htmlTag("em")),
    new TextStylerRule("~~", htmlTag("del")),
    new TextStylerRule("~", htmlTag("sub")),
    new TextStylerRule("<!", htmlTag("span", { class: "spoiler" }), { end: "!>" }),
    new TextStylerRegexRule(
      /https:\/\/\w+\.\w+\.com(\/\w+)*/,
      (match: RegExpMatchArray) => `<a href='${match[0]}'>${match[0]}</a>`,
    ),
  ]);

  const message =
    "This is a _bunch_ of *~~things~~stuff* all coming *together* to _produce~lmao~ a big message_. Check out https://www.google.com to find out _all_ the things you can do.";
  expect(text_styler.processText(message).join("")).toBe(
    "This is a <em>bunch</em> of <strong><del>things</del>stuff</strong> all coming <strong>together</strong> to <em>produce<sub>lmao</sub> a big message</em>. Check out <a href='https://www.google.com'>https://www.google.com</a> to find out <em>all</em> the things you can do.",
  );
});

test("test_big_message_some_escaped", () => {
  const text_styler = new TextStyler<string>([
    new TextStylerRule("*", htmlTag("strong")),
    new TextStylerRule("_", htmlTag("em")),
    new TextStylerRule("~~", htmlTag("del")),
    new TextStylerRule("~", htmlTag("sub")),
    new TextStylerRule("<!", htmlTag("span", { class: "spoiler" }), { end: "!>" }),
    new TextStylerRegexRule(
      /https:\/\/\w+\.\w+\.com(\/\w+)*/,
      (match: RegExpMatchArray) => `<a href='${match[0]}'>${match[0]}</a>`,
    ),
  ]);

  const message =
    "This is a _bunch_ of \\*~~things~~stuff\\* all coming *together* to _produce\\~lmao\\~ a big message_. Check out https://www.google.com to find out _all_ the things you can do.";
  expect(text_styler.processText(message).join("")).toBe(
    "This is a <em>bunch</em> of *<del>things</del>stuff* all coming <strong>together</strong> to <em>produce~lmao~ a big message</em>. Check out <a href='https://www.google.com'>https://www.google.com</a> to find out <em>all</em> the things you can do.",
  );
});

test("test_escape_one_instance", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  const message = "hello \\* wonderful";
  expect(text_styler.processText(message).join("")).toBe("hello * wonderful");
});

test("test_escape_three_instances", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  const message = "hello \\*wonderful*beautiful*";
  expect(text_styler.processText(message).join("")).toBe("hello *wonderful<strong>beautiful</strong>");
});

test("test_many_escapes1", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  const message = "hello \\\\*wonderful*beautiful*";
  expect(text_styler.processText(message).join("")).toBe("hello \\<strong>wonderful</strong>beautiful*");
});

test("test_many_escapes2", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  const message = "hello \\\\\\*wonderful*beautiful*";
  expect(text_styler.processText(message).join("")).toBe("hello \\*wonderful<strong>beautiful</strong>");
});

test("test_html_escaping", () => {
  const text_styler = new TextStyler<string>([new TextStylerRule("*", htmlTag("strong"))]);
  const message = "Normal <script>alert(1)</script> and *bold <script>alert(2)</script>*";
  expect(text_styler.processText(message).join("")).toBe(
    "Normal &lt;script&gt;alert(1)&lt;/script&gt; and <strong>bold &lt;script&gt;alert(2)&lt;/script&gt;</strong>",
  );
});


test("test_wrap", () => {
  const text_styler = new TextStyler<string>(
    [
      new TextStylerRule(
        "- ",
        htmlTag("li"), {
        end: "\n",
        wrapConsecutive: htmlTag("ul"),
      })
    ]
  );
  const message = "- first item\n- second item\n- third item\n";
  expect(
    text_styler.processText(message).join("")).toBe(
    "<ul><li>first item</li><li>second item</li><li>third item</li></ul>"
    );
});

test("test_wrap_complex", () => {
  const text_styler = new TextStyler<string>(
    [
      new TextStylerRule("*", htmlTag("strong")),
      new TextStylerRule(
        "- ",
        htmlTag("li"), {
        end: "\n",
        wrapConsecutive: htmlTag("ul"),
      }),
      new TextStylerRule(
        "> ",
        htmlTag("p"), {
        end: "\n",
        wrapConsecutive: htmlTag("blockquote"),
      }),
    ]
  )

  const message: string = [
    "> A bad opinion",
    "This is *wrong* because:",
    "- reason number 1",
    "- reason *number* 2",
    "- reason *number 3",
    "",
    "> A *bigger*",
    "> quote *of a",
    "> wrong opinion",
  ].join("\n").trimStart();
  expect(
    text_styler.processText(message).join("")).toBe(
      "<blockquote><p>A bad opinion</p></blockquote>This is <strong>wrong</strong> because:\n<ul><li>reason number 1</li><li>reason <strong>number</strong> 2</li><li>reason *number 3</li></ul>\n<blockquote><p>A <strong>bigger</strong></p><p>quote *of a</p><p>wrong opinion</p></blockquote>"
    );
});

test('test_regex_symmetric_character_classes', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(/\d{3}/, htmlTag('strong'))
  ]);
  expect(textStyler.processText("abc 123hello123 xyz").join('')).toBe(
    "abc <strong>hello</strong> xyz"
  );
});

test('test_regex_asymmetric_tags', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(
      /\[[A-Z]+\]/,
      htmlTag('em'),
      { end: /\[\/[A-Z]+\]/ }
    )
  ]);
  // Note: The logic will match the regexes provided
  expect(textStyler.processText("a [TAG]b[/BAZ] c [OTHER]d[/NOT]").join('')).toBe(
    "a <em>b</em> c <em>d</em>"
  );
});

test('test_regex_wrap_consecutive', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(
      /^\s*-\s+/m,
      htmlTag('li'),
      { end: "\n", wrapConsecutive: htmlTag('ul') }
    )
  ]);
  const message = " - first\n    - second\n";
  expect(textStyler.processText(message).join('')).toBe(
    "<ul><li>first</li><li>second</li></ul>"
  );
});

test('test_regex_escaped_html_interaction', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(
      /<[a-z]+>/,
      htmlTag('div'),
      { end: /<\/[a-z]+>/ }
    )
  ]);
  expect(textStyler.processText("<test>hello</test>").join('')).toBe(
    "<div>hello</div>"
  );
});

test('test_regex_anchors_and_multiline', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(
      /^>>> /m,
      htmlTag('blockquote'),
      { end: /$/m }
    )
  ]);
  const message = "normal line\n>>> quoted line\n >>>another normal";
  // Note: The space before ">>>another normal" is preserved based on your python test case
  expect(textStyler.processText(message).join('')).toBe(
    "normal line\n<blockquote>quoted line</blockquote>\n &gt;&gt;&gt;another normal"
  );
});

test('test_regex_consume_styles', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(
      /\{+/,
      htmlTag('code'),
      {
          end: /}+/,
          consumeStart: ConsumptionStyle.OUTSIDE,
          consumeEnd: ConsumptionStyle.OUTSIDE
      }
    )
  ]);
  expect(textStyler.processText("var {{test}}").join('')).toBe(
    "var <code>{{test}}</code>"
  );
});

test('test_regex_disallow_direct', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(
      /\[del\]/,
      htmlTag('del'),
      { end: /\[\/del\]/, allowInner: InnerStyle.DISALLOW_DIRECT }
    )
  ]);
  expect(textStyler.processText("[del]strike [del]nested[/del] out[/del]").join('')).toBe(
    "<del>strike [del]nested[/del] out</del>"
  );
});

test('test_regex_disallow_ancestors', () => {
  const textStyler = new TextStyler([
    new TextStylerRule(
      /\[strong\]/,
      htmlTag('strong'),
      { end: /\[\/strong\]/, allowInner: InnerStyle.DISALLOW_ANCESTOR }
    ),
    new TextStylerRule("_", htmlTag('em'))
  ]);
  expect(textStyler.processText("[strong]bold _italic [strong]ignored[/strong] italic_ bold[/strong]").join('')).toBe(
    "<strong>bold <em>italic [strong]ignored[/strong] italic</em> bold</strong>"
  );
});
