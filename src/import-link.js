require("dotenv").config();
import cheerio from "cheerio";
import puppeteer from "puppeteer";
import { TokenTextSplitter } from "langchain/text_splitter";
import { encoding_for_model } from "@dqbd/tiktoken";
import csv from "csvtojson";
import { Promise } from "bluebird";
import { ChromaInstance } from "./services/chroma";
import { chat } from "./services/openai";
import _ from "lodash";
import { LLMChain } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import { MAX_TOKEN_QUESTION } from "./helpers/constants";
import { numTokens } from "./helpers/text";
import { getContext } from "./helpers/openai";
import { getContentByLink } from "./services/cheerio";

main();
async function main() {
  try {
    const csvData = await csv({
      noheader: true,
      output: "csv",
    }).fromFile("./links.csv");
    const paperLinks = csvData.map((item) => item[0]);
    await crawlData(paperLinks);

    const question = "Can you summarize the papers?";
    await askQuestion(question);

    console.log("DONE");
  } catch (err) {
    console.log(err);
  }
}

async function crawlData(paperLinks) {
  const collection = await ChromaInstance.ensureCollection();
  await collection.delete();

  await Promise.map(paperLinks, crawlDataByLink, {
    concurrency: 4,
  });
}

async function crawlDataByLink(paperLink) {
  const content = await getContentByLink(paperLink);

  const splitter = new TokenTextSplitter({
    chunkSize: 500,
    chunkOverlap: 0,
  });

  const docs = await splitter.createDocuments([content]);

  // reduce number of docs is inserted in one time
  const docChunks = _.chunk(docs, 100);
  await Promise.map(
    docChunks,
    (docChunk) => ChromaInstance.addDocuments(docChunk),
    {
      concurrency: 4,
    }
  );
}

async function askQuestion(question) {
  if (numTokens(question) > MAX_TOKEN_QUESTION)
    throw new Error("The question is too long");
  const similarityItems = await ChromaInstance.similaritySearch(question);

  const context = getContext(similarityItems);
  console.log(similarityItems);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `Based on this context: \n\n\n {context} \n\n\n Answer the question below as truthfully as you can, if you don’t know the answer, say you don’t know in a sarcastic way otherwise, just answer.`
    ),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ]);
  const chain = new LLMChain({
    prompt: chatPrompt,
    llm: chat,
  });
  const res = await chain.call({
    context,
    question,
  });

  console.log(`A: ${res.text}`);
}
