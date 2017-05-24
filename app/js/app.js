
// When document is ready initialize app
$(document).ready(function() {
	
	var filter = web3.eth.filter('latest');
	filter.watch(function(err, res){
		if(!err){
			updateUI();
		}
		else{
			console.error("!!!!!!Error Happened!");
			filter.stopWatching();
		}
	});

	/// INIT Whisper
	web3.Lib.initWhisper()
		.then(function(w){
			web3.Whisper = w;
		});

	createUI();
	updateUI();
});
///////////////////
/// UI ////////////
///////////////////
var matchhash;
var maphash;
var opAccount;
var selectBox;
function createUI(){
	selectBox = document.getElementById("accselector");
	for (var i = 0; i<web3.eth.accounts.length; i++){
	    var opt = document.createElement('option');
	    opt.value = i;
	    opt.innerHTML = web3.eth.accounts[i];
	    selectBox.appendChild(opt);
	}
	selectBox.onchange = function(){
		web3.eth.defaultAccount = web3.eth.accounts[selectBox.value];
		updateUI(selectBox.value);
	}
	$("#showMapBtn").click(function(){
		updateMapTable(web3.Game.getMapArray());
	});

	$("#createMatchBtn").click(function(){
		var stake = $("#stakeTxt").val();
		createMatch(stake);
	});

	$("#joinMatchBtn").click(function(){
		var stake = parseInt($("#stakeTxt").val());
		var matchhash = $("#matchhashTxt").val();
		joinMatch(stake, matchhash);
	});

	$("#startGameBtn").click(function(){
		startGame();
	});

	$("#sendSelectMoveBtn").click(function(){
		sendSelectMove();
	});
	$("#sendBetMoveBtn").click(function(){
		sendBetMove();
	});
	$("#sendCallMoveBtn").click(function(){
		sendCallMove();
	});
	$("#sendFoldMoveBtn").click(function(){
		sendFoldMove();
	});
	$("#sendProofMoveBtn").click(function(){
		sendProofMove();
	});
}
function updateUI(accindex){
	updateForAccount();
}
function updateGameUI(state){
	$("#mycoins").html(state.coins[web3.eth.defaultAccount]);
	$("#opcoins").html(state.coins[web3.eth.opponentAccount]);

	$("#pot").html(state.pot);
	$("#round").html(state.round);
	
	$("#mybets").html(state.bets[web3.eth.defaultAccount]);
	$("#opbets").html(state.bets[web3.eth.opponentAccount]);

	var sums = web3.Game.findSums();
	$("#mysum").html(sums[web3.eth.defaultAccount]);
	$("#opsum").html(sums[web3.eth.opponentAccount]);

	updateMapTable(web3.Game.getMapArray(), state);
	// console.log("Selected for me: ");
	// console.log(state.selected[web3.eth.defaultAccount]);
	// console.log("Selected for opponent: ");
	// console.log(state.selected[web3.eth.opponentAccount]);
}

function updateForAccount(){
	var ethaddr = web3.eth.defaultAccount;
	$("#ethaddr").html(ethaddr);
	var ethbal = web3.eth.getBalance(ethaddr);
	$("#ethbal").html(web3.fromWei(ethbal, "ether").toNumber());

	var blockNumber = web3.eth.blockNumber;
	$("#block").html("#"+blockNumber);

	dbname = web3.db.DBNAME = "CUSTOMDBFOR"+web3.eth.defaultAccount;

	Padomima.amInMatch().then(function(res){
		$("#inmatch").html(res? "Yes": "No");	
		if(res){
			Padomima.getMyMatch().then(function(res){
				matchhash = res;
				$("#matchhash").html(res);
			});
			Padomima.getMyStake().then(function(res){
				res = web3.fromWei(res);
				$("#stakeTxt").val(res);
			});
			Padomima.getMyMap().then(function(res){
				maphash = res;
				$("#maphash").html(res);
			});
			Padomima.getMyOpponent().then(function(res){
				opAccount = res;
				web3.eth.opponentAccount = res;
				$("#opponentHash").html(res);
			});
		}
	});
}

function updateMapTable(map,state){
	if(typeof state == "undefined"){
		state = {
			selected:{
				[web3.eth.defaultAccount]:[0,0,0,0,0,0],
				[web3.eth.opponentAccount]:[0,0,0,0,0,0]
			}
		};
	}
	
	state = web3.Game.applyStateRotation(state);




	var mapTable = $("#mapTable")[0];
	if(mapTable.hasChildNodes())
		mapTable.removeChild(mapTable.children[0]);
	var tbody = document.createElement("tbody");
	for(var i=0;i<6;i++){
		var tr = document.createElement("tr");
		
		if(state.selected[web3.eth.defaultAccount][i]){
			$(tr).addClass("green"); 
		}
		for (var j = 0; j < 6; j++) {	
			var td = document.createElement("td");
			td.innerHTML = map[i][j];
			if(web3.Game.haveSelected(j)){
				$(td).addClass("green"); 
			}
			if(state.selected[web3.eth.opponentAccount][j]){
				$(td).addClass("red"); 
			}
			if(web3.Game.isMyNumber(i,j)){
				$(td).addClass("my-number");
			}
			if(web3.Game.isOpponentNumber(i,j)){
				$(td).addClass("op-number");
			}
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}
	mapTable.appendChild(tbody);
}

/////////////////////
//// CALCULATIONS ///
/////////////////////
// function hashToNumbers(hash){
// 	var nums = [];
// 	hash = hash.substr(2);
// 	for(var i=0;i<32;i++){
// 		var b = hash.substr(2*i, 2*i+2);
// 		nums.push(web3.toDecimal('0x'+b));
// 	}
// 	return nums;
// }
// /////////////////////
// function calculateMapArray(){
// 	console.log("Calculating map array for map hash: " + maphash);
// 	var first32Hash = maphash,
// 	second32Hash 	= web3.sha3(first32Hash),
// 	third32Hash		= web3.sha3(second32Hash);
// 	// Make hash to numbers
// 	var numbers 	= hashToNumbers(first32Hash)
// 			  .concat(hashToNumbers(second32Hash))
// 			  .concat(hashToNumbers(third32Hash));

// 	// init mapArray
// 	var maparray = [];
// 	for(var i=0;i<6;i++){
// 		maparray.push([]);
// 		for(var j=0;j<6;j++){
// 			maparray[i][j] = i*6 + j + 1;
// 		}
// 	}
// 	///
// 	/// helper local swapPosition 
// 	function swapPositions(a,b){
// 		a  = a % 36
// 		ai = a % 6;
// 		aj = parseInt(a / 6);
		
// 		b  = b % 36
// 		bi = b % 6;
// 		bj = parseInt(b / 6);

// 		var temp = maparray[ai][aj];
// 		maparray[ai][aj] = maparray[bi][bj];
// 		maparray[bi][bj] = temp;
// 	}
// 	///
// 	for(var i=0;i<numbers.length;i++){
// 		swapPositions(i, numbers[i]);
// 	}
// 	////////////////////////////////
// 	console.log(maparray);
// 	////////////////////////////////
// 	return maparray;
// }



///////////////////// CUSTOM NET ////
function createMatch(stake){
	var createMatchData = Padomima.createMatch({value: web3.toWei(stake, 'ether'), gas: 200000});
	return createMatchData;
}
function joinMatch(stake, h){
	var joinMatchData = Padomima.joinMatch(h , {value: web3.toWei(stake, 'ether'), gas: 200000});
	return joinMatchData;
}

function getMatch(){
	Padomima.getMyMatch().then(function(res){
		console.log("MY Match Hash: " );
		console.log(res);
	});
}

function getMap(){
	Padomima.getMyMap().then(function(res){
		console.log("MY Map Hash: " );
		console.log(res);
	});
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 
///////////////////////////////////////////////////////////////////
///////////  START GAME PHASE   ///////////////////////////////////
///////////////////////////////////////////////////////////////////
var dbname = web3.db.DBNAME = "CUSTOMDBFOR"+web3.eth.defaultAccount;
function getDB(key){
	return web3.db.getString(dbname,key);
}
function getDBJSON(key){
	return JSON.parse(web3.db.getString(dbname,key));
}
function saveDBJSON(d){
	return;
	if(!web3.db.getString(dbname,"currentIndex"))
		web3.db.putString(dbname,"currentIndex","0");
	var cid = getDB("currentIndex");
	web3.db.putString(dbname, "Index" + cid, JSON.stringify(d));
	web3.db.putString(dbname, "currentIndex", ""+(parseInt(cid)+1) );
}
function saveDB(key, data){
	web3.db.putString(dbname, key, data);	
}
function saveACK(data){
	// save ACK and mark it on UI
	saveDBJSON({
		who : web3.eth.defaultAccount, 
		ack : data,
		opponent: opAccount
	});
	// update Current Game State to the next one because we have all the SIGNED information needed until here!
	return;
}
function saveOpponentMove(data){
	// save move and mark it on UI
	saveDBJSON({
		who : opAccount,
		ack : data
	});
	return;
}


function moveRecieved(data){
	console.log("Recieved Data from Game Channel:");
	console.log(data);

	if(web3.Game.performMove(data))
		return data;
	//web3.Game.communicateState();
	return false;
}

function stateHandler(){
	console.log("State changed!");
	console.log(web3.Game.getState());
	updateGameUI(web3.Game.getState());
}
function roundHandler(){
	console.log("Round changed!");
	updateGameUI(web3.Game.getState());
}

function startGame() {
	// body...
	$("#GameUI").removeClass("hidden");
	// Establish whisper connection //
	// web3.Lib.initWhisper(maphash.substr(2))
	// 		.then(function(w){
	// 			w.setFunction(moveRecieved);
	// 			web3.GWhisper = w;
	// 		});
	web3.NetLib.init();
	web3.NetLib.setChannel(maphash.substr(2));
	web3.NetLib.setSolo(web3.eth.opponentAccount);
	//web3.NetLib.addInterceptor(web3.Game.getStateInterceptor());
	web3.NetLib.setBasicInterceptors();
	
	web3.NetLib.addInterceptor(moveRecieved);

	web3.NetLib.startListening();
	web3.Game.init(maphash);
	web3.Game.setOnStateChange(stateHandler);
	web3.Game.setOnRoundChange(roundHandler);
	Padomima.getMapRotation().then(function(res){
		web3.Game.setMapRotation(res);
		updateMapTable(web3.Game.getMapArray());
		web3.Game.loadFromDB();
		updateGameUI(web3.Game.getState());
	});
}

function sendSelectMove(){
	var mycol = parseInt($("#columnForMe").val())-1;
	var opcol = parseInt($("#columnForOp").val())-1;

	var move = web3.Game.createSelectMove(mycol,opcol);
	web3.Game.performMove(move.move);
	web3.NetLib.sendPacketWaitForVerification(move.move);
	web3.Game.saveProof(move.proof.data.selectIndex % 4, move.proof);
	// var move = web3.sha3(''+mycolR).substr(2) + "+" + web3.sha3(''+opcolR).substr(2);
	// var moveSignature = web3.Lib.signData(web3.eth.defaultAccount, move);
	
	// console.log("Move Signature : ");
	// console.log(moveSignature);
	
	// console.log("Verifying locally...");
	// var ver = web3.Lib.verifySignature(web3.eth.defaultAccount, moveSignature);
	// console.log(ver);

	// Send through Whisper
	//web3.GWhisper.send({ who: web3.eth.defaultAccount, signature : moveSignature })
}
function sendBetMove(){
	var am = parseInt($("#amount").val());
	var move = web3.Game.createBetMove(am);
	if(web3.Game.performMove(move))
		web3.NetLib.sendPacketWaitForVerification(move);
}
function sendCallMove(){
	var move = web3.Game.createCallMove();
	if(web3.Game.performMove(move))
		web3.NetLib.sendPacketWaitForVerification(move);
}
function sendFoldMove(){
	var move = web3.Game.createFoldMove();
	if(web3.Game.performMove(move))
		web3.NetLib.sendPacketWaitForVerification(move);
}
function sendProofMove(){
	var proofnum = parseInt($("#proofCol").val());
	var move = web3.Game.getProofMove(proofnum);
	if(web3.Game.performMove(move))
		web3.NetLib.sendPacketWaitForVerification(move);
}





/////////////////////////////////////////////////////////////////////////////
///////////////  GAME HELPERS    /////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
function findRandomBigNumber(num){
	var randomNumber = Math.floor(10000000000 + Math.random() * 90000000000);
	while(randomNumber % 6 != num){
		randomNumber++;
	}
	// console.log("Random Big Number for : " + num);
	// console.log(randomNumber);
	return randomNumber;
}




function printMoveStack(){
	console.log("---- Move Stack --------");
	var cid = getDB("currentIndex");
	for( var i = 0; i < cid; i ++ ){
		console.log(getDBJSON("Index" + i));
	}	
	console.log("------------------------");
}


















