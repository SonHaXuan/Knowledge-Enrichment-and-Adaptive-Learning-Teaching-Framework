import cheerio from "cheerio";
import puppeteer from "puppeteer";
import { Document } from "langchain/document";
import { TokenTextSplitter } from "langchain/text_splitter";
import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { get_encoding, encoding_for_model } from "@dqbd/tiktoken";
import { Configuration, OpenAIApi } from "openai";
import csv from "csvtojson";
import { Promise } from "bluebird";
import fs from "fs";
import _ from "lodash";

const GPT_MODEL = "gpt-3.5-turbo";
const OPENAI_API_KEY = "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";

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
});
const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const ChromaInstance = new Chroma(embeddings, {
  url: `http://3.215.153.245:8000`,
  collectionName: "collection1",
});

main();
async function main() {
  try {
    const collection = await ChromaInstance.ensureCollection();
    await collection.delete();
    // let linkData = await csv({
    //   noheader: false,
    //   output: "csv",
    // }).fromFile(CSV_PATH);

    // const links = linkData
    //   .filter((item) => item[6].includes("springer.com"))
    //   .map((item) => item[6]);
    // // get articel's content
    // let articelContents = await Promise.map(
    //   links.slice(0, 10),
    //   async (paperLink) => {
    //     const content = getContentByLink(paperLink);

    //     return content;
    //   },
    //   {
    //     concurrency: 4,
    //   }
    // );
    // articelContents = articelContents.map((articelContent, index) => {
    //   return `Paper ${index + 1}: \n ${articelContent} \n\n\n`;
    // })

    // const splitter = new TokenTextSplitter({
    //   chunkSize: 1000,
    //   chunkOverlap: 0,
    // });

    // const docs = await splitter.createDocuments([...articelContents]);

    // const vectorStore = await Chroma.fromDocuments(docs, embeddings, {
    //   collectionName: "test-collection2",
    // });

    const splitter = new TokenTextSplitter({
      chunkSize: 500,
      chunkOverlap: 0,
    });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    let docResult = [];
    for (let i = 0; i < 61; i++) {
      console.log(i);
      const content = fs.readFileSync(`./articles/${i + 1}.txt`, "utf8");

      const docs = await splitter.createDocuments([content]);

      docResult = [...docResult, ...docs];
    }

    const docsChunk = _.chunk(docResult, 100);

    await Promise.map(
      docsChunk,
      async (docs, i) => {
        console.log(i);
        await sleep(300);
        return ChromaInstance.addDocuments(docs);
      },
      {
        concurrency: 1,
      }
    );

    // const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    //   collectionName: "test-collection7",
    // });

    // const question =
    //   "Can you cluster the papers in the dataset into the three groups with respect to different ideas and explain for your classification?";
    // //"List all the abbreviations in the papers in the dataset? and what such abbreviations stand for? "
    // //"Providing the challenges that mentioned in the two paper in the dataset?"
    // //"Can you List the content of table 5: 'Barriers Preventing the Use of Web 2.0 Technologies for Learning' in 'Benefits and Barriers of Web 2.0 Technologies for Learning among Undergraduates of Selected Private Universities in Southwest Nigeria'?"
    // //"Can you summarize three main findings of the papers?"
    // const similarityItems = await ChromaInstance.similaritySearch(question);

    // const context = getContext(similarityItems);
    // console.log(similarityItems);
    // const completion = await openai.createChatCompletion({
    //   model: GPT_MODEL,
    //   messages: [
    //     {
    //       role: "system",
    //       content: `Based on this context: \n\n\n ${context} \n\n\n Answer the question below as truthfully as you can, if you don’t know the answer, say you don’t know in a sarcastic way otherwise, just answer.`,
    //     },
    //     {
    //       role: "user",
    //       content: question,
    //     },
    //   ],
    //   temperature: 0,
    //   max_tokens: 2048,
    // });

    // console.log(`A: ${completion.data.choices[0].message.content}`);
    console.log("DONE");
  } catch (err) {
    console.log(err);
  }
}

function getContext(data, maxToken = 2000) {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    const { pageContent } = data[i];

    if (numTokens(result + pageContent) > maxToken) {
      break;
    }

    result += pageContent + "\n";
  }

  return result;
}
function numTokens(text, model = GPT_MODEL) {
  const enc = encoding_for_model(model);

  return enc.encode(text).length;
}
async function getHtmlByLink(link) {
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({ javascriptEnabled: true });
  await page.goto(link);
  await page.waitForFunction(() => document.readyState === "complete");
  const htmlContent = await page.content();
  await browser.close();

  return htmlContent;
}

async function getContentByLink(link) {
  const html = await getHtmlByLink(link);
  const $ = cheerio.load(html);
  $("body").find("script, style", "iframe").remove();
  const content = $("body").text().trim();

  return removeRewlines(content);
}

function removeRewlines(content) {
  content = content.replace("/\n/g", " ");
  content = content.replace(/\s+/g, " ");
  return content;
}
