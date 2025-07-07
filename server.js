require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;
const wss = new WebSocket.Server({ noServer: true });
const YOUR_AR_ADDRESS = process.env.WALLET_ADDRESS;

if (!YOUR_AR_ADDRESS) {
  console.error('❌ ERROR: WALLET_ADDRESS is missing in .env');
  process.exit(1);
}

const MONTHLY_GOAL_AR = process.env.GOAL_AR || 10; // If the GOAL_AR= value in the .env file is not defined, it will use this reference by default.
let currentTipsAR = process.env.STARTING_AR ? parseFloat(process.env.STARTING_AR) : 0;
let AR_TO_USD = 0;
const processedTxs = new Set();

const ARWEAVE_GATEWAY = 'https://arweave.net';

const GRAPHQL_QUERY = `
query GetTransactions($address: String!) {
  transactions(
    recipients: [$address]
    first: 10
    sort: HEIGHT_DESC
  ) {
    edges {
      node {
        id
        owner {
          address
        }
        quantity {
          ar
        }
        block {
          height
          timestamp
        }
      }
    }
  }
}
`;

async function arweaveGraphQL(query, variables) {
  try {
    const response = await axios.post(`${ARWEAVE_GATEWAY}/graphql`, {
      query,
      variables
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.errors) {
      console.error('Errors in GraphQL:', response.data.errors);
      return null;
    }
    return response.data.data;
  } catch (error) {
    console.error('Error GraphQL:', error.response?.data || error.message);
    return null;
  }
}

async function updateExchangeRate() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=arweave&vs_currencies=usd');
    AR_TO_USD = response.data.arweave.usd;
    console.log(`💱 Updated exchange rate: 1 AR = $${AR_TO_USD} USD`);
  } catch (error) {
    console.error('Error updating exchange rate:', error.message);
  }
}

wss.on('connection', (ws) => {
  console.log('✅ New customer connected to the widget');
  sendGoalUpdate(ws);
});

function sendGoalUpdate(ws) {
  const progress = Math.min((currentTipsAR / MONTHLY_GOAL_AR) * 100, 100);
  const message = {
    type: 'goalUpdate',
    data: {
      current: currentTipsAR,
      goal: MONTHLY_GOAL_AR,
      progress: progress,
      rate: AR_TO_USD,
      usdValue: (currentTipsAR * AR_TO_USD).toFixed(2),
      goalUsd: (MONTHLY_GOAL_AR * AR_TO_USD).toFixed(2)
    }
  };
  
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

async function getAddressTransactions(address) {
  try {
    const graphqlData = await arweaveGraphQL(GRAPHQL_QUERY, {
      address: address
    });
    
    if (graphqlData?.transactions?.edges) {
      return graphqlData.transactions.edges.map(edge => ({
        id: edge.node.id,
        owner: edge.node.owner.address,
        target: address,
        quantity: edge.node.quantity.ar * 1e12,
        block: edge.node.block?.height,
        timestamp: edge.node.block?.timestamp
      }));
    }

    console.log('⚠️ Using REST API as a fallback');
    const response = await axios.get(`${ARWEAVE_GATEWAY}/tx/history/${address}`, {
      timeout: 15000
    });
    
    if (Array.isArray(response.data)) {
      return response.data.map(tx => ({
        id: tx.txid,
        owner: tx.owner,
        target: tx.target || '',
        quantity: tx.quantity,
        block: tx.block_height,
        timestamp: tx.block_timestamp
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error in getAddressTransactions:', error.message);
    return [];
  }
}

async function checkTransactions() {
  try {
    console.log('🔍 Looking for transactions for', YOUR_AR_ADDRESS);
    const txs = await getAddressTransactions(YOUR_AR_ADDRESS);
    
    if (txs.length === 0) {
      console.log('ℹ️ No transactions found. Have AR transactions been sent to this address?');
      return;
    }

    for (const tx of txs) {
      if (!tx.id || processedTxs.has(tx.id)) continue;
      
      if (tx.target === YOUR_AR_ADDRESS && tx.quantity) {
        const amount = (tx.quantity / 1e12).toFixed(6);
        processedTxs.add(tx.id);
        
        console.log(`💰 New transaction: ${amount} AR`, {
          from: tx.owner.slice(0, 6) + '...',
          txId: tx.id.slice(0, 8) + '...',
          block: tx.block,
          timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : 'pending'
        });
        
        currentTipsAR += parseFloat(amount);
        
        wss.clients.forEach(client => {
          sendGoalUpdate(client);
        });
      }
    }
  } catch (error) {
    console.error('Error in checkTransactions:', error.message);
  }
}

app.use(express.static('public'));
app.use(express.json());

app.post('/update-tips', (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: "Amount is required and must be a number" });
  }
  
  currentTipsAR = parseFloat(amount);
  wss.clients.forEach(client => {
    sendGoalUpdate(client);
  });
  
  res.json({ success: true, current: currentTipsAR });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Tip goal server in http://localhost:${PORT}`);
  console.log(`👛 Wallet Monitoring: ${YOUR_AR_ADDRESS}`);
  console.log(`🎯 Monthly goal: ${MONTHLY_GOAL_AR} AR`);
  console.log(`💰 Initial tip: ${currentTipsAR} AR`);
  
  updateExchangeRate();
  checkTransactions();
  
  setInterval(updateExchangeRate, 3600000); // Every hour
  setInterval(checkTransactions, 60000); // Every minute
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
});