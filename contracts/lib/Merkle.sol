pragma solidity 0.4.18;


library Merkle {
  function checkMembership(
    bytes32 leaf,
    uint256 mainIndex,
    bytes32 rootHash,
    bytes proof
  )
    internal
    pure
    returns (bool)
  {
    require(proof.length == 512);
    bytes32 proofElement;
    bytes32 computedHash = leaf;

    uint256 index = mainIndex;
    for (uint256 i = 32; i <= 512; i += 32) {
      // solhint-disable-next-line no-inline-assembly
      assembly {
        proofElement := mload(add(proof, i))
      }
      if (index % 2 == 0) {
        computedHash = keccak256(computedHash, proofElement);
      } else {
        computedHash = keccak256(proofElement, computedHash);
      }
      index = index / 2;
    }
    return computedHash == rootHash;
  }
}
