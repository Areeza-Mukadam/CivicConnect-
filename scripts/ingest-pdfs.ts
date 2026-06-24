import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PDFParse } from "pdf-parse";

dotenv.config();
console.log("SUPABASE URL =", process.env.VITE_SUPABASE_URL);
console.log(
  "KB URL =",
  `${process.env.VITE_SUPABASE_URL}/functions/v1/kb-ingest`
);

const DOCS_DIR = "./civicLink-docs";

async function processPdf(filePath: string) {
  const buffer = fs.readFileSync(filePath);

  const parser = new PDFParse({ data: buffer });

  const result = await parser.getText();

  const text = result.text;

  const title = path.basename(filePath, ".pdf");

  const chunkSize = 1500;

  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);

    const res = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/kb-ingest`,
      {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
  Authorization: `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
},
        body: JSON.stringify({
          source_type: "pdf",
          title,
          content: chunk,
        }),
      }
    );

    console.log(
  `${title} chunk ${Math.floor(i / chunkSize) + 1}: ${res.status}`
);

const responseText = await res.text();
console.log("Response:", responseText);
  }
}

async function main() {
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));

  for (const file of files) {
    console.log(`Processing ${file}`);
    await processPdf(path.join(DOCS_DIR, file));
  }

  console.log("Done");
}

main().catch(console.error);