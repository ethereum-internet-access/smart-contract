pragma solidity 0.5.9;

import "./SafeMath.sol";
import "./Ownable.sol";


contract InternetAccessETHSimple is Ownable {


  using SafeMath for uint256;

  uint256 private minPayment = 2000000000000000; // 0.002 ETH $0.5 at Aug.02.19
  uint256 private maxPayment = 100000000000000000; // 0.1 ETH $22 at Aug.02.19
  uint256 public stakeDue;

  event ConnectionRequest(address indexed _from,
                          uint256 _value,
                          bool _stake,
                          uint256 _balance,
                          uint256 _onFlyNumber,
                          uint256 _stakeDue);

  event EarningsCollection(uint256 _currentTimestamp,
                           uint256 _connectionTimestamp,
                           uint256 _amount,
                           uint256 _balance,
                           uint256 _stakeDue,
                           bool _stake);

  event TotalEarningsCollection(uint256 _amount,
                                uint256 _balance,
                                uint256 _stakeDue);

  struct Connection {
    uint256 timestamp;
    uint256 amount;
    bool withStake;
  }

  mapping (uint256 => Connection) public connections;

  struct OnFlyConnection {
    uint256 key;
    bool allocated;
    address user;
  }

  OnFlyConnection[10] public onFlyConnections;

  /**
     @dev Returns contract name.
  */
  function name() public pure returns (string memory) {
    return "InternetAccessETH";
  }

  /**
     @dev Requests an ETH paid Internet connection.
  */
  function reqConnectionWithETH() public payable {
    int256 onFlyNumber = checkConnectionAvailable();
    require(onFlyNumber >= 0, "No connection available");
    require(msg.value >= minPayment, "Value under minimum");
    require(msg.value <= maxPayment, "Value over maximum");
    bool withStake;
    withStake = (address(this).balance.sub(msg.value).sub(stakeDue) >= msg.value);
    uint256 timestamp = now;
    uint256 connectionKey = uint256(keccak256(abi.encodePacked(msg.sender, msg.value, timestamp, withStake)));
    connections[connectionKey].timestamp = timestamp;
    connections[connectionKey].amount = msg.value;
    connections[connectionKey].withStake = withStake;
    if (withStake) {
      stakeDue = stakeDue.add(msg.value);
    }
    onFlyConnections[uint256(onFlyNumber)].key = connectionKey;
    onFlyConnections[uint256(onFlyNumber)].user = msg.sender;
    onFlyConnections[uint256(onFlyNumber)].allocated = true;
    emit ConnectionRequest(msg.sender, msg.value, withStake, address(this).balance, uint256(onFlyNumber), stakeDue);
    return;
  }

  /**
     @dev Checks if is there another connection available
  */
  function checkConnectionAvailable() public view returns (int256) {
    for(int256 i = 0; i < 10; i++) {
      if (!onFlyConnections[uint256(i)].allocated) {
        return i;
      }
    }
    return -1;
  }

  /**
     @dev Owner collects earnings.
     Some balance is left, in order to afford stake on future connections.
  */
  function collectEarnings() public {
    require(isOwner(), "Only contract owner can collect earnings");
    uint256 lastTimestampAllowed = now.sub(3600 * 24); /** 24h aprox. */
    uint256 i = 0;
    uint256 availableEarnings = 0;
    while (i < 10) {
      if (onFlyConnections[i].allocated) {
        if (connections[onFlyConnections[i].key].timestamp < lastTimestampAllowed) {
          emit EarningsCollection(now,
                                  connections[onFlyConnections[i].key].timestamp,
                                  connections[onFlyConnections[i].key].amount,
                                  address(this).balance,
                                  stakeDue,
                                  connections[onFlyConnections[i].key].withStake);
          onFlyConnections[i].allocated = false;
          availableEarnings = availableEarnings.add(connections[onFlyConnections[i].key].amount);
          if(connections[onFlyConnections[i].key].withStake) {
            stakeDue = stakeDue.sub(connections[onFlyConnections[i].key].amount);
          }
          connections[onFlyConnections[i].key].amount = 0;
          connections[onFlyConnections[i].key].withStake = false;
        }
      }
      i++;
    }
    assert(availableEarnings <= address(this).balance);
    emit TotalEarningsCollection(availableEarnings, address(this).balance, stakeDue);
    msg.sender.transfer(availableEarnings);
  }

  /**
     @dev user is not satisfied and penalizes.
     Hat user's last connection stake, then both user and owner will lose their funds.
     Hat user's last connection no stake, then user will get a refund.
  */
  function penalize () public {
    uint256 i = 0;
    uint256 lastTimestampAllowed = now.sub(3600 * 24); /** 24h aprox. */
    while (i < 10) {
      // require allocated connection
      if (onFlyConnections[i].allocated) {
        // sender check
        if (onFlyConnections[i].user == msg.sender) {
          // penalization should be carried out within 24 hours
          if (connections[onFlyConnections[i].key].timestamp >= lastTimestampAllowed) {
            if (!connections[onFlyConnections[i].key].withStake) {
              msg.sender.transfer(connections[onFlyConnections[i].key].amount);
            } else {
              address(0).transfer(connections[onFlyConnections[i].key].amount);
              stakeDue = stakeDue.sub(connections[onFlyConnections[i].key].amount);
              connections[onFlyConnections[i].key].withStake = false;
            }
            connections[onFlyConnections[i].key].amount = 0;
            onFlyConnections[i].allocated = false;
          }
        }
      }
      i++;
    }
  }
}
