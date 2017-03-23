Padomima 
--------
 
 Preqs : nodejs , embark 

``` 
 sudo apt-get install nodejs 
 sudo apt-get install npm
 sudo apt-get install embark
```

 Clone : 

```
 git clone http://88.99.189.92:666/root/Padomima
 cd Padomima
```


 Run Geth :
 
    General Structure
    
    ```
     sudo geth  --networkid 15532                       // Private chain on server network id
                --password="/blockchains/privatekeys"   // Password files for avoiding typing
                --datadir="/blockchains/private/"       // DATADIR to save the blockchain and the keystore (a.k.a. wallet)
                --port 15532                            // Network Port!
                --rpc                                   // Enable RPC to connect with embark
                --rpcapi "eth,web3,shh"                 // RPC Api modules
                --rpcport 15533                         // RPC Port 
                --rpcaddr localhost                     // localhost 
                --rpccorsdomain="http://localhost:8000" // Allow embark run server to request from geth (CORS Enable)
                --shh                                   // enable whisper
                --unlock=0                              // Unlock account to be used without pass
                console                                 // Enable console
    ```
 
    First Time Setup 
        
        Download and save genesis file from 
        
            [Download Genesis File](http://88.99.189.92/genesis/privategenesis)
            or 
            `wget http://88.99.189.92/genesis/privategenesis`
            
        ```
        sudo geth  --networkid 15532 --password="/blockchains/privatekeys" --datadir="/blockchains/private/"  init GENESISFILE
        sudo geth  --networkid 15532 --password="/blockchains/privatekeys" --datadir="/blockchains/private/"  account new
        sudo geth  --networkid 15532 --password="/blockchains/privatekeys" --datadir="/blockchains/private/" --port 15532 --rpc --rpcapi "eth,web3,shh" --rpcport 15533 --rpcaddr localhost --rpccorsdomain="http://localhost:8000" --shh --unlock=0 
        ```
        
        You should see geth initialization and console waiting commands
        ```
        admin.peers
        []
        
        admin.addPeer("enode://72e1359f99430b52ef9fcb722c40ef863c1b163155b032c34d6ffef6d5b558b1f65a94e8ded0a2bcbaaf315fe946ab4a17d25adea4ebeef9e498deded25c1830@88.99.189.92:15532"); // this is the node p2p discovery protocol unique machine identity
        ```
        
        Now you should see the blockchain synchronization!
        
     Second Time Setup
        
        Just start geth with the appropriate parameters 
        
        ```
        sudo geth  --networkid 15532 --password="/blockchains/privatekeys" --datadir="/blockchains/private/" --port 15532 --rpc --rpcapi "eth,web3,shh" --rpcport 15533 --rpcaddr localhost --rpccorsdomain="http://localhost:8000" --shh --unlock=0 
        ```
        
    
    Run Embark : 
    
        `embark run`
 
 