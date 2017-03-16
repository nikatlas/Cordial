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
		PROVE	: MOVES.PROVE
	};


	var ROUNDS = [
		ROUNDTYPES.READY,
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
		ROUNDTYPES.PROVE,
		ROUNDTYPES.PROVE
	];

	var SELECTINDEXES = [0,1,0,0,2,0,0,3,0,0,0,0,0];

	web3.Game = {
		MOVES 		: MOVES,
		ROUNDS 		: ROUNDS,
		ROUNDTYPES 	: ROUNDTYPES
	};



	var _stack = [];
	var _roundStack = [];
	var _isAlreadySelected = {
		web3.eth.defaultAccount : {},
		web3.eth.opponentAccount: {}
	};
	var currentState = {};
	var _gameState = {};
	var _onStateChange;
	var _onRoundChange;


	// SAVE MOVES //
	web3.Game.saveMove = function(move){
		if(!isValidMove(move))throw new Error("This move is invalid");
		currentState[move.who] = move;
		if(currentState[getOther(move.who)])
			return web3.Game.saveState();
		return true;
	};
	function isAvailableNow (type){
		return ROUNDS[_gameState.round] % type;
	}
	web3.Game.isValidMove = function(move){    // GAME STATE CONTRAINT FUNCTION 
		var type = move.type;
		if(!isAvailableNow(type))return false;

		switch(type){
			case MOVES.SELECT :
				var opp = getOther(move.who);
				if(!isCorrectSelectIndex(move.data.selectIndex))return false;
				if(_gameState.selected[opp][move.data[opp] % 6])return false;
				if(_gameState.hidden[move.data.selectIndex][move.who])return false; // already selected
				if(move.data[move.who].length != 34)return false;
				return true;
			case MOVES.PROOF  :
				var data = move.data[move.who];
				if(web3.sha3(data) != _gameState.hidden[move.data.stateIndex][move.who])return false;
				if(_gameState.selected[move.who][move.data[move.who] % 6])return false;
				return true;
			case MOVES.BET    :
				var data = move.data.amount;
				if( data < 0 || parseInt(data) != data)return false;
				if( _gameState.coins[move.who] < data )return false;
				if( _gameState.coins[getOther(move.who)] < data)return false;
				return true;
			case MOVES.FOLD	  :
				return true;
			case MOVES.CALL	  :
				return true;
		}
	};
	web3.Game.performMove = function(move){  // GAME STATE CHANGING FUNCTION 
		if(!isValidMove(move))return false;
		switch(type){
			case MOVES.SELECT :
				var opp = getOther(move.who);
				_gameState.selected[move.data[opp] % 6] = _roundStack.length;
				_gameState.hidden[move.data.selectIndex] = move.data[move.who]; // Dictionary of hidden hashes 
				break;
			case MOVES.PROOF  :
				var data = move.data[move.who];
				if(web3.sha3(data) != _roundStack[SELECTINDEXES.indexOf(move.data.selectIndex)][move.who].data[move.who])return false;
				_gameState.selected[move.who][move.data[move.who] % 6] = move.stackIndex;
				_gameState.proofs[web3.sha3(data)] = data;
				break;
			case MOVES.BET    :
				var data = move.data.amount;
				_gameState.coins[move.who] -= data;
				_gameState.pot += data;
				_gameState.bets[move.who] = data;
				return true;
			case MOVES.FOLD	  :
				_gameState.coins[getOther(move.who)] += _gameState.pot;
				_gameState.pot = 0;
				_gameState.fold[move.who] = true;
				break;
			case MOVES.CALL	  :
				var def = Math.step(_gameState.bets[getOther(move.who)] - _gameState.bets[move.who]);
				_gameState.coins[move.who] -= def;
				_gameState.pot += def;
				break;
		}
		return web3.Game.saveMove(move);
	};
	// SAVE ROUND // 
	web3.Game.saveRound = function(){
		_stack.push(_roundStack);
		_roundStack = [];
		_gameState.coins[web3.eth.defaultAccount] -= 1;
		_gameState.coins[web3.eth.opponentAccount] -= 1;
		_gameState.pot = 2;
		_gameState.round++;
		if(_onRoundChange)_onRoundChange();
	};	
	// GAME STATE /// 
	web3.Game.saveState = function(){
		_roundStack.push[currentState];
		currentState = {};
		if(_onStateChange)_onStateChange();
		if(web3.Game.isValidRound())web3.Game.saveRound();
	};
	
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

	web3.Game.isValidRound = function(){
		if(_gameState.fold)
			if(_gameState.fold[Object.keys(_gameState.fold)[0]])return true;
		
		var keys = Object.keys(_gameState.selected);
		if( _gameState.selected[keys[0]].indexOf(0) > -1 )return false;
		if( _gameState.selected[keys[1]].indexOf(0) > -1 )return false;

		return true;
	};

	// MOVE CREATION ///
	web3.Game._createMove = function (type, data){
		if(!isAvailableNow(type))throw new Error("This type of move is not available now");
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
			data 		: data,
			lastState	: _calculateLastStateHash()
		};
	};
	
	web3.Game.createSelectMove = function (data1, data2){
		if(data1 < 0 || data1 > 5 )throw new Error("A SELECT Move is always between [0-5]");
		if(data2 < 0 || data2 > 5 )throw new Error("A SELECT Move is always between [0-5]");
		if(_gameState.selected[web3.eth.defaultAccount][data1])throw new Error("You cannot select an already selected column");
		if(_isAlreadySelected[web3.eth.opponentAccount][data2])throw new Error("You cannot select an already selected column");

		var cryptoData1 = _findRandomBigNumber(data1, 6);
		var cryptoData2 = _findRandomBigNumber(data2, 6);
		_isAlreadySelected[web3.eth.opponentAccount][data2] = cryptoData2;
		var cryptoData = {
		 	web3.eth.defaultAccount : web3.sha3(cryptoData1),
			web3.eth.opponentAccount : cryptoData2,
			selectIndex : SELECTINDEXES[_gameState.round]
		};
		var move = _createMove(web3.Game.MOVES.SELECT, cryptoData);
		var proof = createProofMove(cryptoData1);
		return {
			move : move,
			proof: proof
		};
	};
	web3.Game.createBetMove = function (amount){
		if(amount < 0 || parseInt(amount) != amount)throw new Error("Amount parameter must be positive integer or 0!")
		if(amount > _gameState.coins[web3.eth.defaultAccount])throw new Error("Not enough coins to bet! Current Coins:" + _gameState.coins[web3.eth.defaultAccount] + " Amount requested:" + amount );
		if(amount > _gameState.coins[web3.eth.opponentAccount])throw new Error("Not enough opponent coins to bet! Current Coins:" + _gameState.coins[web3.eth.opponentAccount] + " Amount requested:" + amount );

		var cryptoData = {
		 	amount : amount
		};
		var move = _createMove(web3.Game.MOVES.BET, cryptoData);
		return move;
	};
	web3.Game.createCallMove = function (move, data){
		var cryptoData = {
		};
		var move = _createMove(web3.Game.MOVES.CALL, cryptoData);
		return move;
	};

	web3.Game.createFoldMove = function (move, data){
		var cryptoData = {
		};
		var move = _createMove(web3.Game.MOVES.FOLD, cryptoData);
		return move;
	};

	web3.Game.createProofMove = function (move, data){
		var cryptoData = {
		 	web3.eth.defaultAccount : data,
		 	selectIndex : move.data.selectIndex
		};
		var move = _createMove(web3.Game.MOVES.BET, cryptoData);
		return move;
	};

	web3.Game.saveToDB = function(){
		
	}

	web3.Game.loadFromDB = function(){
		
	}
	//////////////////////
	/// GAME HELPERS ////
	web3.Game.calculateMySum =function (){

	};

	web3.Game.calculateMyMoney = function(){

	};
	web3.Game.getStack = function(){
		return _stack;
	};

	web3.Game.reset = function(){
		web3.Game.init();
	}

	///  INIT  //
	web3.Game.init = function(){
		_stack = [];
		_roundStack = [];
		currentState = {};
		_gameState = {
			coins : {
				web3.eth.defaultAccount : 99, // TODO CHANGE web3.eth.defaultAccount and opAcc to be settable to object 
				web3.eth.opponentAccount: 99
			},
			selected :{
				web3.eth.defaultAccount : [0,0,0,0,0,0],
				web3.eth.opponentAccount: [0,0,0,0,0,0]
			},
			pot 			: 2,
			round 			: 1
		};
	};









	function isCorrectSelectIndex(index){
		return SELECTINDEXES[_gameState.round] == index;
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
		return web3.sha3(web3.sha3(web3.sha3(mapHash);
	}
	function calculateMapArray(mapHash){
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
		return maparray;
	}


	// Math Helpers
	Math.step = function(x){return x < 0 ? 0 : x;};
})(web3);