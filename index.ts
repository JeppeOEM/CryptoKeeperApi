import express from "express";
import crypto from 'crypto';  
import dbConnect from "./startup/dbConnect";
import "dotenv/config";
import todoRouter from "./routers/todoRouter";
import cors from "cors";

//https://testnet.binancefuture.com/fapi/v1/exchangeInfo

dbConnect();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/todos", todoRouter);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

app.get("/trade", async (req, res) =>  {
  try {
    const result = await test();
    res.json(result);
  } catch (error) {
    // Handle errors appropriately
    res.status(500).json({ error: "Internal Server Error" });
  }
});


async function getTickerPrice(symbol: String): Promise<number>{
  try {
    const priceFetch = await fetch(`https://testnet.binancefuture.com/fapi/v1/ticker/price?symbol=${symbol}`)
    const priceBody = await priceFetch.json();
    console.log(priceBody)
    return parseFloat(priceBody.price)
  } catch (error) {
    console.error("Error",error);
    throw error;
  }

}

interface TradeParams {
  symbol: string;
  price: number;
  action: string;
  quantity: number;
}


async function makeTrade({ symbol, price, action, quantity}:TradeParams): Promise<any>{


    // not null assertion, the values are NOT null ( insert ! at the end)
    const apiKey: string = process.env.BINANCE_API_KEY!;
    const apiSecret: string = process.env.BINANCE_API_SECRET!;
    const endpoint = `https://testnet.binancefuture.com/fapi/v1/order`
    const timestamp = Date.now();
    //Record<Keys, Type>
    //Keys: A union of string literal types that represents the allowed keys in the resulting object.
    //Type: The type of the values associated with each key.

    //Record<string, string | number> ensures that params is an object where all keys are strings, 
    //and the associated values can be either strings or numbers. 
    const params: Record<string, string | number> ={
      symbol,
      side: action,
      type:'LIMIT', //MARKET
      price,
      timestamp,
      quantity,
      timeInForce:'GTC' // how long should the trade hang unfulfilled? GTC = hangs forever
    }

    let queryString = Object.keys(params).map((key)=>`${key}=${encodeURIComponent(params[key])}`).join('&');
    console.log(queryString)
    const signature = crypto.createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex')  

    queryString+='&signature='+signature;
    const url = endpoint+'?'+queryString
    const request = await fetch(url,{
      method:'POST',
      headers:{
        'X-MBX-APIKEY':apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const response = await request.json();
    return response;
}

async function test() {
  try {
    const symbol = 'BTCUSDT';
    const price = await getTickerPrice(symbol);
    console.log("PRICE"+price)
    const action = "BUY";
    let quantity = 250 / price; // $ amount / price of the
    quantity = Number(quantity.toPrecision(2));
    const transaction = await makeTrade({ symbol, price, action, quantity });
    console.log("Transaction::::"+transaction);
    return transaction
  } catch (error) {
    console.error('Error in test function:', error);
  }
}
// 

// (async()=>{
// const symbol = 'SHIBUSDT'
//  const price = await getTickerPrice(symbol);
//  const action = "BUY";
//  const quantity = Math.round(5/price);
//  const transaction = await makeTrade(symbol, price, action, quantity);
//  console.log(transaction)
// })()