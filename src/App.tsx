import React, { useEffect, useState } from 'react';
import Onboard from 'bnc-onboard';
import { Button } from 'reactstrap';
import { toChecksumAddress } from 'web3-utils';
import stewardContract from './contract-instances/steward';
import nftContract, { id as tokenId } from './contract-instances/nft';

const networkId = parseInt(process.env.REACT_APP_CHAIN_N_ID || '', 10);
const rpc = process.env.REACT_APP_CHAIN_RPC || '';

export default function App(): JSX.Element {
  const onboard = Onboard({
    networkId,
    walletSelect: {
      wallets: [
        { walletName: 'metamask', preferred: true },
        {
          walletName: 'walletConnect',
          rpc: {
            [networkId]: rpc,
          },
          preferred: true,
        },
      ],
    },
  });

  const [address, setAddress] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [collected, setCollected] = useState<string>('');

  const shortAddr = (addr: string): string => `${addr.substr(0, 6)}…${addr.substr(-4)}`;

  const fetchNftInfo = async () => {
    const tokenUri = await nftContract.methods.tokenURI(tokenId).call();
    console.log(tokenUri);

    // todo: test this with a (cross-origin) working uri
    // const resp = await fetch(tokenUri);
    // console.log(resp);
    const metaDataJson = {
      name: 'This Artwork Is Always On Sale v2',
      description: 'A Digital Artwork That Is Always On Sale',
      image: 'https://thisartworkisalwaysonsale.com/static/media/TAIAOS_2.9eff2894.png',
    };

    const s = await nftContract.methods.symbol().call();
    const o = await nftContract.methods.ownerOf(tokenId).call();

    setName(metaDataJson.name);
    setSymbol(s);
    setImageUrl(metaDataJson.image);
    setOwner(o);
  };

  const fetchStewardInfo = async () => {
    const a = await stewardContract.methods.artist().call();
    const p = await stewardContract.methods.price().call();
    const c = await stewardContract.methods.totalCollected().call();

    setArtist(a);
    setPrice(p);
    setCollected(c);
  };

  useEffect(() => {
    fetchNftInfo();
    fetchStewardInfo();
  }, []);

  const connectWallet = async () => {
    const selectResult = await onboard.walletSelect();
    if (!selectResult) {
      return;
    }
    await onboard.walletCheck();
    setAddress(onboard.getState().address);
  };

  return (
    <div className="container">

      <header>
        <h1>ZeroAlpha</h1>

        <Button color="primary" onClick={() => connectWallet()}>
          {(!address) ? (
            <span>Connect wallet</span>
          ) : (
            <span title="Switch wallet">
              {shortAddr(toChecksumAddress(address))}
            </span>
          )}
        </Button>
      </header>

      <img src={imageUrl} alt={name} />

      <p>
        symbol:&nbsp;
        {symbol}
      </p>

      <p>
        artist:&nbsp;
        {artist}
      </p>

      <p>
        owner:&nbsp;
        {owner}
      </p>

      <p>
        sale price:&nbsp;
        {price}
      </p>

      <p>
        collected patronage:&nbsp;
        {collected}
      </p>

      <p>
        buy:
        *todo*
      </p>

      <p>
        adjust:
        *todo*
      </p>

      <p>
        change:
        *todo*
      </p>

    </div>
  );
}
