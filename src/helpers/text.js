import { encoding_for_model } from "@dqbd/tiktoken";

const { GPT_MODEL } = process.env;

function removeRewlines(content) {
  content = content.replace("/\n/g", " ");
  content = content.replace(/\s+/g, " ");
  return content;
}

function numTokens(text, model = GPT_MODEL) {
  const enc = encoding_for_model(model);

  return enc.encode(text).length;
}

export { removeRewlines, numTokens };
