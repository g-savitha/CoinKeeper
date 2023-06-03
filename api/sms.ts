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

// DB SCHEMA:

/* {
  _id: ObjectId,
  command: String, // 'credit' or 'debit' or 'get' or 'limit'
  amount: Number,
  category: String,
  timestamp: Date,
} */

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  const msg = req.body.messages[0].body; // this depends on the structure of the webhook event
  const from = req.body.messages[0].from;

  const parts = msg.split(" ");
  if (parts.length < 3) {
    await sendMessage(
      from,
      "Invalid command. Please specify amount and category."
    );
    res.status(200).send("ok");
  }

  const command = parts[0].toLowerCase();

  let amount: number;
  try {
    amount = parseInt(parts[1]);
  } catch (err) {
    await sendMessage(from, "Invalid amount. Could not parse a number.");
    return res.status(200).send("ok");
  }

  const category = parts[2].slice(2).join(" ");

  if (isNaN(amount) || amount < 0) {
    await sendMessage(
      from,
      "Invalid amount. Please specify a positive number."
    );
    res.status(200).send("ok");
  }

  if (command === "credit" || command === "debit") {
    try {
      await db.collection("expenses").insertOne({
        amount,
        category,
        transactionType: command,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("Failed to insert transaction into database", err);
      await sendMessage(
        from,
        "Failed to record transaction. Please try again later."
      );
      res.status(200).send("ok");
    }

    await sendMessage(
      from,
      `Transaction recorded: ${command} ${amount} ${category}`
    );
  } else {
    await sendMessage(
      from,
      "Unknown command. Please start with 'credit' or 'debit'."
    );
  }

  // if (msg.startsWith("!add")) {
  //   const expense = msg.slice(4).trim();
  //   await db.collection("expenses").insertOne({ expense });

  //   await sendMessage(from, "Expense added!");
  // //   res.status(200).send("ok");
  // } else if (msg.startsWith("!get")) {
  //   const items = await db.collection("expenses").find().toArray();
  //   const expenses = items.map((item) => item.expense).join("\n");

  //   await sendMessage(from, expenses);
  //   res.status(200).send("ok");
  // } else {
  //   await sendMessage(from, "Unknown Command");
  //   res.status(200).send("ok");
  // }
};
