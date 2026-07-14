import { IBApi, EventName, SecType, BarSizeSetting } from '@stoqey/ib';
import type { Contract } from '@stoqey/ib';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    const { ticker, dateStr, onlyRTH } = await request.json();

    if (!ticker || !dateStr) {
        return json({ error: "Missing ticker or dateStr" }, { status: 400 });
    }

    const useRTH = onlyRTH ? 1 : 0;

    return new Promise((resolve, reject) => {
        // We connect via TCP Socket to the IB Gateway
        const ib = new IBApi({ host: '127.0.0.1', port: 4001, clientId: 58868 });
        let connected = false;

        const cleanup = () => {
            if (connected) ib.disconnect();
        };

        const timeout = setTimeout(() => {
            cleanup();
            resolve(json({ error: "Timeout connecting to IB Gateway or fetching data via TCP" }, { status: 504 }));
        }, 15000); // 15s timeout

        let resolved = false;

        ib.on(EventName.error, (err, code, reqId) => {
            const errorMsg = err?.message || err;
            console.error(`IB error: ${errorMsg} - Code: ${code}`);

            // IBKR error codes < 2000 are actual errors (not warnings)
            // Error 162 is the Historical Market Data error (e.g., bar size not supported for dates too far back)
            if (code && typeof code === 'number' && code < 2000) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    cleanup();
                    resolve(json({ error: `IBKR Error ${code}: ${errorMsg}` }, { status: 400 }));
                }
            }
        });

        ib.on(EventName.connected, () => {
            connected = true;

            const contract: Contract = {
                symbol: ticker.toUpperCase(),
                secType: SecType.STK,
                exchange: 'SMART',
                currency: 'USD'
            };

            // Format for IB: "YYYYMMDD HH:mm:ss [Timezone]"
            // As seen in the working example, adding 'UTC' resolves ambiguity warnings.
            const endDateTime = `${dateStr} 23:59:59 UTC`;

            ib.reqHistoricalData(
                1,
                contract,
                endDateTime,
                "1 D", // duration: 1 day
                BarSizeSetting.SECONDS_FIVE, // bar size
                "TRADES", // what to show
                useRTH, // useRTH (1 = regular trading hours, 0 = all available hours)
                1, // formatDate (1 = return strings)
                false // keepUpToDate
            );
        });

        const historicalData: any[] = [];

        ib.on(EventName.historicalData, (reqId, time, open, high, low, close, volume, count, WAP, hasGaps) => {
            if (time && time.startsWith('finished')) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    cleanup();
                    resolve(json({ data: historicalData }));
                }
            } else {
                historicalData.push({ time, open, high, low, close, volume });
            }
        });

        try {
            ib.connect();
        } catch (e) {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(json({ error: "Failed to connect to IB Gateway TCP socket on port 4001" }, { status: 500 }));
            }
        }
    });
}
