pragma solidity 0.5.11;

import "./SafeMath.sol";

contract IntAcPayChan {
    using SafeMath for uint256;

    address payable public recipient;   // The account receiving the payments.
    // used as a unique channel id, increments by 1 every time a channel is opened
	uint256 public channelCount;
    uint256 public pricePerSecond = 277777777777;

    mapping (uint256 => ChannelData) channelMapping;

	struct ChannelData {
		address payable payer;
		uint256 deposit;
		uint256 openTime; // Timeout in case the recipient never closes.
		bool closed;
	}

	event ChannelOpened(address indexed payer, uint256 indexed channelId, uint256 depositAmount);
	event ChannelClosed(address indexed payer, uint256 indexed channelId, uint256 paidAmount, uint256 refundedAmount);
	event ChannelExpired(address indexed payer, uint256 indexed channelId, uint256 refundedAmount);

    constructor (address payable _recipient)
        public
        payable
    {
        recipient = _recipient;
    }

    function createChannel() public payable returns (uint256) {
		require(msg.value > 2000000000000000);

		// increment channel count and use it as a unique id
		uint256 channelId = channelCount + 1;
		channelCount = channelId;

        // init the channel with the creation data 
		channelMapping[channelId] = ChannelData({
			payer : msg.sender,
			deposit : msg.value,
			openTime : now,
			closed : false
			});

		// log an event 
		emit ChannelOpened(msg.sender, channelId, msg.value);
        return channelId;
	}

    function isValidSignature(uint256 amount, uint256 channelId, bytes memory signature)
        internal
        view
        returns (bool)
    {
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, amount, channelId)));

        // check that the signature is from the payment sender
        return recoverSigner(message, signature) == channelMapping[channelId].payer;
    }

    /// the recipient can close the channel at any time by presenting a
    /// signed amount from the sender. the recipient will be sent that amount,
    /// and the remainder will go back to the sender
    function close(uint256 amount, uint256 channelId, bytes memory signature) public {
        require(msg.sender == recipient);
        require(!channelMapping[channelId].closed);
        require(channelMapping[channelId].deposit >= amount);
        require(isValidSignature(amount, channelId, signature));

        recipient.transfer(amount);

        uint256 _refundAmount = channelMapping[channelId].deposit.sub(amount);
        channelMapping[channelId].payer.transfer(_refundAmount);
        channelMapping[channelId].closed = true;

        emit ChannelClosed(channelMapping[channelId].payer, channelId, amount, _refundAmount);
    }

    /// if the timeout is reached without the recipient closing the channel,
    /// then the Ether is released back to the sender.
    function claimTimeout(uint256 channelId) public payable {
        require(!channelMapping[channelId].closed);
        
        uint256 _expirationTime = channelMapping[channelId].openTime.add(msg.value.div(pricePerSecond)).add(300);
        require(now >= _expirationTime);

        channelMapping[channelId].payer.transfer(channelMapping[channelId].deposit);
        
        channelMapping[channelId].closed = true;
        
        emit ChannelExpired(channelMapping[channelId].payer, channelId, channelMapping[channelId].deposit);
    }

    /// All functions below this are just taken from the chapter
    /// 'creating and verifying signatures' chapter.

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}