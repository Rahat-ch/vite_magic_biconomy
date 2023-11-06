import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Magic } from 'magic-sdk';
import { IBundler, Bundler } from '@biconomy/bundler'
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account"
import { ethers  } from 'ethers'
import { ChainId } from "@biconomy/core-types"
import { 
  IPaymaster, 
  BiconomyPaymaster,  
} from '@biconomy/paymaster'
import { ECDSAOwnershipValidationModule, DEFAULT_ECDSA_OWNERSHIP_MODULE } from "@biconomy/modules";


function App() {
  const [count, setCount] = useState(0)
  const [address, setAddress] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false);
  const [smartAccount, setSmartAccount] = useState<BiconomySmartAccountV2 | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Provider | null>(null)

  const magic = new Magic("", {
    network: {
      rpcUrl: "",
      chainId: 80001, 
    },
  })


const bundler: IBundler = new Bundler({
  bundlerUrl: "",
  chainId: ChainId.POLYGON_MUMBAI,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})

const paymaster: IPaymaster = new BiconomyPaymaster({
  paymasterUrl: ""
})



  const connect = async () => {
    try {
      await magic.wallet.connectWithUI()
      const web3Provider = new ethers.providers.Web3Provider(
        magic.rpcProvider,
        "any"
      );

      setProvider(web3Provider)

      const module = await ECDSAOwnershipValidationModule.create({
        signer: web3Provider.getSigner(),
        moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
        })
  
        const biconomySmartAccount = await BiconomySmartAccountV2.create({
          chainId: ChainId.POLYGON_MUMBAI,
          bundler: bundler, 
          paymaster: paymaster,
          entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
          defaultValidationModule: module,
          activeValidationModule: module
        })
        setAddress( await biconomySmartAccount.getAccountAddress())
        setSmartAccount(biconomySmartAccount)
    } catch (error) {
      console.error(error);
    }
  };

  const abi = [
    {
        "inputs": [],
        "name": "incrementCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newCount",
                "type": "uint256"
            }
        ],
        "name": "updateCount",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "count",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const contractAddress = "0x677Ca3CdF99E47fD1bff1bBCFa99E8165351d1e4";

const getCount = async () => {
  if(!provider) return
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const currentCount = await contract.count();
  console.log("Count: ", currentCount?.toNumber());
  setCount(currentCount?.toNumber());
};

const incrementCount = async () => {
  if (!provider) return
  try {
      if (!smartAccount)
          return;
      // const incrementTx = new Interface(["function incrementCount()"]);
      // const data = incrementTx.encodeFunctionData("incrementCount");
      // console.log("data: ", data, smartAccount);

      // const tx1 = {
      //   to: contractAddress,
      //   data: data,
      // };
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const incrementTx = await contract.populateTransaction.incrementCount();
      const tx1 = {
          to: contractAddress,
          data: incrementTx.data
      };
      console.log("data: ", incrementTx.data, smartAccount);

      let partialUserOp = await smartAccount.buildUserOp([tx1]);

      try {
          // partialUserOp.paymasterAndData = "0x";
          console.log("userOp: ", partialUserOp);
          const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
          console.log("userOpRes: ", userOpResponse);
          const transactionDetails = await userOpResponse.wait();

          console.log("Transaction Details:", transactionDetails);
          console.log("Transaction Hash:", userOpResponse.userOpHash);

      } catch (e) {
          console.error("Error executing transaction:", e);
      }
  } catch (error) {
      console.error("Error executing transaction:", error);
  }
};



  return (
    <>
      <h1>Increment</h1>
      {address && <h2>Smart Account: {address}</h2>}
      <h2>Count: {count}</h2>
      <div className="card">
        <button onClick={connect}>
          Connect
        </button>
        <button onClick={getCount}>
          Get Count
        </button>
        <button onClick={incrementCount}>
          Increment
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App
