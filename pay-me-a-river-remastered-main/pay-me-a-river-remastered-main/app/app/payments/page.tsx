"use client";

import { Button } from "@/components/ui/button";
import { ChevronDownIcon, LinkBreak2Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import ReceivedStream from "./ReceivedStream";
import CreatedStreamList, { Stream } from "./CreatedStreamList";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReceivedStreamSkeleton from "./ReceivedStreamSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarLoader } from "react-spinners";
import { NoWalletConnected } from "@/components/NoWalletConnected";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import StreamCreator from "./StreamCreator";

enum Sort {
  MostRecent = "Most Recent",
  Oldest = "Oldest",
  EndDateCloseToFar = "End Date - Close to Far",
  EndDateFarToClose = "End Date - Far to Close",
  TotalAmountLowToHigh = "Total Amount - Low to High",
  TotalAmountHightToLow = "Total Amount - High to Low",
  ClaimableAmountHighToClose = "Claimable Amount - High to Low",
  ClaimableAmountCloseToHigh = "Claimable Amount - Low to High",
}
function stringToSortEnum(value: string): Sort | null {
  if (Object.values(Sort).indexOf(value as Sort) >= 0) {
    return value as Sort;
  }
  return null;
}

enum Status {
  Active = "Active",
  Completed = "Completed",
}
function stringToStatusEnum(value: string): Status | null {
  if (Object.values(Status).indexOf(value as Status) >= 0) {
    return value as Status;
  }
  return null;
}

export default function ClaimerPage() {
  // Wallet state
  const { isLoading, connected, account, network } = useWallet();
  // receiver streams state
  const [streams, setStreams] = useState<{
    Completed: Stream[];
    Active: Stream[];
  }>({ Completed: [], Active: [] });

  // loading states
  const [txnInProgress, setTxnInProgress] = useState(false);
  const [areStreamsLoading, setAreStreamsLoading] = useState(true);

  // dropdown states
  const [sort, setSort] = useState(Sort.MostRecent);
  const [status, setStatus] = useState(Status.Active);

  // button disabled states
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);

  /* 
    Disables the create payment button if a transaction is in progress.
  */
  useEffect(() => {
    if (txnInProgress) setIsCreatePaymentOpen(false);
  }, [isCreatePaymentOpen, txnInProgress]);

  /* 
    Fetches the receiver streams when the wallet is connected.
  */
  useEffect(() => {
    console.log("network -> ", network, network?.name.toString());
    if (connected && !txnInProgress) {
      getReceiverStreams().then((streams) => {
        if (streams) {
          setStreams({
            Active: [...streams.Pending, ...streams.Active],
            Completed: streams.Completed,
          });
          setAreStreamsLoading(false);
        }
      });
    }
  }, [account, connected, txnInProgress]);

  /* 
    Retrieves the receiver streams. 
  */
  const getReceiverStreams = async () => {
    /*
      TODO #5: Validate the account is defined before continuing. If not, return.
    */
    if (!account) {
      return {
        Pending: [],
        Completed: [],
        Active: [],
      };
    }

    /* 
      TODO #6: Set the areStreamsLoading state variable to true
    */
    setAreStreamsLoading(true);

    /*
      TODO #7: Make a request to the view function `get_receivers_streams` to retrieve the streams sent by 
            the user.
    */
    const body = {
      function: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::get_receivers_streams`,
      type_arguments: [],
      arguments: [account.address],
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
      console.log("error occured while getting the receiver streams -> ", e);
      return;
    }
    const data = await res.json();
    console.log("receiever stream -> ", data);

    if (data[0].length > 0) {
      let receiverStreamsObj: {
        Pending: Stream[];
        Completed: Stream[];
        Active: Stream[];
      } = {
        Pending: [],
        Completed: [],
        Active: [],
      };
      for (let i = 0; i < data[0].length; i++) {
        let streamObj = {
          sender: data[0][i],
          recipient: account.address,
          amountAptFloat: data[3][i] / 100000000,
          durationMilliseconds: data[2][i],
          startTimestampMilliseconds: data[1][i],
          streamId: data[4][i],
        };
        if (
          Date.now() >
          streamObj.durationMilliseconds + streamObj.startTimestampMilliseconds
        ) {
          receiverStreamsObj.Completed.push(streamObj);
        } else if (streamObj.startTimestampMilliseconds === 0) {
          receiverStreamsObj.Pending.push(streamObj);
        } else {
          receiverStreamsObj.Active.push(streamObj);
        }
      }
    } else {
      return {
        Pending: [],
        Completed: [],
        Active: [],
      };
    }

    /* 
      TODO #8: Parse the response from the view request and create an object containing an array of 
            pending, completed, and active streams using the given data. Return the new object.

      HINT:
        - Remember to convert the amount to floating point number
        - Remember to convert the timestamps to milliseconds
        - Mark a stream as pending if the start timestamp is 0
        - Mark a stream as completed if the start timestamp + duration is less than the current time
        - Mark a stream as active if it is not pending or completed
    */
  };

  /* 
    displays a message if the wallet is not connected
  */
  if (!connected) {
    return <NoWalletConnected />;
  }

  return (
    <>
      {txnInProgress && (
        <div className="bg-neutral-900/50 backdrop-blur absolute top-0 bottom-0 left-0 right-0 z-50 m-auto flex items-center justify-center">
          <div className="p-6 flex flex-col items-center justify-center space-y-4">
            <BarLoader color="#10B981" />
            <p className="text-lg font-medium">Processing Transaction</p>
          </div>
        </div>
      )}

      <>
        {!isLoading &&
          connected &&
          network &&
          network.name.toString() !== "Testnet" && (
            <Alert variant="destructive" className="w-fit mb-2 mr-2">
              <LinkBreak2Icon className="h-4 w-4" />
              <AlertTitle>Switch your network!</AlertTitle>
              <AlertDescription>
                You need to switch your network to Testnet before you can use
                this app.
              </AlertDescription>
            </Alert>
          )}

        {!isLoading &&
          connected &&
          network &&
          network.name.toString() === "Testnet" && (
            <div className="w-full flex items-center justify-center py-5 px-6">
              <div className="flex flex-col items-start justify-start grow gap-4 w-full max-w-6xl">
                <div className="flex flex-col space-y-3 border-b border-neutral-300 w-full pb-5">
                  <div className="flex flex-row items-end justify-between w-full">
                    <p className="text-4xl font-bold font-cal">
                      Outgoing Payments
                    </p>

                    <Dialog
                      open={isCreatePaymentOpen}
                      onOpenChange={setIsCreatePaymentOpen}
                    >
                      <DialogTrigger>
                        <Button className="bg-green-800 text-white font-matter px-3 hover:bg-green-700">
                          Create Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <StreamCreator
                          setTxn={setTxnInProgress}
                          isTxnInProgress={txnInProgress}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="w-full">
                  <CreatedStreamList
                    setTxn={setTxnInProgress}
                    isTxnInProgress={txnInProgress}
                  />
                </div>

                <div className="flex flex-col space-y-3 border-b border-neutral-300 w-full pb-5">
                  <div className="flex flex-row items-end justify-between w-full">
                    <p className="text-4xl font-bold font-cal">
                      Incoming Payments
                    </p>

                    <div className="flex flex-row gap-3 items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-neutral-300 text-white hover:bg-neutral-200">
                            {status} streams{" "}
                            <ChevronDownIcon className="ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Stream status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={status}
                            onValueChange={(value) => {
                              setStatus(
                                stringToStatusEnum(value) || Status.Active
                              );
                            }}
                          >
                            <DropdownMenuRadioItem value={Status.Active}>
                              {Status.Active} streams - {streams.Active.length}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value={Status.Completed}>
                              {Status.Completed} streams -{" "}
                              {streams.Completed.length}
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-neutral-300 text-white hover:bg-neutral-200">
                            {sort} <ChevronDownIcon className="ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Sorting methods</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={sort}
                            onValueChange={(value) => {
                              setSort(
                                stringToSortEnum(value) || Sort.MostRecent
                              );
                            }}
                          >
                            <DropdownMenuRadioItem value={Sort.MostRecent}>
                              {Sort.MostRecent}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value={Sort.Oldest}>
                              {Sort.Oldest}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.ClaimableAmountHighToClose}
                            >
                              {Sort.ClaimableAmountHighToClose}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.ClaimableAmountCloseToHigh}
                            >
                              {Sort.ClaimableAmountCloseToHigh}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.TotalAmountHightToLow}
                            >
                              {Sort.TotalAmountHightToLow}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.TotalAmountLowToHigh}
                            >
                              {Sort.TotalAmountLowToHigh}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.EndDateFarToClose}
                            >
                              {Sort.EndDateFarToClose}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.EndDateCloseToFar}
                            >
                              {Sort.EndDateCloseToFar}
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col items-center gap-4">
                  {(isLoading || areStreamsLoading) && (
                    <div className="grid grid-cols-1 gap-5 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                    </div>
                  )}

                  {!isLoading &&
                    !areStreamsLoading &&
                    streams[status].length === 0 && (
                      <div className="flex flex-col space-y-1 items-center justify-center w-full bg-neutral-400 border border-neutral-300 py-12 px-6 font-matter rounded-lg">
                        <p className="text-2xl font-medium">
                          No Incoming Payments
                        </p>
                        <p className="text-neutral-100 text-lg">
                          You do not have any {status.toLowerCase()} payments.
                        </p>
                      </div>
                    )}

                  {!isLoading &&
                    !areStreamsLoading &&
                    streams[status].length > 0 && (
                      <div className="grid grid-cols-1 gap-5 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
                        {streams[status]
                          .map((stream) => {
                            return (
                              <ReceivedStream
                                key={stream.streamId}
                                isTxnInProgress={txnInProgress}
                                setTxn={setTxnInProgress}
                                senderAddress={stream.sender}
                                amountAptFloat={stream.amountAptFloat}
                                durationSeconds={
                                  stream.durationMilliseconds / 1000
                                }
                                startTimestampSeconds={
                                  stream.startTimestampMilliseconds / 1000
                                }
                                streamId={stream.streamId}
                              />
                            );
                          })
                          .sort((a, b) => {
                            switch (sort) {
                              case Sort.MostRecent:
                                // TODO: Sort streams by most recent
                                // HINT: Use the streamId to sort the streams
                                return b.props.streamId - a.props.streamId;
                              case Sort.Oldest:
                                // TODO: Sort streams by oldest
                                // HINT: Use the streamId to sort the streams
                                return a.props.streamId - b.props.streamId;
                              case Sort.TotalAmountHightToLow:
                                // TODO: Sort streams by total amount high to low
                                return (
                                  b.props.amountAptFloat -
                                  a.props.amountAptFloat
                                );
                              case Sort.TotalAmountLowToHigh:
                                // TODO: Sort streams by total amount low to high
                                return (
                                  a.props.amountAptFloat -
                                  b.props.amountAptFloat
                                );
                              case Sort.EndDateFarToClose:
                                // TODO: Sort streams by end date far to close
                                return (
                                  a.props.startTimestampSeconds -
                                  b.props.startTimestampSeconds
                                );
                              case Sort.EndDateCloseToFar:
                                // TODO: Sort streams by end date close to far
                                return (
                                  b.props.startTimestampSeconds -
                                  a.props.startTimestampSeconds
                                );
                              case Sort.ClaimableAmountHighToClose:
                                // TODO: Sort streams by claimable amount high to close
                                return (
                                  b.props.durationSeconds -
                                  a.props.durationSeconds
                                );
                              case Sort.ClaimableAmountCloseToHigh:
                                // TODO: Sort streams by claimable amount close to high
                                return (
                                  a.props.durationSeconds -
                                  b.props.durationSeconds
                                );
                              default:
                                // TODO: Sort streams by most recent
                                return b.props.streamId - a.props.streamId;
                            }
                          })}
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
      </>
    </>
  );
}
