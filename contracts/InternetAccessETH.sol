pragma solidity 0.5.9;

import "./SafeMath.sol";
import "./Ownable.sol";


contract InternetAccessETH is Ownable {


  using SafeMath for uint256;

  uint256 private minPayment = 2000000000000000; // 0.002 ETH $0.5 at Aug.02.19
  uint256 private maxPayment = 100000000000000000; // 0.1 ETH $22 at Aug.02.19
  uint256 private onFlyBalance;
  uint256 private stakeDue;

  struct Connection {
    uint256 blockNumber;
    uint256 amount;
    bool withStake;
  }

  mapping (address => Connection) public connections;

  struct OnFlyConnection {
    bool free;
    address user;
  }

  OnFlyConnection[200] public onFlyConnections;

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
    uint onFlyNum;
    require(checkConnectionAvailable(onFlyNum) && msg.value >= minPayment && msg.value <= maxPayment);
    bool withStake;
    withStake = (msg.value <= address(this).balance.sub(onFlyBalance).sub(stakeDue));
    connections[msg.sender].blockNumber = block.number;
    connections[msg.sender].amount = msg.value;
    connections[msg.sender].withStake = withStake;
    onFlyBalance.add(msg.value);
    if (withStake)
      stakeDue.add(msg.value);
    onFlyConnections[onFlyNum].user = msg.sender;
    onFlyConnections[onFlyNum].free = false;
    return(withStake);
  }

  /**
     @dev Checks if is there another connection available
  */
  function checkConnectionAvailable(uint _onFlyNum) public view returns (bool) {
    uint256 i = 0;
    while (i < 200 && !onFlyConnections[i].free) i++;
    if (i < 200) {
      _onFlyNum = i;
      return true;
    } else {
      return false;
    }
  }

  /**
     @dev Owner collects earnings.
     Some balance is left, in order to afford stake on future connections.
  */
  function collectEarnings(uint _balanceLeft) public {
    require(isOwner(), "Only contract owner can collect earnings");
    uint availableEarnings; /** Available earnings */
    uint lastAllowedBlock = block.number.sub(6500); /** 24h aprox. */
    uint i;
    availableEarnings = address(this).balance.sub(_balanceLeft);
    while (i < 200 && availableEarnings > 0) {
      if (!onFlyConnections[i].free) {
        if (connections[onFlyConnections[i].user].blockNumber > lastAllowedBlock) {
          availableEarnings.sub(connections[onFlyConnections[i].user].amount);
          if (connections[onFlyConnections[i].user].withStake)
            availableEarnings.sub(connections[onFlyConnections[i].user].amount);
        } else {
          onFlyBalance.sub(connections[onFlyConnections[i].user].amount);
          if (connections[onFlyConnections[i].user].withStake)
            stakeDue.sub(connections[onFlyConnections[i].user].amount);
          onFlyConnections[i].free = true;
        }
      }
      i++;
    }
    require(availableEarnings > 0, "There isn't balance enough");
    msg.sender.transfer(availableEarnings);
  }

  /**
     @dev user is not satisfied and penalizes.
     Hat user's last connection stake, then both user and owner will lose their funds.
     Hat user's last connection no stake, then user will get a refund.
  */
  function penalize () public {
    uint256 i = 0;
    while (i < 200 && onFlyConnections[i].user != msg.sender) i++;
    require(i < 200 && !onFlyConnections[i].free);
    onFlyConnections[i].free = true;
    onFlyBalance.sub(connections[msg.sender].amount);
    if (connections[msg.sender].withStake) {
      stakeDue.sub(connections[msg.sender].amount);
      address(0).transfer(connections[msg.sender].amount.mul(2));
    } else {
      msg.sender.transfer(connections[msg.sender].amount);
    }
  }
}
