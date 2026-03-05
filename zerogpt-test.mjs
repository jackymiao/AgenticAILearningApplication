import readline from "node:readline/promises";
import {stdin as input, stdout as output} from "node:process";

const url = "https://api.gptzero.me/v2/predict/text";
const apiKey = "0880784a1d324109a548faf441a4d6d1";

async function main() {
  const rl = readline.createInterface({input, output});

  try {
    const document = await rl.question("Enter text to check with GPTZero: ");

    const options = {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        document: document,
        multilingual: true,
        modelVersion: "2026-02-14-base",
        apiVersion: "2",
      }),
    };

    console.log("\nSending request...\n");
    const response = await fetch(url, options);
    const data = await response.json();

    console.log("Status:", response.status);
    const documents = data.documents || data.result?.documents || [];
    documents.forEach((doc) => {
      console.log(doc.predicted_class);
    });

    if (documents.length === 0) {
      console.log("No documents found in response");
    }
  } catch (error) {
    console.error("Request failed:");
    console.error(error);
  } finally {
    rl.close();
  }
}

main();
