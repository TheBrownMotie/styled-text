# styled-text

A high-performance, generic text parsing engine designed for flexible markup and formatting, with Python, Typescript versions and a ReactTS wrapper.

## Why?

This library can take any arbitrary set of syntax rules that you define, builds an AST of your text, and transforms it according to your requirements. It can convert your styled input into anything you want - raw html, react nodes, LaTeX, etc., literally anything.

Most other libraries of this kind either:

1. Lock you into a specific syntax. (I wanted a "blank slate", where I can define my own rules without fighting the built-in ones.)
2. Are _only_ for transpiling from one syntax to another, i.e. markdown to html.
3. Are inefficient, one-off libraries for a specific hobby project, and not a general-purpose library to be used broadly.
4. For React specifically, most other libraries use `dangerouslySetInnerHtml`, beacuse they build a raw string instead of an AST.

This library was born out of frustrations with using the popular `ReactMarkdown` library, which does not use `dangerouslySetInnerHtml` but does have other issues:

1. If you want to change `*` to `<strong>` instead of `<em>`, you have to convert the output `<em>` to `<strong>` - but now, there's no way to produce italicized text, because now _anything_ that produces `<em>` (even `_`) will be transformed to `<strong>`! There is no way to differentiate between the output of `*` and the output of `_` in the configuration.
2. Your only control of the output is to whitelist, blacklist, or transform the final HTML tags it produces. This means if you want a markup to produce a particular HTML tag, then a user will also be able to manually inject that HTML tag into the input, and the library will pass it along.
3. If you want to create a new markup, you must learn to how create a plugin for this library, and manually interact with the AST; **or** do regex-preprocessing, which defeats the point of using library.

This library, `styled-text`, allows you to build your own syntax rules with a simple configuration.

For syntax and examples on how it can be used, see the README for your specific situation:

- [Typescript Documentation](./typescript/README.md)
- [React Documentation](./react/README.md)
- [Python Documentation](./python/README.md)

## 📦 Packages

| Language       | Package                         | Description                                      |
| :------------- | :------------------------------ | :----------------------------------------------- |
| **React**      | `@brownmotie/styled-text-react` | React wrapper for the typescript library         |
| **TypeScript** | `@brownmotie/styled-text`       | The generic parsing logic for Node/Deno/Browser. |
| **Python**     | `styled-text`                   | Python version for backends or anything else     |
