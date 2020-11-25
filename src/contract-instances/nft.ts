import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import ERC721Json from '../abi/ERC721.json';
import { ERC721 } from '../contract-types/ERC721';

const rpc = process.env.REACT_APP_CHAIN_RPC || '';
const steAddr = process.env.REACT_APP_NFT_ADDR || '';
export const id = parseInt(process.env.REACT_APP_NFT_ID || '', 10);

const web3 = new Web3(rpc);
const nftContract = (_web3: Web3 = web3): ERC721 => new _web3.eth.Contract(
    ERC721Json.abi as AbiItem[],
    steAddr,
) as ERC721;

export default nftContract;
