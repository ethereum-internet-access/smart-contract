pragma solidity >= 0.4.24 < 0.6.0;

import "github.com/OpenZeppelin/zeppelin-solidity/contracts/math/SafeMath.sol";
import "github.com/OpenZeppelin/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "github.com/OpenZeppelin/zeppelin-solidity/contracts/token/ERC20/IERC20.sol";
// The following contract is Ownable design pattern and ERC20 token.

contract InternetAccessToken27 is Ownable, IERC20 {

    // using SafeMath for uint256;
    // We do not need this instruction because we use the "SafeMath." form.

    uint256 private _totalSupply;
    uint256 private _tokenTotalPrice;
    //uint256 private _ethAmount;
    uint256 private _tokenValue = 0.0005 ether;
    uint256 private _timeSession = 1;                       // Value in hours.
    uint256 private _duration = 7;                          // To give the option to revert the last payment.
  
    // To manage the user data.
    mapping (address => uint256) private _balance;          // Number of tokens stored for each user.
    mapping (address => uint256) private _lastTokenPayment; // To give the option to revert the last token payment.
    mapping (address => uint256) private _expirationToken;  // To give the option to revert the last token payment.
    mapping (address => uint256) private _expirationETH;    // To give the option to revert the last ETH payment.
    //

    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    /**
    @dev Returns tokens name.
    */
    function name() public pure returns (string memory) {
        return "InternetAccess";
    }

    /**
    @dev Returns tokens symbol.
    */
    function symbol() public pure returns (string memory) {
        return "IntacTok";  
    }

    /**
    @dev Returns no. decimals token uses (18 decimals).
    */
    function decimals() public pure returns (uint8) {
        return 0;
    }

    /**
    @dev Returns totalSupply.
    */
    function totalSupply() public view returns (uint256){
        return _totalSupply;
    }

    /**
    @dev Returns account balance of tokens.
    */
    function balanceOf(address _owner) public view returns (uint256) {
        return _balance[_owner];
    }

    /**
    @dev Transfers _value amount of tokens to address _to.
    */
    function transfer(address _to, uint256 _value) public returns (bool) {

        require(_balance[msg.sender] >= _value);
        
        _balance[msg.sender] = SafeMath.sub(_balance[msg.sender], _value); 
        _balance[_to] = SafeMath.add(_balance[_to],_value);
        emit Transfer(msg.sender, _to, _value);
        
        return true;
    }

    /**
    @dev For each _tokenValue ether, return 1 token.
         Variable "amount" is the number of tokens to be bought.
    */
    function mint(uint256 amount) public payable {
        
        _tokenTotalPrice = SafeMath.mul(_tokenValue, amount); 
        
        require(msg.value >= _tokenTotalPrice); // compared in weis?

        _totalSupply = SafeMath.add(_totalSupply, amount);
        _balance[msg.sender] = SafeMath.add(_balance[msg.sender], amount);

    }

    /**
    @dev Returns _tokenValue ether/token.
         Variable "amount" is the number of tokens to be sold.
    */
    function burn(uint256 amount) public {
        
        require(amount >= 1);
        require(_balance[msg.sender] >= amount);
        
        //_ethAmount = SafeMath.mul(amount, _tokenValue);
        _totalSupply = SafeMath.sub(_totalSupply, amount);
        _balance[msg.sender] = SafeMath.sub(_balance[msg.sender], amount);
        
        //msg.sender.transfer(_ethAmount);
    }

    /**
    @dev 1 token costs _tokenValue ether.
    */
    function getTokenValue() public view returns (uint256) {
        return _tokenValue;
    }

    /**
    @dev Establishes new token value.
    */
    function setTokenValue(uint256 _newValue) private {
        _tokenValue = _newValue;
    }

    /**
    @dev 1 token is _timeSession hours of Internet session.
    */
    function getTimeSession() public view returns (uint256) {
        return _timeSession;
    }

    /**
    @dev Requests an Internet connection and makes the payment through tokens.
    */
    function reqConnectionWithToken(uint256 _tokenConsumed) public returns (bool){
	
        require(_balance[msg.sender] >= _tokenConsumed);

        _lastTokenPayment[msg.sender] = _tokenConsumed;
        burn(_tokenConsumed);
        _expirationToken[msg.sender] = now + _duration;
        return true;
        // The control of the time consumed is carried out by the client.
    }

    /**
    @dev Requests an Internet connection and makes the payment through ETH.
    */
    //function reqConnectionWithETH() public payable returns (uint256) {
    //    
    //    uint256 _numberSessions;

    //    require(msg.value > 0);
        
    //    _numberSessions = SafeMath.div(msg.value, _tokenValue);
    //    _expirationETH[msg.sender] = now + _duration;
    //    return _numberSessions;
    //    // Returns to the React client, the number of sessions that you can connect to the Internet. The control of the time consumed is carried out by the client.
    //    // Internet Access time of the client will be equal to _numberSessions * getTimeSession()
    //}

    /**
    @dev Reverts last token payment.
    */
    function revertTokenPayment() public returns (bool) {

        require(_lastTokenPayment[msg.sender] > 0);
        require(_expirationToken[msg.sender] > now);

        _balance[msg.sender] = SafeMath.add(_balance[msg.sender], _lastTokenPayment[msg.sender]);
        _lastTokenPayment[msg.sender] = 0;
        return true;
        // Last token payment reverted successfully.
    }

    /**
    @dev Reverts last ETH payment.
    */
    //function revertETHPayment() public payable returns (bool) {
    
    //    require(_expirationETH[msg.sender] > now);
    //    revert();
    //    return true;
    //    // Last ETH payment reverted successfully.
    //}

}

// Some code commented lines correspond to previous version of the smart contract.
// With ETH and token together. On Wednesday, September 11, 2019.
