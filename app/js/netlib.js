(function(web3){


	web3.NetLib = {
		sockets : {},		
		_channel: "defaultGAMECHANNEL",
		_fn : function(){},
		_proof : {},
		_address : "",
		_solo : false,
		_interceptor 	: function(data){
			if(this._solo && data.who != this._address)return;
			if(!this.verifyMessage(data))return;

			if(data.signature.data.proof){
				this.saveProof(data);
				this.sendLastPacket();
			}
			else{
				if(this.verifyProof(data, this._proof)){
					this._fn(data);
				}
				else{
					// BAD PROOF REPORT!!
				}
			}
		},
		setSolo : function(add){
			this._address = add;
			this._solo = true;
		},

		startListening 	: function(fn){
			// Establish whisper connection //
			return web3.Lib.initWhisper(maphash.substr(2))
				.then(function(w){
					w.setFunction(this._interceptor); // w.setFunction ( interceptor of fn that will handle ACKs and will send the next on queue!!) 
					if(fn)this._fn = fn;
					sockets[this._channel] = w;
				});
		},
		stopListening	: function(){
			// todo
		},
		sendPacketWaitForVerification : function(packet){
			this._vpacket = packet;
			this.sendProof(packet);
		},
		sendLastPacket				  : function(){
			this.sendPacket(this._vpacket);
		},
		sendPacket 	: function(packet){
			var sign = web3.Lib.signData(web3.eth.defaultAccount, packet);
			return sockets[this._channel].send({
				who 		: web3.eth.defaultAccount,
				signature 	: sign 
			});
		},
		sendProof 	: function(data){
			var hash = web3.sha3(data).substr(2);
			var sign = web3.Lib.signData(web3.eth.defaultAccount, { datahash : hash, proof : true} );
			sockets[this._channel].send({
				who   	  : web3.eth.defaultAccount,
				signature : sign
			});
		},
		saveProof 	: function(p){
			this._proof = p;
		},

		verifyMessage 		: function(packet){
			if( !web3.Lib.verifySignature(packet.who, packet.signature) )return false;
			return true;
		},
		verifyProof			: function(packet, proof){
			var hash = web3.sha3(packet.signature.data).substr(2);
			if( proof.signature.data != hash )return false;
			return true;
		},
		sendACK 			: function(packet){	
			// Send Verification For Signed Data 
			//var dataToSign = JSON.stringify(packet);//data.signature.dataHash.substr(2);
			var verificationForSignature = web3.Lib.signData(web3.eth.defaultAccount, packet);
			this.sendPacket(this._channel, { ACK: true, who: web3.eth.defaultAccount, signature : verificationForSignature});
		},
		setChannel 			: function(ch){
			this._channel = ch;
		},


		init : function(){
		}
	};

})(web3);