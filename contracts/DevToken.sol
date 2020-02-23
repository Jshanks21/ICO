pragma solidity >=0.4.21 <0.7.0;

contract DevToken {
    string public name;
    string public symbol;
    uint256 public decimals;
    uint256 public totalSupply = 100000000;

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    event Transfer(address indexed _from, address indexed _to, uint _amount);
    event Approval(address indexed _owner, address indexed _spender, uint _amount);

    constructor (string memory _name, string memory _symbol, uint256 _decimals) public {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address _to, uint _amount) public returns (bool) {
        require(balanceOf[msg.sender] >= _amount, "Not enough funds");
        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += _amount;
        emit Transfer(msg.sender, _to, _amount);
        return true;
    }

    function approve(address _spender, uint _amount) public returns (bool) {
        allowance[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    function transferFrom(address _from, address _to, uint _amount) public returns (bool) {
        require(_amount <= allowance[_from][msg.sender], "Exceeds allowance amount");
        require(_amount <= balanceOf[_from], "Not enough funds");
        balanceOf[_from] -= _amount;
        balanceOf[_to] += _amount;
        allowance[_from][msg.sender] -= _amount;
        emit Transfer(_from, _to, _amount);
        return true;
    }
}