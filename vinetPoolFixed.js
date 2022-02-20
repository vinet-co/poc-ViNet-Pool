


class ViNetPool {
	constructor() {
		this._totalSupply = 0;
		this._balances = {};
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

		this.icoPrice = [0.05,0.1,0.2,0.4,0.8,1.6,3.2,6.4,12.8,25.6,51.2,102.4,204.8,409.6,819.2,1638.4,3276.8,6553.6,13107.2,26214.4,52428.8,104857.6,209715.2,419430.4,838860.8,1677721.6,3355443.2,6710886.4,13421772.8,26843545.6];
		this.tokenBeforeICO = [0,0,353553.39059327374,603553.3905932738,780330.0858899106,905330.0858899106,993718.433538229,1056218.433538229,1100412.6073623882,1131662.6073623882,1153759.6942744676,1169384.6942744676,1180433.2377305075,1188245.7377305075,1193770.0094585274,1197676.2594585274,1200438.3953225373,1202391.5203225373,1203772.5882545423,1204749.1507545423,1205439.6847205448,1205927.9659705448,1206273.232953546,1206517.373578546,1206690.0070700466,1206812.0773825466,1206898.394128297,1206959.429284547,1207002.587657422,1207033.105235547];
		this.tokenAfterICO = [0,500000,853553.3905932738,1103553.3905932738,1280330.0858899106,1405330.0858899106,1493718.433538229,1556218.433538229,1600412.6073623882,1631662.6073623882,1653759.6942744676,1669384.6942744676,1680433.2377305075,1688245.7377305075,1693770.0094585274,1697676.2594585274,1700438.3953225373,1702391.5203225373,1703772.5882545423,1704749.1507545423,1705439.6847205448,1705927.9659705448,1706273.232953546,1706517.373578546,1706690.0070700466,1706812.0773825466,1706898.394128297,1706959.429284547,1707002.587657422,1707033.105235547];
	}

	poolConstant() {
		return this._tokenInPool * this._moneyInPool;
	}

	moneyIcanUse() {
		return this.poolConstant()/this._totalSupply;
	}

	totalSupply() {
		return this._totalSupply;
	}

	balanceOf(address) {
		return this._balances[address];
	}

	buy(address, amount) { // amount is money
		if ( !address || !amount || isNaN(amount) ) return false;

		let tokenInPool = this._tokenInPool;
		let moneyInPool = this._moneyInPool;
		let state = this.state;
		let currentStep = this.currentStep;
		let subIDOSold = this.subIDOSold;
		let totalSupply = this._totalSupply;
		let moneyLeft = amount;
		let tokenBought = 0;
		let mintToken = 0, transferToken = 0;

		while ( moneyLeft>0 ) {
			let poolConstant = tokenInPool * moneyInPool;
			let icoPrice = this.icoPrice[currentStep]
			let nextBreak, assumingToken, buyNowCost, buyNowToken;
			switch(state) {
				case this.stateEnum.ICO:
					nextBreak = this.tokenAfterICO[currentStep]-tokenInPool;
					assumingToken = moneyLeft/icoPrice
					break;
				case this.stateEnum.IDO:
					nextBreak = tokenInPool-this.tokenBeforeICO[currentStep+1];
					assumingToken = tokenInPool - poolConstant/(moneyInPool+moneyLeft)
					break;
				case this.stateEnum.subIDO:
					nextBreak = subIDOSold
					assumingToken = tokenInPool - poolConstant/(moneyInPool+moneyLeft)
					break;
			}

			buyNowToken = Math.min(nextBreak, assumingToken)
			buyNowCost =  moneyLeft
			if ( assumingToken>nextBreak )
				buyNowCost = state==this.stateEnum.ICO ? buyNowToken*icoPrice : (poolConstant/(tokenInPool-buyNowToken)-moneyInPool)

			moneyInPool += buyNowCost;
			if ( state==this.stateEnum.ICO ) { // add more token to pool when ICO
				tokenInPool += buyNowToken;
				totalSupply += buyNowToken * 2;
				mintToken += buyNowToken
			} else {
				tokenInPool -= buyNowToken;
				transferToken += buyNowToken;
			}
			tokenBought += buyNowToken;

			if ( assumingToken>=nextBreak ) {
				switch(state) {
					case this.stateEnum.ICO:
						state = this.stateEnum.IDO
						break;
					case this.stateEnum.IDO:
						state = this.stateEnum.ICO
						currentStep++
						break;
					case this.stateEnum.subIDO:
						state = this.stateEnum.ICO
						subIDOSold = 0;
						break;
				}
			}
			if ( subIDOSold ) subIDOSold -= buyNowToken;
			moneyLeft -= buyNowCost
		}
		let delta = (moneyInPool-this._moneyInPool)-amount
		if ( delta<-1 || delta>1 ) {
			console.log("something wrong", (moneyInPool-this._moneyInPool), amount)
			return false;
		}

		console.log({ mintToken, transferToken })
		console.log("tokenInPool", tokenInPool, this._tokenInPool)
		console.log("_balances[address]", this._balances[address], tokenBought)

		this._tokenInPool = tokenInPool;
		this._moneyInPool = moneyInPool;
		this.currentStep = currentStep;
		this.state = state;
		this.subIDOSold = subIDOSold;
		this._totalSupply = totalSupply;
		this._balances[address] = (this._balances[address] || 0) + tokenBought; // send to user balance

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


