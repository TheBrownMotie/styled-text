import { test, expect } from "vitest";
import {
  TextStyler,
  TextStylerConfig,
  TextStylerRegexConfig,
  html_tag,
  InnerStyle,
  ConsumptionStyle,
} from "../text_styler"; // Adjust path as necessary

test("test_styletext_none", () => {
  const text_styler = new TextStyler();
  expect(text_styler.process_text("this is normal")).toBe("this is normal");
  console.log(text_styler.recursive_calls);
});

test("test_all_is_bold", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("*this is bold*")).toBe("<strong>this is bold</strong>");
  console.log(text_styler.recursive_calls);
});

test("test_all_is_italics", () => {
  const text_styler = new TextStyler([new TextStylerConfig("_", html_tag("em"))]);
  expect(text_styler.process_text("_this is italics_")).toBe("<em>this is italics</em>");
  console.log(text_styler.recursive_calls);
});

test("test_some_is_bold", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("this *is bold* in the middle")).toBe("this <strong>is bold</strong> in the middle");
  console.log(text_styler.recursive_calls);
});

test("test_beginning_is_bold", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("*this is bold* at the start")).toBe("<strong>this is bold</strong> at the start");
  console.log(text_styler.recursive_calls);
});

test("test_ending_is_bold", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("this is *bold at the end*")).toBe("this is <strong>bold at the end</strong>");
  console.log(text_styler.recursive_calls);
});

test("test_italics_within_bold", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerConfig("_", html_tag("em")),
  ]);
  expect(text_styler.process_text("this *is _bold and italics_ which* is pretty cool")).toBe(
    "this <strong>is <em>bold and italics</em> which</strong> is pretty cool",
  );
  console.log(text_styler.recursive_calls);
});

test("test_bold_without_end", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("*this is bold that doesn't end")).toBe("*this is bold that doesn't end");
  console.log(text_styler.recursive_calls);
});

test("test_bold_at_end", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("this is bold that doesn't start*")).toBe("this is bold that doesn't start*");
  console.log(text_styler.recursive_calls);
});

test("test_italics_within_bold_within_italics", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerConfig("_", html_tag("em")),
  ]);
  expect(text_styler.process_text("_this is *bold and then _italics again_ and* it still_ works")).toBe(
    "<em>this is <strong>bold and then <em>italics again</em> and</strong> it still</em> works",
  );
  console.log(text_styler.recursive_calls);
});

test("test_two_bolds_not_overlapping", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("*this is *bold and then bold again* but it still works*")).toBe(
    "<strong>this is </strong>bold and then bold again<strong> but it still works</strong>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_three_asterisks", () => {
  const text_styler = new TextStyler([new TextStylerConfig("*", html_tag("strong"))]);
  expect(text_styler.process_text("*this is bold and then bold again* but doesn't close the second* bold")).toBe(
    "<strong>this is bold and then bold again</strong> but doesn't close the second* bold",
  );
  console.log(text_styler.recursive_calls);
});

test("test_single_underscore_in_middle_of_bold", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerConfig("_", html_tag("em")),
  ]);
  expect(text_styler.process_text("this is *bold with an underscore_ in the middle* that doesn't end")).toBe(
    "this is <strong>bold with an underscore_ in the middle</strong> that doesn't end",
  );
  console.log(text_styler.recursive_calls);
});

test("test_overlapping_regions1", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerConfig("_", html_tag("em")),
  ]);
  expect(text_styler.process_text("this is *bold and now _an underscore* that closes later_")).toBe(
    "this is <strong>bold and now _an underscore</strong> that closes later_",
  );
  console.log(text_styler.recursive_calls);
});

test("test_overlapping_regions2", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerConfig("_", html_tag("em")),
  ]);
  expect(text_styler.process_text("this is _bold and now *an underscore_ that closes later*")).toBe(
    "this is <em>bold and now *an underscore</em> that closes later*",
  );
  console.log(text_styler.recursive_calls);
});

test("test_strikethrough", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("~~", html_tag("del")),
    new TextStylerConfig("*", html_tag("strong")),
  ]);
  expect(text_styler.process_text("this is ~~bad~~ *great*!")).toBe("this is <del>bad</del> <strong>great</strong>!");
  console.log(text_styler.recursive_calls);
});

test("test_strikethrough_and_sub", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("~", html_tag("sub")),
    new TextStylerConfig("~~", html_tag("del")),
  ]);
  expect(text_styler.process_text("this is ~~bad~~ ~okay~")).toBe("this is <del>bad</del> <sub>okay</sub>");
  console.log(text_styler.recursive_calls);
});

test("test_strikethrough_within_sub", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("~", html_tag("sub")),
    new TextStylerConfig("~~", html_tag("del")),
  ]);
  expect(text_styler.process_text("Water is H~ ~~3~~2~O")).toBe("Water is H<sub> <del>3</del>2</sub>O");
  console.log(text_styler.recursive_calls);
});

test("test_sub_within_strikethrough", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("~", html_tag("sub")),
    new TextStylerConfig("~~", html_tag("del")),
  ]);
  expect(text_styler.process_text("Water is ~~H~3~O~~ H~2~O")).toBe(
    "Water is <del>H<sub>3</sub>O</del> H<sub>2</sub>O",
  );
  console.log(text_styler.recursive_calls);
});

test("test_triple_tilde_strikethrough_within_sub", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("~", html_tag("sub")),
    new TextStylerConfig("~~", html_tag("del")),
  ]);
  expect(text_styler.process_text("Water is H~~~3~~2~O")).toBe("Water is H<sub><del>3</del>2</sub>O");
  console.log(text_styler.recursive_calls);
});

test("test_triple_tilde_overall_sub_within_strikethrough", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("~", html_tag("sub")),
    new TextStylerConfig("~~", html_tag("del")),
  ]);
  expect(text_styler.process_text("Small text: ~~~foo~bar~~")).toBe("Small text: <del><sub>foo</sub>bar</del>");
  console.log(text_styler.recursive_calls);
});

test("test_different_start_and_end", () => {
  const text_styler = new TextStyler([new TextStylerConfig("<!", html_tag("span", { class: "spoiler" }), "!>")]);
  expect(text_styler.process_text("<!this is a spoiler!>")).toBe("<span class='spoiler'>this is a spoiler</span>");
  console.log(text_styler.recursive_calls);
});

test("test_different_start_and_end_with_styling", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("<!", html_tag("span", { class: "spoiler" }), "!>"),
    new TextStylerConfig("_", html_tag("em")),
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerConfig("~~", html_tag("del")),
  ]);
  expect(text_styler.process_text("<!this _is_ a ~~_quote_~~ *spoiler*!>")).toBe(
    "<span class='spoiler'>this <em>is</em> a <del><em>quote</em></del> <strong>spoiler</strong></span>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_start_and_end_inside_start_and_end", () => {
  const text_styler = new TextStyler([new TextStylerConfig("<!", html_tag("span", { class: "spoiler" }), "!>")]);
  expect(text_styler.process_text("<!this is a spoiler <!within a spoiler!>, which is weird!>")).toBe(
    "<span class='spoiler'>this is a spoiler <span class='spoiler'>within a spoiler</span>, which is weird</span>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_start_and_end_inside_start_and_end_disallow_direct", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("_", html_tag("em")),
    new TextStylerConfig("<!", html_tag("span", { class: "spoiler" }), "!>", {
      allow_inner: InnerStyle.DISALLOW_DIRECT,
    }),
  ]);
  expect(
    text_styler.process_text("<!this is a spoiler <!within a spoiler!>, which is _weird, but this is <!allowed!>_!>"),
  ).toBe(
    "<span class='spoiler'>this is a spoiler &lt;!within a spoiler!&gt;, which is <em>weird, but this is <span class='spoiler'>allowed</span></em></span>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_start_and_end_inside_start_and_end_disallow_ancestors", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("_", html_tag("em")),
    new TextStylerConfig("<!", html_tag("span", { class: "spoiler" }), "!>", {
      allow_inner: InnerStyle.DISALLOW_ANCESTOR,
    }),
  ]);
  expect(
    text_styler.process_text("<!this is a spoiler <!within a spoiler!>, which is _weird, and so is <!this!>_!>"),
  ).toBe(
    "<span class='spoiler'>this is a spoiler &lt;!within a spoiler!&gt;, which is <em>weird, and so is &lt;!this!&gt;</em></span>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_multiquote", () => {
  const text_styler = new TextStyler([new TextStylerConfig(">", html_tag("blockquote"), "\n")]);
  expect(text_styler.process_text(">this is a blockquote\n>this is *another\n>this is* a cool third one\n")).toBe(
    "<blockquote>this is a blockquote</blockquote><blockquote>this is *another</blockquote><blockquote>this is* a cool third one</blockquote>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_multiquote_preserving_start_marking", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig(">", html_tag("blockquote"), "\n", {
      consume_start: ConsumptionStyle.OUTSIDE,
    }),
  ]);
  expect(text_styler.process_text(">this is a blockquote\n>this is *another\n>this is* a cool third one\n")).toBe(
    "<blockquote>&gt;this is a blockquote</blockquote><blockquote>&gt;this is *another</blockquote><blockquote>&gt;this is* a cool third one</blockquote>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_multiquote_preserving_all", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig(">", html_tag("blockquote"), "\n", {
      consume_start: ConsumptionStyle.OUTSIDE,
      consume_end: ConsumptionStyle.OUTSIDE,
    }),
  ]);
  expect(text_styler.process_text(">this is a blockquote\n>this is *another\n>this is* a cool third one\n")).toBe(
    "<blockquote>&gt;this is a blockquote\n</blockquote><blockquote>&gt;this is *another\n</blockquote><blockquote>&gt;this is* a cool third one\n</blockquote>",
  );
  console.log(text_styler.recursive_calls);
});

test("test_keep_all_markings_outside", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong"), null, {
      consume_start: ConsumptionStyle.OUTSIDE,
      consume_end: ConsumptionStyle.OUTSIDE,
    }),
    new TextStylerConfig("_", html_tag("em"), null, {
      consume_start: ConsumptionStyle.OUTSIDE,
      consume_end: ConsumptionStyle.OUTSIDE,
    }),
    new TextStylerConfig("~~", html_tag("del"), null, {
      consume_start: ConsumptionStyle.OUTSIDE,
      consume_end: ConsumptionStyle.OUTSIDE,
    }),
    new TextStylerConfig("~", html_tag("sub"), null, {
      consume_start: ConsumptionStyle.OUTSIDE,
      consume_end: ConsumptionStyle.OUTSIDE,
    }),
  ]);

  expect(
    text_styler.process_text("Lorem *ipsum* dolor sit ~amet~, _consectetur ~~adipiscing~~ *elit*_. Nulla _dapibus_."),
  ).toBe(
    "Lorem <strong>*ipsum*</strong> dolor sit <sub>~amet~</sub>, <em>_consectetur <del>~~adipiscing~~</del> <strong>*elit*</strong>_</em>. Nulla <em>_dapibus_</em>.",
  );
  console.log(text_styler.recursive_calls);
});

test("test_keep_all_markings_inside", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong"), null, {
      consume_start: ConsumptionStyle.INSIDE,
      consume_end: ConsumptionStyle.INSIDE,
    }),
    new TextStylerConfig("_", html_tag("em"), null, {
      consume_start: ConsumptionStyle.INSIDE,
      consume_end: ConsumptionStyle.INSIDE,
    }),
    new TextStylerConfig("~~", html_tag("del"), null, {
      consume_start: ConsumptionStyle.INSIDE,
      consume_end: ConsumptionStyle.INSIDE,
    }),
    new TextStylerConfig("~", html_tag("sub"), null, {
      consume_start: ConsumptionStyle.INSIDE,
      consume_end: ConsumptionStyle.INSIDE,
    }),
  ]);

  expect(
    text_styler.process_text("Lorem *ipsum* dolor sit ~amet~, _consectetur ~~adipiscing~~ *elit*_. Nulla _dapibus_."),
  ).toBe(
    "Lorem *<strong>ipsum</strong>* dolor sit ~<sub>amet</sub>~, _<em>consectetur ~~<del>adipiscing</del>~~ *<strong>elit</strong>*</em>_. Nulla _<em>dapibus</em>_.",
  );
  console.log(text_styler.recursive_calls);
});

test("test_regex", () => {
  const text_styler = new TextStyler([new TextStylerRegexConfig(/&gt;&gt;(\d+)/, "<link id='$1'>$&</link>")]);

  expect(text_styler.process_text("This is an imageboard style >>12345 link")).toBe(
    "This is an imageboard style <link id='12345'>&gt;&gt;12345</link> link",
  );
  console.log(text_styler.recursive_calls);
});

test("test_regex_wrapped_with_strong", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerRegexConfig(/&gt;&gt;(\d+)/, "<link id='$1'>$&</link>"),
  ]);

  expect(text_styler.process_text("This is an imageboard *style >>12345 link* that is bolded")).toBe(
    "This is an imageboard <strong>style <link id='12345'>&gt;&gt;12345</link> link</strong> that is bolded",
  );
  console.log(text_styler.recursive_calls);
});

test("test_regex_wrapped_with_strong_inside_it1", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerRegexConfig(/&gt;&gt;([*\d]+)/, "<link id='$1'>$&</link>"),
  ]);

  expect(text_styler.process_text("This is a regex unaffected >>12*3*45 by *asterisks* inside it")).toBe(
    "This is a regex unaffected <link id='12*3*45'>&gt;&gt;12*3*45</link> by <strong>asterisks</strong> inside it",
  );
  console.log(text_styler.recursive_calls);
});

test("test_regex_wrapped_with_strong_inside_it2", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerRegexConfig(/&gt;&gt;([*\d]+)/, "<link id='$1'>$&</link>"),
  ]);

  expect(text_styler.process_text("This is a regex *broken by an asterisk >>12*345 that came first")).toBe(
    "This is a regex <strong>broken by an asterisk &gt;&gt;12</strong>345 that came first",
  );
  console.log(text_styler.recursive_calls);
});

test("test_regex_wrapped_with_strong_inside_it3", () => {
  const text_styler = new TextStyler([
    new TextStylerConfig("*", html_tag("strong")),
    new TextStylerRegexConfig(/&gt;&gt;([*\d]+)/, "<link id='$1'>$&</link>"),
  ]);

  expect(text_styler.process_text("This is a regex unbroken by an asterisk >>12*345 that came* second")).toBe(
    "This is a regex unbroken by an asterisk <link id='12*345'>&gt;&gt;12*345</link> that came* second",
  );
  console.log(text_styler.recursive_calls);
});

test("test_regex_within_regex", () => {
  const text_styler = new TextStyler([
    new TextStylerRegexConfig(/\/anime\//, "<link to='/anime'>/anime/</link>"),
    new TextStylerRegexConfig(/https:\/\/\w+\.\w+\.com(\/\w+)+/, "<a href='$&'>$&</a>"),
  ]);

  expect(text_styler.process_text("Make sure /anime/ works")).toBe("Make sure <link to='/anime'>/anime/</link> works");
  expect(
    text_styler.process_text("Here is a link https://www.google.com/anime/hello matching one regex within another"),
  ).toBe(
    "Here is a link <a href='https://www.google.com/anime/hello'>https://www.google.com/anime/hello</a> matching one regex within another",
  );

  console.log(text_styler.recursive_calls);
});
