(function(web3){
	web3.Lib = {};
	var _toRVS = function(data){
		var res = {};
		var signed = data.signature;
	    res.r = web3.Utils.toBuffer(signed.slice(0,66));
	    res.s = web3.Utils.toBuffer("0x"+signed.slice(66,130));
	    res.v = web3.Utils.bufferToInt(web3.Utils.toBuffer("0x"+signed.slice(130,132)));
	    res.m = web3.Utils.toBuffer(web3.sha3("\x19Ethereum Signed Message:\n" + data.data.length + data.data));
	    return res;
	}

	web3.Lib.signData = function(acc, data){
		var hash = web3.sha3(JSON.stringify(data));
	    var signed = web3.eth.sign(acc, web3.toHex(JSON.stringify(data)));
	    console.log("Requested sign by account : " + acc); 
	    return {
	    	data     : JSON.stringify(data),
	    	dataHash : hash,
	    	signature: signed
	    };
	}
	web3.Lib.verifySignature = function(acc, data){
		var data = _toRVS(data);
	    // SimpleStorage.sig_verify(web3.Utils.bufferToHex(this.m), sig).then(function(r){
	    //   console.log("SmartContract BEST verification : ");
	    //   console.log(r);
	    // });
	    var pubKey  = web3.Utils.ecrecover(data.m, data.v, data.r, data.s);
	    var addrBuf = web3.Utils.pubToAddress(pubKey);
	    var addr    = web3.Utils.bufferToHex(addrBuf);
	    return acc == addr;
	}


	// CHANGE web3.db to localStorage!!!
	web3.db.getString = function(a,k){
		return localStorage[a+k];
	}
	web3.db.putString = function(a,k,v){
		localStorage.setItem(a+k,v);	
	}
	////////////////////////////////
	web3.Lib.DB = {
		_dbname : "defaultDBName",
		setJSON : function(k,d){
			web3.db.putString(this._dbname, k, JSON.stringify(d));
		},
		getSON : function(d){
			return JSON.parse(web3.db.getString(this._dbname,d));
		},
		set : function(k,d){
			web3.db.putString(this._dbname, k, d);
		},
		get : function(d){
			return web3.db.getString(this._dbname,d);
		},
		setDB : function(name){
			this._dbname = name;
		}
	};

	web3.Lib.initWhisper = function(channel, fn) {
		if(typeof channel == undefined)
	  		channel = web3.sha3("[]Custom Lobby").substr(2);

		function _setFunction(fn){
	      	EmbarkJS.Messages.listenTo({topic: [channel]}).then(fn);
		};
		function send(msg){
			EmbarkJS.Messages.sendMessage({topic: channel, data: msg});
		};
		console.log("Whisper version : " + web3.version.whisper);
		return new Promise(function(resolve, reject){
		   	web3.version.getWhisper(function(err, res) {
			    if (err) {
			      console.log("[!] --> No Whisper - no communication");
			      reject(err);
			    } else {
			      	EmbarkJS.Messages.setProvider('whisper');
			      	if(fn){
			      		_setFunction(fn);
			      	}
			      	var r = {
			      		func 		: fn,
			      		channel 	: channel,
			      		setFunction : _setFunction,
			      		send 		: send
			      	};
			      	resolve(r);
			    }
			});
		});
		
	}
})(web3);