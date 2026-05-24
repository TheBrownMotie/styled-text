import { htmlEscape, htmlTag, TextStylerRegexRule, TextStylerRule } from "./text_styler"

export const MARKDOWN_RULES = [
  // Code Blocks & Inline Code (Disables all other formatting inside)
  new TextStylerRegexRule(/```([\s\S]+?)```/, (match) =>
    `<pre><code>${htmlEscape(match[1].trim())}</code></pre>`
  ),
  new TextStylerRegexRule(/`([^`]+)`/, (match) =>
    `<code>${htmlEscape(match[1])}</code>`
  ),

  // Images & Links (Image must come first so the '!' isn't left behind)
  new TextStylerRegexRule(/!\[([^\]]*)\]\(([^)]+)\)/, (match) =>
    `<img src='${htmlEscape(match[2])}' alt='${htmlEscape(match[1])}' />`
  ),
  new TextStylerRegexRule(/\[([^\]]+)\]\(([^)]+)\)/, (match) =>
    `<a href='${htmlEscape(match[2])}'>${htmlEscape(match[1])}</a>`
  ),

  // Headers
  ...[6, 5, 4, 3, 2, 1].map(
    (level) =>
      new TextStylerRule(
        new RegExp(`^#{${level}}\\s+`, "m"),
        htmlTag(`h${level}`),
        { end: /(?=\n|$)\n?/ }
      )
  ),

  // Lists
  new TextStylerRule(
    /^\s*[-*]\s+/m,
    htmlTag("li"),
    { end: /(?=\n|$)\n?/, wrapConsecutive: htmlTag("ul") }
  ),
  new TextStylerRule(
    /^\s*\d+\.\s+/m,
    htmlTag("li"),
    { end: /(?=\n|$)\n?/, wrapConsecutive: htmlTag("ol") }
  ),

  // Blockquotes
  new TextStylerRule(
    /^>\s+/m,
    (children) => children.join("") + "\n", // Preserve linebreaks inside quotes
    { end: /(?=\n|$)\n?/, wrapConsecutive: htmlTag("blockquote") }
  ),

  // Inline Formatting
  new TextStylerRule("**", htmlTag("strong")),
  new TextStylerRule("__", htmlTag("strong")),
  new TextStylerRule("*", htmlTag("em")),
  new TextStylerRule("_", htmlTag("em")),
  new TextStylerRule("~~", htmlTag("del")),
];
