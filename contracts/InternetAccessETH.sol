pragma solidity ^0.5.9;

import "./SafeMath.sol";
import "./Ownable.sol";

contract InternetAccessETH is Ownable {
  using SafeMath for uint256;

  uint256 private _minPaymnt = 2000000000000000; // 0.002 ETH $0.5 at Aug.02.19
  uint256 private _maxPaymnt = 100000000000000000; // 0.1 ETH $22 at Aug.02.19
  uint256 private _onFlyBalance;
  uint256 private _stakeDue;

  struct Connection {
    uint256 Blknbr;
    uint256 Amount;
    bool WithStake;
  }

  mapping (address => Connection) public Connections;

  struct OnFlyConnections {
    bool Free;
    address User;
  }

  OnFlyConnections[200] public OnFlyCon;
  constructor() public {
  }

  /**
     @dev Returns contract name.
  */
  function name() public pure returns (string memory) {
    return "InternetAccessETH";
  }

  /**
     @dev Requests an ETH paid Internet connection.
  */
  function reqConnectionWithETH() public payable returns (bool) {
    uint OnFlyNum;
    require(checkConAva(OnFlyNum) && msg.value >= _minPaymnt && msg.value <= _maxPaymnt);
    bool WithStake;
    _onFlyBalance.add(msg.value);
    WithStake = (msg.value <= address(this).balance.sub(_onFlyBalance).sub(_stakeDue));
    Connections[msg.sender].Blknbr = block.number;
    Connections[msg.sender].Amount = msg.value;
    Connections[msg.sender].WithStake = WithStake;
    if (WithStake)
      _stakeDue.add(msg.value);
    OnFlyCon[OnFlyNum].User = msg.sender;
    OnFlyCon[OnFlyNum].Free = false;
    return(WithStake);
  }

  /**
     @dev Checks if is there another connection available
  */
  function checkConAva(uint _onFlyNum) public view returns (bool) {
    uint256 i = 0;
    while (i < 200 && !OnFlyCon[i].Free) i++;
    if (i < 200) {
      _onFlyNum = i;
      return true;
    }
    else
      return false;
  }

  /**
     @dev Owner collects earnings.
     Some balance is left, in order to afford stake on future connections.
  */
  function collectEarnings(uint _balanceLeft) public {
    require (isOwner(), "Only contract owner can collect earnings");
    uint AvaiEarn; /** Available earnings */
    uint LastAllowedBlock = block.number.sub(6500); /** 24h aprox. */
    uint i;
    AvaiEarn = address(this).balance.sub(_balanceLeft);
    while (i < 200 && AvaiEarn > 0) {
      if (!OnFlyCon[i].Free) {
        if (Connections[OnFlyCon[i].User].Blknbr > LastAllowedBlock) {
          AvaiEarn.sub(Connections[OnFlyCon[i].User].Amount);
          if (Connections[OnFlyCon[i].User].WithStake)
            AvaiEarn.sub(Connections[OnFlyCon[i].User].Amount);
        }
        else {
          _onFlyBalance.sub(Connections[OnFlyCon[i].User].Amount);
          if (Connections[OnFlyCon[i].User].WithStake)
            _stakeDue.sub(Connections[OnFlyCon[i].User].Amount);
          OnFlyCon[i].Free = true;
        }
      }
      i++;
    }
    require(AvaiEarn > 0, "There isn't balance enough");
    msg.sender.transfer(AvaiEarn);
  }

  /**
     @dev User is not satisfied and penalizes.
     Hat user's last connection stake, then both user and owner will lose their funds.
     Hat user's last connection no stake, then user will get a refund.
  */
  function Penalize () public {
    uint256 i = 0;
    while (i < 200 && OnFlyCon[i].User != msg.sender) i++;
    require (i < 200 && !OnFlyCon[i].Free);
    OnFlyCon[i].Free = true;
    _onFlyBalance.sub(Connections[msg.sender].Amount);
    if (Connections[msg.sender].WithStake) {
      _stakeDue.sub(Connections[msg.sender].Amount);
      address(0).transfer(Connections[msg.sender].Amount.mul(2));
    } else {
      msg.sender.transfer(Connections[msg.sender].Amount);
    }
  }
}
