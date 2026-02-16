import React, { useEffect, useState } from 'react';
import { websocketUrl } from '@/config/runtime';

const Ticker = ({ userId }) => {
    const [tickerData, setTickerData] = useState([]);

    useEffect(() => {
        const ws = new WebSocket(websocketUrl(`/${userId || 'guest'}`));

        ws.onopen = () => {
            console.log('Connected to Ticker WebSocket');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setTickerData(() => (Array.isArray(data) ? data : [data]));
            } catch (e) {
                console.error('Ticker Parse Error', e);
            }
        };

        return () => {
            ws.close();
        };
    }, [userId]);

    const displayData = tickerData.length > 0 ? tickerData : [
        { symbol: 'NIFTY 50', price: '24,350.50', change: '+0.45%' },
        { symbol: 'SENSEX', price: '80,100.20', change: '+0.32%' },
        { symbol: 'BANK NIFTY', price: '52,400.00', change: '-0.10%' },
        { symbol: 'RELIANCE', price: '3,200.00', change: '+1.2%' },
        { symbol: 'TCS', price: '4,100.00', change: '-0.5%' },
        { symbol: 'INFY', price: '1,650.00', change: '+0.8%' },
    ];

    return (
        <div className="w-full bg-slate-900 border-b border-slate-800 h-10 overflow-hidden flex items-center relative z-20">
            <div className="whitespace-nowrap animate-ticker flex items-center gap-8 px-4">
                {displayData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-300">{item.symbol}</span>
                        <span className="text-white">{item.price}</span>
                        <span className={item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>
                            {item.change}
                        </span>
                    </div>
                ))}
                {displayData.map((item, idx) => (
                    <div key={`dup-${idx}`} className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-300">{item.symbol}</span>
                        <span className="text-white">{item.price}</span>
                        <span className={item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>
                            {item.change}
                        </span>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .animate-ticker { animation: ticker 20s linear infinite; }
                .animate-ticker:hover { animation-play-state: paused; }
            `}</style>
        </div>
    );
};

export default Ticker;
