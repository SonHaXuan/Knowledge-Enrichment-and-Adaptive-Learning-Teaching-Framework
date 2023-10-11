require("dotenv").config();
import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

const { OPENAI_API_KEY, CHROMA_SERVER_HOST, CHROMA_SERVER_HTTP_PORT } =
  process.env;
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
});

const ChromaInstance = new Chroma(embeddings, {
  url: `http://${CHROMA_SERVER_HOST}:${CHROMA_SERVER_HTTP_PORT}`,
  collectionName: "Hieu-collection-sample",
});

export { ChromaInstance };
