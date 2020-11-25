import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import ArtStewardJson from '../abi/ArtSteward.json';
import { ArtSteward } from '../contract-types/ArtSteward';

const rpc = process.env.REACT_APP_CHAIN_RPC || '';
const steAddr = process.env.REACT_APP_STE_ADDR || '';

const web3 = new Web3(rpc);
const stewardContract = new web3.eth.Contract(
  ArtStewardJson.abi as AbiItem[],
  steAddr,
) as ArtSteward;

export default stewardContract;
