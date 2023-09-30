"use client";

import { WalletReadyState, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { FaucetClient, Network } from "aptos";
import { ChevronDownIcon } from "@radix-ui/react-icons";

/* 
  Component that displays a button to connect a wallet. If the wallet is connected, it displays the 
  wallet's APT balance, address and a button to disconnect the wallet. 

  When the connect button is clicked, a dialog is displayed with a list of all supported wallets. If 
  a supported wallet is installed, the user can click the connect button to connect the wallet. If
  the wallet is not installed, the user can click the install button to install the wallet.
*/
export default function WalletSelector(props: { isTxnInProgress?: boolean }) {
  // wallet state variables
  const { connect, account, connected, disconnect, wallets, isLoading } =
    useWallet();
  // State to hold the current account's APT balance. In string - floating point format.
  const [balance, setBalance] = useState<string | undefined>(undefined);
  // State to hold whether the faucet is loading or not.
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);

  /* 
    Gets the balance of the connected account whenever the connected, account, isFaucetLoading,
    and isTxnInProgress variables change.

    Also checks if the account exists. If the account does not exist, it initializes the account
    by funding it with 1 APT. 
  */
  useEffect(() => {
    if (connected && account) {
      ensureAccountExists().then(() => {
        getBalance(account.address);
      });
    }
  }, [connected, account, props.isTxnInProgress, isFaucetLoading]);

  /* 
    Checks if the account exists. If the account does not exist, it initializes the account
    by funding it with 1 APT. 
  */
  const ensureAccountExists = async () => {
    /* 
      TODO #5: Make a request to the api endpoint to retrieve the account data. If the request returns 
            an object that contains `error_code` of `account_not_found`, call the initializeAccount
            function to initialize the account.
    */
    try {
      const response = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${account?.address}`,
        {
          method: "GET",
        }
      );
      const accountData = await response.json();
      // console.log(accountData);
      if (accountData.error_code == "account_not_found") {
        await initializeAccount();
      } else {
        return;
      }
    } catch (e) {
      console.error("Error checking account existence:", e);
    }
  };

  /* 
    Initializes the account by funding it with 1 APT.
  */
  const initializeAccount = async () => {
    /* 
      TODO #6: Return if the wallet is not connected, the account is not defined, a transaction is 
      in progress, or the faucet is loading.
    */
    if (!connected || !account || props.isTxnInProgress || isFaucetLoading) {
      return;
    }
    /* 
      TODO #7: Set the isFaucetLoading state variable to prevent this function from being called again.
    */
    setIsFaucetLoading(true);
    /* 
      TODO #8: Create a new faucet client with the testnet network and faucet url. Then, call the
      fundAccount function to fund the account with 1 APT. Catch any errors that occur. 
    */
    const faucetClient = new FaucetClient(
      Network.TESTNET,
      "https://faucet.testnet.aptoslabs.com"
    );
    try {
      await faucetClient.fundAccount(account.address, 100000000, 1);
    } catch (e) {
      console.error("Error initializing account:", e);
    }
    /* 
      TODO #9: Set the isFaucetLoading state variable to false. 
    */
    setIsFaucetLoading(false);
  };

  /*
    Gets the balance of the given address. In case of an error, the balance is set to 0. The balance
    is returned in floating point format.
    @param address - The address to get the APT balance of.
  */
  const getBalance = async (address: string) => {
    /* 

      TODO #3: Make a call to the 0x1::coin::balance function to get the balance of the given address. 
      
      HINT: 
        - The APT balance is return with a certain number of decimal places. Remember to convert the 
          balance to floating point format as a string.
        - Remember to make the API request in a try/catch block. If there is an error, set the 
          balance to "0".
    */
    const body = {
      function: "0x1::coin::balance",
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
      arguments: [address],
    };

    let res;

    try {
      res = await fetch(`https://fullnode.testnet.aptoslabs.com/v1/view`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    } catch (e) {
      setBalance("0");
      return;
    }

    const data = await res.json();

    setBalance((data / 100000000).toLocaleString());
  };

  return (
    <div>
      {!connected && !isLoading && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-green-800 hover:bg-green-700 text-white font-matter font-medium px-3 space-x-2">
              <p>Connect Wallet</p>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect your wallet</DialogTitle>
              {wallets.map((wallet) => {
                return (
                  <div
                    key={wallet.name}
                    className="flex w-full items-center justify-between rounded-xl p-2"
                  >
                    <h1>{wallet.name}</h1>
                    {wallet.readyState === WalletReadyState.Installed && (
                      <Button
                        variant="secondary"
                        onClick={() => connect(wallet.name)}
                      >
                        Connect
                      </Button>
                    )}
                    {wallet.readyState === WalletReadyState.NotDetected && (
                      <a href={wallet.url} target="_blank">
                        <Button variant="secondary">Install</Button>
                      </a>
                    )}
                  </div>
                );
              })}
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
      {isLoading && (
        <Button variant="secondary" disabled>
          Loading...
        </Button>
      )}
      {connected && account && (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="font-mono">
                {`${balance} APT`} | {account.address.slice(0, 5)}...
                {account.address.slice(-4)}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  disconnect();
                }}
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
