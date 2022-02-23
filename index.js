const express = require('express')
const path = require('path')
const cors = require('cors');
const bodyParser = require('body-parser')
const VinetPool = require('./vinetPoolFixed')
var pool = new VinetPool()
const app = express()
app.use(cors());
const port = 3001
let records = []

var formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',

  // These options are needed to round to whole numbers if that's what you want.
  minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});
function formatMoney(amount) {
  return formatter.format(amount).replace('$', '')
}

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
})

app.post('/buy', (req, res) => { // content-type: json
  const { address, amount } = req.body;
  if ( !address || !amount ) return res.send({error: "invalid_input"});
  let status = pool.buy(address, parseFloat(amount))
  if ( status ) {
    records.push({
      moneyInPool: pool._moneyInPool,
      tokenInPool: pool._tokenInPool,
      desc: `${address} buy ${formatMoney(amount)}$ (balance: ${formatMoney(pool.balanceOf(address))} VNT)`
    })
  }
  res.send({ status })
})

app.post('/sell', (req, res) => { // content-type: json
  const { address, amount } = req.body;
  if ( !address || !amount ) return res.send({error: "invalid_input"});
  let status = pool.sell(address, parseFloat(amount))
  if ( status ) {
    records.push({
      moneyInPool: pool._moneyInPool,
      tokenInPool: pool._tokenInPool,
      desc: `${address} sell ${formatMoney(amount)} token (balance: ${formatMoney(pool.balanceOf(address))} VNT)`
    })
  }
  res.send({ status })
})

app.get('/history', (req, res) => { // content-type: json
  res.send(records)
})
app.get('/reset', (req, res) => { // content-type: json
  delete pool;
  pool = new VinetPool()
  records = []
  res.send({status: true})
})
app.get('/forecast', (req, res) => { // content-type: json
  let forecastPool = new VinetPool();
  let maxToken = req.query.maxToken || 100000
  let maxMoney = req.query.maxMoney || 10000
  let steps = [];
  for ( let i=0; i<10000; i++ ) {
    forecastPool.buy('forecast', 2^(forecastPool.currentStep-1)*1000);
    steps.push({
      moneyInPool: forecastPool._moneyInPool,
      tokenInPool: forecastPool._tokenInPool
    })
    if ( forecastPool._moneyInPool>maxMoney && forecastPool._tokenInPool>maxToken ) break;
  }

  res.send(steps)
})
app.post('/script', (req, res) => { // content-type: json
  let scriptPool = new VinetPool();
  let script = req.body.script || []
  let steps = [];
  for ( let event of script ) {
    scriptPool[event.name](event.address, event.amount)
    steps.push({
      moneyInPool: scriptPool._moneyInPool,
      tokenInPool: scriptPool._tokenInPool
    })
  }
  res.send(steps)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


// for ( let i=0; i<1000; i++ ) {
//   const address = 'abcdef';
//   const amount = 1000;
//   let status = pool.buy(address, parseFloat(amount))
//   if ( status ) {
//     records.push({
//       moneyInPool: pool._moneyInPool,
//       tokenInPool: pool._tokenInPool,
//       desc: `${address} buy ${formatMoney(amount)}$ (balance: ${formatMoney(pool.balanceOf(address))} VNT)`
//     })
//   }
// }


