(function(web3){
	var MOVES = {
		SELECT 	: 3,
		BET		: 5,
		CALL 	: 7,
		PROOF	: 11,
		FOLD	: 13,
		LEAVE	: 17
	};

	var ROUNDTYPES = {
		READY	: 666,
		SELECT 	: MOVES.SELECT,
		BET 	: MOVES.BET,
		CALLFOLD: MOVES.CALL * MOVES.FOLD,
		PROVE	: MOVES.PROOF
	};


	var ROUNDS = [
		// ROUNDTYPES.READY,
		ROUNDTYPES.SELECT,
		ROUNDTYPES.BET,
		ROUNDTYPES.CALLFOLD,
		ROUNDTYPES.SELECT,
		ROUNDTYPES.BET,
		ROUNDTYPES.CALLFOLD,
		ROUNDTYPES.SELECT,
		ROUNDTYPES.BET,
		ROUNDTYPES.CALLFOLD,
		ROUNDTYPES.PROVE,
		ROUNDTYPES.BET,
		ROUNDTYPES.CALLFOLD,
		ROUNDTYPES.PROVE,
		ROUNDTYPES.PROVE
	];

	var SELECTINDEXES = [1,0,0,2,0,0,3,0,0,5,0,0,6,7];
	var PROOFTOSELECT = [0,1,4,7];

	web3.Game = {
		MOVES 		: MOVES,
		ROUNDS 		: ROUNDS,
		ROUNDTYPES 	: ROUNDTYPES
	};



	var _stack = [];
	var _roundStack = [];
	
	var _isAlreadySelected = {
	};
	var currentState = {};
	var _gameState = {};
	var _onStateChange;
	var _onRoundChange;


	// SAVE MOVES //
	web3.Game.saveMove = function(move){
		currentState[move.who] = move;
		if(currentState[getOther(move.who)])
			return this.saveState();
		if(move.type == MOVES.FOLD){ // TODO -- this is propably wrong but i can hhandle it ftm
			return this.saveState();
		}
		return true;
	};
	web3.Game.isAvailableNow = function(type){
		return ROUNDS[_roundStack.length] % type == 0;
	}
	web3.Game.isValidMove = function(move){    // GAME STATE CONTRAINT FUNCTION 
		var type = move.type;
		if(!this.isAvailableNow(type))return false;

		switch(type){
			case MOVES.SELECT :
				var opp = getOther(move.who);
				if(!isCorrectSelectIndex(move.data.selectIndex))return false;
				if(_gameState.selected[opp][move.data[opp] % 6])return false;
				if(_gameState.hidden[move.who][move.data.selectIndex])return false; // already selected
				if(move.data[move.who].length != 66)return false;
				return true;
			case MOVES.PROOF  :
				var data = move.data[move.who];
				//if(web3.sha3(JSON.stringify(data)) != _roundStack[SELECTINDEXES.indexOf(move.data.selectIndex%4)][move.who].data[move.who])return false;
				if(_gameState.selected[getOther(move.who)][move.data[move.who] % 6])return false;
				if(_gameState.hidden[move.who][move.data.selectIndex%4] != web3.sha3(JSON.stringify(data)))return false;

				return true;
			case MOVES.BET    :
				var data = move.data.amount;
				if( data < 0 || parseInt(data) != data)return false;
				if( _gameState.coins[move.who] < data )return false;
				if( _gameState.coins[getOther(move.who)] < data)return false;
				return true;
			case MOVES.FOLD	  :
				if( _gameState.bets[getOther(move.who)] < _gameState.bets[move.who] )return false;
				return true;
			case MOVES.CALL	  :
				return true;
		}
	};
	web3.Game.performMove = function(move){  // GAME STATE CHANGING FUNCTION 
		if(!this.isValidMove(move))return false;
		switch(move.type){
			case MOVES.SELECT :
				var opp = getOther(move.who);
				_gameState.selected[opp][move.data[opp] % 6] = SELECTINDEXES[_roundStack.length];
				_gameState.hidden[move.who][move.data.selectIndex] = move.data[move.who]; // Dictionary of hidden hashes 
				break;
			case MOVES.PROOF  :
				var data = move.data[move.who];
				if(web3.sha3(JSON.stringify(data)) != _gameState.hidden[move.who][this.getCurrentProofIndex()%4])return false;
				_gameState.hidden[move.who][this.getCurrentProofIndex()%4] = data;
				break;
			case MOVES.BET    :
				var data = move.data.amount;
				_gameState.coins[move.who] -= data;
				_gameState.pot += data;
				_gameState.bets[move.who] = data;
				break;
			case MOVES.FOLD	  :
				_gameState.fold[move.who] = true;
				break;
			case MOVES.CALL	  :
				var def = Math.step(_gameState.bets[getOther(move.who)] - _gameState.bets[move.who]);
				_gameState.coins[move.who] -= def;
				_gameState.pot += def;
				break;
		}
		return this.saveMove(move);
	};

	web3.Game.getCurrentProofIndex = function(){
		return SELECTINDEXES[_roundStack.length];
	};

	web3.Game.saveProof = function(index, proof){
		this.proofs[index] = proof; 
	};

	// SAVE ROUND // 
	web3.Game.saveRound = function(){
		_stack.push(_roundStack);
		_roundStack = [];
		
		// TODO  calculate winner!!! 


		// 

		_isAlreadySelected[web3.eth.defaultAccount] = [0,0,0,0,0,0];
		_isAlreadySelected[web3.eth.opponentAccount] = [0,0,0,0,0,0];

		_gameState.coins[web3.eth.defaultAccount] -= 1;
		_gameState.coins[web3.eth.opponentAccount] -= 1;
		
		_gameState.hidden[web3.eth.defaultAccount]  = {};
		_gameState.hidden[web3.eth.opponentAccount] = {};

		_gameState.pot = 2;
		_gameState.round++;
		_gameState.roundstate = 0;
		_gameState.bets[web3.eth.defaultAccount] = 0;
		_gameState.bets[web3.eth.opponentAccount] = 0

		_gameState.selected[web3.eth.defaultAccount] = [0,0,0,0,0,0];
		_gameState.selected[web3.eth.opponentAccount] = [0,0,0,0,0,0];

		_gameState.fold[web3.eth.defaultAccount] = false;
		_gameState.fold[web3.eth.opponentAccount] = false;

		this.proofs = {};

		this.saveToDB();
		if(_onRoundChange)_onRoundChange();
		return true;
	};	
	// GAME STATE /// 
	web3.Game.saveState = function(){
		_roundStack.push(currentState);
		_gameState.roundstate ++;
		currentState = {};
		if(_onStateChange)_onStateChange();
		if(this.isValidRound())return this.saveRound();
		this.saveToDB();
		return true;
	};
	web3.Game.checkRound = function(){
		if(this.isValidRound())return this.saveRound();
		return false;
	}
	web3.Game.setOnStateChange = function(fn){_onStateChange = fn;}
	web3.Game.clearOnStateChange = function(){delete _onStateChange;}
	web3.Game.setOnRoundChange = function(fn){_onRoundChange = fn;}
	web3.Game.clearOnRoundChange = function(){delete _onRoundChange;}

	// ROUND //
	// function hasRoundFinished(){
	// 	//_roundStack;
	// 	if(web3.Game.isValidRound(currentState)){
	// 		web3.Game.saveRound();
	// 	}
	// 	else{
	// 		// Something is invalid!!! 
	// 		console.log(currentState);
	// 		throw new Error("This state is not valid! ^^");
	// 	}
	// }
	web3.Game._givemoney = function(addr){
		_gameState.coins[addr] += _gameState.pot;
		_gameState.pot = 0;
	};
	web3.Game.isValidRound = function(){
		if(_gameState.fold[web3.eth.defaultAccount]){
			this._givemoney(web3.eth.opponentAccount);
			return true;
		}
		if(_gameState.fold[web3.eth.opponentAccount]){
			this._givemoney(web3.eth.defaultAccount);
			return true;
		}
		
		if(_gameState.roundstate == SELECTINDEXES.length){
			var sums = this.findSums();
			if(sums[web3.eth.defaultAccount] > sums[web3.eth.opponentAccount]){ // TODO - check equality
				this._givemoney(web3.eth.defaultAccount);
				return true;
			}
			else{
				this._givemoney(web3.eth.opponentAccount);
				return true;
			}
		}

		return false;
	};

	// MOVE CREATION ///
	web3.Game._createMove = function (type, data){
		if(	type != web3.Game.MOVES.SELECT &&
			type != web3.Game.MOVES.BET &&
			type != web3.Game.MOVES.FOLD &&
			type != web3.Game.MOVES.CALL &&
			type != web3.Game.MOVES.PROOF &&
			type != web3.Game.MOVES.LEAVE )
			throw new Error("This type of move doesnt exist. Type : " + type);

		var move = {
			who 		: web3.eth.defaultAccount,
			type 		: type,
			data 		: JSON.parse(JSON.stringify(data))
			//lastState	: _calculateLastStateHash()
		};
		return move;
	};
	
	web3.Game.createSelectMove = function (mdata1, mdata2){
		if(!this.isAvailableNow(MOVES.SELECT))throw new Error("This type of move is not available now");

		data1 = this.applyRotation(mdata1);
		data2 = this.applyRotation(mdata2);

		if(data1 < 0 || data1 > 5 )throw new Error("A SELECT Move is always between [0-5]");
		if(data2 < 0 || data2 > 5 )throw new Error("A SELECT Move is always between [0-5]");
		if(_gameState.selected[web3.eth.opponentAccount][data2])throw new Error("You cannot select an already selected column");
		if(_isAlreadySelected[web3.eth.defaultAccount][data1])throw new Error("You cannot select an already selected column");

		var cryptoData1 = _findRandomBigNumber(data1, 6);
		var cryptoData2 = _findRandomBigNumber(data2, 6);
		_isAlreadySelected[web3.eth.defaultAccount][data1] = SELECTINDEXES[_roundStack.length];
		var cryptoData = {
		 	selectIndex : SELECTINDEXES[_roundStack.length]
		};
		cryptoData[web3.eth.defaultAccount] = web3.sha3(''+cryptoData1);	
		cryptoData[web3.eth.opponentAccount] = cryptoData2;
				
		var move = this._createMove(web3.Game.MOVES.SELECT, cryptoData);
		cryptoData[web3.eth.defaultAccount] = cryptoData1;
		var proof = this.createProofMove(cryptoData);
		return {
			move : move,
			proof: proof
		};
	};
	web3.Game.createBetMove = function (amount){
		if(!this.isAvailableNow(MOVES.BET))throw new Error("This type of move is not available now");
		if(amount < 0 || parseInt(amount) != amount)throw new Error("Amount parameter must be positive integer or 0!")
		if(amount > _gameState.coins[web3.eth.defaultAccount])throw new Error("Not enough coins to bet! Current Coins:" + _gameState.coins[web3.eth.defaultAccount] + " Amount requested:" + amount );
		if(amount > _gameState.coins[web3.eth.opponentAccount])throw new Error("Not enough opponent coins to bet! Current Coins:" + _gameState.coins[web3.eth.opponentAccount] + " Amount requested:" + amount );

		var cryptoData = {
		 	amount : amount
		};
		var move = this._createMove(web3.Game.MOVES.BET, cryptoData);
		return move;
	};
	web3.Game.createCallMove = function (data){
		if(!this.isAvailableNow(MOVES.CALL))throw new Error("This type of move is not available now");
		var cryptoData = {
		};
		var move = this._createMove(web3.Game.MOVES.CALL, cryptoData);
		return move;
	};

	web3.Game.createFoldMove = function (data){
		if(!this.isAvailableNow(MOVES.FOLD))throw new Error("This type of move is not available now");
		var cryptoData = {
		};
		var move = this._createMove(web3.Game.MOVES.FOLD, cryptoData);
		return move;
	};

	web3.Game.createProofMove = function (data){
		var r = this._createMove(web3.Game.MOVES.PROOF, data);
		return r;
	};
	web3.Game.getProofMove = function (index){
		return this.proofs[index];
	};

	web3.Game.saveToDB = function(){

		web3.db.putString(web3.db.DBNAME,"THEREAREDATA","true");
		
		web3.db.putString(web3.db.DBNAME,"_stack",JSON.stringify(_stack));
		web3.db.putString(web3.db.DBNAME,"_roundStack",JSON.stringify(_roundStack));
		web3.db.putString(web3.db.DBNAME,"_isAlreadySelected",JSON.stringify(_isAlreadySelected));
		web3.db.putString(web3.db.DBNAME,"_currentState",JSON.stringify(currentState));
		web3.db.putString(web3.db.DBNAME,"_gameState",JSON.stringify(_gameState));
		web3.db.putString(web3.db.DBNAME,"_stack",JSON.stringify(_stack));
		web3.db.putString(web3.db.DBNAME,"proofs",JSON.stringify(this.proofs));
	}

	web3.Game.clearDB = function(){
		web3.db.putString(web3.db.DBNAME,"THEREAREDATA",undefined);
	}
	web3.Game.loadFromDB = function(){
		if(!web3.db.getString(web3.db.DBNAME,"THEREAREDATA"))return;

		_stack = JSON.parse(web3.db.getString(web3.db.DBNAME,"_stack"));
		_roundStack = JSON.parse(web3.db.getString(web3.db.DBNAME,"_roundStack"));
		_isAlreadySelected = JSON.parse(web3.db.getString(web3.db.DBNAME,"_isAlreadySelected"));
		_currentState = JSON.parse(web3.db.getString(web3.db.DBNAME,"_currentState"));
		_gameState = JSON.parse(web3.db.getString(web3.db.DBNAME,"_gameState"));
		_stack = JSON.parse(web3.db.getString(web3.db.DBNAME,"_stack"));
		this.proofs = JSON.parse(web3.db.getString(web3.db.DBNAME,"proofs"));
	}
	//////////////////////
	/// GAME HELPERS ////
	web3.Game.calculateMySum =function (){

	};

	web3.Game.calculateMyMoney = function(){

	};
	web3.Game.getMapArray = function(){
		return this._maparray;
	};
	web3.Game.getState = function(){
		return _gameState;
	};
	web3.Game.getStack = function(){
		return _stack;
	};
	web3.Game.getRoundStack = function(){
		return _roundStack;
	};
	web3.Game.haveSelected = function(i){
		i = this.applyRotation(i);
		return _isAlreadySelected[web3.eth.defaultAccount][i] != 0;
	};
	web3.Game.isMyNumber = function(i,j){
		j = this.applyRotation(j);
		return _isAlreadySelected[web3.eth.defaultAccount][j] == _gameState.selected[web3.eth.defaultAccount][i]
		  &&  _isAlreadySelected[web3.eth.defaultAccount][j]  != 0;
	};

	web3.Game.findSums = function(){
		var sums = {
			[web3.eth.defaultAccount] : 0,
			[web3.eth.opponentAccount]: 0
		};
		var map = calculateMapArray(this.maphash, this._mapRotation);
		for(var i=0;i<6;i++)
			for (var j = 0; j < 6; j++)
				if(web3.Game.isMyNumber(i,j))
					sums[web3.eth.defaultAccount] += map[i][j];
				else if(web3.Game.isOpponentNumber(i,j))
					sums[web3.eth.opponentAccount] += map[i][j];
		return sums;
	};

	web3.Game.isOpponentNumber = function(i,j){
		j = this.applyRotation(j);
		return _gameState.hidden[web3.eth.opponentAccount][_gameState.selected[web3.eth.opponentAccount][j]] % 6 == i && typeof _gameState.hidden[web3.eth.opponentAccount][_gameState.selected[web3.eth.opponentAccount][j]] == "number" ;
	};

	web3.Game.reset = function(){
		web3.Game.init();
	}

	web3.Game.setMapRotation = function(r){
		this._mapRotation = r;
		this._maparray = calculateMapArray(this.maphash, this._mapRotation);
	};
	web3.Game.getMapRotation = function(){
		return web3.Game._mapRotation;
	};
	web3.Game.applyRotation = function(d){
		if(this._mapRotation == 1){
			d = 5  - d;
		}
		return d;
	};
	var _applyStateRotation = function(arr){
		var a = [];
		for(var i = 0; i < arr.length; i ++){
			a.push(arr[5-i]);
		}
		return a;
	};
	web3.Game.applyStateRotation = function(s){
		var r = JSON.parse(JSON.stringify(s));
		if(this._mapRotation == 1){
			r.selected[web3.eth.opponentAccount] = _applyStateRotation(s.selected[web3.eth.opponentAccount]);
		}
		return r;
	};
	///  INIT  //
	web3.Game.init = function(mapHash){
		this.maphash = mapHash;
		this._maparray = calculateMapArray(this.maphash);
		_stack = [];
		_roundStack = [];
		currentState = {};
		_isAlreadySelected[web3.eth.defaultAccount] = [0,0,0,0,0,0];
		_isAlreadySelected[web3.eth.opponentAccount]= [0,0,0,0,0,0];
		
		_gameState = {
			coins : {
				[web3.eth.defaultAccount] : 99, // TODO CHANGE web3.eth.defaultAccount and opAcc to be settable to object 
				[web3.eth.opponentAccount]: 99
			},
			selected :{
				[web3.eth.defaultAccount] : [0,0,0,0,0,0],
				[web3.eth.opponentAccount]: [0,0,0,0,0,0]
			},
			pot 			: 2,
			round 			: 1,
			roundstate		: 0,
			bets			: {
				[web3.eth.defaultAccount] : 0,
				[web3.eth.opponentAccount]: 0
			},
			fold 			: {
				[web3.eth.defaultAccount] : 0,
				[web3.eth.opponentAccount]: 0	
			},
			hidden 	:{
				[web3.eth.defaultAccount] : {},
				[web3.eth.opponentAccount]: {}					
			}
		};

		this.proofs = {};
	};

	// STATE INTERCEPTOR
	web3.Game._stateInterceptor = function(data, original){
		if(data.signature.data.stateConflict){
			if( data.signature.data.myCurrentState ){
				// verify and reset Game

				return false;
			}
			// send My state
			var data = {
				myCurrentState : {
					stack : web3.Game.getStack()

				}
			};
			return false;
		}
		return data;
	};






	function isCorrectSelectIndex(index){
		return SELECTINDEXES[_roundStack.length] == index;
	}






	// PRIVATE HELPERS //
	function _calculateLastStateHash(){
		var hash 		= web3.sha3(_gameState);
		return hash;
	}

	function _findRandomBigNumber(num, field){
		var randomNumber = Math.floor(10000000000 + Math.random() * 90000000000);
		while(randomNumber % field != num){
			randomNumber++;
		}
		return randomNumber;
	}

	function getOther(acc){
		return acc == web3.eth.defaultAccount ? web3.eth.opponentAccount : web3.eth.defaultAccount;
	}

	/////////////////////
	//// CALCULATIONS ///
	/////////////////////
	function hashToNumbers(hash){
		var nums = [];
		hash = hash.substr(2);
		for(var i=0;i<32;i++){
			var b = hash.substr(2*i, 2*i+2);
			nums.push(web3.toDecimal('0x'+b));
		}
		return nums;
	}
	/////////////////////
	function getNewMapHash(mapHash){
		return web3.sha3(web3.sha3(web3.sha3(mapHash)));
	}
	function calculateMapArray(mapHash, rot){
		console.log("Calculating map array for map hash: " + mapHash);
		var first32Hash = mapHash,
		second32Hash 	= web3.sha3(first32Hash),
		third32Hash		= web3.sha3(second32Hash);
		// Make hash to numbers
		var numbers 	= hashToNumbers(first32Hash)
				  .concat(hashToNumbers(second32Hash))
				  .concat(hashToNumbers(third32Hash));

		// init mapArray
		var maparray = [];
		for(var i=0;i<6;i++){
			maparray.push([]);
			for(var j=0;j<6;j++){
				maparray[i][j] = i*6 + j + 1;
			}
		}
		///
		/// helper local swapPosition 
		function swapPositions(a,b){
			a  = a % 36
			ai = a % 6;
			aj = parseInt(a / 6);
			
			b  = b % 36
			bi = b % 6;
			bj = parseInt(b / 6);

			var temp = maparray[ai][aj];
			maparray[ai][aj] = maparray[bi][bj];
			maparray[bi][bj] = temp;
		}
		///
		for(var i=0;i<numbers.length;i++){
			swapPositions(i, numbers[i]);
		}
		////////////////////////////////
		//console.log(maparray);
		////////////////////////////////

		// Rotate based on rot
		if(rot == 1){
			var f = 3;
			var c = 3;
			var n = 6;
			for(var k = 0;k < 3;k++)
			for( var x = 0; x < f; x++ ){
				for(var y = 0; y <c;y++ ){
			    	var temp = maparray[x][y];
			    	maparray[x][y] = maparray[y][n-1-x];
			    	maparray[y][n-1-x] = maparray[n-1-x][n-1-y];
			    	maparray[n-1-x][n-1-y] = maparray[n-1-y][x];
			    	maparray[n-1-y][x] = temp;
				}
			}
		}


		return maparray;
	}


	// Math Helpers
	Math.step = function(x){return x < 0 ? 0 : x;};
})(web3);