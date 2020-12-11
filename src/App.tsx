import React, { useEffect, useState } from 'react';
import Onboard from 'bnc-onboard';
import { fromWei, toChecksumAddress, toWei } from 'web3-utils';
import Web3 from 'web3';
import { UserState } from 'bnc-onboard/dist/src/interfaces';
import namehash from 'eth-ens-namehash';
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
  const [ensName, setEnsName] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [ownerEns, setOwnerEns] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [initialPrice, setInitialPrice] = useState<string>('');
  const [collected, setCollected] = useState<number>(0);
  const [foreclosureTime, setForeclosureTime] = useState<string>('');
  const [foreclosed, setForeclosed] = useState<boolean>(false);
  const [newForeclosureTime, setNewForeclosureTime] = useState<string>('');
  const [depositLeft, setDepositLeft] = useState<string>('');
  const [newResellPrice, setNewResellPrice] = useState<string>();
  const [newInitialPrice, setNewInitialPrice] = useState<string>();
  const [newPrice, setNewPrice] = useState<string>();
  const [buyUntil, setBuyUntil] = useState<string>();
  const [changePriceShow, setChangePriceShow] = useState<boolean>(false);
  const [changeInitialPriceShow, setChangeInitialPriceShow] = useState<boolean>(false);
  const [adjustDateShow, setAdjustDateShow] = useState<boolean>(false);
  const [buyShow, setBuyShow] = useState<boolean>(false);
  const [showMore, setShowMore] = useState<boolean>(false);
  const [buyLoading, setBuyLoading] = useState<boolean>(false);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);
  const [priceILoading, setPriceILoading] = useState<boolean>(false);
  const [adjustLoading, setAdjustLoading] = useState<boolean>(false);

  const shortAddr = (addr: string): string => `${addr.substr(0, 6)}…${addr.substr(-4)}`;

  // see: https://github.com/ethereum/web3.js/issues/2683#issuecomment-547348416
  const revEns = async (address: string): Promise<string> => {
    const web3 = new Web3(process.env.REACT_APP_ETH_RPC || '');
    const lookup = `${address.toLowerCase().substr(2)}.addr.reverse`;
    const ResolverContract = await web3.eth.ens.getResolver(lookup);
    const nh = namehash.hash(lookup);
    let ensN;
    try {
      ensN = await ResolverContract.methods.name(nh).call();
    } catch (error) {
      return '';
    }
    return ensN;
  };

  const fetchNftInfo = async () => {
    const tokenUri = await nftContract().methods.tokenURI(tokenId).call();

    // tokenUri = tokenUri.replace('https://ipfs.io/ipfs/', 'https://cloudflare-ipfs.com/ipfs/');
    console.log(tokenUri);

    const resp = await fetch(tokenUri);
    const metaDataJson = await resp.json();

    const s = await nftContract().methods.symbol().call();
    const o = await nftContract().methods.ownerOf(tokenId).call();

    const ensN = await revEns(o);

    setName(metaDataJson.name);
    setSymbol(s);
    setImageUrl(metaDataJson.image);
    setOwner(o);
    setOwnerEns(ensN);
  };

  const fetchStewardInfo = async () => {
    const a = await stewardContract().methods.artist().call();
    const p = await stewardContract().methods.price().call();
    const iP = await stewardContract().methods.initialPrice().call();
    const fT = await stewardContract().methods.foreclosureTime().call();
    const f = await stewardContract().methods.foreclosed().call();
    const d = await stewardContract().methods.depositAbleToWithdraw().call();

    setArtist(a);
    // if foreclosed true price should be initialPrice.
    setPrice(f ? iP : p);
    setInitialPrice(iP);
    setForeclosureTime(fT);
    setForeclosed(f);
    setDepositLeft(d);

    const web3 = new Web3(process.env.REACT_APP_CHAIN_RPC_WS || '');
    web3.eth.subscribe('newBlockHeaders', async () => {
      const forec = await stewardContract().methods.foreclosed().call();
      const c = await stewardContract(web3).methods.totalCollected().call();
      const o = await stewardContract(web3).methods.patronageOwed().call();
      if (forec) {
        setCollected(parseFloat(fromWei(c)));
      } else {
        setCollected(parseFloat(fromWei(c)) + parseFloat(fromWei(o)));
      }
    });
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
    const ensN = await revEns(onboard.getState().address);
    setOnboardState(onboard.getState());
    setEnsName(ensN);
  };

  const saveNewResellPrice = async () => {
    if (!onboardState) {
      alert('No wallet connected.');
      return;
    }
    if (!newResellPrice) {
      alert('new price not set.');
      return;
    }
    setPriceLoading(true);
    const web3 = new Web3(onboardState.wallet.provider);
    await stewardContract(web3).methods.changePrice(toWei(newResellPrice)).send({
      // todo: make gasPrice configurable?
      gasPrice: toWei('100', 'gwei'),
      from: onboardState.address,
    });
    setNewResellPrice(undefined);
    await init();
    setChangePriceShow(false);
    setPriceLoading(false);
  };

  const saveNewInitialPrice = async () => {
    if (!onboardState) {
      alert('No wallet connected.');
      return;
    }
    if (!newInitialPrice) {
      alert('new price not set.');
      return;
    }
    setPriceILoading(true);
    const web3 = new Web3(onboardState.wallet.provider);
    await stewardContract(web3).methods.changeInitialPrice(toWei(newInitialPrice)).send({
      // todo: make gasPrice configurable?
      gasPrice: toWei('100', 'gwei'),
      from: onboardState.address,
    });
    setNewInitialPrice(undefined);
    await init();
    setChangeInitialPriceShow(false);
    setPriceILoading(false);
  };

  const buy = async () => {
    if (!onboardState) {
      alert('No wallet connected.');
      return;
    }
    if (!newPrice || !buyDeposit) {
      alert('new price or deposit not set.');
      return;
    }
    setBuyLoading(true);
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
    setBuyLoading(false);
  };

  const withdrawOrDeposit = async () => {
    if (addWithdraw === 0) {
      return; // do nothing
    }
    if (!onboardState) {
      alert('No wallet connected.');
      return;
    }
    setAdjustLoading(true);
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
    setAdjustLoading(false);
  };

  const calcAddWithdraw = (): number => {
    if (!foreclosureTime || !newForeclosureTime) {
      return 0;
    }
    if (foreclosed) {
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

  // todo: use name from contract somewhere?
  // todo: show symbol somewhere?
  // todo: show beneficiary address somewhere?
  return (
    <div>
      <header className="zaHeader">
        <div className="inner">
          <div className="logo"><a href="https://zeroalpha.art/" title="ZeroAlpha">ZeroAlpha</a></div>

          <button className="connectWalletButton" type="button" onClick={() => connectWallet()}>
            {(!onboardState) ? (
              <span id="connectWalletButton">Connect your Wallet</span>
            ) : (
              <span id="connectWalletButton" title="Switch wallet">
                {ensName || shortAddr(toChecksumAddress(onboardState.address))}
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

        <section className="artworkPresentation">
          <div className="sectionInner">

            <div className="artworkInfos">
              <h2>M Carbon Dioxide</h2>
              <div className="artworkDesc">
                <p><strong>Edition 1 of 1</strong></p>
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
                <h3>Price</h3>
                <p>
                  <span className="priceValue">{fromWei(price)}</span>
                  &nbsp;
                  <span className="currency">{currencyUnit}</span>
                  {' '}
                  {onboardState && onboardState.address.toLowerCase() === owner.toLowerCase() && (
                    <button
                      className="changePrice"
                      type="button"
                      onClick={async () => {
                        if (!onboardState) {
                          await connectWallet();
                        }
                        setChangePriceShow(true);
                      }}
                    >
                      change
                    </button>
                  )}
                  {onboardState && onboardState.address.toLowerCase() === artist.toLowerCase() && (
                    <button
                      className="changePrice"
                      type="button"
                      onClick={async () => {
                        if (!onboardState) {
                          await connectWallet();
                        }
                        setChangeInitialPriceShow(true);
                      }}
                    >
                      change initial
                    </button>
                  )}
                </p>
                <p className="buyButton">
                  <button
                    id="buyButton"
                    type="button"
                    onClick={async () => {
                      if (!onboardState) {
                        await connectWallet();
                      }
                      setBuyShow(true);
                    }}
                  >
                    Buy
                  </button>
                </p>
              </div>

              <div className="artistField">
                <h3>Artist</h3>
                <p><span className="artistName" title={artist}>Sven Eberwein</span></p>
                <figure>
                  <img src={artistImg} alt="Sven Eberwein" />
                </figure>
              </div>

              {foreclosed ? (
                <div className="ownerField">
                  <h3>Owner</h3>
                  <p><span className="artistName" title={artist}>Sven Eberwein</span></p>
                  <figure>
                    <img src={artistImg} alt="Sven Eberwein" />
                  </figure>
                </div>
              ) : (
                <div className="ownerField">
                  <h3>Owner</h3>
                  <p>
                    <span className="ownerName" title={owner}>
                      {ownerEns || (owner && shortAddr(toChecksumAddress(owner)))}
                    </span>
                  </p>
                  <figure>
                    <img src={ownerImg} alt={ownerEns || owner} />
                  </figure>
                </div>
              )}

              <div className="patronageWrapper">

                <div className="patronageField">
                  <h3>Patronage</h3>
                  <p>
                    Till&nbsp;
                    <span className="patronageUntil">
                      {new Date(parseInt(foreclosureTime, 10) * 1000).toLocaleDateString()}
                    </span>
                    {' '}
                    {onboardState && onboardState.address.toLowerCase() === owner.toLowerCase() && (
                      <button
                        className="adjustDate"
                        type="button"
                        onClick={async () => {
                          if (!onboardState) {
                            await connectWallet();
                          }
                          setAdjustDateShow(true);
                        }}
                      >
                        adjust
                      </button>
                    )}
                  </p>
                </div>
                <div className="beneficiaryField">
                  <h3>Beneficiary</h3>
                  <p><span className="beneficiaryName">lab10 collective</span></p>
                </div>
                <div className="totalPatronageField">
                  <h3>Total Patronage Collected</h3>
                  <p>
                    <span className="totalPatronageAmount">{collected.toFixed(10)}</span>
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
                    href="https://twitter.com/Sven_Eberwein"
                    title="@Sven_Eberwein on Twitter"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @Sven_Eberwein
                  </a>
                </p>
                <p>
                  Sven Eberwein is working at the intersection of computer graphics & online culture.
                  Paramount to all his work is to be at the forefront of emerging digital trends, memes and the always
                  evolving crypto space.
                  Works of the internet, by the internet, for the internet.
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

        <footer className="zaFooter">
          &copy; 2020 by
          {' '}
          <a href="https://lab10.coop/imprint/" target="_blank" rel="noreferrer" title="lab10 collective">
            lab10 collective eG
          </a>
        </footer>

        <div className={changePriceShow ? 'overlayBox show' : 'overlayBox'}>
          <div className="innerBox">
            <button className="close" type="button" onClick={() => setChangePriceShow(false)}>X</button>
            <h3>Change</h3>
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
              <button
                className={priceLoading ? 'loading' : ''}
                type="submit"
                disabled={priceLoading}
                onClick={(e) => {
                  e.preventDefault();
                  saveNewResellPrice();
                }}
              >
                {priceLoading && (
                  <span>
                    <div className="spinner-border" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    {' '}
                  </span>
                )}
                Set price
              </button>
            </form>
          </div>
        </div>

        <div className={changeInitialPriceShow ? 'overlayBox show' : 'overlayBox'}>
          <div className="innerBox">
            <button className="close" type="button" onClick={() => setChangeInitialPriceShow(false)}>X</button>
            <h3>Change</h3>
            <form>
              <div className="labelLike">
                Initial price:
                <span>
                  {fromWei(initialPrice)}
                </span>
              </div>
              <label htmlFor="salePrice">
                New price:
                <input
                  type="text"
                  name="salePrice"
                  value={newInitialPrice}
                  onChange={(event) => setNewInitialPrice(event.currentTarget.value)}
                />
              </label>
              <button
                type="submit"
                className={priceILoading ? 'loading' : ''}
                disabled={priceILoading}
                onClick={(e) => {
                  e.preventDefault();
                  saveNewInitialPrice();
                }}
              >
                {priceILoading && (
                  <span>
                    <div className="spinner-border" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    {' '}
                  </span>
                )}
                Set price
              </button>
            </form>
          </div>
        </div>

        <div className={adjustDateShow ? 'overlayBox show' : 'overlayBox'}>
          <div className="innerBox">
            <button className="close" type="button" onClick={() => setAdjustDateShow(false)}>X</button>
            <h3>Adjust</h3>
            <form>
              <div className="labelLike">
                Your patronage till:
                <span>
                  {new Date(parseInt(foreclosureTime, 10) * 1000).toLocaleDateString()}
                </span>
              </div>
              <label htmlFor="patronage">
                New patronage till:
                <input
                  type="date"
                  name="patronage"
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
              <button
                type="submit"
                className={adjustLoading ? 'loading' : ''}
                disabled={adjustLoading}
                onClick={(e) => {
                  e.preventDefault();
                  withdrawOrDeposit();
                }}
              >
                {adjustLoading && (
                  <span>
                    <div className="spinner-border" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    {' '}
                  </span>
                )}
                Confirm Change
              </button>
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
                  type="date"
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
              <button
                type="submit"
                className={buyLoading ? 'loading' : ''}
                disabled={buyLoading}
                onClick={(e) => {
                  e.preventDefault();
                  buy();
                }}
              >
                {buyLoading && (
                  <span>
                    <div className="spinner-border" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    {' '}
                  </span>
                )}
                Confirm Purchase
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
