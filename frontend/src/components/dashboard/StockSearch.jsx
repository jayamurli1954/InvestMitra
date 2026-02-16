import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, Search } from 'lucide-react';
import { apiUrl } from '@/config/runtime';

const StockSearch = ({ onSelect, initialValue = '' }) => {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    const updateDropdownPosition = useCallback(() => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 99999,
            });
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                wrapperRef.current && !wrapperRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchStocks = async () => {
            if (query.length < 2) {
                setResults([]);
                setIsOpen(false);
                return;
            }
            setIsLoading(true);
            try {
                const url = apiUrl(`/stocks/search?q=${encodeURIComponent(query)}`);
                console.log('Fetching stocks from:', url);
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                console.log('Stock results:', data);
                setResults(data);
                if (data.length > 0) {
                    updateDropdownPosition();
                    setIsOpen(true);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (query) fetchStocks();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, updateDropdownPosition]);

    const dropdown = isOpen && results.length > 0 ? ReactDOM.createPortal(
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto shadow-black/50"
        >
            {results.map((stock) => (
                <button
                    key={stock.symbol}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex flex-col border-b border-slate-700/50 last:border-0"
                    onClick={() => {
                        setQuery(stock.symbol);
                        onSelect(stock.symbol);
                        setIsOpen(false);
                    }}
                >
                    <span className="font-bold text-white">{stock.symbol}</span>
                    <span className="text-xs text-slate-400 truncate">{stock.name}</span>
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Search for stock (e.g. RELIANCE)"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onSelect(e.target.value);
                    }}
                    onFocus={() => {
                        if (query.length >= 2 && results.length > 0) {
                            updateDropdownPosition();
                            setIsOpen(true);
                        }
                    }}
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>
            {dropdown}
        </div>
    );
};

export default StockSearch;
