


class ViNetPool {
	constructor() {
		this._totalSupply = 0;
		this._balances = {};
		this._initPrice = 0.1;
		this._relaseAmount = 1000000;
		this._tokenInPool = 0;
		this._moneyInPool = 0;
		this.stateEnum = {
			ICO: 1,
			IDO: 2,
			subIDO: 3
		};
		this.state = this.stateEnum.ICO;
		this.currentStep = 1;
		this.subIDOSold = 0;
		this.sqrt2 = 1.4142135623730951;
	}

	icoPrice() {
		return this.icoPriceAt(this.currentStep)
	}

	icoPriceAt(k) {
		return 2**(k-1) * this._initPrice;
	}

	poolConstant() {
		return this._tokenInPool * this._moneyInPool;
	}

	currentPrice() {
		return this._tokenInPool==0 ? 0 : (this._moneyInPool / this._tokenInPool);
	}

	tokenBeforeICO(k) {
		return this.tokenAfterICO(k-1)*BigInt(10**16)/BigInt(this.sqrt2*10**16)
	}

	tokenAfterICO(k) {
		if ( k<=0 ) return BigInt(0);
		return this.tokenBeforeICO(k) + BigInt(this._relaseAmount) * BigInt(10**18)/BigInt(2)
	}

	moneyAfterICO(k) {
		let delta = k>1 ? this.poolConstantAt(k-1)*this.sqrt2/this.tokenAfterICO(k-1) : 0;
		return delta + (this._relaseAmount/2) * this.icoPriceAt(k)
	}

	moneyIcanUse(k=0) {
		return k==0? (this.poolConstant()/this._totalSupply) : this.poolConstantAt(k)/(k*this._relaseAmount)
	}

	// moneyIcanUse() {
	// 	return this.poolConstant()/this._totalSupply
	// }

	poolConstantAt(k) {
		if ( k==0 ) return 0;
		return this.tokenAfterICO(k) * this.moneyAfterICO(k)
	}

	totalSupply() {
		return this._totalSupply;
	}

	balanceOf(address) {
		return this._balances[address];
	}

	buy(address, amount) { // amount is money
		if ( !address || !amount || isNaN(amount) ) return false;
		let poolConstant = this.poolConstant()
		let icoPrice = this.icoPrice()
		let nextBreak, assumingToken, buyNowCost, buyNowToken;
		switch(this.state) {
			case this.stateEnum.ICO:
				nextBreak = this.tokenAfterICO(this.currentStep)-this._tokenInPool;
				assumingToken = amount/icoPrice
				break;
			case this.stateEnum.IDO:
				nextBreak = this._tokenInPool-this.tokenBeforeICO(this.currentStep+1);
				assumingToken = this._tokenInPool - poolConstant/(this._moneyInPool+amount)
				break;
			case this.stateEnum.subIDO:
				// nextBreak = this._tokenInPool-Math.sqrt(poolConstant/icoPrice)
				nextBreak = this.subIDOSold
				assumingToken = this._tokenInPool - poolConstant/(this._moneyInPool+amount)
				break;
		}

		buyNowToken = Math.min(nextBreak, assumingToken)
		buyNowCost =  amount
		if ( assumingToken>nextBreak )
			buyNowCost = this.state==this.stateEnum.ICO ? buyNowToken*icoPrice : (poolConstant/(this._tokenInPool-buyNowToken)-this._moneyInPool)

		// console.log(this)
		// console.log({amount, nextBreak, assumingToken, buyNowCost, buyNowToken, poolConstant})
		// console.log('----')

		this._moneyInPool += buyNowCost;
		if ( this.state==this.stateEnum.ICO ) { // add more token to pool when ICO
			this._tokenInPool += buyNowToken;
			this._totalSupply += buyNowToken * 2
		} else this._tokenInPool -= buyNowToken;
		this._balances[address] = (this._balances[address] || 0) + buyNowToken; // send to user balance

		if ( assumingToken>=nextBreak ) {
			switch(this.state) {
				case this.stateEnum.ICO:
					this.state = this.stateEnum.IDO
					break;
				case this.stateEnum.IDO:
					this.state = this.stateEnum.ICO
					this.currentStep++
					break;
				case this.stateEnum.subIDO:
					this.state = this.stateEnum.ICO
					this.subIDOSold = 0;
					break;
			}

			if ( amount > buyNowCost )
				this.buy(address, amount - buyNowCost)
		}
		if ( this.subIDOSold ) this.subIDOSold -= buyNowToken
		return true;
	}

	sell(address, amount) { // amount is number of Token
		if ( !address || !amount || isNaN(amount) || this._balances[address]<amount ) return false;
		this._balances[address] -= amount;
		let currentMoney = this._moneyInPool;
		this._moneyInPool = this.poolConstant() / (this._tokenInPool+amount);
		this._tokenInPool += amount;
		if ( this.state==this.stateEnum.ICO ) this.state = this.stateEnum.subIDO;
		if ( this.state==this.stateEnum.subIDO ) this.subIDOSold += amount;
		// usd send to user = currentMoney - this._moneyInPool
		return true;
	}
}

module.exports = ViNetPool;

// let pool = new ViNetPool()
// for ( let i=1; i<11; i++ ) {
// 	console.log( 'Price: ', pool.icoPriceAt(i), ', total token: ', i*pool._relaseAmount )
// 	// console.log( tokenAfterICO(i) )
// 	console.log( "moneyAfterICO", pool.moneyAfterICO(i) )
// 	// console.log( poolConstant(i) )
// 	// console.log( moneyIcanUse(i)/moneyAfterICO(i) )
// 	console.log( "moneyIcanUse after ICO", pool.moneyIcanUse(i) )
// 	console.log( '------' )
// }

// pool.buy('abcdef', 30000)
// console.log(pool)
// pool.sell('abcdef', 100000)
// pool.buy('abcdef', 48210.68)
// console.log(pool)
// console.log(pool.moneyIcanUse())

function toFixed(x) {
  if (Math.abs(x) < 1.0) {
    var e = parseInt(x.toString().split('e-')[1]);
    if (e) {
        x *= Math.pow(10,e-1);
        x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
    }
  } else {
    var e = parseInt(x.toString().split('+')[1]);
    if (e > 20) {
        e -= 20;
        x /= Math.pow(10,e);
        x += (new Array(e+1)).join('0');
    }
  }
  return x;
}

let pool = new ViNetPool()
let fixedTokenBeforeICO = []
let fixedTokenAfterICO = []
let fixedMoneyAfterICO = []
let fixedIcoPriceAt = []
let fixedPoolConstantAt = []
for ( let i=0; i<30; i++ ) {
	fixedTokenBeforeICO[i] = pool.tokenBeforeICO(i)
	// fixedTokenAfterICO[i] = toFixed(pool.tokenAfterICO(i) * 10**18)
	// fixedMoneyAfterICO[i] = pool.moneyAfterICO(i)
	fixedIcoPriceAt[i] = toFixed(pool.icoPriceAt(i) * 10**18)
	// fixedPoolConstantAt[i] = pool.poolConstantAt(i)
}
console.log({
	fixedTokenBeforeICO, fixedTokenAfterICO, fixedIcoPriceAt
})
