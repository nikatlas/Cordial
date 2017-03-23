(function(){
	var RESENDTIME = 2000;
	function resendOnFail(){
		setTimeout(resendOnFail, RESENDTIME);
		// var length = Object.keys(myClass._ACKs).length;
		// for(var i in myClass._ACKs){
		// 	myClass.sendPacket(myClass._ACKs[i]);
		// }
		myClass.queue.trySend();

	};
	var randomNumber = parseInt(Math.random() * 100000.0);
	console.log(randomNumber);
	var myClass = {
		queue 	: {
			_queue: [],
			send : 	function(data){
				// Create
				console.log("Move added to the queue: " + web3.sha3(data.signature.data));
				this._queue.push(data);
				console.log(this._queue);
			},
			pop  :  function(data){

			},
			trySend : function(){
				if(!this._queue.length)return;
				var data = this._queue[0];
				myClass.sockets[myClass._channel].send(data);
			},
			_getHash : function(){
				if(!this._queue.length)return undefined;
				var data = this._queue[0];
				var hash = web3.sha3(data.signature.data); // already stringified!
				//console.log(hash);
				return hash;
			},
			recievedACK : function(data){
				if(data.ACK){
					//console.log("Testing recieved ACK : " + data.signature.data.ackSignature);
					if(data.signature.data.ackSignature == this._getHash()){
						//save ACK in stack
						var item = this._queue.shift();
						console.log("recievedACK for : " + data.signature.data.ackSignature);
						console.log(this._queue);
						return item;
					}	
				}

				return false;
			}

		},
		sockets : {},		
		_channel: "defaultGAMECHANNEL1",
		_fn : function(){},
		_proof : false,
		_address : "",
		_solo : false,
		_ACKs : {},
		_interceptors : [],
		_interceptor 	: function(data){
			var temp = data;
			for(var i=0; i < myClass._interceptors.length ; i++){
				temp = myClass._interceptors[i].call(myClass, temp, data);
				if(temp === false){
					return false;
				}
			}
			return true;
		},
		__soloInterceptor : function(data){
			if(this._solo && data.who != this._address)return false;
			if(!this.verifyMessage(data)){
				console.log("Verification Failed for:");
				console.log(data);
				return false;
			}
			// parse Data !!! 
			data.signature.data = JSON.parse(data.signature.data);
			if(data.ACK){
				this.queue.recievedACK(data);
			}
			return data;
			// 
		},
		__proofInterceptor : function(data){
			if(data.signature.data.proof){
				//console.log("Proof.. Sending last packet!");
				this.saveProof(data);
				this.sendLastPacket();
				this.sendACK(data);
				return false;
			}
			else{
				if(this._proof){
					if(this.verifyProof(data, this._proof)){
						//console.log("GOOD PROOF");
						this.sendACK(data);
						this.clearProof();
						return data.signature.data;
					}
					else{
						// BAD PROOF REPORT!!
						//console.log("BAD PROOF");
						return false;
					}
				}
				else{
					return false;
					//console.log("-Discarding");
					// i have no proof... 
					// i can either save or discard
				}
			}
			return data;
		},
		__saveDataInterceptor : function(data,original) {
			// save original to a stack!!!;
			return data;
		},
		setSolo : function(add){
			this._address = add;
			this._solo = true;
		},
		setSoloInterceptor : function(){
			this._interceptors.push(this.__soloInterceptor);
		},
		setProofInterceptor : function(){
			this._interceptors.push(this.__proofInterceptor);
		},
		setSaveInterceptor : function(){
			this._interceptors.push(this.__saveDataInterceptor);
		},
		addInterceptor 		: function(fn){
			this._interceptors.push(fn);
		},
		startListening 	: function(){
			var self = this;
			// Establish whisper connection //
			return web3.Lib.initWhisper(this._channel)
				.then(function(w){
					w.setFunction(self._interceptor); // w.setFunction ( interceptor of fn that will handle ACKs and will send the next on queue!!) 
					self.sockets[self._channel] = w;
				});
		},
		stopListening	: function(){
			// todo
		},
		sendPacketWaitForVerification : function(packet){
			
			packet.randomNumber = randomNumber++;
			this._vpacket = packet;
			// console.log("PREPARING : ")
			// console.log(packet);
			this.sendProof(packet);
			if(this._proof)this.sendLastPacket();
		},
		sendLastPacket				  : function(){
			if(this._vpacket){
				// console.log("SENDING:");
				// console.log(this._vpacket);
				this.sendPacket(this._vpacket);
				delete this._vpacket;
			}
		},
		sendPacket 	: function(packet){
			var sign = web3.Lib.signData(web3.eth.defaultAccount, packet);
			return this.queue.send({
				who 		: web3.eth.defaultAccount,
				signature 	: sign 
			});
		},
		sendProof 	: function(data){
			var hash = web3.sha3(JSON.stringify(data));
			var dataToSign = { datahash : hash, proof : true};
			var sign = web3.Lib.signData(web3.eth.defaultAccount, dataToSign );

			this.queue.send({
				who   	  : web3.eth.defaultAccount,
				signature : sign
			});
		},
		clearProof  : function(){
			delete this._proof;
		},
		saveProof 	: function(p){
			this._proof = p;
		},

		verifyMessage 		: function(packet){
			return web3.Lib.verifySignature(packet.who, packet.signature);
		},
		verifyProof			: function(packet, proof){
			var hash = web3.sha3(JSON.stringify(packet.signature.data));
			if( proof.signature.data.datahash != hash )return false;
			return true;
		},
		sendACK 			: function(packet){	
			// Send Verification For Signed Data 
			//var dataToSign = JSON.stringify(packet);//data.signature.dataHash.substr(2);
			var hash = web3.sha3(JSON.stringify(packet.signature.data));
			var dataToSign = {
				ackSignature : hash
			};
			var verificationForSignature = web3.Lib.signData(web3.eth.defaultAccount, dataToSign);
			this.sockets[this._channel].send({
				who 		: web3.eth.defaultAccount,
				signature 	: verificationForSignature,
				ACK 		: true
			});		
		},
		setChannel 			: function(ch){
			this._channel = ch;
		},


		init : function(){
			setTimeout(resendOnFail, RESENDTIME);
		}
	};

	web3.NetLib = myClass;

})();