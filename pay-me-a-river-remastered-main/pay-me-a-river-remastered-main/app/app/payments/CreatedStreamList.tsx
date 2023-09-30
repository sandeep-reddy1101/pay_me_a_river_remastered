import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Types } from "aptos";
import { sleep } from "@/lib/utils";

export type Stream = {
  sender: string;
  recipient: string;
  amountAptFloat: number;
  durationMilliseconds: number;
  startTimestampMilliseconds: number;
  streamId: number;
};

export default function CreatedStreamList(props: {
  isTxnInProgress: boolean;
  setTxn: (isTxnInProgress: boolean) => void;
}) {
  // Wallet state
  const { connected, account, signAndSubmitTransaction } = useWallet();
  // Toast state
  const { toast } = useToast();
  // Streams state
  const [streams, setStreams] = useState<Stream[]>([]);
  const [areStreamsLoading, setAreStreamsLoading] = useState(true);

  /* 
    Retrieve the streams from the module and set the streams state.
  */
  useEffect(() => {
    if (connected) {
      getSenderStreams().then((streams) => {
        if (Array.isArray(streams)) {
          setStreams(streams);
          setAreStreamsLoading(false);
        }
      });
    }
  }, [account, connected, props.isTxnInProgress]);

  /*
    Cancels a selected stream.
  */
  const cancelStream = async (recipient: string) => {
    /*
      TODO #7: Validate the account is defined before continuing. If not, return.
    */
    if (!account) {
      return;
    }
    /* 
      TODO #8: Set the isTxnInProgress state to true. This will display the loading spinner.
    */
    props.setTxn(true);

    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::cancel_stream`,
      type_arguments: [],
      arguments: [account.address, recipient],
    };

    try {
      const result = await signAndSubmitTransaction(payload);
      await sleep(parseInt(process.env.TRANSACTION_DELAY_MILLISECONDS || "0"));
      console.log(result);
      if (result) {
        toast({
          title: "Stream closed!",
          description: `Closed stream for ${`${recipient.slice(
            0,
            6
          )}...${recipient.slice(-4)}`}`,
          action: (
            <a
              href={`https://explorer.aptoslabs.com/txn/${result.hash}?network=testnet`}
              target="_blank"
            >
              <ToastAction altText="View transaction">View txn</ToastAction>
            </a>
          ),
        });
      }
    } catch (e) {
      props.setTxn(false);
      console.log(e);
      return;
    }
    /*
      TODO #9: Make a request to the entry function `cancel_stream` to cancel the stream. 
      
      HINT: 
        - In case of an error, set the isTxnInProgress state to false and return.
        - In case of success, display a toast notification with the transaction hash.

      -- Toast notification --
      
    */
    /*
      TODO #10: Set the isTxnInProgress state to false. This will hide the loading spinner.
    */
    props.setTxn(false);
  };

  /* 
    Retrieves the sender streams. 
  */
  const getSenderStreams = async () => {
    /*
      TODO #4: Validate the account is defined before continuing. If not, return.
    */

    if (!account) {
      return [];
    }

    /*
      TODO #5: Make a request to the view function `get_senders_streams` to retrieve the streams sent by 
            the user.
    */

    const body = {
      function: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::get_senders_streams`,
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
      console.log("error occured while getting the sender streams -> ", e);
      return [];
    }
    const data = await res.json();

    console.log("sender stream -> ", data);

    if (data[0].length > 0) {
      let senderStreamsArr = [];
      for (let i = 0; i < data[0].length; i++) {
        let streamObj = {
          sender: account.address,
          recipient: data[0][i],
          amountAptFloat: data[3][i] / 100000000,
          durationMilliseconds: data[2][i],
          startTimestampMilliseconds: data[1][i],
          streamId: data[4][i],
        };
        senderStreamsArr.push(streamObj);
      }
      return senderStreamsArr;
    } else {
      return [];
    }
    /* 
      TODO #6: Parse the response from the view request and create the streams array using the given 
            data. Return the new streams array.

      HINT:
        - Remember to convert the amount to floating point number
    */

    // PLACEHOLDER: Remove this line
  };

  return (
    <ScrollArea className="rounded-lg bg-neutral-400 border border-neutral-200 w-full">
      <div className="h-fit max-h-96 w-full">
        <Table className="w-full">
          <TableHeader className="bg-neutral-300">
            <TableRow className="uppercase text-xs font-matter hover:bg-neutral-300">
              <TableHead className="text-center">ID</TableHead>
              <TableHead className="text-center">Recipient</TableHead>
              <TableHead className="text-center">End date</TableHead>
              <TableHead className="text-center">Remaining amount</TableHead>
              <TableHead className="text-center">Cancel stream</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areStreamsLoading && (
              <TableRow>
                <TableCell className="items-center">
                  <div className="flex flex-row justify-center items-center w-full">
                    <Skeleton className="h-4 w-4" />
                  </div>
                </TableCell>
                <TableCell className="items-center">
                  <div className="flex flex-row justify-center items-center w-full">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="items-center">
                  <div className="flex flex-row justify-center items-center w-full">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="items-center">
                  <div className="flex flex-row justify-center items-center w-full">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="items-center">
                  <div className="flex flex-row justify-center items-center w-full">
                    <Skeleton className="h-8 w-12" />
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!areStreamsLoading && streams.length === 0 && (
              <TableRow className="hover:bg-neutral-400">
                <TableCell colSpan={5}>
                  <p className="break-normal text-center font-matter py-4 text-neutral-100">
                    You don&apos;t have any outgoing payments.
                  </p>
                </TableCell>
              </TableRow>
            )}
            {!areStreamsLoading &&
              streams.length > 0 &&
              streams.map((stream, index) => {
                return (
                  <TableRow
                    key={index}
                    className="font-matter hover:bg-neutral-400"
                  >
                    <TableCell className="text-center">
                      {stream.streamId}
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {`${stream.recipient.slice(
                            0,
                            7
                          )}...${stream.recipient.slice(-4)}`}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{stream.recipient}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      {stream.startTimestampMilliseconds > Date.now() ? (
                        <p>
                          <i>Stream has not started</i>
                        </p>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {new Date(
                                stream.startTimestampMilliseconds +
                                  stream.durationMilliseconds
                              ).toLocaleDateString()}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {new Date(
                                  stream.startTimestampMilliseconds +
                                    stream.durationMilliseconds
                                ).toLocaleString()}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-center">
                      {stream.startTimestampMilliseconds > Date.now() ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {Math.round(
                                stream.amountAptFloat * Math.pow(10, 2)
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {Math.round(
                                  stream.amountAptFloat * Math.pow(10, 8)
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : new Date(
                          stream.startTimestampMilliseconds +
                            stream.durationMilliseconds
                        ) < new Date() ? (
                        <p>0.00 APT</p>
                      ) : (
                        <CountUp
                          start={
                            stream.startTimestampMilliseconds +
                            stream.durationMilliseconds -
                            Date.now()
                          }
                          end={0}
                          duration={stream.durationMilliseconds / 1000}
                          decimals={8}
                          decimal="."
                          suffix=" APT"
                          useEasing={false}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        className="bg-red-800 hover:bg-red-700 text-white"
                        onClick={() => cancelStream(stream.recipient)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
