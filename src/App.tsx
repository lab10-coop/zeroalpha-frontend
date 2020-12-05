import React, { useEffect, useState } from 'react';
import Onboard from 'bnc-onboard';
import { fromWei, toChecksumAddress, toWei } from 'web3-utils';
import Web3 from 'web3';
import { UserState } from 'bnc-onboard/dist/src/interfaces';
import stewardContract from './contract-instances/steward';
import nftContract, { id as tokenId } from './contract-instances/nft';
import artistImg from './image/artist-sven-eberwein.png';
import lab10Img from './image/lab10-logo.png';
import ownerImg from './image/owner.png';

const networkId = parseInt(process.env.REACT_APP_CHAIN_N_ID || '', 10);
const rpc = process.env.REACT_APP_CHAIN_RPC || '';
const currencyUnit = process.env.REACT_APP_CURRENCY_UNI || 'xDai';
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

export default function App(): JSX.Element {
  const [onboardState, setOnboardState] = useState<UserState>();
  const [name, setName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [collected, setCollected] = useState<string>('');
  const [foreclosureTime, setForeclosureTime] = useState<string>('');
  const [foreclosured, setForeclosed] = useState<boolean>(false);
  const [newForeclosureTime, setNewForeclosureTime] = useState<string>('');
  const [depositLeft, setDepositLeft] = useState<string>('');
  const [newResellPrice, setNewResellPrice] = useState<string>();
  const [newPrice, setNewPrice] = useState<string>();
  const [buyUntil, setBuyUntil] = useState<string>();
  const [changePriceShow, setChangePriceShow] = useState<boolean>(false);
  const [adjustDateShow, setAdjustDateShow] = useState<boolean>(false);
  const [buyShow, setBuyShow] = useState<boolean>(false);
  const [showMore, setShowMore] = useState<boolean>(false);

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
    const fT = await stewardContract().methods.foreclosureTime().call();
    const f = await stewardContract().methods.foreclosed().call();
    const d = await stewardContract().methods.depositAbleToWithdraw().call();

    setArtist(a);
    setPrice(p);
    setCollected(c);
    setForeclosureTime(fT);
    setForeclosed(f);
    setDepositLeft(d);
  };

  const init = async () => Promise.all([
    fetchNftInfo(),
    fetchStewardInfo(),
  ]);

  useEffect(() => {
    init();
  }, []);

  const connectWallet = async (): Promise<void> => {
    const selectResult = await onboard.walletSelect();
    if (!selectResult) {
      return;
    }
    await onboard.walletCheck();
    setOnboardState(onboard.getState());
  };

  const saveNewResellPrice = async () => {
    if (!onboardState) {
      // todo: connectWallet
      alert('No wallet connected.');
      return;
    }
    if (!newResellPrice) {
      alert('new price not set.');
      return;
    }
    const web3 = new Web3(onboardState.wallet.provider);
    await stewardContract(web3).methods.changePrice(toWei(newResellPrice)).send({
      // todo: make gasPrice configurable?
      gasPrice: toWei('100', 'gwei'),
      from: onboardState.address,
    });
    setNewResellPrice(undefined);
    await init();
    setChangePriceShow(false);
  };

  const buy = async () => {
    if (!onboardState) {
      // todo: connectWallet
      alert('No wallet connected.');
      return;
    }
    if (!newPrice || !buyDeposit) {
      alert('new price or deposit not set.');
      return;
    }
    const web3 = new Web3(onboardState.wallet.provider);
    await stewardContract(web3).methods.buy(toWei(newPrice), price).send({
      // todo: make gasPrice configurable?
      gasPrice: toWei('100', 'gwei'),
      value: toWei((parseFloat(fromWei(price)) + buyDeposit).toString()),
      from: onboardState.address,
    });
    setNewPrice(undefined);
    setBuyUntil(undefined);
    await init();
    setBuyShow(false);
  };

  const withdrawOrDeposit = async () => {
    if (addWithdraw === 0) {
      return; // do nothing
    }
    if (!onboardState) {
      // todo: connectWallet
      alert('No wallet connected.');
      return;
    }
    const web3 = new Web3(onboardState.wallet.provider);
    if (addWithdraw >= parseFloat(fromWei(depositLeft))) {
      // withdraw
      await stewardContract(web3).methods.exit().send({
        // todo: make gasPrice configurable?
        gasPrice: toWei('100', 'gwei'),
        from: onboardState.address,
      });
    } else if (addWithdraw > 0) {
      // withdraw
      await stewardContract(web3).methods.withdrawDeposit(toWei(Math.abs(addWithdraw).toString())).send({
        // todo: make gasPrice configurable?
        gasPrice: toWei('100', 'gwei'),
        from: onboardState.address,
      });
    } else {
      // deposit
      await stewardContract(web3).methods.depositWei().send({
        // todo: make gasPrice configurable?
        gasPrice: toWei('100', 'gwei'),
        value: toWei(Math.abs(addWithdraw).toString()),
        from: onboardState.address,
      });
    }
    setNewForeclosureTime('');
    await init();
    setAdjustDateShow(false);
  };

  const calcAddWithdraw = (): number => {
    if (!foreclosureTime || !newForeclosureTime) {
      return 0;
    }
    if (foreclosured) {
      return 0;
    }
    const now = new Date();
    const fDate = new Date(parseInt(foreclosureTime, 10) * 1000);
    const newFDate = new Date(newForeclosureTime);
    const secondsF = (fDate.getTime() - now.getTime()) / 1000;
    const secondsNewF = (newFDate.getTime() - now.getTime()) / 1000;
    if (Number.isNaN(secondsF) || Number.isNaN(secondsNewF)) {
      return 0;
    }
    if (secondsNewF < 0) {
      return parseFloat(fromWei(depositLeft));
    }

    // console.log('secondsF', secondsF);
    // console.log('secondsNewF', secondsNewF);
    // console.log('(secondsNewF / secondsF) - 1', (secondsNewF / secondsF) - 1);

    return -((secondsNewF / secondsF) - 1) * parseFloat(fromWei(depositLeft));
  };

  let addWithdraw = calcAddWithdraw();

  const calcBuyDeposit = (): number => {
    if (!buyUntil || !newPrice) {
      return 0;
    }
    const now = new Date();
    const buyUntilDate = new Date(buyUntil);
    const buyUntilSeconds = (buyUntilDate.getTime() - now.getTime()) / 1000;
    if (!buyUntilSeconds || buyUntilSeconds < 0) {
      return 0;
    }
    // todo: this should come from the contract.
    const patronage = 0.05;
    const pps = (parseFloat(newPrice) * patronage) / 365 / 24 / 60 / 60;
    return buyUntilSeconds * pps;
  };

  let buyDeposit = calcBuyDeposit();

  // todo: ens owner
  // todo: use name from contract somewhere?
  // todo: show symbol somewhere?
  // todo: show beneficiary address somewhere?
  return (
    <div>
      <header>
        <div className="inner">
          <div className="logo"><a href="https://zeroalpha.art/" title="ZeroAlpha">ZeroAlpha</a></div>

          <button className="connectWalletButton" type="button" onClick={() => connectWallet()}>
            {(!onboardState) ? (
              <span id="connectWalletButton">Connect your Wallet</span>
            ) : (
              <span id="connectWalletButton" title="Switch wallet">
                {shortAddr(toChecksumAddress(onboardState.address))}
              </span>
            )}
          </button>

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
                  {!showMore && (
                    <button id="showMore" type="button" onClick={() => setShowMore(true)}>show more</button>
                  )}
                </p>
                <p className={showMore ? 'showMoreText show' : 'showMoreText'}>
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
                  {showMore && (
                    <button id="showLess" type="button" onClick={() => setShowMore(false)}>show less</button>
                  )}
                </p>
              </div>

            </div>

            <div className="artworkImage">
              <figure>
                <img src={imageUrl} alt={name} />
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
                  <span className="priceValue">{fromWei(price)}</span>
                  &nbsp;
                  <span className="currency">{currencyUnit}</span>
                  {' '}
                  {onboardState && onboardState.address.toLowerCase() === owner.toLowerCase() && (
                    <button className="changePrice" type="button" onClick={() => setChangePriceShow(true)}>
                      change
                    </button>
                  )}
                </p>
                <p className="buyButton">
                  <button id="buyButton" type="button" onClick={() => setBuyShow(true)}>
                    Buy
                  </button>
                </p>
              </div>

              <div className="artistField">
                <h3>Artist:</h3>
                <p><span className="artistName" title={artist}>Sven Eberwein</span></p>
                <figure>
                  <img src={artistImg} alt="Sven Eberwein" />
                </figure>
              </div>

              <div className="ownerField">
                <h3>Owner:</h3>
                <p>
                  <span className="ownerName" title={owner}>
                    {owner && shortAddr(toChecksumAddress(owner))}
                  </span>
                </p>
                <figure>
                  <img src={ownerImg} alt={owner} />
                </figure>
              </div>

              <div className="patronageWrapper">

                <div className="patronageField">
                  <h3>Patronage:</h3>
                  <p>
                    Till&nbsp;
                    <span className="patronageUntil">
                      {new Date(parseInt(foreclosureTime, 10) * 1000).toLocaleDateString()}
                    </span>
                    {' '}
                    {onboardState && onboardState.address.toLowerCase() === owner.toLowerCase() && (
                      <button className="adjustDate" type="button" onClick={() => setAdjustDateShow(true)}>
                        adjust
                      </button>
                    )}
                  </p>
                </div>
                <div className="beneficiaryField">
                  <h3>Beneficiary:</h3>
                  <p><span className="beneficiaryName">lab10 collective</span></p>
                </div>
                <div className="totalPatronageField">
                  <h3>Total Patronage Collected:</h3>
                  <p>
                    <span className="totalPatronageAmount">{fromWei(collected)}</span>
                    &nbsp;
                    <span className="currency">{currencyUnit}</span>
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

        <div className={changePriceShow ? 'overlayBox show' : 'overlayBox'}>
          <div className="innerBox">
            <button className="close" type="button" onClick={() => setChangePriceShow(false)}>X</button>
            <h3>Change Price</h3>
            <form>
              <label htmlFor="salePrice">
                Re-sale price:
                <input
                  type="text"
                  name="salePrice"
                  value={newResellPrice}
                  onChange={(event) => setNewResellPrice(event.currentTarget.value)}
                />
              </label>
              <input
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  saveNewResellPrice();
                }}
                value="Set price"
              />
            </form>
          </div>
        </div>

        <div className={adjustDateShow ? 'overlayBox show' : 'overlayBox'}>
          <div className="innerBox">
            <button className="close" type="button" onClick={() => setAdjustDateShow(false)}>X</button>
            <h3>Adjust Date</h3>
            <form>
              <div className="labelLike">
                Patronage till:
                <span>
                  {new Date(parseInt(foreclosureTime, 10) * 1000).toLocaleDateString()}
                </span>
              </div>
              <label htmlFor="patronage">
                New Patronage:
                <input
                  type="text"
                  name="patronage"
                  placeholder="xx.xx.xxxx"
                  value={newForeclosureTime}
                  onChange={(e) => setNewForeclosureTime(e.currentTarget.value)}
                />
              </label>
              <div className="labelLike">
                {addWithdraw > 0 ? (
                  <span>Withdraw:</span>
                ) : (
                  <span>Add:</span>
                )}
                <span>
                  {Math.abs(addWithdraw).toFixed(6)}
                  {' '}
                  {currencyUnit}
                </span>
              </div>
              <input
                type="submit"
                value="Confirm Change"
                onClick={(e) => {
                  e.preventDefault();
                  withdrawOrDeposit();
                }}
              />
            </form>
          </div>
        </div>

        <div className={buyShow ? 'overlayBox show' : 'overlayBox'}>
          <div className="innerBox">
            <button className="close" type="button" onClick={() => setBuyShow(false)}>X</button>
            <h3>Buy</h3>
            <form>
              <label htmlFor="salePrice">
                Re-sale price:
                <input
                  type="text"
                  name="salePrice"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.currentTarget.value)}
                />
              </label>
              <label htmlFor="deposit">
                Patronage till:
                <input
                  type="text"
                  name="deposit"
                  value={buyUntil}
                  onChange={(e) => setBuyUntil(e.currentTarget.value)}
                />
              </label>
              <div className="labelLike">
                Deposit:
                <span>
                  {buyDeposit.toFixed(6)}
                  {' '}
                  {currencyUnit}
                </span>
              </div>
              <div className="labelLike">
                Purchase:
                <span>
                  {fromWei(price)}
                  {' '}
                  {currencyUnit}
                </span>
              </div>
              <div className="labelLike total">
                Total:
                <span>
                  {(parseFloat(fromWei(price)) + buyDeposit).toFixed(6)}
                  {' '}
                  {currencyUnit}
                </span>
              </div>
              <input
                type="submit"
                value="Confirm Purchase"
                onClick={(e) => {
                  e.preventDefault();
                  buy();
                }}
              />
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
