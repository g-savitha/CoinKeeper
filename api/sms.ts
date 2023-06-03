import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient, Db } from "mongodb";
import axios from "axios";

let db: Db;

async function connectDb() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    db = client.db("expensesDB");
  } catch (err) {
    console.error(err);
  }
}
connectDb();

const WA_API_URL = process.env.WA_API_URL;
const WA_API_TOKEN = process.env.WA_API_TOKEN;

async function sendMessage(phoneNumber: string, text: string) {
  await axios.post(
    `${WA_API_URL}/v1/messages`,
    {
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: {
        body: text,
      },
    },
    {
      headers: { Authorization: `Bearer ${WA_API_TOKEN}` },
    }
  );
}

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  const msg = req.body.messages[0].body; // this depends on the structure of the webhook event
  const from = req.body.messages[0].from;

  if (msg.startsWith("!add")) {
    const expense = msg.slice(4).trim();
    await db.collection("expenses").insertOne({ expense });

    await sendMessage(from, "Expense added!");
    res.status(200).send("ok");
  } else if (msg.startsWith("!get")) {
    const items = await db.collection("expenses").find().toArray();
    const expenses = items.map((item) => item.expense).join("\n");

    await sendMessage(from, expenses);
    res.status(200).send("ok");
  } else {
    await sendMessage(from, "Unknown Command");
    res.status(200).send("ok");
  }
};
