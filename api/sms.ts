import type { VercelRequest, VercelResponse } from "@vercel/node";
import { twiml } from "twilio";
import { MongoClient, Db } from "mongodb";

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

const twimlResponse = new twiml.MessagingResponse();

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  const msg = req.body.Body;
  if (msg.startsWith("!add")) {
    const expense = msg.slice(4).trim();
    await db.collection("expenses").insertOne({ expense });

    twimlResponse.message("Expense added!");
    res.status(200).send(twiml.toString());
  } else if (msg.startsWith("!get")) {
    const items = await db.collection("expenses").find().toArray();
    const expenses = items.map((item) => item.expense).join("\n");

    twimlResponse.message(expenses);
    res.status(200).send(twiml.toString());
  } else {
    twimlResponse.message("Unknown Command");
    res.status(200).send(twiml.toString());
  }
};
