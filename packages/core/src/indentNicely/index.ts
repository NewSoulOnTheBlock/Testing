import createTag from "./createTag";
import stripIndent from "./stripIndent";
import inlineArrayTransformer from "./inlineArrayTransformer";
import splitStringTransformer from "./splitStringTransformer";
import removeNonPrintingValuesTransformer from "./removeNonPrintingValuesTransformer";

/**
 * This code is a subset of https://www.npmjs.com/package/common-tags (their codeBlock / html function)
 */

const indentNicely = createTag(
  splitStringTransformer('\n'),
  removeNonPrintingValuesTransformer(),
  inlineArrayTransformer(),
  stripIndent,
);

export default indentNicely;
