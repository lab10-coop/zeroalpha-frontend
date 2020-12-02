import React, { useEffect, useState } from 'react';
import Onboard from 'bnc-onboard';
import { Button, Input } from 'reactstrap';
import { toChecksumAddress } from 'web3-utils';
import Web3 from 'web3';
import { UserState } from 'bnc-onboard/dist/src/interfaces';
import stewardContract from './contract-instances/steward';
import nftContract, { id as tokenId } from './contract-instances/nft';
import artistImg from './image/artist-sven-eberwein.png';
import lab10Img from './image/lab10-logo.png';
import ownerImg from './image/owner.png';

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

  const [onboardState, setOnboardState] = useState<UserState>();
  const [name, setName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [collected, setCollected] = useState<string>('');
  const [newResellPrice, setNewResellPrice] = useState<number>(0);

  const shortAddr = (addr: string): string => `${addr.substr(0, 6)}…${addr.substr(-4)}`;

  const fetchNftInfo = async () => {
    const tokenUri = await nftContract().methods.tokenURI(tokenId).call();
    console.log(tokenUri);

    // todo: test this with a (cross-origin) working uri
    // const resp = await fetch(tokenUri);
    // console.log(resp);
    const metaDataJson = {
      name: 'This Artwork Is Always On Sale v2',
      description: 'A Digital Artwork That Is Always On Sale',
      image: 'https://thisartworkisalwaysonsale.com/static/media/TAIAOS_2.9eff2894.png',
    };

    const s = await nftContract().methods.symbol().call();
    const o = await nftContract().methods.ownerOf(tokenId).call();

    setName(metaDataJson.name);
    setSymbol(s);
    setImageUrl(metaDataJson.image);
    setOwner(o);
  };

  const fetchStewardInfo = async () => {
    const a = await stewardContract().methods.artist().call();
    const p = await stewardContract().methods.price().call();
    const c = await stewardContract().methods.totalCollected().call();

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
    setOnboardState(onboard.getState());
  };

  const saveNewResellPrice = async () => {
    if (!onboardState) {
      alert('No wallet connected.');
      return;
    }
    console.log('provider', onboard, onboard.getState(), onboard.getState().wallet.provider);
    const web3 = new Web3(onboardState.wallet.provider);
    await stewardContract(web3).methods.changePrice(newResellPrice).send({
      from: onboardState.address,
    });
    alert('Price set.');
  };
  /*
  return (
    <div className="container">

      <header>
        <h1>ZeroAlpha</h1>

        <Button color="primary" onClick={() => connectWallet()}>
          {(!onboardState) ? (
            <span>Connect wallet</span>
          ) : (
            <span title="Switch wallet">
              {shortAddr(toChecksumAddress(onboardState.address))}
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
        Change re-sale price
        <Input
          type="text"
          value={newResellPrice}
          onChange={(event) => setNewResellPrice(parseInt(event.currentTarget.value, 10))}
        />
        <Button onClick={() => saveNewResellPrice()}>Save</Button>
      </p>

    </div>
  );
  */
  return (
    <div>
      <header>
        <div className="inner">
          <div className="logo"><a href="https://zeroalpha.art/" title="ZeroAlpha">ZeroAlpha</a></div>

          <div className="connectWalletButton">
            <span id="connectWalletButton">Connect your Wallet</span>
          </div>

          <nav>
            <ul>
              <li><a className="linkArtist" href="#artist" title="Artist">Artist</a></li>
              <li><a className="linkBeneficiary" href="#beneficiary" title="Beneficiary">Beneficiary</a></li>
              <li>
                <a
                  className="linkFAQ"
                  href="https://lab10-collective.gitbook.io/zeroalpha/faq"
                  title="Frequently Asked Questions on Gitbook"
                  target="_blank"
                  rel="noreferrer"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <div id="wrapper">

        <section className="introduction">
          <div className="sectionInner">
            <h1>
              Hold your bag
              <br />
              for a better world
            </h1>
          </div>
        </section>

        <section className="artworkPresentation">
          <div className="sectionInner">

            <div className="artworkInfos">
              <div className="intro">
                <p>
                  <strong>THIS OUTSTANDING ARTWORK</strong>
                  <br />
                  is always-on-sale by the current owner and
                  the patronage will go to non-profit
                  organizations that work on big global
                  challenges.
                </p>
              </div>

              <h2>M Carbon Dioxide</h2>
              <div className="artworkDesc">
                <p><strong>UNIQUENESS: 1 OF 1</strong></p>
                <p>
                  This one of his latest works of art and represents 1000 tonnes
                  of CO2 formerly purchased and retired as verified credit units
                  (VCUs) on the Verra registry and minted to the blockchain as an
                  NFT.
                  <br />
                  <span id="showMore">show more</span>
                </p>
                <p className="showMoreText">
                  The amount of CO2 offset by this NFT is equivalent to the
                  emissions that person living in an industrialized country would
                  emit over the course of 40 years. To give context, the typical
                  roundtrip transatlantic flight from NYC to London emits 2
                  tonnes of CO2 per passenger seated in economy class. Thus,
                  this NFT represents 500 such flights!
                  The offsets identified and selected for this artwork were derived
                  from Offsetra’s sustainability project portfolio. The Bull Run
                  project and the Cerro de Hula project were both selected during
                  the creation of this NFT. To read more about these projects and
                  their co-benefits, visit Offsetra’s website here.
                  <br />
                  <span id="showLess">show less</span>
                </p>
              </div>

            </div>

            <div className="artworkImage">
              <figure>
                <img src={imageUrl} alt="M-Carbon-Dioxide" />
              </figure>
            </div>

            <div className="clear" />

          </div>
        </section>

        <section className="artworkDetails">
          <div className="sectionInner">

            <div className="artworkDetailsWrapper">

              <div className="priceField">
                <h3>Price:</h3>
                <p>
                  <span className="priceValue">1234</span>
                  &nbsp;
                  <span className="currency">xDai</span>
                  {' '}
                  <span className="changePrice">change</span>
                </p>
                <p className="buyButton">
                  <span id="buyButton">Buy</span>
                </p>
              </div>

              <div className="artistField">
                <h3>Artist:</h3>
                <p><span className="artistName">Sven Eberwein</span></p>
                <figure>
                  <img src={artistImg} alt="Sven Eberwein" />
                </figure>
              </div>

              <div className="ownerField">
                <h3>Owner:</h3>
                <p><span className="ownerName">didi.eth</span></p>
                <figure>
                  <img src={ownerImg} alt="didi.eth" />
                </figure>
              </div>

              <div className="patronageWrapper">

                <div className="patronageField">
                  <h3>Patronage:</h3>
                  <p>
                    Till&nbsp;
                    <span className="patronageUntil">31.12.2021</span>
                    {' '}
                    <span className="adjustDate">adjust</span>
                  </p>
                </div>
                <div className="beneficiaryField">
                  <h3>Beneficiary:</h3>
                  <p><span className="beneficiaryName">lab10 collective</span></p>
                </div>
                <div className="totalPatronageField">
                  <h3>Total Patronage Collected:</h3>
                  <p>
                    <span className="totalPatronageAmount">3.12313123</span>
                    &nbsp;
                    <span className="currency">xDai</span>
                  </p>
                </div>

              </div>
              <div className="clear" />
            </div>

          </div>
        </section>

        <section className="artistAndBeneficiary">
          <div className="sectionInner">

            <div className="artistDesc" id="artist">
              <h2>Artist</h2>

              <figure>
                <img src={artistImg} alt="Sven Eberwein" />
              </figure>
              <div className="text">
                <p>
                  <a
                    href="https://twitter.com/Seven_Eberwein"
                    title="@Seven_Eberwein on Twitter"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @Seven_Eberwein
                  </a>
                </p>
                <p>
                  Sven Eberwein is a digital artist that
                  works at the intersection of computer
                  graphics and internet culture. His works
                  emerge from references he collects
                  around the „World Wild Web” and set to
                  explore their impact and relevance in new
                  contexts. In his words, he produces
                  „Works of the internet, by the internet, for
                  the internet.”
                </p>
              </div>
            </div>

            <div className="beneficiaryDesc" id="beneficiary">
              <h2>Beneficiary</h2>

              <figure>
                <img src={lab10Img} alt="lab10 Collective" />
              </figure>
              <div className="text">
                <p>
                  <a
                    href="https://twitter.com/lab10collective"
                    title="@lab10collective on Twitter"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @lab10collective
                  </a>
                </p>
                <p>
                  The lab10 collective eG is a registered nonprofit
                  cooperative from Austria focusing on
                  solutions to combat climate change. Their
                  main activities are in the energy and
                  mobility sector and they apply blockchain
                  based technologies to provide open-source
                  software and applications to transition
                  towards a zero-carbon society.
                </p>
                <p>
                  <strong>Focus SDG:</strong>
                  {' '}
                  <span className="sdg" id="sdg-7">7</span>
                </p>
                <p>
                  <strong>Other SDG&apos;s:</strong>
                  {' '}
                  <span className="sdg" id="sdg-13">13</span>
                  {' '}
                  <span className="sdg" id="sdg-2">2</span>
                  {' '}
                  <span className="sdg" id="sdg-11">11</span>
                  {' '}
                  <span className="sdg" id="sdg-15">15</span>
                  {' '}
                  <span className="sdg" id="sdg-8">8</span>
                </p>
              </div>

            </div>
            <div className="clear" />

          </div>
        </section>

        <footer>
          &copy; 2020 by
          {' '}
          <a href="https://lab10.coop/imprint/" target="_blank" rel="noreferrer" title="lab10 collective">
            lab10 collective eG
          </a>
        </footer>

        <div className="overlayBox" id="changePriceField">
          <div className="innerBox">
            <div className="close">X</div>
            <h3>Change Price</h3>
            <form>
              <input type="text" name="XYZ" placeholder="123456" />
              <input type="submit" value="Set price" />
            </form>
          </div>
        </div>

        <div className="overlayBox" id="adjustDateField">
          <div className="innerBox">
            <div className="close">X</div>
            <h3>Adjust Date</h3>
            <form>
              <input type="text" name="XYZ" placeholder="123456" />
              <input type="submit" value="Set date" />
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
