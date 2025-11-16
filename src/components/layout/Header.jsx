import React from "react";
import { Link, NavLink } from "react-router-dom";

const Header = () => {
    const linkBase =
        "px-3 py-1.5 rounded-full text-sm transition-colors";
    const linkActive = "bg-sky-500 text-white";
    const linkInactive = "text-slate-300 hover:bg-slate-800";

    return (
        <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
            <div className="container max-w-6xl flex items-center justify-between py-3">
                <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-xs font-bold">
            CI
          </span>
                    <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold">ChartInsight AI</span>
                        <span className="text-[11px] text-slate-400">
              Stock Strategy & Risk Dashboard
            </span>
                    </div>
                </Link>

                <nav className="flex items-center gap-2 text-sm">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) =>
                            `${linkBase} ${isActive ? linkActive : linkInactive}`
                        }
                    >
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/portfolio"
                        className={({ isActive }) =>
                            `${linkBase} ${isActive ? linkActive : linkInactive}`
                        }
                    >
                        Portfolio
                    </NavLink>
                    <NavLink
                        to="/about"
                        className={({ isActive }) =>
                            `${linkBase} ${isActive ? linkActive : linkInactive}`
                        }
                    >
                        About
                    </NavLink>
                </nav>
            </div>
        </header>
    );
};

export default Header;