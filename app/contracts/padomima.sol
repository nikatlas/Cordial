pragma solidity ^0.4.7;
contract Padomima {

  struct Match {
      address creator;
      address challenger;
      uint amount;
      bool finished;
  }
  address owner = msg.sender;


  mapping(address => bytes32) PlayerBinding;
  mapping(bytes32 => Match) Matches;


  function changeOwner(address _newOwner) 
  {
    if(owner == msg.sender)
      owner = _newOwner;
  }
 

  function Padomima() {}

  function createMatch() payable{
      if( msg.value < 50000000000000000 ) throw;
      if( PlayerBinding[msg.sender] != bytes32(0x0) )throw;
      bytes32 hash = keccak256(msg.sender);

      PlayerBinding[msg.sender] = hash;

      Matches[hash] = Match(msg.sender, address(0x0), msg.value, false);
  }
  function claimEmptyMatch() {
      if( PlayerBinding[msg.sender] == bytes32(0x0) )throw; // Is the caller in a match?       
      bytes32 hash = PlayerBinding[msg.sender];
      if( Matches[hash].creator != msg.sender)throw;        // Creator must be the caller
      if( Matches[hash].challenger != address(0x0) )throw; //  Check if There is an opponent on this match 
      
      if(!msg.sender.send(Matches[hash].amount)) // send money
        throw;
      delete PlayerBinding[msg.sender]; //delete binding
      delete Matches[hash];             // delete match
  }
  function joinMatch(bytes32 hash) payable{
      if( msg.value < Matches[hash].amount ) throw;
      if( PlayerBinding[msg.sender] != bytes32(0x0) ) throw;
      if( Matches[hash].challenger != address(0x0) ) throw;
      if( Matches[hash].creator == msg.sender ) throw;
      Matches[hash].challenger = msg.sender;
      PlayerBinding[msg.sender] = hash;
  }

  // function getMyMap() constant returns (uint[32]){
  //     Match m = Matches[PlayerBinding[msg.sender]];
  //     bytes32 maphash = keccak256(m.creator, m.challenger);
  //     uint[32] memory map;
  //     for(uint i=0; i < 32 ; i++){
  //       map[i] = uint(maphash[i]);
  //     }
  //     return map; 
  // }

  function getMyMap() constant returns (bytes32){
      Match m = Matches[PlayerBinding[msg.sender]];
      bytes32 maphash = keccak256(m.creator, m.challenger);
      return maphash; 
  }

  function getMyStake() constant returns (uint){
      return Matches[PlayerBinding[msg.sender]].amount;
  }

  function getMyMatch() constant returns (bytes32 hash){
      return PlayerBinding[msg.sender];
  }
  
  function getMyOpponent() constant returns (address hash){
      Match m = Matches[PlayerBinding[msg.sender]];
      if( m.challenger == msg.sender )return m.creator;
      return m.challenger;
  }

  function amInMatch() constant returns (bool){
      return PlayerBinding[msg.sender] != bytes32(0x0);
  }




  function sig_verify(bytes32 hash, bytes sig) constant returns(address)                       //verifying the signature
  {
      bytes32 r;
      bytes32 s;
      uint8 v;
      assembly 
      {
          r := mload(add(sig, 32))
          s := mload(add(sig, 64))
          v := byte(0, mload(add(sig, 96)))
      }
      if(v<27)
          v+=27;

      return ecrecover(hash, v, r, s);
  }
}
