import { MAX_TOKEN_INPUT } from "../helpers/constants";
import { numTokens } from "../helpers/text";

function getContext(data, maxToken = MAX_TOKEN_INPUT) {
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

export { getContext };
