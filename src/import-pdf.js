require("dotenv").config();
import fs from "fs";
import { Promise } from "bluebird";
import { ChromaInstance } from "./services/chroma";
import _ from "lodash";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import path from "path";

//const PDF_FOLDER_PATH = "./pdf-articles";
const PDF_FOLDER_PATH = "./hieu_dataset";//Hieu dataset

main();
async function main() {
  try {
    console.log("Importing data from pdf files...");

    await crawlData();

    console.log("DONE");
  } catch (err) {
    console.log(err);
  }
}

async function crawlData() {
  const collection = await ChromaInstance.ensureCollection();
  await collection.delete();
  // console.log(await collection.count());
  const fileNames = fs.readdirSync(PDF_FOLDER_PATH);

  await Promise.map(fileNames, crawlDataByPDF, {
    concurrency: 1,
  });
}

async function crawlDataByPDF(fileName) {
  try {
    const loader = new PDFLoader(`${PDF_FOLDER_PATH}/${fileName}`);
    const docs = await loader.load();

    const paperName = path.parse(fileName).name;
    docs[0].pageContent = `Paper name: ${paperName} \n ${docs[0].pageContent}`;

    // reduce number of docs is inserted in one time
    const docChunks = _.chunk(docs, 100);
    await Promise.map(
      docChunks,
      (docChunk) => ChromaInstance.addDocuments(docChunk),
      {
        concurrency: 1,
      }
    );
    console.log(`Imported '${fileName}' paper successfully.`);
  } catch (e) {
    console.log(e.message);
  }
}
