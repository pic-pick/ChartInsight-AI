// src/components/SearchBar.jsx
import React, { useEffect, useRef, useState } from "react";
import { searchStocks } from "../api/stockApi";

/**
 * props:
 *  - value: 선택된 심볼 값 (예: "005930")
 *  - onSelect(symbol, item): 종목 선택 시 호출
 *  - placeholder: 인풋 플레이스홀더 문구
 *  - className: 래퍼에 추가할 Tailwind 클래스
 *
 * 백엔드 /api/stocks/search 결과 형식:
 *  [{ symbol: "005930", name: "삼성전자" }, ...]
 */
const SearchBar = ({
                       value = "",
                       onSelect,
                       placeholder = "종목명 또는 티커를 입력하세요",
                       className = "",
                   }) => {
    const [input, setInput] = useState(value);
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    const wrapperRef = useRef(null);
    const debounceRef = useRef(null);

    // value 외부 변경 시 인풋 동기화
    useEffect(() => {
        setInput(value || "");
    }, [value]);

    // 검색어가 바뀔 때마다 백엔드에 질의 (디바운스)
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        const q = input.trim();
        if (!q) {
            setResults([]);
            setOpen(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                const data = await searchStocks(q);
                setResults(data || []);
                setOpen(true);
                setHighlightIndex(-1);
            } catch (e) {
                console.error("search error", e);
                setResults([]);
                setOpen(false);
            } finally {
                setLoading(false);
            }
        }, 250); // 0.25초 디바운스

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [input]);

    // 바깥 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };

        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const handleSelect = (item) => {
        setInput(item.symbol);
        setOpen(false);
        setResults([]);
        setHighlightIndex(-1);
        if (onSelect) {
            onSelect(item.symbol, item);
        }
    };

    const handleKeyDown = (e) => {
        if (!open || !results.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) =>
                prev < results.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) =>
                prev > 0 ? prev - 1 : results.length - 1
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightIndex >= 0 && highlightIndex < results.length) {
                handleSelect(results[highlightIndex]);
            } else if (results.length === 1) {
                handleSelect(results[0]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div
            ref={wrapperRef}
            className={`relative text-xs ${className}`}
        >
            <input
                className="w-64 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                    if (results.length) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
            />

            {/* 로딩 스피너 비슷한 점 3개 */}
            {loading && (
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <div className="flex gap-[2px]">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-sky-400"></span>
                        <span className="h-1 w-1 animate-pulse rounded-full bg-sky-300 delay-75"></span>
                        <span className="h-1 w-1 animate-pulse rounded-full bg-sky-200 delay-150"></span>
                    </div>
                </div>
            )}

            {/* 검색 결과 드롭다운 */}
            {open && results.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-700 bg-slate-900/95 shadow-lg">
                    {results.map((item, idx) => (
                        <button
                            key={`${item.symbol}-${idx}`}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className={`flex w-full flex-col items-start px-3 py-2 text-left transition ${
                                idx === highlightIndex
                                    ? "bg-sky-600/30"
                                    : "hover:bg-slate-800"
                            }`}
                        >
                            <div className="flex w-full items-center justify-between">
                <span className="font-medium text-slate-100">
                  {item.name}
                </span>
                                <span className="text-[10px] text-slate-400">
                  {item.symbol}
                </span>
                            </div>
                            {/* 필요하면 시장/국가도 여기에 표시 (백엔드에서 내려줄 때) */}
                        </button>
                    ))}
                </div>
            )}

            {/* 검색 결과 없을 때 */}
            {open && !loading && results.length === 0 && input.trim() && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-[11px] text-slate-400">
                    해당 키워드로 찾은 종목이 없습니다.
                </div>
            )}
        </div>
    );
};

export default SearchBar;