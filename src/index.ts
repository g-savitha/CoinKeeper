import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { twiml } from "twilio";
import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

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

app.post("/sms", async (req: Request, res: Response) => {
  const msg = req.body.Body;
  if (msg.startsWith("!add")) {
    const expense = msg.slice(4).trim();
    await db.collection("expenses").insertOne({ expense });

    twimlResponse.message("Expense added!");
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twimlResponse.toString());
  } else if (msg.startsWith("!get")) {
    const items = await db.collection("expenses").find().toArray();
    const expenses = items.map((item) => item.expense).join("\n");

    twimlResponse.message(expenses);
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twimlResponse.toString());
  } else {
    twimlResponse.message("Unknown Command");
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twimlResponse.toString());
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
